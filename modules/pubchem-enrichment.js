/**
 * MFC Laboratoire — Module d'Enrichissement PubChem
 * Interroge l'API PubChem (gratuite, sans clé) pour récupérer :
 *   - Masse moléculaire (MW), formule brute, IUPAC, SMILES
 *   - Point d'éclair (flash point) via PUG View
 *   - LogP (XLogP) pour estimer la volatilité
 *   - Description, synonymes
 * 
 * Intègre les données directement dans la knowledge_base + MOLECULE_DB
 * Respecte la rate limit PubChem : max 5 requêtes/seconde
 * 
 * Usage côté serveur :
 *   const pubchem = require('./modules/pubchem-enrichment');
 *   const data = await pubchem.enrichByCAS('78-70-6');
 *   await pubchem.enrichUnknownMolecules(db, { batchSize: 10 });
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// ── Configuration ────────────────────────────────────
const PUBCHEM_BASE = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug';
const PUBCHEM_VIEW = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug_view';
const RATE_LIMIT_MS = 220; // ~4.5 req/s (PubChem max = 5/s)
const REQUEST_TIMEOUT = 15000;

let lastRequestTime = 0;

// ── Utilitaires HTTP ─────────────────────────────────

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function rateLimitedFetch(url) {
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    if (elapsed < RATE_LIMIT_MS) {
        await sleep(RATE_LIMIT_MS - elapsed);
    }
    lastRequestTime = Date.now();
    
    // Node natif avec support proxy (Node fetch ne respecte pas HTTP_PROXY)
    return new Promise((resolve, reject) => {
        const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy;
        const timer = setTimeout(() => reject(new Error('Timeout PubChem')), REQUEST_TIMEOUT);
        
        function handleResponse(res) {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                clearTimeout(timer);
                if (res.statusCode === 200) {
                    try { resolve(JSON.parse(data)); }
                    catch (e) { reject(new Error(`JSON invalide: ${e.message}`)); }
                } else if (res.statusCode === 404) {
                    resolve(null);
                } else {
                    reject(new Error(`PubChem HTTP ${res.statusCode}`));
                }
            });
            res.on('error', (e) => { clearTimeout(timer); reject(e); });
        }
        
        if (proxyUrl) {
            // Connexion via proxy HTTP CONNECT
            const proxy = new URL(proxyUrl);
            const target = new URL(url);
            const connectReq = http.request({
                host: proxy.hostname,
                port: proxy.port,
                method: 'CONNECT',
                path: `${target.hostname}:443`,
                headers: proxy.username ? { 'Proxy-Authorization': `Basic ${Buffer.from(`${proxy.username}:${proxy.password || ''}`).toString('base64')}` } : {}
            });
            connectReq.on('connect', (res, socket) => {
                if (res.statusCode !== 200) {
                    clearTimeout(timer);
                    reject(new Error(`Proxy CONNECT failed: ${res.statusCode}`));
                    return;
                }
                const req = https.request({
                    hostname: target.hostname,
                    path: target.pathname + target.search,
                    method: 'GET',
                    headers: { 'Accept': 'application/json' },
                    socket: socket,
                    agent: false
                }, handleResponse);
                req.on('error', (e) => { clearTimeout(timer); reject(e); });
                req.end();
            });
            connectReq.on('error', (e) => { clearTimeout(timer); reject(e); });
            connectReq.end();
        } else {
            https.get(url, { headers: { 'Accept': 'application/json' } }, handleResponse)
                .on('error', (e) => { clearTimeout(timer); reject(e); });
        }
    });
}


// ── 1. Récupérer le CID depuis un numéro CAS ────────

async function getCIDByCAS(cas) {
    const url = `${PUBCHEM_BASE}/compound/name/${encodeURIComponent(cas)}/cids/JSON`;
    const data = await rateLimitedFetch(url);
    if (!data || !data.IdentifierList || !data.IdentifierList.CID) return null;
    return data.IdentifierList.CID[0];
}


// ── 2. Propriétés de base (MW, formule, IUPAC, LogP, SMILES) ──

async function getBasicProperties(cas) {
    const props = [
        'MolecularWeight', 'MolecularFormula', 'IUPACName',
        'XLogP', 'ExactMass', 'CanonicalSMILES', 'IsomericSMILES'
    ].join(',');
    const url = `${PUBCHEM_BASE}/compound/name/${encodeURIComponent(cas)}/property/${props}/JSON`;
    const data = await rateLimitedFetch(url);
    if (!data || !data.PropertyTable || !data.PropertyTable.Properties) return null;
    return data.PropertyTable.Properties[0];
}


// ── 3. Point d'éclair via PUG View ───────────────────

async function getFlashPoint(cid) {
    if (!cid) return null;
    const url = `${PUBCHEM_VIEW}/data/compound/${cid}/JSON?heading=Flash+Point`;
    try {
        const data = await rateLimitedFetch(url);
        if (!data) return null;
        
        // Parcourir récursivement pour trouver les valeurs de flash point
        const values = [];
        function findValues(obj) {
            if (!obj) return;
            if (typeof obj === 'object') {
                if (obj.StringWithMarkup) {
                    for (const s of obj.StringWithMarkup) {
                        if (s.String) values.push(s.String);
                    }
                }
                if (obj.NumValue !== undefined && obj.Unit) {
                    values.push({ num: obj.NumValue, unit: obj.Unit });
                }
                for (const key in obj) {
                    if (typeof obj[key] === 'object') findValues(obj[key]);
                }
            }
            if (Array.isArray(obj)) {
                for (const item of obj) findValues(item);
            }
        }
        findValues(data);
        
        // Extraire la valeur en °C
        for (const v of values) {
            if (typeof v === 'string') {
                // Formats: "78 °C", "78°C (172°F)", ">= 100 °C"
                const m = v.match(/([\d.]+)\s*°?\s*C/);
                if (m) return parseFloat(m[1]);
            }
            if (typeof v === 'object' && v.unit === '°C') {
                return v.num;
            }
        }
        return null;
    } catch (e) {
        return null; // Flash point pas toujours dispo
    }
}


// ── 4. Synonymes (noms courants, INCI) ──────────────

async function getSynonyms(cas) {
    const url = `${PUBCHEM_BASE}/compound/name/${encodeURIComponent(cas)}/synonyms/JSON`;
    try {
        const data = await rateLimitedFetch(url);
        if (!data || !data.InformationList || !data.InformationList.Information) return [];
        const syns = data.InformationList.Information[0].Synonym || [];
        // Retourner les 15 premiers synonymes (les plus pertinents)
        return syns.slice(0, 15);
    } catch (e) {
        return [];
    }
}


// ── 5. Description (résumé PubChem) ─────────────────

async function getDescription(cid) {
    if (!cid) return null;
    const url = `${PUBCHEM_BASE}/compound/${cid}/description/JSON`;
    try {
        const data = await rateLimitedFetch(url);
        if (!data || !data.InformationList) return null;
        const infos = data.InformationList.Information || [];
        // Prendre la description la plus pertinente (pas trop longue)
        for (const info of infos) {
            if (info.Description && info.Description.length > 20 && info.Description.length < 2000) {
                return {
                    text: info.Description,
                    source: info.DescriptionSourceName || 'PubChem'
                };
            }
        }
        return null;
    } catch (e) {
        return null;
    }
}


// ── 6. Classification GHS depuis PubChem ────────────

async function getGHSClassification(cid) {
    if (!cid) return null;
    const url = `${PUBCHEM_VIEW}/data/compound/${cid}/JSON?heading=GHS+Classification`;
    try {
        const data = await rateLimitedFetch(url);
        if (!data) return null;
        
        const hCodes = new Set();
        const pictograms = new Set();
        const signalWord = [];
        
        function findGHS(obj) {
            if (!obj) return;
            if (typeof obj === 'string') {
                // H-codes
                const hMatches = obj.match(/H\d{3}/g);
                if (hMatches) hMatches.forEach(h => hCodes.add(h));
                // Pictograms
                if (obj.includes('GHS')) {
                    const gm = obj.match(/GHS\d{2}/g);
                    if (gm) gm.forEach(g => pictograms.add(g));
                }
                // Signal word
                if (obj === 'Danger' || obj === 'Warning') signalWord.push(obj);
            }
            if (typeof obj === 'object' && obj !== null) {
                for (const key in obj) findGHS(obj[key]);
            }
            if (Array.isArray(obj)) {
                for (const item of obj) findGHS(item);
            }
        }
        findGHS(data);
        
        return {
            h_codes: [...hCodes].sort(),
            pictograms: [...pictograms].sort(),
            signal_word: signalWord[0] || null
        };
    } catch (e) {
        return null;
    }
}


// ══════════════════════════════════════════════════════
// FONCTION PRINCIPALE : Enrichir une molécule par CAS
// ══════════════════════════════════════════════════════

async function enrichByCAS(cas, options = {}) {
    const { includeGHS = false, includeSynonyms = true, includeDescription = false } = options;
    
    const result = {
        cas,
        source: 'PubChem',
        timestamp: new Date().toISOString(),
        found: false
    };
    
    try {
        // 1. Propriétés de base
        const props = await getBasicProperties(cas);
        if (!props) {
            result.error = 'CAS non trouvé dans PubChem';
            return result;
        }
        
        result.found = true;
        result.cid = props.CID;
        result.molecular_weight = parseFloat(props.MolecularWeight) || null;
        result.molecular_formula = props.MolecularFormula || null;
        result.iupac_name = props.IUPACName || null;
        result.xlogp = props.XLogP ?? null;
        result.exact_mass = props.ExactMass ? parseFloat(props.ExactMass) : null;
        result.smiles = props.CanonicalSMILES || props.ConnectivitySMILES || null;
        result.isomeric_smiles = props.IsomericSMILES || null;
        
        // 2. Flash point
        result.flash_point_c = await getFlashPoint(props.CID);
        
        // 3. Synonymes (noms courants)
        if (includeSynonyms) {
            result.synonyms = await getSynonyms(cas);
        }
        
        // 4. Description
        if (includeDescription) {
            const desc = await getDescription(props.CID);
            if (desc) {
                result.description = desc.text;
                result.description_source = desc.source;
            }
        }
        
        // 5. GHS
        if (includeGHS) {
            result.ghs = await getGHSClassification(props.CID);
        }
        
        // ── Dérivations pour bougie ──
        result.derived = deriveCandleProperties(result);
        
    } catch (e) {
        result.error = e.message;
    }
    
    return result;
}


// ══════════════════════════════════════════════════════
// DÉRIVATIONS SPÉCIFIQUES BOUGIE (depuis données PubChem)
// ══════════════════════════════════════════════════════

function deriveCandleProperties(data) {
    const derived = {};
    const mw = data.molecular_weight;
    const fp = data.flash_point_c;
    const logp = data.xlogp;
    const formula = data.molecular_formula || '';
    
    // ── Volatilité estimée (MW + LogP) ──
    if (mw) {
        if (mw < 150) derived.volatility = 'très_haute';
        else if (mw < 200) derived.volatility = 'haute';
        else if (mw < 250) derived.volatility = 'moyenne';
        else if (mw < 350) derived.volatility = 'basse';
        else derived.volatility = 'très_basse';
        
        // Affiner avec LogP si disponible
        if (logp !== null && logp !== undefined) {
            if (logp < 1.5 && mw < 200) derived.volatility = 'très_haute';
            if (logp > 5 && mw > 250) derived.volatility = 'très_basse';
        }
    }
    
    // ── Impact combustion estimé (flash point) ──
    if (fp !== null) {
        if (fp < 40) derived.impact_combustion = 'danger';
        else if (fp < 65) derived.impact_combustion = 'risque';
        else if (fp < 100) derived.impact_combustion = 'neutre';
        else derived.impact_combustion = 'positif';
    }
    
    // ── Impact diffusion estimé (MW + volatilité) ──
    if (mw) {
        if (mw < 180) derived.impact_diffusion = 'boost';
        else if (mw < 280) derived.impact_diffusion = 'soutien';
        else derived.impact_diffusion = 'fixateur';
    }
    
    // ── Famille chimique estimée (formule + MW) ──
    derived.family_estimate = estimateChemicalFamily(formula, mw, data.iupac_name, data.smiles);
    
    // ── Solubilité cire estimée (LogP) ──
    if (logp !== null && logp !== undefined) {
        if (logp > 4) derived.solubility_wax = 'excellente';
        else if (logp > 2.5) derived.solubility_wax = 'bonne';
        else if (logp > 1) derived.solubility_wax = 'moyenne';
        else derived.solubility_wax = 'limitée';
    }
    
    return derived;
}


function estimateChemicalFamily(formula, mw, iupac, smiles) {
    if (!formula) return 'inconnu';
    iupac = (iupac || '').toLowerCase();
    smiles = smiles || '';
    
    // Terpènes : C10H16 ou C10HxxO (monoterpènes), C15H24 (sesquiterpènes)
    const cMatch = formula.match(/C(\d+)/);
    const hMatch = formula.match(/H(\d+)/);
    const oMatch = formula.match(/O(\d*)/);
    const nMatch = formula.match(/N/);
    
    const nC = cMatch ? parseInt(cMatch[1]) : 0;
    const nH = hMatch ? parseInt(hMatch[1]) : 0;
    const nO = oMatch ? (oMatch[1] ? parseInt(oMatch[1]) : 1) : 0;
    
    // Muscs synthétiques (gros MW, cycliques)
    if (mw > 230 && (iupac.includes('cycl') || smiles.includes('C1'))) {
        if (iupac.includes('musk') || iupac.includes('galax') || iupac.includes('indane')) {
            return 'musc-synthétique';
        }
    }
    
    // Lactones
    if (iupac.includes('lactone') || iupac.includes('oxolan-2-one') || iupac.includes('furan-2-one')) {
        return 'lactone';
    }
    
    // Aldéhydes
    if (smiles.includes('C=O') && !smiles.includes('CC(=O)') && (iupac.includes('al') && nO === 1)) {
        if (nC <= 12 && formula.match(/^C\d+H\d+O$/)) return 'aldéhyde';
    }
    if (iupac.includes('aldehyde') || iupac.endsWith('al')) return 'aldéhyde';
    
    // Cétones
    if (iupac.includes('one') && !iupac.includes('lactone') && smiles.includes('C(=O)')) {
        return 'cétone';
    }
    
    // Esters
    if (smiles.includes('OC(=O)') || smiles.includes('C(=O)O')) {
        return 'ester';
    }
    if (iupac.includes('acetate') || iupac.includes('benzoate') || iupac.includes('ester')) {
        return 'ester';
    }
    
    // Alcools terpéniques
    if (nC === 10 && nO === 1 && formula.match(/^C10H\d+O$/)) {
        return 'terpène-alcool';
    }
    if (nC === 15 && nO === 1 && formula.match(/^C15H\d+O$/)) {
        return 'sesquiterpène-alcool';
    }
    
    // Terpènes purs
    if (nC === 10 && nO === 0 && formula.match(/^C10H\d+$/)) {
        return 'terpène';
    }
    if (nC === 15 && nO === 0 && formula.match(/^C15H\d+$/)) {
        return 'sesquiterpène';
    }
    
    // Phénols
    if (smiles.includes('c1ccc(O)') || iupac.includes('phenol')) {
        return 'phénol';
    }
    
    // Coumarines
    if (iupac.includes('coumarin') || iupac.includes('chromen')) {
        return 'coumarine';
    }
    
    // Nitriles / muscs nitro
    if (nMatch) {
        if (iupac.includes('nitrile')) return 'nitrile';
        if (iupac.includes('nitro')) return 'musc-nitro';
        return 'azoté';
    }
    
    // Aromatique générique
    if (smiles.includes('c1ccc') || formula.match(/^C[6-9]H[4-8]/)) {
        return 'aromatique';
    }
    
    return 'autre';
}


// ══════════════════════════════════════════════════════
// ENRICHISSEMENT BATCH : Molécules inconnues de l'app
// ══════════════════════════════════════════════════════

/**
 * Enrichir les molécules CAS inconnues (pas dans MOLECULE_DB) via PubChem
 * @param {object} db - Instance SQLite
 * @param {object} options - { batchSize: 10, onProgress: fn }
 * @returns {object} Rapport d'enrichissement
 */
async function enrichUnknownMolecules(db, options = {}) {
    const { batchSize = 10, onProgress = null } = options;
    const { MOLECULE_DB } = require('./molecule-engine');
    const knownCas = new Set(Object.keys(MOLECULE_DB));
    
    // Also check knowledge_base molecule_db entries (CAS as title)
    const kbMols = await db.all(`SELECT title FROM knowledge_base WHERE category='molecule_db'`);
    kbMols.forEach(r => knownCas.add(r.title.trim()));
    
    // Trouver les CAS inconnus les plus fréquents
    const unknowns = await db.all(`
        SELECT cas_number, name, COUNT(DISTINCT fragrance_id) as frequency 
        FROM fragrance_components 
        WHERE cas_number IS NOT NULL AND cas_number != ''
        GROUP BY cas_number 
        ORDER BY frequency DESC
    `);
    
    const toEnrich = unknowns
        .filter(u => !knownCas.has(u.cas_number))
        .slice(0, batchSize);
    
    const report = {
        total_unknown: unknowns.filter(u => !knownCas.has(u.cas_number)).length,
        batch_size: toEnrich.length,
        enriched: [],
        failed: [],
        knowledge_entries: 0
    };
    
    for (let i = 0; i < toEnrich.length; i++) {
        const mol = toEnrich[i];
        if (onProgress) onProgress({ current: i + 1, total: toEnrich.length, cas: mol.cas_number, name: mol.name });
        
        try {
            const data = await enrichByCAS(mol.cas_number, { 
                includeSynonyms: true, 
                includeDescription: true,
                includeGHS: true 
            });
            
            if (data.found) {
                // Stocker dans knowledge_base
                const kbEntry = formatForKnowledgeBase(data, mol.name, mol.frequency);
                await db.run(
                    `INSERT OR REPLACE INTO knowledge_base (category, subcategory, title, content, source, priority, tags) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [kbEntry.category, kbEntry.subcategory, kbEntry.title, kbEntry.content, kbEntry.source, kbEntry.priority, kbEntry.tags]
                );
                report.knowledge_entries++;
                
                // Stocker les données brutes pour export seed
                data._fds_name = mol.name;
                data._frequency = mol.frequency;
                report.enriched.push(data);
            } else {
                report.failed.push({ cas: mol.cas_number, name: mol.name, reason: data.error || 'Non trouvé' });
            }
        } catch (e) {
            report.failed.push({ cas: mol.cas_number, name: mol.name, reason: e.message });
        }
    }
    
    return report;
}


// ── Formatage knowledge_base ─────────────────────────

function formatForKnowledgeBase(data, fdsName, frequency) {
    const d = data.derived || {};
    const fpStr = data.flash_point_c !== null ? `${data.flash_point_c}°C` : 'non disponible';
    const mwStr = data.molecular_weight ? `${data.molecular_weight} g/mol` : '?';
    const volStr = d.volatility || '?';
    const famStr = d.family_estimate || '?';
    const solStr = d.solubility_wax || '?';
    const combStr = d.impact_combustion || '?';
    const diffStr = d.impact_diffusion || '?';
    
    const parts = [
        `Molécule : ${fdsName || data.iupac_name || data.cas}`,
        `CAS : ${data.cas} | CID : ${data.cid}`,
        `Formule : ${data.molecular_formula || '?'} | MW : ${mwStr}`,
        `Flash point : ${fpStr} | LogP : ${data.xlogp ?? '?'}`,
        `IUPAC : ${data.iupac_name || '?'}`,
        `─── Dérivations bougie ───`,
        `Famille : ${famStr} | Volatilité : ${volStr}`,
        `Impact combustion : ${combStr} | Diffusion : ${diffStr}`,
        `Solubilité cire : ${solStr}`,
        `Fréquence FDS : présent dans ${frequency} parfum(s)`
    ];
    
    if (data.synonyms && data.synonyms.length > 0) {
        parts.push(`Synonymes : ${data.synonyms.slice(0, 5).join(', ')}`);
    }
    
    if (data.ghs && data.ghs.h_codes.length > 0) {
        parts.push(`GHS : ${data.ghs.h_codes.join(', ')} | Signal : ${data.ghs.signal_word || '-'}`);
    }
    
    return {
        category: 'molecule_db',
        subcategory: d.family_estimate || 'autre',
        title: data.cas,
        content: parts.join('\n'),
        source: `PubChem CID ${data.cid} — ${data.timestamp}`,
        priority: frequency >= 5 ? 1 : (frequency >= 2 ? 2 : 3),
        tags: `molecule,pubchem,${data.cas},${famStr},${volStr},flash:${fpStr}`
    };
}


// ══════════════════════════════════════════════════════
// EXPORT SEED : Générer du code MOLECULE_DB à coller
// ══════════════════════════════════════════════════════

/**
 * Génère le code JS à insérer dans molecule-engine.js pour les molécules enrichies
 */
function generateMoleculeDBEntries(enrichedList) {
    const lines = [];
    lines.push('// ── Molécules enrichies via PubChem (auto-généré) ──');
    
    for (const data of enrichedList) {
        if (!data.found) continue;
        const d = data.derived || {};
        const name = data._fds_name || data.iupac_name || `CAS ${data.cas}`;
        const fp = data.flash_point_c !== null ? data.flash_point_c : 'null';
        const mw = data.molecular_weight || 'null';
        const vol = d.volatility ? `'${d.volatility}'` : "'moyenne'";
        const comb = d.impact_combustion ? `'${d.impact_combustion}'` : "'neutre'";
        const diff = d.impact_diffusion ? `'${d.impact_diffusion}'` : "'soutien'";
        const sol = d.solubility_wax ? `'${d.solubility_wax}'` : "'bonne'";
        const fam = d.family_estimate ? `'${d.family_estimate}'` : "'autre'";
        
        // Escape quotes in name
        const safeName = name.replace(/'/g, "\\'");
        
        lines.push(`    '${data.cas}': { name: '${safeName}', family: ${fam}, mw: ${mw}, fp: ${fp}, volatility: ${vol},`);
        lines.push(`                   impact_combustion: ${comb}, impact_diffusion: ${diff}, solubility_wax: ${sol},`);
        lines.push(`                   notes: 'PubChem CID ${data.cid} — formule ${data.molecular_formula || "?"}' },`);
    }
    
    return lines.join('\n');
}


// ══════════════════════════════════════════════════════
// EXPORT JSON SEED pour import dans l'app
// ══════════════════════════════════════════════════════

function generateSeedJSON(enrichedList) {
    const molecules = {};
    for (const data of enrichedList) {
        if (!data.found) continue;
        const d = data.derived || {};
        molecules[data.cas] = {
            name: data._fds_name || data.iupac_name || `CAS ${data.cas}`,
            family: d.family_estimate || 'autre',
            mw: data.molecular_weight || null,
            fp: data.flash_point_c,
            volatility: d.volatility || 'moyenne',
            impact_combustion: d.impact_combustion || 'neutre',
            impact_diffusion: d.impact_diffusion || 'soutien',
            solubility_wax: d.solubility_wax || 'bonne',
            formula: data.molecular_formula || null,
            iupac: data.iupac_name || null,
            xlogp: data.xlogp ?? null,
            smiles: data.smiles || null,
            cid: data.cid,
            synonyms: (data.synonyms || []).slice(0, 5),
            ghs_h_codes: data.ghs ? data.ghs.h_codes : [],
            notes: `PubChem CID ${data.cid}`,
            source: 'pubchem'
        };
    }
    return molecules;
}


// ══════════════════════════════════════════════════════
// LOOKUP RAPIDE : Recherche un CAS dans PubChem (léger)
// ══════════════════════════════════════════════════════

async function quickLookup(cas) {
    try {
        const props = await getBasicProperties(cas);
        if (!props) return null;
        return {
            cas,
            cid: props.CID,
            name: props.IUPACName || null,
            mw: parseFloat(props.MolecularWeight) || null,
            formula: props.MolecularFormula || null,
            xlogp: props.XLogP ?? null,
            smiles: props.CanonicalSMILES || null,
            found: true
        };
    } catch (e) {
        return { cas, found: false, error: e.message };
    }
}


// ══════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════

module.exports = {
    enrichByCAS,
    enrichUnknownMolecules,
    quickLookup,
    generateMoleculeDBEntries,
    generateSeedJSON,
    getCIDByCAS,
    getBasicProperties,
    getFlashPoint,
    getSynonyms,
    getDescription,
    getGHSClassification,
    deriveCandleProperties
};
