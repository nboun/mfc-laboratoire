/**
 * MFC Laboratoire — Module d'enrichissement moléculaire multi-sources
 * Remplace pubchem-enrichment.js
 * 
 * Pipeline : PubChem → Common Chemistry → TGSC → Fusion → KB
 * 
 * Sources :
 *   1. PubChem PUG REST  — MW, LogP, BP, formule, IUPAC, flash point, densité, SMILES
 *   2. Common Chemistry   — nom officiel CAS, synonymes, point de fusion, propriétés expérimentales
 *   3. TGSC (scraping)    — type d'odeur, description olfactive (dégradation gracieuse)
 *   4. Import JSON session — fallback pour HE, mélanges, données métier bougie
 * 
 * v1.0.0 — 26/02/2026
 */

const https = require('https');
const http = require('http');

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const CONFIG = {
    pubchem: {
        baseUrl: 'https://pubchem.ncbi.nlm.nih.gov/rest/pug',
        rateLimit: 220,  // ms entre requêtes (max 5/sec PubChem)
        timeout: 10000
    },
    commonChem: {
        baseUrl: 'https://commonchemistry.cas.org/api',
        rateLimit: 500,
        timeout: 8000,
        apiKey: null,     // Nécessite inscription gratuite sur cas.org — optionnel
        enabled: false    // Désactivé par défaut (API key requise depuis 2025)
    },
    tgsc: {
        // Pas d'API, on tente le scraping via CAS listing
        // Dégradation gracieuse si inaccessible
        baseUrl: 'http://www.thegoodscentscompany.com',
        rateLimit: 1000,  // respectueux du serveur
        timeout: 8000,
        enabled: true     // peut être désactivé si le site est down
    }
};

// ═══════════════════════════════════════════════════════════════
// UTILITAIRES HTTP
// ═══════════════════════════════════════════════════════════════

function httpGet(url, timeout = 10000) {
    return new Promise((resolve, reject) => {
        const proto = url.startsWith('https') ? https : http;
        const req = proto.get(url, { timeout }, (res) => {
            // Suivre les redirections (max 3)
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return httpGet(res.headers.location, timeout).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) {
                return reject(new Error(`HTTP ${res.statusCode}`));
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function cleanNumber(val) {
    if (val === undefined || val === null || val === '') return null;
    const n = parseFloat(String(val).replace(/[^\d.\-]/g, ''));
    return isNaN(n) ? null : n;
}

// ═══════════════════════════════════════════════════════════════
// SOURCE 1 : PUBCHEM
// ═══════════════════════════════════════════════════════════════

async function fetchPubChem(cas) {
    const result = {
        source: 'pubchem',
        found: false,
        cid: null,
        iupac_name: null,
        molecular_formula: null,
        molecular_weight: null,
        canonical_smiles: null,
        xlogp: null,
        exact_mass: null,
        synonyms: [],
        common_name: null
    };

    try {
        // Étape 1 : CAS → CID
        const cidUrl = `${CONFIG.pubchem.baseUrl}/compound/name/${encodeURIComponent(cas)}/cids/JSON`;
        const cidData = JSON.parse(await httpGet(cidUrl, CONFIG.pubchem.timeout));
        const cid = cidData?.IdentifierList?.CID?.[0];
        if (!cid) return result;
        result.cid = cid;
        result.found = true;

        // Étape 2 : Propriétés de base (PUG REST)
        await sleep(CONFIG.pubchem.rateLimit);
        const props = [
            'IUPACName', 'MolecularFormula', 'MolecularWeight',
            'CanonicalSMILES', 'XLogP', 'ExactMass'
        ].join(',');
        const propUrl = `${CONFIG.pubchem.baseUrl}/compound/cid/${cid}/property/${props}/JSON`;
        const propData = JSON.parse(await httpGet(propUrl, CONFIG.pubchem.timeout));
        const p = propData?.PropertyTable?.Properties?.[0];

        if (p) {
            result.iupac_name = p.IUPACName || null;
            result.molecular_formula = p.MolecularFormula || null;
            result.molecular_weight = cleanNumber(p.MolecularWeight);
            result.canonical_smiles = p.CanonicalSMILES || null;
            result.xlogp = cleanNumber(p.XLogP);
            result.exact_mass = cleanNumber(p.ExactMass);
        }

        // Étape 3 : Synonymes (→ nom courant)
        await sleep(CONFIG.pubchem.rateLimit);
        try {
            const synUrl = `${CONFIG.pubchem.baseUrl}/compound/cid/${cid}/synonyms/JSON`;
            const synData = JSON.parse(await httpGet(synUrl, CONFIG.pubchem.timeout));
            const allSyns = synData?.InformationList?.Information?.[0]?.Synonym || [];
            result.synonyms = allSyns.slice(0, 15);
            // Extraire le nom courant (pas CAS, pas trop long, pas IUPAC avec virgules)
            const shortNames = allSyns.filter(s => 
                !s.replace(/[-\s]/g, '').match(/^\d+$/) &&  // pas un CAS
                s.length < 35 &&
                !s.includes(',') &&
                !s.includes('(') &&
                !s.match(/^\d/)
            );
            result.common_name = shortNames[0] || allSyns[0] || null;
        } catch (e) {}

        // Étape 4 : PUG View — requêtes ciblées par heading
        // Chaque heading est une requête séparée, plus fiable que le bulk
        const pugViewBase = `${CONFIG.pubchem.baseUrl}_view/data/compound/${cid}/JSON?heading=`;
        
        // 4a : Odeur
        await sleep(CONFIG.pubchem.rateLimit);
        try {
            const odorData = JSON.parse(await httpGet(pugViewBase + 'Odor', CONFIG.pubchem.timeout));
            const odorStrings = extractPugViewStrings(odorData);
            if (odorStrings.length > 0) {
                result.odor_descriptions = odorStrings.slice(0, 5);
                // Premier descripteur comme type d'odeur
                result.odor_type = extractOdorType(odorStrings[0]);
                result.odor_description = odorStrings[0];
            }
        } catch (e) {}

        // 4b : Point d'ébullition
        await sleep(CONFIG.pubchem.rateLimit);
        try {
            const bpData = JSON.parse(await httpGet(pugViewBase + 'Boiling+Point', CONFIG.pubchem.timeout));
            const bpStrings = extractPugViewStrings(bpData);
            for (const s of bpStrings) {
                const bp = cleanNumber(s);
                if (bp !== null && bp > -300 && bp < 1000) {
                    result.boiling_point_c = bp;
                    break;
                }
            }
        } catch (e) {}

        // 4c : Point éclair
        await sleep(CONFIG.pubchem.rateLimit);
        try {
            const fpData = JSON.parse(await httpGet(pugViewBase + 'Flash+Point', CONFIG.pubchem.timeout));
            const fpStrings = extractPugViewStrings(fpData);
            for (const s of fpStrings) {
                const fp = cleanNumber(s);
                if (fp !== null && fp > -100 && fp < 500) {
                    result.flash_point_c = fp;
                    break;
                }
            }
        } catch (e) {}

        // 4d : Densité
        await sleep(CONFIG.pubchem.rateLimit);
        try {
            const dData = JSON.parse(await httpGet(pugViewBase + 'Density', CONFIG.pubchem.timeout));
            const dStrings = extractPugViewStrings(dData);
            for (const s of dStrings) {
                const d = cleanNumber(s);
                if (d !== null && d > 0.3 && d < 3) {
                    result.density = d;
                    break;
                }
            }
        } catch (e) {}

        // 4e : Pression vapeur
        await sleep(CONFIG.pubchem.rateLimit);
        try {
            const vpData = JSON.parse(await httpGet(pugViewBase + 'Vapor+Pressure', CONFIG.pubchem.timeout));
            const vpStrings = extractPugViewStrings(vpData);
            for (const s of vpStrings) {
                const vp = cleanNumber(s);
                if (vp !== null && vp >= 0) {
                    result.vapor_pressure_mmhg = vp;
                    break;
                }
            }
        } catch (e) {}

        // 4f : Point de fusion
        await sleep(CONFIG.pubchem.rateLimit);
        try {
            const mpData = JSON.parse(await httpGet(pugViewBase + 'Melting+Point', CONFIG.pubchem.timeout));
            const mpStrings = extractPugViewStrings(mpData);
            if (mpStrings.length > 0) {
                result.melting_point = mpStrings[0];
            }
        } catch (e) {}

    } catch (e) {
        // CAS pas trouvé sur PubChem (normal pour HE/mélanges)
    }

    return result;
}

/**
 * Extraire toutes les chaînes de texte d'une réponse PUG View
 */
function extractPugViewStrings(obj) {
    const results = [];
    if (!obj) return results;
    
    function walk(node) {
        if (typeof node === 'string') return;
        if (Array.isArray(node)) {
            for (const item of node) walk(item);
            return;
        }
        if (typeof node === 'object' && node !== null) {
            // StringWithMarkup contient le texte
            if (node.StringWithMarkup) {
                for (const swm of node.StringWithMarkup) {
                    if (swm.String) results.push(swm.String);
                }
            }
            // Number[] contient des valeurs numériques
            if (node.Number && Array.isArray(node.Number)) {
                results.push(node.Number[0]?.toString());
            }
            for (const val of Object.values(node)) {
                walk(val);
            }
        }
    }
    
    walk(obj);
    return results.filter(Boolean);
}

/**
 * Extraire le type d'odeur principal d'une description
 * Ex: "Floral, spicy, wood odor" → "floral"
 * Ex: "Odor similar to bergamot oil" → "bergamot"
 */
function extractOdorType(desc) {
    if (!desc) return null;
    const lower = desc.toLowerCase();
    
    // Familles olfactives connues
    const families = [
        'floral', 'woody', 'citrus', 'fruity', 'green', 'herbal',
        'spicy', 'sweet', 'musky', 'balsamic', 'earthy', 'fresh',
        'camphoraceous', 'minty', 'powdery', 'smoky', 'amber',
        'animalic', 'aquatic', 'aromatic', 'leather', 'ozonic',
        'resinous', 'vanilla', 'warm', 'waxy', 'creamy',
        'rose', 'jasmine', 'lavender', 'bergamot', 'cedar',
        'sandalwood', 'musk', 'cinnamon', 'clove', 'pine'
    ];
    
    for (const fam of families) {
        if (lower.includes(fam)) return fam;
    }
    
    // Prendre le premier mot significatif
    const words = lower.replace(/odor|smell|scent|aroma|similar|to|of|and|the|with|a|an/gi, '')
                       .trim().split(/[\s,;]+/);
    return words[0] || null;
}

// ═══════════════════════════════════════════════════════════════
// SOURCE 2 : COMMON CHEMISTRY (CAS.org)
// ═══════════════════════════════════════════════════════════════

async function fetchCommonChemistry(cas) {
    const result = {
        source: 'common_chemistry',
        found: false,
        name: null,
        synonyms: [],
        melting_point: null,
        experimental_properties: [],
        inchi: null,
        smile: null,
        molecular_formula: null,
        molecular_mass: null
    };

    try {
        // Common Chemistry nécessite une API key depuis 2025
        if (!CONFIG.commonChem.enabled || !CONFIG.commonChem.apiKey) return result;
        
        const url = `${CONFIG.commonChem.baseUrl}/detail?cas_rn=${encodeURIComponent(cas)}`;
        const data = JSON.parse(await httpGet(url, CONFIG.commonChem.timeout));

        if (data && data.rn) {
            result.found = true;
            result.name = data.name || null;
            result.synonyms = (data.synonyms || []).slice(0, 10);  // max 10 synonymes
            result.inchi = data.inchi || null;
            result.smile = data.smile || null;
            result.molecular_formula = data.molecularFormula || null;
            result.molecular_mass = cleanNumber(data.molecularMass);

            // Propriétés expérimentales
            if (data.experimentalProperties && data.experimentalProperties.length > 0) {
                result.experimental_properties = data.experimentalProperties;
                for (const prop of data.experimentalProperties) {
                    const propName = (prop.name || '').toLowerCase();
                    const propVal = prop.property || '';
                    if (propName.includes('melting') || propName.includes('fusion')) {
                        result.melting_point = propVal;
                    }
                    if (propName.includes('boiling') || propName.includes('ébullition')) {
                        result.boiling_point = propVal;
                    }
                    if (propName.includes('density') || propName.includes('densité')) {
                        result.density_str = propVal;
                    }
                }
            }
        }
    } catch (e) {
        // 404 = pas dans Common Chemistry (normal pour molécules rares)
    }

    return result;
}

// ═══════════════════════════════════════════════════════════════
// SOURCE 3 : THE GOOD SCENTS COMPANY (scraping)
// ═══════════════════════════════════════════════════════════════

async function fetchTGSC(cas, name) {
    const result = {
        source: 'tgsc',
        found: false,
        odor_type: null,
        odor_description: null,
        flavor_type: null,
        tgsc_url: null
    };

    if (!CONFIG.tgsc.enabled) return result;

    try {
        // Stratégie : chercher dans les pages de listing CAS de TGSC
        // Le site n'a pas d'API, mais les pages data contiennent les infos
        // On utilise la structure connue : /data/rw{code}.html pour raw materials,
        // /data/es{code}.html pour essential oils
        
        // Tentative 1 : recherche directe via l'URL de recherche TGSC
        // Note: la recherche TGSC est souvent cassée, cette tentative peut échouer
        const searchUrl = `${CONFIG.tgsc.baseUrl}/search3.html?qName=${encodeURIComponent(cas)}`;
        
        try {
            const searchHtml = await httpGet(searchUrl, CONFIG.tgsc.timeout);
            
            // Extraire les liens vers les fiches de données
            const dataLinkMatch = searchHtml.match(/\/data\/[a-z]{2}\d+\.html/g);
            if (dataLinkMatch && dataLinkMatch.length > 0) {
                const dataUrl = `${CONFIG.tgsc.baseUrl}${dataLinkMatch[0]}`;
                result.tgsc_url = dataUrl;
                
                const pageHtml = await httpGet(dataUrl, CONFIG.tgsc.timeout);
                extractTGSCData(pageHtml, result);
            }
        } catch (e) {
            // Recherche TGSC inaccessible — tentative alternative
        }

        // Tentative 2 : si pas trouvé, essayer via le CAS dans le titre de la page
        if (!result.found) {
            try {
                // Certaines pages TGSC suivent un pattern avec le CAS dans le H1
                // On tente de charger la page CAS listing et trouver notre molécule
                const casPrefix = cas.split('-')[0];
                const listPage = casPrefix.length <= 3 ? 1 : 
                                 parseInt(casPrefix) < 124 ? 1 :
                                 parseInt(casPrefix) < 764 ? 2 :
                                 parseInt(casPrefix) < 4602 ? 3 :
                                 parseInt(casPrefix) < 7786 ? 4 :
                                 parseInt(casPrefix) < 18794 ? 5 :
                                 parseInt(casPrefix) < 30685 ? 6 :
                                 parseInt(casPrefix) < 41820 ? 7 :
                                 parseInt(casPrefix) < 68037 ? 8 :
                                 parseInt(casPrefix) < 102504 ? 9 : 10;
                
                const listUrl = `${CONFIG.tgsc.baseUrl}/allproc-${listPage}.html`;
                const listHtml = await httpGet(listUrl, CONFIG.tgsc.timeout);
                
                // Chercher le CAS dans la page de listing
                const casEscaped = cas.replace(/[-]/g, '\\-');
                const regex = new RegExp(`href="(/data/[a-z]{2}\\d+\\.html)"[^>]*>[^<]*${casEscaped}`, 'i');
                const match = listHtml.match(regex);
                
                if (match) {
                    const dataUrl = `${CONFIG.tgsc.baseUrl}${match[1]}`;
                    result.tgsc_url = dataUrl;
                    
                    await sleep(CONFIG.tgsc.rateLimit);
                    const pageHtml = await httpGet(dataUrl, CONFIG.tgsc.timeout);
                    extractTGSCData(pageHtml, result);
                }
            } catch (e) {
                // Listing TGSC inaccessible — on saute
            }
        }

    } catch (e) {
        // TGSC totalement inaccessible
    }

    return result;
}

/**
 * Extraire les données olfactives d'une page TGSC
 */
function extractTGSCData(html, result) {
    if (!html) return;

    // Type d'odeur : "Has a(n) XXX type odor"
    const odorTypeMatch = html.match(/[Hh]as\s+(?:a|an)\s+(\w[\w\s,/]+?)\s+type\s+odor/i);
    if (odorTypeMatch) {
        result.odor_type = odorTypeMatch[1].trim().toLowerCase();
        result.found = true;
    }

    // Description olfactive : "Odor Description:" suivi du texte
    const odorDescMatch = html.match(/Odor\s*Description[:\s]*<[^>]*>([^<]+)</i);
    if (odorDescMatch) {
        result.odor_description = odorDescMatch[1].trim();
        result.found = true;
    }

    // Type de flaveur : "Has a(n) XXX type flavor"
    const flavorMatch = html.match(/[Hh]as\s+(?:a|an)\s+(\w[\w\s,/]+?)\s+type\s+flavor/i);
    if (flavorMatch) {
        result.flavor_type = flavorMatch[1].trim().toLowerCase();
    }

    // Extraction alternative depuis les balises organoleptics
    if (!result.odor_type) {
        const orgMatch = html.match(/Organoleptics[^]*?odor[:\s]+([a-z][a-z\s,]+)/i);
        if (orgMatch) {
            result.odor_type = orgMatch[1].trim().toLowerCase().split(/[,;]/)[0].trim();
            result.found = true;
        }
    }

    // Functional use - parfois la seule info dispo
    if (!result.odor_type) {
        const funcMatch = html.match(/Functional\s+use[^-]*?-\s*(?:flavor\s+and\s+)?fragrance\s+agents?\.\s*Has\s+(?:a|an)\s+(\w+)/i);
        if (funcMatch) {
            result.odor_type = funcMatch[1].trim().toLowerCase();
            result.found = true;
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// FUSION DES DONNÉES MULTI-SOURCES
// ═══════════════════════════════════════════════════════════════

function mergeResults(cas, name, pubchem, commonChem, tgsc) {
    const merged = {
        cas: cas,
        name: null,
        iupac_name: null,
        molecular_formula: null,
        molecular_weight: null,
        logp: null,
        boiling_point_c: null,
        melting_point: null,
        flash_point_c: null,
        density: null,
        vapor_pressure_mmhg: null,
        canonical_smiles: null,
        inchi: null,
        odor_type: null,
        odor_description: null,
        // Métadonnées
        sources: [],
        sources_found: 0,
        enriched_at: new Date().toISOString(),
        needs_claude_session: false,
        missing_fields: []
    };

    // --- Nom : priorité PubChem common_name > Common Chemistry > nom FDS ---
    if (pubchem.common_name) {
        merged.name = pubchem.common_name;
    } else if (commonChem.found && commonChem.name) {
        merged.name = commonChem.name;
    }
    if (!merged.name && name && !name.match(/^CAS\s/i) && !name.match(/^[\d\-]+$/)) {
        merged.name = name;  // nom de la FDS si pas corrompu
    }
    merged.iupac_name = pubchem.iupac_name || null;

    // Synonymes (PubChem prioritaire, complété par Common Chemistry)
    merged.synonyms = pubchem.synonyms.length > 0 ? pubchem.synonyms :
                      (commonChem.synonyms && commonChem.synonyms.length > 0) ? commonChem.synonyms : [];
    // Si le nom est un IUPAC long, utiliser le common_name
    if (pubchem.common_name) {
        merged.common_name = pubchem.common_name;
    } else if (merged.name && merged.name.length > 60 && merged.synonyms.length > 0) {
        merged.common_name = merged.synonyms[0];
    }

    // --- Formule moléculaire : PubChem > Common Chemistry ---
    merged.molecular_formula = pubchem.molecular_formula || commonChem.molecular_formula || null;

    // --- Poids moléculaire : PubChem > Common Chemistry ---
    merged.molecular_weight = pubchem.molecular_weight || commonChem.molecular_mass || null;

    // --- LogP : PubChem uniquement ---
    merged.logp = pubchem.xlogp || null;

    // --- Point d'ébullition : PubChem PUG View ---
    merged.boiling_point_c = pubchem.boiling_point_c || null;
    // Fallback Common Chemistry (texte)
    if (!merged.boiling_point_c && commonChem.boiling_point) {
        const bp = cleanNumber(commonChem.boiling_point);
        if (bp !== null) merged.boiling_point_c = bp;
    }

    // --- Flash point, densité, pression vapeur : PubChem ---
    merged.flash_point_c = pubchem.flash_point_c || null;
    merged.density = pubchem.density || null;
    merged.vapor_pressure_mmhg = pubchem.vapor_pressure_mmhg || null;
    // Fallback Common Chemistry densité
    if (!merged.density && commonChem.density_str) {
        const d = cleanNumber(commonChem.density_str);
        if (d !== null) merged.density = d;
    }

    // --- SMILES, InChI ---
    merged.canonical_smiles = pubchem.canonical_smiles || commonChem.smile || null;
    merged.inchi = commonChem.inchi || null;

    // --- Données olfactives : PubChem PUG View prioritaire, TGSC en fallback ---
    if (pubchem.odor_type) {
        merged.odor_type = pubchem.odor_type;
        merged.odor_description = pubchem.odor_description || null;
        if (pubchem.odor_descriptions) {
            merged.odor_descriptions = pubchem.odor_descriptions;
        }
    }
    if (tgsc.found) {
        if (!merged.odor_type && tgsc.odor_type) {
            merged.odor_type = tgsc.odor_type;
        }
        if (!merged.odor_description && tgsc.odor_description) {
            merged.odor_description = tgsc.odor_description;
        }
        merged.flavor_type = tgsc.flavor_type || null;
        merged.tgsc_url = tgsc.tgsc_url || null;
    }

    // --- Point de fusion : PubChem PUG View > Common Chemistry ---
    if (pubchem.melting_point) {
        merged.melting_point = pubchem.melting_point;
    } else if (commonChem.melting_point) {
        merged.melting_point = commonChem.melting_point;
    }

    // --- Bilan des sources ---
    if (pubchem.found) merged.sources.push('pubchem');
    if (commonChem.found) merged.sources.push('common_chemistry');
    if (tgsc.found) merged.sources.push('tgsc');
    merged.sources_found = merged.sources.length;

    // --- Champs manquants ---
    if (!merged.molecular_weight) merged.missing_fields.push('molecular_weight');
    if (!merged.logp) merged.missing_fields.push('logp');
    if (!merged.boiling_point_c) merged.missing_fields.push('boiling_point_c');
    if (!merged.odor_type) merged.missing_fields.push('odor_type');
    if (!merged.name || merged.name.match(/^[\d\-]+$/)) merged.missing_fields.push('name');

    // Marquer pour enrichissement Claude si données critiques manquantes
    merged.needs_claude_session = (
        merged.sources_found === 0 ||                          // aucune source n'a trouvé
        (!merged.molecular_weight && !merged.odor_type) ||     // ni physico ni olfactif
        (!merged.logp && !merged.odor_type)                    // pas de quoi classer
    );

    return merged;
}

// ═══════════════════════════════════════════════════════════════
// CLASSIFICATION VOLATILITÉ (compatibilité serveur existant)
// ═══════════════════════════════════════════════════════════════

function classifyVolatility(logp) {
    if (logp === null || logp === undefined) return null;
    if (logp < 2) return 'tete_haute';   // très volatile
    if (logp < 3) return 'tete';          // note de tête
    if (logp < 4) return 'coeur';         // note de cœur
    if (logp < 5) return 'fond';          // note de fond
    return 'fixateur';                     // fixateur
}

function classifyVolatilityFr(logp) {
    const key = classifyVolatility(logp);
    const labels = {
        'tete_haute': 'Tête haute (très volatile)',
        'tete': 'Tête',
        'coeur': 'Cœur',
        'fond': 'Fond',
        'fixateur': 'Fixateur (très persistant)'
    };
    return labels[key] || 'Inconnu';
}

// ═══════════════════════════════════════════════════════════════
// GÉNÉRATION FICHE KB (molecule_db)
// ═══════════════════════════════════════════════════════════════

function generateKBEntry(merged) {
    const parts = [];

    // Ligne 1 : identité
    const displayName = merged.common_name || merged.name || merged.iupac_name || merged.cas;
    parts.push(`# ${displayName}`);
    if (merged.iupac_name && merged.iupac_name !== displayName) {
        parts.push(`IUPAC : ${merged.iupac_name}`);
    }
    if (merged.synonyms && merged.synonyms.length > 0) {
        parts.push(`Synonymes : ${merged.synonyms.slice(0, 5).join(', ')}`);
    }

    // Propriétés physico-chimiques
    const physProps = [];
    if (merged.molecular_formula) physProps.push(`Formule : ${merged.molecular_formula}`);
    if (merged.molecular_weight) physProps.push(`MW : ${merged.molecular_weight} g/mol`);
    if (merged.logp !== null) physProps.push(`LogP : ${merged.logp}`);
    if (merged.boiling_point_c) physProps.push(`Point d'ébullition : ${merged.boiling_point_c}°C`);
    if (merged.melting_point) physProps.push(`Point de fusion : ${merged.melting_point}`);
    if (merged.flash_point_c) physProps.push(`Point éclair : ${merged.flash_point_c}°C`);
    if (merged.density) physProps.push(`Densité : ${merged.density}`);
    if (merged.vapor_pressure_mmhg) physProps.push(`Pression vapeur : ${merged.vapor_pressure_mmhg} mmHg`);
    if (physProps.length > 0) {
        parts.push('');
        parts.push('## Propriétés physico-chimiques');
        parts.push(physProps.join(' | '));
    }

    // Classification olfactive
    if (merged.logp !== null) {
        parts.push('');
        parts.push(`## Volatilité : ${classifyVolatilityFr(merged.logp)}`);
    }

    // Données olfactives
    if (merged.odor_type || merged.odor_description) {
        parts.push('');
        parts.push('## Profil olfactif');
        if (merged.odor_type) parts.push(`Type d'odeur : ${merged.odor_type}`);
        if (merged.odor_description) parts.push(`Description : ${merged.odor_description}`);
        if (merged.flavor_type) parts.push(`Flaveur : ${merged.flavor_type}`);
    }

    // Sources
    parts.push('');
    parts.push(`Sources : ${merged.sources.join(', ') || 'aucune'} | Enrichi le ${merged.enriched_at.split('T')[0]}`);

    if (merged.needs_claude_session) {
        parts.push('⚠️ Données incomplètes — enrichissement session Claude recommandé');
    }

    return parts.join('\n');
}

// ═══════════════════════════════════════════════════════════════
// ENRICHISSEMENT UNIQUE
// ═══════════════════════════════════════════════════════════════

async function enrichSingle(cas, name, options = {}) {
    const skipTGSC = options.skipTGSC || false;

    // Source 1 : PubChem
    const pubchem = await fetchPubChem(cas);
    await sleep(CONFIG.pubchem.rateLimit);

    // Source 2 : Common Chemistry
    const commonChem = await fetchCommonChemistry(cas);
    await sleep(CONFIG.commonChem.rateLimit);

    // Source 3 : TGSC (optionnel)
    let tgsc = { source: 'tgsc', found: false };
    if (!skipTGSC && CONFIG.tgsc.enabled) {
        tgsc = await fetchTGSC(cas, name);
        await sleep(CONFIG.tgsc.rateLimit);
    }

    // Fusion
    const merged = mergeResults(cas, name, pubchem, commonChem, tgsc);
    
    return merged;
}

// ═══════════════════════════════════════════════════════════════
// SAUVEGARDE EN KB
// ═══════════════════════════════════════════════════════════════

async function saveToKB(db, cas, merged) {
    // Vérifier si une entrée existe déjà
    const existing = await db.get(
        `SELECT id FROM knowledge_base WHERE title = ? AND category = 'molecule_db'`, [cas]
    );

    const kbText = generateKBEntry(merged);

    // Métadonnées JSON embarquées en fin de contenu (pas de colonne metadata requise)
    const metadata = JSON.stringify({
        cas: merged.cas,
        name: merged.name || merged.common_name || merged.iupac_name,
        mw: merged.molecular_weight,
        logp: merged.logp,
        bp: merged.boiling_point_c,
        mp: merged.melting_point,
        fp: merged.flash_point_c,
        density: merged.density,
        vp: merged.vapor_pressure_mmhg,
        formula: merged.molecular_formula,
        smiles: merged.canonical_smiles,
        odor_type: merged.odor_type,
        odor_desc: merged.odor_description,
        volatility: classifyVolatility(merged.logp),
        sources: merged.sources,
        needs_claude: merged.needs_claude_session
    });
    
    const fullContent = kbText + '\n\n---JSON_META---\n' + metadata;
    const subcategory = merged.odor_type || classifyVolatility(merged.logp) || 'autre';
    const source = (merged.sources || []).join(', ') || 'auto';
    const priority = merged.needs_claude_session ? 2 : (merged.sources_found >= 2 ? 5 : 3);
    const tags = `molecule,${cas},${merged.odor_type || ''},${classifyVolatility(merged.logp) || ''}`;

    if (existing) {
        await db.run(
            `UPDATE knowledge_base SET content = ?, subcategory = ?, source = ?, priority = ?, tags = ? WHERE id = ?`,
            [fullContent, subcategory, source, priority, tags, existing.id]
        );
        return { action: 'updated', id: existing.id };
    } else {
        const result = await db.run(
            `INSERT INTO knowledge_base (title, category, subcategory, content, source, priority, tags)
             VALUES (?, 'molecule_db', ?, ?, ?, ?, ?)`,
            [cas, subcategory, fullContent, source, priority, tags]
        );
        return { action: 'created', id: result.lastID || result.lastInsertRowid };
    }
}

// ═══════════════════════════════════════════════════════════════
// ENRICHISSEMENT PAR LOT
// ═══════════════════════════════════════════════════════════════

async function enrichUnknownMolecules(db, options = {}) {
    const batchSize = options.batchSize || 999;
    const onProgress = options.onProgress || null;
    const skipTGSC = options.skipTGSC || false;
    const forceRefresh = options.forceRefresh || false;
    const offset = options.offset || 0;

    // Trouver les CAS à enrichir
    let unknownCAS;
    
    if (forceRefresh) {
        // Ré-enrichir tout (avec pagination via offset)
        unknownCAS = await db.all(`
            SELECT DISTINCT pc.cas_number as cas, pc.name as name 
            FROM fragrance_components pc 
            WHERE pc.cas_number IS NOT NULL AND pc.cas_number != ''
            ORDER BY pc.cas_number
            LIMIT ? OFFSET ?
        `, [batchSize, offset]);
    } else {
        // Seulement les CAS sans fiche KB molecule_db OU les fiches marquées incomplètes
        unknownCAS = await db.all(`
            SELECT DISTINCT pc.cas_number as cas, pc.name as name 
            FROM fragrance_components pc 
            LEFT JOIN knowledge_base kb ON kb.title = pc.cas_number AND kb.category = 'molecule_db'
            WHERE pc.cas_number IS NOT NULL AND pc.cas_number != ''
            AND (kb.id IS NULL OR kb.content LIKE '%"needs_claude":true%')
            ORDER BY pc.cas_number
            LIMIT ?
        `, [batchSize]);
    }

    const report = {
        total_to_process: unknownCAS.length,
        enriched: [],
        updated: [],
        failed: [],
        needs_claude: [],
        already_known: 0,
        stats: {
            pubchem_hits: 0,
            common_chemistry_hits: 0,
            tgsc_hits: 0,
            total_sources_crossed: 0
        }
    };

    for (let i = 0; i < unknownCAS.length; i++) {
        const { cas, name } = unknownCAS[i];

        try {
            // Vérifier si déjà enrichi (sauf forceRefresh)
            if (!forceRefresh) {
                const existing = await db.get(`SELECT content FROM knowledge_base WHERE title = ? AND category = 'molecule_db'`, [cas]);
                
                if (existing && existing.content) {
                    try {
                        const metaMatch = existing.content.match(/---JSON_META---\n(.+)$/s);
                        if (metaMatch) {
                            const meta = JSON.parse(metaMatch[1].trim());
                            if (!meta.needs_claude && meta.sources && meta.sources.length > 0) {
                                report.already_known++;
                                continue;
                            }
                        }
                    } catch (e) {}
                }
            }

            // Enrichir
            const merged = await enrichSingle(cas, name, { skipTGSC });
            
            // Sauvegarder
            const saveResult = await saveToKB(db, cas, merged);

            // Rapport
            if (merged.sources_found > 0) {
                const entry = {
                    cas,
                    name: merged.name || merged.common_name || name,
                    molecular_weight: merged.molecular_weight,
                    logp: merged.logp,
                    odor_type: merged.odor_type,
                    sources: merged.sources,
                    sources_found: merged.sources_found,
                    missing: merged.missing_fields
                };

                if (saveResult.action === 'created') {
                    report.enriched.push(entry);
                } else {
                    report.updated.push(entry);
                }

                // Stats
                if (merged.sources.includes('pubchem')) report.stats.pubchem_hits++;
                if (merged.sources.includes('common_chemistry')) report.stats.common_chemistry_hits++;
                if (merged.sources.includes('tgsc')) report.stats.tgsc_hits++;
                report.stats.total_sources_crossed += merged.sources_found;
            } else {
                report.failed.push({ cas, name, reason: 'Aucune source n\'a trouvé ce CAS' });
            }

            if (merged.needs_claude_session) {
                report.needs_claude.push({
                    cas,
                    name: merged.name || name,
                    missing: merged.missing_fields,
                    has_pubchem: merged.sources.includes('pubchem'),
                    has_cc: merged.sources.includes('common_chemistry')
                });
            }

            // Progression
            if (onProgress) {
                onProgress({
                    current: i + 1,
                    total: unknownCAS.length,
                    cas,
                    status: merged.sources_found > 0 ? 'ok' : 'failed',
                    sources: merged.sources
                });
            }

        } catch (e) {
            report.failed.push({ cas, name, reason: e.message });
        }
    }

    // Résumé compteurs (pour scripts batch)
    report.summary = {
        processed: report.enriched.length + report.updated.length + report.failed.length,
        updated: report.enriched.length + report.updated.length,
        errors: report.failed.length,
        needs_claude: report.needs_claude.length,
        offset: offset,
        next_offset: offset + unknownCAS.length,
        has_more: unknownCAS.length === batchSize
    };

    return report;
}

// ═══════════════════════════════════════════════════════════════
// IMPORT SESSION CLAUDE (JSON)
// ═══════════════════════════════════════════════════════════════

/**
 * Importer des données enrichies manuellement depuis une session Claude
 * Format attendu : tableau d'objets avec au minimum { cas, ... }
 */
async function importClaudeSession(db, entries) {
    const report = { imported: 0, updated: 0, errors: [] };

    for (const entry of entries) {
        if (!entry.cas) {
            report.errors.push({ entry, reason: 'CAS manquant' });
            continue;
        }

        try {
            // Construire un merged-like depuis les données Claude
            const merged = {
                cas: entry.cas,
                name: entry.name || null,
                common_name: entry.common_name || null,
                iupac_name: entry.iupac_name || null,
                molecular_formula: entry.molecular_formula || null,
                molecular_weight: entry.molecular_weight || null,
                logp: entry.logp || null,
                boiling_point_c: entry.boiling_point_c || entry.bp || null,
                melting_point: entry.melting_point || entry.mp || null,
                flash_point_c: entry.flash_point_c || entry.fp || null,
                density: entry.density || null,
                vapor_pressure_mmhg: entry.vapor_pressure || null,
                canonical_smiles: entry.smiles || null,
                inchi: entry.inchi || null,
                odor_type: entry.odor_type || null,
                odor_description: entry.odor_description || null,
                flavor_type: entry.flavor_type || null,
                synonyms: entry.synonyms || [],
                // Données métier bougie (spécifique sessions Claude)
                candle_behavior: entry.candle_behavior || null,
                olfactory_family: entry.olfactory_family || null,
                is_natural: entry.is_natural || null,
                pyramid_position: entry.pyramid_position || null,
                // Métadonnées
                sources: ['claude_session', ...(entry.sources || [])],
                sources_found: 1,
                enriched_at: new Date().toISOString(),
                needs_claude_session: false,
                missing_fields: []
            };

            const result = await saveToKB(db, entry.cas, merged);
            if (result.action === 'created') report.imported++;
            else report.updated++;
        } catch (e) {
            report.errors.push({ cas: entry.cas, reason: e.message });
        }
    }

    return report;
}

// ═══════════════════════════════════════════════════════════════
// HELPER : LIRE DONNÉES KB MOLECULE_DB
// ═══════════════════════════════════════════════════════════════

/**
 * Lire les métadonnées de toutes les molécules en KB
 * Utilisé par le serveur pour le prédictif
 */
async function getMoleculeKB(db) {
    const rows = await db.all(`SELECT title as cas, content FROM knowledge_base WHERE category = 'molecule_db'`);

    const molecules = {};
    for (const row of rows) {
        try {
            // Extraire les métadonnées JSON embarquées dans le contenu
            const metaMatch = row.content && row.content.match(/---JSON_META---\n(.+)$/s);
            if (metaMatch) {
                const meta = JSON.parse(metaMatch[1].trim());
                molecules[row.cas] = {
                    cas: row.cas,
                    name: meta.name,
                    mw: meta.mw,
                    logp: meta.logp,
                    bp: meta.bp,
                    fp: meta.fp,
                    density: meta.density,
                    vp: meta.vp,
                    formula: meta.formula,
                    odor_type: meta.odor_type,
                    odor_desc: meta.odor_desc,
                    volatility: meta.volatility || classifyVolatility(meta.logp),
                    sources: meta.sources || [],
                    needs_claude: meta.needs_claude || false
                };
            } else {
                // Fallback : parser le contenu texte (ancien format)
                molecules[row.cas] = parseOldKBFormat(row.cas, row.content);
            }
        } catch (e) {
            // Skip entrées corrompues
        }
    }

    return molecules;
}

/**
 * Parser l'ancien format KB texte (rétrocompatibilité)
 */
function parseOldKBFormat(cas, content) {
    if (!content) return { cas, name: cas };
    
    const result = { cas, name: cas };

    // LogP
    const logpMatch = content.match(/LogP\s*[:=]\s*([\d.\-]+)/i);
    if (logpMatch) result.logp = parseFloat(logpMatch[1]);

    // MW
    const mwMatch = content.match(/MW\s*[:=]\s*([\d.]+)/i) || content.match(/Masse\s*moléculaire\s*[:=]\s*([\d.]+)/i);
    if (mwMatch) result.mw = parseFloat(mwMatch[1]);

    // BP
    const bpMatch = content.match(/(?:Point\s*d'ébullition|Boiling\s*point|BP)\s*[:=]\s*([\d.]+)/i);
    if (bpMatch) result.bp = parseFloat(bpMatch[1]);

    // Densité
    const dMatch = content.match(/[Dd]ensit[ée]\s*[:=]\s*([\d.]+)/);
    if (dMatch) result.density = parseFloat(dMatch[1]);

    // Flash point
    const fpMatch = content.match(/(?:Point\s*éclair|Flash\s*point|FP)\s*[:=]\s*([\d.]+)/i);
    if (fpMatch) result.fp = parseFloat(fpMatch[1]);

    // Nom depuis le titre (première ligne #)
    const nameMatch = content.match(/^#\s+(.+)$/m);
    if (nameMatch) result.name = nameMatch[1].trim();

    result.volatility = classifyVolatility(result.logp);

    return result;
}

// ═══════════════════════════════════════════════════════════════
// GÉNÉRATION JSON POUR EXPORT SESSION CLAUDE
// ═══════════════════════════════════════════════════════════════

/**
 * Exporter la liste des CAS qui nécessitent un enrichissement Claude
 */
async function exportNeedsClaude(db) {
    const rows = await db.all(`
        SELECT kb.title as cas, kb.content, pc.name as fds_name
        FROM knowledge_base kb
        LEFT JOIN fragrance_components pc ON pc.cas_number = kb.title
        WHERE kb.category = 'molecule_db' 
        AND kb.content LIKE '%"needs_claude":true%'
        GROUP BY kb.title
    `);

    const list = [];
    for (const row of rows) {
        try {
            const metaMatch = row.content && row.content.match(/---JSON_META---\n(.+)$/s);
            const meta = metaMatch ? JSON.parse(metaMatch[1].trim()) : {};
            list.push({
                cas: row.cas,
                current_name: meta.name || row.fds_name || row.cas,
                has_mw: !!meta.mw,
                has_logp: !!meta.logp,
                has_odor: !!meta.odor_type,
                sources_found: (meta.sources || []).length,
                missing: meta.needs_claude ? 'enrichissement complet recommandé' : ''
            });
        } catch (e) {}
    }

    return list;
}

/**
 * Exporter tous les CAS sans fiche KB du tout
 */
async function exportOrphans(db) {
    return await db.all(`
        SELECT DISTINCT pc.cas_number as cas, pc.name as name,
               COUNT(DISTINCT pc.fragrance_id) as parfum_count
        FROM fragrance_components pc 
        LEFT JOIN knowledge_base kb ON kb.title = pc.cas_number AND kb.category = 'molecule_db'
        WHERE pc.cas_number IS NOT NULL AND pc.cas_number != ''
        AND kb.id IS NULL
        GROUP BY pc.cas_number
        ORDER BY parfum_count DESC
    `);
}

// ═══════════════════════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════════════════════

async function getEnrichmentStats(db) {
    const total = await db.get(`SELECT COUNT(DISTINCT cas_number) as n FROM fragrance_components WHERE cas_number IS NOT NULL`);

    const inKB = await db.get(`SELECT COUNT(*) as n FROM knowledge_base WHERE category = 'molecule_db'`);

    const withLogP = await db.get(`SELECT COUNT(*) as n FROM knowledge_base 
         WHERE category = 'molecule_db' AND content LIKE '%"logp":%' AND content NOT LIKE '%"logp":null%'`);

    const withOdor = await db.get(`SELECT COUNT(*) as n FROM knowledge_base 
         WHERE category = 'molecule_db' AND content LIKE '%"odor_type":%' AND content NOT LIKE '%"odor_type":null%'`);

    const needsClaude = await db.get(`SELECT COUNT(*) as n FROM knowledge_base 
         WHERE category = 'molecule_db' AND content LIKE '%"needs_claude":true%'`);

    // Comptage par source — extraire le JSON depuis le contenu
    const allRows = await db.all(`SELECT content FROM knowledge_base WHERE category = 'molecule_db' AND content LIKE '%---JSON_META---%'`);

    const sourceCounts = { pubchem: 0, common_chemistry: 0, tgsc: 0, claude_session: 0 };
    for (const row of allRows) {
        try {
            const metaMatch = row.content.match(/---JSON_META---\n(.+)$/s);
            if (metaMatch) {
                const meta = JSON.parse(metaMatch[1].trim());
                for (const src of (meta.sources || [])) {
                    if (sourceCounts[src] !== undefined) sourceCounts[src]++;
                }
            }
        } catch (e) {}
    }

    return {
        total_cas_in_parfums: total?.n || 0,
        total_in_kb: inKB?.n || 0,
        coverage_pct: (total?.n || 0) > 0 ? Math.round((inKB?.n || 0) / total.n * 100) : 0,
        with_logp: withLogP?.n || 0,
        with_logp_pct: (inKB?.n || 0) > 0 ? Math.round((withLogP?.n || 0) / inKB.n * 100) : 0,
        with_odor: withOdor?.n || 0,
        with_odor_pct: (inKB?.n || 0) > 0 ? Math.round((withOdor?.n || 0) / inKB.n * 100) : 0,
        needs_claude: needsClaude?.n || 0,
        orphans: (total?.n || 0) - (inKB?.n || 0),
        sources: sourceCounts
    };
}

// ═══════════════════════════════════════════════════════════════
// GÉNÉRATION CODE SEED (rétrocompatibilité)
// ═══════════════════════════════════════════════════════════════

function generateMoleculeDBEntries(enrichedList) {
    const lines = [];
    for (const e of enrichedList) {
        const parts = [`'${e.cas}': { name: '${(e.name || '').replace(/'/g, "\\'")}'`];
        if (e.molecular_weight) parts.push(`mw: ${e.molecular_weight}`);
        if (e.logp !== null && e.logp !== undefined) parts.push(`logp: ${e.logp}`);
        if (e.odor_type) parts.push(`odor: '${e.odor_type}'`);
        lines.push(parts.join(', ') + ' }');
    }
    return lines.join(',\n');
}

function generateSeedJSON(enrichedList) {
    return enrichedList.map(e => ({
        cas: e.cas,
        name: e.name,
        mw: e.molecular_weight,
        logp: e.logp,
        odor_type: e.odor_type,
        sources: e.sources
    }));
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
    // Enrichissement
    enrichSingle,
    enrichUnknownMolecules,
    
    // Import/Export
    importClaudeSession,
    exportNeedsClaude,
    exportOrphans,
    
    // KB
    saveToKB,
    getMoleculeKB,
    getEnrichmentStats,
    
    // Classification
    classifyVolatility,
    classifyVolatilityFr,
    
    // Rétrocompatibilité
    generateMoleculeDBEntries,
    generateSeedJSON,
    
    // Accès direct aux sources (pour debug/test)
    _sources: {
        fetchPubChem,
        fetchCommonChemistry,
        fetchTGSC
    },
    
    // Config
    CONFIG
};
