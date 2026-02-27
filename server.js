/**
 * MFC Laboratoire - Serveur Express
 * Maison Française des Cires - Depuis 1904
 * Version 5.28.0 — Clients · Graphiques · IA · Patrimoine · PubChem · Enrichissement Cires · Diagnostic Throw
 */

const APP_VERSION = '5.44.13';
const APP_BUILD = '2026-02-17T15:45';
const APP_FEATURES = 'Clients · Graphiques · IA · Patrimoine · Photos · PDF · Backup · Recherche';

const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const PDFDocument = require('pdfkit');

// Moteur moléculaire — chargé tôt pour cross-référencement FP à l'import
const _molEngine = require('./modules/molecule-engine');
const _MOL_FP = {}; // CAS → flash_point lookup rapide
for (const [cas, info] of Object.entries(_molEngine.MOLECULE_DB)) {
    if (info.fp != null) _MOL_FP[cas] = info.fp;
}
const db = require('./modules/database');

// ── Utilitaires nettoyage noms parfums (anti-doublons) ──
function cleanFragranceName(raw) {
    let name = raw.toUpperCase().trim();
    name = name.replace(/\.PDF$/i, '');
    name = name.replace(/_\d{4}-\d{2}-\d{2}.*/g, '');
    name = name.replace(/^\d{7,}\s*[_\s]+/, '');
    name = name.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
    return name;
}
function normalizeForMatch(name) {
    return name.toUpperCase()
        .replace(/^\d{7,}\s*/, '')
        .replace(/[''ʼ]/g, '')
        .replace(/[_\-./]/g, ' ')
        .replace(/\s+/g, ' ').trim();
}
// Noms composants parasites (GHS, headers, réglementaire)
const _BAD_NAME_RE = [
    /^CAS\s+\d/i, /^(FICHE|SAFETY\s+DATA|RUBRIQUE|SECTION)\b/i,
    /^(Skin\s|Eye\s|Flam\.|Aquatic|Acute\s|STOT\s|Asp\.\s|Repr\.)/i,
    /^(Facteur\s|Information\s|Rapport\s|règlement)/i,
    /^(EINECS|Page\s+\d|\[Page|Version\s|Date\s)/i,
    /^\?$/, /^-ONE\s/, /H\d{3}/,
];
function isValidComponentName(name) {
    if (!name || name.trim().length < 3) return false;
    return !_BAD_NAME_RE.some(re => re.test(name));
}
function sanitizeComponentName(name, cas) {
    if (isValidComponentName(name)) return name.substring(0, 80);
    // Fallback : chercher dans le moteur moléculaire
    if (cas && _molEngine.MOLECULE_DB[cas]?.name) return _molEngine.MOLECULE_DB[cas].name.substring(0, 80);
    return cas ? `CAS ${cas}` : '?';
}
const { initTables, migrateIfNeeded } = require('./modules/init-db');
const { seedData } = require('./modules/seed-data');
const { seedKnowledge, seedEmpiricalKnowledge, seedOlfactiveInsight, seedVegetaleKnowledge, seedVegetableKnowledge, seedSojaScience, seedAlcoolScience, seedMateriauxVerifies, seedSession17, seedSession18, seedSession19, seedSession20 } = require('./modules/seed-knowledge');
const { seedSession21 } = require('./modules/seed-kaiser-fds');
const { seedSession22 } = require('./modules/seed-parfums-fds');
const { seedSession23 } = require('./modules/seed-fds-import');
const { importExcelFormulations } = require('./modules/excel-import');
const { seedRecipes, seedRecipesBatch2, seedRecipesBatch3 } = require('./modules/seed-recipes');
const { seedScience } = require('./modules/seed-science');
const { seedEnrichmentV5208 } = require('./modules/seed-enrichment-v5208');
const { seedMultiWicks } = require('./modules/seed-multi-wicks');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Normalisation : forcer majuscules sur les champs texte des noms/références
function uc(val) { return val ? val.trim().toUpperCase() : val; }

// Middleware auto-majuscules pour toutes les routes POST/PUT /api/
app.use('/api/', (req, res, next) => {
    if ((req.method === 'POST' || req.method === 'PUT') && req.body) {
        const fieldsToUpper = ['name', 'company', 'brand', 'fragrance_name', 'fragrance_supplier', 
            'container_ref', 'client_request', 'reference'];
        for (const field of fieldsToUpper) {
            if (req.body[field] && typeof req.body[field] === 'string') {
                req.body[field] = req.body[field].trim().toUpperCase();
            }
        }
    }
    next();
});

// Anti-cache pour fichiers critiques — force le navigateur à toujours vérifier
app.use((req, res, next) => {
    if (req.path.endsWith('.html') || req.path === '/' || 
        req.path.endsWith('.js') || req.path === '/sw.js' ||
        req.path === '/manifest.json') {
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
    }
    next();
});
// Anti-cache headers for HTML/JS/CSS
app.use((req, res, next) => {
    if (req.path.endsWith('.html') || req.path.endsWith('.js') || req.path.endsWith('.css') || req.path === '/') {
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
    }
    next();
});
app.use(express.static(path.join(__dirname, 'public')));

// ═══════════════════════════════════════════════
// AUTO-APPRENTISSAGE PERMANENT — Cœur du système
// Chaque modification est tracée + expliquée + enregistrée dans la KB
// C'est le savoir-faire MFC numérisé — valeur immatérielle de l'entreprise
// ═══════════════════════════════════════════════

async function logChange(params) {
    const { entity_type, entity_id, action, field_changed,
        old_value, new_value, reason_why, technical_context,
        linked_test_id, linked_formulation_id, linked_client_id,
        generate_kb = (action !== 'create'), kb_category } = params;

    const changeResult = await db.run(
        `INSERT INTO change_log (entity_type, entity_id, action, field_changed,
            old_value, new_value, reason_why, technical_context,
            linked_test_id, linked_formulation_id, linked_client_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [entity_type, entity_id, action, field_changed,
         typeof old_value === 'object' ? JSON.stringify(old_value) : old_value,
         typeof new_value === 'object' ? JSON.stringify(new_value) : new_value,
         reason_why || null, technical_context || null,
         linked_test_id || null, linked_formulation_id || null, linked_client_id || null]
    );
    const change_id = changeResult.lastInsertRowid;

    let kb_entry_id = null;
    if (generate_kb && (reason_why || technical_context)) {
        const actionLabel = { create: '➕', update: '🔧', delete: '🗑️', adjust: '⚙️' }[action] || '📝';
        const category = kb_category || ({
            formulation: 'Savoir-faire formulation', test: 'Retours clients',
            cycle: 'Modifications labo', recipe: 'Recettes MFC',
            material: 'Matières premières', wick: 'Mèches',
            wax_composition: 'Savoir-faire formulation'
        }[entity_type] || 'Auto-apprentissage');

        let title = actionLabel + ' ' + (field_changed || entity_type);
        let content = '';
        if (old_value && new_value) content += field_changed + ' : ' + old_value + ' → ' + new_value;
        else if (new_value) content += (field_changed || 'Valeur') + ' : ' + new_value;
        if (reason_why) content += '\n\n📋 POURQUOI : ' + reason_why;
        if (technical_context) content += '\n🔬 CONTEXTE : ' + technical_context;

        const kbResult = await db.run(
            `INSERT INTO knowledge_base (category, subcategory, title, content, source, priority, tags)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [category, entity_type, title, content.trim(),
             'Auto #' + change_id, 3,
             [entity_type, action, field_changed].filter(Boolean).join(',')]
        );
        kb_entry_id = kbResult.lastInsertRowid;
        await db.run('UPDATE change_log SET kb_entry_id = ? WHERE id = ?', [kb_entry_id, change_id]);
    }
    return { change_id, kb_entry_id };
}

async function detectPatterns() {
    let patternsCreated = 0;
    // Même problème → même solution
    const repeats = await db.all(
        `SELECT reason_why, field_changed, new_value, COUNT(*) as count, GROUP_CONCAT(id) as ids
         FROM change_log WHERE reason_why IS NOT NULL AND reason_why != '' AND action = 'update'
         GROUP BY reason_why, new_value HAVING count >= 2`
    );
    for (const r of repeats) {
        const exists = await db.get("SELECT id FROM knowledge_patterns WHERE trigger_condition LIKE ?",
            ['%' + r.reason_why.substring(0, 50) + '%']);
        if (!exists) {
            await db.run(
                `INSERT INTO knowledge_patterns (pattern_type, trigger_condition, action_taken, confidence, usage_count, source_changes)
                 VALUES ('problem_solution', ?, ?, ?, ?, ?)`,
                [JSON.stringify({ problem: r.reason_why, field: r.field_changed }),
                 JSON.stringify({ solution: r.new_value }),
                 Math.min(0.9, 0.5 + r.count * 0.1), r.count, r.ids]);
            patternsCreated++;
        }
    }
    return patternsCreated;
}

// ═══════ VERSION API (cache-busting) ═══════
app.get('/api/version', (req, res) => {
    res.json({ version: APP_VERSION, build: APP_BUILD });
});

// ═══════ API CHANGE LOG ═══════
app.post('/api/changes/log', async (req, res) => {
    try { res.json({ ...await logChange(req.body), success: true }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/changes/:id/result', async (req, res) => {
    try {
        const { result_observed, result_success } = req.body;
        await db.run('UPDATE change_log SET result_observed=?, result_success=? WHERE id=?',
            [result_observed, result_success, req.params.id]);
        if (result_success === 1) {
            const ch = await db.get('SELECT * FROM change_log WHERE id=?', [req.params.id]);
            if (ch) await db.run(
                "UPDATE knowledge_patterns SET confidence=MIN(0.99,confidence+0.05), usage_count=usage_count+1 WHERE source_changes LIKE ?",
                ['%' + ch.id + '%']);
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/changes', async (req, res) => {
    try {
        const { entity_type, entity_id, limit } = req.query;
        let sql = 'SELECT * FROM change_log WHERE 1=1'; const params = [];
        if (entity_type) { sql += ' AND entity_type=?'; params.push(entity_type); }
        if (entity_id) { sql += ' AND entity_id=?'; params.push(entity_id); }
        sql += ' ORDER BY created_at DESC LIMIT ?'; params.push(parseInt(limit) || 50);
        res.json(await db.all(sql, params));
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/patterns', async (req, res) => {
    try { res.json(await db.all('SELECT * FROM knowledge_patterns ORDER BY confidence DESC')); }
    catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/patterns/detect', async (req, res) => {
    try {
        const count = await detectPatterns();
        const total = await db.get('SELECT COUNT(*) as c FROM knowledge_patterns');
        res.json({ patterns_created: count, total: total.c, success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/learning/stats', async (req, res) => {
    try {
        const [ch, chWhy, kbCh, pat, val, rules, kb] = await Promise.all([
            db.get('SELECT COUNT(*) as c FROM change_log'),
            db.get("SELECT COUNT(*) as c FROM change_log WHERE reason_why IS NOT NULL AND reason_why!=''"),
            db.get("SELECT COUNT(*) as c FROM change_log WHERE kb_entry_id IS NOT NULL"),
            db.get('SELECT COUNT(*) as c FROM knowledge_patterns'),
            db.get('SELECT COUNT(*) as c FROM knowledge_patterns WHERE validated_by_test=1'),
            db.get('SELECT COUNT(*) as c FROM learned_rules'),
            db.get('SELECT COUNT(*) as c FROM knowledge_base')
        ]);
        const recent = await db.all('SELECT * FROM change_log ORDER BY created_at DESC LIMIT 10');
        const topPat = await db.all('SELECT * FROM knowledge_patterns ORDER BY confidence DESC LIMIT 5');
        res.json({
            total_changes: ch.c, changes_with_explanation: chWhy.c,
            explanation_rate: ch.c ? Math.round(chWhy.c / ch.c * 100) : 0,
            kb_entries_generated: kbCh.c, total_kb: kb.c,
            total_patterns: pat.c, validated_patterns: val.c,
            total_rules: rules.c, recent_changes: recent, top_patterns: topPat
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================
// ROUTES API - CLIENTS
// ============================================
app.get('/api/clients', async (req, res) => {
    try {
        const { type } = req.query;
        let sql = 'SELECT * FROM clients WHERE 1=1';
        const params = [];
        if (type) {
            sql += ' AND client_type = ?';
            params.push(type);
        }
        sql += ' ORDER BY name';
        const rows = await db.all(sql, params);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/clients/:id', async (req, res) => {
    try {
        const row = await db.get('SELECT * FROM clients WHERE id = ?', [req.params.id]);
        if (!row) return res.status(404).json({ error: 'Client non trouvé' });
        res.json(row);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/clients', async (req, res) => {
    try {
        const { name, company, address, client_type, notes } = req.body;
        if (!name) return res.status(400).json({ error: 'Le nom est obligatoire' });
        
        const cleanName = name.trim().toUpperCase();
        const cleanCompany = company ? company.trim().toUpperCase() : null;
        
        // Anti-doublon
        const existing = await db.get('SELECT id, name FROM clients WHERE UPPER(TRIM(name)) = ?', [cleanName]);
        if (existing) return res.status(409).json({ error: `Le client "${existing.name}" existe déjà (ID: ${existing.id})`, existing_id: existing.id });
        
        const result = await db.run(
            `INSERT INTO clients (name, company, address, client_type, notes)
             VALUES (?, ?, ?, ?, ?)`,
            [cleanName, cleanCompany, address ? address.trim() : null, client_type || 'client', notes]
        );
        res.json({ id: result.lastInsertRowid, success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/clients/:id', async (req, res) => {
    try {
        const { name, company, address, client_type, notes } = req.body;
        const cleanName = name ? name.trim().toUpperCase() : null;
        const cleanCompany = company ? company.trim().toUpperCase() : null;
        await db.run(
            `UPDATE clients SET name=COALESCE(?,name), company=COALESCE(?,company), address=COALESCE(?,address), client_type=COALESCE(?,client_type), notes=COALESCE(?,notes) WHERE id=?`,
            [cleanName, cleanCompany, address, client_type, notes, req.params.id]
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/clients/:id', async (req, res) => {
    try {
        await db.run('DELETE FROM clients WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ═══════════════════════════════════════════════
// DOUBLONS CLIENTS — Détection + Fusion
// ═══════════════════════════════════════════════

// Détection de doublons potentiels (nom similaire ou société identique)
app.get('/api/clients/duplicates/detect', async (req, res) => {
    try {
        const clients = await db.all(`
            SELECT c.id, c.name, c.company, c.client_type, c.notes, c.created_at,
                   (SELECT COUNT(*) FROM samples s WHERE s.client_id = c.id) as sample_count,
                   (SELECT COUNT(*) FROM formulations f WHERE f.client_id = c.id) as formulation_count,
                   (SELECT COUNT(*) FROM burn_tests t WHERE t.formulation_id IN (SELECT id FROM formulations WHERE client_id = c.id)) as test_count,
                   (SELECT COUNT(*) FROM projects p WHERE p.client_id = c.id) as project_count
            FROM clients c ORDER BY UPPER(c.name)
        `);

        const groups = [];
        const used = new Set();

        for (let i = 0; i < clients.length; i++) {
            if (used.has(clients[i].id)) continue;
            const matches = [];

            for (let j = i + 1; j < clients.length; j++) {
                if (used.has(clients[j].id)) continue;
                
                const nameA = (clients[i].name || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
                const nameB = (clients[j].name || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
                const compA = (clients[i].company || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
                const compB = (clients[j].company || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

                let reason = null;

                // Nom identique (après nettoyage)
                if (nameA && nameB && nameA === nameB) {
                    reason = 'Nom identique';
                }
                // Nom contenu dans l'autre
                else if (nameA && nameB && nameA.length > 3 && nameB.length > 3 && (nameA.includes(nameB) || nameB.includes(nameA))) {
                    reason = 'Nom similaire (inclusion)';
                }
                // Société identique (non vide)
                else if (compA && compB && compA.length > 2 && compA === compB) {
                    reason = 'Même société';
                }
                // Société contenue dans le nom
                else if (compA && nameB && compA.length > 3 && (nameB.includes(compA) || compA.includes(nameB))) {
                    reason = 'Société ≈ Nom';
                }
                else if (compB && nameA && compB.length > 3 && (nameA.includes(compB) || compB.includes(nameA))) {
                    reason = 'Société ≈ Nom';
                }
                // Distance de Levenshtein simplifiée (noms courts proches)
                else if (nameA.length > 3 && nameB.length > 3 && Math.abs(nameA.length - nameB.length) <= 3) {
                    let diff = 0;
                    const minLen = Math.min(nameA.length, nameB.length);
                    for (let k = 0; k < minLen; k++) { if (nameA[k] !== nameB[k]) diff++; }
                    diff += Math.abs(nameA.length - nameB.length);
                    if (diff <= 2) reason = 'Nom très proche (≤2 car. diff.)';
                }

                if (reason) {
                    matches.push({ ...clients[j], match_reason: reason });
                    used.add(clients[j].id);
                }
            }

            if (matches.length > 0) {
                used.add(clients[i].id);
                groups.push({
                    primary: clients[i],
                    duplicates: matches
                });
            }
        }

        res.json({ 
            groups, 
            total_clients: clients.length,
            duplicate_groups: groups.length,
            duplicate_count: groups.reduce((s, g) => s + g.duplicates.length, 0)
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Fusion de deux clients : keep_id absorbe merge_id
app.post('/api/clients/duplicates/merge', async (req, res) => {
    try {
        const { keep_id, merge_id } = req.body;
        if (!keep_id || !merge_id) return res.status(400).json({ error: 'keep_id et merge_id requis' });
        if (keep_id === merge_id) return res.status(400).json({ error: 'Impossible de fusionner un client avec lui-même' });

        const keeper = await db.get('SELECT * FROM clients WHERE id = ?', [keep_id]);
        const merged = await db.get('SELECT * FROM clients WHERE id = ?', [merge_id]);
        if (!keeper) return res.status(404).json({ error: 'Client à conserver non trouvé (ID ' + keep_id + ')' });
        if (!merged) return res.status(404).json({ error: 'Client à fusionner non trouvé (ID ' + merge_id + ')' });

        // Réattribuer toutes les références
        const updates = [];
        
        const r1 = await db.run('UPDATE samples SET client_id = ? WHERE client_id = ?', [keep_id, merge_id]);
        updates.push('échantillons: ' + (r1.changes || 0));

        const r2 = await db.run('UPDATE formulations SET client_id = ? WHERE client_id = ?', [keep_id, merge_id]);
        updates.push('formulations: ' + (r2.changes || 0));

        const r3 = await db.run('UPDATE projects SET client_id = ? WHERE client_id = ?', [keep_id, merge_id]);
        updates.push('projets: ' + (r3.changes || 0));

        // Fusionner les notes si le client fusionné en a
        if (merged.notes && merged.notes.trim()) {
            const newNotes = (keeper.notes || '') + (keeper.notes ? '\n' : '') + '[Fusionné de ' + merged.name + '] ' + merged.notes;
            await db.run('UPDATE clients SET notes = ? WHERE id = ?', [newNotes, keep_id]);
        }

        // Compléter les champs vides du keeper avec ceux du merged
        if (!keeper.company && merged.company) {
            await db.run('UPDATE clients SET company = ? WHERE id = ?', [merged.company, keep_id]);
        }
        if (!keeper.address && merged.address) {
            await db.run('UPDATE clients SET address = ? WHERE id = ?', [merged.address, keep_id]);
        }

        // Supprimer le doublon
        await db.run('DELETE FROM clients WHERE id = ?', [merge_id]);

        // Log
        await db.run("INSERT INTO activity_log (action, entity_type, entity_id, details) VALUES (?, ?, ?, ?)",
            ['merge', 'client', keep_id, JSON.stringify({ merged_id: merge_id, merged_name: merged.name, kept_name: keeper.name, updates })]);

        res.json({ 
            success: true, 
            message: `"${merged.name}" fusionné dans "${keeper.name}"`,
            updates,
            kept: keeper.name,
            merged: merged.name
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============================================
// PROJETS / COLLABORATIONS
// ============================================
app.get('/api/projects', async (req, res) => {
    try {
        const clientId = req.query.client_id;
        let query = `SELECT p.*, c.name as client_name,
            (SELECT COUNT(*) FROM samples s WHERE s.project_id = p.id) as sample_count,
            (SELECT COUNT(*) FROM formulations f WHERE f.project_id = p.id) as formulation_count
            FROM projects p LEFT JOIN clients c ON p.client_id = c.id`;
        const params = [];
        if (clientId) { query += ' WHERE p.client_id = ?'; params.push(clientId); }
        query += ' ORDER BY p.created_at DESC';
        res.json(await db.all(query, params));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/projects/:id', async (req, res) => {
    try {
        const p = await db.get(`SELECT p.*, c.name as client_name FROM projects p 
            LEFT JOIN clients c ON p.client_id = c.id WHERE p.id = ?`, [req.params.id]);
        if (!p) return res.status(404).json({ error: 'Projet non trouvé' });
        p.samples = await db.all('SELECT * FROM samples WHERE project_id = ? ORDER BY created_at DESC', [p.id]);
        p.formulations = await db.all('SELECT * FROM formulations WHERE project_id = ? ORDER BY created_at DESC', [p.id]);
        res.json(p);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/projects', async (req, res) => {
    try {
        const { client_id, name, brand, description, status, start_date, notes } = req.body;
        if (!client_id || !name) return res.status(400).json({ error: 'Client et nom du projet obligatoires' });
        const result = await db.run(
            `INSERT INTO projects (client_id, name, brand, description, status, start_date, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [client_id, name, brand || null, description || null, status || 'actif', start_date || null, notes || null]
        );
        res.json({ id: result.lastInsertRowid, success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/projects/:id', async (req, res) => {
    try {
        const { name, brand, description, status, start_date, notes } = req.body;
        await db.run(`UPDATE projects SET name=COALESCE(?,name), brand=COALESCE(?,brand),
            description=COALESCE(?,description), status=COALESCE(?,status),
            start_date=COALESCE(?,start_date), notes=COALESCE(?,notes) WHERE id=?`,
            [name, brand, description, status, start_date, notes, req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/projects/:id', async (req, res) => {
    try {
        await db.run('UPDATE samples SET project_id = NULL WHERE project_id = ?', [req.params.id]);
        await db.run('UPDATE formulations SET project_id = NULL WHERE project_id = ?', [req.params.id]);
        await db.run('DELETE FROM projects WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================
// DOCUMENTS (PDF sauvegardés)
// ============================================
const documentsDir = path.join(process.env.MFC_DATA_DIR || path.join(__dirname, '..', 'mfc-data'), 'documents');
if (!fs.existsSync(documentsDir)) fs.mkdirSync(documentsDir, { recursive: true });

app.get('/api/documents', async (req, res) => {
    try {
        const { entity_type, entity_id, client_id } = req.query;
        let query = 'SELECT * FROM documents';
        const params = [];
        const conditions = [];
        if (entity_type) { conditions.push('entity_type = ?'); params.push(entity_type); }
        if (entity_id) { conditions.push('entity_id = ?'); params.push(entity_id); }
        if (client_id) {
            conditions.push(`(
                (entity_type = 'formulation' AND entity_id IN (SELECT id FROM formulations WHERE client_id = ?))
                OR (entity_type = 'sample' AND entity_id IN (SELECT id FROM samples WHERE client_id = ?))
                OR (entity_type = 'burn_test' AND entity_id IN (SELECT id FROM burn_tests WHERE formulation_id IN (SELECT id FROM formulations WHERE client_id = ?)))
            )`);
            params.push(client_id, client_id, client_id);
        }
        if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
        query += ' ORDER BY created_at DESC';
        res.json(await db.all(query, params));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/documents/save-pdf', async (req, res) => {
    try {
        const { entity_type, entity_id, doc_type, filename, html_content, generated_by,
                client_id, project_id } = req.body;
        if (!filename || !html_content) return res.status(400).json({ error: 'Nom de fichier et contenu requis' });
        
        // Construire le chemin : documents/Client/Projet/ ou documents/Client/ ou documents/divers/
        let subDir = documentsDir;
        let clientName = null;
        let projectName = null;

        // Résoudre le client
        let resolvedClientId = client_id;
        if (!resolvedClientId && entity_id) {
            // Essayer de trouver le client via l'entité
            if (entity_type === 'formulation') {
                const f = await db.get('SELECT client_id, project_id FROM formulations WHERE id = ?', [entity_id]);
                if (f) { resolvedClientId = f.client_id; if (!project_id && f.project_id) resolvedClientId = f.client_id; }
            } else if (entity_type === 'sample') {
                const s = await db.get('SELECT client_id, project_id FROM samples WHERE id = ?', [entity_id]);
                if (s) resolvedClientId = s.client_id;
            } else if (entity_type === 'burn_test') {
                const t = await db.get(`SELECT f.client_id FROM burn_tests bt 
                    LEFT JOIN formulations f ON bt.formulation_id = f.id WHERE bt.id = ?`, [entity_id]);
                if (t) resolvedClientId = t.client_id;
            }
        }

        // Dossier client
        if (resolvedClientId) {
            const client = await db.get('SELECT name FROM clients WHERE id = ?', [resolvedClientId]);
            if (client) {
                clientName = client.name.replace(/[^a-zA-Z0-9àâäéèêëïîôùûüç._\s-]/g, '').trim().replace(/\s+/g, '_');
                subDir = path.join(subDir, clientName);
            }
        }

        // Dossier projet
        let resolvedProjectId = project_id;
        if (!resolvedProjectId && entity_id) {
            if (entity_type === 'formulation') {
                const f = await db.get('SELECT project_id FROM formulations WHERE id = ?', [entity_id]);
                if (f) resolvedProjectId = f.project_id;
            } else if (entity_type === 'sample') {
                const s = await db.get('SELECT project_id FROM samples WHERE id = ?', [entity_id]);
                if (s) resolvedProjectId = s.project_id;
            }
        }
        if (resolvedProjectId) {
            const proj = await db.get('SELECT name, brand FROM projects WHERE id = ?', [resolvedProjectId]);
            if (proj) {
                projectName = (proj.brand ? proj.brand + ' - ' : '') + proj.name;
                projectName = projectName.replace(/[^a-zA-Z0-9àâäéèêëïîôùûüç._\s-]/g, '').trim().replace(/\s+/g, '_');
                subDir = path.join(subDir, projectName);
            }
        }

        // Si pas de client ni projet → dossier divers
        if (!clientName && !projectName) {
            subDir = path.join(documentsDir, 'divers');
        }

        if (!fs.existsSync(subDir)) fs.mkdirSync(subDir, { recursive: true });
        
        const safeFilename = filename.replace(/[^a-zA-Z0-9àâäéèêëïîôùûüç._-]/g, '_');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const fullFilename = `${safeFilename}_${timestamp}`;
        const filepath = path.join(subDir, fullFilename + '.html');
        fs.writeFileSync(filepath, html_content, 'utf-8');
        
        const result = await db.run(
            `INSERT INTO documents (entity_type, entity_id, doc_type, filename, filepath, generated_by)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [entity_type || 'divers', entity_id || null, doc_type || 'fiche', fullFilename, filepath, generated_by || null]
        );
        
        const savePath = clientName 
            ? (projectName ? `${clientName}/${projectName}/${fullFilename}` : `${clientName}/${fullFilename}`)
            : fullFilename;
        
        res.json({ id: result.lastInsertRowid, filepath: filepath, save_path: savePath, success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/documents/:id', async (req, res) => {
    try {
        const doc = await db.get('SELECT * FROM documents WHERE id = ?', [req.params.id]);
        if (doc && doc.filepath && fs.existsSync(doc.filepath)) {
            fs.unlinkSync(doc.filepath);
        }
        await db.run('DELETE FROM documents WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================
// TABLEAU DE BORD CLIENT — Vue complète par client
// ============================================
app.get('/api/clients/:id/dashboard', async (req, res) => {
    try {
        const client = await db.get('SELECT * FROM clients WHERE id = ?', [req.params.id]);
        if (!client) return res.status(404).json({ error: 'Client non trouvé' });

        // All samples for this client
        const samples = await db.all(
            'SELECT * FROM samples WHERE client_id = ? ORDER BY id DESC', [req.params.id]);

        // All formulations
        const formulations = await db.all(`
            SELECT f.*, s.sample_number, s.fragrance_name as sample_fragrance
            FROM formulations f
            LEFT JOIN samples s ON f.sample_id = s.id
            WHERE f.client_id = ? ORDER BY f.id DESC`, [req.params.id]);

        // All burn tests with cycles
        const tests = await db.all(`
            SELECT bt.*, f.code as form_code, f.name as form_name, f.fragrance_name,
                   f.wick_reference, f.container_type, f.diameter, f.total_mass,
                   (SELECT COUNT(*) FROM burn_cycles WHERE test_id = bt.id) as cycle_count
            FROM burn_tests bt
            LEFT JOIN formulations f ON bt.formulation_id = f.id
            WHERE f.client_id = ? OR bt.sample_id IN (SELECT id FROM samples WHERE client_id = ?)
            ORDER BY bt.id DESC`, [req.params.id, req.params.id]);

        // Client decisions history
        const decisions = await db.all(`
            SELECT bt.test_number, bt.client_status, bt.client_feedback, bt.client_decision_date,
                   f.code as form_code, f.fragrance_name, f.wick_reference
            FROM burn_tests bt
            LEFT JOIN formulations f ON bt.formulation_id = f.id
            WHERE bt.client_status IS NOT NULL
              AND (f.client_id = ? OR bt.sample_id IN (SELECT id FROM samples WHERE client_id = ?))
            ORDER BY bt.client_decision_date DESC`, [req.params.id, req.params.id]);

        // Stats
        const totalTests = tests.length;
        const validated = tests.filter(t => t.client_status === 'validé').length;
        const refused = tests.filter(t => t.client_status === 'refusé').length;
        const inProgress = tests.filter(t => t.status === 'en_cours').length;
        const successRate = totalTests > 0 ? Math.round((validated / totalTests) * 100) : 0;

        // Most used wicks and waxes
        const wicks = await db.all(`
            SELECT f.wick_reference, COUNT(*) as count,
                   SUM(CASE WHEN bt.client_status = 'validé' THEN 1 ELSE 0 END) as validated
            FROM formulations f
            LEFT JOIN burn_tests bt ON bt.formulation_id = f.id
            WHERE f.client_id = ? AND f.wick_reference IS NOT NULL
            GROUP BY f.wick_reference ORDER BY count DESC`, [req.params.id]);

        // Fragrances history
        const fragrances = await db.all(`
            SELECT f.fragrance_name, f.fragrance_percentage, bt.client_status, bt.test_number
            FROM formulations f
            LEFT JOIN burn_tests bt ON bt.formulation_id = f.id
            WHERE f.client_id = ? AND f.fragrance_name IS NOT NULL
            ORDER BY f.id DESC`, [req.params.id]);

        // KB entries related to this client
        const knowledge = await db.all(
            "SELECT * FROM knowledge_base WHERE tags LIKE ? ORDER BY priority",
            ['%' + client.name + '%']);

        // Projects / Collaborations
        const projects = await db.all(`
            SELECT p.*,
                (SELECT COUNT(*) FROM samples s WHERE s.project_id = p.id) as sample_count,
                (SELECT COUNT(*) FROM formulations f WHERE f.project_id = p.id) as formulation_count
            FROM projects p WHERE p.client_id = ? ORDER BY p.created_at DESC`, [req.params.id]);

        res.json({
            client,
            samples,
            formulations,
            tests,
            decisions,
            knowledge,
            projects,
            stats: {
                total_samples: samples.length,
                total_formulations: formulations.length,
                total_tests: totalTests,
                validated,
                refused,
                in_progress: inProgress,
                success_rate: successRate,
                wicks,
                fragrances
            }
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================
// GRAPHIQUES — Données de test pour charts
// ============================================
app.get('/api/burn-tests/:id/chart-data', async (req, res) => {
    try {
        const cycles = await db.all(
            'SELECT * FROM burn_cycles WHERE test_id = ? ORDER BY cycle_number', [req.params.id]);
        if (!cycles.length) return res.json({ cycles: [] });

        res.json({
            cycles: cycles.map(c => ({
                cycle: c.cycle_number,
                mass_before: c.mass_before,
                mass_after: c.mass_after,
                mass_consumed: c.mass_consumed || (c.mass_before - c.mass_after),
                pool_diameter: c.pool_diameter,
                pool_depth: c.pool_depth,
                flame_height: c.flame_height,
                scent_throw: c.scent_throw,
                soot_level: c.soot_level,
                mushrooming: c.mushrooming,
                tunneling: c.tunneling
            })),
            summary: {
                total_consumed: cycles.reduce((s, c) => s + (c.mass_consumed || (c.mass_before - c.mass_after) || 0), 0),
                avg_consumption: cycles.reduce((s, c) => s + (c.mass_consumed || (c.mass_before - c.mass_after) || 0), 0) / cycles.length,
                max_pool: Math.max(...cycles.map(c => c.pool_diameter || 0)),
                avg_flame: cycles.reduce((s, c) => s + (c.flame_height || 0), 0) / cycles.length
            }
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Compare multiple tests (versions V1, V2, V3...)
app.get('/api/tests/compare', async (req, res) => {
    try {
        const ids = (req.query.ids || '').split(',').filter(Boolean).map(Number);
        if (!ids.length) return res.json([]);

        const results = [];
        for (const id of ids) {
            const test = await db.get(`
                SELECT bt.*, f.code, f.name, f.wick_reference, f.fragrance_name, f.fragrance_percentage
                FROM burn_tests bt LEFT JOIN formulations f ON bt.formulation_id = f.id
                WHERE bt.id = ?`, [id]);
            const cycles = await db.all(
                'SELECT * FROM burn_cycles WHERE test_id = ? ORDER BY cycle_number', [id]);
            if (test) results.push({ ...test, cycles });
        }
        res.json(results);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================
// RECOMMANDATION IA ENRICHIE — Basée sur historique réel
// ============================================
app.post('/api/assistant/recommend', async (req, res) => {
    try {
        const { diameter, height, candle_type, fragrance_name, fragrance_family, fragrance_percentage, client_id } = req.body;

        const recommendations = { recipes: [], wicks: [], insights: [], warnings: [] };

        // 1. Recipe recommendations (existing logic enhanced)
        const recipes = await db.all('SELECT * FROM recipes WHERE active = 1');
        const scoredRecipes = recipes.map(r => {
            let score = 0;
            if (candle_type && r.candle_type === candle_type) score += 30;
            if (diameter && r.diameter_min && r.diameter_max) {
                if (diameter >= r.diameter_min && diameter <= r.diameter_max) score += 25;
                else score -= Math.min(20, Math.abs(diameter - (r.diameter_min + r.diameter_max)/2));
            }
            if (height && r.height_min && r.height_max && height >= r.height_min && height <= r.height_max) score += 10;
            if (fragrance_family && r.empirical_notes && r.empirical_notes.toLowerCase().includes(fragrance_family.toLowerCase())) score += 15;
            score += Math.min(10, (r.success_count || 0) * 2);
            return { ...r, score };
        }).filter(r => r.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);

        for (const r of scoredRecipes) {
            r.waxes = await db.all(
                'SELECT rw.*, w.reference, w.name FROM recipe_waxes rw LEFT JOIN waxes w ON rw.wax_id = w.id WHERE rw.recipe_id = ?', [r.id]);
        }
        recommendations.recipes = scoredRecipes;

        // 2. Wick recommendations from REAL validated tests
        if (diameter) {
            const validatedWicks = await db.all(`
                SELECT f.wick_reference, f.diameter, f.container_type, f.fragrance_percentage,
                       COUNT(*) as uses, 
                       SUM(CASE WHEN bt.client_status = 'validé' THEN 1 ELSE 0 END) as validated,
                       SUM(CASE WHEN bt.client_status = 'refusé' THEN 1 ELSE 0 END) as refused,
                       GROUP_CONCAT(DISTINCT f.fragrance_name) as fragrances
                FROM formulations f
                LEFT JOIN burn_tests bt ON bt.formulation_id = f.id
                WHERE f.diameter BETWEEN ? AND ? AND f.wick_reference IS NOT NULL
                GROUP BY f.wick_reference
                ORDER BY validated DESC, uses DESC`, [diameter - 10, diameter + 10]);

            recommendations.wicks = validatedWicks.map(w => ({
                reference: w.wick_reference,
                diameter_tested: w.diameter,
                uses: w.uses,
                validated: w.validated,
                refused: w.refused,
                success_rate: w.uses > 0 ? Math.round((w.validated / w.uses) * 100) : 0,
                fragrances_tested: w.fragrances
            }));
        }

        // 3. Historical insights from knowledge patterns
        const patterns = await db.all(
            'SELECT * FROM knowledge_patterns WHERE confidence > 0.6 ORDER BY confidence DESC LIMIT 5');
        recommendations.insights = patterns.map(p => ({
            type: p.pattern_type,
            trigger: p.trigger_condition,
            action: p.action_taken,
            confidence: p.confidence,
            usage_count: p.usage_count
        }));

        // 4. Relevant KB entries
        const searchTerms = [fragrance_name, candle_type, diameter ? 'Ø' + diameter : ''].filter(Boolean);
        for (const term of searchTerms) {
            const kb = await db.all(
                "SELECT title, content, priority FROM knowledge_base WHERE (title LIKE ? OR content LIKE ? OR tags LIKE ?) AND priority <= 3 LIMIT 3",
                ['%' + term + '%', '%' + term + '%', '%' + term + '%']);
            recommendations.insights.push(...kb.map(k => ({ type: 'knowledge', title: k.title, content: k.content })));
        }

        // 5. Warnings based on known issues
        if (fragrance_percentage && fragrance_percentage > 12) {
            recommendations.warnings.push('⚠️ Parfum > 12% — risque de suintage. Augmenter les alcools gras à 8-10%.');
        }
        if (diameter && diameter > 85 && (!candle_type || candle_type === 'container')) {
            recommendations.warnings.push('⚠️ Ø > 85mm — risque de tunnel. Prévoir mèche HST ou double mèche.');
        }

        // 6. Client-specific history
        if (client_id) {
            const clientHistory = await db.all(`
                SELECT f.fragrance_name, f.wick_reference, bt.client_status, bt.client_feedback
                FROM formulations f
                LEFT JOIN burn_tests bt ON bt.formulation_id = f.id
                WHERE f.client_id = ? AND bt.client_status IS NOT NULL
                ORDER BY bt.id DESC LIMIT 5`, [client_id]);
            if (clientHistory.length) {
                recommendations.client_history = clientHistory;
                const refused = clientHistory.filter(h => h.client_status === 'refusé');
                if (refused.length) {
                    recommendations.warnings.push('📋 Ce client a déjà refusé : ' + refused.map(r => r.client_feedback || r.fragrance_name).join(', '));
                }
            }
        }

        res.json(recommendations);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================
// STATISTIQUES BUSINESS — Pour valorisation MFC
// ============================================
app.get('/api/business/stats', async (req, res) => {
    try {
        const clients = await db.all('SELECT * FROM clients ORDER BY name');
        const clientStats = [];

        for (const c of clients) {
            const samples = await db.get('SELECT COUNT(*) as n FROM samples WHERE client_id = ?', [c.id]);
            const formulations = await db.get('SELECT COUNT(*) as n FROM formulations WHERE client_id = ?', [c.id]);
            const tests = await db.get(`
                SELECT COUNT(*) as total,
                       SUM(CASE WHEN bt.client_status = 'validé' THEN 1 ELSE 0 END) as validated,
                       SUM(CASE WHEN bt.client_status = 'refusé' THEN 1 ELSE 0 END) as refused
                FROM burn_tests bt
                LEFT JOIN formulations f ON bt.formulation_id = f.id
                WHERE f.client_id = ?`, [c.id]);

            clientStats.push({
                id: c.id,
                name: c.name,
                type: c.client_type,
                samples: samples.n,
                formulations: formulations.n,
                tests_total: tests.total || 0,
                tests_validated: tests.validated || 0,
                tests_refused: tests.refused || 0,
                success_rate: tests.total > 0 ? Math.round(((tests.validated || 0) / tests.total) * 100) : null
            });
        }

        // Global stats
        const globalSamples = await db.get('SELECT COUNT(*) as n FROM samples');
        const globalFormulations = await db.get('SELECT COUNT(*) as n FROM formulations');
        const globalTests = await db.get(`
            SELECT COUNT(*) as total,
                   SUM(CASE WHEN client_status = 'validé' THEN 1 ELSE 0 END) as validated,
                   SUM(CASE WHEN client_status = 'refusé' THEN 1 ELSE 0 END) as refused
            FROM burn_tests`);
        const globalKB = await db.get('SELECT COUNT(*) as n FROM knowledge_base');
        const globalRecipes = await db.get('SELECT COUNT(*) as n FROM recipes');
        const globalChanges = await db.get('SELECT COUNT(*) as n FROM change_log');

        res.json({
            clients: clientStats.sort((a, b) => b.tests_total - a.tests_total),
            global: {
                total_clients: clients.length,
                total_samples: globalSamples.n,
                total_formulations: globalFormulations.n,
                total_tests: globalTests.total || 0,
                total_validated: globalTests.validated || 0,
                total_refused: globalTests.refused || 0,
                global_success_rate: globalTests.total > 0 ? Math.round(((globalTests.validated || 0) / globalTests.total) * 100) : 0,
                knowledge_entries: globalKB.n,
                recipes: globalRecipes.n,
                changes_tracked: globalChanges.n,
                patrimoine_score: globalKB.n + globalRecipes.n * 5 + globalChanges.n
            }
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================
// EXPORT PATRIMOINE PDF — Document de valorisation
// ============================================
app.get('/api/patrimoine/pdf', async (req, res) => {
    try {
        const doc = new PDFDocument({ size: 'A4', margin: 50, info: {
            Title: 'MFC — Patrimoine Numérique', Author: 'Maison Française des Cires',
            Subject: 'Valorisation du savoir-faire'
        }});
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=MFC-Patrimoine-' + new Date().toISOString().slice(0,10) + '.pdf');
        doc.pipe(res);

        // ===== PAGE DE COUVERTURE =====
        doc.rect(0, 0, 595, 842).fill('#1a1a1a');
        doc.fontSize(10).fillColor('#c9a96e').text('MAISON FRANÇAISE DES CIRES', 50, 80, { align: 'center', characterSpacing: 6 });
        doc.moveTo(200, 100).lineTo(395, 100).strokeColor('#c9a96e').lineWidth(0.5).stroke();
        doc.fontSize(36).fillColor('#f0e6d3').text('PATRIMOINE', 50, 300, { align: 'center' });
        doc.fontSize(36).text('NUMÉRIQUE', 50, 345, { align: 'center' });
        doc.fontSize(12).fillColor('#c9a96e').text('Savoir-faire technique & manufacturier', 50, 420, { align: 'center' });
        doc.fontSize(9).fillColor('#888').text('Maître Cirier depuis 1904 — 120 ans d\'expertise', 50, 480, { align: 'center' });
        doc.text('Document généré le ' + new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }), 50, 500, { align: 'center' });
        doc.text('Version ' + APP_VERSION + ' — Build ' + APP_BUILD, 50, 520, { align: 'center' });

        // ===== PAGE 2: SOMMAIRE EXÉCUTIF =====
        doc.addPage();
        doc.rect(0, 0, 595, 60).fill('#a32d03');
        doc.fontSize(18).fillColor('#fff').text('SOMMAIRE EXÉCUTIF', 50, 20);
        doc.fontSize(8).text('MFC Laboratoire — Patrimoine Numérique', 50, 42);

        const kb = await db.all('SELECT * FROM knowledge_base ORDER BY category, priority');
        const recipes = await db.all('SELECT * FROM recipes ORDER BY code');
        const clients = await db.all('SELECT * FROM clients ORDER BY name');
        const waxes = await db.all('SELECT * FROM waxes ORDER BY reference');
        const wicks = await db.all('SELECT * FROM wicks ORDER BY reference');
        const changes = await db.all('SELECT COUNT(*) as n FROM change_log');
        const patterns = await db.all('SELECT COUNT(*) as n FROM knowledge_patterns');

        doc.fontSize(11).fillColor('#333');
        let y = 85;

        const summaryItems = [
            ['Ce document présente le patrimoine numérique de la Maison Française des Cires,', ''],
            ['système de gestion de laboratoire développé pour numériser et pérenniser', ''],
            ['120 ans de savoir-faire en fabrication de bougies de luxe.', ''],
            ['', ''],
            ['ACTIFS NUMÉRIQUES', ''],
            ['Fiches de connaissances techniques', kb.length + ' fiches'],
            ['Recettes de fabrication validées', recipes.length + ' recettes'],
            ['Clients référencés', clients.length + ' marques'],
            ['Cires référencées (Hywax, Dubois)', waxes.length + ' références'],
            ['Mèches référencées (Wedoo)', wicks.length + ' références'],
            ['Modifications documentées', (changes[0]?.n || 0) + ' entrées'],
            ['Patterns appris automatiquement', (patterns[0]?.n || 0) + ' patterns'],
            ['', ''],
            ['DIFFÉRENCIATEURS CLÉS', ''],
            ['• Encyclopédie scientifique intégrée (brevets, études NASA, Ökometric)', ''],
            ['• Système d\'auto-apprentissage : chaque test enrichit la base', ''],
            ['• Moteur de recommandation basé sur l\'historique réel', ''],
            ['• Traçabilité complète : du cahier des charges client au rapport PDF', ''],
        ];

        for (const [label, val] of summaryItems) {
            if (label === 'ACTIFS NUMÉRIQUES' || label === 'DIFFÉRENCIATEURS CLÉS') {
                y += 5;
                doc.fontSize(12).fillColor('#a32d03').font('Helvetica-Bold').text(label, 60, y);
                y += 18;
            } else if (val) {
                doc.fontSize(9.5).fillColor('#333').font('Helvetica').text(label, 70, y, { continued: true });
                doc.font('Helvetica-Bold').text('  ' + val);
                y += 16;
            } else if (label) {
                doc.fontSize(9.5).fillColor('#333').font('Helvetica').text(label, 60, y);
                y += 14;
            } else {
                y += 8;
            }
        }

        // ===== PAGE 3: CATALOGUE DE RECETTES =====
        doc.addPage();
        doc.rect(0, 0, 595, 60).fill('#a32d03');
        doc.fontSize(18).fillColor('#fff').text('CATALOGUE DE RECETTES', 50, 20);
        doc.fontSize(8).text(recipes.length + ' recettes validées', 50, 42);

        y = 80;
        for (const r of recipes) {
            if (y > 720) { doc.addPage(); y = 50; }
            doc.fontSize(11).fillColor('#a32d03').font('Helvetica-Bold').text(r.code + ' — ' + (r.name || ''), 50, y);
            y += 16;
            doc.fontSize(8).fillColor('#555').font('Helvetica');
            if (r.description) { doc.text(r.description.substring(0, 200), 60, y, { width: 475 }); y += doc.heightOfString(r.description.substring(0, 200), { width: 475 }) + 4; }
            const details = [];
            if (r.candle_type) details.push('Type: ' + r.candle_type);
            if (r.diameter_min) details.push('Ø: ' + r.diameter_min + '-' + (r.diameter_max || '?') + 'mm');
            if (r.default_wick) details.push('Mèche: ' + r.default_wick);
            if (r.fragrance_percentage) details.push('Parfum: ' + r.fragrance_percentage + '%');
            if (details.length) { doc.text(details.join(' — '), 60, y); y += 12; }

            // Waxes
            const rWaxes = await db.all(
                'SELECT rw.*, w.reference, w.name FROM recipe_waxes rw LEFT JOIN waxes w ON rw.wax_id = w.id WHERE rw.recipe_id = ?', [r.id]);
            if (rWaxes.length) {
                doc.text('Composition: ' + rWaxes.map(w => (w.reference || w.name || '?') + ' ' + w.percentage + '%').join(' + '), 60, y);
                y += 12;
            }
            y += 8;
        }

        // ===== PAGE 4+: BASE DE CONNAISSANCES =====
        doc.addPage();
        doc.rect(0, 0, 595, 60).fill('#a32d03');
        doc.fontSize(18).fillColor('#fff').text('BASE DE CONNAISSANCES', 50, 20);
        doc.fontSize(8).text(kb.length + ' fiches techniques et scientifiques', 50, 42);

        // Group by category
        const categories = {};
        for (const entry of kb) {
            const cat = entry.category || 'Autre';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(entry);
        }

        y = 80;
        for (const [cat, entries] of Object.entries(categories)) {
            if (y > 700) { doc.addPage(); y = 50; }
            doc.fontSize(11).fillColor('#a32d03').font('Helvetica-Bold').text(cat.toUpperCase() + ' (' + entries.length + ')', 50, y);
            y += 16;

            for (const e of entries.slice(0, 10)) { // Max 10 per category to avoid massive PDF
                if (y > 730) { doc.addPage(); y = 50; }
                doc.fontSize(8.5).fillColor('#333').font('Helvetica-Bold').text('• ' + e.title, 60, y);
                y += 12;
                if (e.content) {
                    const preview = e.content.substring(0, 150).replace(/\n/g, ' ') + (e.content.length > 150 ? '...' : '');
                    doc.fontSize(7.5).fillColor('#666').font('Helvetica').text(preview, 70, y, { width: 465 });
                    y += doc.heightOfString(preview, { width: 465 }) + 4;
                }
            }
            if (entries.length > 10) {
                doc.fontSize(7.5).fillColor('#999').font('Helvetica').text('... et ' + (entries.length - 10) + ' fiches supplémentaires', 70, y);
                y += 12;
            }
            y += 8;
        }

        // ===== DERNIÈRE PAGE: CONCLUSION =====
        doc.addPage();
        doc.rect(0, 0, 595, 842).fill('#1a1a1a');
        doc.fontSize(10).fillColor('#c9a96e').text('MAISON FRANÇAISE DES CIRES', 50, 200, { align: 'center', characterSpacing: 6 });
        doc.fontSize(24).fillColor('#f0e6d3').text('Ce patrimoine numérique représente', 50, 300, { align: 'center' });
        doc.fontSize(24).text('120 ans de savoir-faire', 50, 335, { align: 'center' });
        doc.fontSize(24).text('en fabrication de bougies de luxe.', 50, 370, { align: 'center' });
        doc.moveDown(2);
        doc.fontSize(14).fillColor('#c9a96e').text(kb.length + ' fiches techniques', 50, 440, { align: 'center' });
        doc.text(recipes.length + ' recettes propriétaires', 50, 465, { align: 'center' });
        doc.text(clients.length + ' marques de luxe', 50, 490, { align: 'center' });
        doc.text(waxes.length + ' matières caractérisées', 50, 515, { align: 'center' });
        doc.moveDown(3);
        doc.fontSize(9).fillColor('#888').text('Aucune école ne forme à ce métier.', 50, 600, { align: 'center' });
        doc.text('Ce savoir s\'acquiert uniquement par la pratique.', 50, 618, { align: 'center' });
        doc.text('Il est désormais numérisé, scientifiquement validé, et exploitable.', 50, 636, { align: 'center' });

        doc.fontSize(7).fillColor('#555').text('MFC Laboratoire v' + APP_VERSION + ' — Document confidentiel', 50, 780, { align: 'center' });

        doc.end();
    } catch (e) {
        console.error('Patrimoine PDF error:', e);
        if (!res.headersSent) res.status(500).json({ error: e.message });
    }
});

// ============================================
// ROUTES API - FOURNISSEURS
// ============================================
app.get('/api/suppliers', async (req, res) => {
    try {
        const rows = await db.all('SELECT * FROM suppliers WHERE active = 1 ORDER BY name');
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/suppliers/:id', async (req, res) => {
    try {
        const row = await db.get('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
        if (!row) return res.status(404).json({ error: 'Fournisseur non trouvé' });
        res.json(row);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/suppliers', async (req, res) => {
    try {
        const { name, country, website, email, phone, specialty, notes } = req.body;
        if (!name) return res.status(400).json({ error: 'Le nom est obligatoire' });
        const result = await db.run(
            `INSERT INTO suppliers (name, country, website, email, phone, specialty, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [name, country, website, email, phone, specialty, notes]
        );
        res.json({ id: result.lastInsertRowid, success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============================================
// ROUTES API - ÉCHANTILLONS
// ============================================
app.get('/api/samples', async (req, res) => {
    try {
        const { status, client_id } = req.query;
        let sql = `SELECT s.*, c.name as client_name, c.company as client_company
                    FROM samples s
                    LEFT JOIN clients c ON s.client_id = c.id
                    WHERE 1=1`;
        const params = [];
        if (status) {
            sql += ' AND s.status = ?';
            params.push(status);
        }
        if (client_id) {
            sql += ' AND s.client_id = ?';
            params.push(client_id);
        }
        sql += ' ORDER BY s.created_at DESC';
        const rows = await db.all(sql, params);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Générer automatiquement le prochain numéro d'échantillon
// IMPORTANT: doit être AVANT /api/samples/:id
app.get('/api/samples/next-number', async (req, res) => {
    try {
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const prefix = `ECH-${month}${day}`;
        
        const existing = await db.all(
            "SELECT sample_number FROM samples WHERE sample_number LIKE ?",
            [`${prefix}%`]
        );
        const num = String(existing.length + 1).padStart(3, '0');
        res.json({ sample_number: `${prefix}-${num}` });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/samples/:id', async (req, res) => {
    try {
        const row = await db.get(
            `SELECT s.*, c.name as client_name, c.company as client_company
             FROM samples s
             LEFT JOIN clients c ON s.client_id = c.id
             WHERE s.id = ?`,
            [req.params.id]
        );
        if (!row) return res.status(404).json({ error: 'Échantillon non trouvé' });
        res.json(row);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/samples', async (req, res) => {
    try {
        const { sample_number, client_id, project_id, client_request, candle_type,
                diameter, height, total_mass, fragrance_name, fragrance_ref, fragrance_supplier, fragrance_percentage, fragrance_id,
                pantone_code, pantone_hex, source, status, date_request, notes } = req.body;
        
        if (!sample_number) return res.status(400).json({ error: 'Le numéro d\'échantillon est obligatoire' });
        
        const result = await db.run(
            `INSERT INTO samples (sample_number, client_id, project_id, client_request, candle_type,
                diameter, height, total_mass, fragrance_name, fragrance_ref, fragrance_supplier, fragrance_percentage, fragrance_id,
                pantone_code, pantone_hex, source, status, date_request, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [sample_number, client_id, project_id || null, client_request, candle_type,
             diameter, height, total_mass, fragrance_name, fragrance_ref, fragrance_supplier, fragrance_percentage, fragrance_id,
             pantone_code, pantone_hex, source || 'manual', status || 'demande', date_request, notes]
        );
        res.json({ id: result.lastInsertRowid, success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/samples/:id', async (req, res) => {
    try {
        const { sample_number, client_id, client_request, candle_type,
                diameter, height, total_mass, fragrance_name, fragrance_ref, fragrance_supplier, fragrance_percentage, fragrance_id,
                pantone_code, pantone_hex, source, status, date_request,
                date_creation, date_tests, date_validation, notes } = req.body;
        
        await db.run(
            `UPDATE samples SET sample_number=?, client_id=?, client_request=?, candle_type=?,
                diameter=?, height=?, total_mass=?, fragrance_name=?, fragrance_ref=?, fragrance_supplier=?, fragrance_percentage=?, fragrance_id=?,
                pantone_code=?, pantone_hex=?, source=?, status=?, date_request=?,
                date_creation=?, date_tests=?, date_validation=?, notes=?
             WHERE id=?`,
            [sample_number, client_id, client_request, candle_type,
             diameter, height, total_mass, fragrance_name, fragrance_ref, fragrance_supplier, fragrance_percentage, fragrance_id,
             pantone_code, pantone_hex, source, status, date_request,
             date_creation, date_tests, date_validation, notes, req.params.id]
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/samples/:id', async (req, res) => {
    try {
        await db.run('DELETE FROM samples WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Formulations liées à un échantillon
app.get('/api/samples/:id/formulations', async (req, res) => {
    try {
        const rows = await db.all(
            'SELECT * FROM formulations WHERE sample_id = ? ORDER BY created_at DESC',
            [req.params.id]
        );
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============================================
// ROUTES API - FORMULATIONS
// ============================================
app.get('/api/formulations', async (req, res) => {
    try {
        const { status, sample_id, client_id } = req.query;
        let sql = `SELECT f.*, s.sample_number, c.name as client_name
                    FROM formulations f
                    LEFT JOIN samples s ON f.sample_id = s.id
                    LEFT JOIN clients c ON f.client_id = c.id
                    WHERE 1=1`;
        const params = [];
        if (status) {
            sql += ' AND f.status = ?';
            params.push(status);
        }
        if (sample_id) {
            sql += ' AND f.sample_id = ?';
            params.push(sample_id);
        }
        if (client_id) {
            sql += ' AND f.client_id = ?';
            params.push(client_id);
        }
        sql += ' ORDER BY f.created_at DESC';
        const rows = await db.all(sql, params);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/formulations/:id', async (req, res) => {
    try {
        const formulation = await db.get(
            `SELECT f.*, s.sample_number, s.candle_type as sample_type,
                    s.diameter as sample_diameter, s.height as sample_height,
                    s.total_mass as sample_mass, s.fragrance_name as sample_fragrance,
                    s.fragrance_percentage as sample_fragrance_pct,
                    s.pantone_code as sample_pantone_code, s.pantone_hex as sample_pantone_hex,
                    s.client_request,
                    c.name as client_name, c.company as client_company,
                    fr.reference as fragrance_reference, fr.family as fragrance_family,
                    fr.supplier_id as fragrance_supplier_id, fsup.name as fragrance_catalog_supplier
             FROM formulations f
             LEFT JOIN samples s ON f.sample_id = s.id
             LEFT JOIN clients c ON COALESCE(f.client_id, s.client_id) = c.id
             LEFT JOIN fragrances fr ON f.fragrance_id = fr.id
             LEFT JOIN suppliers fsup ON fr.supplier_id = fsup.id
             WHERE f.id = ?`,
            [req.params.id]
        );
        if (!formulation) return res.status(404).json({ error: 'Formulation non trouvée' });
        
        // Récupérer les cires associées
        const waxes = await db.all(
            `SELECT fw.*, fw.raw_type, fw.raw_reference,
                    COALESCE(w.name, fw.raw_type) as wax_name,
                    COALESCE(w.type, fw.raw_type) as wax_type,
                    COALESCE(w.reference, fw.raw_reference) as reference,
                    w.melting_point, sup.name as supplier_name
             FROM formulation_waxes fw
             LEFT JOIN waxes w ON fw.wax_id = w.id AND fw.wax_id > 0
             LEFT JOIN suppliers sup ON w.supplier_id = sup.id
             WHERE fw.formulation_id = ?`,
            [req.params.id]
        );
        
        formulation.waxes = waxes;
        
        // Récupérer les colorants associés
        const colorants = await db.all(
            `SELECT fc.*, c.name as colorant_name, c.color_hex, c.form as colorant_form
             FROM formulation_colorants fc
             LEFT JOIN colorants c ON fc.colorant_id = c.id
             WHERE fc.formulation_id = ?`,
            [req.params.id]
        );
        formulation.colorants = colorants;
        
        res.json(formulation);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/formulations/import-coupled — Import complet: Excel + FDS → Client + Formulation + Cires + Colorants + Mèche
app.post('/api/formulations/import-coupled', express.json(), async (req, res) => {
    try {
        const { formulation: xl, fragrance_id } = req.body;
        if (!xl) return res.status(400).json({ error: 'Données Excel requises' });
        
        const log = [];
        const alerts = []; // Matières non trouvées → saisie manuelle        
        // 1. Auto-créer ou matcher le CLIENT
        let clientId = null;
        if (xl.client) {
            const clientName = xl.client.trim().toUpperCase();
            let existing = await db.get('SELECT id FROM clients WHERE UPPER(name) = ?', [clientName]);
            if (!existing) {
                const r = await db.run('INSERT INTO clients (name, client_type) VALUES (?, ?)', [clientName, 'client']);
                clientId = r.lastInsertRowid;
                log.push('Client créé: ' + clientName);
            } else {
                clientId = existing.id;
                log.push('Client trouvé: ' + clientName);
            }
        }
        
        // 2. Matcher les CIRES dans la base
        const waxLinks = [];
        for (const mat of (xl.materials || [])) {
            if (mat.type !== 'cire') continue;
            const ref = String(mat.reference || mat.name || '').trim();
            if (!ref) continue;
            let wax = await db.get('SELECT id, name FROM waxes WHERE reference LIKE ? OR name LIKE ?', ['%' + ref + '%', '%' + ref + '%']);
            if (wax) {
                waxLinks.push({ wax_id: wax.id, percentage: mat.percentage, mass: mat.mass, name: wax.name });
                log.push('Cire matchée: ' + ref + ' → ' + wax.name + ' (ID:' + wax.id + ')');
            } else {
                waxLinks.push({ wax_id: null, percentage: mat.percentage, mass: mat.mass, name: ref, reference: ref });
                alerts.push({ type: 'cire', reference: ref, percentage: mat.percentage, message: 'Cire "' + ref + '" non trouvée en base' });
                log.push('⚠ Cire non trouvée: ' + ref + ' → à créer manuellement');
            }
        }
        
        // 3. Matcher les COLORANTS dans la base
        const colorantLinks = [];
        for (const col of (xl.colorants || [])) {
            const ref = String(col.reference || '').trim();
            const colName = String(col.name || '').trim();
            const form = colName.toLowerCase().includes('liquide') ? 'liquide' : 
                         colName.toLowerCase().includes('solide') ? 'solide' : 
                         colName.toLowerCase().includes('poudre') ? 'solide' : null;
            
            let colorant = null;
            if (ref) {
                // Match by reference (e.g., "2624" or "1831k")
                const refs = ref.split(/\s+/);
                for (const r of refs) {
                    colorant = await db.get('SELECT id, name, reference FROM colorants WHERE reference LIKE ?', ['%' + r + '%']);
                    if (colorant) break;
                }
            }
            
            colorantLinks.push({
                colorant_id: colorant ? colorant.id : null,
                name: colName || (colorant ? colorant.name : ref),
                reference: ref,
                form: form,
                percentage: col.percentage,
                mass: col.mass
            });
            
            if (colorant) {
                log.push('Colorant matché: ' + ref + ' → ' + colorant.name + ' (' + (form || '?') + ')');
            } else {
                alerts.push({ type: 'colorant', reference: ref, name: colName, form: form, percentage: col.percentage, message: 'Colorant "' + (colName || ref) + '" non trouvé en base' });
                log.push('⚠ Colorant non matché: ' + (colName ? colName + ' ' : '') + ref + ' (' + (form || '?') + ') → à créer manuellement');
            }
        }
        
        // 4. Matcher la MÈCHE
        let wickId = null;
        let wickRef = xl.wick ? xl.wick.raw : null;
        if (xl.wick && xl.wick.series && xl.wick.size) {
            const wk = await db.get(
                'SELECT id, reference FROM wicks WHERE UPPER(series) = ? AND CAST(REPLACE(reference, series, \'\') AS INTEGER) = ?',
                [xl.wick.series, xl.wick.size]
            );
            if (wk) {
                wickId = wk.id;
                wickRef = wk.reference;
                log.push('Mèche matchée: ' + xl.wick.raw + ' → ID:' + wk.id);
            } else {
                const wk2 = await db.get('SELECT id, reference FROM wicks WHERE reference LIKE ?', ['%' + xl.wick.series + '%' + xl.wick.size + '%']);
                if (wk2) {
                    wickId = wk2.id;
                    wickRef = wk2.reference;
                    log.push('Mèche matchée: ' + xl.wick.raw + ' → ' + wk2.reference);
                } else {
                    alerts.push({ type: 'mèche', reference: xl.wick.raw, message: 'Mèche "' + xl.wick.raw + '" non trouvée en base' });
                    log.push('⚠ Mèche non trouvée: ' + xl.wick.raw + ' → à créer manuellement');
                }
            }
        }
        
        // 5. Extraire les % (la recette = identité de la formulation)
        const parfumMat = (xl.materials || []).find(m => m.type === 'parfum');
        const fragrancePct = xl.fragrance_pct || (parfumMat ? parfumMat.percentage : 0);
        const totalColorantPct = (xl.colorants || []).reduce((s, c) => s + (c.percentage || 0), 0);
        const totalWaxPct = (xl.materials || []).filter(m => m.type === 'cire').reduce((s, m) => s + (m.percentage || 0), 0);
        
        // 6. Générer le code formulation
        const code = xl.code_mfc || ('MFC-' + Date.now());
        
        // 7. Créer la FORMULATION (% = recette, masse cuve = info prod séparée)
        const result = await db.run(
            `INSERT INTO formulations (code, client_id, name, container_type, total_mass,
                fragrance_name, fragrance_ref, fragrance_percentage, fragrance_id,
                fragrance_mass, wax_mass, colorant_mass,
                wick_reference, wick_id, notes, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [code, clientId, xl.candle_name || 'Import Excel', xl.container_ref || null,
             xl.total_mass || 0,
             parfumMat ? parfumMat.name : xl.fragrance_name,
             xl.fragrance_ref || (parfumMat ? parfumMat.reference : null),
             fragrancePct, fragrance_id || null,
             parfumMat ? parfumMat.mass : null,
             (xl.materials || []).filter(m => m.type === 'cire').reduce((s, m) => s + (m.mass || 0), 0),
             (xl.colorants || []).reduce((s, c) => s + (c.mass || 0), 0),
             wickRef, wickId,
             'Import Excel: ' + (xl.filename || '') + ' | Lot: ' + (xl.lot_mfc || '—') + ' | Date: ' + (xl.date || '—') + ' | Masse cuve: ' + (xl.total_mass || '?') + 'g',
             'importée']
        );
        const formulationId = result.lastInsertRowid;
        log.push('Formulation créée: ' + code + ' (ID:' + formulationId + ')');
        log.push('Recette: parfum ' + fragrancePct + '% + cire ' + totalWaxPct + '% + colorants ' + totalColorantPct + '%');
        
        // 8. Lier les CIRES (formulation_waxes)
        for (const wl of waxLinks) {
            await db.run('INSERT INTO formulation_waxes (formulation_id, wax_id, percentage, mass) VALUES (?, ?, ?, ?)',
                [formulationId, wl.wax_id, wl.percentage, wl.mass]);
        }
        
        // 9. Lier les COLORANTS (formulation_colorants)
        // Create table if not exists (migration)
        await db.run(`CREATE TABLE IF NOT EXISTS formulation_colorants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            formulation_id INTEGER NOT NULL,
            colorant_id INTEGER,
            name TEXT,
            reference TEXT,
            form TEXT,
            percentage REAL,
            mass REAL,
            FOREIGN KEY (formulation_id) REFERENCES formulations(id),
            FOREIGN KEY (colorant_id) REFERENCES colorants(id)
        )`);
        
        for (const cl of colorantLinks) {
            await db.run('INSERT INTO formulation_colorants (formulation_id, colorant_id, name, reference, form, percentage, mass) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [formulationId, cl.colorant_id, cl.name, cl.reference, cl.form, cl.percentage, cl.mass]);
        }
        
        console.log(`  ✅ Import couplé: ${xl.candle_name} — client=${xl.client}, ${waxLinks.length} cires, ${colorantLinks.length} colorants, mèche=${wickRef||'?'}, parfum=${fragrancePct}%`);
        
        res.json({
            success: true,
            formulation_id: formulationId,
            client_id: clientId,
            client_name: xl.client,
            wax_matches: waxLinks.filter(w => w.wax_id).length,
            colorant_count: colorantLinks.length,
            wick_matched: !!wickId,
            fragrance_linked: !!fragrance_id,
            fragrance_ref: xl.fragrance_ref || (parfumMat ? parfumMat.reference : null),
            recipe: { fragrance_pct: fragrancePct, wax_pct: totalWaxPct, colorant_pct: totalColorantPct },
            alerts,
            log
        });
        
    } catch (e) {
        console.error('Import couplé error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/formulations', async (req, res) => {
    try {
        const { code, sample_id, client_id, project_id, name, container_type,
                diameter, height, total_mass, fragrance_name, fragrance_ref, fragrance_supplier, fragrance_percentage, fragrance_id,
                pantone_code, pantone_hex, wick_reference, wick_id, notes,
                temp_fusion, temp_ajout_parfum, temp_coulage, temp_notes, colorant_mass: colorant_mass_input } = req.body;
        
        if (!code || !name || !total_mass) {
            return res.status(400).json({ error: 'Code, nom et masse totale sont obligatoires' });
        }
        
        const fragrancePercent = fragrance_percentage || 0;
        const fragrance_mass = total_mass * (fragrancePercent / 100);
        const wax_mass = total_mass - fragrance_mass - (colorant_mass_input || 0);
        
        const result = await db.run(
            `INSERT INTO formulations (code, sample_id, client_id, project_id, name, container_type,
                diameter, height, total_mass, fragrance_name, fragrance_ref, fragrance_supplier, fragrance_percentage,
                fragrance_mass, fragrance_id, wax_mass, colorant_mass, pantone_code, pantone_hex,
                wick_reference, wick_id, notes, temp_fusion, temp_ajout_parfum, temp_coulage, temp_notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [code, sample_id, client_id, project_id || null, name, container_type,
             diameter, height, total_mass, fragrance_name, fragrance_ref, fragrance_supplier, fragrancePercent,
             fragrance_mass, fragrance_id, wax_mass, colorant_mass_input || 0, pantone_code, pantone_hex,
             wick_reference, wick_id, notes, temp_fusion, temp_ajout_parfum, temp_coulage, temp_notes]
        );
        res.json({ id: result.lastInsertRowid, success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/formulations/:id', async (req, res) => {
    try {
        const { code, sample_id, client_id, name, container_type,
                diameter, height, total_mass, fragrance_name, fragrance_ref, fragrance_supplier, fragrance_percentage, fragrance_id,
                pantone_code, pantone_hex, wick_reference, wick_id, status, version, notes,
                change_reason, temp_fusion, temp_ajout_parfum, temp_coulage, temp_notes, colorant_mass } = req.body;
        
        // Capturer l'état AVANT pour le change_log
        const before = await db.get('SELECT * FROM formulations WHERE id = ?', [req.params.id]);
        
        // Recalculs automatiques
        const fragrancePercent = fragrance_percentage || 0;
        const fragrance_mass = total_mass ? total_mass * (fragrancePercent / 100) : null;
        const wax_mass = total_mass ? total_mass - (fragrance_mass || 0) - (colorant_mass || 0) : null;
        
        await db.run(
            `UPDATE formulations SET code=?, sample_id=?, client_id=?, name=?, container_type=?,
                diameter=?, height=?, total_mass=?, fragrance_name=?, fragrance_ref=?, fragrance_supplier=?, fragrance_percentage=?,
                fragrance_mass=?, fragrance_id=?, wax_mass=?, colorant_mass=?, pantone_code=?, pantone_hex=?,
                wick_reference=?, wick_id=?, status=?, version=?, notes=?,
                temp_fusion=?, temp_ajout_parfum=?, temp_coulage=?, temp_notes=?
             WHERE id=?`,
            [code, sample_id, client_id, name, container_type,
             diameter, height, total_mass, fragrance_name, fragrance_ref, fragrance_supplier, fragrancePercent,
             fragrance_mass, fragrance_id, wax_mass, colorant_mass, pantone_code, pantone_hex,
             wick_reference, wick_id, status, version, notes,
             temp_fusion, temp_ajout_parfum, temp_coulage, temp_notes, req.params.id]
        );
        
        // AUTO-APPRENTISSAGE: Détecter et logger les changements significatifs
        if (before) {
            const tracked = [
                ['wick_reference', before.wick_reference, wick_reference],
                ['fragrance_percentage', before.fragrance_percentage, fragrancePercent],
                ['fragrance_name', before.fragrance_name, fragrance_name],
                ['total_mass', before.total_mass, total_mass],
                ['container_type', before.container_type, container_type],
                ['diameter', before.diameter, diameter],
                ['height', before.height, height]
            ];
            for (const [field, oldVal, newVal] of tracked) {
                if (oldVal !== null && newVal !== null && String(oldVal) !== String(newVal)) {
                    await logChange({
                        entity_type: 'formulation', entity_id: parseInt(req.params.id),
                        action: 'update', field_changed: field,
                        old_value: String(oldVal), new_value: String(newVal),
                        reason_why: change_reason || null,
                        technical_context: 'Formulation ' + (code || before.code) + ' — ' + (name || before.name),
                        linked_formulation_id: parseInt(req.params.id),
                        linked_client_id: client_id || before.client_id
                    });
                }
            }
        }
        
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/formulations/:id', async (req, res) => {
    try {
        await db.run('DELETE FROM formulation_waxes WHERE formulation_id = ?', [req.params.id]);
        await db.run('DELETE FROM formulation_colorants WHERE formulation_id = ?', [req.params.id]);
        await db.run('DELETE FROM formulations WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Gestion des cires dans une formulation
app.post('/api/formulations/:id/waxes', async (req, res) => {
    try {
        const { wax_id, percentage } = req.body;
        if (!wax_id || !percentage) {
            return res.status(400).json({ error: 'Cire et pourcentage obligatoires' });
        }
        
        const formulation = await db.get('SELECT wax_mass FROM formulations WHERE id = ?', [req.params.id]);
        if (!formulation) return res.status(404).json({ error: 'Formulation non trouvée' });
        
        const mass = formulation.wax_mass ? formulation.wax_mass * (percentage / 100) : null;
        
        const result = await db.run(
            `INSERT INTO formulation_waxes (formulation_id, wax_id, percentage, mass)
             VALUES (?, ?, ?, ?)`,
            [req.params.id, wax_id, percentage, mass]
        );
        res.json({ id: result.lastInsertRowid, success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/formulations/:id/waxes/:waxId', async (req, res) => {
    try {
        await db.run(
            'DELETE FROM formulation_waxes WHERE formulation_id = ? AND wax_id = ?',
            [req.params.id, req.params.waxId]
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/formulations/:id/diagnostic — Score de diffusion pour un couple formulation (parfum × blend cires)
app.get('/api/formulations/:id/diagnostic', async (req, res) => {
    try {
        const formulation = await db.get('SELECT * FROM formulations WHERE id = ?', [req.params.id]);
        if (!formulation) return res.status(404).json({ error: 'Formulation non trouvée' });
        
        // Récupérer le parfum
        let components = [];
        if (formulation.fragrance_id) {
            components = await db.all('SELECT * FROM fragrance_components WHERE fragrance_id = ?', [formulation.fragrance_id]);
        }
        if (!components.length) {
            return res.json({ 
                formulation: formulation.code,
                error: 'Pas de composants FDS pour le parfum de cette formulation',
                has_fragrance: !!formulation.fragrance_id,
                fragrance_name: formulation.fragrance_name 
            });
        }
        
        // Récupérer les cires du blend
        const waxes = await db.all(
            `SELECT fw.*, w.type as wax_type, w.name as wax_name, w.reference 
             FROM formulation_waxes fw LEFT JOIN waxes w ON fw.wax_id = w.id 
             WHERE fw.formulation_id = ?`, [req.params.id]
        );
        
        // Calculer les propriétés effectives du blend de cires
        const waxTypeMap = { 'soja': 'soja', 'colza': 'colza', 'coco': 'coco', 'micro': 'microcristalline', 'microcristalline': 'microcristalline', 'minérale': 'cire_minerale', 'minerale': 'cire_minerale', 'paraffine': 'paraffine' };
        const blendInput = waxes.map(w => {
            const wType = (w.wax_type || '').toLowerCase();
            let type = 'paraffine';
            for (const [key, val] of Object.entries(waxTypeMap)) { if (wType.includes(key)) { type = val; break; } }
            return { type, name: w.wax_name || w.reference || type, pct: w.percentage || 0 };
        });
        
        let mainWaxType = 'paraffine';
        let blendThermo = null;
        if (blendInput.length > 1) {
            blendThermo = throwDiagnostic.blendWaxProperties(blendInput);
            // Use the dominant wax type for the profile key
            const sorted = [...blendInput].sort((a, b) => b.pct - a.pct);
            mainWaxType = sorted[0].type;
        } else if (blendInput.length === 1) {
            mainWaxType = blendInput[0].type;
        }
        
        // Diagnostic
        let fragranceFP = null;
        if (formulation.fragrance_id) {
            const frag = await db.get('SELECT flash_point FROM fragrances WHERE id = ?', [formulation.fragrance_id]);
            fragranceFP = frag?.flash_point;
        }
        const profile = throwDiagnostic.analyzeThrowProfile(components, MOLECULE_DB_FULL, mainWaxType, { 
            fragrance_flash_point: fragranceFP,
            blend_thermo: blendThermo 
        });
        const rapport = throwDiagnostic.generateScientificReport(profile, MOLECULE_DB_FULL);
        
        res.json({
            formulation_code: formulation.code,
            formulation_name: formulation.name,
            fragrance_name: formulation.fragrance_name,
            fragrance_pct: formulation.fragrance_percentage,
            wax_blend: waxes.map(w => ({ name: w.wax_name || w.reference, type: w.wax_type, pct: w.percentage })),
            main_wax_type: mainWaxType,
            wax_name: profile.wax_name,
            scores: {
                froid: rapport.score_froid,
                chaud: rapport.score_chaud,
                global: rapport.score_global
            },
            charge_max: profile.charge_max_scientifique,
            boosters_count: (rapport.boosters || []).length,
            bloquants_count: (rapport.bloquants || []).length,
            verdict_froid: rapport.verdict_froid,
            verdict_chaud: rapport.verdict_chaud,
            conclusion: rapport.conclusion
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================
// ROUTES API - TESTS DE COMBUSTION
// ============================================
app.get('/api/burn-tests', async (req, res) => {
    try {
        const { status, formulation_id } = req.query;
        let sql = `SELECT bt.*, f.code as formulation_code, f.name as formulation_name,
                          f.total_mass as formulation_mass,
                          s.sample_number,
                          c.name as client_name, c.company as client_company
                   FROM burn_tests bt
                   LEFT JOIN formulations f ON bt.formulation_id = f.id
                   LEFT JOIN samples s ON COALESCE(bt.sample_id, f.sample_id) = s.id
                   LEFT JOIN clients c ON COALESCE(f.client_id, s.client_id) = c.id
                   WHERE 1=1`;
        const params = [];
        if (status) {
            sql += ' AND bt.status = ?';
            params.push(status);
        }
        if (formulation_id) {
            sql += ' AND bt.formulation_id = ?';
            params.push(formulation_id);
        }
        sql += ' ORDER BY bt.created_at DESC';
        const rows = await db.all(sql, params);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/burn-tests/:id', async (req, res) => {
    try {
        const test = await db.get(
            `SELECT bt.*,
                    f.code as formulation_code, f.name as formulation_name,
                    f.total_mass as formulation_mass, f.container_type,
                    f.diameter, f.height,
                    f.fragrance_name, f.fragrance_percentage,
                    f.pantone_code, f.pantone_hex,
                    f.wick_reference as formulation_wick,
                    s.sample_number, s.client_request, s.candle_type,
                    c.name as client_name, c.company as client_company
             FROM burn_tests bt
             LEFT JOIN formulations f ON bt.formulation_id = f.id
             LEFT JOIN samples s ON COALESCE(bt.sample_id, f.sample_id) = s.id
             LEFT JOIN clients c ON COALESCE(f.client_id, s.client_id) = c.id
             WHERE bt.id = ?`,
            [req.params.id]
        );
        if (!test) return res.status(404).json({ error: 'Test non trouvé' });
        
        // Récupérer les cycles
        const cycles = await db.all(
            'SELECT * FROM burn_cycles WHERE test_id = ? ORDER BY cycle_number',
            [req.params.id]
        );
        test.cycles = cycles;
        res.json(test);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/burn-tests', async (req, res) => {
    try {
        const { test_number, formulation_id, sample_id, initial_mass,
                wick_reference, start_date, notes } = req.body;
        
        if (!test_number || !formulation_id || !initial_mass) {
            return res.status(400).json({ error: 'Numéro, formulation et masse initiale obligatoires' });
        }
        
        const result = await db.run(
            `INSERT INTO burn_tests (test_number, formulation_id, sample_id, initial_mass,
                wick_reference, start_date, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [test_number, formulation_id, sample_id, initial_mass, wick_reference, start_date, notes]
        );
        res.json({ id: result.lastInsertRowid, success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/burn-tests/:id', async (req, res) => {
    try {
        const { status, end_date, conclusion, notes, client_status, client_feedback, client_decision_date } = req.body;
        await db.run(
            `UPDATE burn_tests SET status=COALESCE(?,status), end_date=COALESCE(?,end_date), 
             conclusion=COALESCE(?,conclusion), notes=COALESCE(?,notes),
             client_status=COALESCE(?,client_status), client_feedback=COALESCE(?,client_feedback),
             client_decision_date=COALESCE(?,client_decision_date) WHERE id=?`,
            [status, end_date, conclusion, notes, client_status, client_feedback, client_decision_date, req.params.id]
        );
        
        // ═══ AUTO-APPRENTISSAGE — Test terminé → bilan automatique dans KB ═══
        if (status === 'terminé') {
            try {
                const test = await db.get(
                    `SELECT bt.*, f.code as form_code, f.name as form_name, f.fragrance_name,
                            f.fragrance_percentage, f.wick_reference, f.container_type, f.diameter, f.height,
                            c.name as client_name
                     FROM burn_tests bt LEFT JOIN formulations f ON bt.formulation_id = f.id
                     LEFT JOIN samples s ON bt.sample_id = s.id
                     LEFT JOIN clients c ON COALESCE(f.client_id, s.client_id) = c.id
                     WHERE bt.id = ?`, [req.params.id]);
                const cycles = await db.all('SELECT * FROM burn_cycles WHERE test_id = ? ORDER BY cycle_number', [req.params.id]);
                
                if (cycles.length > 0) {
                    const avgCons = cycles.reduce((s,c) => s + (c.mass_before - c.mass_after), 0) / cycles.length;
                    const tunnelCount = cycles.filter(c => c.tunneling && c.tunneling !== 'aucun').length;
                    const mushCount = cycles.filter(c => c.mushrooming && c.mushrooming !== 'aucun').length;
                    const sootCount = cycles.filter(c => c.soot_level && c.soot_level !== 'aucun' && c.soot_level !== 'none').length;
                    const lastScent = cycles.filter(c => c.scent_throw).pop();
                    
                    let content = 'BILAN TEST TERMINÉ — ' + (test?.test_number || '');
                    content += '\n\nFormulation : ' + (test?.form_name || '—') + ' (' + (test?.form_code || '') + ')';
                    content += '\nClient : ' + (test?.client_name || '—');
                    content += '\nType : ' + (test?.container_type || '—') + ' ' + (test?.diameter || '?') + 'x' + (test?.height || '?') + 'mm';
                    content += '\nParfum : ' + (test?.fragrance_name || '—') + ' ' + (test?.fragrance_percentage || 0) + '%';
                    content += '\nMèche : ' + (test?.wick_reference || '—');
                    content += '\n\nRésultats sur ' + cycles.length + ' cycles :';
                    content += '\n  Consommation moyenne : ' + avgCons.toFixed(1) + 'g/cycle';
                    content += '\n  Tunnel : ' + tunnelCount + '/' + cycles.length + ' cycles';
                    content += '\n  Champignonnage : ' + mushCount + '/' + cycles.length + ' cycles';
                    content += '\n  Suie : ' + sootCount + '/' + cycles.length + ' cycles';
                    if (lastScent) content += '\n  Dernière diffusion : ' + lastScent.scent_throw;
                    if (conclusion) content += '\n\nConclusion : ' + conclusion;
                    
                    const quality = (tunnelCount === 0 && mushCount === 0 && sootCount === 0) ? '✅' : '⚠️';
                    
                    await db.run(
                        'INSERT INTO knowledge_base (category, subcategory, title, content, source, priority, tags) VALUES (?,?,?,?,?,?,?)',
                        ['apprentissage', 'bilan_test',
                         quality + ' Bilan — ' + (test?.test_number || '') + ' — ' + (test?.form_name || ''),
                         content,
                         'Auto-apprentissage test terminé',
                         tunnelCount + mushCount + sootCount > 0 ? 4 : 3,
                         ['bilan', test?.container_type, test?.fragrance_name, tunnelCount > 0 ? 'tunnel' : '', mushCount > 0 ? 'champignonnage' : '', sootCount > 0 ? 'suie' : ''].filter(Boolean).join(',')]
                    );
                    console.log('Auto-learn: bilan test', test?.test_number, quality);
                }
            } catch(e) { console.error('Auto-learn bilan error:', e.message); }
        }
        
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ═══════ VALIDATION CLIENT + RETOUR EN BASE DE CONNAISSANCES ═══════
app.post('/api/burn-tests/:id/client-decision', async (req, res) => {
    try {
        const { client_status, client_feedback } = req.body;
        const date = new Date().toISOString().slice(0,10);
        
        const prev = await db.get('SELECT client_status, client_feedback FROM burn_tests WHERE id = ?', [req.params.id]);
        
        await db.run(
            'UPDATE burn_tests SET client_status=?, client_feedback=?, client_decision_date=? WHERE id=?',
            [client_status, client_feedback, date, req.params.id]
        );
        
        // Log to history
        const isChange = prev && prev.client_status && prev.client_status !== client_status;
        await db.run(
            'INSERT INTO test_history (test_id, event_type, event_data) VALUES (?, ?, ?)',
            [req.params.id, isChange ? 'client_changement_avis' : 'client_decision',
             JSON.stringify({ status: client_status, feedback: client_feedback, previous_status: prev?.client_status || null, date })]
        );
        
        const test = await db.get(
            `SELECT bt.*, f.code as form_code, f.name as form_name, f.fragrance_name,
                    f.fragrance_percentage, f.container_type, f.diameter, f.height,
                    f.wick_reference as form_wick, f.version as form_version,
                    s.sample_number, c.name as client_name, c.company as client_company
             FROM burn_tests bt
             LEFT JOIN formulations f ON bt.formulation_id = f.id
             LEFT JOIN samples s ON bt.sample_id = s.id
             LEFT JOIN clients c ON COALESCE(f.client_id, s.client_id) = c.id
             WHERE bt.id = ?`, [req.params.id]
        );
        
        // Cycles summary for knowledge
        const cycles = await db.all('SELECT * FROM burn_cycles WHERE test_id = ? ORDER BY cycle_number', [req.params.id]);
        let cyclesSummary = '';
        if (cycles.length) {
            const avgCons = cycles.reduce((s,c) => s + (c.mass_before - c.mass_after), 0) / cycles.length;
            const scentVals = cycles.map(c => c.scent_throw).filter(Boolean);
            const tunnelVals = cycles.filter(c => c.tunneling && c.tunneling !== 'aucun');
            const mushVals = cycles.filter(c => c.mushrooming && c.mushrooming !== 'aucun');
            cyclesSummary = '\nRésultats: ' + cycles.length + ' cycles, conso moy ' + avgCons.toFixed(1) + 'g/cycle';
            if (scentVals.length) cyclesSummary += ', parfum: ' + scentVals[scentVals.length-1];
            if (tunnelVals.length) cyclesSummary += ', tunnel: ' + tunnelVals.length + '/' + cycles.length + ' cycles';
            if (mushVals.length) cyclesSummary += ', champignonnage: ' + mushVals.length + '/' + cycles.length + ' cycles';
        }
        
        if (client_feedback && client_feedback.trim()) {
            const prefix = isChange ? '🔄 Changement avis' : (client_status === 'validé' ? '✓ Validé' : '✗ Refusé');
            const title = prefix + ' — ' + (test.test_number || 'Test') + 
                          (test.version > 1 ? ' (V' + test.version + ')' : '') +
                          (test.client_name ? ' — ' + test.client_name : '');
            let content = 'Retour client : ' + client_feedback;
            if (isChange && prev.client_feedback) content += '\nAvis précédent : ' + prev.client_feedback;
            if (test.form_name) content += '\nFormulation : ' + test.form_name;
            if (test.fragrance_name) content += '\nParfum : ' + test.fragrance_name + ' (' + (test.fragrance_percentage||0) + '%)';
            if (test.container_type) content += '\nType : ' + test.container_type;
            if (test.diameter && test.height) content += '\nDimensions : ' + test.diameter + 'x' + test.height + 'mm';
            if (test.form_wick) content += '\nMèche : ' + test.form_wick;
            content += cyclesSummary;
            content += '\nDate : ' + date;
            
            await db.run(
                'INSERT INTO knowledge_base (category, subcategory, title, content, source, priority, tags) VALUES (?, ?, ?, ?, ?, ?, ?)',
                ['Retours clients', isChange ? 'Changements avis' : (client_status === 'validé' ? 'Validations' : 'Refus'),
                 title, content, 'Test ' + (test.test_number || req.params.id),
                 isChange ? 5 : (client_status === 'validé' ? 3 : 4),
                 [client_status, test.client_name, test.fragrance_name, isChange ? 'changement' : ''].filter(Boolean).join(',')]
            );
        }
        // Auto-update sample status
        if (test.sample_id) {
            const newSampleStatus = client_status === 'validé' ? 'validé' : 'en_test';
            const dateField = client_status === 'validé' ? 'date_validation' : null;
            if (dateField) {
                await db.run('UPDATE samples SET status=?, date_validation=? WHERE id=?', [newSampleStatus, date, test.sample_id]);
            } else {
                await db.run('UPDATE samples SET status=? WHERE id=?', [newSampleStatus, test.sample_id]);
            }
        }

        // Auto-validate formulation → recette + patrimoine
        if (client_status === 'validé' && test.formulation_id) {
            try {
                const http = require('http');
                // Appel interne pour déclencher la chaîne complète
                const validateRes = await new Promise((resolve, reject) => {
                    const postData = JSON.stringify({ notes: 'Validé par client' + (client_feedback ? ' — ' + client_feedback : '') });
                    const options = { hostname: 'localhost', port: server.address()?.port || 3000, path: '/api/formulations/' + test.formulation_id + '/validate', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) } };
                    const r = http.request(options, (resp) => { let data = ''; resp.on('data', c => data += c); resp.on('end', () => resolve(JSON.parse(data))); });
                    r.on('error', reject);
                    r.write(postData);
                    r.end();
                });
                console.log('Auto-validated formulation:', validateRes.recipe_code);
            } catch (ve) {
                console.error('Auto-validation failed (non-blocking):', ve.message);
            }
        }
        
        res.json({ success: true, changed: isChange });
        
        // ═══ AUTO-APPRENTISSAGE — Créer règle automatiquement ═══
        try {
            const cycles = await db.all('SELECT * FROM burn_cycles WHERE test_id = ? ORDER BY cycle_number', [req.params.id]);
            const avgCons = cycles.length ? cycles.reduce((s,c) => s + (c.mass_before - c.mass_after), 0) / cycles.length : 0;
            const tunnelCount = cycles.filter(c => c.tunneling && c.tunneling !== 'aucun').length;
            const mushCount = cycles.filter(c => c.mushrooming && c.mushrooming !== 'aucun').length;
            
            const condition = JSON.stringify({
                container_type: test.container_type, diameter: test.diameter, height: test.height,
                fragrance_name: test.fragrance_name, fragrance_percentage: test.fragrance_percentage
            });
            
            const existingRule = await db.get(
                'SELECT id FROM learned_rules WHERE source_test_id = ? AND rule_type = ?',
                [req.params.id, client_status === 'validé' ? 'validated_combination' : 'refused_combination']
            );
            
            if (!existingRule) {
                if (client_status === 'validé') {
                    await db.run(
                        `INSERT INTO learned_rules (rule_type, condition, recommendation, confidence, success_count, source_formulation_id, source_test_id)
                         VALUES (?, ?, ?, 0.9, 1, ?, ?)`,
                        ['validated_combination', condition,
                         JSON.stringify({ wick: test.form_wick, avg_consumption: Math.round(avgCons*10)/10,
                            form_name: test.form_name, test_number: test.test_number, client_feedback: client_feedback,
                            cycles: cycles.length, tunnel_ratio: tunnelCount + '/' + cycles.length, mush_ratio: mushCount + '/' + cycles.length }),
                         test.formulation_id, req.params.id]
                    );
                } else if (client_status === 'refusé') {
                    await db.run(
                        `INSERT INTO learned_rules (rule_type, condition, recommendation, confidence, failure_count, source_test_id)
                         VALUES (?, ?, ?, 0.1, 1, ?)`,
                        ['refused_combination', condition,
                         JSON.stringify({ reason: client_feedback, wick: test.form_wick,
                            tunnel_ratio: tunnelCount + '/' + cycles.length, mush_ratio: mushCount + '/' + cycles.length }),
                         req.params.id]
                    );
                }
                console.log('Auto-learn: règle créée pour test', test.test_number, '→', client_status);
            }
        } catch(le) { console.error('Auto-learn error (non-blocking):', le.message); }
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════ REPRENDRE UN ESSAI — Versioning V1, V2, V3... ═══════
app.post('/api/burn-tests/:id/retry', async (req, res) => {
    try {
        const { adjust_notes } = req.body || {};
        const original = await db.get(
            `SELECT bt.*, f.code as form_code, f.sample_id as form_sample_id, f.name as form_name, s.sample_number
             FROM burn_tests bt LEFT JOIN formulations f ON bt.formulation_id = f.id
             LEFT JOIN samples s ON bt.sample_id = s.id WHERE bt.id = ?`, [req.params.id]
        );
        if (!original) return res.status(404).json({ error: 'Test non trouvé' });
        
        // Find highest version in this chain
        const sampleId = original.sample_id || original.form_sample_id;
        const allVersions = await db.all(
            'SELECT MAX(version) as maxV FROM burn_tests WHERE sample_id = ? OR retry_from_test_id = ? OR id = ?',
            [sampleId, req.params.id, req.params.id]
        );
        const nextVersion = (allVersions[0]?.maxV || 1) + 1;
        
        const sampleNum = original.sample_number || original.form_code.replace(/-F\d+(-T\d+)?$/, '');
        const newNumber = sampleNum + '-V' + nextVersion;
        
        let notes = '🔄 Reprise V' + nextVersion + ' du test ' + original.test_number;
        if (original.client_feedback) notes += '\n📋 Retour client : ' + original.client_feedback;
        if (original.conclusion) notes += '\n📊 Conclusion précédente : ' + original.conclusion;
        if (adjust_notes) notes += '\n✏️ Ajustements : ' + adjust_notes;
        
        const result = await db.run(
            'INSERT INTO burn_tests (test_number, formulation_id, sample_id, initial_mass, wick_reference, start_date, notes, retry_from_test_id, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [newNumber, original.formulation_id, sampleId, original.initial_mass, original.wick_reference,
             new Date().toISOString().slice(0,10), notes, original.id, nextVersion]
        );
        
        // History on both tests
        await db.run('INSERT INTO test_history (test_id, event_type, event_data) VALUES (?, ?, ?)',
            [req.params.id, 'reprise_lancée', JSON.stringify({ nouveau_test: newNumber, version: nextVersion })]);
        await db.run('INSERT INTO test_history (test_id, event_type, event_data) VALUES (?, ?, ?)',
            [result.lastInsertRowid, 'créé_depuis_reprise', JSON.stringify({ original: original.test_number, version: nextVersion, feedback: original.client_feedback })]);
        
        // Knowledge base
        await db.run(
            'INSERT INTO knowledge_base (category, subcategory, title, content, source, priority, tags) VALUES (?, ?, ?, ?, ?, ?, ?)',
            ['Retours clients', 'Reprises',
             '🔄 Reprise V' + nextVersion + ' — ' + sampleNum,
             'Reprise suite retour client.\nOriginal : ' + original.test_number +
             (original.client_feedback ? '\nMotif : ' + original.client_feedback : '') +
             (adjust_notes ? '\nAjustements : ' + adjust_notes : '') +
             '\nNouveau : ' + newNumber,
             newNumber, 4, ['reprise', 'V' + nextVersion].join(',')]
        );
        
        res.json({ id: result.lastInsertRowid, test_number: newNumber, version: nextVersion, success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════ HISTORIQUE D'UN TEST ═══════
app.get('/api/burn-tests/:id/history', async (req, res) => {
    try {
        const history = await db.all('SELECT * FROM test_history WHERE test_id = ? ORDER BY created_at ASC', [req.params.id]);
        const test = await db.get('SELECT retry_from_test_id FROM burn_tests WHERE id = ?', [req.params.id]);
        const nextVersions = await db.all('SELECT id, test_number, version, client_status, status FROM burn_tests WHERE retry_from_test_id = ?', [req.params.id]);
        const prevTest = test && test.retry_from_test_id ? 
            await db.get('SELECT id, test_number, version, client_status, client_feedback FROM burn_tests WHERE id = ?', [test.retry_from_test_id]) : null;
        res.json({ history, previous: prevTest, next_versions: nextVersions });
    } catch (e) { res.status(500).json({ error: e.message }); }
});


app.delete('/api/burn-tests/:id', async (req, res) => {
    try {
        await db.run('DELETE FROM burn_cycles WHERE test_id = ?', [req.params.id]);
        await db.run('DELETE FROM burn_tests WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Cycles de combustion
app.post('/api/burn-tests/:id/cycles', async (req, res) => {
    try {
        const existingCycles = await db.all('SELECT id FROM burn_cycles WHERE test_id = ?', [req.params.id]);
        if (existingCycles.length >= 4) {
            return res.status(400).json({ error: 'Maximum de 4 cycles atteint pour ce test' });
        }

        const { cycle_number, start_time, end_time, duration_minutes,
                mass_before, mass_after, pool_diameter, pool_depth, pool_visible, flame_height,
                flame_stability, smoke_level, soot_level, mushrooming,
                tunneling, scent_throw, notes,
                mod_wick, mod_fragrance_pct, mod_wax_changes, mod_colorant, mod_other, mod_notes } = req.body;
        
        const massConsumed = (mass_before && mass_after) ? mass_before - mass_after : null;
        const hasModifications = mod_wick || mod_fragrance_pct || mod_wax_changes || mod_colorant || mod_other;
        
        const result = await db.run(
            `INSERT INTO burn_cycles (test_id, cycle_number, start_time, end_time, duration_minutes,
                mass_before, mass_after, mass_consumed, pool_diameter, pool_depth, pool_visible, flame_height,
                flame_stability, smoke_level, soot_level, mushrooming, tunneling, scent_throw, notes,
                mod_wick, mod_fragrance_pct, mod_wax_changes, mod_colorant, mod_other, mod_notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.params.id, cycle_number, start_time, end_time, duration_minutes || 240,
             mass_before, mass_after, massConsumed, pool_diameter, pool_depth, pool_visible !== undefined ? pool_visible : 1, flame_height,
             flame_stability, smoke_level, soot_level, mushrooming, tunneling, scent_throw, notes,
             mod_wick || null, mod_fragrance_pct || null, mod_wax_changes || null, mod_colorant || null, mod_other || null, mod_notes || null]
        );
        
        // Update total burn time
        const cycles = await db.all('SELECT duration_minutes FROM burn_cycles WHERE test_id = ?', [req.params.id]);
        const totalTime = cycles.reduce((sum, c) => sum + (c.duration_minutes || 0), 0);
        await db.run('UPDATE burn_tests SET total_burn_time = ? WHERE id = ?', [totalTime, req.params.id]);
        
        // If modifications were made, log to history + knowledge base
        if (hasModifications) {
            const test = await db.get(
                `SELECT bt.test_number, f.code as form_code, f.name as form_name, f.fragrance_name,
                        f.fragrance_percentage, f.wick_reference, f.container_type, f.diameter, f.height,
                        s.sample_number, c.name as client_name
                 FROM burn_tests bt LEFT JOIN formulations f ON bt.formulation_id = f.id
                 LEFT JOIN samples s ON bt.sample_id = s.id
                 LEFT JOIN clients c ON COALESCE(f.client_id, s.client_id) = c.id
                 WHERE bt.id = ?`, [req.params.id]);
            
            // History event
            await db.run('INSERT INTO test_history (test_id, event_type, event_data) VALUES (?, ?, ?)',
                [req.params.id, 'modification_cycle',
                 JSON.stringify({ cycle: cycle_number, wick: mod_wick, fragrance_pct: mod_fragrance_pct,
                    wax: mod_wax_changes, colorant: mod_colorant, other: mod_other, reason: mod_notes })]);
            
            // Knowledge base entry
            let kbContent = 'Modification cycle ' + cycle_number + ' du test ' + (test?.test_number || '');
            if (mod_wick) kbContent += '\nMèche : ' + (test?.wick_reference||'?') + ' → ' + mod_wick;
            if (mod_fragrance_pct) kbContent += '\nParfum : ' + (test?.fragrance_percentage||'?') + '% → ' + mod_fragrance_pct + '%';
            if (mod_wax_changes) kbContent += '\nCires : ' + mod_wax_changes;
            if (mod_colorant) kbContent += '\nColorant : ' + mod_colorant;
            if (mod_other) kbContent += '\nAutre : ' + mod_other;
            if (mod_notes) kbContent += '\nRaison : ' + mod_notes;
            // Add cycle observations
            if (mushrooming && mushrooming !== 'aucun') kbContent += '\nChampignonnage : ' + mushrooming;
            if (tunneling && tunneling !== 'aucun') kbContent += '\nTunnel : ' + tunneling;
            if (scent_throw) kbContent += '\nDiffusion : ' + scent_throw;
            kbContent += '\nConso cycle : ' + (massConsumed ? massConsumed.toFixed(1) + 'g' : '?');
            if (test?.form_name) kbContent += '\nFormulation : ' + test.form_name;
            if (test?.container_type) kbContent += '\nType : ' + test.container_type + ' ' + (test.diameter||'') + 'x' + (test.height||'') + 'mm';
            
            await db.run(
                'INSERT INTO knowledge_base (category, subcategory, title, content, source, priority, tags) VALUES (?, ?, ?, ?, ?, ?, ?)',
                ['Modifications labo', 'Cycle ' + cycle_number,
                 '🔧 Modif C' + cycle_number + ' — ' + (test?.test_number || ''),
                 kbContent,
                 test?.test_number || 'Test ' + req.params.id,
                 3,
                 [mod_wick ? 'mèche' : '', mod_fragrance_pct ? 'parfum' : '', mod_wax_changes ? 'cire' : '', mod_colorant ? 'colorant' : '', test?.fragrance_name || ''].filter(Boolean).join(',')]
            );
        }
        
        res.json({ id: result.lastInsertRowid, has_modifications: !!hasModifications, success: true });
        
        // ═══ AUTO-APPRENTISSAGE PERMANENT — Apprendre de chaque cycle ═══
        // Même sans modification, si des problèmes sont détectés → enrichir la KB
        const hasProblems = (tunneling && tunneling !== 'aucun') || 
                           (mushrooming && mushrooming !== 'aucun') ||
                           (soot_level && soot_level !== 'aucun' && soot_level !== 'none') ||
                           (smoke_level && smoke_level !== 'aucun' && smoke_level !== 'none');
        
        if (hasProblems && !hasModifications) {
            try {
                const test = await db.get(
                    `SELECT bt.test_number, f.code as form_code, f.name as form_name, f.fragrance_name,
                            f.fragrance_percentage, f.wick_reference, f.container_type, f.diameter, f.height
                     FROM burn_tests bt LEFT JOIN formulations f ON bt.formulation_id = f.id
                     WHERE bt.id = ?`, [req.params.id]);
                
                let problems = [];
                if (tunneling && tunneling !== 'aucun') problems.push('Tunnel : ' + tunneling);
                if (mushrooming && mushrooming !== 'aucun') problems.push('Champignonnage : ' + mushrooming);
                if (soot_level && soot_level !== 'aucun' && soot_level !== 'none') problems.push('Suie : ' + soot_level);
                if (smoke_level && smoke_level !== 'aucun' && smoke_level !== 'none') problems.push('Fumée : ' + smoke_level);
                
                let content = 'PROBLÈME DÉTECTÉ — Cycle ' + cycle_number + ' du test ' + (test?.test_number || '');
                content += '\n\nProblèmes observés :\n  ' + problems.join('\n  ');
                content += '\n\nContexte :';
                content += '\n  Formulation : ' + (test?.form_name || '—');
                content += '\n  Type : ' + (test?.container_type || '—') + ' ' + (test?.diameter || '?') + 'x' + (test?.height || '?') + 'mm';
                content += '\n  Parfum : ' + (test?.fragrance_name || '—') + ' ' + (test?.fragrance_percentage || 0) + '%';
                content += '\n  Mèche : ' + (test?.wick_reference || '—');
                content += '\n  Conso cycle : ' + (massConsumed ? massConsumed.toFixed(1) + 'g' : '?');
                if (pool_diameter) content += '\n  Bassin : ' + pool_diameter + 'mm';
                if (scent_throw) content += '\n  Diffusion : ' + scent_throw;
                
                await db.run(
                    'INSERT INTO knowledge_base (category, subcategory, title, content, source, priority, tags) VALUES (?,?,?,?,?,?,?)',
                    ['apprentissage', 'problème_détecté',
                     '⚠️ Problème C' + cycle_number + ' — ' + (test?.test_number || '') + ' — ' + problems[0],
                     content,
                     'Auto-apprentissage test ' + (test?.test_number || ''),
                     4,
                     ['problème', tunneling !== 'aucun' ? 'tunnel' : '', mushrooming !== 'aucun' ? 'champignonnage' : '', 
                      soot_level !== 'none' ? 'suie' : '', test?.fragrance_name || '', test?.container_type || ''].filter(Boolean).join(',')]
                );
            } catch(e) { console.error('Auto-learn problem:', e.message); }
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/burn-tests/:testId/cycles/:cycleId', async (req, res) => {
    try {
        const { start_time, end_time, duration_minutes,
                mass_before, mass_after, pool_diameter, pool_depth, pool_visible, flame_height,
                flame_stability, smoke_level, soot_level, mushrooming,
                tunneling, scent_throw, notes } = req.body;
        
        const massConsumed = (mass_before && mass_after) ? mass_before - mass_after : null;
        
        await db.run(
            `UPDATE burn_cycles SET start_time=?, end_time=?, duration_minutes=?,
                mass_before=?, mass_after=?, mass_consumed=?, pool_diameter=?, pool_depth=?, pool_visible=?, flame_height=?,
                flame_stability=?, smoke_level=?, soot_level=?, mushrooming=?, tunneling=?,
                scent_throw=?, notes=?
             WHERE id=?`,
            [start_time, end_time, duration_minutes,
             mass_before, mass_after, massConsumed, pool_diameter, pool_depth, pool_visible !== undefined ? pool_visible : 1, flame_height,
             flame_stability, smoke_level, soot_level, mushrooming, tunneling,
             scent_throw, notes, req.params.cycleId]
        );
        
        // Recalculer le temps total
        const testId = req.params.testId;
        const cycles = await db.all('SELECT duration_minutes FROM burn_cycles WHERE test_id = ?', [testId]);
        const totalTime = cycles.reduce((sum, c) => sum + (c.duration_minutes || 0), 0);
        await db.run('UPDATE burn_tests SET total_burn_time = ? WHERE id = ?', [totalTime, testId]);
        
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============================================
// ROUTES API - MATIÈRES PREMIÈRES
// ============================================

// --- Cires ---
app.get('/api/waxes', async (req, res) => {
    try {
        const { supplier_id, type, application } = req.query;
        let sql = `SELECT w.*, s.name as supplier_name
                   FROM waxes w
                   LEFT JOIN suppliers s ON w.supplier_id = s.id
                   WHERE w.active = 1`;
        const params = [];
        if (supplier_id) {
            sql += ' AND w.supplier_id = ?';
            params.push(supplier_id);
        }
        if (type) {
            sql += ' AND w.type = ?';
            params.push(type);
        }
        if (application) {
            sql += ' AND w.application LIKE ?';
            params.push(`%${application}%`);
        }
        sql += ' ORDER BY s.name, w.melting_point';
        const rows = await db.all(sql, params);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/waxes/:id', async (req, res) => {
    try {
        const row = await db.get(
            `SELECT w.*, s.name as supplier_name
             FROM waxes w LEFT JOIN suppliers s ON w.supplier_id = s.id
             WHERE w.id = ?`,
            [req.params.id]
        );
        if (!row) return res.status(404).json({ error: 'Cire non trouvée' });
        res.json(row);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/waxes', async (req, res) => {
    try {
        const { supplier_id, reference, name, type, sub_type, category, melting_point,
                congealing_point, congealing_point_min, congealing_point_max,
                penetration, penetration_min, penetration_max,
                oil_content, oil_content_min, oil_content_max,
                saybolt_color_min, saybolt_color_max,
                viscosity, density, fragrance_load_max, packaging,
                application, recommended_use, comments, notes } = req.body;
        
        if (!reference || !name) return res.status(400).json({ error: 'Référence et nom obligatoires' });
        
        const result = await db.run(
            `INSERT INTO waxes (supplier_id, reference, name, type, sub_type, category, melting_point,
                congealing_point, congealing_point_min, congealing_point_max,
                penetration, penetration_min, penetration_max,
                oil_content, oil_content_min, oil_content_max,
                saybolt_color_min, saybolt_color_max,
                viscosity, density, fragrance_load_max, packaging,
                application, recommended_use, comments, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [supplier_id, reference, name, type, sub_type, category, melting_point,
             congealing_point, congealing_point_min, congealing_point_max,
             penetration, penetration_min, penetration_max,
             oil_content, oil_content_min, oil_content_max,
             saybolt_color_min, saybolt_color_max,
             viscosity, density, fragrance_load_max, packaging,
             application, recommended_use, comments, notes]
        );
        res.json({ id: result.lastInsertRowid, success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/waxes/:id', async (req, res) => {
    try {
        const { supplier_id, reference, name, type, sub_type, category, melting_point,
                congealing_point, congealing_point_min, congealing_point_max,
                penetration, penetration_min, penetration_max,
                oil_content, oil_content_min, oil_content_max,
                saybolt_color_min, saybolt_color_max,
                viscosity, density, fragrance_load_max, packaging,
                application, recommended_use, comments, notes, active } = req.body;
        
        // Build dynamic UPDATE to only set provided fields
        const fields = [];
        const values = [];
        const mapping = {
            supplier_id, reference, name, type, sub_type, category, melting_point,
            congealing_point, congealing_point_min, congealing_point_max,
            penetration, penetration_min, penetration_max,
            oil_content, oil_content_min, oil_content_max,
            saybolt_color_min, saybolt_color_max,
            viscosity, density, fragrance_load_max, packaging,
            application, recommended_use, comments, notes, active
        };
        for (const [key, val] of Object.entries(mapping)) {
            if (val !== undefined) { fields.push(key + '=?'); values.push(val); }
        }
        if (fields.length === 0) return res.json({ success: true });
        values.push(req.params.id);
        
        await db.run(`UPDATE waxes SET ${fields.join(', ')} WHERE id=?`, values);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- Mèches ---
app.get('/api/wicks', async (req, res) => {
    try {
        const { supplier_id, series, wax_type, diameter } = req.query;
        let sql = `SELECT w.*, s.name as supplier_name
                   FROM wicks w
                   LEFT JOIN suppliers s ON w.supplier_id = s.id
                   WHERE w.active = 1`;
        const params = [];
        if (supplier_id) {
            sql += ' AND w.supplier_id = ?';
            params.push(supplier_id);
        }
        if (series) {
            sql += ' AND w.series = ?';
            params.push(series);
        }
        if (wax_type) {
            sql += ' AND w.wax_type = ?';
            params.push(wax_type);
        }
        if (diameter) {
            sql += ' AND w.diameter_min <= ? AND w.diameter_max >= ?';
            params.push(diameter, diameter);
        }
        sql += ' ORDER BY w.series, w.diameter_min';
        const rows = await db.all(sql, params);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/wicks/:id', async (req, res) => {
    try {
        const row = await db.get(
            `SELECT w.*, s.name as supplier_name
             FROM wicks w LEFT JOIN suppliers s ON w.supplier_id = s.id
             WHERE w.id = ?`,
            [req.params.id]
        );
        if (!row) return res.status(404).json({ error: 'Mèche non trouvée' });
        res.json(row);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/wicks', async (req, res) => {
    try {
        const { supplier_id, reference, series, type, core,
                diameter_min, diameter_max, wax_type, application,
                manufacturer_notes, notes } = req.body;
        
        if (!reference) return res.status(400).json({ error: 'Référence obligatoire' });
        
        const result = await db.run(
            `INSERT INTO wicks (supplier_id, reference, series, type, core,
                diameter_min, diameter_max, wax_type, application, manufacturer_notes, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [supplier_id, reference, series, type, core,
             diameter_min, diameter_max, wax_type, application, manufacturer_notes, notes]
        );
        res.json({ id: result.lastInsertRowid, success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/wicks/:id', async (req, res) => {
    try {
        const { supplier_id, reference, series, type, core,
                diameter_min, diameter_max, wax_type, application,
                manufacturer_notes, notes, active } = req.body;
        
        await db.run(
            `UPDATE wicks SET supplier_id=?, reference=?, series=?, type=?, core=?,
                diameter_min=?, diameter_max=?, wax_type=?, application=?,
                manufacturer_notes=?, notes=?, active=?
             WHERE id=?`,
            [supplier_id, reference, series, type, core,
             diameter_min, diameter_max, wax_type, application,
             manufacturer_notes, notes, active, req.params.id]
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- Colorants ---
app.get('/api/colorants', async (req, res) => {
    try {
        const { supplier_id, form, series } = req.query;
        let sql = `SELECT c.*, s.name as supplier_name
                   FROM colorants c
                   LEFT JOIN suppliers s ON c.supplier_id = s.id
                   WHERE c.active = 1`;
        const params = [];
        if (supplier_id) {
            sql += ' AND c.supplier_id = ?';
            params.push(supplier_id);
        }
        if (form) {
            sql += ' AND c.form = ?';
            params.push(form);
        }
        if (series) {
            sql += ' AND c.series = ?';
            params.push(series);
        }
        sql += ' ORDER BY c.series, c.name';
        const rows = await db.all(sql, params);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/colorants/:id', async (req, res) => {
    try {
        const row = await db.get(
            `SELECT c.*, s.name as supplier_name
             FROM colorants c LEFT JOIN suppliers s ON c.supplier_id = s.id
             WHERE c.id = ?`,
            [req.params.id]
        );
        if (!row) return res.status(404).json({ error: 'Colorant non trouvé' });
        res.json(row);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/colorants', async (req, res) => {
    try {
        const { supplier_id, reference, name, short_name, form, series,
                color_hex, color_rgb_r, color_rgb_g, color_rgb_b,
                density, viscosity, flash_point, congealing_point,
                hazard_h315, hazard_h317, hazard_h319,
                dosage_recommended, dosage_max, notes } = req.body;
        
        if (!reference || !name) return res.status(400).json({ error: 'Référence et nom obligatoires' });
        
        const result = await db.run(
            `INSERT INTO colorants (supplier_id, reference, name, short_name, form, series,
                color_hex, color_rgb_r, color_rgb_g, color_rgb_b,
                density, viscosity, flash_point, congealing_point,
                hazard_h315, hazard_h317, hazard_h319,
                dosage_recommended, dosage_max, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [supplier_id, reference, name, short_name, form, series,
             color_hex, color_rgb_r, color_rgb_g, color_rgb_b,
             density, viscosity, flash_point, congealing_point,
             hazard_h315 || 0, hazard_h317 || 0, hazard_h319 || 0,
             dosage_recommended || 0.2, dosage_max || 0.25, notes]
        );
        res.json({ id: result.lastInsertRowid, success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/colorants/:id', async (req, res) => {
    try {
        const { supplier_id, reference, name, short_name, form, series,
                color_hex, color_rgb_r, color_rgb_g, color_rgb_b,
                density, viscosity, flash_point, congealing_point,
                hazard_h315, hazard_h317, hazard_h319,
                dosage_recommended, dosage_max, notes, active } = req.body;
        
        await db.run(
            `UPDATE colorants SET supplier_id=?, reference=?, name=?, short_name=?, form=?, series=?,
                color_hex=?, color_rgb_r=?, color_rgb_g=?, color_rgb_b=?,
                density=?, viscosity=?, flash_point=?, congealing_point=?,
                hazard_h315=?, hazard_h317=?, hazard_h319=?,
                dosage_recommended=?, dosage_max=?, notes=?, active=?
             WHERE id=?`,
            [supplier_id, reference, name, short_name, form, series,
             color_hex, color_rgb_r, color_rgb_g, color_rgb_b,
             density, viscosity, flash_point, congealing_point,
             hazard_h315, hazard_h317, hazard_h319,
             dosage_recommended, dosage_max, notes, active, req.params.id]
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- Parfums ---
app.get('/api/fragrances', async (req, res) => {
    try {
        const { supplier_id, family } = req.query;
        let sql = `SELECT f.*, s.name as supplier_name
                   FROM fragrances f
                   LEFT JOIN suppliers s ON f.supplier_id = s.id
                   WHERE f.active = 1`;
        const params = [];
        if (supplier_id) {
            sql += ' AND f.supplier_id = ?';
            params.push(supplier_id);
        }
        if (family) {
            sql += ' AND f.family = ?';
            params.push(family);
        }
        sql += ' ORDER BY f.name';
        const rows = await db.all(sql, params);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Export complet fragrances + components → JSON (AVANT :id pour éviter conflit Express)
// GET /api/fragrances/duplicates — Détecter les doublons parfums
// GET /api/fragrances/no-components — Parfums sans composants CAS
app.get('/api/fragrances/no-components', async (req, res) => {
    try {
        const frags = await db.all(`SELECT f.id, f.name, f.reference, f.flash_point, s.name as supplier
            FROM fragrances f LEFT JOIN suppliers s ON f.supplier_id=s.id
            WHERE f.id NOT IN (SELECT DISTINCT fragrance_id FROM fragrance_components)
            ORDER BY COALESCE(s.name,'zzz'), f.name`);
        res.json({ count: frags.length, fragrances: frags });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/fragrances/purge-all — Purger TOUS les parfums et composants (rebuild propre)
app.post('/api/fragrances/purge-all', async (req, res) => {
    try {
        const countF = await db.get('SELECT COUNT(*) as n FROM fragrances');
        const countC = await db.get('SELECT COUNT(*) as n FROM fragrance_components');
        await db.run('DELETE FROM fragrance_components');
        await db.run('DELETE FROM fragrances');
        await db.run('DELETE FROM fragrance_analyses');
        
        // Vider fds/done pour permettre un re-scan complet
        const donePath = path.join(DATA_DIR, 'fds', 'done');
        let doneCount = 0;
        if (fs.existsSync(donePath)) {
            const files = fs.readdirSync(donePath).filter(f => f.endsWith('.pdf'));
            for (const f of files) { fs.unlinkSync(path.join(donePath, f)); doneCount++; }
        }
        // Vider aussi derniere-extraction.json
        const extractPath = path.join(DATA_DIR, 'fds', 'derniere-extraction.json');
        if (fs.existsSync(extractPath)) fs.unlinkSync(extractPath);
        
        console.log(`  🗑️ Purge complète: ${countF.n} parfums + ${countC.n} composants + ${doneCount} PDF done supprimés`);
        res.json({ success: true, deleted_fragrances: countF.n, deleted_components: countC.n, deleted_pdfs: doneCount });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/fragrances/bulk-delete — Supprimer des parfums en masse
app.post('/api/fragrances/bulk-delete', async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'ids requis' });
        let deleted = 0;
        for (const id of ids) {
            // Vérifier qu'il n'est utilisé dans aucune formulation
            let used = { c: 0 };
            try { used = await db.get('SELECT COUNT(*) as c FROM formulations WHERE fragrance_name IN (SELECT name FROM fragrances WHERE id = ?)', [id]) || { c: 0 }; } catch(e) { /* table might not exist */ }
            if (used && used.c > 0) continue; // skip si utilisé
            await db.run('DELETE FROM fragrance_components WHERE fragrance_id = ?', [id]);
            await db.run('DELETE FROM fragrances WHERE id = ?', [id]);
            deleted++;
        }
        res.json({ success: true, deleted, skipped_in_use: ids.length - deleted });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/fragrances/duplicates', async (req, res) => {
            try {
                const frags = await db.all(`SELECT f.id, f.name, f.reference, f.flash_point, s.name as supplier,
                    (SELECT COUNT(*) FROM fragrance_components WHERE fragrance_id=f.id) as ncomp
                    FROM fragrances f LEFT JOIN suppliers s ON f.supplier_id=s.id ORDER BY UPPER(f.name)`);
                
                const stripRef = s => s.toUpperCase()
                    .replace(/\s+[GR]\s*\d{2,3}\s*\d{4,}/g, '')
                    .replace(/\s+\d{7,}/g, '')
                    .replace(/\s+[GR]\s*\d+\s*\/\d+/g, '')
                    .replace(/\s+SA$/i, '')
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^A-Z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
                
                const groups = {};
                for (const f of frags) {
                    const key = stripRef(f.name || '');
                    if (!groups[key]) groups[key] = [];
                    groups[key].push(f);
                }
                
                const duplicates = Object.entries(groups)
                    .filter(([,g]) => g.length > 1)
                    .map(([key, group]) => ({ key, items: group }));
                
                res.json({ total_fragrances: frags.length, duplicate_groups: duplicates.length, duplicates });
            } catch(e) { res.status(500).json({ error: e.message }); }
        });
        
// POST /api/fragrances/merge-duplicates — Fusionner automatiquement les doublons
app.post('/api/fragrances/merge-duplicates', async (req, res) => {
            try {
                const frags = await db.all(`SELECT f.id, f.name, f.reference, f.flash_point, s.name as supplier,
                    (SELECT COUNT(*) FROM fragrance_components WHERE fragrance_id=f.id) as ncomp
                    FROM fragrances f LEFT JOIN suppliers s ON f.supplier_id=s.id`);
                
                const stripRef = s => s.toUpperCase()
                    .replace(/\s+[GR]\s*\d{2,3}\s*\d{4,}/g, '')
                    .replace(/\s+\d{7,}/g, '')
                    .replace(/\s+[GR]\s*\d+\s*\/\d+/g, '')
                    .replace(/\s+SA$/i, '')
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^A-Z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
                
                const groups = {};
                for (const f of frags) {
                    const key = stripRef(f.name || '');
                    if (!groups[key]) groups[key] = [];
                    groups[key].push(f);
                }
                
                let merged = 0, deleted = 0;
                for (const [, group] of Object.entries(groups)) {
                    if (group.length <= 1) continue;
                    
            // Garder celui qui a le plus de composants, sinon le plus court nom (original Excel)
                    group.sort((a, b) => {
                        if (b.ncomp !== a.ncomp) return b.ncomp - a.ncomp;
                        return (a.name||'').length - (b.name||'').length;
                    });
                    const keeper = group[0];
                    
                    for (let i = 1; i < group.length; i++) {
                        const dup = group[i];
                // Transférer composants si keeper n'en a pas
                        if (keeper.ncomp === 0 && dup.ncomp > 0) {
                            await db.run('UPDATE fragrance_components SET fragrance_id = ? WHERE fragrance_id = ?', [keeper.id, dup.id]);
                            keeper.ncomp = dup.ncomp;
                        }
                // Transférer flash_point si absent
                        if (!keeper.flash_point && dup.flash_point) {
                            await db.run('UPDATE fragrances SET flash_point = ? WHERE id = ?', [dup.flash_point, keeper.id]);
                        }
                // Transférer reference si absent
                        if (!keeper.reference && dup.reference) {
                            await db.run('UPDATE fragrances SET reference = ? WHERE id = ?', [dup.reference, keeper.id]);
                        }
                // Supprimer le doublon (composants d'abord)
                        await db.run('DELETE FROM fragrance_components WHERE fragrance_id = ?', [dup.id]);
                        await db.run('DELETE FROM fragrances WHERE id = ?', [dup.id]);
                        deleted++;
                    }
                    merged++;
                }
                
                res.json({ success: true, groups_merged: merged, duplicates_deleted: deleted });
                console.log(`  ✓ Fusion doublons: ${merged} groupes fusionnés, ${deleted} doublons supprimés`);
            } catch(e) { res.status(500).json({ error: e.message }); }
        });


app.get('/api/fragrances/export/full', async (req, res) => {
    try {
        const fragrances = await db.all(`
            SELECT f.*, s.name as supplier_name 
            FROM fragrances f LEFT JOIN suppliers s ON f.supplier_id = s.id
        `);
        for (const f of fragrances) {
            f.components = await db.all(
                'SELECT * FROM fragrance_components WHERE fragrance_id = ?', [f.id]
            );
            f.analyses = await db.all(
                'SELECT * FROM fragrance_analyses WHERE fragrance_id = ?', [f.id]
            );
        }
        res.json({
            export_type: 'fragrances_full',
            version: '5.28.0',
            exported_at: new Date().toISOString(),
            count: fragrances.length,
            count_with_components: fragrances.filter(f => f.components.length > 0).length,
            total_components: fragrances.reduce((s, f) => s + f.components.length, 0),
            fragrances
        });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/fragrances/:id', async (req, res) => {
    try {
        const row = await db.get(
            `SELECT f.*, s.name as supplier_name
             FROM fragrances f LEFT JOIN suppliers s ON f.supplier_id = s.id
             WHERE f.id = ?`,
            [req.params.id]
        );
        if (!row) return res.status(404).json({ error: 'Parfum non trouvé' });
        res.json(row);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/fragrances', async (req, res) => {
    try {
        const { supplier_id, reference, name, family, top_notes, heart_notes,
                base_notes, ifra_max, flash_point, recommended_percentage, notes } = req.body;
        
        if (!name) return res.status(400).json({ error: 'Le nom est obligatoire' });
        
        const result = await db.run(
            `INSERT INTO fragrances (supplier_id, reference, name, family, top_notes, heart_notes,
                base_notes, ifra_max, flash_point, recommended_percentage, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [supplier_id, reference, name, family, top_notes, heart_notes,
             base_notes, ifra_max, flash_point, recommended_percentage, notes]
        );
        res.json({ id: result.lastInsertRowid, success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/fragrances/:id', async (req, res) => {
    try {
        const { supplier_id, reference, name, family, top_notes, heart_notes,
                base_notes, ifra_max, flash_point, recommended_percentage, notes, active } = req.body;
        
        await db.run(
            `UPDATE fragrances SET supplier_id=?, reference=?, name=?, family=?, top_notes=?,
                heart_notes=?, base_notes=?, ifra_max=?, flash_point=?,
                recommended_percentage=?, notes=?, active=?
             WHERE id=?`,
            [supplier_id, reference, name, family, top_notes, heart_notes,
             base_notes, ifra_max, flash_point, recommended_percentage, notes, active, req.params.id]
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============================================
// ============================================
// ROUTES API - RECETTES MFC
// ============================================

// Liste toutes les recettes
app.get('/api/recipes', async (req, res) => {
    try {
        const type = req.query.type;
        let sql = 'SELECT * FROM recipes WHERE 1=1';
        const params = [];
        if (type) { sql += ' AND candle_type = ?'; params.push(type); }
        sql += ' ORDER BY candle_type, name';
        const recipes = await db.all(sql, params);
// Add wax composition
        for (const r of recipes) {
            r.waxes = await db.all(
                `SELECT rw.*, w.reference, w.name as wax_full_name, w.type as wax_type, w.congealing_point_min, w.congealing_point_max
                 FROM recipe_waxes rw LEFT JOIN waxes w ON rw.wax_id = w.id
                 WHERE rw.recipe_id = ?`, [r.id]);
    // Count formulations using this recipe
            r.usage_count = (await db.get('SELECT COUNT(*) as c FROM formulations WHERE recipe_id = ?', [r.id]))?.c || 0;
            r.colorants = await db.all(
                `SELECT rc.*, c.name as colorant_full_name, c.reference as colorant_ref, c.series, c.form
                 FROM recipe_colorants rc LEFT JOIN colorants c ON rc.colorant_id = c.id
                 WHERE rc.recipe_id = ?`, [r.id]);
            r.wicks_tested = await db.all(
                `SELECT rw2.*, w.reference as wick_ref_full, w.series, w.meters_per_kg, w.chemical_treatment, w.type as wick_type
                 FROM recipe_wicks rw2 LEFT JOIN wicks w ON rw2.wick_id = w.id
                 WHERE rw2.recipe_id = ?`, [r.id]);
        }
        res.json(recipes);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Détail d'une recette
app.get('/api/recipes/:id', async (req, res) => {
    try {
        const recipe = await db.get('SELECT * FROM recipes WHERE id = ?', [req.params.id]);
        if (!recipe) return res.status(404).json({ error: 'Recette non trouvée' });
        recipe.waxes = await db.all(
            `SELECT rw.*, w.reference, w.name as wax_full_name, w.type as wax_type
             FROM recipe_waxes rw LEFT JOIN waxes w ON rw.wax_id = w.id
             WHERE rw.recipe_id = ?`, [req.params.id]);
        recipe.colorants = await db.all(
            `SELECT rc.*, c.name as colorant_full_name, c.reference as colorant_ref, c.series, c.form
             FROM recipe_colorants rc LEFT JOIN colorants c ON rc.colorant_id = c.id
             WHERE rc.recipe_id = ?`, [req.params.id]);
        recipe.wicks_tested = await db.all(
            `SELECT rw2.*, w.reference as wick_ref_full, w.series, w.meters_per_kg, w.chemical_treatment
             FROM recipe_wicks rw2 LEFT JOIN wicks w ON rw2.wick_id = w.id
             WHERE rw2.recipe_id = ?`, [req.params.id]);
// Get formulations that used this recipe
        recipe.formulations = await db.all(
            `SELECT f.id, f.code, f.name, f.diameter, f.height, f.fragrance_name, f.fragrance_percentage,
                    bt.client_status, bt.client_feedback, bt.test_number
             FROM formulations f
             LEFT JOIN burn_tests bt ON bt.formulation_id = f.id
             WHERE f.recipe_id = ?
             ORDER BY f.id DESC LIMIT 20`, [req.params.id]);
        res.json(recipe);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Créer une recette
app.post('/api/recipes', async (req, res) => {
    try {
        const { name, code, candle_type, description, diameter_min, diameter_max, height_min, height_max,
                fragrance_pct_min, fragrance_pct_max, fragrance_pct_default, colorant_pct,
                wick_series, wick_size_guide, pour_temp_min, pour_temp_max, cure_hours,
                empirical_notes, known_variants, pitfalls, best_for, waxes, colorants, wicks_tested } = req.body;
        
        const result = await db.run(
            `INSERT INTO recipes (name, code, candle_type, description, diameter_min, diameter_max, height_min, height_max,
             fragrance_pct_min, fragrance_pct_max, fragrance_pct_default, colorant_pct,
             wick_series, wick_size_guide, pour_temp_min, pour_temp_max, cure_hours,
             empirical_notes, known_variants, pitfalls, best_for)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [name, code, candle_type, description, diameter_min, diameter_max, height_min, height_max,
             fragrance_pct_min, fragrance_pct_max, fragrance_pct_default, colorant_pct || 0,
             wick_series, wick_size_guide, pour_temp_min, pour_temp_max, cure_hours || 72,
             empirical_notes, known_variants, pitfalls, best_for]
        );
        
// Insert wax composition
        if (waxes && waxes.length) {
            for (const w of waxes) {
                await db.run('INSERT INTO recipe_waxes (recipe_id, wax_id, wax_name, percentage, role) VALUES (?,?,?,?,?)',
                    [result.lastInsertRowid, w.wax_id || null, w.wax_name || null, w.percentage, w.role || null]);
            }
        }
        
// Insert colorants
        if (colorants && colorants.length) {
            for (const c of colorants) {
                await db.run('INSERT INTO recipe_colorants (recipe_id, colorant_id, colorant_name, percentage, notes) VALUES (?,?,?,?,?)',
                    [result.lastInsertRowid, c.colorant_id || null, c.colorant_name || null, c.percentage || 0, c.notes || null]);
            }
        }
        
// Insert wicks tested
        if (wicks_tested && wicks_tested.length) {
            for (const wt of wicks_tested) {
                await db.run('INSERT INTO recipe_wicks (recipe_id, wick_id, wick_reference, diameter_min, diameter_max, status, notes) VALUES (?,?,?,?,?,?,?)',
                    [result.lastInsertRowid, wt.wick_id || null, wt.wick_reference || null, wt.diameter_min || null, wt.diameter_max || null, wt.status || 'recommandée', wt.notes || null]);
            }
        }
        
// Auto-add to knowledge base
        let kbContent = 'Recette MFC : ' + name + '\nType : ' + candle_type;
        if (description) kbContent += '\n' + description;
        if (waxes && waxes.length) kbContent += '\nComposition : ' + waxes.map(w => (w.wax_name || 'Cire') + ' ' + w.percentage + '%' + (w.role ? ' (' + w.role + ')' : '')).join(', ');
        if (diameter_min && diameter_max) kbContent += '\nDiamètre : ' + diameter_min + '-' + diameter_max + 'mm';
        if (fragrance_pct_default) kbContent += '\nParfum : ' + fragrance_pct_min + '-' + fragrance_pct_max + '% (défaut ' + fragrance_pct_default + '%)';
        if (wick_series) kbContent += '\nMèche : série ' + wick_series + (wick_size_guide ? ' — ' + wick_size_guide : '');
        if (empirical_notes) kbContent += '\n\nSAVOIR EMPIRIQUE :\n' + empirical_notes;
        if (known_variants) kbContent += '\n\nVARIANTES CONNUES :\n' + known_variants;
        if (pitfalls) kbContent += '\n\nPIÈGES À ÉVITER :\n' + pitfalls;
        
        await db.run(
            'INSERT INTO knowledge_base (category, subcategory, title, content, source, priority, tags) VALUES (?,?,?,?,?,?,?)',
            ['Recettes MFC', candle_type, '📋 ' + name, kbContent, 'Recette ' + (code || name), 1,
             ['recette', candle_type, wick_series, best_for].filter(Boolean).join(',')]
        );
        
        res.json({ id: result.lastInsertRowid, success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Modifier une recette
app.put('/api/recipes/:id', async (req, res) => {
    try {
        const { name, code, candle_type, description, diameter_min, diameter_max, height_min, height_max,
                fragrance_pct_min, fragrance_pct_max, fragrance_pct_default, colorant_pct,
                wick_series, wick_size_guide, pour_temp_min, pour_temp_max, cure_hours,
                empirical_notes, known_variants, pitfalls, best_for, waxes, colorants, wicks_tested } = req.body;
        
        await db.run(
            `UPDATE recipes SET name=?, code=?, candle_type=?, description=?, diameter_min=?, diameter_max=?,
             height_min=?, height_max=?, fragrance_pct_min=?, fragrance_pct_max=?, fragrance_pct_default=?, colorant_pct=?,
             wick_series=?, wick_size_guide=?, pour_temp_min=?, pour_temp_max=?, cure_hours=?,
             empirical_notes=?, known_variants=?, pitfalls=?, best_for=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
            [name, code, candle_type, description, diameter_min, diameter_max, height_min, height_max,
             fragrance_pct_min, fragrance_pct_max, fragrance_pct_default, colorant_pct,
             wick_series, wick_size_guide, pour_temp_min, pour_temp_max, cure_hours,
             empirical_notes, known_variants, pitfalls, best_for, req.params.id]
        );
        
// Replace wax composition
        if (waxes) {
            await db.run('DELETE FROM recipe_waxes WHERE recipe_id = ?', [req.params.id]);
            for (const w of waxes) {
                await db.run('INSERT INTO recipe_waxes (recipe_id, wax_id, wax_name, percentage, role) VALUES (?,?,?,?,?)',
                    [req.params.id, w.wax_id || null, w.wax_name || null, w.percentage, w.role || null]);
            }
        }
// Replace colorants
        if (colorants) {
            await db.run('DELETE FROM recipe_colorants WHERE recipe_id = ?', [req.params.id]);
            for (const c of colorants) {
                await db.run('INSERT INTO recipe_colorants (recipe_id, colorant_id, colorant_name, percentage, notes) VALUES (?,?,?,?,?)',
                    [req.params.id, c.colorant_id || null, c.colorant_name || null, c.percentage || 0, c.notes || null]);
            }
        }
// Replace wicks tested
        if (wicks_tested) {
            await db.run('DELETE FROM recipe_wicks WHERE recipe_id = ?', [req.params.id]);
            for (const wt of wicks_tested) {
                await db.run('INSERT INTO recipe_wicks (recipe_id, wick_id, wick_reference, diameter_min, diameter_max, status, notes) VALUES (?,?,?,?,?,?,?)',
                    [req.params.id, wt.wick_id || null, wt.wick_reference || null, wt.diameter_min || null, wt.diameter_max || null, wt.status || 'recommandée', wt.notes || null]);
            }
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Supprimer une recette
app.delete('/api/recipes/:id', async (req, res) => {
    try {
        await db.run('DELETE FROM recipe_waxes WHERE recipe_id = ?', [req.params.id]);
        await db.run('DELETE FROM recipe_colorants WHERE recipe_id = ?', [req.params.id]);
        await db.run('DELETE FROM recipe_wicks WHERE recipe_id = ?', [req.params.id]);
        await db.run('DELETE FROM recipes WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Recommander une recette pour un contexte donné
app.post('/api/recipes/recommend', async (req, res) => {
    try {
        const { candle_type, diameter, height, fragrance_family } = req.body;
        const recipes = await db.all('SELECT * FROM recipes WHERE active = 1');
        
        const scored = recipes.map(r => {
            let score = 0;
    // Type match
            if (candle_type && r.candle_type === candle_type) score += 30;
            else if (candle_type) score -= 20;
    // Diameter match
            if (diameter) {
                if (r.diameter_min && r.diameter_max && diameter >= r.diameter_min && diameter <= r.diameter_max) score += 25;
                else if (r.diameter_min && r.diameter_max) {
                    const dist = Math.min(Math.abs(diameter - r.diameter_min), Math.abs(diameter - r.diameter_max));
                    score -= Math.min(20, dist);
                }
            }
    // Height match
            if (height && r.height_min && r.height_max) {
                if (height >= r.height_min && height <= r.height_max) score += 10;
            }
    // Fragrance family match in best_for/empirical_notes
            if (fragrance_family && r.empirical_notes) {
                if (r.empirical_notes.toLowerCase().includes(fragrance_family.toLowerCase())) score += 15;
                if ((r.best_for || '').toLowerCase().includes(fragrance_family.toLowerCase())) score += 10;
            }
    // Bonus for usage count
            score += Math.min(10, (r.success_count || 0) * 2);
            return { ...r, score };
        }).filter(r => r.score > 0).sort((a, b) => b.score - a.score);
        
// Add waxes to top results
        for (const r of scored.slice(0, 5)) {
            r.waxes = await db.all(
                `SELECT rw.*, w.reference FROM recipe_waxes rw LEFT JOIN waxes w ON rw.wax_id = w.id WHERE rw.recipe_id = ?`, [r.id]);
        }
        
        res.json(scored.slice(0, 5));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ROUTES API - BASE DE CONNAISSANCES
// ============================================
app.get('/api/knowledge', async (req, res) => {
    try {
        const { category, subcategory } = req.query;
        let sql = 'SELECT * FROM knowledge_base WHERE 1=1';
        const params = [];
        if (category) {
            sql += ' AND category = ?';
            params.push(category);
        }
        if (subcategory) {
            sql += ' AND subcategory = ?';
            params.push(subcategory);
        }
        sql += ' ORDER BY priority, title';
        const rows = await db.all(sql, params);
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Export KB as importable JSON (MUST be before /:id route)
app.get('/api/knowledge/export', async (req, res) => {
    try {
        const kb = await db.all('SELECT category, subcategory, title, content, source, priority, tags FROM knowledge_base ORDER BY category, title');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=mfc-kb-export-' + timestamp + '.json');
        res.json({
            format: 'mfc-kb-v1',
            export_date: new Date().toISOString(),
            app_version: APP_VERSION,
            entries_count: kb.length,
            entries: kb
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Import KB from JSON (MUST be before /:id route)
app.post('/api/knowledge/import', express.json({limit: '10mb'}), async (req, res) => {
    try {
        const data = req.body;
        if (!data || !data.entries || !Array.isArray(data.entries)) {
            return res.status(400).json({ error: 'Format invalide. Le JSON doit contenir un tableau "entries".' });
        }
        let imported = 0, skipped = 0, errors = 0;
        const details = [];
        for (const entry of data.entries) {
            try {
                if (!entry.title || !entry.content) {
                    errors++;
                    details.push({ title: entry.title || '(sans titre)', status: 'erreur', reason: 'titre ou contenu manquant' });
                    continue;
                }
                const existing = await db.get('SELECT id FROM knowledge_base WHERE title = ?', [entry.title]);
                if (existing) {
                    skipped++;
                    details.push({ title: entry.title, status: 'ignoré', reason: 'existe déjà' });
                    continue;
                }
                await db.run(
                    'INSERT INTO knowledge_base (category, subcategory, title, content, source, priority, tags) VALUES (?,?,?,?,?,?,?)',
                    [entry.category || 'technique', entry.subcategory || 'général', entry.title, entry.content,
                     entry.source || 'Import JSON', entry.priority || 1, entry.tags || '']
                );
                imported++;
                details.push({ title: entry.title, status: 'importé' });
            } catch (err) {
                errors++;
                details.push({ title: entry.title || '?', status: 'erreur', reason: err.message });
            }
        }
        res.json({ success: true, summary: { total: data.entries.length, imported, skipped, errors }, details });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/knowledge/:id', async (req, res) => {
    try {
        const row = await db.get('SELECT * FROM knowledge_base WHERE id = ?', [req.params.id]);
        if (!row) return res.status(404).json({ error: 'Entrée non trouvée' });
        res.json(row);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/knowledge', async (req, res) => {
    try {
        const { category, subcategory, title, content, source, priority, tags } = req.body;
        if (!category || !title || !content) {
            return res.status(400).json({ error: 'Catégorie, titre et contenu obligatoires' });
        }
        const result = await db.run(
            `INSERT INTO knowledge_base (category, subcategory, title, content, source, priority, tags)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [category, subcategory, title, content, source || 'MFC', priority || 3, tags]
        );
        res.json({ id: result.lastInsertRowid, success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/knowledge/:id', async (req, res) => {
    try {
        const { category, subcategory, title, content, source, priority, tags } = req.body;
        await db.run(
            `UPDATE knowledge_base SET category=?, subcategory=?, title=?, content=?,
                source=?, priority=?, tags=?, updated_at=CURRENT_TIMESTAMP
             WHERE id=?`,
            [category, subcategory, title, content, source, priority, tags, req.params.id]
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/knowledge/:id', async (req, res) => {
    try {
        await db.run('DELETE FROM knowledge_base WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============================================
// ROUTES API - ASSISTANT IA
// ============================================
// ============================================
// ASSISTANT IA — MOTEUR INTELLIGENT
// ============================================

// Recherche intelligente multi-mots avec scoring
app.post('/api/assistant/ask', async (req, res) => {
    try {
        const { question } = req.body;
        if (!question) return res.status(400).json({ error: 'Question obligatoire' });
        
// Split into keywords, ignore short words
        const keywords = question.toLowerCase()
            .replace(/['']/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 2 && !['les','des','une','pour','dans','avec','que','qui','est','sont','par','sur','pas','plus','mais','cette','quel','quelle','comment','pourquoi'].includes(w));
        
// Search knowledge base with scoring
        const allKB = await db.all('SELECT * FROM knowledge_base ORDER BY priority ASC');
        const scored = allKB.map(k => {
            const text = (k.title + ' ' + k.content + ' ' + (k.tags||'') + ' ' + (k.category||'') + ' ' + (k.subcategory||'')).toLowerCase();
            let score = 0;
            keywords.forEach(kw => {
                const count = (text.match(new RegExp(kw, 'g'))||[]).length;
                if (count > 0) score += count * 2;
                if (k.title.toLowerCase().includes(kw)) score += 5; // Title match bonus
                if ((k.tags||'').toLowerCase().includes(kw)) score += 3; // Tag match bonus
            });
            score += (6 - Math.min(k.priority, 5)); // Priority boost
            return { ...k, score };
        }).filter(k => k.score > 0).sort((a,b) => b.score - a.score).slice(0, 8);
        
        res.json({ question, results: scored, keywords, source: 'knowledge_base' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Analyse complète d'un contexte (formulation, test, client)
app.post('/api/assistant/analyze', async (req, res) => {
    try {
        const { context } = req.body; // 'formulation', 'test', 'client', 'global'
        const analysis = {};
        
        if (context === 'global' || context === 'formulation') {
    // Stats formulations
            const forms = await db.all(`SELECT f.*, s.sample_number, c.name as client_name 
                FROM formulations f LEFT JOIN samples s ON f.sample_id = s.id
                LEFT JOIN clients c ON COALESCE(f.client_id, s.client_id) = c.id`);
            const avgFrag = forms.reduce((s,f) => s + (f.fragrance_percentage||0), 0) / (forms.length||1);
            analysis.formulations = {
                total: forms.length,
                avg_fragrance: Math.round(avgFrag * 10) / 10,
                types: [...new Set(forms.map(f=>f.container_type).filter(Boolean))],
            };
        }
        
        if (context === 'global' || context === 'test') {
    // Stats tests with cycles
            const tests = await db.all(`SELECT bt.*, f.name as form_name, f.fragrance_name, f.fragrance_percentage,
                f.container_type, f.diameter, f.height, f.wick_reference as form_wick
                FROM burn_tests bt LEFT JOIN formulations f ON bt.formulation_id = f.id`);
            const finished = tests.filter(t => t.status === 'terminé');
            const validated = tests.filter(t => t.client_status === 'validé');
            const refused = tests.filter(t => t.client_status === 'refusé');
            
    // Best performing tests (validated)
            const validatedDetails = [];
            for (const t of validated) {
                const cycles = await db.all('SELECT * FROM burn_cycles WHERE test_id = ?', [t.id]);
                if (cycles.length) {
                    const avgCons = cycles.reduce((s,c) => s + (c.mass_before - c.mass_after), 0) / cycles.length;
                    validatedDetails.push({ test: t.test_number, form: t.form_name, fragrance: t.fragrance_name, 
                        pct: t.fragrance_percentage, wick: t.form_wick, type: t.container_type,
                        dim: t.diameter + 'x' + t.height, avg_consumption: Math.round(avgCons*10)/10 });
                }
            }
            
            analysis.tests = {
                total: tests.length, finished: finished.length,
                validated: validated.length, refused: refused.length,
                success_rate: finished.length ? Math.round(validated.length / finished.length * 100) : 0,
                validated_details: validatedDetails
            };
        }
        
        if (context === 'global' || context === 'client') {
    // Client feedback analysis
            const feedbacks = await db.all(`SELECT bt.client_status, bt.client_feedback, bt.test_number,
                f.fragrance_name, f.fragrance_percentage, f.container_type, f.wick_reference,
                c.name as client_name
                FROM burn_tests bt LEFT JOIN formulations f ON bt.formulation_id = f.id
                LEFT JOIN samples s ON bt.sample_id = s.id
                LEFT JOIN clients c ON COALESCE(f.client_id, s.client_id) = c.id
                WHERE bt.client_feedback IS NOT NULL AND bt.client_feedback != ''`);
            
    // Keyword extraction from feedbacks
            const words = {};
            feedbacks.forEach(f => {
                f.client_feedback.toLowerCase().split(/\s+/).forEach(w => {
                    if (w.length > 3 && !['dans','avec','pour','plus','mais','trop','bien','très','cette','encore'].includes(w)) 
                        words[w] = (words[w]||0) + 1;
                });
            });
            const topWords = Object.entries(words).sort((a,b) => b[1]-a[1]).slice(0,15);
            
            analysis.feedbacks = {
                total: feedbacks.length,
                validated: feedbacks.filter(f => f.client_status === 'validé').length,
                refused: feedbacks.filter(f => f.client_status === 'refusé').length,
                items: feedbacks,
                top_keywords: topWords
            };
        }
        
// Knowledge base stats
        const kbStats = await db.all('SELECT category, COUNT(*) as count FROM knowledge_base GROUP BY category');
        const rulesCount = await db.get('SELECT COUNT(*) as count FROM learned_rules');
        analysis.knowledge = { categories: kbStats, rules_count: rulesCount.count };
        
        res.json(analysis);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Recommandation de mèche pour un diamètre donné
app.post('/api/assistant/recommend-wick', async (req, res) => {
    try {
        const { diameter, container_type, fragrance_pct } = req.body;
        if (!diameter) return res.status(400).json({ error: 'Diamètre requis' });
        
// 1. Catalog wicks matching diameter
        const wicks = await db.all(
            `SELECT * FROM wicks WHERE active = 1 AND diameter_min <= ? AND diameter_max >= ?
             ORDER BY reference`, [diameter, diameter]);
        
// 2. All tests with similar diameter (±15mm), with cycles
        const tests = await db.all(
            `SELECT bt.*, f.diameter, f.height, f.container_type, f.fragrance_percentage, 
                    f.name as form_name, f.wick_reference as form_wick,
                    c.name as client_name
             FROM burn_tests bt
             LEFT JOIN formulations f ON bt.formulation_id = f.id
             LEFT JOIN samples s ON bt.sample_id = s.id
             LEFT JOIN clients c ON COALESCE(f.client_id, s.client_id) = c.id
             WHERE f.diameter BETWEEN ? AND ? AND bt.status = 'terminé'
             ORDER BY bt.id DESC`, [diameter - 15, diameter + 15]);
        
// 3. Enrich tests with cycle data and compute scores
        const wickScores = {};
        for (const t of tests) {
            const cycles = await db.all('SELECT * FROM burn_cycles WHERE test_id = ?', [t.id]);
            const wick = t.wick_reference || t.form_wick;
            if (!wick || !cycles.length) continue;
            
            const avgCons = cycles.reduce((s,c) => s + ((c.mass_before||0) - (c.mass_after||0)), 0) / cycles.length;
            const tunnelCycles = cycles.filter(c => c.tunneling && c.tunneling !== 'aucun' && c.tunneling !== 'none').length;
            const mushCycles = cycles.filter(c => c.mushrooming && c.mushrooming !== 'aucun' && c.mushrooming !== 'none').length;
            const scentScores = cycles.map(c => c.scent_throw).filter(Boolean);
            
            if (!wickScores[wick]) wickScores[wick] = { wick, tests: [], totalScore: 0 };
            
            let score = 50; // base
            if (t.client_status === 'validé') score += 40;
            else if (t.client_status === 'refusé') score -= 30;
            if (Math.abs(t.diameter - diameter) <= 5) score += 10; // exact diameter match
            if (tunnelCycles === 0) score += 15; else score -= tunnelCycles * 10;
            if (mushCycles === 0) score += 10; else score -= mushCycles * 5;
            
            wickScores[wick].tests.push({
                test_number: t.test_number, client: t.client_name, status: t.client_status,
                diameter: t.diameter, fragrance_pct: t.fragrance_percentage,
                avg_consumption: Math.round(avgCons * 10) / 10,
                tunnel: tunnelCycles + '/' + cycles.length,
                mushroom: mushCycles + '/' + cycles.length,
                feedback: t.client_feedback, score
            });
            wickScores[wick].totalScore += score;
        }
        
// Sort recommendations by score
        const recommendations = Object.values(wickScores)
            .map(w => ({ ...w, avgScore: Math.round(w.totalScore / w.tests.length) }))
            .sort((a, b) => b.avgScore - a.avgScore);
        
// 4. Knowledge base consumption reference
        const consRef = await db.get("SELECT content FROM knowledge_base WHERE title LIKE '%Consommation normale%' LIMIT 1");
        
// 5. Knowledge tips
        const tips = await db.all("SELECT title, content FROM knowledge_base WHERE (tags LIKE '%mèche%' OR tags LIKE '%diamètre%') AND priority <= 2 ORDER BY priority LIMIT 3");
        
        res.json({
            diameter, container_type,
            catalog_wicks: wicks,
            recommendations,
            consumption_reference: consRef?.content || null,
            tips
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Recommandation de formulation
app.post('/api/assistant/recommend-formulation', async (req, res) => {
    try {
        const { candle_type, diameter, height, fragrance_family } = req.body;
        
// Find similar validated formulations
        const similar = await db.all(
            `SELECT f.*, bt.client_status, bt.client_feedback, bt.test_number,
                    c.name as client_name, s.sample_number
             FROM formulations f
             LEFT JOIN burn_tests bt ON bt.formulation_id = f.id
             LEFT JOIN samples s ON f.sample_id = s.id
             LEFT JOIN clients c ON COALESCE(f.client_id, s.client_id) = c.id
             WHERE (f.container_type = ? OR ? IS NULL)
             AND (f.diameter BETWEEN ? AND ? OR ? IS NULL)
             ORDER BY CASE WHEN bt.client_status='validé' THEN 0 WHEN bt.client_status='refusé' THEN 2 ELSE 1 END
             LIMIT 10`,
            [candle_type, candle_type, (diameter||0)-15, (diameter||0)+15, diameter]
        );
        
// Get wax composition of successful formulations
        for (const f of similar) {
            f.waxes = await db.all(
                `SELECT fw.*, w.reference, w.name as wax_name, w.category, w.congealing_point
                 FROM formulation_waxes fw LEFT JOIN waxes w ON fw.wax_id = w.id
                 WHERE fw.formulation_id = ?`, [f.id]);
        }
        
// Knowledge base
        const kb = await db.all("SELECT * FROM knowledge_base WHERE content LIKE '%formul%' OR category = 'Retours clients' ORDER BY priority LIMIT 5");
        
        res.json({ parameters: { candle_type, diameter, height, fragrance_family }, similar_formulations: similar, knowledge: kb });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Auto-learn : extraire des règles des tests validés
app.post('/api/assistant/auto-learn', async (req, res) => {
    try {
// Get all validated tests with their formulations
        const validated = await db.all(
            `SELECT bt.*, f.code as form_code, f.name as form_name, f.container_type, 
                    f.diameter, f.height, f.fragrance_name, f.fragrance_percentage, f.wick_reference
             FROM burn_tests bt
             LEFT JOIN formulations f ON bt.formulation_id = f.id
             WHERE bt.client_status = 'validé'`
        );
        
        let rulesCreated = 0;
        for (const t of validated) {
    // Check if rule already exists for this test
            const existing = await db.get('SELECT id FROM learned_rules WHERE source_test_id = ?', [t.id]);
            if (existing) continue;
            
    // Create rule from validated test
            const cycles = await db.all('SELECT * FROM burn_cycles WHERE test_id = ?', [t.id]);
            const avgCons = cycles.length ? cycles.reduce((s,c) => s + (c.mass_before - c.mass_after), 0) / cycles.length : 0;
            
            const condition = JSON.stringify({
                container_type: t.container_type, diameter: t.diameter, height: t.height,
                fragrance_name: t.fragrance_name, fragrance_percentage: t.fragrance_percentage
            });
            const recommendation = JSON.stringify({
                wick: t.wick_reference, avg_consumption: Math.round(avgCons*10)/10,
                form_name: t.form_name, test_number: t.test_number,
                client_feedback: t.client_feedback
            });
            
            await db.run(
                `INSERT INTO learned_rules (rule_type, condition, recommendation, confidence, success_count, source_formulation_id, source_test_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                ['validated_combination', condition, recommendation, 0.9, 1, t.formulation_id, t.id]
            );
            rulesCreated++;
        }
        
// Also create rules from refused tests (what NOT to do)
        const refused = await db.all(
            `SELECT bt.*, f.code as form_code, f.container_type, f.diameter, f.fragrance_name, f.fragrance_percentage, f.wick_reference
             FROM burn_tests bt LEFT JOIN formulations f ON bt.formulation_id = f.id
             WHERE bt.client_status = 'refusé'`
        );
        for (const t of refused) {
            const existing = await db.get('SELECT id FROM learned_rules WHERE source_test_id = ? AND rule_type = ?', [t.id, 'refused_combination']);
            if (existing) continue;
            
            const condition = JSON.stringify({
                container_type: t.container_type, diameter: t.diameter,
                fragrance_name: t.fragrance_name, fragrance_percentage: t.fragrance_percentage
            });
            await db.run(
                `INSERT INTO learned_rules (rule_type, condition, recommendation, confidence, failure_count, source_test_id)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                ['refused_combination', condition, JSON.stringify({ reason: t.client_feedback, wick: t.wick_reference }), 0.1, 1, t.id]
            );
            rulesCreated++;
        }
        
        const totalRules = await db.get('SELECT COUNT(*) as count FROM learned_rules');
        res.json({ rules_created: rulesCreated, total_rules: totalRules.count, success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// [SUPPRIMÉ fix5] Route dupliquée /api/assistant/recommend — la version riche (L823) est active

app.post('/api/assistant/learn', async (req, res) => {
    try {
        const { rule_type, condition, recommendation, source_formulation_id, source_test_id } = req.body;
        if (!rule_type || !condition || !recommendation) {
            return res.status(400).json({ error: 'Type, condition et recommandation obligatoires' });
        }
        const result = await db.run(
            `INSERT INTO learned_rules (rule_type, condition, recommendation, source_formulation_id, source_test_id) VALUES (?, ?, ?, ?, ?)`,
            [rule_type, condition, recommendation, source_formulation_id, source_test_id]
        );
        res.json({ id: result.lastInsertRowid, success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================
// STATISTIQUES
// ============================================
// Status / diagnostic
app.get('/api/status', (req, res) => {
    const os = require('os');
    const nets = os.networkInterfaces();
    const ips = [];
    for (const [name, iface] of Object.entries(nets)) {
        for (const net of iface) {
            if (net.family === 'IPv4') ips.push({ interface: name, ip: net.address, internal: net.internal });
        }
    }
    res.json({
        app: 'MFC Laboratoire',
        version: APP_VERSION,
        build: APP_BUILD,
        features: APP_FEATURES,
        uptime: Math.round(process.uptime()) + 's',
        port: PORT,
        ips,
        access_urls: ips.filter(i => !i.internal).map(i => 'http://' + i.ip + ':' + PORT),
        localhost: 'http://localhost:' + PORT,
        node: process.version,
        platform: os.platform(),
        memory: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB'
    });
});

app.get('/api/stats', async (req, res) => {
    try {
        const samples = await db.get('SELECT COUNT(*) as count FROM samples');
        const formulations = await db.get('SELECT COUNT(*) as count FROM formulations');
        const tests = await db.get('SELECT COUNT(*) as count FROM burn_tests');
        const clients = await db.get('SELECT COUNT(*) as count FROM clients');
        const waxes = await db.get('SELECT COUNT(*) as count FROM waxes WHERE active = 1');
        const wicks = await db.get('SELECT COUNT(*) as count FROM wicks WHERE active = 1');
        const colorants = await db.get('SELECT COUNT(*) as count FROM colorants WHERE active = 1');
        const recipes = await db.get('SELECT COUNT(*) as count FROM recipes WHERE active = 1');
        const knowledge = await db.get('SELECT COUNT(*) as count FROM knowledge_base');
        
        res.json({
            samples: samples?.count || 0,
            formulations: formulations?.count || 0,
            tests: tests?.count || 0,
            clients: clients?.count || 0,
            waxes: waxes?.count || 0,
            wicks: wicks?.count || 0,
            colorants: colorants?.count || 0,
            recipes: recipes?.count || 0,
            knowledge: knowledge?.count || 0
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============================================
// DASHBOARD — Stats avancées (DÉSACTIVÉ v5.44.12c — doublon avec route R&D ligne ~6193)
// ============================================
/* ROUTE SUPPRIMÉE — la route R&D complète inclut waxes/fragrances/wicks/molecules
app.get('/api/dashboard', async (req, res) => {
    try {
// ── Compteurs généraux ──
        const counts = {
            samples: (await db.get('SELECT COUNT(*) as c FROM samples'))?.c || 0,
            formulations: (await db.get('SELECT COUNT(*) as c FROM formulations'))?.c || 0,
            tests: (await db.get('SELECT COUNT(*) as c FROM burn_tests'))?.c || 0,
            clients: (await db.get('SELECT COUNT(*) as c FROM clients'))?.c || 0,
            knowledge: (await db.get('SELECT COUNT(*) as c FROM knowledge_base'))?.c || 0,
            recipes: (await db.get('SELECT COUNT(*) as c FROM recipes WHERE active = 1'))?.c || 0,
        };

// ── Échantillons par statut ──
        const samples_by_status = await db.all(
            "SELECT status, COUNT(*) as count FROM samples GROUP BY status ORDER BY count DESC"
        );

// ── Formulations par statut ──
        const formulations_by_status = await db.all(
            "SELECT status, COUNT(*) as count FROM formulations GROUP BY status ORDER BY count DESC"
        );

// ── Tests par statut ──
        const tests_by_status = await db.all(
            "SELECT status, COUNT(*) as count FROM burn_tests GROUP BY status ORDER BY count DESC"
        );

// ── Taux de validation ──
        const validated = (await db.get("SELECT COUNT(*) as c FROM formulations WHERE status = 'validé'"))?.c || 0;
        const validation_rate = counts.formulations > 0 ? Math.round(validated / counts.formulations * 100) : 0;

// ── Top parfums (les plus formulés) ──
        const top_fragrances = await db.all(
            `SELECT fragrance_name, fragrance_ref, fragrance_supplier, COUNT(*) as count 
             FROM formulations WHERE fragrance_name IS NOT NULL AND fragrance_name != '' 
             GROUP BY fragrance_name ORDER BY count DESC LIMIT 10`
        );

// ── Top clients (les plus actifs) ──
        const top_clients = await db.all(
            `SELECT c.name, c.company, COUNT(DISTINCT s.id) as samples, COUNT(DISTINCT f.id) as formulations
             FROM clients c 
             LEFT JOIN samples s ON s.client_id = c.id
             LEFT JOIN formulations f ON f.client_id = c.id OR f.sample_id = s.id
             GROUP BY c.id ORDER BY samples DESC LIMIT 10`
        );

// ── Activité récente (dernières 30 actions) ──
        const recent_activity = [];
        const recent_samples = await db.all(
            `SELECT 'echantillon' as type, sample_number as code, fragrance_name as detail, created_at, status 
             FROM samples ORDER BY created_at DESC LIMIT 10`
        );
        const recent_formulations = await db.all(
            `SELECT 'formulation' as type, code, name as detail, created_at, status 
             FROM formulations ORDER BY created_at DESC LIMIT 10`
        );
        const recent_tests = await db.all(
            `SELECT 'test' as type, test_number as code, conclusion as detail, created_at, status 
             FROM burn_tests ORDER BY created_at DESC LIMIT 10`
        );
        recent_activity.push(...recent_samples, ...recent_formulations, ...recent_tests);
        recent_activity.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

// ── Échantillons en cours (à traiter) ──
        const pending_samples = await db.all(
            `SELECT s.sample_number, s.fragrance_name, s.status, s.created_at, c.name as client_name, c.company
             FROM samples s LEFT JOIN clients c ON s.client_id = c.id
             WHERE s.status IN ('demande', 'en_cours')
             ORDER BY s.created_at ASC LIMIT 15`
        );

// ── Tests en cours ──
        const active_tests = await db.all(
            `SELECT bt.test_number, bt.status, bt.start_date, bt.total_burn_time,
                    f.code as formulation_code, f.name as formulation_name, f.fragrance_name
             FROM burn_tests bt 
             LEFT JOIN formulations f ON bt.formulation_id = f.id
             WHERE bt.status = 'en_cours'
             ORDER BY bt.start_date ASC`
        );

// ── Activité par mois (6 derniers mois) ──
        const monthly_activity = await db.all(
            `SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count
             FROM formulations 
             WHERE created_at >= date('now', '-6 months')
             GROUP BY month ORDER BY month ASC`
        );

// ── Recettes les plus utilisées ──
        const top_recipes = await db.all(
            `SELECT r.code, r.name, r.candle_type, r.success_count,
                    COUNT(f.id) as formulation_count
             FROM recipes r 
             LEFT JOIN formulations f ON f.notes LIKE '%' || r.code || '%'
             WHERE r.active = 1
             GROUP BY r.id ORDER BY r.success_count DESC LIMIT 8`
        );

// ── Connaissances par catégorie ──
        const kb_by_category = await db.all(
            "SELECT category, COUNT(*) as count FROM knowledge_base GROUP BY category ORDER BY count DESC"
        );

// ── Dernières activités opérateurs ──
        const operator_activity = await db.all(
            'SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 15'
        );

// ── Opérateurs actifs ──
        const operators_count = (await db.get('SELECT COUNT(*) as c FROM operators WHERE active = 1'))?.c || 0;

        res.json({
            counts: { ...counts, operators: operators_count },
            samples_by_status,
            formulations_by_status,
            tests_by_status,
            validation_rate,
            top_fragrances,
            top_clients,
            recent_activity: recent_activity.slice(0, 20),
            operator_activity,
            pending_samples,
            active_tests,
            monthly_activity,
            top_recipes,
            kb_by_category
        });
    } catch (e) {
        console.error('Dashboard error:', e.message);
        res.status(500).json({ error: e.message });
    }
});
*/

// ============================================
// VALIDATION FORMULATION → Recette + Patrimoine
// ============================================
app.post('/api/formulations/:id/validate', async (req, res) => {
    try {
        const id = req.params.id;
        const { notes } = req.body || {};

// 1. Récupérer la formulation complète
        const f = await db.get(
            `SELECT f.*, c.name as client_name, c.company as client_company, s.sample_number
             FROM formulations f
             LEFT JOIN samples s ON f.sample_id = s.id
             LEFT JOIN clients c ON COALESCE(f.client_id, s.client_id) = c.id
             WHERE f.id = ?`, [id]
        );
        if (!f) return res.status(404).json({ error: 'Formulation non trouvée' });

        const waxes = await db.all(
            `SELECT fw.*, w.reference, w.name as wax_name, w.type as wax_type
             FROM formulation_waxes fw
             JOIN waxes w ON fw.wax_id = w.id
             WHERE fw.formulation_id = ?`, [id]
        );

// 2. Passer la formulation en statut validé
        await db.run("UPDATE formulations SET status = 'validé', validated_by_name = ? WHERE id = ?", [notes ? 'Validation' : 'Validation directe', id]);

// 3. Passer l'échantillon en validé si lié
        if (f.sample_id) {
            await db.run("UPDATE samples SET status = 'validé', date_validation = date('now') WHERE id = ?", [f.sample_id]);
        }

// 4. Créer une recette à partir de la formulation
        const recipeCode = 'REC-' + f.code;
        const existing = await db.get('SELECT id FROM recipes WHERE code = ?', [recipeCode]);

        let recipeId;
        if (!existing) {
            const waxDesc = waxes.map(w => w.wax_name + ' ' + w.percentage + '%').join(' / ');
            const recipeName = (f.fragrance_name || f.name) + ' — ' + (f.container_type || 'container');
            const description = [
                'Formulation validée ' + f.code,
                f.client_name ? 'Client : ' + f.client_name + (f.client_company ? ' — ' + f.client_company : '') : '',
                'Parfum : ' + (f.fragrance_name || '—') + (f.fragrance_ref ? ' [' + f.fragrance_ref + ']' : ''),
                f.fragrance_supplier ? 'Fournisseur : ' + f.fragrance_supplier : '',
                'Composition : ' + waxDesc,
                'Mèche : ' + (f.wick_reference || '—'),
                notes ? 'Notes : ' + notes : ''
            ].filter(Boolean).join('\n');

            const result = await db.run(
                `INSERT INTO recipes (name, code, candle_type, description, 
                 diameter_min, diameter_max, height_min, height_max,
                 fragrance_pct_min, fragrance_pct_max, fragrance_pct_default,
                 wick_series, pour_temp_min, pour_temp_max, cure_hours,
                 empirical_notes, best_for, success_count, active)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,1)`,
                [recipeName, recipeCode, f.container_type || 'container', description,
                 f.diameter ? f.diameter - 10 : null, f.diameter ? f.diameter + 10 : null,
                 f.height ? f.height - 10 : null, f.height ? f.height + 10 : null,
                 f.fragrance_percentage ? f.fragrance_percentage - 2 : null,
                 f.fragrance_percentage ? f.fragrance_percentage + 2 : null,
                 f.fragrance_percentage || null,
                 f.wick_reference || null,
                 f.temp_coulage ? f.temp_coulage - 3 : null,
                 f.temp_coulage ? f.temp_coulage + 3 : null,
                 72,
                 notes || null,
                 f.client_name ? 'Client ' + f.client_name : null,
                 1]
            );
            recipeId = result.lastID;

    // Ajouter les cires à la recette
            for (const w of waxes) {
                await db.run(
                    'INSERT INTO recipe_waxes (recipe_id, wax_id, wax_name, percentage, role) VALUES (?,?,?,?,?)',
                    [recipeId, w.wax_id, w.wax_name, w.percentage, w.wax_type || '']
                );
            }
        } else {
            recipeId = existing.id;
            await db.run('UPDATE recipes SET success_count = success_count + 1 WHERE id = ?', [recipeId]);
        }

// 5. Créer fiche savoir dans knowledge_base
        const waxDetail = waxes.map(w => '  • ' + w.wax_name + ' (' + w.reference + ') — ' + w.percentage + '%').join('\n');
        const kbContent = [
            '✅ FORMULATION VALIDÉE',
            '',
            '📋 Code : ' + f.code,
            '📛 Nom : ' + f.name,
            f.client_name ? '👤 Client : ' + f.client_name + (f.client_company ? ' — ' + f.client_company : '') : '',
            f.sample_number ? '🔖 Échantillon : ' + f.sample_number : '',
            '',
            '🌸 Parfum : ' + (f.fragrance_name || '—'),
            '   Référence : ' + (f.fragrance_ref || '—'),
            '   Fournisseur : ' + (f.fragrance_supplier || '—'),
            '   Pourcentage : ' + (f.fragrance_percentage || '—') + '%',
            '',
            '🕯️ Type : ' + (f.container_type || 'container'),
            '📐 Dimensions : ' + (f.diameter || '—') + ' × ' + (f.height || '—') + ' mm',
            '⚖️ Masse totale : ' + f.total_mass + ' g',
            '',
            '🧪 Composition cires :',
            waxDetail,
            '',
            '🧵 Mèche : ' + (f.wick_reference || '—'),
            '🌡️ T° ajout parfum : ' + (f.temp_ajout_parfum || '—') + '°C',
            '🌡️ T° coulage : ' + (f.temp_coulage || '—') + '°C',
            '',
            f.pantone_code ? '🎨 Couleur : ' + f.pantone_code + ' ' + (f.pantone_hex || '') : '',
            notes ? '📝 Notes : ' + notes : '',
            '',
            '📆 Date validation : ' + new Date().toISOString().split('T')[0],
            '📦 Recette générée : ' + recipeCode
        ].filter(Boolean).join('\n');

        await db.run(
            `INSERT INTO knowledge_base (category, subcategory, title, content, source, priority, tags)
             VALUES ('Recettes MFC', ?, ?, ?, ?, 5, ?)`,
            [f.container_type || 'container',
             '✅ ' + (f.fragrance_name || f.name) + ' — ' + f.code,
             kbContent,
             'Validation formulation ' + f.code,
             ['recette', 'validé', f.code, recipeCode, f.fragrance_name, f.container_type, f.client_name].filter(Boolean).join(',')]
        );

// 6. Log dans test_history si un test est lié
        const linkedTest = await db.get('SELECT id FROM burn_tests WHERE formulation_id = ? ORDER BY created_at DESC LIMIT 1', [id]);
        if (linkedTest) {
            await db.run(
                'INSERT INTO test_history (test_id, event_type, event_data) VALUES (?,?,?)',
                [linkedTest.id, 'formulation_validated',
                 JSON.stringify({ formulation_code: f.code, recipe_code: recipeCode, date: new Date().toISOString() })]
            );
        }

        res.json({
            success: true,
            recipe_id: recipeId,
            recipe_code: recipeCode,
            kb_entry: true
        });
    } catch (e) {
        console.error('Validation error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// ============================================
// ============================================
// OPÉRATEURS — Gestion du personnel labo
// ============================================
app.get('/api/operators', async (req, res) => {
    try {
        const ops = await db.all('SELECT * FROM operators ORDER BY active DESC, name ASC');
        res.json(ops);
    } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/operators', async (req, res) => {
    try {
        const { name, initials, role, email } = req.body;
        if (!name || !initials) return res.status(400).json({ error: 'Nom et initiales obligatoires' });
        const r = await db.run(
            'INSERT INTO operators (name, initials, role, email) VALUES (?,?,?,?)',
            [name, initials.toUpperCase(), role || 'opérateur', email || null]
        );
        res.json({ id: r.lastID, success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/operators/:id', async (req, res) => {
    try {
        const { name, initials, role, email, active } = req.body;
        await db.run(
            'UPDATE operators SET name=COALESCE(?,name), initials=COALESCE(?,initials), role=COALESCE(?,role), email=COALESCE(?,email), active=COALESCE(?,active) WHERE id=?',
            [name, initials?.toUpperCase(), role, email, active, req.params.id]
        );
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/operators/:id', async (req, res) => {
    try {
        await db.run('UPDATE operators SET active = 0 WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// ============================================
// JOURNAL D'ACTIVITÉ — Qui fait quoi quand
// ============================================
app.get('/api/activity', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const entity = req.query.entity || null;
        const operator = req.query.operator || null;
        let sql = 'SELECT * FROM activity_log WHERE 1=1';
        const params = [];
        if (entity) { sql += ' AND entity_type = ?'; params.push(entity); }
        if (operator) { sql += ' AND operator_id = ?'; params.push(operator); }
        sql += ' ORDER BY created_at DESC LIMIT ?';
        params.push(limit);
        res.json(await db.all(sql, params));
    } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/activity', async (req, res) => {
    try {
        const { operator_id, operator_name, action, entity_type, entity_id, entity_code, detail } = req.body;
        await db.run(
            'INSERT INTO activity_log (operator_id, operator_name, action, entity_type, entity_id, entity_code, detail) VALUES (?,?,?,?,?,?,?)',
            [operator_id || null, operator_name || 'Système', action, entity_type, entity_id || null, entity_code || null, detail || null]
        );
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// RECHERCHE GLOBALE — Cross-entity search
// ============================================
app.get('/api/search', async (req, res) => {
    try {
        const q = req.query.q;
        if (!q || q.length < 2) return res.json([]);
        const term = '%' + q + '%';
        const results = [];

// Search clients
        const clients = await db.all(
            "SELECT id, name, 'client' as type FROM clients WHERE name LIKE ?", [term]);
        results.push(...clients.map(c => ({ ...c, label: c.name, icon: '👤', url: '#client-' + c.id })));

// Search samples
        const samples = await db.all(
            "SELECT s.id, s.sample_number, s.fragrance_name, c.name as client_name, 'sample' as type FROM samples s LEFT JOIN clients c ON s.client_id = c.id WHERE s.sample_number LIKE ? OR s.fragrance_name LIKE ? OR s.client_request LIKE ? OR c.name LIKE ?",
            [term, term, term, term]);
        results.push(...samples.map(s => ({ ...s, label: (s.sample_number || '') + ' ' + (s.fragrance_name || '') + ' — ' + (s.client_name || ''), icon: '📋', url: 'echantillons.html' })));

// Search formulations
        const formulations = await db.all(
            "SELECT f.id, f.code, f.name, f.fragrance_name, f.wick_reference, f.container_type, c.name as client_name, 'formulation' as type FROM formulations f LEFT JOIN clients c ON f.client_id = c.id WHERE f.code LIKE ? OR f.name LIKE ? OR f.fragrance_name LIKE ? OR f.wick_reference LIKE ? OR c.name LIKE ?",
            [term, term, term, term, term]);
        results.push(...formulations.map(f => ({ ...f, label: f.code + ' — ' + (f.name || '') + ' ' + (f.wick_reference || '') + ' ' + (f.client_name || ''), icon: '🧪', url: 'formulations.html' })));

// Search burn tests
        const tests = await db.all(
            "SELECT bt.id, bt.test_number, bt.status, f.code as form_code, c.name as client_name, 'test' as type FROM burn_tests bt LEFT JOIN formulations f ON bt.formulation_id = f.id LEFT JOIN clients c ON f.client_id = c.id WHERE bt.test_number LIKE ? OR f.code LIKE ? OR c.name LIKE ?",
            [term, term, term]);
        results.push(...tests.map(t => ({ ...t, label: (t.test_number || '') + ' — ' + (t.form_code || '') + ' ' + (t.client_name || '') + ' [' + (t.status || '') + ']', icon: '🔥', url: 'tests.html' })));

// Search knowledge base
        const kb = await db.all(
            "SELECT id, title, category, 'knowledge' as type FROM knowledge_base WHERE title LIKE ? OR content LIKE ? OR tags LIKE ?",
            [term, term, term]);
        results.push(...kb.map(k => ({ ...k, label: k.title + ' [' + k.category + ']', icon: '📚', url: 'connaissances.html' })));

// Search waxes
        const waxes = await db.all(
            "SELECT id, reference, name, 'wax' as type FROM waxes WHERE reference LIKE ? OR name LIKE ?",
            [term, term]);
        results.push(...waxes.map(w => ({ ...w, label: w.reference + ' — ' + (w.name || ''), icon: '🕯️', url: 'matieres.html' })));

// Search wicks
        const wicks = await db.all(
            "SELECT id, reference, series, 'wick' as type FROM wicks WHERE reference LIKE ? OR series LIKE ?",
            [term, term]);
        results.push(...wicks.map(w => ({ ...w, label: w.reference + ' [' + (w.series || '') + ']', icon: '🧵', url: 'matieres.html' })));

// Search recipes
        const recipes = await db.all(
            "SELECT id, code, name, description, 'recipe' as type FROM recipes WHERE code LIKE ? OR name LIKE ? OR description LIKE ?",
            [term, term, term]);
        results.push(...recipes.map(r => ({ ...r, label: r.code + ' — ' + (r.name || ''), icon: '📖', url: 'recettes.html' })));

        res.json(results.slice(0, 50));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================
// PHOTOS — Upload et consultation
// ============================================
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// ── Archivage centralisé — configurable pour Docker (MFC_DATA_DIR=/data) ──
const DATA_DIR = process.env.MFC_DATA_DIR || path.join(__dirname, '..', 'mfc-data');
function archiveFile(srcPath, category, originalName) {
    try {
        const archDir = path.join(DATA_DIR, category);
        if (!fs.existsSync(archDir)) fs.mkdirSync(archDir, { recursive: true });
        const safeName = (originalName || path.basename(srcPath))
            .replace(/[^a-zA-Z0-9àâäéèêëïîôùûüÿçÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ\s\-_.()]/g, '')
            .replace(/\s+/g, '_');
        const dest = path.join(archDir, safeName);
// Si le fichier existe deja, ajouter timestamp
        if (fs.existsSync(dest)) {
            const ext = path.extname(safeName);
            const base = path.basename(safeName, ext);
            const ts = new Date().toISOString().slice(0,10);
            fs.copyFileSync(srcPath, path.join(archDir, base + '_' + ts + ext));
        } else {
            fs.copyFileSync(srcPath, dest);
        }
    } catch(e) { console.error('[Archive]', e.message); }
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(uploadDir, req.params.type || 'misc', String(req.params.id || 'unknown'));
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || '.jpg';
        cb(null, Date.now() + '-' + Math.random().toString(36).substr(2, 6) + ext);
    }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Seules les images sont acceptées'));
}});

// Serve uploaded photos
app.use('/uploads', express.static(uploadDir));

// Upload photo for a test cycle or formulation
app.post('/api/photos/:type/:id', upload.array('photos', 5), async (req, res) => {
    try {
        const files = req.files.map(f => ({
            filename: f.filename,
            path: '/uploads/' + req.params.type + '/' + req.params.id + '/' + f.filename,
            size: f.size,
            type: req.params.type,
            entity_id: parseInt(req.params.id)
        }));
// Archive photos dans mfc-data/photos/type/
        for (const f of req.files) {
            archiveFile(f.path, 'photos/' + req.params.type, f.originalname);
        }
// Save photo refs in DB
        for (const f of files) {
            await db.run(
                'INSERT INTO photos (entity_type, entity_id, filename, filepath, filesize, caption) VALUES (?, ?, ?, ?, ?, ?)',
                [f.type, f.entity_id, f.filename, f.path, f.size, req.body.caption || null]
            );
        }
// Log to change_log
        await logChange({
            entity_type: req.params.type, entity_id: parseInt(req.params.id),
            action: 'create', field_changed: 'photo',
            new_value: files.length + ' photo(s)', generate_kb: false
        });
        res.json({ files, success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Get photos for entity
app.get('/api/photos/:type/:id', async (req, res) => {
    try {
        const photos = await db.all(
            'SELECT * FROM photos WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC',
            [req.params.type, req.params.id]
        );
        res.json(photos);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Delete a photo
app.delete('/api/photos/:id', async (req, res) => {
    try {
        const photo = await db.get('SELECT * FROM photos WHERE id = ?', [req.params.id]);
        if (photo) {
            const fullPath = path.join(__dirname, photo.filepath);
            if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
            await db.run('DELETE FROM photos WHERE id = ?', [req.params.id]);
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================
// EXPORT PDF — Rapport de test de brûlage
// ============================================
app.get('/api/burn-tests/:id/pdf', async (req, res) => {
    try {
        const test = await db.get(`
            SELECT bt.*, f.code as form_code, f.name as form_name, f.fragrance_name,
                   f.fragrance_percentage, f.wick_reference, f.container_type, f.diameter, f.height,
                   f.total_mass, f.wax_mass, f.fragrance_mass,
                   s.sample_number, c.name as client_name
            FROM burn_tests bt
            LEFT JOIN formulations f ON bt.formulation_id = f.id
            LEFT JOIN samples s ON bt.sample_id = s.id
            LEFT JOIN clients c ON COALESCE(f.client_id, s.client_id) = c.id
            WHERE bt.id = ?`, [req.params.id]);
        if (!test) return res.status(404).json({ error: 'Test non trouvé' });

        const cycles = await db.all('SELECT * FROM burn_cycles WHERE test_id = ? ORDER BY cycle_number', [req.params.id]);
        const waxes = test.formulation_id ? await db.all(`
            SELECT fw.percentage, w.reference, w.name FROM formulation_waxes fw
            LEFT JOIN waxes w ON fw.wax_id = w.id WHERE fw.formulation_id = ?`, [test.formulation_id]) : [];
        const photos = await db.all('SELECT * FROM photos WHERE entity_type = ? AND entity_id = ?', ['cycle', req.params.id]);

        const doc = new PDFDocument({ size: 'A4', margin: 50, info: {
            Title: 'Rapport Test ' + (test.test_number || test.id),
            Author: 'MFC Laboratoire',
            Subject: 'Test de brûlage'
        }});

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=MFC-Rapport-' + (test.test_number || test.id) + '.pdf');
        doc.pipe(res);

// Header
        doc.fontSize(8).fillColor('#999').text('MAISON FRANÇAISE DES CIRES — DEPUIS 1904', 50, 30, { align: 'right' });
        doc.moveTo(50, 45).lineTo(545, 45).strokeColor('#a32d03').lineWidth(2).stroke();

// Title
        doc.fontSize(18).fillColor('#a32d03').text('RAPPORT DE TEST DE BRÛLAGE', 50, 60);
        doc.fontSize(12).fillColor('#333').text(test.test_number || 'Test #' + test.id, 50, 85);
        if (test.client_name) doc.fontSize(10).fillColor('#666').text('Client : ' + test.client_name, 50, 102);
        doc.text('Date : ' + new Date(test.created_at || Date.now()).toLocaleDateString('fr-FR'), 50, 116);

// Formulation info
        doc.moveDown(2);
        doc.fontSize(13).fillColor('#a32d03').text('FORMULATION', 50);
        doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).strokeColor('#ddd').lineWidth(0.5).stroke();
        doc.moveDown(0.5);
        doc.fontSize(9).fillColor('#333');

        const formInfo = [
            ['Nom', test.form_name || '—'],
            ['Code', test.form_code || '—'],
            ['Container', (test.container_type || '—') + ' — Ø' + (test.diameter || '?') + ' × ' + (test.height || '?') + 'mm'],
            ['Masse totale', (test.total_mass || '?') + 'g'],
            ['Parfum', (test.fragrance_name || '—') + ' — ' + (test.fragrance_percentage || '?') + '%'],
            ['Mèche', test.wick_reference || '—']
        ];
        for (const [label, val] of formInfo) {
            doc.font('Helvetica-Bold').text(label + ' : ', 60, doc.y, { continued: true });
            doc.font('Helvetica').text(val);
        }

// Wax composition
        if (waxes.length > 0) {
            doc.moveDown(0.5);
            doc.font('Helvetica-Bold').text('Composition cires :');
            for (const w of waxes) {
                doc.font('Helvetica').text('  • ' + (w.reference || w.name || '?') + ' — ' + w.percentage + '%', 70);
            }
        }

// Cycles
        doc.moveDown(1.5);
        doc.fontSize(13).fillColor('#a32d03').text('CYCLES DE COMBUSTION', 50);
        doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).strokeColor('#ddd').lineWidth(0.5).stroke();
        doc.moveDown(0.5);

        for (const c of cycles) {
            doc.fontSize(10).fillColor('#a32d03').font('Helvetica-Bold').text('Cycle ' + c.cycle_number, 60);
            doc.fontSize(8.5).fillColor('#333').font('Helvetica');

            const cycleData = [
                ['Durée', (c.duration_minutes || 240) + ' min'],
                ['Masse avant/après', (c.mass_before || '?') + 'g → ' + (c.mass_after || '?') + 'g' + (c.mass_consumed ? ' (−' + c.mass_consumed.toFixed(1) + 'g)' : '')],
                ['Pool Ø', (c.pool_diameter || '?') + 'mm' + (c.pool_depth ? ' / prof. ' + c.pool_depth + 'mm' : '')],
                ['Flamme', 'H=' + (c.flame_height || '?') + 'mm — ' + (c.flame_stability || '—')],
                ['Suie/Fumée', (c.soot_level || '—') + ' / ' + (c.smoke_level || '—')],
                ['Champignonnage', c.mushrooming || '—'],
                ['Tunnel', c.tunneling || '—'],
                ['Diffusion', c.scent_throw || '—']
            ];
            for (const [label, val] of cycleData) {
                doc.text('    ' + label + ' : ' + val, 70);
            }

    // Modifications
            if (c.mod_wick || c.mod_fragrance_pct || c.mod_wax_changes || c.mod_colorant || c.mod_other) {
                doc.moveDown(0.3);
                doc.font('Helvetica-Bold').fillColor('#e65100').text('    ⚙️ Modifications :', 70);
                doc.font('Helvetica').fillColor('#333');
                if (c.mod_wick) doc.text('      Mèche → ' + c.mod_wick, 80);
                if (c.mod_fragrance_pct) doc.text('      Parfum → ' + c.mod_fragrance_pct + '%', 80);
                if (c.mod_wax_changes) doc.text('      Cires → ' + c.mod_wax_changes, 80);
                if (c.mod_notes) doc.text('      Raison : ' + c.mod_notes, 80);
            }
            if (c.notes) doc.text('    Notes : ' + c.notes, 70);
            doc.moveDown(0.7);
        }

// Client decision
        if (test.client_status) {
            doc.moveDown(0.5);
            doc.fontSize(13).fillColor('#a32d03').text('DÉCISION CLIENT', 50);
            doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).strokeColor('#ddd').lineWidth(0.5).stroke();
            doc.moveDown(0.5);
            const statusEmoji = test.client_status === 'validé' ? '✅' : test.client_status === 'refusé' ? '❌' : '🔄';
            doc.fontSize(11).fillColor('#333').text(statusEmoji + ' ' + test.client_status.toUpperCase());
            if (test.client_feedback) doc.fontSize(9).text('Retour : ' + test.client_feedback, 60);
        }

// Footer
        const pageH = doc.page.height;
        doc.fontSize(7).fillColor('#999')
           .text('MFC Laboratoire — Document confidentiel — Généré le ' + new Date().toLocaleDateString('fr-FR'),
                 50, pageH - 40, { align: 'center' });

        doc.end();
    } catch (e) {
        console.error('PDF error:', e);
        res.status(500).json({ error: e.message });
    }
});

// ============================================
// BACKUP — Sauvegarde automatique et manuelle
// ============================================
const backupDir = path.join(DATA_DIR, 'backups');
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
// Migration: copier anciens backups si existants
const oldBackupDir = path.join(__dirname, 'backups');
if (fs.existsSync(oldBackupDir)) {
    try {
        for (const f of fs.readdirSync(oldBackupDir)) {
            const src = path.join(oldBackupDir, f);
            const dest = path.join(backupDir, f);
            if (!fs.existsSync(dest)) fs.copyFileSync(src, dest);
        }
    } catch(e) {}
}

app.post('/api/backup', async (req, res) => {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const backupPath = path.join(backupDir, 'mfc-backup-' + timestamp + '.sqlite');

// Export database
        const data = db.getDB().export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(backupPath, buffer);

// Also export KB as JSON for portability
        const kb = await db.all('SELECT * FROM knowledge_base ORDER BY id');
        const recipes = await db.all('SELECT * FROM recipes ORDER BY id');
        const changes = await db.all('SELECT * FROM change_log ORDER BY id');
        const patterns = await db.all('SELECT * FROM knowledge_patterns ORDER BY id');
        const rules = await db.all('SELECT * FROM learned_rules ORDER BY id');

        const jsonPath = path.join(backupDir, 'mfc-knowledge-' + timestamp + '.json');
        fs.writeFileSync(jsonPath, JSON.stringify({
            export_date: new Date().toISOString(),
            version: '5.0',
            knowledge_base: kb,
            recipes: recipes,
            change_log: changes,
            knowledge_patterns: patterns,
            learned_rules: rules
        }, null, 2));

// Clean old backups (keep last 10)
        const files = fs.readdirSync(backupDir).sort().reverse();
        const sqliteFiles = files.filter(f => f.endsWith('.sqlite'));
        const jsonFiles = files.filter(f => f.endsWith('.json'));
        for (const old of sqliteFiles.slice(3)) fs.unlinkSync(path.join(backupDir, old));
        for (const old of jsonFiles.slice(3)) fs.unlinkSync(path.join(backupDir, old));

// Sauvegarder aussi learning-data.json (survit à une réinitialisation de base)
        try {
            const learnedKB = await db.all("SELECT * FROM knowledge_base WHERE source LIKE 'Auto #%' ORDER BY id");
            const learningFile = path.join(DATA_DIR, 'learning-data.json');
            fs.writeFileSync(learningFile, JSON.stringify({ 
                exported_at: new Date().toISOString(), changes, patterns, learned_kb: learnedKB
            }, null, 2), 'utf-8');
        } catch(e) {}

        res.json({
            success: true,
            sqlite_path: backupPath,
            json_path: jsonPath,
            sqlite_size: buffer.length,
            kb_entries: kb.length,
            changes_entries: changes.length,
            patterns_entries: patterns.length
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Download latest backup
app.get('/api/backup/download', async (req, res) => {
    try {
        const data = db.getDB().export();
        const buffer = Buffer.from(data);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', 'attachment; filename=mfc-backup-' + timestamp + '.sqlite');
        res.send(buffer);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Download knowledge as JSON
app.get('/api/backup/knowledge', async (req, res) => {
    try {
        const kb = await db.all('SELECT * FROM knowledge_base ORDER BY id');
        const recipes = await db.all('SELECT * FROM recipes ORDER BY id');
        const recipeWaxes = await db.all('SELECT * FROM recipe_waxes ORDER BY recipe_id');
        const changes = await db.all('SELECT * FROM change_log ORDER BY id');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=mfc-knowledge-' + timestamp + '.json');
        res.json({
            export_date: new Date().toISOString(),
            version: '5.0',
            knowledge_base: kb,
            recipes: recipes,
            recipe_waxes: recipeWaxes,
            change_log: changes,
            stats: { kb: kb.length, recipes: recipes.length, changes: changes.length }
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// List existing backups
app.get('/api/backups', (req, res) => {
    try {
        if (!fs.existsSync(backupDir)) return res.json([]);
        const files = fs.readdirSync(backupDir)
            .filter(f => f.endsWith('.sqlite') || f.endsWith('.json') || f.endsWith('.zip'))
            .map(f => ({ name: f, size: fs.statSync(path.join(backupDir, f)).size, date: f.match(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/)?.[0]?.replace(/-/g, ':') || '' }))
            .sort((a, b) => b.name.localeCompare(a.name));
        res.json(files);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/backup/complete — Sauvegarde complète (code + données) en un seul ZIP
app.post('/api/backup/complete', async (req, res) => {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const zipName = 'mfc-complete-' + timestamp + '.zip';
        const zipPath = path.join(backupDir, zipName);
        const appDir = path.resolve(__dirname);
        const dataDir = path.resolve(DATA_DIR);
        
        // D'abord sauvegarder la base
        const dbData = db.getDB().export();
        const dbBuffer = Buffer.from(dbData);
        const dbBackup = path.join(backupDir, 'mfc-backup-' + timestamp + '.sqlite');
        fs.writeFileSync(dbBackup, dbBuffer);
        
        // Utiliser PowerShell (Windows) ou zip (Linux) pour créer l'archive
        const { execSync } = require('child_process');
        const isWindows = process.platform === 'win32';
        
        if (isWindows) {
            // PowerShell Compress-Archive
            const tempDir = path.join(require('os').tmpdir(), 'mfc-backup-' + timestamp);
            fs.mkdirSync(tempDir, { recursive: true });
            
            // Copier le code (sans node_modules, sans PDFs)
            const codeDir = path.join(tempDir, 'mfc-laboratoire');
            try {
                execSync(`robocopy "${appDir}" "${codeDir}" /E /XD node_modules .git mfc-data /NFL /NDL /NJH /NJS /R:0 /W:0`, { stdio: 'pipe' });
            } catch(e2) {
                // robocopy retourne exit code 1 même en cas de succès (fichiers copiés)
                if (!fs.existsSync(codeDir)) {
                    fs.mkdirSync(codeDir, { recursive: true });
                    // Dernier recours: copie manuelle des fichiers essentiels
                    const essentials = fs.readdirSync(appDir).filter(f => !['node_modules','.git','mfc-data'].includes(f));
                    for (const f of essentials) {
                        const src = path.join(appDir, f);
                        const dst = path.join(codeDir, f);
                        if (fs.statSync(src).isFile()) fs.copyFileSync(src, dst);
                    }
                }
            }
            // Supprimer node_modules s'il a été copié
            const nmDir = path.join(codeDir, 'node_modules');
            if (fs.existsSync(nmDir)) execSync(`rmdir /s /q "${nmDir}"`, { stdio: 'pipe' });
            
            // Copier les données
            if (fs.existsSync(dataDir)) {
                const dataTarget = path.join(tempDir, 'mfc-data');
                try {
                    execSync(`robocopy "${dataDir}" "${dataTarget}" /E /NFL /NDL /NJH /NJS /R:0 /W:0`, { stdio: 'pipe' });
                } catch(e3) { /* robocopy exit code 1 = success */ }
                // Exclure les gros PDFs du backup complet (ils sont dans done/)
                const fdsDir = path.join(dataTarget, 'fds', 'done');
                if (fs.existsSync(fdsDir)) {
                    // Garder la liste des PDFs mais pas les fichiers (trop lourds)
                    const pdfs = fs.readdirSync(fdsDir).filter(f => f.endsWith('.pdf'));
                    fs.writeFileSync(path.join(fdsDir, '_liste_fds.txt'), pdfs.join('\\n'), 'utf-8');
                    pdfs.forEach(f => { try { fs.unlinkSync(path.join(fdsDir, f)); } catch(e){} });
                }
            }
            
            // Créer le ZIP
            execSync(`powershell -Command "Compress-Archive -Path '${tempDir}\\*' -DestinationPath '${zipPath}' -Force"`, { stdio: 'pipe' });
            
            // Nettoyer
            execSync(`rmdir /s /q "${tempDir}"`, { stdio: 'pipe' });
        } else {
            // Linux: utiliser zip
            const parentDir = path.dirname(appDir);
            const appName = path.basename(appDir);
            const dataName = path.basename(dataDir);
            execSync(`cd "${parentDir}" && zip -r "${zipPath}" "${appName}" "${dataName}" -x "${appName}/node_modules/*" -x "${dataName}/fds/done/*.pdf" -x "${dataName}/fds/inbox/*.pdf" -x "${dataName}/backups/*"`, { stdio: 'pipe' });
        }
        
        const stats = fs.statSync(zipPath);
        
        // Nettoyer les vieux backups complets (garder les 5 derniers)
        const completeBackups = fs.readdirSync(backupDir)
            .filter(f => f.startsWith('mfc-complete-') && f.endsWith('.zip'))
            .sort().reverse();
        for (const old of completeBackups.slice(3)) {
            try { fs.unlinkSync(path.join(backupDir, old)); } catch(e) {}
        }
        
        res.json({
            success: true,
            filename: zipName,
            path: zipPath,
            size: stats.size,
            size_mb: Math.round(stats.size / 1024 / 1024 * 10) / 10,
            includes: ['code mfc-laboratoire', 'base de données SQLite', 'knowledge base', 'configurations', 'formulations'],
            note: 'Les PDFs FDS ne sont pas inclus (trop volumineux). La liste est conservée.'
        });
    } catch (e) {
        console.error('Backup complete error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// GET /api/backup/complete/download — Télécharger la dernière sauvegarde complète
app.get('/api/backup/complete/download', (req, res) => {
    try {
        const completeBackups = fs.readdirSync(backupDir)
            .filter(f => f.startsWith('mfc-complete-') && f.endsWith('.zip'))
            .sort().reverse();
        if (!completeBackups.length) return res.status(404).json({ error: 'Aucune sauvegarde complète' });
        const latest = path.join(backupDir, completeBackups[0]);
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename=' + completeBackups[0]);
        res.sendFile(latest);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================
// INITIALISATION ET DÉMARRAGE
// ============================================
async function start() {
    console.log('');
    console.log('========================================');
    console.log('  MFC LABORATOIRE');
    console.log('  Maison Française des Cires');
    console.log('  Version ' + APP_VERSION + ' — ' + APP_FEATURES.split(' · ').slice(0,4).join(' · '));
    console.log('  Build ' + APP_BUILD);
    console.log('========================================');
    console.log('');
    
    try {
        await db.initDB();
        await initTables();
        await migrateIfNeeded(db);
        await seedData();
        await seedKnowledge(db);
        await seedEmpiricalKnowledge(db);
        await seedOlfactiveInsight(db);
        await seedVegetaleKnowledge(db);
        await seedVegetableKnowledge(db);
        await seedSojaScience(db);
        await seedAlcoolScience(db);
        await seedMateriauxVerifies(db);
        await seedSession17(db);
        await seedSession18(db);
        await seedSession19(db);
        await seedSession20(db);
        await seedSession21(db);
        await seedSession22(db);
        await seedSession23(db);
        
// Import Excel formulations depuis mfc-data/excel/
        try { 
            const xlResult = await importExcelFormulations(db, DATA_DIR);
            if (xlResult.imported > 0) console.log(`  ✓ Excel : ${xlResult.imported} formulation(s) importée(s)`);
        } catch(e) { console.error('Excel import:', e.message); }

// ═══════════════════════════════════════════
// RESTAURATION AUTO-APPRENTISSAGE depuis mfc-data/
// Survit même si la base est supprimée
// ═══════════════════════════════════════════
        const learningFile = path.join(DATA_DIR, 'learning-data.json');
        try {
            if (fs.existsSync(learningFile)) {
                const data = JSON.parse(fs.readFileSync(learningFile, 'utf-8'));
                let restoredChanges = 0, restoredPatterns = 0, restoredKB = 0;
                
        // Restaurer change_log
                if (data.changes?.length) {
                    const existingCount = (await db.get('SELECT COUNT(*) as c FROM change_log')).c;
                    if (existingCount === 0) {
                        for (const c of data.changes) {
                            await db.run(`INSERT INTO change_log (entity_type, entity_id, action, field_changed, old_value, new_value, reason_why, technical_context, linked_test_id, linked_formulation_id, linked_client_id, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
                                [c.entity_type, c.entity_id, c.action, c.field_changed, c.old_value, c.new_value, c.reason_why, c.technical_context, c.linked_test_id, c.linked_formulation_id, c.linked_client_id, c.created_at]);
                            restoredChanges++;
                        }
                    }
                }
                
        // Restaurer patterns
                if (data.patterns?.length) {
                    const existingP = (await db.get('SELECT COUNT(*) as c FROM knowledge_patterns')).c;
                    if (existingP === 0) {
                        for (const p of data.patterns) {
                            await db.run(`INSERT INTO knowledge_patterns (pattern_type, trigger_condition, action_taken, confidence, usage_count, source_changes, validated_by_test) VALUES (?,?,?,?,?,?,?)`,
                                [p.pattern_type, p.trigger_condition, p.action_taken, p.confidence, p.usage_count, p.source_changes, p.validated_by_test]);
                            restoredPatterns++;
                        }
                    }
                }
                
        // Restaurer les entrées KB auto-apprises (celles générées par logChange)
                if (data.learned_kb?.length) {
                    for (const kb of data.learned_kb) {
                        const exists = await db.get('SELECT id FROM knowledge_base WHERE title = ? AND category = ?', [kb.title, kb.category]);
                        if (!exists) {
                            await db.run('INSERT INTO knowledge_base (category, subcategory, title, content, source, priority, tags) VALUES (?,?,?,?,?,?,?)',
                                [kb.category, kb.subcategory, kb.title, kb.content, kb.source, kb.priority || 3, kb.tags]);
                            restoredKB++;
                        }
                    }
                }
                
                if (restoredChanges + restoredPatterns + restoredKB > 0) {
                    console.log(`  ✓ Auto-apprentissage restauré : ${restoredChanges} changements, ${restoredPatterns} patterns, ${restoredKB} fiches KB`);
                }
            }
        } catch(e) { console.error('Restauration apprentissage:', e.message); }
        
// Sauvegarde périodique de l'apprentissage (toutes les 30 min)
        async function saveLearningData() {
            try {
                const changes = await db.all('SELECT * FROM change_log ORDER BY id');
                const patterns = await db.all('SELECT * FROM knowledge_patterns ORDER BY id');
                const learnedKB = await db.all("SELECT * FROM knowledge_base WHERE source LIKE 'Auto #%' ORDER BY id");
                const data = { 
                    exported_at: new Date().toISOString(),
                    changes, patterns, learned_kb: learnedKB
                };
                if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
                fs.writeFileSync(learningFile, JSON.stringify(data, null, 2), 'utf-8');
            } catch(e) { console.error('Sauvegarde apprentissage:', e.message); }
        }
        
// Sauvegarder immédiatement au démarrage puis toutes les 30 min
        await saveLearningData();
        setInterval(saveLearningData, 30 * 60 * 1000);
        
// Hook : sauvegarder après chaque logChange
        const _origLogChange = logChange;
// On ne peut pas surcharger facilement, mais le setInterval suffit
        await seedRecipes(db);
        await seedRecipesBatch2(db);
        await seedRecipesBatch3(db);
        await seedScience(db);
        await seedEnrichmentV5208(db);
        await seedMultiWicks(db);
        db.startAutoSave(30000);

// Auto-backup every 6 hours
        setInterval(async () => {
            try {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                const data = db.getDB().export();
                const buffer = Buffer.from(data);
                if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
                fs.writeFileSync(path.join(backupDir, 'auto-' + timestamp + '.sqlite'), buffer);
        // Clean old auto-backups (keep last 5)
                const files = fs.readdirSync(backupDir).filter(f => f.startsWith('auto-')).sort().reverse();
                for (const old of files.slice(5)) fs.unlinkSync(path.join(backupDir, old));
                console.log('  ✓ Auto-backup : ' + timestamp);
            } catch (e) { console.error('Auto-backup error:', e.message); }
        }, 6 * 60 * 60 * 1000); // 6h
        
// ═══════════════════════════════════════════════
// FDS PARSER — Extraction automatique PDF → JSON
// ═══════════════════════════════════════════════

// Upload FDS PDFs
        const fdsDir = path.join(__dirname, 'fds-import');
        if (!fs.existsSync(fdsDir)) fs.mkdirSync(fdsDir, { recursive: true });
        
// Répertoires FDS dans mfc-data
        const fdsInbox = path.join(DATA_DIR, 'fds', 'inbox');
        const fdsDone = path.join(DATA_DIR, 'fds', 'done');
        if (!fs.existsSync(fdsInbox)) fs.mkdirSync(fdsInbox, { recursive: true });
        if (!fs.existsSync(fdsDone)) fs.mkdirSync(fdsDone, { recursive: true });
        
// Migration : déplacer les anciens PDF de mfc-data/fds/ vers inbox/
        try {
            const oldFdsDir = path.join(DATA_DIR, 'fds');
            const oldPdfs = fs.readdirSync(oldFdsDir).filter(f => f.toLowerCase().endsWith('.pdf'));
            for (const pdf of oldPdfs) {
                const src = path.join(oldFdsDir, pdf);
                const dst = path.join(fdsInbox, pdf);
                if (!fs.existsSync(dst)) {
                    fs.copyFileSync(src, dst);
                    fs.unlinkSync(src);
                    console.log(`  → Migration FDS : ${pdf} → inbox/`);
                }
            }
        } catch(e) { /* silencieux si pas d'anciens fichiers */ }
        const fdsStorage = multer.diskStorage({
            destination: (req, file, cb) => cb(null, fdsDir),
            filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
        });
        const fdsUpload = multer({ storage: fdsStorage, limits: { fileSize: 50 * 1024 * 1024, files: 100 }, fileFilter: (req, file, cb) => {
            cb(null, file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf'));
        }});

// POST /api/fds/upload — Upload multiple FDS PDFs (max 100)
app.post('/api/fds/upload', (req, res) => {
            fdsUpload.array('fds', 100)(req, res, (err) => {
                if (err) {
                    console.error('FDS upload error:', err.message);
                    return res.status(400).json({ error: err.message || 'Erreur upload' });
                }
                const files = (req.files || []).map(f => ({ name: f.originalname, path: f.path, size: f.size }));
        // Archive dans mfc-data/fds/inbox/
                for (const f of (req.files || [])) {
                    const dest = path.join(fdsInbox, f.originalname);
                    try { fs.copyFileSync(f.path, dest); } catch(e) {}
                }
                res.json({ success: true, count: files.length, files });
            });
        });

// GET /api/fds/files — List uploaded FDS files
app.get('/api/fds/files', (req, res) => {
            try {
                const files = fs.readdirSync(fdsDir)
                    .filter(f => f.toLowerCase().endsWith('.pdf'))
                    .map(f => {
                        const stat = fs.statSync(path.join(fdsDir, f));
                        return { name: f, size: stat.size, date: stat.mtime };
                    })
                    .sort((a, b) => new Date(b.date) - new Date(a.date));
                res.json({ files });
            } catch (e) { res.json({ files: [] }); }
        });

// GET /api/fds/archive — List archived FDS PDFs (inbox + done)
app.get('/api/fds/archive', (req, res) => {
            try {
                const listDir = (dir, label) => {
                    if (!fs.existsSync(dir)) return [];
                    return fs.readdirSync(dir)
                        .filter(f => f.toLowerCase().endsWith('.pdf'))
                        .map(f => {
                            const stat = fs.statSync(path.join(dir, f));
                            return { name: f, size: stat.size, date: stat.mtime, status: label };
                        });
                };
                const inbox = listDir(fdsInbox, 'inbox');
                const done = listDir(fdsDone, 'done');
                res.json({ files: [...inbox, ...done], inbox: inbox.length, done: done.length });
            } catch (e) { res.json({ files: [], inbox: 0, done: 0 }); }
        });

// GET /api/fds/archive/:filename — Download archived FDS PDF
app.get('/api/fds/archive/:filename', (req, res) => {
            const fname = req.params.filename;
            const inInbox = path.join(fdsInbox, fname);
            const inDone = path.join(fdsDone, fname);
            const fpath = fs.existsSync(inInbox) ? inInbox : fs.existsSync(inDone) ? inDone : null;
            if (fpath) {
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `inline; filename="${fname}"`);
                fs.createReadStream(fpath).pipe(res);
            } else {
                res.status(404).json({ error: 'FDS non trouvée' });
            }
        });
        
// GET /api/archive — List all archived files by category
app.get('/api/archive', (req, res) => {
            try {
                if (!fs.existsSync(DATA_DIR)) return res.json({ categories: {} });
                const categories = {};
                const cats = fs.readdirSync(DATA_DIR).filter(f => {
                    return fs.statSync(path.join(DATA_DIR, f)).isDirectory() && f !== 'node_modules';
                });
                for (const cat of cats) {
                    const catDir = path.join(DATA_DIR, cat);
                    const files = [];
                    function scanDir(dir, prefix) {
                        for (const f of fs.readdirSync(dir)) {
                            const fp = path.join(dir, f);
                            const stat = fs.statSync(fp);
                            if (stat.isDirectory()) {
                                scanDir(fp, (prefix ? prefix + '/' : '') + f);
                            } else {
                                files.push({ name: (prefix ? prefix + '/' : '') + f, size: stat.size, date: stat.mtime });
                            }
                        }
                    }
                    scanDir(catDir, '');
                    categories[cat] = files.sort((a, b) => new Date(b.date) - new Date(a.date));
                }
                res.json({ categories });
            } catch (e) { res.json({ categories: {} }); }
        });

// Detect Python command (python on Windows, python3 on Linux/Mac)
        let pythonCmd = null;
        try {
            const { execSync: execTest } = require('child_process');
            execTest('python --version', { stdio: 'pipe' });
            pythonCmd = 'python';
        } catch {
            try {
                const { execSync: execTest2 } = require('child_process');
                execTest2('python3 --version', { stdio: 'pipe' });
                pythonCmd = 'python3';
            } catch {
                pythonCmd = null;
            }
        }
        if (pythonCmd) {
            console.log(`  ✓ Python détecté : ${pythonCmd}`);
    // Auto-install PyMuPDF if missing
            try {
                const { execSync: checkFitz } = require('child_process');
                checkFitz(`${pythonCmd} -c "import fitz"`, { stdio: 'pipe' });
                console.log('  ✓ PyMuPDF disponible — extraction FDS active');
            } catch {
                console.log('  ⚠ PyMuPDF manquant — tentative d\'installation automatique...');
                try {
                    const { execSync: installPip } = require('child_process');
                    installPip(`${pythonCmd} -m pip install pymupdf --quiet`, { stdio: 'pipe', timeout: 120000 });
                    console.log('  ✓ PyMuPDF installé avec succès !');
                } catch (e) {
                    console.warn(`  ✗ Installation automatique échouée. Lancez manuellement : ${pythonCmd} -m pip install pymupdf`);
                }
            }
        }
        else console.warn('  ⚠ Python non trouvé — extracteur FDS indisponible. Installez Python depuis python.org');

// GET /api/fds/status — Check if Python + PyMuPDF are available
app.get('/api/fds/status', (req, res) => {
            if (!pythonCmd) return res.json({ ok: false, error: 'Python non trouvé. Installez Python depuis python.org et cochez "Add to PATH".' });
            try {
                const { execSync } = require('child_process');
                execSync(`${pythonCmd} -c "import fitz"`, { stdio: 'pipe' });
                res.json({ ok: true, python: pythonCmd });
            } catch {
                res.json({ ok: false, error: `PyMuPDF manquant. Exécutez : ${pythonCmd} -m pip install pymupdf` });
            }
        });

// POST /api/fds/parse — Parse one or all FDS PDFs
app.post('/api/fds/parse', async (req, res) => {
            if (!pythonCmd) return res.status(500).json({ error: 'Python non trouvé. Installez Python depuis python.org' });
            
            const { filename, source } = req.body; // source: 'archive' pour parser depuis mfc-data/fds/
            const sourceDir = source === 'archive' ? path.join(DATA_DIR, 'fds') : fdsDir;
            const target = filename ? path.join(sourceDir, filename) : sourceDir;
            
            if (!fs.existsSync(target)) {
                return res.status(404).json({ error: 'Fichier ou dossier non trouvé: ' + target });
            }
            
            try {
                const { execSync } = require('child_process');
                const parserPath = path.join(__dirname, 'modules', 'fds-parser.py');
                const cmd = `${pythonCmd} "${parserPath}" "${target}"`;
                const output = execSync(cmd, { maxBuffer: 50 * 1024 * 1024, encoding: 'utf-8', timeout: 300000 });
                
        // Extract JSON after marker
                const marker = '---JSON_START---';
                const jsonStart = output.indexOf(marker);
                if (jsonStart === -1) {
                    return res.status(500).json({ error: 'Parser output invalide' });
                }
                const jsonStr = output.substring(jsonStart + marker.length).trim();
                const results = JSON.parse(jsonStr);
                
        // Save results
                const outPath = path.join(fdsDir, 'derniere-extraction.json');
                fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf-8');
                
                res.json({ success: true, count: results.length, results });
            } catch (e) {
                res.status(500).json({ error: e.message });
            }
        });

// État global du reimport FDS
        let fdsReimportStatus = { running: false, progress: '', done: false, result: null };

// GET /api/fds/debug-parse/:filename — Tester le parser sur un PDF spécifique
app.get('/api/fds/debug-parse/:filename', async (req, res) => {
    if (!pythonCmd) return res.status(500).json({ error: 'Python non trouvé' });
    const fname = req.params.filename;
    const dirs = [path.join(DATA_DIR, 'fds'), path.join(DATA_DIR, 'fds', 'inbox'), path.join(DATA_DIR, 'fds', 'done')];
    let pdfPath = null;
    for (const dir of dirs) {
        const p = path.join(dir, fname);
        if (fs.existsSync(p)) { pdfPath = p; break; }
    }
    if (!pdfPath) return res.status(404).json({ error: 'PDF non trouvé', searched: dirs });
    try {
        const { exec } = require('child_process');
        const execP = (cmd, opts) => new Promise((resolve, reject) => {
            exec(cmd, opts, (err, stdout) => { if (err) reject(err); else resolve(stdout); });
        });
        
        // 1. Parse normal
        const parserPath = path.join(__dirname, 'modules', 'fds-parser.py');
        const output = await execP(`${pythonCmd} "${parserPath}" "${pdfPath}"`, { maxBuffer: 10*1024*1024, encoding: 'utf-8', timeout: 30000 });
        const marker = '---JSON_START---';
        const jsonStart = output.indexOf(marker);
        let parsed = null;
        if (jsonStart !== -1) parsed = JSON.parse(output.substring(jsonStart + marker.length).trim());
        
        // 2. Texte brut sections pour debug
        let sections = null;
        try {
            const debugPath = path.join(__dirname, 'modules', 'fds-debug.py');
            const debugOut = await execP(`${pythonCmd} "${debugPath}" "${pdfPath}"`, { maxBuffer: 10*1024*1024, encoding: 'utf-8', timeout: 15000 });
            sections = JSON.parse(debugOut.trim());
        } catch(e) { sections = { error: e.message }; }
        
        res.json({ file: fname, parsed, sections });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/fds/reimport-status — Polling du statut
app.get('/api/fds/reimport-status', (req, res) => {
            res.json(fdsReimportStatus);
        });

// POST /api/fds/reimport-archive — Traite inbox/ et déplace vers done/
app.post('/api/fds/reimport-archive', async (req, res) => {
            if (!pythonCmd) return res.status(500).json({ error: 'Python non trouvé' });
            if (fdsReimportStatus.running) return res.json({ success: true, message: 'Déjà en cours' });
            
            const pdfs = fs.existsSync(fdsInbox) ? fs.readdirSync(fdsInbox).filter(f => f.toLowerCase().endsWith('.pdf')) : [];
            if (!pdfs.length) return res.json({ success: false, error: 'Aucun PDF dans inbox/' });
            
            fdsReimportStatus = { running: true, progress: `0/${pdfs.length}`, done: false, result: null };
            res.json({ success: true, message: `Import lancé : ${pdfs.length} PDF`, total: pdfs.length });
            
    // Arrière-plan
            (async () => {
                const { execSync } = require('child_process');
                const parserPath = path.join(__dirname, 'modules', 'fds-parser.py');
                const marker = '---JSON_START---';
                let kbImported = 0, dbCreated = 0, dbSkipped = 0, totalComps = 0, parseErrors = 0;
                const processedFiles = [];
                
                for (let i = 0; i < pdfs.length; i++) {
                    const pdf = pdfs[i];
                    fdsReimportStatus.progress = `${i+1}/${pdfs.length} — ${pdf.substring(0,40)}`;
                    try {
                        const filePath = path.join(fdsInbox, pdf);
                        const cmd = `${pythonCmd} "${parserPath}" "${filePath}"`;
                        const output = execSync(cmd, { maxBuffer: 10*1024*1024, encoding: 'utf-8', timeout: 120000 });
                        const jsonStart = output.indexOf(marker);
                        if (jsonStart === -1) { parseErrors++; continue; }
                        const items = JSON.parse(output.substring(jsonStart + marker.length).trim());
                        const list = Array.isArray(items) ? items : [items];
                        
                        for (const p of list) {
                            const id = p.identification || {};
                            const rawNom = id.nom || p.fichier || '';
                            const nom = cleanFragranceName(rawNom);
                            const code = id.code || id.reference || '';
                            const title = `FDS Parfum : ${nom}` + (code ? ` (${code})` : '');
                            const normNom = normalizeForMatch(nom);
                            
                    // KB — dédup par nom normalisé (CAUSE 3)
                            const existingKB = await db.get(
                                `SELECT id FROM knowledge_base WHERE category = 'fds_parfum' AND (title = ? OR title LIKE ?)`,
                                [title, `%${normNom}%`]
                            );
                            let kbId;
                            if (existingKB) {
                                await db.run('UPDATE knowledge_base SET content = ?, updated_at = datetime("now") WHERE id = ?',
                                    [JSON.stringify(p, null, 2), existingKB.id]);
                                kbId = existingKB.id;
                            } else {
                                const kbR = await db.run('INSERT INTO knowledge_base (category, subcategory, title, content, source, tags) VALUES (?,?,?,?,?,?)',
                                    ['fds_parfum', 'composition', title, JSON.stringify(p, null, 2),
                                     `FDS ${id.fournisseur || '?'}`,
                                     ['fds','parfum',id.fournisseur||'',nom.toLowerCase()].filter(Boolean).join(',')]);
                                kbId = kbR.lastInsertRowid;
                                kbImported++;
                            }
                            
                    // DB fragrances — dédup normalisé (CAUSES 2+4)
                            const nomUp = nom.toUpperCase().trim();
                            if (!nomUp) continue;
                            const existing = code
                                ? await db.get(`SELECT id FROM fragrances WHERE reference = ? OR UPPER(REPLACE(REPLACE(name, "'", ""), "_", " ")) = ?`, [code, normNom])
                                : await db.get(`SELECT id FROM fragrances WHERE UPPER(REPLACE(REPLACE(name, "'", ""), "_", " ")) = ?`, [normNom]);
                            
                            let fragId;
                            if (existing) {
                                fragId = existing.id;
                                const compCount = await db.get('SELECT COUNT(*) as c FROM fragrance_components WHERE fragrance_id = ?', [fragId]);
                                if (compCount.c > 0) { dbSkipped++; }
                                else {
                                    const fp = p.proprietes_physiques?.flash_point_c || p.proprietes?.flash_point_c || p.proprietes?.flash_point || p.proprietes_physiques?.flash_point || null;
                                    const fpVal = fp ? parseFloat(String(fp).replace(/[<>°C\s]/g,'')) : null;
                                    if (!isNaN(fpVal) && fpVal > 0) {
                                        await db.run('UPDATE fragrances SET flash_point = COALESCE(flash_point, ?) WHERE id = ?', [fpVal, fragId]);
                                    }
                                    for (const c of (p.composition?.composants || p.composants || p.composition || [])) {
                                        const casNum = c.cas||c.cas_number||null;
                                        const compFP = casNum ? (_MOL_FP[casNum] ?? null) : null;
                                        const cName = sanitizeComponentName(c.nom||c.nom_chimique||c.name||'?', casNum);
                                        await db.run('INSERT INTO fragrance_components (fragrance_id,cas_number,name,percentage_min,percentage_max,flash_point) VALUES (?,?,?,?,?,?)',
                                            [fragId, casNum, cName, c.pourcentage_min??c.concentration_min??null, c.pourcentage_max??c.concentration_max??null, compFP]);
                                        totalComps++;
                                    }
                                    dbCreated++;
                                }
                            } else {
                                let supplierId = null;
                                const fournisseur = (id.fournisseur || '').toUpperCase().trim();
                                if (fournisseur) {
                                    const sup = await db.get('SELECT id FROM suppliers WHERE UPPER(name) LIKE ?', ['%'+fournisseur+'%']);
                                    if (sup) supplierId = sup.id;
                                    else { const r = await db.run('INSERT INTO suppliers (name,country,specialty) VALUES (?,?,?)', [fournisseur,'France','Parfums']); supplierId = r.lastInsertRowid; }
                                }
                                const fp = p.proprietes_physiques?.flash_point_c || p.proprietes?.flash_point_c || p.proprietes?.flash_point || p.proprietes_physiques?.flash_point || null;
                                const fpVal = fp ? parseFloat(String(fp).replace(/[<>°C\s]/g,'')) : null;
                                const fragR = await db.run('INSERT INTO fragrances (supplier_id,reference,name,flash_point) VALUES (?,?,?,?)',
                                    [supplierId, code, nomUp, isNaN(fpVal)?null:fpVal]);
                                fragId = fragR.lastInsertRowid;
                                for (const c of (p.composition?.composants || p.composants || p.composition || [])) {
                                    const casNum = c.cas||c.cas_number||null;
                                    const compFP = casNum ? (_MOL_FP[casNum] ?? null) : null;
                                    const cName = sanitizeComponentName(c.nom||c.nom_chimique||c.name||'?', casNum);
                                    await db.run('INSERT INTO fragrance_components (fragrance_id,cas_number,name,percentage_min,percentage_max,flash_point) VALUES (?,?,?,?,?,?)',
                                        [fragId, casNum, cName, c.pourcentage_min??c.concentration_min??null, c.pourcentage_max??c.concentration_max??null, compFP]);
                                    totalComps++;
                                }
                                dbCreated++;
                            }
                            
                            // Lier FDS KB → fragrance_id (CAUSE 5)
                            if (kbId && fragId) {
                                try {
                                    const kbRow = await db.get('SELECT content FROM knowledge_base WHERE id = ?', [kbId]);
                                    if (kbRow) {
                                        const content = JSON.parse(kbRow.content);
                                        content.fragrance_id = fragId;
                                        content.reference = code;
                                        content.product_name = nomUp;
                                        await db.run('UPDATE knowledge_base SET content = ? WHERE id = ?', [JSON.stringify(content), kbId]);
                                    }
                                } catch(e) {}
                            }
                        }
                        
                // Déplacer vers done/
                        processedFiles.push(pdf);
                    } catch (e) {
                        console.error(`  ✗ FDS ${pdf}: ${e.message.substring(0,80)}`);
                        parseErrors++;
                    }
                }
                
        // Déplacer les fichiers traités vers done/
                for (const pdf of processedFiles) {
                    try {
                        const src = path.join(fdsInbox, pdf);
                        const dst = path.join(fdsDone, pdf);
                        fs.copyFileSync(src, dst);
                        fs.unlinkSync(src);
                    } catch(e) {}
                }
                
                fdsReimportStatus = { running: false, done: true, progress: 'Terminé',
                    result: { parsed: processedFiles.length, errors: parseErrors, kb: kbImported, parfums: dbCreated, skipped: dbSkipped, composants: totalComps, moved: processedFiles.length }
                };
                console.log(`  ✓ FDS reimport: ${dbCreated} parfums, ${totalComps} composants, ${processedFiles.length} → done/, ${parseErrors} erreurs`);
            })();
        });

// POST /api/fds/rescan-all — Re-parse TOUTES les FDS (inbox + done) pour enrichir composants manquants
app.post('/api/fds/rescan-all', express.json(), async (req, res) => {
            if (!pythonCmd) return res.status(500).json({ error: 'Python non trouvé' });
            if (fdsReimportStatus.running) return res.json({ success: true, message: 'Déjà en cours' });
            const forceMode = req.body?.force === true;  // Force = supprimer et ré-extraire tous les composants
            
    // Collecter tous les PDFs (inbox + done + racine fds/)
            const dirs = [fdsInbox, fdsDone, path.join(DATA_DIR, 'fds')];
            let allPdfs = [];
            for (const dir of dirs) {
                if (fs.existsSync(dir)) {
                    const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.pdf'));
                    for (const f of files) {
                        const fullPath = path.join(dir, f);
                        if (!allPdfs.find(p => p.name === f)) {
                            allPdfs.push({ name: f, path: fullPath, dir: path.basename(dir) });
                        }
                    }
                }
            }
            
            if (!allPdfs.length) return res.json({ success: false, error: 'Aucun PDF FDS trouvé dans mfc-data/fds/' });
            
            fdsReimportStatus = { running: true, progress: `0/${allPdfs.length}`, done: false, result: null };
            res.json({ success: true, message: `Rescan lancé : ${allPdfs.length} PDF`, total: allPdfs.length });
            
            (async () => {
                const { execSync } = require('child_process');
                const parserPath = path.join(__dirname, 'modules', 'fds-parser.py');
                const marker = '---JSON_START---';
                let enriched = 0, alreadyOk = 0, created = 0, totalComps = 0, parseErrors = 0;
                let rescanUnmatched = [];
                let rescanNoName = [];
                let rescanNoComps = [];
                let rescanSkipped = [];
                
        // Helper: exec async avec timeout
                const execAsync = (cmd, opts) => new Promise((resolve, reject) => {
                    const child = require('child_process').exec(cmd, opts, (err, stdout, stderr) => {
                        if (err) reject(err);
                        else resolve(stdout);
                    });
                });
                
                for (let i = 0; i < allPdfs.length; i++) {
                    const pdf = allPdfs[i];
                    fdsReimportStatus.progress = `${i+1}/${allPdfs.length} — ${pdf.name.substring(0,40)}`;
                    let pdfStatus = 'unknown';
                    try {
                        const cmd = `${pythonCmd} "${parserPath}" "${pdf.path}"`;
                        const output = await execAsync(cmd, { maxBuffer: 10*1024*1024, encoding: 'utf-8', timeout: 30000 });
                        const jsonStart = output.indexOf(marker);
                        if (jsonStart === -1) { parseErrors++; pdfStatus = 'no-json'; console.log(`  [${i+1}] ${pdf.name}: ❌ pas de JSON`); continue; }
                        const items = JSON.parse(output.substring(jsonStart + marker.length).trim());
                        const list = Array.isArray(items) ? items : [items];
                        
                        if (list.length === 0) { pdfStatus = 'empty-list'; console.log(`  [${i+1}] ${pdf.name}: ⚠ liste vide`); rescanSkipped.push(pdf.name + ' (liste vide)'); continue; }
                        
                        let pdfProcessed = false;
                        for (const p of list) {
                            const id = p.identification || {};
                            const nom = (id.nom || id.name || '').trim();
                            // Fallback: extraire le nom du nom de fichier si le parser n'a rien trouvé
                            // Ex: "8572751_COUR_DES_EPICES.pdf" → "COUR DES EPICES"
                            // Ex: "FDS_CONCENTRE_DE_PARFUM_08_0018372.pdf" → "CONCENTRE DE PARFUM 08 0018372"
                            let nomFinal = nom;
                            if (!nomFinal) {
                                let fn = pdf.name.replace(/\.pdf$/i, '')
                                    .replace(/_\d{4}-\d{2}-\d{2}/g, '')   // remove date suffixes
                                    .replace(/^FDS_/i, '')                  // remove FDS_ prefix
                                    .replace(/^\d+_/, '')                   // remove numeric code prefix
                                    .replace(/_/g, ' ')                     // underscores → spaces
                                    .trim();
                                if (fn.length >= 3) nomFinal = fn;
                            }
                            if (!nomFinal) { rescanNoName.push(pdf.name); pdfStatus = 'no-name'; continue; }
                            const nomUp = nomFinal.toUpperCase();
                            const code = (id.code || id.reference || '').trim();
                            // Fallback code: extraire du nom de fichier (ex: "8572751_COUR..." → "8572751")
                            let codeFinal = code;
                            if (!codeFinal) {
                                const codeMatch = pdf.name.match(/^(\d{6,})/);
                                if (codeMatch) codeFinal = codeMatch[1];
                            }
                            const fournisseur = (id.fournisseur || '').toUpperCase().trim();
                            const fp = p.proprietes_physiques?.flash_point_c || p.proprietes?.flash_point_c || p.proprietes?.flash_point || p.proprietes_physiques?.flash_point || null;
                            const fpVal = fp ? parseFloat(String(fp).replace(/[<>°C\s]/g, '')) : null;
                            
                    // Résoudre fournisseur
                            let supplierId = null;
                            if (fournisseur) {
                                const sup = await db.get('SELECT id FROM suppliers WHERE UPPER(name) LIKE ?', ['%'+fournisseur+'%']);
                                if (sup) supplierId = sup.id;
                                else { const r = await db.run('INSERT INTO suppliers (name,country,specialty) VALUES (?,?,?)', [fournisseur,'France','Parfums']); supplierId = r.lastInsertRowid; }
                            }
                            
                    // Chercher le parfum en DB — matching progressif
                    // Normaliser: supprimer les codes référence du nom FDS
                    // Ex: "ARMAGNAC ENCHANTE G 118 14416" → "ARMAGNAC ENCHANTE"
                            const stripRef = s => s
                                .replace(/\s+[GR]\s*\d{2,3}\s*\d{4,}/gi, '')  // G 118 14416, G 117 11061
                                .replace(/\s+\d{7,}/gi, '')             // 8572751
                                .replace(/\s+[GR]\s*\d+\s*\/\d+/gi, '')// R 210855/2
                                .replace(/\s*\(\d+\)\s*/g, '')          // (1), (2) etc.
                                .replace(/\s+\d{2}\/\d{7,}/g, '')      // 08/0018372, 13/0033395
                                .replace(/\s+\[.*?\]/g, '')             // [AR1090196]
                                .replace(/\s+SA$/i, '')                  // " SA" suffix
                                .replace(/^CONCENTRE DE PARFUM\s*/i, '') // Strip generic FDS header
                                .trim();
                            const nomClean = stripRef(nomUp);
                            const normalize = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
                            const nomNorm = normalize(nomClean);
                            
                    // 1. Exact UPPER (nom original)
                            let frag = await db.get('SELECT id FROM fragrances WHERE UPPER(name) = ?', [nomUp]);
                    // 2. Exact UPPER (nom nettoyé sans ref)
                            if (!frag && nomClean !== nomUp) {
                                frag = await db.get('SELECT id FROM fragrances WHERE UPPER(name) = ?', [nomClean]);
                            }
                    // 3. Par référence/code
                            if (!frag && codeFinal) {
                                frag = await db.get('SELECT id FROM fragrances WHERE reference = ? OR UPPER(reference) = ?', [codeFinal, codeFinal.toUpperCase()]);
                            }
                    // 4. Fuzzy: comparer normalisé (sans accents, sans ref)
                            if (!frag) {
                                const allFrags = await db.all('SELECT id, name, reference FROM fragrances');
                                for (const f of allFrags) {
                                    const fNorm = normalize(stripRef((f.name||'').toUpperCase()));
                                    if (fNorm === nomNorm) { frag = f; break; }
                                }
                        // 5. Sous-chaîne si pas de match exact normalisé
                                if (!frag) {
                                    for (const f of allFrags) {
                                        const fNorm = normalize(stripRef((f.name||'').toUpperCase()));
                                        if (fNorm.length >= 4 && nomNorm.length >= 4) {
                                            if (fNorm.includes(nomNorm) || nomNorm.includes(fNorm)) {
                                                const shorter = Math.min(fNorm.length, nomNorm.length);
                                                const longer = Math.max(fNorm.length, nomNorm.length);
                                                if (shorter / longer > 0.7) { frag = f; break; }
                                            }
                                        }
                                    }
                                }
                            }
                            
                            if (!frag) {
                        // Créer le parfum automatiquement (rescan complet = import total)
                                const insertName = nomClean || nomFinal;
                                const r = await db.run(
                                    'INSERT INTO fragrances (supplier_id, reference, name, flash_point, notes) VALUES (?,?,?,?,?)',
                                    [supplierId, codeFinal || null, insertName, (!isNaN(fpVal) && fpVal > 0) ? fpVal : null, 'Créé auto par rescan FDS — ' + pdf.name]
                                );
                                fragId = r.lastInsertRowid;
                                created++;
                                console.log(`  [${i+1}] ✨ Créé: "${insertName}" (ID:${fragId}) depuis ${pdf.name}`);
                            } else {
                                fragId = frag.id;
                        // Mettre à jour flash_point + supplier si absent
                                if (!isNaN(fpVal) && fpVal > 0) {
                                    await db.run('UPDATE fragrances SET flash_point = COALESCE(flash_point, ?), supplier_id = COALESCE(supplier_id, ?) WHERE id = ?', 
                                        [fpVal, supplierId, fragId]);
                                }
                            }
                            
                    // Vérifier si composants existent déjà ET ont des pourcentages
                            const existingComps = await db.get('SELECT COUNT(*) as c FROM fragrance_components WHERE fragrance_id = ?', [fragId]);
                            const existingWithPct = await db.get('SELECT COUNT(*) as c FROM fragrance_components WHERE fragrance_id = ? AND (percentage_min IS NOT NULL OR percentage_max IS NOT NULL)', [fragId]);
                            if (!forceMode && existingComps.c > 0 && existingWithPct.c > 0) { alreadyOk++; continue; }
                            // Supprimer les composants existants pour ré-extraire
                            if (existingComps.c > 0) {
                                await db.run('DELETE FROM fragrance_components WHERE fragrance_id = ?', [fragId]);
                            }
                            
                    // Extraire et insérer les composants
                            const comps = p.composition?.composants || p.composants || p.composition || [];
                            if (!Array.isArray(comps) || comps.length === 0) { rescanNoComps.push(nom + ' (' + pdf.name + ')'); continue; }
                            
                            for (const c of comps) {
                                const cas = c.cas || c.cas_number || null;
                                const cName = sanitizeComponentName(c.nom || c.nom_chimique || c.name || '?', cas);
                                const pctMin = c.pourcentage_min ?? c.percentage_min ?? c.concentration_min ?? null;
                                const pctMax = c.pourcentage_max ?? c.percentage_max ?? c.concentration_max ?? null;
                                const cFp = c.flash_point || (cas ? _MOL_FP[cas] : null) || null;
                                
                                await db.run(
                                    'INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max, flash_point) VALUES (?,?,?,?,?,?)',
                                    [fragId, cas, cName, pctMin, pctMax, cFp]
                                );
                                totalComps++;
                            }
                            enriched++;
                            pdfProcessed = true;
                        }
                        if (!pdfProcessed && rescanNoName.length === 0) {
                            rescanSkipped.push(pdf.name + ' (produits sans nom)');
                        }
                    } catch (e) {
                        console.log(`  [${i+1}] ${pdf.name}: ❌ ${e.message.substring(0,60)}`);
                        parseErrors++;
                    }
                }
                
                fdsReimportStatus = {
                    running: false, done: true,
                    progress: `${allPdfs.length}/${allPdfs.length}`,
                    result: { scanned: allPdfs.length, enriched, already_ok: alreadyOk, created, composants: totalComps, errors: parseErrors, 
                        unmatched: rescanUnmatched.length, unmatched_names: rescanUnmatched.slice(0, 30),
                        no_name: rescanNoName.length, no_name_files: rescanNoName.slice(0, 20),
                        no_comps: rescanNoComps.length, no_comps_names: rescanNoComps.slice(0, 20),
                        skipped: rescanSkipped.length, skipped_files: rescanSkipped.slice(0, 20) }
                };
                console.log(`  ✓ FDS rescan-all: ${allPdfs.length} scannés, ${enriched} enrichis, ${created} créés, ${totalComps} composants, ${alreadyOk} déjà OK, ${parseErrors} erreurs, ${rescanUnmatched.length} non matchés, ${rescanNoName.length} sans nom, ${rescanNoComps.length} sans composants, ${rescanSkipped.length} skippés`);
                if (rescanUnmatched.length > 0) console.log(`  → Non matchés: ${rescanUnmatched.slice(0,10).join(', ')}`);
                if (rescanNoName.length > 0) console.log(`  → Sans nom: ${rescanNoName.slice(0,10).join(', ')}`);
                if (rescanNoComps.length > 0) console.log(`  → Sans composants: ${rescanNoComps.slice(0,10).join(', ')}`);
            })();
        });


        // POST /api/fds/import-kb — Import parsed FDS data into knowledge base
        app.post('/api/fds/import-kb', async (req, res) => {
            const { parfums } = req.body; // Array of parsed FDS objects
            if (!parfums || !Array.isArray(parfums)) {
                return res.status(400).json({ error: 'Tableau de parfums requis' });
            }
            try {
                let imported = 0;
                for (const p of parfums) {
                    const id = p.identification;
                    const nom = id?.nom || p.fichier;
                    const code = id?.code || '';
                    const title = `FDS Parfum : ${nom}` + (code ? ` (${code})` : '');
                    
                    // Check if already exists
                    const existing = await db.get('SELECT id FROM knowledge_base WHERE title = ?', [title]);
                    if (existing) continue;
                    
                    const content = JSON.stringify(p, null, 2);
                    const tags = ['fds', 'parfum', 'composition', 'molecules',
                        id?.fournisseur || '', nom.toLowerCase(), code.toLowerCase()
                    ].filter(Boolean).join(', ');
                    
                    await db.run(
                        `INSERT INTO knowledge_base (category, subcategory, title, content, source, tags)
                         VALUES ('fds_parfum', 'composition', ?, ?, ?, ?)`,
                        [title, content, `FDS ${id?.fournisseur || 'inconnu'}`, tags]
                    );
                    imported++;
                }
                res.json({ success: true, imported, total: parfums.length });
            } catch (e) {
                console.error('FDS import error:', e.message);
                res.status(500).json({ error: e.message });
            }
        });

        // GET /api/fds/stats — Count FDS in knowledge base + 72h stats
        app.get('/api/fds/stats', async (req, res) => {
            try {
                const count = await db.get("SELECT COUNT(*) as total FROM knowledge_base WHERE category = 'fds_parfum'");
                const list = await db.all("SELECT title, source, created_at FROM knowledge_base WHERE category = 'fds_parfum' ORDER BY created_at DESC");
                const fragCount = await db.get("SELECT COUNT(*) as total FROM fragrances");
                const compCount = await db.get("SELECT COUNT(*) as total FROM fragrance_components");
                
                // Stats 72h
                const recent72h = await db.get("SELECT COUNT(*) as total FROM knowledge_base WHERE category = 'fds_parfum' AND created_at >= datetime('now', '-72 hours')");
                const recentFrags = await db.get("SELECT COUNT(*) as total FROM fragrances WHERE created_at >= datetime('now', '-72 hours')");
                
                // Couverture moléculaire
                const totalComps = await db.get("SELECT COUNT(DISTINCT cas_number) as total FROM fragrance_components WHERE cas_number IS NOT NULL");
                const invalidComps = await db.get("SELECT COUNT(DISTINCT cas_number) as total FROM fragrance_components WHERE name LIKE '%invalide%' OR name LIKE '%artéfact%'");
                const noComps = await db.get("SELECT COUNT(*) as total FROM fragrances WHERE id NOT IN (SELECT DISTINCT fragrance_id FROM fragrance_components)");
                
                // Parfums avec 0 composants valides
                const emptyFrags = await db.all("SELECT f.id, f.name FROM fragrances f WHERE (SELECT COUNT(*) FROM fragrance_components fc WHERE fc.fragrance_id = f.id AND fc.name NOT LIKE '%invalide%' AND fc.name NOT LIKE '%artéfact%') = 0");
                
                res.json({ 
                    total: count?.total || 0, 
                    fiches: list || [], 
                    fragrances: fragCount?.total || 0, 
                    composants: compCount?.total || 0,
                    recent_72h: recent72h?.total || 0,
                    recent_fragrances_72h: recentFrags?.total || 0,
                    unique_cas: totalComps?.total || 0,
                    invalid_cas: invalidComps?.total || 0,
                    empty_fragrances: emptyFrags || [],
                    no_components: noComps?.total || 0
                });
            } catch (e) {
                res.json({ total: 0, fiches: [] });
            }
        });

        // POST /api/fds/import-db — Import parsed FDS into fragrances + fragrance_components tables
        app.post('/api/fds/import-db', async (req, res) => {
            const { parfums } = req.body;
            if (!parfums || !Array.isArray(parfums)) {
                return res.status(400).json({ error: 'Tableau de parfums requis' });
            }
            try {
                let created = 0, skipped = 0, totalComps = 0;
                for (const p of parfums) {
                    const id = p.identification || {};
                    const rawNom = (id.nom || p.fichier || '');
                    const nom = cleanFragranceName(rawNom).toUpperCase().trim();
                    const code = id.code || id.reference || '';
                    const fournisseur = (id.fournisseur || '').toUpperCase().trim();
                    const fp = p.proprietes_physiques?.flash_point_c || p.proprietes?.flash_point_c || p.proprietes?.flash_point || p.flash_point || null;
                    const normNom = normalizeForMatch(nom);
                    
                    if (!nom) continue;
                    
                    // Résoudre fournisseur
                    let supplierId = null;
                    if (fournisseur) {
                        const sup = await db.get('SELECT id FROM suppliers WHERE UPPER(name) LIKE ?', ['%' + fournisseur + '%']);
                        if (sup) { supplierId = sup.id; }
                        else {
                            const r = await db.run('INSERT INTO suppliers (name, country, specialty) VALUES (?, ?, ?)', [fournisseur, 'France', 'Parfums']);
                            supplierId = r.lastInsertRowid;
                        }
                    }
                    
                    // Check doublon — normalisé (CAUSES 2+4)
                    const existing = code
                        ? await db.get(`SELECT id FROM fragrances WHERE reference = ? OR UPPER(REPLACE(REPLACE(name, "'", ""), "_", " ")) = ?`, [code, normNom])
                        : await db.get(`SELECT id FROM fragrances WHERE UPPER(REPLACE(REPLACE(name, "'", ""), "_", " ")) = ?`, [normNom]);
                    let fragId;
                    if (existing) {
                        const compCount = await db.get('SELECT COUNT(*) as c FROM fragrance_components WHERE fragrance_id = ?', [existing.id]);
                        if (compCount.c > 0) { skipped++; continue; }
                        fragId = existing.id;
                        const fpVal = fp ? parseFloat(String(fp).replace(/[<>°C\s]/g, '')) : null;
                        if (!isNaN(fpVal) && fpVal > 0) {
                            await db.run('UPDATE fragrances SET flash_point = COALESCE(flash_point, ?), supplier_id = COALESCE(supplier_id, ?) WHERE id = ?', [fpVal, supplierId, fragId]);
                        }
                    } else {
                        const fpVal = fp ? parseFloat(String(fp).replace(/[<>°C\s]/g, '')) : null;
                        const fragResult = await db.run(
                            'INSERT INTO fragrances (supplier_id, reference, name, flash_point) VALUES (?, ?, ?, ?)',
                            [supplierId, code, nom, isNaN(fpVal) ? null : fpVal]
                        );
                        fragId = fragResult.lastInsertRowid;
                    }
                    
                    // Insérer les composants — noms validés (CAUSE 1)
                    const comps = p.composition?.composants || p.composants || p.composition || [];
                    for (const c of comps) {
                        const cas = c.cas || c.cas_number || null;
                        const cName = sanitizeComponentName(c.nom || c.nom_chimique || c.name || '?', cas);
                        const pctMin = c.pourcentage_min != null ? c.pourcentage_min : (c.percentage_min != null ? c.percentage_min : null);
                        const pctMax = c.pourcentage_max != null ? c.pourcentage_max : (c.percentage_max != null ? c.percentage_max : null);
                        const cFp = c.flash_point || (cas ? _MOL_FP[cas] : null) || null;
                        
                        await db.run(
                            'INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max, flash_point) VALUES (?, ?, ?, ?, ?, ?)',
                            [fragId, cas, cName, pctMin, pctMax, cFp]
                        );
                        totalComps++;
                    }
                    created++;

                }
                res.json({ success: true, created, skipped, composants: totalComps });
            } catch (e) {
                console.error('FDS import-db error:', e.message);
                res.status(500).json({ error: e.message });
            }
        });

        // ═══════════════════════════════════════════════
        // IMPORT EXCEL — Formulations depuis mfc-data/excel/
        // ═══════════════════════════════════════════════

        // POST /api/excel/import — Relancer l'import Excel
        app.post('/api/excel/import', async (req, res) => {
            try {
                const result = await importExcelFormulations(db, DATA_DIR);
                res.json({ success: true, ...result });
            } catch (e) {
                res.status(500).json({ error: e.message });
            }
        });

        // DELETE /api/excel/purge — Supprimer toutes les formulations importées par Excel
        app.delete('/api/excel/purge', async (req, res) => {
            try {
                const imported = await db.all("SELECT id, code, name FROM formulations WHERE status = 'importé'");
                let deleted = 0;
                for (const f of imported) {
                    await db.run('DELETE FROM formulation_waxes WHERE formulation_id = ?', [f.id]);
                    await db.run('DELETE FROM formulation_colorants WHERE formulation_id = ?', [f.id]);
                    try { await db.run('DELETE FROM knowledge_base WHERE title LIKE ?', [`Production : ${f.name}%`]); } catch(e) {}
                    try { await db.run('DELETE FROM knowledge_base WHERE title LIKE ?', [`Croisement : %`]); } catch(e) {}
                    await db.run('DELETE FROM formulations WHERE id = ?', [f.id]);
                    deleted++;
                }
                res.json({ success: true, deleted, detail: imported.map(f => f.code + ' — ' + f.name) });
            } catch (e) {
                res.status(500).json({ error: e.message });
            }
        });

        // GET /api/excel/stats — Stats des fichiers Excel et formulations importées
        app.get('/api/excel/stats', async (req, res) => {
            try {
                const excelDir = path.join(DATA_DIR, 'excel');
                let excelFiles = [];
                if (fs.existsSync(excelDir)) {
                    excelFiles = fs.readdirSync(excelDir)
                        .filter(f => f.toLowerCase().endsWith('.xlsx') || f.toLowerCase().endsWith('.xls'))
                        .map(f => ({ name: f, size: fs.statSync(path.join(excelDir, f)).size }));
                }
                const formCount = await db.get("SELECT COUNT(*) as c FROM formulations WHERE status = 'importé'");
                const totalForm = await db.get("SELECT COUNT(*) as c FROM formulations");
                const fwCount = await db.get("SELECT COUNT(*) as c FROM formulation_waxes");
                res.json({
                    excel_files: excelFiles.length,
                    files: excelFiles,
                    formulations_importees: formCount?.c || 0,
                    formulations_total: totalForm?.c || 0,
                    cires_liees: fwCount?.c || 0
                });
            } catch (e) { res.json({ excel_files: 0 }); }
        });

        // DELETE /api/fds/files/:filename — Remove an uploaded FDS
        app.delete('/api/fds/files/:filename', (req, res) => {
            const fpath = path.join(fdsDir, req.params.filename);
            if (fs.existsSync(fpath)) {
                fs.unlinkSync(fpath);
                res.json({ success: true });
            } else {
                res.status(404).json({ error: 'Fichier non trouvé' });
            }
        });

        // ═══════════════════════════════════════════════
        // ASSISTANT FORMULATEUR — Croisement FDS × Recettes
        // ═══════════════════════════════════════════════
        
        const formulationEngine = require('./modules/formulation-engine');
        const { crossFDSWithFormulations, VALIDATED_FORMULATIONS, LEARNED_RULES } = require('./modules/formulation-crossref');
        
        // POST /api/formulateur/analyze — Analyser une FDS et proposer une formulation
        app.post('/api/formulateur/analyze', async (req, res) => {
            try {
                const { fds_data, candle_type, diameter, height, total_mass, fragrance_pct, colorant_pct, fragrance_name, fragrance_ref, fragrance_supplier, vegetal } = req.body;
                
                // 1. Analyse FDS (si fournie)
                let fdsAnalysis = null;
                if (fds_data) {
                    fdsAnalysis = formulationEngine.analyzeFDS(fds_data);
                }
                
                // 2. Croisement FDS × formulations validées (codées en dur + base)
                // Charger les formulations validées en base
                const dbFormulations = await db.all(`
                    SELECT f.name as parfum, f.fragrance_name, f.fragrance_percentage as pct_parfum,
                           f.wick_reference as meche, f.container_type as contenant, f.code as recette,
                           c.name as client, c.company as client_name,
                           r.code as recipe_code
                    FROM formulations f
                    LEFT JOIN clients c ON f.client_id = c.id
                    LEFT JOIN recipes r ON f.recipe_id = r.id
                    WHERE f.status = 'validée'
                `);
                const dbRules = await db.all(`SELECT * FROM learned_rules WHERE confidence > 0.3 ORDER BY confidence DESC`);
                
                const crossref = crossFDSWithFormulations(fds_data, { 
                    fragrance_name, candle_type, fragrance_pct, vegetal 
                }, dbFormulations, dbRules);
                
                // 3. Charger les recettes
                const recipes = await db.all('SELECT * FROM recipes WHERE active = 1 ORDER BY success_count DESC');
                for (const r of recipes) {
                    r.waxes = await db.all('SELECT * FROM recipe_waxes WHERE recipe_id = ?', [r.id]);
                }
                
                // 4. Sélection de recette (boostée par le croisement)
                const params = { candle_type: candle_type || 'container', diameter, height, fragrance_pct, total_mass };
                const ranked = formulationEngine.selectRecipe(recipes, params, fdsAnalysis);
                
                // Si le croisement a trouvé un match direct, booster cette recette
                if (crossref.recommendation && crossref.recommendation.recette) {
                    const matchIdx = ranked.findIndex(r => r.recipe.code === crossref.recommendation.recette);
                    if (matchIdx > 0) {
                        const match = ranked.splice(matchIdx, 1)[0];
                        match.score += 50;
                        match.reasons.unshift('✅ Validé en production : ' + crossref.recommendation.message);
                        ranked.unshift(match);
                    } else if (matchIdx === 0) {
                        ranked[0].reasons.unshift('✅ ' + crossref.recommendation.message);
                    }
                }
                
                // 5. Générer formulation pour le top 3
                const propositions = ranked.slice(0, 3).map(({ recipe, score, reasons }) => {
                    const formParams = { 
                        total_mass: total_mass || 200,
                        fragrance_pct: fragrance_pct || crossref.recommendation?.pct_parfum || recipe.fragrance_pct_default || 12,
                        colorant_pct: colorant_pct || 0.2,
                        temp_ajout_parfum: fdsAnalysis?.recommendations?.find(r => r.type === 'temp_ajout_parfum')?.value
                    };
                    const formulation = formulationEngine.generateFormulation(recipe, formParams);
                    return { score, reasons, formulation };
                });
                
                res.json({
                    success: true,
                    fds_analysis: fdsAnalysis,
                    crossref,
                    propositions,
                    recipes_count: recipes.length
                });
            } catch (e) {
                console.error('Formulateur error:', e.message);
                res.status(500).json({ error: e.message });
            }
        });

        // ═══ ITÉRATION FORMULATEUR ═══

        // POST /api/formulateur/choose — Choisir une proposition + raison
        app.post('/api/formulateur/choose', async (req, res) => {
            try {
                const { session_id, chosen_recipe, chosen_index, reasons, custom_note, formulation, fds_data, params } = req.body;
                
                // Save choice to formulation_sessions table
                await db.run(`INSERT OR REPLACE INTO formulation_sessions 
                    (session_id, step, recipe_code, reasons, custom_note, formulation_json, fds_json, params_json, status, created_at)
                    VALUES (?, 'choix', ?, ?, ?, ?, ?, ?, 'en_test', datetime('now'))`,
                    [session_id, chosen_recipe, JSON.stringify(reasons), custom_note || '',
                     JSON.stringify(formulation), JSON.stringify(fds_data), JSON.stringify(params)]);
                
                // Auto-learn: save choice reason to KB
                const parfumName = fds_data?.identification?.nom || params?.fragrance_name || 'Inconnu';
                const reasonText = (reasons || []).join(', ') + (custom_note ? ' — ' + custom_note : '');
                await db.run(`INSERT INTO knowledge_base (category, subcategory, title, content, source, priority, tags)
                    VALUES ('apprentissage', 'choix_formulation', ?, ?, 'Auto-apprentissage formulateur', 2, ?)`,
                    [`Choix ${chosen_recipe} pour ${parfumName}`,
                     `CHOIX FORMULATION\nParfum : ${parfumName}\nRecette choisie : ${chosen_recipe}\nRaison(s) : ${reasonText}\nDate : ${new Date().toISOString().split('T')[0]}\n\nFormulation :\n${JSON.stringify(formulation, null, 2)}`,
                     `apprentissage,choix,${chosen_recipe},${parfumName}`]);
                
                res.json({ success: true, session_id });
            } catch (e) {
                res.status(500).json({ error: e.message });
            }
        });

        // POST /api/formulateur/observe — Soumettre observations terrain
        app.post('/api/formulateur/observe', async (req, res) => {
            try {
                const { session_id, problems, observations_text, severity } = req.body;
                
                // Get session data
                const session = await db.get('SELECT * FROM formulation_sessions WHERE session_id = ? ORDER BY created_at DESC LIMIT 1', [session_id]);
                if (!session) return res.status(404).json({ error: 'Session non trouvée' });
                
                const fdsData = JSON.parse(session.fds_json || '{}');
                const params = JSON.parse(session.params_json || '{}');
                const currentFormulation = JSON.parse(session.formulation_json || '{}');
                
                // Save observation
                await db.run(`INSERT INTO formulation_sessions 
                    (session_id, step, recipe_code, reasons, custom_note, formulation_json, fds_json, params_json, status, created_at)
                    VALUES (?, 'observation', ?, ?, ?, ?, ?, ?, 'ajustement', datetime('now'))`,
                    [session_id, session.recipe_code, JSON.stringify(problems), observations_text || '',
                     session.formulation_json, session.fds_json, session.params_json]);
                
                // Auto-learn: save observation to KB
                const parfumName = fdsData?.identification?.nom || params?.fragrance_name || 'Inconnu';
                const probList = (problems || []).join(', ');
                await db.run(`INSERT INTO knowledge_base (category, subcategory, title, content, source, priority, tags)
                    VALUES ('apprentissage', 'observation_terrain', ?, ?, 'Auto-apprentissage formulateur', 3, ?)`,
                    [`Observation ${session.recipe_code} — ${parfumName}`,
                     `OBSERVATION TERRAIN\nParfum : ${parfumName}\nRecette : ${session.recipe_code}\nProblèmes : ${probList}\nDétail : ${observations_text || '—'}\nSévérité : ${severity || 'moyenne'}\nDate : ${new Date().toISOString().split('T')[0]}`,
                     `apprentissage,observation,${session.recipe_code},${probList.replace(/,\s*/g, ',')}`]);
                
                // Generate adjustment suggestions based on problems
                const adjustments = generateAdjustments(problems, currentFormulation, fdsData);
                
                // Re-propose with adjustments
                const formulationEngine = require('./modules/formulation-engine');
                const { crossFDSWithFormulations } = require('./modules/formulation-crossref');
                
                const fdsAnalysis = fdsData ? formulationEngine.analyzeFDS(fdsData) : null;
                const dbFormulations2 = await db.all(`SELECT f.name as parfum, f.fragrance_name, f.fragrance_percentage as pct_parfum, f.wick_reference as meche, f.container_type as contenant, f.code as recette, c.name as client, r.code as recipe_code FROM formulations f LEFT JOIN clients c ON f.client_id = c.id LEFT JOIN recipes r ON f.recipe_id = r.id WHERE f.status = 'validée'`);
                const dbRules2 = await db.all(`SELECT * FROM learned_rules WHERE confidence > 0.3 ORDER BY confidence DESC`);
                const crossref = crossFDSWithFormulations(fdsData, params, dbFormulations2, dbRules2);
                
                const recipes = await db.all('SELECT * FROM recipes WHERE active = 1 ORDER BY success_count DESC');
                for (const r of recipes) {
                    r.waxes = await db.all('SELECT * FROM recipe_waxes WHERE recipe_id = ?', [r.id]);
                }
                
                // Adjust params based on problems
                const adjustedParams = { ...params };
                for (const adj of adjustments) {
                    if (adj.param && adj.value !== undefined) {
                        adjustedParams[adj.param] = adj.value;
                    }
                }
                
                const ranked = formulationEngine.selectRecipe(recipes, adjustedParams, fdsAnalysis);
                const propositions = ranked.slice(0, 3).map(({ recipe, score, reasons }) => {
                    const formulation = formulationEngine.generateFormulation(recipe, {
                        total_mass: adjustedParams.total_mass || 200,
                        fragrance_pct: adjustedParams.fragrance_pct || 10,
                        colorant_pct: adjustedParams.colorant_pct || 0.2,
                        temp_ajout_parfum: fdsAnalysis?.recommendations?.find(r => r.type === 'temp_ajout_parfum')?.value
                    });
                    return { score, reasons, formulation };
                });
                
                res.json({
                    success: true,
                    adjustments,
                    crossref,
                    fds_analysis: fdsAnalysis,
                    propositions,
                    iteration: true,
                    previous_recipe: session.recipe_code,
                    problems_addressed: problems
                });
            } catch (e) {
                console.error('Observe error:', e.message);
                res.status(500).json({ error: e.message });
            }
        });

        // POST /api/formulateur/validate — Valider une formulation (succès)
        app.post('/api/formulateur/validate', async (req, res) => {
            try {
                const { session_id, final_recipe, final_formulation, success_notes } = req.body;
                
                const session = await db.get('SELECT * FROM formulation_sessions WHERE session_id = ? ORDER BY created_at DESC LIMIT 1', [session_id]);
                const fdsData = JSON.parse(session?.fds_json || '{}');
                const params = JSON.parse(session?.params_json || '{}');
                const parfumName = fdsData?.identification?.nom || params?.fragrance_name || 'Inconnu';
                
                // Count iterations
                const iterations = await db.get('SELECT COUNT(*) as cnt FROM formulation_sessions WHERE session_id = ?', [session_id]);
                
                // Save validation
                await db.run(`INSERT INTO formulation_sessions 
                    (session_id, step, recipe_code, custom_note, formulation_json, fds_json, params_json, status, created_at)
                    VALUES (?, 'validation', ?, ?, ?, ?, ?, 'validé', datetime('now'))`,
                    [session_id, final_recipe, success_notes || '',
                     JSON.stringify(final_formulation), session?.fds_json, session?.params_json]);
                
                // Auto-learn: save success to KB with high priority
                await db.run(`INSERT INTO knowledge_base (category, subcategory, title, content, source, priority, tags)
                    VALUES ('apprentissage', 'formulation_validée', ?, ?, 'Auto-apprentissage formulateur', 5, ?)`,
                    [`✅ Formulation validée : ${final_recipe} — ${parfumName}`,
                     `FORMULATION VALIDÉE\nParfum : ${parfumName}\nRecette finale : ${final_recipe}\nItérations : ${iterations?.cnt || 1}\nNotes : ${success_notes || '—'}\nDate : ${new Date().toISOString().split('T')[0]}\n\nFormulation finale :\n${JSON.stringify(final_formulation, null, 2)}`,
                     `apprentissage,validé,${final_recipe},${parfumName}`]);
                
                // Increment recipe success count
                await db.run('UPDATE recipes SET success_count = success_count + 1 WHERE code = ?', [final_recipe]);
                
                // Auto-learn: update rules if observations led to recipe change
                const allSteps = await db.all('SELECT * FROM formulation_sessions WHERE session_id = ? ORDER BY created_at', [session_id]);
                const choices = allSteps.filter(s => s.step === 'choix');
                const observations = allSteps.filter(s => s.step === 'observation');
                
                if (observations.length > 0 && choices.length > 0) {
                    const firstRecipe = choices[0].recipe_code;
                    if (firstRecipe !== final_recipe) {
                        // Recipe changed after observations → learning rule
                        const allProblems = observations.map(o => JSON.parse(o.reasons || '[]')).flat();
                        await db.run(`INSERT INTO knowledge_base (category, subcategory, title, content, source, priority, tags)
                            VALUES ('apprentissage', 'regle_apprise', ?, ?, 'Auto-apprentissage formulateur', 4, ?)`,
                            [`Règle : ${parfumName} — ${firstRecipe} → ${final_recipe}`,
                             `RÈGLE APPRISE\nParfum : ${parfumName}\nRecette initiale : ${firstRecipe}\nProblèmes rencontrés : ${allProblems.join(', ')}\nRecette finale validée : ${final_recipe}\nConclusion : Pour ce type de parfum, préférer ${final_recipe} à ${firstRecipe}.\nDate : ${new Date().toISOString().split('T')[0]}`,
                             `apprentissage,règle,${firstRecipe},${final_recipe},${parfumName}`]);
                    }
                }
                
                res.json({ success: true, iterations: iterations?.cnt || 1 });
            } catch (e) {
                res.status(500).json({ error: e.message });
            }
        });

        // GET /api/formulateur/session/:id — Historique d'une session
        app.get('/api/formulateur/session/:id', async (req, res) => {
            try {
                const steps = await db.all('SELECT * FROM formulation_sessions WHERE session_id = ? ORDER BY created_at', [req.params.id]);
                res.json(steps);
            } catch (e) {
                res.status(500).json({ error: e.message });
            }
        });

        // Helper: generate adjustments based on observed problems
        function generateAdjustments(problems, currentFormulation, fdsData) {
            const adj = [];
            const probs = problems || [];
            
            if (probs.includes('tunneling')) {
                adj.push({ 
                    type: 'meche', action: 'monter',
                    message: 'Tunneling → monter d\'une taille de mèche (ex: LX20 → LX22)',
                    param: null
                });
            }
            if (probs.includes('flamme_trop_haute')) {
                adj.push({ 
                    type: 'meche', action: 'descendre',
                    message: 'Flamme trop haute → descendre d\'une taille de mèche (ex: LX22 → LX20)',
                    param: null
                });
            }
            if (probs.includes('suie_noire')) {
                adj.push({ 
                    type: 'meche', action: 'descendre',
                    message: 'Suie → mèche trop grosse ou parfum trop haut. Descendre mèche ou réduire parfum.',
                    param: null
                });
                adj.push({
                    type: 'parfum', action: 'reduire',
                    message: 'Réduire parfum de 1-2% peut éliminer la suie',
                    param: 'fragrance_pct',
                    value: Math.max((currentFormulation.fragrance_pct || 10) - 1, 6)
                });
            }
            if (probs.includes('diffusion_faible')) {
                adj.push({ 
                    type: 'recette', action: 'changer',
                    message: 'Diffusion faible → essayer MFC-C (6213 renforcée à 38%) ou MFC-G (inversée à 49%) pour meilleur rendu olfactif',
                    param: null
                });
                adj.push({
                    type: 'parfum', action: 'augmenter',
                    message: 'Augmenter le parfum de 1-2% peut améliorer la diffusion',
                    param: 'fragrance_pct',
                    value: Math.min((currentFormulation.fragrance_pct || 10) + 1, 14)
                });
            }
            if (probs.includes('combustion_bloquee')) {
                adj.push({ 
                    type: 'recette', action: 'changer',
                    message: 'Combustion bloquée par la 6213 → basculer MFC-B (sans 6213) ou MFC-D (alcool cétylique)',
                    param: null
                });
            }
            if (probs.includes('surface_irrégulière')) {
                adj.push({ 
                    type: 'process', action: 'ajuster',
                    message: 'Surface irrégulière → vérifier température de coulage (trop froide ?) ou cure insuffisante',
                    param: null
                });
            }
            if (probs.includes('retrait_decollement')) {
                adj.push({ 
                    type: 'composition', action: 'ajuster',
                    message: 'Retrait/décollement verre → augmenter micro 2528 ou ajouter une 2e coulée',
                    param: null
                });
            }
            if (probs.includes('translucide')) {
                adj.push({ 
                    type: 'recette', action: 'changer',
                    message: 'Translucidité → due à la 6213. Basculer MFC-B (sans 6213) ou MFC-D (cétylique = opacifiant)',
                    param: null
                });
            }
            if (probs.includes('trop_mou')) {
                adj.push({ 
                    type: 'composition', action: 'ajuster',
                    message: 'Cire trop molle → augmenter 6213 ou ajouter alcool cétylique. Réduire parfum si >10%.',
                    param: null
                });
            }
            if (probs.includes('odeur_a_froid_faible')) {
                adj.push({ 
                    type: 'parfum', action: 'augmenter',
                    message: 'Pouvoir olfactif à froid faible → augmenter parfum +1-2% ou choisir recette MFC-G (inversée)',
                    param: 'fragrance_pct',
                    value: Math.min((currentFormulation.fragrance_pct || 10) + 2, 14)
                });
            }
            
            // If no specific adjustments, give generic advice
            if (adj.length === 0 && probs.length > 0) {
                adj.push({
                    type: 'general', action: 'analyser',
                    message: 'Problème signalé : ' + probs.join(', ') + '. Analyse en cours — essayer une recette alternative.',
                    param: null
                });
            }
            
            return adj;
        }
        
// POST /api/formulations/parse-excel — Parse MFC formulation Excel sheet
        app.post('/api/formulations/parse-excel', async (req, res) => {
            const excelUpload = multer({ dest: path.join(DATA_DIR, 'excel') }).single('excel');
            excelUpload(req, res, async (err) => {
                if (err) return res.status(400).json({ error: err.message });
                if (!req.file) return res.status(400).json({ error: 'Fichier Excel requis' });
                
                try {
                    const XLSX = require('xlsx');
                    const wb = XLSX.readFile(req.file.path, { cellDates: true });
                    const ws = wb.Sheets[wb.SheetNames[0]];
                    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
                    
                    const result = {
                        date: null, client: null, container_ref: null, container_mass: null,
                        fragrance_pct: null, candle_name: null, fragrance_name: null,
                        qty_ordered: null, code_mfc: null, lot_mfc: null, order_ref: null,
                        materials: [], colorants: [], wick: null, total_mass: null,
                        filename: req.file.originalname
                    };
                    
                    // Helper: normalize string for matching
                    const norm = (v) => v != null ? String(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim() : '';
                    
                    // Helper: find value to the right of a label in the same row
                    const knownLabels = ['date','client','reference','masse','parfum','designation','nombre','produire',
                                         'code','lot','commande','meche','mèche','colorant','matiere','cuve','page'];
                    const findLabel = (label) => {
                        const patterns = Array.isArray(label) ? label : [label];
                        for (let r = 0; r < rows.length; r++) {
                            const row = rows[r];
                            if (!row) continue;
                            for (let c = 0; c < row.length; c++) {
                                const cellNorm = norm(row[c]);
                                for (const pat of patterns) {
                                    if (cellNorm.includes(pat.toLowerCase())) {
                                        // Return first non-empty value to the right
                                        for (let cc = c + 1; cc < row.length; cc++) {
                                            if (row[cc] != null && String(row[cc]).trim() !== '') {
                                                return { value: row[cc], row: r, col: cc };
                                            }
                                        }
                                        // If nothing to the right, check next row — but skip if it looks like another label
                                        if (r + 1 < rows.length && rows[r+1]) {
                                            for (let cc = c; cc < Math.min(c + 3, (rows[r+1]||[]).length); cc++) {
                                                const nextVal = rows[r+1][cc];
                                                if (nextVal != null && String(nextVal).trim() !== '') {
                                                    const nextNorm = norm(nextVal);
                                                    if (knownLabels.some(l => nextNorm.includes(l))) continue;
                                                    return { value: nextVal, row: r+1, col: cc };
                                                }
                                            }
                                        }
                                        return { value: null, row: r, col: c };
                                    }
                                }
                            }
                        }
                        return null;
                    };
                    
                    // Extract identification fields by label
                    const dateF = findLabel(['date']);
                    if (dateF && dateF.value) {
                        result.date = dateF.value instanceof Date ? dateF.value.toISOString().split('T')[0] : String(dateF.value);
                    }
                    
                    const clientF = findLabel(['client']);
                    if (clientF && clientF.value) result.client = String(clientF.value).trim();
                    
                    const contRefF = findLabel(['reference du verre', 'référence du verre', 'ref du verre', 'ref verre']);
                    if (contRefF && contRefF.value) result.container_ref = String(contRefF.value).trim();
                    
                    const contMassF = findLabel(['masse du verre', 'poids du verre']);
                    if (contMassF && contMassF.value) result.container_mass = parseFloat(String(contMassF.value).replace(',','.'));
                    
                    const pctF = findLabel(['parfum en %', 'parfum en%', 'taux parfum', '% parfum']);
                    if (pctF && pctF.value) result.fragrance_pct = parseFloat(String(pctF.value).replace(',','.'));
                    
                    const nameF = findLabel(['designation bougie', 'désignation bougie']);
                    if (nameF && nameF.value) result.candle_name = String(nameF.value).trim();
                    
                    const fragNameF = findLabel(['designation parfum', 'désignation parfum']);
                    if (fragNameF && fragNameF.value) result.fragrance_name = String(fragNameF.value).trim();
                    if (!result.fragrance_name) result.fragrance_name = result.candle_name;
                    
                    const qtyF = findLabel(['nombre a produire', 'nombre à produire', 'qte a produire']);
                    if (qtyF && qtyF.value) result.qty_ordered = parseFloat(String(qtyF.value));
                    
                    const codeF = findLabel(['code article mfc', 'code article', 'code mfc']);
                    if (codeF && codeF.value) result.code_mfc = String(codeF.value).trim();
                    
                    const lotF = findLabel(['lot mfc']);
                    if (lotF && lotF.value) result.lot_mfc = String(lotF.value).trim();
                    
                    const orderF = findLabel(['commande']);
                    if (orderF && orderF.value) result.order_ref = String(orderF.value).trim();
                    
                    // Find materials block: row with headers "Matieres" + "Référence" + "%" + "Masse"
                    let matHeaderRow = -1;
                    for (let r = 0; r < rows.length; r++) {
                        const rowNorm = (rows[r]||[]).map(c => norm(c));
                        if (rowNorm.some(c => c.includes('matiere')) && rowNorm.some(c => c === '%' || c.includes('masse') || c.includes('reference'))) {
                            matHeaderRow = r;
                            break;
                        }
                    }
                    
                    if (matHeaderRow >= 0) {
                        // Detect column positions from header row
                        const hdr = rows[matHeaderRow];
                        let colName = 0, colRef = -1, colPct = -1, colMass = -1;
                        for (let c = 0; c < hdr.length; c++) {
                            const n = norm(hdr[c]);
                            if (n.includes('reference') || n.includes('référence')) colRef = c;
                            else if (n === '%') colPct = c;
                            else if (n.includes('masse') || n.includes('poids')) colMass = c;
                        }
                        
                        // Read material rows until empty or colorant/meche section
                        for (let r = matHeaderRow + 1; r < Math.min(matHeaderRow + 15, rows.length); r++) {
                            const row = rows[r];
                            if (!row) continue;
                            const nameVal = row[colName] != null ? String(row[colName]).trim() : '';
                            const refVal = colRef >= 0 && row[colRef] != null ? String(row[colRef]).trim() : '';
                            const pctVal = colPct >= 0 && row[colPct] != null ? parseFloat(String(row[colPct]).replace(',','.')) : null;
                            const massVal = colMass >= 0 && row[colMass] != null ? parseFloat(String(row[colMass]).replace(',','.')) : null;
                            
                            // Stop conditions
                            const nameNorm = norm(nameVal);
                            if (nameNorm.includes('colorant') || nameNorm.includes('meche') || nameNorm.includes('mèche')) break;
                            
                            // Total row (100%)
                            if (pctVal === 100 || (pctVal != null && pctVal >= 99.5 && massVal)) {
                                result.total_mass = massVal;
                                break;
                            }
                            
                            // Skip empty rows (only check mass — some rows have just 0 in mass column)
                            if (!nameVal && !refVal && pctVal == null && (!massVal || massVal === 0)) continue;
                            if (massVal === 0 && !nameVal && !refVal) continue;
                            
                            const isCire = nameNorm.includes('cire') || 
                                           /^\d{4}/.test(refVal) ||
                                           ['5203','6006','6213','4120','6670','4600','6003','nafol','dub','vybar','cetyl'].some(k => (nameNorm + ' ' + refVal.toLowerCase()).includes(k));
                            const isParfum = result.materials.length === 0 && !isCire; // First material = parfum
                            
                            if (nameVal || refVal || (pctVal != null && pctVal > 0)) {
                                result.materials.push({
                                    name: nameVal, reference: refVal,
                                    percentage: pctVal, mass: massVal,
                                    type: isCire ? 'cire' : (isParfum ? 'parfum' : 'matiere')
                                });
                                // Store fragrance ref separately for easy access
                                if (isParfum && refVal) result.fragrance_ref = refVal;
                            }
                        }
                    }
                    
                    // Find colorant block: row with "Colorant" header
                    let colHeaderRow = -1;
                    for (let r = 0; r < rows.length; r++) {
                        const rowNorm = (rows[r]||[]).map(c => norm(c));
                        if (rowNorm.some(c => c.includes('colorant')) && rowNorm.some(c => c.includes('reference') || c === '%' || c.includes('masse'))) {
                            colHeaderRow = r;
                            break;
                        }
                    }
                    
                    if (colHeaderRow >= 0) {
                        const hdr = rows[colHeaderRow];
                        let colName = 0, colRef = -1, colPct = -1, colMass = -1;
                        for (let c = 0; c < hdr.length; c++) {
                            const n = norm(hdr[c]);
                            if (n.includes('reference') || n.includes('référence')) colRef = c;
                            else if (n === '%') colPct = c;
                            else if (n.includes('masse') || n.includes('poids')) colMass = c;
                        }
                        
                        for (let r = colHeaderRow + 1; r < Math.min(colHeaderRow + 8, rows.length); r++) {
                            const row = rows[r];
                            if (!row) continue;
                            const nameVal = row[colName] != null ? String(row[colName]).trim() : '';
                            const nameNorm = norm(nameVal);
                            if (nameNorm.includes('meche') || nameNorm.includes('mèche')) break;
                            
                            const refVal = colRef >= 0 && row[colRef] != null ? String(row[colRef]).trim() : '';
                            const pctVal = colPct >= 0 && row[colPct] != null ? parseFloat(String(row[colPct]).replace(',','.')) : null;
                            const massVal = colMass >= 0 && row[colMass] != null ? parseFloat(String(row[colMass]).replace(',','.')) : null;
                            
                            if (massVal && massVal > 0) {
                                result.colorants.push({ name: nameVal, reference: refVal, percentage: pctVal, mass: massVal });
                            }
                        }
                    }
                    
                    // Find wick: search for "Mèche" / "Meche" label
                    const wickF = findLabel(['meche', 'mèche']);
                    if (wickF && wickF.value) {
                        const wickStr = String(wickF.value).trim();
                        const wm = wickStr.match(/(LX|HTP|ECO|CD|TDL|RRD|WEDO)\s*(\d+)/i);
                        result.wick = {
                            raw: wickStr,
                            series: wm ? wm[1].toUpperCase() : null,
                            size: wm ? parseInt(wm[2]) : null
                        };
                        const lm = wickStr.match(/(\d+)\s*MM/i);
                        if (lm) result.wick.length_mm = parseInt(lm[1]);
                    }
                    
                    // Find fragrance lot
                    const lotPF = findLabel(['lot parfum']);
                    if (lotPF && lotPF.value) result.fragrance_lot = String(lotPF.value).trim();
                    
                    console.log(`  📊 Excel MFC: ${result.candle_name || result.filename} — ${result.materials.length} matières, ${result.colorants.length} colorants, mèche: ${result.wick?.raw || '?'}`);
                    res.json({ success: true, formulation: result });
                    
                } catch(e) {
                    console.error('Excel parse error:', e.message);
                    res.status(500).json({ error: 'Erreur lecture Excel: ' + e.message });
                }
            });
        });

        // POST /api/formulateur/parse-and-analyze — Upload FDS PDF + analyze in one step
        app.post('/api/formulateur/parse-and-analyze', async (req, res) => {
            if (!pythonCmd) return res.status(500).json({ error: 'Python non trouvé' });
            
            // Expects: multipart with 'fds' file + form fields
            const multerSingle = multer({ dest: fdsDir }).single('fds');
            multerSingle(req, res, async (err) => {
                if (err) return res.status(400).json({ error: err.message });
                if (!req.file) return res.status(400).json({ error: 'Fichier FDS requis' });
                
                try {
                    const { execSync } = require('child_process');
                    const parserPath = path.join(__dirname, 'modules', 'fds-parser.py');
                    const cmd = `${pythonCmd} "${parserPath}" "${req.file.path}"`;
                    
                    // Execute with explicit UTF-8 env
                    const output = execSync(cmd, { 
                        maxBuffer: 50 * 1024 * 1024,
                        env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
                    });
                    
                    // output is a Buffer, decode as UTF-8
                    const text = output.toString('utf-8');
                    
                    const marker = '---JSON_START---';
                    const jsonStart = text.indexOf(marker);
                    if (jsonStart === -1) {
                        console.error('[FDS] Pas de marqueur JSON. Output:', text.substring(0, 500));
                        return res.status(500).json({ error: 'Extraction impossible — le parseur n\'a pas retourné de données' });
                    }
                    
                    const jsonStr = text.substring(jsonStart + marker.length).trim();
                    if (!jsonStr) {
                        return res.status(500).json({ error: 'Données FDS vides après extraction' });
                    }
                    
                    const fdsResults = JSON.parse(jsonStr);
                    const fdsData = fdsResults[0];
                    
                    // ═══ Auto-créer parfum dans fragrances si inexistant ═══
                    const fdsId = fdsData.identification || {};
                    const fdsNom = (fdsId.nom || fdsId.name || '').trim();
                    const fdsCode = (fdsId.code || fdsId.reference || '').trim();
                    const fdsFournisseur = (fdsId.fournisseur || fdsId.supplier || '').trim();
                    const fdsProps = fdsData.proprietes_physiques || {};
                    const fdsFp = parseFloat(String(fdsProps.flash_point_c || fdsProps.flash_point || '').replace(/[<>°C\s]/g, ''));
                    let autoFragId = null;
                    
                    if (fdsNom) {
                        const existing = await db.get('SELECT id FROM fragrances WHERE UPPER(name) = ?', [fdsNom.toUpperCase()]);
                        if (existing) {
                            autoFragId = existing.id;
                            // Mettre à jour flash point si absent
                            if (!isNaN(fdsFp)) {
                                await db.run('UPDATE fragrances SET flash_point = ? WHERE id = ? AND flash_point IS NULL', [fdsFp, autoFragId]);
                            }
                        } else {
                            // Résoudre fournisseur
                            let suppId = null;
                            if (fdsFournisseur) {
                                const sup = await db.get('SELECT id FROM suppliers WHERE UPPER(name) LIKE ?', ['%' + fdsFournisseur.toUpperCase() + '%']);
                                if (sup) suppId = sup.id;
                                else { const r = await db.run('INSERT INTO suppliers (name,country,specialty) VALUES (?,?,?)', [fdsFournisseur, 'France', 'Parfums']); suppId = r.lastInsertRowid; }
                            }
                            const fragR = await db.run('INSERT INTO fragrances (supplier_id, reference, name, flash_point) VALUES (?,?,?,?)',
                                [suppId, fdsCode || null, fdsNom, isNaN(fdsFp) ? null : fdsFp]);
                            autoFragId = fragR.lastInsertRowid;
                            
                            // Insérer composants
                            const comps = fdsData.composition?.composants || fdsData.composition || [];
                            for (const c of comps) {
                                const _cas = c.cas || c.cas_number || null;
                                await db.run('INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max, flash_point) VALUES (?,?,?,?,?,?)',
                                    [autoFragId, _cas, sanitizeComponentName(c.nom || c.nom_chimique || c.name || '?', _cas),
                                     c.pourcentage_min ?? c.percentage_min ?? null, c.pourcentage_max ?? c.percentage_max ?? null, c.flash_point || (_cas ? _MOL_FP[_cas] : null) || null]);
                            }
                        }
                    }
                    
                    // Analyze
                    const fdsAnalysis = formulationEngine.analyzeFDS(fdsData);
                    
                    // Crossref FDS × formulations
                    const dbFormulations3 = await db.all(`SELECT f.name as parfum, f.fragrance_name, f.fragrance_percentage as pct_parfum, f.wick_reference as meche, f.container_type as contenant, f.code as recette, c.name as client, r.code as recipe_code FROM formulations f LEFT JOIN clients c ON f.client_id = c.id LEFT JOIN recipes r ON f.recipe_id = r.id WHERE f.status = 'validée'`);
                    const dbRules3 = await db.all(`SELECT * FROM learned_rules WHERE confidence > 0.3 ORDER BY confidence DESC`);
                    const crossref = crossFDSWithFormulations(fdsData, {
                        fragrance_name: req.body.fragrance_name || '',
                        candle_type: req.body.candle_type || 'container',
                        fragrance_pct: parseFloat(req.body.fragrance_pct) || null,
                        vegetal: (req.body.candle_type || '').includes('végétal')
                    }, dbFormulations3, dbRules3);
                    
                    // Get recipes
                    const recipes = await db.all('SELECT * FROM recipes WHERE active = 1');
                    for (const r of recipes) {
                        r.waxes = await db.all('SELECT * FROM recipe_waxes WHERE recipe_id = ?', [r.id]);
                    }
                    
                    const params = {
                        candle_type: req.body.candle_type || 'container',
                        diameter: parseInt(req.body.diameter) || null,
                        height: parseInt(req.body.height) || null,
                        fragrance_pct: parseFloat(req.body.fragrance_pct) || null,
                        total_mass: parseFloat(req.body.total_mass) || 200
                    };
                    
                    const ranked = formulationEngine.selectRecipe(recipes, params, fdsAnalysis);
                    
                    // Boost by crossref
                    if (crossref.recommendation && crossref.recommendation.recette) {
                        const matchIdx = ranked.findIndex(r => r.recipe.code === crossref.recommendation.recette);
                        if (matchIdx > 0) {
                            const match = ranked.splice(matchIdx, 1)[0];
                            match.score += 50;
                            match.reasons.unshift('✅ ' + crossref.recommendation.message);
                            ranked.unshift(match);
                        }
                    }
                    
                    const propositions = ranked.slice(0, 3).map(({ recipe, score, reasons }) => {
                        const formulation = formulationEngine.generateFormulation(recipe, {
                            ...params,
                            temp_ajout_parfum: fdsAnalysis?.recommendations?.find(r => r.type === 'temp_ajout_parfum')?.value
                        });
                        return { score, reasons, formulation };
                    });
                    
                    // Archive FDS PDF dans mfc-data/fds/
                    const safeName = (fdsData.identification?.nom || req.file.originalname || 'fds')
                        .replace(/[^a-zA-Z0-9àâäéèêëïîôùûüÿçÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ\s\-_.]/g, '')
                        .replace(/\s+/g, '_')
                        .substring(0, 80) + '.pdf';
                    archiveFile(req.file.path, 'fds', safeName);
                    
                    // Cleanup temp file
                    try { fs.unlinkSync(req.file.path); } catch(e) {}
                    
                    // Profil moléculaire (molecule-engine)
                    const fdsComps = fdsData.composition?.composants || fdsData.composition || [];
                    let moleculeProfile = null;
                    if (fdsComps.length) {
                        try {
                            const { analyzeFragranceProfile } = require('./modules/molecule-engine');
                            moleculeProfile = analyzeFragranceProfile(fdsComps, {
                                fragrance_name: fdsNom,
                                candle_type: req.body.candle_type || 'container',
                                diameter: parseInt(req.body.diameter) || null,
                                fragrance_pct: parseFloat(req.body.fragrance_pct) || null
                            });
                        } catch(e2) { console.error('[Molecule] Erreur profil:', e2.message); }
                    }
                    
                    res.json({
                        success: true,
                        fds: fdsData,
                        fds_analysis: fdsAnalysis,
                        crossref,
                        propositions,
                        fragrance_id: autoFragId,
                        molecule_profile: moleculeProfile,
                    });
                } catch (e) {
                    try { fs.unlinkSync(req.file.path); } catch(e2) {}
                    console.error('[FDS] Erreur parse-and-analyze:', e.message);
                    res.status(500).json({ error: e.message });
                }
            });
        });

        // ═══════════════════════════════════════════
        // TABLEAU DE BORD R&D + RECHERCHE UNIFIÉE
        // ═══════════════════════════════════════════

        // GET /api/dashboard — Stats globales R&D
        app.get('/api/dashboard', async (req, res) => {
            try {
                const d = {};
                
                // Compteurs (format attendu par index.html)
                d.counts = {
                    samples: (await db.get('SELECT COUNT(*) as c FROM samples')).c,
                    formulations: (await db.get('SELECT COUNT(*) as c FROM formulations')).c,
                    tests: (await db.get('SELECT COUNT(*) as c FROM burn_tests')).c,
                    clients: (await db.get('SELECT COUNT(*) as c FROM clients')).c,
                    knowledge: (await db.get('SELECT COUNT(*) as c FROM knowledge_base')).c,
                    recipes: (await db.get("SELECT COUNT(*) as c FROM knowledge_base WHERE category = 'Recettes MFC'")).c,
                    fragrances: (await db.get('SELECT COUNT(*) as c FROM fragrances')).c,
                    waxes: (await db.get('SELECT COUNT(*) as c FROM waxes')).c,
                    wicks: (await db.get('SELECT COUNT(*) as c FROM wicks')).c,
                    colorants: (await db.get('SELECT COUNT(*) as c FROM colorants')).c,
                    molecules: (await db.get("SELECT COUNT(*) as c FROM knowledge_base WHERE category = 'molecule_db'")).c,
                    fds: (await db.get("SELECT COUNT(*) as c FROM knowledge_base WHERE category = 'fds_parfum'")).c,
                    cas_in_fds: (await db.get("SELECT COUNT(DISTINCT cas_number) as c FROM fragrance_components WHERE cas_number IS NOT NULL AND cas_number != ''")).c,
                    cas_in_engine: Object.keys(require('./modules/molecule-engine').MOLECULE_DB).length
                };
                
                // Statuts
                d.samples_by_status = await db.all('SELECT status, COUNT(*) as count FROM samples GROUP BY status');
                d.formulations_by_status = await db.all('SELECT status, COUNT(*) as count FROM formulations GROUP BY status');
                d.tests_by_status = await db.all('SELECT status, COUNT(*) as count FROM burn_tests GROUP BY status');
                
                // Taux validation
                const validCount = (await db.get("SELECT COUNT(*) as c FROM formulations WHERE status = 'validé'")).c;
                d.validation_rate = d.counts.formulations > 0 ? Math.round(validCount / d.counts.formulations * 100) : 0;
                
                // KB catégories
                d.kb_by_category = await db.all('SELECT category, COUNT(*) as count FROM knowledge_base GROUP BY category');
                
                // Échantillons en attente
                d.pending_samples = await db.all(`
                    SELECT s.sample_number, s.fragrance_name, s.status, c.name as client_name
                    FROM samples s LEFT JOIN clients c ON s.client_id = c.id
                    WHERE s.status IN ('demande','en_cours','en_attente')
                    ORDER BY s.id DESC LIMIT 10
                `);
                
                // Tests actifs
                d.active_tests = await db.all(`
                    SELECT t.test_number, f.code as formulation_code, f.name as formulation_name, 
                           f.fragrance_name, t.total_burn_time, t.status
                    FROM burn_tests t 
                    LEFT JOIN formulations f ON t.formulation_id = f.id
                    WHERE t.status IN ('en_cours','planifié')
                    ORDER BY t.id DESC LIMIT 10
                `);
                
                // Top parfums (par nb formulations)
                d.top_fragrances = await db.all(`
                    SELECT COALESCE(f.fragrance_name, f.fragrance_ref, '?') as name, 
                           f.fragrance_percentage as pct, COUNT(f.id) as count
                    FROM formulations f 
                    WHERE f.fragrance_ref IS NOT NULL AND f.fragrance_ref != ''
                    GROUP BY UPPER(COALESCE(f.fragrance_name, f.fragrance_ref))
                    ORDER BY count DESC LIMIT 10
                `);
                
                // Top clients
                d.top_clients = await db.all(`
                    SELECT c.name, COUNT(f.id) as count 
                    FROM formulations f JOIN clients c ON f.client_id = c.id 
                    GROUP BY c.id ORDER BY count DESC LIMIT 10
                `);
                
                // Activité récente (échantillons + formulations + tests combinés)
                const recentSamples = await db.all(`
                    SELECT 'echantillon' as type, sample_number as code, fragrance_name as detail, created_at, status
                    FROM samples ORDER BY created_at DESC LIMIT 10
                `);
                const recentFormulations = await db.all(`
                    SELECT 'formulation' as type, code, name as detail, created_at, status
                    FROM formulations ORDER BY created_at DESC LIMIT 10
                `);
                const recentTests = await db.all(`
                    SELECT 'test' as type, test_number as code, conclusion as detail, created_at, status
                    FROM burn_tests ORDER BY created_at DESC LIMIT 10
                `);
                d.recent_activity = [...recentSamples, ...recentFormulations, ...recentTests]
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                    .slice(0, 20);
                
                // ─── NOUVELLES STATS R&D ───
                
                // Top cires (par usage)
                d.top_waxes = await db.all(`
                    SELECT w.reference, w.name, COUNT(fw.id) as count, 
                           ROUND(AVG(fw.percentage), 1) as avg_pct
                    FROM formulation_waxes fw JOIN waxes w ON fw.wax_id = w.id
                    WHERE fw.wax_id > 0
                    GROUP BY fw.wax_id ORDER BY count DESC LIMIT 10
                `);
                
                // Top mèches
                d.top_wicks = await db.all(`
                    SELECT wick_reference as name, COUNT(*) as count
                    FROM formulations WHERE wick_reference IS NOT NULL AND wick_reference != ''
                    GROUP BY UPPER(wick_reference) ORDER BY count DESC LIMIT 10
                `);
                
                // Distribution % parfum
                d.fragrance_pct_distrib = await db.all(`
                    SELECT fragrance_percentage as pct, COUNT(*) as count
                    FROM formulations WHERE fragrance_percentage IS NOT NULL
                    GROUP BY fragrance_percentage ORDER BY pct
                `);
                
                // Formulations récentes détaillées
                d.recent_formulations = await db.all(`
                    SELECT f.id, f.code, f.name, c.name as client, 
                           f.fragrance_ref, f.fragrance_percentage, f.wick_reference,
                           f.total_mass as masse_verre, f.status
                    FROM formulations f LEFT JOIN clients c ON f.client_id = c.id
                    ORDER BY f.id DESC LIMIT 20
                `);
                
                res.json(d);
            } catch (e) {
                res.status(500).json({ error: e.message });
            }
        });

        // [SUPPRIMÉ fix5] Route dupliquée /api/search — la version plate avec icônes (L4025) est active

        // GET /api/formulation/:id/full — Détail complet d'une formulation (pour export)
        app.get('/api/formulation/:id/full', async (req, res) => {
            try {
                const f = await db.get(`
                    SELECT f.*, c.name as client_name, c.brand as client_brand
                    FROM formulations f LEFT JOIN clients c ON f.client_id = c.id
                    WHERE f.id = ?
                `, [req.params.id]);
                if (!f) return res.status(404).json({ error: 'Formulation non trouvée' });
                
                // Cires de la formulation
                f.waxes = await db.all(`
                    SELECT fw.percentage, fw.mass, w.reference, w.name, w.type, w.sub_type,
                           w.congealing_point_min, w.congealing_point_max, s.name as supplier
                    FROM formulation_waxes fw 
                    LEFT JOIN waxes w ON fw.wax_id = w.id 
                    LEFT JOIN suppliers s ON w.supplier_id = s.id
                    WHERE fw.formulation_id = ?
                `, [req.params.id]);
                
                // Parfum lié (FDS)
                if (f.fragrance_id) {
                    f.fragrance = await db.get('SELECT * FROM fragrances WHERE id = ?', [f.fragrance_id]);
                    if (f.fragrance) {
                        f.fragrance.components = await db.all(
                            'SELECT * FROM fragrance_components WHERE fragrance_id = ? ORDER BY percentage_max DESC',
                            [f.fragrance_id]);
                    }
                }
                
                // Tests de combustion liés
                f.tests = await db.all('SELECT * FROM burn_tests WHERE formulation_id = ? ORDER BY created_at DESC', [req.params.id]);
                
                res.json(f);
            } catch (e) {
                res.status(500).json({ error: e.message });
            }
        });

// ═══════════════════════════════════════════════════════════
// API : Analytics R&D avancés
// ═══════════════════════════════════════════════════════════
app.get('/api/analytics', async (req, res) => {
    try {
        const data = {};

        // KB par catégorie
        data.kb_categories = await db.all('SELECT category, COUNT(*) as count FROM knowledge_base GROUP BY category ORDER BY count DESC');

        // Cires par type
        data.wax_types = await db.all('SELECT type, COUNT(*) as count FROM waxes WHERE active=1 GROUP BY type ORDER BY count DESC');

        // Mèches par série
        data.wick_series = await db.all('SELECT series, COUNT(*) as count FROM wicks WHERE active=1 GROUP BY series ORDER BY count DESC');

        // Colorants avec alertes sécurité
        data.colorant_safety = await db.all(`
            SELECT name, reference, series, form,
                   (COALESCE(hazard_h315,0) + COALESCE(hazard_h317,0) + COALESCE(hazard_h319,0)) > 0 as has_hazard,
                   flash_point, density
            FROM colorants WHERE active=1 ORDER BY name
        `);

        // Distribution points de congélation cires
        data.congealing_distribution = await db.all(`
            SELECT 
                CASE 
                    WHEN congealing_point_min < 50 THEN '< 50°C'
                    WHEN congealing_point_min < 54 THEN '50-53°C'
                    WHEN congealing_point_min < 58 THEN '54-57°C'
                    WHEN congealing_point_min < 62 THEN '58-61°C'
                    WHEN congealing_point_min < 66 THEN '62-65°C'
                    ELSE '≥ 66°C'
                END as range,
                COUNT(*) as count
            FROM waxes WHERE congealing_point_min IS NOT NULL AND active=1
            GROUP BY range ORDER BY MIN(congealing_point_min)
        `);

        // Points éclair parfums
        data.flash_points = await db.all(`
            SELECT name, flash_point FROM fragrances 
            WHERE flash_point IS NOT NULL AND flash_point > 0 AND active=1
            ORDER BY flash_point
        `);

        // Nombre FDS
        const fdsCount = await db.get("SELECT COUNT(*) as c FROM fragrances WHERE active=1");
        data.fds_count = fdsCount?.c || 0;

        // Matrice fournisseurs
        data.supplier_matrix = await db.all(`
            SELECT s.id, s.name, s.country, s.specialty,
                   (SELECT COUNT(*) FROM waxes w WHERE w.supplier_id = s.id AND w.active=1) as wax_count,
                   (SELECT COUNT(*) FROM fragrances f WHERE f.supplier_id = s.id AND f.active=1) as fragrance_count,
                   (SELECT COUNT(*) FROM colorants c WHERE c.supplier_id = s.id AND c.active=1) as colorant_count
            FROM suppliers s ORDER BY s.name
        `);

        // Composants FDS par famille chimique (approximation par mots-clés)
        const components = await db.all('SELECT name, cas_number FROM fragrance_components');
        const families = {};
        for (const c of components) {
            const n = (c.name || '').toLowerCase();
            let family = 'Autre';
            if (n.includes('linalol') || n.includes('geraniol') || n.includes('citronellol') || n.includes('alcool') || n.includes('ol ')) family = 'Alcools terpéniques';
            else if (n.includes('limonene') || n.includes('pinene') || n.includes('terpene')) family = 'Terpènes';
            else if (n.includes('aldéhyde') || n.includes('aldehyde') || n.includes('citral') || n.includes('hexanal')) family = 'Aldéhydes';
            else if (n.includes('coumarin') || n.includes('lactone') || n.includes('ester') || n.includes('acétate') || n.includes('acetate') || n.includes('benzoate')) family = 'Esters / Lactones';
            else if (n.includes('vanill') || n.includes('eugenol') || n.includes('cinnamal')) family = 'Phénols / Épices';
            else if (n.includes('musk') || n.includes('galaxolide') || n.includes('cashmeran') || n.includes('ionone') || n.includes('iso e')) family = 'Muscs / Boisés';
            else if (n.includes('dpg') || n.includes('dipropylene') || n.includes('propylene glycol') || n.includes('diethyl') || n.includes('dpm')) family = 'Solvants';
            else if (n.includes('ipm') || n.includes('isopropyl myristate')) family = 'Solvants (IPM)';
            families[family] = (families[family] || 0) + 1;
        }
        data.component_families = Object.entries(families).map(([family, count]) => ({ family, count })).sort((a, b) => b.count - a.count);

        // Parfums par fournisseur
        data.fragrances_by_supplier = await db.all(`
            SELECT s.name as supplier, COUNT(*) as count
            FROM fragrances f JOIN suppliers s ON f.supplier_id = s.id
            WHERE f.active=1
            GROUP BY s.id ORDER BY count DESC
        `);

        // Corrélations (données de base, s'enrichissent avec les tests)
        const formWithFds = await db.get("SELECT COUNT(*) as c FROM formulations WHERE fragrance_ref IS NOT NULL AND fragrance_ref != ''");
        const testsCount = await db.get("SELECT COUNT(*) as c FROM burn_tests");
        data.correlations = {
            formulations_with_fds: formWithFds?.c || 0,
            tests_count: testsCount?.c || 0
        };

        // Alerte DPG
        const dpgComponents = await db.all("SELECT DISTINCT name FROM fragrance_components WHERE UPPER(name) LIKE '%DPG%' OR UPPER(name) LIKE '%DIPROPYLENE%'");
        if (dpgComponents.length > 0) {
            data.dpg_alert = `${dpgComponents.length} composant(s) DPG détecté(s) dans les FDS analysées. MFC interdit le DPG — vérifier les parfums concernés.`;
        }

        res.json(data);
    } catch (e) {
        console.error('Analytics error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

app.listen(PORT, '0.0.0.0', async () => {
            // Charger les molécules KB dans MOLECULE_DB en mémoire
            try {
                const kbMols = await db.all("SELECT content FROM knowledge_base WHERE category = 'molecule_db'");
                let loaded = 0;
                for (const row of kbMols) {
                    try {
                        const mol = JSON.parse(row.content);
                        if (mol.cas && !MOLECULE_DB_FULL[mol.cas]) {
                            MOLECULE_DB_FULL[mol.cas] = {
                                name: mol.name || '', mw: mol.molecular_weight || mol.mw || null,
                                bp: mol.boiling_point || mol.bp || null, fp: mol.flash_point || mol.fp || null,
                                family: mol.family || '', volatility: mol.volatility || '',
                                odor: mol.odor || '', logP: mol.logP || null
                            };
                            loaded++;
                        }
                    } catch(e) {}
                }
                if (loaded > 0) console.log(`  → KB enrichment: ${loaded} molécules chargées depuis knowledge_base`);
            } catch(e) { console.error('KB molecule load error:', e.message); }

            // Detect local IP for network access
            const os = require('os');
            const nets = os.networkInterfaces();
            let localIP = 'localhost';
            for (const iface of Object.values(nets)) {
                for (const net of iface) {
                    if (net.family === 'IPv4' && !net.internal) { localIP = net.address; break; }
                }
            }
            console.log('');
            console.log(`✓ Serveur démarré !`);
            console.log(`  → PC       : http://localhost:${PORT}`);
            console.log(`  → Réseau   : http://${localIP}:${PORT}`);
            console.log(`  → Android  : ouvrir http://${localIP}:${PORT} dans Chrome`);
            console.log('');
            console.log('');
            console.log('Modules disponibles:');
            console.log('  - Clients');
            console.log('  - Échantillons');
            console.log('  - Formulations');
            console.log('  - Tests de combustion');
            console.log('  - Matières premières (cires, mèches, colorants, parfums)');
            console.log('  - Base de connaissances');
            console.log('  - Assistant IA');
            console.log('');
            console.log('Routes API:');
            console.log('  /api/clients, /api/suppliers');
            console.log('  /api/samples, /api/formulations');
            console.log('  /api/burn-tests, /api/burn-tests/:id/cycles');
            console.log('  /api/waxes, /api/wicks, /api/colorants, /api/fragrances');
            console.log('  /api/knowledge, /api/assistant');
            console.log('  /api/stats');
            console.log('');
        });
    } catch (error) {
        console.error('Erreur au démarrage:', error);
        process.exit(1);
    }
}

start();

// ═══════ DELETE ROUTES FOR MATERIALS ═══════
app.delete('/api/waxes/:id', async (req, res) => {
    try { await db.run('DELETE FROM waxes WHERE id = ?', [req.params.id]); res.json({ success: true }); }
    catch(e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/wicks/:id', async (req, res) => {
    try { await db.run('DELETE FROM wicks WHERE id = ?', [req.params.id]); res.json({ success: true }); }
    catch(e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/colorants/:id', async (req, res) => {
    try { await db.run('DELETE FROM colorants WHERE id = ?', [req.params.id]); res.json({ success: true }); }
    catch(e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/fragrances/:id', async (req, res) => {
    try { await db.run('DELETE FROM fragrances WHERE id = ?', [req.params.id]); res.json({ success: true }); }
    catch(e) { res.status(500).json({ error: e.message }); }
});

// ============================================
// MODULE FDS — Composants parfum & Analyse
// ============================================

// CRUD composants d'un parfum
app.get('/api/fragrances/:id/components', async (req, res) => {
    try {
        const rows = await db.all('SELECT * FROM fragrance_components WHERE fragrance_id = ? ORDER BY percentage_max DESC', [req.params.id]);
        res.json(rows);
    } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/fragrances/:id/components', async (req, res) => {
    try {
        const { cas_number, name, inci_name, percentage_min, percentage_max, flash_point: fp_input,
                component_type, solubility_wax, volatility, risk_phrases, notes } = req.body;
        if (!name) return res.status(400).json({ error: 'Nom du composant requis' });
        const flash_point = fp_input ?? (cas_number ? _MOL_FP[cas_number] : null) ?? null;

        // Auto-detect solubility for known solvents
        let solub = solubility_wax || 'unknown';
        const nameLow = (name || '').toLowerCase();
        const casNum = cas_number || '';
        if (nameLow.includes('dipropylene glycol') || nameLow.includes('dpg') || casNum === '25265-71-8') solub = 'insoluble';
        if (nameLow.includes('propylene glycol') || casNum === '57-55-6') solub = 'insoluble';
        if (nameLow.includes('isopropyl myristate') || nameLow.includes('ipm') || casNum === '110-27-0') solub = 'soluble';
        if (nameLow.includes('benzyl benzoate') || casNum === '120-51-4') solub = 'soluble';
        if (nameLow.includes('diethyl phthalate') || nameLow.includes('dep') || casNum === '84-66-2') solub = 'partial';
        if (nameLow.includes('triethyl citrate') || casNum === '77-93-0') solub = 'soluble';

        const result = await db.run(
            `INSERT INTO fragrance_components (fragrance_id, cas_number, name, inci_name,
                percentage_min, percentage_max, flash_point, component_type,
                solubility_wax, volatility, risk_phrases, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.params.id, cas_number, name, inci_name, percentage_min, percentage_max,
             flash_point, component_type || 'ingredient', solub, volatility, risk_phrases, notes]);
        res.json({ id: result.lastInsertRowid, success: true, solubility_wax: solub });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/fragrances/:id/components/:cid', async (req, res) => {
    try {
        const { cas_number, name, inci_name, percentage_min, percentage_max, flash_point,
                component_type, solubility_wax, volatility, risk_phrases, notes } = req.body;
        await db.run(
            `UPDATE fragrance_components SET cas_number=?, name=?, inci_name=?, percentage_min=?,
                percentage_max=?, flash_point=?, component_type=?, solubility_wax=?,
                volatility=?, risk_phrases=?, notes=? WHERE id=?`,
            [cas_number, name, inci_name, percentage_min, percentage_max, flash_point,
             component_type, solubility_wax, volatility, risk_phrases, notes, req.params.cid]);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/fragrances/:id/components/:cid', async (req, res) => {
    try { await db.run('DELETE FROM fragrance_components WHERE id = ?', [req.params.cid]); res.json({ success: true }); }
    catch(e) { res.status(500).json({ error: e.message }); }
});

// Analyse automatique FDS → recommandations
// Analyse batch — Générer les profils pour tous les parfums qui n'en ont pas encore
app.post('/api/fragrances/analyze-all', async (req, res) => {
    try {
        const fragrances = await db.all(`
            SELECT f.id, f.name FROM fragrances f 
            JOIN fragrance_components fc ON fc.fragrance_id = f.id
            WHERE f.id NOT IN (SELECT DISTINCT fragrance_id FROM fragrance_analyses)
            GROUP BY f.id
        `);
        
        let done = 0, errors = [];
        for (const frag of fragrances) {
            try {
                const components = await db.all('SELECT * FROM fragrance_components WHERE fragrance_id = ? ORDER BY percentage_max DESC', [frag.id]);
                if (!components.length) continue;

                // Même logique que POST /api/fragrances/:id/analyze
                const analysis = { solvent_carrier: null, solvent_percentage: 0, wax_compatibility: 'bonne',
                    combustion_risk: 'normal', diffusion_profile: 'équilibré', recommended_temp_max: null,
                    warnings: [], recommendations: [], component_breakdown: { solvents: [], actives: [], allergens: [] } };
                
                let totalInsoluble = 0, lowestFlashPoint = 999, lightMolecules = 0, heavyMolecules = 0;
                for (const c of components) {
                    const pct = c.percentage_max || c.percentage_min || 0;
                    const name = (c.name || '').toLowerCase();
                    if (name.includes('dipropylene glycol') || name.includes('dpg') || c.cas_number === '25265-71-8') {
                        analysis.solvent_carrier = 'DPG'; analysis.solvent_percentage += pct;
                        analysis.component_breakdown.solvents.push({ name: c.name, pct, cas: c.cas_number });
                    } else if (name.includes('isopropyl myristate') || name.includes('ipm') || c.cas_number === '110-27-0') {
                        analysis.solvent_carrier = 'IPM'; analysis.solvent_percentage += pct;
                        analysis.component_breakdown.solvents.push({ name: c.name, pct, cas: c.cas_number });
                    } else {
                        analysis.component_breakdown.actives.push({ name: c.name, pct, cas: c.cas_number });
                    }
                    if (c.solubility_wax === 'insoluble') totalInsoluble += pct;
                    if (c.flash_point && c.flash_point < lowestFlashPoint) lowestFlashPoint = c.flash_point;
                    if (c.volatility === 'haute' || (c.flash_point && c.flash_point < 65)) lightMolecules += pct;
                    if (c.volatility === 'basse' || (c.flash_point && c.flash_point > 100)) heavyMolecules += pct;
                    if (c.risk_phrases && (c.risk_phrases.includes('H317') || c.risk_phrases.includes('allergisant'))) {
                        analysis.component_breakdown.allergens.push({ name: c.name, pct, cas: c.cas_number });
                    }
                }
                if (totalInsoluble > 20) { analysis.wax_compatibility = 'mauvaise'; analysis.combustion_risk = 'élevé'; }
                else if (totalInsoluble > 10) { analysis.wax_compatibility = 'moyenne'; }
                if (lowestFlashPoint < 999) analysis.recommended_temp_max = Math.max(45, lowestFlashPoint - 10);
                if (lightMolecules > 40) analysis.diffusion_profile = 'volatil — fort cold throw, s\'épuise vite';
                else if (heavyMolecules > 40) analysis.diffusion_profile = 'lourd — faible cold throw, bonne tenue';

                await db.run(
                    `INSERT INTO fragrance_analyses (fragrance_id, analysis_type, solvent_carrier, solvent_percentage,
                        wax_compatibility, combustion_risk, diffusion_profile, recommended_temp_max,
                        recommended_wick_adjustment, recommended_additive_adjustment, warnings, analysis_notes)
                     VALUES (?, 'auto-batch', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [frag.id, analysis.solvent_carrier, analysis.solvent_percentage,
                     analysis.wax_compatibility, analysis.combustion_risk, analysis.diffusion_profile,
                     analysis.recommended_temp_max,
                     analysis.recommendations.filter(r => r.includes('mèche')).join('; ') || null,
                     analysis.recommendations.filter(r => r.includes('alcool') || r.includes('additif')).join('; ') || null,
                     JSON.stringify(analysis.warnings), JSON.stringify(analysis.recommendations)]
                );
                done++;
            } catch(e) { errors.push({ id: frag.id, name: frag.name, error: e.message }); }
        }
        
        res.json({ analyzed: done, errors: errors.length, total: fragrances.length, error_details: errors.slice(0, 10) });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/fragrances/:id/analyze', async (req, res) => {
    try {
        const fragrance = await db.get('SELECT * FROM fragrances WHERE id = ?', [req.params.id]);
        if (!fragrance) return res.status(404).json({ error: 'Parfum non trouvé' });

        const components = await db.all('SELECT * FROM fragrance_components WHERE fragrance_id = ? ORDER BY percentage_max DESC', [req.params.id]);
        if (!components.length) return res.json({ warning: 'Aucun composant saisi — ajoutez les données FDS d\'abord' });

        const analysis = {
            fragrance_name: fragrance.name,
            fragrance_ref: fragrance.reference,
            total_components: components.length,
            solvent_carrier: null,
            solvent_percentage: 0,
            wax_compatibility: 'bonne',
            combustion_risk: 'faible',
            diffusion_profile: 'équilibré',
            recommended_temp_max: fragrance.flash_point || 65,
            warnings: [],
            recommendations: [],
            component_breakdown: { solvents: [], actives: [], allergens: [] }
        };

        let totalInsoluble = 0;
        let lowestFlashPoint = 999;
        let heavyMolecules = 0;
        let lightMolecules = 0;

        for (const c of components) {
            const pct = c.percentage_max || c.percentage_min || 0;
            const nameLow = (c.name || '').toLowerCase();

            // Classify
            if (c.component_type === 'solvent' || nameLow.includes('glycol') || nameLow.includes('dpg') ||
                nameLow.includes('ipm') || nameLow.includes('isopropyl myristate') || nameLow.includes('dep')) {
                analysis.component_breakdown.solvents.push({ name: c.name, pct, solubility: c.solubility_wax });
                if (!analysis.solvent_carrier || pct > analysis.solvent_percentage) {
                    analysis.solvent_carrier = c.name;
                    analysis.solvent_percentage = pct;
                }
            } else {
                analysis.component_breakdown.actives.push({ name: c.name, pct, cas: c.cas_number });
            }

            // Track insolubles
            if (c.solubility_wax === 'insoluble') totalInsoluble += pct;

            // Track flash points
            if (c.flash_point && c.flash_point < lowestFlashPoint) lowestFlashPoint = c.flash_point;

            // Volatility
            if (c.volatility === 'haute' || (c.flash_point && c.flash_point < 65)) lightMolecules += pct;
            if (c.volatility === 'basse' || (c.flash_point && c.flash_point > 100)) heavyMolecules += pct;

            // Allergens
            if (c.risk_phrases && (c.risk_phrases.includes('H317') || c.risk_phrases.includes('allergisant'))) {
                analysis.component_breakdown.allergens.push({ name: c.name, pct, cas: c.cas_number });
            }
        }

        // === ANALYSE SOLUBILITÉ ===
        if (totalInsoluble > 20) {
            analysis.wax_compatibility = 'mauvaise';
            analysis.warnings.push('⚠️ CRITIQUE : ' + totalInsoluble.toFixed(0) + '% de composants insolubles dans la cire (DPG/PG). Risque élevé de suintage, séparation de phase, mauvaise combustion.');
            analysis.recommendations.push('Demander au fournisseur une version sur base IPM ou ester au lieu de DPG/PG.');
            analysis.recommendations.push('Si impossible, réduire le % de parfum dans la formulation pour limiter l\'insoluble total.');
        } else if (totalInsoluble > 10) {
            analysis.wax_compatibility = 'moyenne';
            analysis.warnings.push('⚠️ ' + totalInsoluble.toFixed(0) + '% de composants insolubles. Suintage possible au-dessus de 8% de charge parfum.');
            analysis.recommendations.push('Augmenter les alcools gras (cétyl/stéarylique) à 8-10% pour améliorer la dispersion.');
        }

        // === ANALYSE POINT ÉCLAIR ===
        if (lowestFlashPoint < 999) {
            analysis.recommended_temp_max = Math.max(45, lowestFlashPoint - 10);
            if (lowestFlashPoint < 60) {
                analysis.warnings.push('🔥 Point éclair bas : ' + lowestFlashPoint + '°C. Température d\'ajout max recommandée : ' + analysis.recommended_temp_max + '°C.');
            }
        }

        // === ANALYSE COMBUSTION ===
        if (totalInsoluble > 15) {
            analysis.combustion_risk = 'élevé';
            analysis.warnings.push('🔥 Risque combustion : les insolubles peuvent obstruer la mèche → flamme irrégulière, champignonnage.');
            analysis.recommendations.push('Prévoir une mèche de calibre supérieur (+1 taille) pour compenser.');
        }

        // === ANALYSE DIFFUSION ===
        if (lightMolecules > 40) {
            analysis.diffusion_profile = 'volatil — fort cold throw, s\'épuise vite';
            analysis.recommendations.push('Parfum volatil : bon cold throw mais risque d\'épuisement rapide en combustion. Considérer 1-2% de plus que le dosage habituel.');
        } else if (heavyMolecules > 40) {
            analysis.diffusion_profile = 'lourd — faible cold throw, bonne tenue en combustion';
            analysis.recommendations.push('Parfum lourd : diffusion à froid faible. La combustion est nécessaire pour la projection. Mèche bien calibrée essentielle.');
        }

        // === INTERACTION POLYMORPHISME (cires végétales) ===
        const esters = components.filter(c => {
            const n = (c.name || '').toLowerCase();
            return n.includes('benzoate') || n.includes('salicylate') || n.includes('cinnamate');
        });
        if (esters.length) {
            const esterPct = esters.reduce((s, c) => s + (c.percentage_max || 0), 0);
            if (esterPct > 10) {
                analysis.warnings.push('🧪 Esters aromatiques à ' + esterPct.toFixed(0) + '% — accélère le polymorphisme en cire végétale. Augmenter les alcools gras.');
            }
        }

        // Save analysis
        await db.run(
            `INSERT INTO fragrance_analyses (fragrance_id, analysis_type, solvent_carrier, solvent_percentage,
                wax_compatibility, combustion_risk, diffusion_profile, recommended_temp_max,
                recommended_wick_adjustment, recommended_additive_adjustment, warnings, analysis_notes)
             VALUES (?, 'auto', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.params.id, analysis.solvent_carrier, analysis.solvent_percentage,
             analysis.wax_compatibility, analysis.combustion_risk, analysis.diffusion_profile,
             analysis.recommended_temp_max,
             analysis.recommendations.filter(r => r.includes('mèche')).join('; ') || null,
             analysis.recommendations.filter(r => r.includes('alcool') || r.includes('additif')).join('; ') || null,
             JSON.stringify(analysis.warnings),
             JSON.stringify(analysis.recommendations)]
        );

        res.json(analysis);
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// Historique analyses d'un parfum
app.get('/api/fragrances/:id/analyses', async (req, res) => {
    try {
        const rows = await db.all('SELECT * FROM fragrance_analyses WHERE fragrance_id = ? ORDER BY id DESC', [req.params.id]);
        res.json(rows);
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// ═══════ ANALYSE MOLÉCULAIRE — Croisement FDS × Formulations ═══════
const moleculeEngine = require('./modules/molecule-engine');

// Profil moléculaire d'un parfum
app.get('/api/fragrances/:id/molecule-profile', async (req, res) => {
    try {
        const frag = await db.get('SELECT * FROM fragrances WHERE id = ?', [req.params.id]);
        if (!frag) return res.status(404).json({ error: 'Parfum non trouvé' });
        const components = await db.all('SELECT * FROM fragrance_components WHERE fragrance_id = ?', [req.params.id]);
        if (!components.length) return res.json({ error: 'Aucun composant — FDS non importée', components: 0 });
        const analysis = moleculeEngine.analyzeFragranceProfile(components, {
            fragrance_name: frag.name,
            diameter: parseInt(req.query.diameter) || null,
            fragrance_pct: parseFloat(req.query.pct) || null
        });
        res.json({ fragrance: frag, ...analysis });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// Analyse croisée batch — tous les parfums
app.get('/api/molecule/batch-analysis', async (req, res) => {
    try {
        const report = await moleculeEngine.batchCrossAnalysis(db);
        
        // Persister les corrélations découvertes dans knowledge_patterns
        if (report.rules_discovered && report.rules_discovered.length) {
            for (const rule of report.rules_discovered) {
                try {
                    const existing = await db.get(
                        'SELECT id FROM knowledge_patterns WHERE pattern_type = ? AND trigger_condition = ?',
                        [rule.type, rule.type]
                    );
                    if (existing) {
                        await db.run('UPDATE knowledge_patterns SET action_taken = ?, outcome = ?, confidence = 0.7 WHERE id = ?',
                            [JSON.stringify(rule), rule.detail || '', existing.id]);
                    } else {
                        await db.run('INSERT INTO knowledge_patterns (pattern_type, trigger_condition, action_taken, outcome, confidence) VALUES (?, ?, ?, ?, 0.7)',
                            [rule.type, rule.type, JSON.stringify(rule), rule.detail || '']);
                    }
                } catch(e) { /* non-bloquant */ }
            }
        }
        res.json(report);
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// ═══════ IMPORT FRAGRANCES + COMPOSANTS (pour transfert DB) ═══════

// Import fragrances + components depuis JSON
app.post('/api/fragrances/import/full', express.json({ limit: '20mb' }), async (req, res) => {
    try {
        const { fragrances } = req.body;
        if (!fragrances || !Array.isArray(fragrances)) {
            return res.status(400).json({ error: 'Format: { fragrances: [...] }' });
        }
        let created = 0, updated = 0, skipped = 0, compsAdded = 0;
        
        for (const f of fragrances) {
            const nom = (f.name || '').trim();
            if (!nom) { skipped++; continue; }
            
            // Résoudre fournisseur
            let suppId = f.supplier_id || null;
            if (!suppId && f.supplier_name) {
                const sup = await db.get('SELECT id FROM suppliers WHERE UPPER(name) LIKE ?', 
                    ['%' + f.supplier_name.toUpperCase() + '%']);
                if (sup) suppId = sup.id;
                else {
                    const r = await db.run('INSERT INTO suppliers (name,country,specialty) VALUES (?,?,?)',
                        [f.supplier_name, f.country || 'France', 'Parfums']);
                    suppId = r.lastInsertRowid;
                }
            }
            
            // Vérifier doublon
            const existing = await db.get('SELECT id FROM fragrances WHERE UPPER(name) = ?', [nom.toUpperCase()]);
            let fragId;
            if (existing) {
                fragId = existing.id;
                // Mettre à jour flash_point si absent
                if (f.flash_point) {
                    await db.run('UPDATE fragrances SET flash_point = COALESCE(flash_point, ?) WHERE id = ?', 
                        [f.flash_point, fragId]);
                }
                updated++;
            } else {
                const r = await db.run(
                    'INSERT INTO fragrances (supplier_id, reference, name, flash_point, family, ifra_max, recommended_percentage, notes) VALUES (?,?,?,?,?,?,?,?)',
                    [suppId, f.reference || null, nom, f.flash_point || null, f.family || null, 
                     f.ifra_max || null, f.recommended_percentage || null, f.notes || null]
                );
                fragId = r.lastInsertRowid;
                created++;
            }
            
            // Composants (ne pas dupliquer)
            if (f.components && f.components.length) {
                const existingComps = await db.get(
                    'SELECT COUNT(*) as c FROM fragrance_components WHERE fragrance_id = ?', [fragId]
                );
                if (existingComps.c === 0) {
                    for (const c of f.components) {
                        await db.run(
                            `INSERT INTO fragrance_components 
                            (fragrance_id, cas_number, name, inci_name, percentage_min, percentage_max, flash_point, component_type, solubility_wax, volatility, risk_phrases, notes) 
                            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
                            [fragId, c.cas_number || null, c.name || '?', c.inci_name || null,
                             c.percentage_min || null, c.percentage_max || null, c.flash_point || (c.cas_number ? _MOL_FP[c.cas_number] : null) || null,
                             c.component_type || 'ingredient', c.solubility_wax || null, c.volatility || null,
                             c.risk_phrases || null, c.notes || null]
                        );
                        compsAdded++;
                    }
                }
            }
        }
        
        res.json({ success: true, created, updated, skipped, components_added: compsAdded });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// Stats moléculaires rapides
// GET /api/molecule/unknown — CAS présents dans les FDS mais pas dans le dictionnaire moléculaire
app.get('/api/molecule/unknown', async (req, res) => {
    try {
        const knownCas = new Set(Object.keys(MOLECULE_DB_FULL));
        // Also check knowledge_base molecule_db entries
        const kbMols = await db.all(`SELECT title FROM knowledge_base WHERE category='molecule_db'`);
        kbMols.forEach(r => knownCas.add(r.title.trim()));
        
        const comps = await db.all(`SELECT cas_number, name, COUNT(DISTINCT fragrance_id) as frequency 
            FROM fragrance_components WHERE cas_number IS NOT NULL AND cas_number != ''
            GROUP BY cas_number ORDER BY frequency DESC`);
        
        const unknown = comps.filter(c => !knownCas.has(c.cas_number));
        res.json({ 
            total_unique_cas: comps.length,
            known: comps.length - unknown.length,
            unknown_count: unknown.length,
            unknown: unknown.map(c => ({ cas: c.cas_number, name: c.name, frequency: c.frequency }))
        });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/molecule/stats', async (req, res) => {
    try {
        const total = await db.get('SELECT COUNT(*) as c FROM fragrances');
        const withComps = await db.get(`SELECT COUNT(DISTINCT fragrance_id) as c FROM fragrance_components`);
        const totalComps = await db.get('SELECT COUNT(*) as c FROM fragrance_components');
        const uniqueCAS = await db.get('SELECT COUNT(DISTINCT cas_number) as c FROM fragrance_components WHERE cas_number IS NOT NULL');
        const { MOLECULE_DB } = require('./modules/molecule-engine');
        
        // Combine engine + KB for coverage
        const engineCasSet = new Set(Object.keys(MOLECULE_DB_FULL));
        const kbMols = await db.all(`SELECT title FROM knowledge_base WHERE category='molecule_db'`);
        kbMols.forEach(r => engineCasSet.add(r.title.trim()));
        const knownCAS = engineCasSet.size;
        
        // Top molécules les plus fréquentes
        const topMolecules = await db.all(`
            SELECT cas_number, name, COUNT(*) as frequency, 
                   AVG(percentage_min) as avg_min, AVG(percentage_max) as avg_max
            FROM fragrance_components 
            WHERE cas_number IS NOT NULL
            GROUP BY cas_number 
            ORDER BY frequency DESC LIMIT 20
        `);
        
        // Couverture = combien de CAS des FDS sont connus (engine + KB)
        const allFdsCas = await db.all('SELECT DISTINCT cas_number FROM fragrance_components WHERE cas_number IS NOT NULL AND cas_number != ""');
        const coveredCount = allFdsCas.filter(r => engineCasSet.has(r.cas_number)).length;
        
        res.json({
            fragrances_total: total.c,
            fragrances_with_components: withComps.c,
            total_components: totalComps.c,
            unique_cas: uniqueCAS.c,
            known_cas_in_engine: knownCAS,
            covered_cas: coveredCount,
            coverage_pct: uniqueCAS.c > 0 ? Math.round(coveredCount / uniqueCAS.c * 100) : 0,
            top_molecules: topMolecules
        });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// ═══════ TOGGLE DISPONIBILITÉ MATIÈRES ═══════
for (const table of ['waxes','wicks','colorants','fragrances']) {
    app.patch(`/api/${table}/:id/available`, async (req, res) => {
        try {
            const { available } = req.body;
            await db.run(`UPDATE ${table} SET available = ? WHERE id = ?`, [available ? 1 : 0, req.params.id]);
            res.json({ success: true, available: available ? 1 : 0 });
        } catch(e) { res.status(500).json({ error: e.message }); }
    });
}

app.put('/api/suppliers/:id', async (req, res) => {
    try {
        const { name, country, specialty, website, notes } = req.body;
        await db.run('UPDATE suppliers SET name=?, country=?, specialty=?, website=?, notes=? WHERE id=?',
            [name, country, specialty, website, notes, req.params.id]);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/suppliers/:id', async (req, res) => {
    try { await db.run('DELETE FROM suppliers WHERE id = ?', [req.params.id]); res.json({ success: true }); }
    catch(e) { res.status(500).json({ error: e.message }); }
});

// ============================================
// IMPORT INTELLIGENT — Extraction de texte
// ============================================

// Base de molécules connues pour enrichissement croisé
const MOLECULE_DB = {
    '25265-71-8':  { name: 'Dipropylene Glycol (DPG)', bp: 232, mw: 134.17, volatility: 'basse', solubility_wax: 'insoluble', type: 'solvent', notes_type: 'fond', allergen: false },
    '57-55-6':     { name: 'Propylene Glycol (PG)', bp: 188, mw: 76.09, volatility: 'moyenne', solubility_wax: 'insoluble', type: 'solvent', notes_type: 'coeur', allergen: false },
    '110-27-0':    { name: 'Isopropyl Myristate (IPM)', bp: 315, mw: 270.45, volatility: 'basse', solubility_wax: 'soluble', type: 'solvent', notes_type: 'fond', allergen: false },
    '84-66-2':     { name: 'Diethyl Phthalate (DEP)', bp: 298, mw: 222.24, volatility: 'basse', solubility_wax: 'partiel', type: 'solvent', notes_type: 'fond', allergen: false },
    '120-51-4':    { name: 'Benzyl Benzoate', bp: 323, mw: 212.24, volatility: 'basse', solubility_wax: 'soluble', type: 'fixateur', notes_type: 'fond', allergen: false },
    '118-58-1':    { name: 'Benzyl Salicylate', bp: 320, mw: 228.24, volatility: 'basse', solubility_wax: 'soluble', type: 'fixateur', notes_type: 'fond', allergen: true },
    '77-93-0':     { name: 'Triethyl Citrate', bp: 294, mw: 276.28, volatility: 'basse', solubility_wax: 'soluble', type: 'solvent', notes_type: 'fond', allergen: false },
    '78-70-6':     { name: 'Linalool', bp: 198, mw: 154.25, volatility: 'haute', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'tete', allergen: true },
    '5989-27-5':   { name: 'Limonene (D)', bp: 176, mw: 136.23, volatility: 'haute', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'tete', allergen: true },
    '106-22-9':    { name: 'Citronellol', bp: 225, mw: 156.27, volatility: 'moyenne', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'coeur', allergen: true },
    '106-24-1':    { name: 'Geraniol', bp: 230, mw: 154.25, volatility: 'moyenne', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'coeur', allergen: true },
    '91-64-5':     { name: 'Coumarin', bp: 301, mw: 146.14, volatility: 'basse', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'fond', allergen: true },
    '104-55-2':    { name: 'Cinnamal (Cinnamaldehyde)', bp: 253, mw: 132.16, volatility: 'moyenne', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'coeur', allergen: true },
    '121-33-5':    { name: 'Vanilline', bp: 285, mw: 152.15, volatility: 'basse', solubility_wax: 'partiel', type: 'ingredient', notes_type: 'fond', allergen: false },
    '97-53-0':     { name: 'Eugenol', bp: 254, mw: 164.20, volatility: 'moyenne', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'coeur', allergen: true },
    '100-51-6':    { name: 'Benzyl Alcohol', bp: 205, mw: 108.14, volatility: 'moyenne', solubility_wax: 'partiel', type: 'solvent', notes_type: 'coeur', allergen: true },
    '101-86-0':    { name: 'Hexyl Cinnamal', bp: 308, mw: 216.32, volatility: 'basse', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'fond', allergen: true },
    '105-54-4':    { name: 'Ethyl Butyrate', bp: 121, mw: 116.16, volatility: 'haute', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'tete', allergen: false },
    '123-35-3':    { name: 'Myrcene', bp: 167, mw: 136.23, volatility: 'haute', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'tete', allergen: false },
    '4602-84-0':   { name: 'Farnesol', bp: 283, mw: 222.37, volatility: 'basse', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'fond', allergen: true },
    '105-87-3':    { name: 'Geranyl Acetate', bp: 245, mw: 196.29, volatility: 'moyenne', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'coeur', allergen: false },
    '127-51-5':    { name: 'Isomethyl Ionone', bp: 263, mw: 206.32, volatility: 'basse', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'fond', allergen: true },
    '1222-05-5':   { name: 'Galaxolide (HHCB)', bp: 330, mw: 258.40, volatility: 'basse', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'fond', allergen: false },
    '21145-77-7':  { name: 'Tonalide (AHTN)', bp: 325, mw: 258.40, volatility: 'basse', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'fond', allergen: false },
    '122-40-7':    { name: 'Amyl Cinnamal', bp: 289, mw: 202.29, volatility: 'basse', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'fond', allergen: true },
    '80-54-6':     { name: 'Lilial (BMHCA)', bp: 279, mw: 204.31, volatility: 'basse', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'fond', allergen: true },
    '107-75-5':    { name: 'Hydroxycitronellal', bp: 241, mw: 172.26, volatility: 'moyenne', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'coeur', allergen: true },
    // ═══ SESSION 23 : Molécules extraites des FDS Robertet/Charabot ═══
    '115-95-7':    { name: 'Linalyl acetate', bp: 220, mw: 196.29, volatility: 'moyenne', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'tete', allergen: false },
    '5392-40-5':   { name: 'Citral', bp: 229, mw: 152.23, volatility: 'moyenne', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'tete', allergen: true },
    '80-56-8':     { name: 'alpha-Pinene', bp: 155, mw: 136.23, volatility: 'haute', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'tete', allergen: false },
    '127-91-3':    { name: 'beta-Pinene', bp: 166, mw: 136.23, volatility: 'haute', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'tete', allergen: false },
    '87-44-5':     { name: 'beta-Caryophyllene', bp: 268, mw: 204.35, volatility: 'basse', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'fond', allergen: true },
    '77-53-2':     { name: 'Cedrol', bp: 299, mw: 222.37, volatility: 'basse', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'fond', allergen: false },
    '469-61-4':    { name: 'alpha-Cedrene', bp: 262, mw: 204.35, volatility: 'basse', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'fond', allergen: false },
    '546-28-1':    { name: 'beta-Cedrene', bp: 265, mw: 204.35, volatility: 'basse', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'fond', allergen: false },
    '11028-42-5':  { name: 'Cedrene', bp: 263, mw: 204.35, volatility: 'basse', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'fond', allergen: false },
    '104-67-6':    { name: 'gamma-Undecalactone', bp: 297, mw: 184.28, volatility: 'basse', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'fond', allergen: false },
    '23696-85-7':  { name: 'Damascenone', bp: 274, mw: 190.28, volatility: 'basse', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'fond', allergen: true },
    '94333-88-7':  { name: 'Bulnesia sarmienti extract', bp: 270, mw: 0, volatility: 'basse', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'fond', allergen: false },
    '102-20-5':    { name: 'Phenethyl phenylacetate', bp: 340, mw: 240.30, volatility: 'basse', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'fond', allergen: false },
    '3338-55-4':   { name: 'cis-Ocimene', bp: 174, mw: 136.23, volatility: 'haute', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'tete', allergen: false },
    '13877-91-3':  { name: 'trans-Ocimene', bp: 177, mw: 136.23, volatility: 'haute', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'tete', allergen: false },
    '18172-67-3':  { name: 'l-beta-Pinene', bp: 164, mw: 136.23, volatility: 'haute', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'tete', allergen: false },
    '3658-77-3':   { name: 'Furaneol', bp: 214, mw: 128.13, volatility: 'moyenne', solubility_wax: 'partiel', type: 'ingredient', notes_type: 'coeur', allergen: false },
    '68039-49-6':  { name: 'Methyl cedryl ketone', bp: 280, mw: 0, volatility: 'basse', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'fond', allergen: false },
    '65443-14-3':  { name: 'Trimethylpentylcyclopentanone', bp: 250, mw: 196.33, volatility: 'basse', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'fond', allergen: false },
    '81782-77-6':  { name: '4-Methyl-3-decen-5-ol', bp: 245, mw: 170.29, volatility: 'moyenne', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'coeur', allergen: false },
    '118-71-8':    { name: 'Maltol', bp: 293, mw: 126.11, volatility: 'basse', solubility_wax: 'partiel', type: 'ingredient', notes_type: 'fond', allergen: false },
    '110-41-8':    { name: '2-Methylundecanal', bp: 243, mw: 184.32, volatility: 'moyenne', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'coeur', allergen: true },
    '112-45-8':    { name: '10-Undecenal', bp: 235, mw: 168.28, volatility: 'moyenne', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'coeur', allergen: false },
    '3391-86-4':   { name: '1-Octen-3-ol', bp: 175, mw: 128.21, volatility: 'haute', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'tete', allergen: false },
    '18479-58-8':  { name: 'Dihydromyrcenol', bp: 198, mw: 156.27, volatility: 'moyenne', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'tete', allergen: false },
    '4180-23-8':   { name: 'trans-Anethole', bp: 234, mw: 148.20, volatility: 'moyenne', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'coeur', allergen: false },
    '6485-40-1':   { name: 'l-Carvone', bp: 231, mw: 150.22, volatility: 'moyenne', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'coeur', allergen: true },
    '89-80-5':     { name: 'Menthone', bp: 207, mw: 154.25, volatility: 'moyenne', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'coeur', allergen: false },
    '5989-54-8':   { name: 'l-Limonene', bp: 176, mw: 136.23, volatility: 'haute', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'tete', allergen: true },
    '126-91-0':    { name: 'Linalool isomer', bp: 198, mw: 154.25, volatility: 'haute', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'tete', allergen: true },
    '470-82-6':    { name: 'Eucalyptol', bp: 176, mw: 154.25, volatility: 'haute', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'tete', allergen: false },
    '67674-46-8':  { name: 'Dimethoxytrimethylhexene', bp: 170, mw: 186.29, volatility: 'haute', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'tete', allergen: false },
    '16510-27-3':  { name: 'Cyclopropylmethyl methoxybenzene', bp: 195, mw: 162.23, volatility: 'moyenne', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'coeur', allergen: false },
    '491-07-6':    { name: 'Isomenthone', bp: 207, mw: 154.25, volatility: 'moyenne', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'coeur', allergen: false },
    '112-31-2':    { name: 'Decanal', bp: 208, mw: 156.27, volatility: 'moyenne', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'coeur', allergen: false },
    '20407-84-5':  { name: '2-trans-Dodecenal', bp: 248, mw: 182.30, volatility: 'moyenne', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'coeur', allergen: false },
    '124-13-0':    { name: 'Octanal', bp: 167, mw: 128.21, volatility: 'haute', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'tete', allergen: false },
    '10458-14-7':  { name: 'Menthone isomer', bp: 207, mw: 154.25, volatility: 'moyenne', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'coeur', allergen: false },
    '124-19-6':    { name: 'Nonanal', bp: 191, mw: 142.24, volatility: 'moyenne', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'coeur', allergen: false },
    '63500-71-0':  { name: 'Florol', bp: 230, mw: 170.29, volatility: 'moyenne', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'coeur', allergen: false },
    '106-25-2':    { name: 'Nerol', bp: 229, mw: 154.25, volatility: 'moyenne', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'coeur', allergen: true },
    '106185-75-5': { name: 'Javanol', bp: 270, mw: 210.31, volatility: 'basse', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'fond', allergen: false },
    '7212-44-4':   { name: 'Nerolidol', bp: 276, mw: 222.37, volatility: 'basse', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'fond', allergen: false },
    '141-12-8':    { name: 'Neryl acetate', bp: 230, mw: 196.29, volatility: 'moyenne', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'coeur', allergen: false },
    '66068-84-6':  { name: 'Isocamphenyl cyclohexanol', bp: 280, mw: 222.37, volatility: 'basse', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'fond', allergen: false },
    '4940-11-8':   { name: 'Ethyl maltol', bp: 290, mw: 140.14, volatility: 'basse', solubility_wax: 'partiel', type: 'ingredient', notes_type: 'fond', allergen: false },
    '121-32-4':    { name: 'Ethyl vanillin', bp: 295, mw: 166.17, volatility: 'basse', solubility_wax: 'partiel', type: 'ingredient', notes_type: 'fond', allergen: false },
    '65113-99-7':  { name: 'Tricyclopentenylidenyl propanol', bp: 270, mw: 0, volatility: 'basse', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'fond', allergen: false },
    '1335-46-2':   { name: 'Methyl ionone', bp: 265, mw: 206.32, volatility: 'basse', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'fond', allergen: true },
    '431-03-8':    { name: 'Diacetyl', bp: 88, mw: 86.09, volatility: 'haute', solubility_wax: 'partiel', type: 'ingredient', notes_type: 'tete', allergen: false },
    '32210-23-4':  { name: 'Vertenex', bp: 260, mw: 198.30, volatility: 'basse', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'fond', allergen: false },
    '103-95-7':    { name: 'Cyclamen aldehyde', bp: 270, mw: 190.28, volatility: 'basse', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'fond', allergen: true },
    '18871-14-2':  { name: 'Acetoxypentyltetrahydropyran', bp: 265, mw: 214.30, volatility: 'basse', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'fond', allergen: false },
    '68259-31-4':  { name: 'Methylisopropylbicycloheptanol', bp: 250, mw: 0, volatility: 'basse', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'fond', allergen: false },
    '21368-68-3':  { name: 'dl-Camphor', bp: 204, mw: 152.23, volatility: 'haute', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'tete', allergen: false },
    '65405-77-8':  { name: 'cis-3-Hexenyl salicylate', bp: 290, mw: 222.28, volatility: 'basse', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'fond', allergen: false },
    '98-52-2':     { name: '4-tert-Butylcyclohexanol', bp: 260, mw: 156.27, volatility: 'basse', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'fond', allergen: false },
    '79-92-5':     { name: 'Camphene', bp: 159, mw: 136.23, volatility: 'haute', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'tete', allergen: false },
    '99-87-6':     { name: 'p-Cymene', bp: 177, mw: 134.22, volatility: 'haute', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'tete', allergen: false },
    '99-85-4':     { name: 'gamma-Terpinene', bp: 183, mw: 136.23, volatility: 'haute', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'tete', allergen: false },
    '2050-08-0':   { name: 'Amyl salicylate', bp: 280, mw: 208.25, volatility: 'basse', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'fond', allergen: false },
    '142-92-7':    { name: 'Hexyl acetate', bp: 172, mw: 144.21, volatility: 'haute', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'tete', allergen: false },
    '99-86-5':     { name: 'alpha-Terpinene', bp: 174, mw: 136.23, volatility: 'haute', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'tete', allergen: false },
    '87-20-7':     { name: 'Isoamyl salicylate', bp: 277, mw: 208.25, volatility: 'basse', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'fond', allergen: false },
    '13466-78-9':  { name: 'delta-3-Carene', bp: 170, mw: 136.23, volatility: 'haute', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'tete', allergen: false },
    '105-85-1':    { name: 'Citronellyl formate', bp: 224, mw: 184.28, volatility: 'moyenne', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'coeur', allergen: false },
    '586-62-9':    { name: 'Terpinolene', bp: 185, mw: 136.23, volatility: 'haute', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'tete', allergen: false },
    '2442-10-6':   { name: '1-Octen-3-yl acetate', bp: 205, mw: 170.25, volatility: 'moyenne', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'coeur', allergen: false },
    '16409-43-1':  { name: 'Rose oxide', bp: 200, mw: 154.25, volatility: 'moyenne', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'coeur', allergen: false },
    '5655-61-8':   { name: 'l-Bornyl acetate', bp: 226, mw: 196.29, volatility: 'moyenne', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'coeur', allergen: false },
    '106-02-5':    { name: 'Pentadecanolide', bp: 330, mw: 240.38, volatility: 'basse', solubility_wax: 'soluble', type: 'fixateur', notes_type: 'fond', allergen: false },
    '10408-16-9':  { name: 'Longifolene', bp: 254, mw: 204.35, volatility: 'basse', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'fond', allergen: false },
    '99-49-0':     { name: 'Carvone', bp: 231, mw: 150.22, volatility: 'moyenne', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'coeur', allergen: true },
    '67634-00-8':  { name: 'Methyl octynol carbonate', bp: 240, mw: 0, volatility: 'moyenne', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'coeur', allergen: false },
    '5182-36-5':   { name: 'Neral', bp: 229, mw: 152.23, volatility: 'moyenne', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'coeur', allergen: true },
    '77-54-3':     { name: 'Cedrenol', bp: 291, mw: 220.35, volatility: 'basse', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'fond', allergen: false },
    '112-54-9':    { name: 'Dodecanal', bp: 240, mw: 184.32, volatility: 'moyenne', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'coeur', allergen: false },
    '3407-42-9':   { name: 'Indisan (Sandela)', bp: 300, mw: 236.35, volatility: 'basse', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'fond', allergen: false },
    '67801-20-1':  { name: 'Trimethylcyclopentenylidenepentanol', bp: 260, mw: 0, volatility: 'basse', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'fond', allergen: false },
    '125-12-2':    { name: 'Isobornyl acetate', bp: 226, mw: 196.29, volatility: 'moyenne', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'coeur', allergen: false },
    '58567-11-6':  { name: 'Boisambrene Forte', bp: 280, mw: 0, volatility: 'basse', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'fond', allergen: false },
    '546-80-5':    { name: 'Thujone', bp: 201, mw: 152.23, volatility: 'moyenne', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'coeur', allergen: false },
    '80-26-2':     { name: 'alpha-Terpineol acetate', bp: 220, mw: 196.29, volatility: 'moyenne', solubility_wax: 'soluble', type: 'ingredient', notes_type: 'coeur', allergen: false },
};

// Regex patterns pour extraction
const CAS_REGEX = /\b(\d{2,7}-\d{2}-\d)\b/g;
const PERCENTAGE_REGEX = /(\d+[\.,]\d+|\d+)\s*%/g;
const BP_REGEX = /(?:(?:boiling\s*point|point\s*d['']?\s*[eéè]bullition|[Bb][Pp]|B\.P\.)\s*[:=]?\s*(\d+)\s*°?\s*C)|(?:(\d+)\s*°?\s*C\s*(?:boiling|[eéè]bullition))/gi;
const FP_REGEX = /(?:(?:flash\s*point|point\s*[eéè]clair|[Ff][Pp]|F\.P\.)\s*[:=]?\s*(\d+)\s*°?\s*C)|(?:(\d+)\s*°?\s*C\s*(?:flash|[eéè]clair))/gi;
const MW_REGEX = /(?:(?:molecular\s*weight|masse\s*mol[aé]culaire|MW|Mw|M\.W\.)\s*[:=]?\s*(\d+[\.,]?\d*)\s*(?:g\/mol)?)|(?:(\d+[\.,]\d+)\s*g\/mol)/gi;
const DENSITY_REGEX = /(?:densit[yéeè]|d[eéè]nsit[eéè])\s*[:=]?\s*(\d+[\.,]\d+)/gi;

// Noms de molécules connus (pour détection par nom)
const MOLECULE_NAMES = {};
Object.entries(MOLECULE_DB).forEach(([cas, info]) => {
    const names = info.name.toLowerCase().split(/[\s\/\(\)]+/).filter(n => n.length > 3);
    names.forEach(n => { MOLECULE_NAMES[n] = cas; });
    MOLECULE_NAMES[info.name.toLowerCase()] = cas;
});

// Allergens IFRA (26 substances notifiables)
const IFRA_ALLERGENS_CAS = [
    '78-70-6', '5989-27-5', '106-22-9', '106-24-1', '91-64-5', '104-55-2',
    '97-53-0', '100-51-6', '101-86-0', '118-58-1', '127-51-5', '122-40-7',
    '80-54-6', '107-75-5', '4602-84-0', '105-87-3'
];

app.post('/api/knowledge/import-text', async (req, res) => {
    try {
        const { text, source_url, source_title, auto_create_kb } = req.body;
        if (!text || text.trim().length < 20) {
            return res.status(400).json({ error: 'Texte trop court (min 20 caractères)' });
        }

        const results = {
            molecules: [],
            cas_numbers: [],
            boiling_points: [],
            flash_points: [],
            molecular_weights: [],
            percentages: [],
            densities: [],
            allergens: [],
            solvents: [],
            warnings: [],
            suggested_kb_entries: [],
            enrichment_data: []
        };

        // 1. Extraction des numéros CAS
        const casMatches = [...text.matchAll(CAS_REGEX)];
        const casFound = new Set();
        casMatches.forEach(m => {
            const cas = m[1];
            if (!casFound.has(cas)) {
                casFound.add(cas);
                const known = MOLECULE_DB[cas];
                const entry = {
                    cas,
                    known: !!known,
                    position: m.index,
                    context: text.substring(Math.max(0, m.index - 50), Math.min(text.length, m.index + 60)).trim()
                };
                if (known) {
                    entry.name = known.name;
                    entry.bp = known.bp;
                    entry.mw = known.mw;
                    entry.volatility = known.volatility;
                    entry.solubility_wax = known.solubility_wax;
                    entry.type = known.type;
                    entry.notes_type = known.notes_type;
                    entry.allergen = known.allergen || IFRA_ALLERGENS_CAS.includes(cas);
                    if (known.solubility_wax === 'insoluble') {
                        results.warnings.push(`⚠️ ${known.name} (CAS ${cas}) — INSOLUBLE dans la cire`);
                        results.solvents.push(entry);
                    }
                    if (entry.allergen) {
                        results.allergens.push({ cas, name: known.name });
                    }
                }
                results.cas_numbers.push(entry);
            }
        });

        // 2. Extraction des noms de molécules (même sans CAS)
        const textLower = text.toLowerCase();
        Object.entries(MOLECULE_NAMES).forEach(([name, cas]) => {
            if (name.length > 4 && textLower.includes(name) && !casFound.has(cas)) {
                casFound.add(cas);
                const known = MOLECULE_DB[cas];
                if (known) {
                    const idx = textLower.indexOf(name);
                    results.molecules.push({
                        name: known.name,
                        cas,
                        detected_by: 'name_match',
                        bp: known.bp,
                        mw: known.mw,
                        volatility: known.volatility,
                        solubility_wax: known.solubility_wax,
                        type: known.type,
                        notes_type: known.notes_type,
                        allergen: known.allergen,
                        context: text.substring(Math.max(0, idx - 30), Math.min(text.length, idx + 50)).trim()
                    });
                }
            }
        });

        // 3. Extraction des points d'ébullition
        let bpMatch;
        while ((bpMatch = BP_REGEX.exec(text)) !== null) {
            const val = parseInt(bpMatch[1] || bpMatch[2]);
            if (val > 50 && val < 500) {
                results.boiling_points.push({
                    value: val,
                    unit: '°C',
                    position: bpMatch.index,
                    context: text.substring(Math.max(0, bpMatch.index - 40), Math.min(text.length, bpMatch.index + 50)).trim()
                });
            }
        }

        // 4. Extraction des flash points
        let fpMatch;
        while ((fpMatch = FP_REGEX.exec(text)) !== null) {
            const val = parseInt(fpMatch[1] || fpMatch[2]);
            if (val > 20 && val < 300) {
                results.flash_points.push({
                    value: val,
                    unit: '°C',
                    position: fpMatch.index,
                    context: text.substring(Math.max(0, fpMatch.index - 40), Math.min(text.length, fpMatch.index + 50)).trim()
                });
            }
        }

        // 5. Extraction des masses moléculaires
        let mwMatch;
        while ((mwMatch = MW_REGEX.exec(text)) !== null) {
            const val = parseFloat((mwMatch[1] || mwMatch[2]).replace(',', '.'));
            if (val > 30 && val < 1000) {
                results.molecular_weights.push({ value: val, unit: 'g/mol', position: mwMatch.index });
            }
        }

        // 6. Extraction des pourcentages
        const pctMatches = [...text.matchAll(PERCENTAGE_REGEX)];
        pctMatches.forEach(m => {
            const val = parseFloat(m[1].replace(',', '.'));
            if (val > 0 && val <= 100) {
                results.percentages.push({
                    value: val,
                    position: m.index,
                    context: text.substring(Math.max(0, m.index - 40), Math.min(text.length, m.index + 30)).trim()
                });
            }
        });

        // 7. Extraction des densités
        let densMatch;
        while ((densMatch = DENSITY_REGEX.exec(text)) !== null) {
            const val = parseFloat(densMatch[1].replace(',', '.'));
            if (val > 0.5 && val < 2.0) {
                results.densities.push({ value: val, position: densMatch.index });
            }
        }

        // 8. Analyse globale et suggestions de fiches KB
        const insolublesCount = results.cas_numbers.filter(c => c.solubility_wax === 'insoluble').length;
        const allergensCount = results.allergens.length;
        const hasDPG = results.cas_numbers.some(c => c.cas === '25265-71-8');
        const hasPG = results.cas_numbers.some(c => c.cas === '57-55-6');
        const hasIPM = results.cas_numbers.some(c => c.cas === '110-27-0');

        // Suggestion : fiche FDS si beaucoup de CAS
        if (results.cas_numbers.length >= 3) {
            const entry = {
                type: 'fds_analysis',
                category: 'technique',
                subcategory: 'parfum',
                title: `Analyse FDS — ${source_title || 'Import ' + new Date().toLocaleDateString('fr-FR')}`,
                content: `COMPOSANTS DÉTECTÉS : ${results.cas_numbers.length}\n\n` +
                    results.cas_numbers.map(c =>
                        `• ${c.known ? c.name : 'CAS ' + c.cas}` +
                        (c.bp ? ` — Bp ${c.bp}°C` : '') +
                        (c.solubility_wax ? ` — Solubilité cire: ${c.solubility_wax}` : '') +
                        (c.allergen ? ' — ⚠️ ALLERGÈNE IFRA' : '')
                    ).join('\n') +
                    (insolublesCount > 0 ? `\n\n⚠️ ${insolublesCount} composant(s) INSOLUBLES dans la cire` : '') +
                    (allergensCount > 0 ? `\n📋 ${allergensCount} allergène(s) IFRA à déclarer` : '') +
                    (hasDPG ? '\n🔴 Contient DPG — vérifier le % et demander reformulation si > 20%' : '') +
                    (hasIPM ? '\n🟢 Contient IPM — bon solvant pour bougies' : ''),
                source: source_url || source_title || 'Import texte',
                priority: hasDPG || hasPG ? 1 : 2,
                tags: ['import', 'fds', hasDPG ? 'dpg' : '', hasIPM ? 'ipm' : '', allergensCount > 0 ? 'allergenes' : ''].filter(Boolean).join(',')
            };
            results.suggested_kb_entries.push(entry);
        }

        // Suggestion : fiche données moléculaires si Bp trouvés
        if (results.boiling_points.length >= 2) {
            results.suggested_kb_entries.push({
                type: 'molecular_data',
                category: 'Science',
                subcategory: 'chimie',
                title: `Données moléculaires — ${source_title || 'Import'}`,
                content: `POINTS D'ÉBULLITION EXTRAITS :\n\n` +
                    results.boiling_points.map(bp => `• ${bp.value}°C — "${bp.context}"`).join('\n') +
                    (results.molecular_weights.length ? '\n\nMASSES MOLÉCULAIRES :\n' +
                        results.molecular_weights.map(mw => `• ${mw.value} g/mol`).join('\n') : ''),
                source: source_url || source_title || 'Import texte',
                priority: 3,
                tags: 'ébullition,moléculaire,import'
            });
        }

        // Enrichissement croisé : lier aux parfums existants dans la DB
        if (casFound.size > 0 && db) {
            try {
                const fragrances = await db.all('SELECT id, name FROM fragrances');
                for (const frag of fragrances) {
                    const components = await db.all(
                        'SELECT * FROM fragrance_components WHERE fragrance_id = ?', [frag.id]
                    );
                    const matched = components.filter(c => casFound.has(c.cas_number));
                    if (matched.length > 0) {
                        results.enrichment_data.push({
                            fragrance_id: frag.id,
                            fragrance_name: frag.name,
                            matched_components: matched.length,
                            details: matched.map(m => ({
                                cas: m.cas_number,
                                name: m.name,
                                in_db: true,
                                enrichable: MOLECULE_DB[m.cas_number] && !m.flash_point
                            }))
                        });
                    }
                }
            } catch(e) { /* pas grave si la table n'existe pas encore */ }
        }

        // 9. Auto-création des fiches KB si demandé
        let created_entries = 0;
        if (auto_create_kb && results.suggested_kb_entries.length > 0) {
            for (const entry of results.suggested_kb_entries) {
                try {
                    await db.run(
                        `INSERT INTO knowledge_base (category, subcategory, title, content, source, priority, tags)
                         VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [entry.category, entry.subcategory, entry.title, entry.content,
                         entry.source, entry.priority, entry.tags]
                    );
                    created_entries++;
                } catch(e) { /* doublon ou erreur — on continue */ }
            }
        }

        // Résumé
        results.summary = {
            cas_found: results.cas_numbers.length,
            molecules_by_name: results.molecules.length,
            known_molecules: results.cas_numbers.filter(c => c.known).length,
            unknown_cas: results.cas_numbers.filter(c => !c.known).length,
            boiling_points: results.boiling_points.length,
            flash_points: results.flash_points.length,
            allergens: results.allergens.length,
            insolubles: insolublesCount,
            has_dpg: hasDPG,
            has_pg: hasPG,
            has_ipm: hasIPM,
            warnings_count: results.warnings.length,
            suggested_entries: results.suggested_kb_entries.length,
            created_entries,
            text_length: text.length
        };

        res.json(results);

    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

// API : Liste des molécules connues (pour référence/enrichissement)
app.get('/api/molecules-db', (req, res) => {
    const list = Object.entries(MOLECULE_DB).map(([cas, info]) => ({
        cas, ...info
    }));
    res.json(list);
});

// API : Enrichir un composant FDS existant avec les données de la base moléculaire
app.post('/api/fragrances/:id/components/enrich', async (req, res) => {
    try {
        const components = await db.all(
            'SELECT * FROM fragrance_components WHERE fragrance_id = ?',
            [req.params.id]
        );
        let enriched = 0;
        for (const comp of components) {
            const known = MOLECULE_DB[comp.cas_number];
            if (known) {
                const updates = [];
                const params = [];
                if (!comp.flash_point && known.bp) {
                    // On ne met pas le Bp dans flash_point — on ajoute une note
                    updates.push("notes = COALESCE(notes,'') || ?");
                    params.push(`\nBp: ${known.bp}°C, MW: ${known.mw} g/mol`);
                }
                if (comp.solubility_wax === 'unknown' && known.solubility_wax) {
                    updates.push('solubility_wax = ?');
                    params.push(known.solubility_wax);
                }
                if (!comp.volatility && known.volatility) {
                    updates.push('volatility = ?');
                    params.push(known.volatility);
                }
                if (updates.length) {
                    params.push(comp.id);
                    await db.run(
                        `UPDATE fragrance_components SET ${updates.join(', ')} WHERE id = ?`,
                        params
                    );
                    enriched++;
                }
            }
        }
        res.json({ enriched, total_components: components.length });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

// Placeholder : future connexion API Claude pour recherche intelligente
// Décommenter et ajouter ANTHROPIC_API_KEY dans .env quand prêt
/*
app.post('/api/knowledge/ai-research', async (req, res) => {
    const { question, context } = req.body;
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    if (!ANTHROPIC_API_KEY) {
        return res.status(400).json({ error: 'Clé API Anthropic non configurée. Ajouter ANTHROPIC_API_KEY=sk-ant-... dans .env' });
    }
});
*/

// ============================================================
// RECHERCHE & VEILLE SCIENTIFIQUE
// ============================================================

// API : Liste des molécules connues (pour la page recherche)
app.get('/api/molecules/db', (req, res) => {
    const list = Object.entries(MOLECULE_DB).map(([cas, info]) => ({ cas, ...info }));
    const allergenCount = list.filter(m => m.allergen).length;
    res.json({ molecules: list, count: list.length, allergen_count: allergenCount });
});

// ══════════════════════════════════════════════════════
// API Enrichissement Multi-Sources — PubChem + TGSC + Session Claude
// ══════════════════════════════════════════════════════
const enrichment = require('./modules/molecule-enrichment');
// Rétrocompatibilité : garder l'ancien module si quelqu'un l'appelle directement
let pubchem;
try { pubchem = require('./modules/pubchem-enrichment'); } catch(e) { pubchem = null; }

// GET /api/pubchem/lookup/:cas — Recherche rapide (rétrocompatibilité)
app.get('/api/pubchem/lookup/:cas', async (req, res) => {
    try {
        const result = await enrichment.enrichSingle(req.params.cas, null, { skipTGSC: true });
        res.json({
            cas: req.params.cas,
            found: result.sources_found > 0,
            iupac_name: result.iupac_name,
            molecular_formula: result.molecular_formula,
            molecular_weight: result.molecular_weight
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/pubchem/enrich/:cas — Enrichissement complet (rétrocompatibilité + multi-sources)
app.get('/api/pubchem/enrich/:cas', async (req, res) => {
    try {
        const result = await enrichment.enrichSingle(req.params.cas, null, { skipTGSC: false });
        await enrichment.saveToKB(db, req.params.cas, result);
        res.json({
            found: result.sources_found > 0,
            cas: result.cas,
            name: result.name,
            iupac_name: result.iupac_name,
            molecular_weight: result.molecular_weight,
            logp: result.logp,
            odor_type: result.odor_type,
            odor_description: result.odor_description,
            sources: result.sources
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/pubchem/batch-enrich — Enrichir par lot (rétrocompatibilité — appelle le multi-sources)
app.post('/api/pubchem/batch-enrich', express.json(), async (req, res) => {
    try {
        const batchSize = parseInt(req.body.batch_size) || 999;
        const report = await enrichment.enrichUnknownMolecules(db, { 
            batchSize,
            onProgress: null
        });
        
        // Format rétrocompatible
        res.json({
            total_unknown: report.total_to_process,
            enriched: report.enriched,
            failed: report.failed,
            already_known: report.already_known,
            needs_claude: report.needs_claude,
            stats: report.stats
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/pubchem/batch-enrich/stream?batch_size=999 — Version SSE avec progression
app.get('/api/pubchem/batch-enrich/stream', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    try {
        const batchSize = parseInt(req.query.batch_size) || 999;
        const report = await enrichment.enrichUnknownMolecules(db, {
            batchSize,
            onProgress: (p) => {
                res.write(`data: ${JSON.stringify({ event: 'progress', ...p })}\n\n`);
            }
        });
        
        res.write(`data: ${JSON.stringify({ event: 'done', ...report })}\n\n`);
        res.end();
    } catch (e) {
        res.write(`data: ${JSON.stringify({ event: 'error', error: e.message })}\n\n`);
        res.end();
    }
});

// POST /api/pubchem/import-seed — Rétrocompatibilité import seed
app.post('/api/pubchem/import-seed', express.json({limit: '5mb'}), async (req, res) => {
    try {
        const molecules = req.body.molecules;
        if (!molecules || typeof molecules !== 'object') {
            return res.status(400).json({ error: 'Corps requis : { molecules: { "cas": {...}, ... } }' });
        }
        
        let imported = 0;
        for (const [cas, info] of Object.entries(molecules)) {
            await db.run(
                `INSERT OR REPLACE INTO knowledge_base (category, subcategory, title, content, source, priority, tags) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    'molecule_db', info.family || 'autre',
                    cas,
                    `${info.name || '?'}. CAS : ${cas}. MW: ${info.mw || '?'} g/mol. FP: ${info.fp ?? '?'}°C. Volatilité: ${info.volatility || '?'}. Impact combustion: ${info.impact_combustion || '?'}. Diffusion: ${info.impact_diffusion || '?'}. Solubilité cire: ${info.solubility_wax || '?'}. Formule: ${info.formula || '?'}. LogP: ${info.xlogp ?? '?'}`,
                    `PubChem CID ${info.cid || '?'}`,
                    2,
                    `molecule,pubchem,${cas},${info.family || ''},${info.volatility || ''}`
                ]
            );
            imported++;
        }
        
        res.json({ success: true, imported, message: `${imported} molécules importées dans knowledge_base` });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── NOUVEAUX ENDPOINTS ENRICHISSEMENT MULTI-SOURCES ──

// GET /api/enrichment/stats — Statistiques d'enrichissement
app.get('/api/enrichment/stats', async (req, res) => {
    try {
        const stats = await enrichment.getEnrichmentStats(db);
        res.json(stats);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/enrichment/single/:cas — Enrichir 1 CAS (multi-sources + sauvegarde KB)
app.get('/api/enrichment/single/:cas', async (req, res) => {
    try {
        const result = await enrichment.enrichSingle(req.params.cas, null, { skipTGSC: false });
        const saveResult = await enrichment.saveToKB(db, req.params.cas, result);
        res.json({ ...result, saved: saveResult });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/enrichment/test/:cas — Test sans sauvegarde
app.get('/api/enrichment/test/:cas', async (req, res) => {
    try {
        const result = await enrichment.enrichSingle(req.params.cas, null, { skipTGSC: false });
        res.json(result);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/enrichment/batch — Batch enrichissement multi-sources
app.post('/api/enrichment/batch', express.json(), async (req, res) => {
    try {
        const batchSize = parseInt(req.body.batch_size) || 999;
        const skipTGSC = req.body.skipTGSC || false;
        const forceRefresh = req.body.forceRefresh || false;
        const offset = parseInt(req.body.offset) || 0;
        const report = await enrichment.enrichUnknownMolecules(db, { batchSize, skipTGSC, forceRefresh, offset });
        res.json(report);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/enrichment/import-claude — Import session Claude (JSON)
app.post('/api/enrichment/import-claude', express.json({ limit: '10mb' }), async (req, res) => {
    try {
        const entries = req.body.entries || req.body;
        if (!Array.isArray(entries)) {
            return res.status(400).json({ error: 'Format attendu : { entries: [...] } ou [...]' });
        }
        const report = await enrichment.importClaudeSession(db, entries);
        res.json(report);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/enrichment/needs-claude — CAS nécessitant session Claude
app.get('/api/enrichment/needs-claude', async (req, res) => {
    try {
        const list = await enrichment.exportNeedsClaude(db);
        res.json({ count: list.length, molecules: list });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/enrichment/orphans — CAS sans aucune fiche KB
app.get('/api/enrichment/orphans', async (req, res) => {
    try {
        const list = await enrichment.exportOrphans(db);
        res.json({ count: list.length, orphans: list });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════
// API Enrichissement Cires · Diagnostic Throw — Données physico-chimiques
// ══════════════════════════════════════════════════════
const waxEnrich = require('./modules/wax-enrichment');
const MOLECULE_DB_FULL = require('./modules/molecule-engine').MOLECULE_DB;

// ── Enrichissement des profils moléculaires (bp, logP, density, vapor_pressure, odor_threshold) ──
const moleculeProfiles = require('./modules/molecule-profiles');
const enrichStats = moleculeProfiles.enrichAll(MOLECULE_DB_FULL);
console.log(`✅ Profils moléculaires enrichis : ${enrichStats.total} molécules (${enrichStats.bp_measured} bp mesurés, ${enrichStats.logp_measured} logP mesurés)`);

// GET /api/wax-types — Liste des types de cires avec propriétés de référence
app.get('/api/wax-types', (req, res) => {
    res.json(waxEnrich.getAllWaxTypes());
});

// GET /api/wax-types/:type — Données complètes d'un type de cire
app.get('/api/wax-types/:type', (req, res) => {
    const data = waxEnrich.getWaxTypeData(req.params.type);
    if (!data) return res.status(404).json({ error: 'Type inconnu. Types: ' + Object.keys(waxEnrich.WAX_TYPES).join(', ') });
    res.json({ type: req.params.type, ...data });
});

// GET /api/waxes/:id/enrich — Enrichir une cire spécifique (preview sans écriture DB)
app.get('/api/waxes/:id/enrich', async (req, res) => {
    try {
        const wax = await db.get('SELECT w.*, s.name as supplier_name FROM waxes w LEFT JOIN suppliers s ON w.supplier_id = s.id WHERE w.id = ?', [req.params.id]);
        if (!wax) return res.status(404).json({ error: 'Cire non trouvée' });
        const enriched = waxEnrich.enrichWax(wax);
        res.json(enriched);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/waxes/enrich-all — Enrichir toutes les cires + écriture DB + knowledge_base
app.post('/api/waxes/enrich-all', async (req, res) => {
    try {
        const report = await waxEnrich.enrichAllWaxes(db);
        res.json(report);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/waxes/:waxId/compatibility/:fragranceId — Compatibilité cire × parfum
app.get('/api/waxes/:waxId/compatibility/:fragranceId', async (req, res) => {
    try {
        const wax = await db.get('SELECT w.*, s.name as supplier_name FROM waxes w LEFT JOIN suppliers s ON w.supplier_id = s.id WHERE w.id = ?', [req.params.waxId]);
        if (!wax) return res.status(404).json({ error: 'Cire non trouvée' });
        const components = await db.all('SELECT * FROM fragrance_components WHERE fragrance_id = ?', [req.params.fragranceId]);
        if (!components.length) return res.status(404).json({ error: 'Aucun composant FDS pour ce parfum' });
        const fragrance = await db.get('SELECT * FROM fragrances WHERE id = ?', [req.params.fragranceId]);
        const waxType = waxEnrich.classifyWax(wax);
        const analysis = waxEnrich.analyzeWaxFragranceCompatibility(waxType, components, MOLECULE_DB_FULL);
        const tips = waxEnrich.getWaxFragranceTips(waxType, analysis);
        res.json({ wax: wax.name, fragrance: fragrance?.name || '?', ...analysis, tips });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/wax-compatibility/:waxType/:fragranceId — Compatibilité par type de cire
app.get('/api/wax-compatibility/:waxType/:fragranceId', async (req, res) => {
    try {
        const components = await db.all('SELECT * FROM fragrance_components WHERE fragrance_id = ?', [req.params.fragranceId]);
        if (!components.length) return res.status(404).json({ error: 'Aucun composant FDS' });
        const fragrance = await db.get('SELECT * FROM fragrances WHERE id = ?', [req.params.fragranceId]);
        const analysis = waxEnrich.analyzeWaxFragranceCompatibility(req.params.waxType, components, MOLECULE_DB_FULL);
        const tips = waxEnrich.getWaxFragranceTips(req.params.waxType, analysis);
        res.json({ wax_type: req.params.waxType, fragrance: fragrance?.name || '?', ...analysis, tips });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/molecule/:cas/wax-interaction/:waxType — Interaction molécule × cire
app.get('/api/molecule/:cas/wax-interaction/:waxType', (req, res) => {
    const result = waxEnrich.analyzeWaxMoleculeInteraction(req.params.waxType, req.params.cas, MOLECULE_DB_FULL);
    res.json(result);
});

// GET /api/fragrances/:id/wax-matrix — Matrice complète toutes cires × 1 parfum
app.get('/api/fragrances/:id/wax-matrix', async (req, res) => {
    try {
        const components = await db.all('SELECT * FROM fragrance_components WHERE fragrance_id = ?', [req.params.id]);
        if (!components.length) return res.status(404).json({ error: 'Aucun composant FDS' });
        const fragrance = await db.get('SELECT * FROM fragrances WHERE id = ?', [req.params.id]);
        const waxTypes = ['paraffine', 'paraffine_ft', 'soja', 'colza', 'coco', 'microcristalline'];
        const matrix = {};
        for (const wt of waxTypes) {
            const analysis = waxEnrich.analyzeWaxFragranceCompatibility(wt, components, MOLECULE_DB_FULL);
            const tips = waxEnrich.getWaxFragranceTips(wt, analysis);
            matrix[wt] = {
                score: analysis.overall_score,
                cold_throw: analysis.cold_throw_estimate,
                hot_throw: analysis.hot_throw_estimate,
                risks: analysis.risks?.length || 0,
                top_tip: tips[0] || '',
                by_family: analysis.by_family
            };
        }
        res.json({ fragrance: fragrance?.name || '?', fragrance_id: req.params.id, components: components.length, matrix });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════
// API Analyse Olfactive & Diagnostic
// ══════════════════════════════════════════════════════

// GET /api/molecule/:cas/odor — Profil olfactif d'une molécule
app.get('/api/molecule/:cas/odor', (req, res) => {
    const mol = MOLECULE_DB_FULL[req.params.cas];
    if (!mol) return res.status(404).json({ error: 'CAS non trouvé' });
    res.json({
        cas: req.params.cas,
        name: mol.name,
        odor: mol.odor || null,
        odor_hot: mol.odor_hot || null,
        odor_family: mol.odor_family || null,
        odor_note: mol.odor_note || null,
        threshold: mol.threshold || null,
        volatility: mol.volatility || null,
        family: mol.family || null
    });
});

// GET /api/fragrances/:id/olfactory-profile — Profil olfactif complet d'un parfum
app.get('/api/fragrances/:id/olfactory-profile', async (req, res) => {
    try {
        const components = await db.all('SELECT * FROM fragrance_components WHERE fragrance_id = ?', [req.params.id]);
        if (!components.length) return res.status(404).json({ error: 'Aucun composant FDS pour ce parfum' });
        const fragrance = await db.get('SELECT * FROM fragrances WHERE id = ?', [req.params.id]);
        const { analyzeOlfactoryProfile } = require('./modules/molecule-engine');
        const profile = analyzeOlfactoryProfile(components);
        res.json({ fragrance: fragrance?.name || '?', fragrance_id: req.params.id, ...profile });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/fragrances/:id/olfactory-diagnostic — Diagnostic anomalie olfactive
app.post('/api/fragrances/:id/olfactory-diagnostic', async (req, res) => {
    try {
        const { issue } = req.body;
        if (!issue) return res.status(400).json({ error: 'Précisez le type de problème (sucré_à_chaud, vert_trop_fort, diffusion_faible, odeur_parasite)' });
        const components = await db.all('SELECT * FROM fragrance_components WHERE fragrance_id = ?', [req.params.id]);
        if (!components.length) return res.status(404).json({ error: 'Aucun composant FDS' });
        const fragrance = await db.get('SELECT * FROM fragrances WHERE id = ?', [req.params.id]);
        const { diagnoseOlfactoryIssue } = require('./modules/molecule-engine');
        const diagnostic = diagnoseOlfactoryIssue(components, issue);
        res.json({ fragrance: fragrance?.name || '?', fragrance_id: req.params.id, ...diagnostic });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/odor/search?q=sucré — Rechercher des molécules par descripteur olfactif
app.get('/api/odor/search', (req, res) => {
    const q = (req.query.q || '').toLowerCase().trim();
    if (!q) return res.json([]);
    const results = [];
    for (const [cas, mol] of Object.entries(MOLECULE_DB_FULL)) {
        if (!mol.odor) continue;
        const match = mol.odor.toLowerCase().includes(q) || (mol.odor_hot || '').toLowerCase().includes(q) || (mol.odor_family || '').toLowerCase().includes(q);
        if (match) {
            results.push({ cas, name: mol.name, family: mol.family, odor: mol.odor, odor_hot: mol.odor_hot, odor_family: mol.odor_family, odor_note: mol.odor_note, threshold: mol.threshold, volatility: mol.volatility });
        }
    }
    res.json(results.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
});

// ══════════════════════════════════════════════════════
// API Moteur de Recommandation de Blend
// ══════════════════════════════════════════════════════
const blendRecommender = require('./modules/blend-recommender');

// GET /api/fragrances/:id/profile — Profil moléculaire d'un parfum
app.get('/api/fragrances/:id/profile', async (req, res) => {
    try {
        const components = await db.all('SELECT * FROM fragrance_components WHERE fragrance_id = ?', [req.params.id]);
        if (!components.length) return res.status(404).json({ error: 'Aucun composant FDS' });
        const fragrance = await db.get('SELECT * FROM fragrances WHERE id = ?', [req.params.id]);
        const profile = blendRecommender.buildFragranceProfile(components, MOLECULE_DB_FULL);
        
        // Ajouter les données enrichies par molécule
        const molecules = [];
        for (const comp of components) {
            const cas = comp.cas_number || comp.cas;
            const mol = cas ? MOLECULE_DB_FULL[cas] : null;
            molecules.push({
                cas,
                name: mol?.name || comp.name,
                family: mol?.family || null,
                mw: mol?.mw || null,
                fp: mol?.fp || comp.flash_point || null,
                bp: mol?.bp || null,
                bp_source: mol?.bp_source || null,
                logp: mol?.logp ?? null,
                logp_source: mol?.logp_source || null,
                density: mol?.density || null,
                vapor_pressure_25C: mol?.vapor_pressure ?? null,
                vp_source: mol?.vp_source || null,
                odor_threshold: mol?.odor_threshold ?? null,
                ot_source: mol?.ot_source || null,
                volatility: mol?.volatility || null,
                solubility_wax: mol?.solubility_wax || null,
                impact_diffusion: mol?.impact_diffusion || null,
                impact_combustion: mol?.impact_combustion || null,
                percentage_min: comp.percentage_min,
                percentage_max: comp.percentage_max,
                identified: !!mol
            });
        }
        
        res.json({ fragrance: fragrance?.name || '?', ...profile, molecules });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/molecules/enriched — Toutes les molécules avec profils complets
app.get('/api/molecules/enriched', (req, res) => {
    const list = Object.entries(MOLECULE_DB_FULL).map(([cas, m]) => ({
        cas,
        name: m.name,
        family: m.family,
        mw: m.mw,
        fp: m.fp,
        bp: m.bp || null,
        bp_source: m.bp_source || null,
        logp: m.logp ?? null,
        logp_source: m.logp_source || null,
        density: m.density || null,
        vapor_pressure_25C: m.vapor_pressure ?? null,
        vp_source: m.vp_source || null,
        odor_threshold: m.odor_threshold ?? null,
        ot_source: m.ot_source || null,
        volatility: m.volatility,
        solubility_wax: m.solubility_wax,
        impact_diffusion: m.impact_diffusion,
        impact_combustion: m.impact_combustion,
        notes: m.notes
    }));
    const measured = list.filter(m => m.bp_source === 'mesuré').length;
    const estimated = list.filter(m => m.bp_source && m.bp_source !== 'mesuré').length;
    res.json({
        total: list.length,
        measured_bp: measured,
        estimated_bp: estimated,
        completeness: {
            bp: list.filter(m => m.bp).length,
            logp: list.filter(m => m.logp !== null).length,
            density: list.filter(m => m.density).length,
            vapor_pressure: list.filter(m => m.vapor_pressure_25C !== null).length,
            odor_threshold: list.filter(m => m.odor_threshold !== null).length
        },
        molecules: list
    });
});

// POST /api/molecules/import — Enrichir MOLECULE_DB depuis sessions Claude (recherche → JSON → import)
// Format: { molecules: [{ cas, name, family, mw, fp, bp, logp, density, vapor_pressure, odor_threshold, ... }] }
app.post('/api/molecules/import', express.json({ limit: '5mb' }), (req, res) => {
    try {
        const { molecules } = req.body;
        if (!molecules || !Array.isArray(molecules)) {
            return res.status(400).json({ error: 'Format: { molecules: [{ cas, name, ... }] }' });
        }
        let added = 0, updated = 0, skipped = 0;
        for (const m of molecules) {
            if (!m.cas) { skipped++; continue; }
            const existing = MOLECULE_DB_FULL[m.cas];
            if (existing) {
                // Mettre à jour les champs manquants (ne pas écraser les existants)
                if (m.bp && !existing.bp) { existing.bp = m.bp; existing.bp_source = 'mesuré'; }
                if (m.logp != null && existing.logp == null) { existing.logp = m.logp; existing.logp_source = m.logp_source || 'mesuré (PubChem XLogP)'; }
                if (m.density && !existing.density) { existing.density = m.density; }
                if (m.vapor_pressure != null && existing.vapor_pressure == null) { existing.vapor_pressure = m.vapor_pressure; existing.vp_source = m.vp_source || 'mesuré (25°C)'; }
                if (m.odor_threshold != null && existing.odor_threshold == null) { existing.odor_threshold = m.odor_threshold; existing.ot_source = m.ot_source || 'mesuré (TGSC/Leffingwell)'; }
                if (m.notes) existing.notes = (existing.notes || '') + ' | ' + m.notes;
                updated++;
            } else {
                // Nouvelle molécule
                MOLECULE_DB_FULL[m.cas] = {
                    name: m.name || '?',
                    family: m.family || 'inconnu',
                    mw: m.mw || 0,
                    fp: m.fp || null,
                    volatility: m.volatility || 'moyenne',
                    impact_combustion: m.impact_combustion || 'neutre',
                    impact_diffusion: m.impact_diffusion || 'neutre',
                    solubility_wax: m.solubility_wax || 'moyenne',
                    notes: m.notes || 'Importé via session Claude',
                    bp: m.bp || null,
                    bp_source: m.bp ? 'mesuré' : null,
                    logp: m.logp ?? null,
                    logp_source: m.logp != null ? (m.logp_source || 'mesuré (PubChem XLogP)') : null,
                    density: m.density || null,
                    vapor_pressure: m.vapor_pressure ?? null,
                    vp_source: m.vapor_pressure != null ? (m.vp_source || 'mesuré (25°C)') : null,
                    odor_threshold: m.odor_threshold ?? null,
                    ot_source: m.odor_threshold != null ? (m.ot_source || 'mesuré') : null
                };
                added++;
            }
        }
        // Ré-enrichir les estimations pour les nouvelles molécules
        const moleculeProfiles = require('./modules/molecule-profiles');
        moleculeProfiles.enrichAll(MOLECULE_DB_FULL);
        
        console.log(`✅ Import molécules: ${added} ajoutées, ${updated} mises à jour, ${skipped} ignorées`);
        res.json({ success: true, added, updated, skipped, total: Object.keys(MOLECULE_DB_FULL).length });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/molecules/missing — CAS trouvés dans les FDS mais absents de MOLECULE_DB
app.get('/api/molecules/missing', async (req, res) => {
    try {
        const comps = await db.all(`
            SELECT cas_number, name, COUNT(DISTINCT fragrance_id) as frequency 
            FROM fragrance_components WHERE cas_number IS NOT NULL AND cas_number != ''
            GROUP BY cas_number ORDER BY frequency DESC
        `);
        const known = new Set(Object.keys(MOLECULE_DB_FULL));
        const missing = comps.filter(c => !known.has(c.cas_number));
        res.json({
            total_unique: comps.length,
            known: comps.length - missing.length,
            missing_count: missing.length,
            missing: missing.map(c => ({ cas: c.cas_number, name: c.name, frequency: c.frequency }))
        });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/fragrances/:id/recommend-blend — Recommandation de blend optimale
app.get('/api/fragrances/:id/recommend-blend', async (req, res) => {
    try {
        const components = await db.all('SELECT * FROM fragrance_components WHERE fragrance_id = ?', [req.params.id]);
        if (!components.length) return res.status(404).json({ error: 'Aucun composant FDS' });
        const fragrance = await db.get('SELECT * FROM fragrances WHERE id = ?', [req.params.id]);
        const containerType = req.query.container || 'container';
        const report = blendRecommender.generateFullReport(components, MOLECULE_DB_FULL, containerType);
        res.json({ fragrance: fragrance?.name || '?', container_type: containerType, ...report });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/fragrances/:id/scientific-report — Rapport scientifique complet
app.get('/api/fragrances/:id/scientific-report', async (req, res) => {
    try {
        const components = await db.all('SELECT * FROM fragrance_components WHERE fragrance_id = ?', [req.params.id]);
        if (!components.length) return res.status(404).json({ error: 'Aucun composant FDS' });
        const fragrance = await db.get('SELECT * FROM fragrances WHERE id = ?', [req.params.id]);
        const containerType = req.query.container || 'container';
        const report = blendRecommender.generateScientificReport(components, MOLECULE_DB_FULL, containerType);
        res.json({ fragrance: fragrance?.name || '?', container_type: containerType, ...report });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════
// API Diagnostic Throw (cold vs hot)
// ══════════════════════════════════════════════════════
const throwDiagnostic = require('./modules/throw-diagnostic');

// GET /api/fragrances/:id/throw-diagnostic/:waxType — Diagnostic throw pour 1 cire
app.get('/api/fragrances/:id/throw-diagnostic/:waxType', async (req, res) => {
    try {
        const components = await db.all('SELECT * FROM fragrance_components WHERE fragrance_id = ?', [req.params.id]);
        if (!components.length) return res.status(404).json({ error: 'Aucun composant FDS' });
        const fragrance = await db.get('SELECT * FROM fragrances WHERE id = ?', [req.params.id]);
        const profile = throwDiagnostic.analyzeThrowProfile(components, MOLECULE_DB_FULL, req.params.waxType, { fragrance_flash_point: fragrance?.flash_point });
        const recs = throwDiagnostic.generateThrowRecommendations(profile);
        const rapport = throwDiagnostic.generateScientificReport(profile, MOLECULE_DB_FULL);
        res.json({ fragrance: fragrance?.name || '?', flash_point_fds: fragrance?.flash_point || null, ...profile, recommendations: recs, rapport });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/fragrances/:id/throw-comparison — Comparaison throw toutes cires
app.get('/api/fragrances/:id/throw-comparison', async (req, res) => {
    try {
        const components = await db.all('SELECT * FROM fragrance_components WHERE fragrance_id = ?', [req.params.id]);
        if (!components.length) return res.status(404).json({ error: 'Aucun composant FDS' });
        const fragrance = await db.get('SELECT * FROM fragrances WHERE id = ?', [req.params.id]);
        const comparison = throwDiagnostic.compareThrowAcrossWaxes(components, MOLECULE_DB_FULL);
        res.json({ fragrance: fragrance?.name || '?', ...comparison });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/fragrances/:id/optimization/:waxType — Plan d'optimisation produit existant
app.get('/api/fragrances/:id/optimization/:waxType', async (req, res) => {
    try {
        const components = await db.all('SELECT * FROM fragrance_components WHERE fragrance_id = ?', [req.params.id]);
        if (!components.length) return res.status(404).json({ error: 'Aucun composant FDS' });
        const fragrance = await db.get('SELECT * FROM fragrances WHERE id = ?', [req.params.id]);
        const profile = throwDiagnostic.analyzeThrowProfile(components, MOLECULE_DB_FULL, req.params.waxType, { fragrance_flash_point: fragrance?.flash_point });
        const rapport = throwDiagnostic.generateScientificReport(profile, MOLECULE_DB_FULL);
        const comparison = throwDiagnostic.compareThrowAcrossWaxes(components, MOLECULE_DB_FULL);
        const optimization = throwDiagnostic.generateOptimization(profile, rapport, comparison, MOLECULE_DB_FULL);
        res.json({ fragrance: fragrance?.name || '?', wax: req.params.waxType, optimization });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/fragrances/:id/report-pdf/:waxType — Générer compte-rendu PDF
app.get('/api/fragrances/:id/report-pdf/:waxType', async (req, res) => {
    try {
        const components = await db.all('SELECT * FROM fragrance_components WHERE fragrance_id = ?', [req.params.id]);
        if (!components.length) return res.status(404).json({ error: 'Aucun composant FDS' });
        const fragrance = await db.get('SELECT * FROM fragrances WHERE id = ?', [req.params.id]);
        const profile = throwDiagnostic.analyzeThrowProfile(components, MOLECULE_DB_FULL, req.params.waxType, { fragrance_flash_point: fragrance?.flash_point });
        const rapport = throwDiagnostic.generateScientificReport(profile, MOLECULE_DB_FULL);
        
        const PDFDocument = require('pdfkit');
        const doc = new PDFDocument({ size: 'A4', margins: { top: 55, bottom: 50, left: 50, right: 50 } });
        
        const safeName = (fragrance?.name || 'parfum').replace(/[^a-zA-Z0-9_-]/g, '_');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="MFC_Rapport_${safeName}_${req.params.waxType}.pdf"`);
        doc.pipe(res);
        
        const GOLD = '#B8860B'; const DARK = '#2C1810'; const BLUE = '#1565C0';
        const GREEN = '#2E7D32'; const RED = '#C62828'; const ORANGE = '#E65100'; const GREY = '#666666';
        const W = 495;
        
        // Sanitize: remove all unicode symbols that pdfkit can't render
        const clean = (s) => (s||'').replace(/[^\x20-\x7E\u00C0-\u00FF]/g, '').replace(/½/g, '1/2').replace(/[δχη×]/g, '');
        
        const scoreColor = (s) => s >= 7 ? GREEN : s >= 5 ? ORANGE : RED;
        let pageNum = 1;
        
        function header() {
            doc.save();
            doc.moveTo(50, 42).lineTo(545, 42).strokeColor(GOLD).lineWidth(1.5).stroke();
            doc.fontSize(7).fillColor(GOLD).font('Helvetica-Bold').text('MFC LABORATOIRE', 50, 30);
            doc.fontSize(6).fillColor(GREY).font('Helvetica').text('Maison Francaise des Cires', 400, 30, { width: 145, align: 'right' });
            doc.restore();
        }
        function footer() {
            const fy = 800;
            doc.save();
            doc.moveTo(50, fy).lineTo(545, fy).strokeColor('#DDD').lineWidth(0.5).stroke();
            doc.fontSize(5.5).fillColor(GREY).font('Helvetica');
            doc.text('Rapport MFC Laboratoire - Document confidentiel', 50, fy + 3, { width: 300, lineBreak: false });
            doc.text('Page ' + pageNum, 450, fy + 3, { width: 95, align: 'right', lineBreak: false });
            doc.restore();
        }
        function newPage() { footer(); pageNum++; doc.addPage(); header(); return 55; }
        function checkY(y, need) { return y + need > 780 ? newPage() : y; }
        
        header();
        let y = 55;
        
        // ═══ TITRE ═══
        doc.fontSize(14).font('Helvetica-Bold').fillColor(DARK).text("COMPTE-RENDU D'ANALYSE DE DIFFUSION", 50, y);
        y += 18;
        doc.fontSize(8).font('Helvetica').fillColor(GREY).text(`${fragrance?.name || '?'}  x  ${profile.wax_name || req.params.waxType}  |  ${new Date().toLocaleDateString('fr-FR')}  |  ${profile.molecules?.length || 0} molecules`, 50, y, { width: W });
        y += 14;
        
        // ═══ SCORES ═══
        const sf = rapport.score_froid || 0;
        const sc = rapport.score_chaud || 0;
        const sg = rapport.score_global || 0;
        doc.fontSize(10).font('Helvetica-Bold');
        doc.fillColor(BLUE).text(`Froid: ${sf}/10`, 50, y, { width: 130, continued: false });
        doc.fillColor(ORANGE).text(`Chaud: ${sc}/10`, 190, y, { width: 130 });
        doc.fillColor(scoreColor(sg)).text(`Global: ${sg}/10`, 340, y, { width: 130 });
        y += 14;
        if (rapport.verdict_froid) { doc.fontSize(7).font('Helvetica').fillColor(BLUE).text(`Froid: ${clean(rapport.verdict_froid)}`, 50, y, { width: W }); y = doc.y + 1; }
        if (rapport.verdict_chaud) { doc.fontSize(7).font('Helvetica').fillColor(ORANGE).text(`Chaud: ${clean(rapport.verdict_chaud)}`, 50, y, { width: W }); y = doc.y + 1; }
        y += 4;
        
        // ═══ CONCLUSION ═══
        if (rapport.conclusion) {
            doc.fontSize(8).font('Helvetica-Bold').fillColor(DARK).text('Conclusion', 50, y); y += 10;
            doc.fontSize(7.5).font('Helvetica').fillColor(DARK).text(clean(rapport.conclusion), 50, y, { width: W, lineGap: 1 }); y = doc.y + 8;
        }
        
        // ═══ CHARGE MAX ═══
        const cm = profile.charge_max_scientifique;
        if (cm) {
            y = checkY(y, 40);
            doc.moveTo(50, y).lineTo(545, y).strokeColor('#DDD').lineWidth(0.5).stroke(); y += 4;
            doc.fontSize(9).font('Helvetica-Bold').fillColor(GOLD).text('CHARGE MAXIMALE RECOMMANDEE', 50, y); y += 12;
            doc.fontSize(10).font('Helvetica-Bold').fillColor(GREEN).text(cm.charge_display, 50, y); y += 14;
            const f = cm.formule || {};
            doc.fontSize(6.5).font('Helvetica').fillColor(GREY).text(
                `Base theo. ${f.base||12}% x Solubilite(${f.solubility_factor||'?'}) x Cristaux(${f.crystal_factor||'?'}) x Viscosite(${f.viscosity_factor||'?'}) x Securite(${f.safety_factor||'?'}) = ${f.resultat||'?'}% recommande`, 50, y, { width: W }
            ); y = doc.y + 2;
            const pp = cm.parametres_parfum || {}; const pc = cm.parametres_cire || {};
            doc.fontSize(6).text(
                `Hildebrand parfum: ${pp.delta_hildebrand_estime||'?'} MPa | Hildebrand cire: ${pc.delta_hildebrand||'?'} MPa | Flory-Huggins: ${pp.chi_flory_huggins||'?'} | LogP moyen: ${pp.logP_moyen||'?'} | MW moyen: ${pp.masse_mol_moyenne||'?'} g/mol`, 50, y, { width: W }
            ); y = doc.y + 6;
        }
        
        // ═══ Helper: render a list of analyse factors ═══
        function renderFacteurs(items, title, titleColor) {
            if (!items.length) return;
            y = checkY(y, 25);
            doc.moveTo(50, y).lineTo(545, y).strokeColor('#DDD').lineWidth(0.5).stroke(); y += 4;
            doc.fontSize(9).font('Helvetica-Bold').fillColor(titleColor).text(title, 50, y); y += 12;
            items.forEach(a => {
                y = checkY(y, 20);
                const col = a.impact === 'positif' ? GREEN : a.impact === 'negatif' ? RED : ORANGE;
                const ic = a.impact === 'positif' ? '(+)' : a.impact === 'negatif' ? '(-)' : '(=)';
                doc.fontSize(7.5).font('Helvetica-Bold').fillColor(col).text(`${ic} ${a.zone ? '['+a.zone+'] ' : ''}${clean(a.facteur)}: ${clean(a.valeur)}`, 50, y, { width: W });
                y = doc.y + 1;
                doc.fontSize(6.5).font('Helvetica').fillColor(DARK).text(clean(a.explication), 58, y, { width: W - 8 }); y = doc.y + 1;
                if (a.loi) {
                    doc.fontSize(6).font('Helvetica-Oblique').fillColor(BLUE).text(`Loi: ${clean(a.loi)}`, 58, y, { width: W - 8 }); y = doc.y + 1;
                }
                y += 3;
            });
        }
        
        // Problemes
        const problemes = [];
        (rapport.analyse_froid || []).forEach(a => { if (a.impact === 'negatif') problemes.push({ ...a, zone: 'FROID' }); });
        (rapport.analyse_chaud || []).forEach(a => { if (a.impact === 'negatif') problemes.push({ ...a, zone: 'CHAUD' }); });
        renderFacteurs(problemes, 'PROBLEMES IDENTIFIES', RED);
        
        // Points forts
        const atouts = [];
        (rapport.analyse_froid || []).forEach(a => { if (a.impact === 'positif') atouts.push({ ...a, zone: 'FROID' }); });
        (rapport.analyse_chaud || []).forEach(a => { if (a.impact === 'positif') atouts.push({ ...a, zone: 'CHAUD' }); });
        renderFacteurs(atouts, 'POINTS FORTS', GREEN);
        
        // Bloquants
        const bloquants = rapport.bloquants || [];
        if (bloquants.length > 0) {
            y = checkY(y, 20);
            doc.moveTo(50, y).lineTo(545, y).strokeColor('#DDD').lineWidth(0.5).stroke(); y += 4;
            doc.fontSize(9).font('Helvetica-Bold').fillColor(GOLD).text('MOLECULES BLOQUANTES', 50, y); y += 12;
            bloquants.slice(0, 5).forEach(b => {
                y = checkY(y, 14);
                doc.fontSize(7).font('Helvetica-Bold').fillColor(RED).text(`${clean(b.nom)} (${b.pct||'?'}%, MW ${b.mw||'?'})`, 50, y, { width: W }); y = doc.y + 1;
                (b.problemes || []).forEach(p => { doc.fontSize(6).fillColor(GREY).text(`  - ${clean(p)}`, 58, y, { width: W-8 }); y = doc.y + 1; });
                y += 2;
            });
        }
        
        // Boosters
        const boosters = rapport.boosters || [];
        if (boosters.length > 0) {
            y = checkY(y, 20);
            doc.moveTo(50, y).lineTo(545, y).strokeColor('#DDD').lineWidth(0.5).stroke(); y += 4;
            doc.fontSize(9).font('Helvetica-Bold').fillColor(GOLD).text('MOLECULES MOTRICES', 50, y); y += 10;
            boosters.slice(0, 6).forEach(b => {
                y = checkY(y, 10);
                doc.fontSize(6.5).font('Helvetica-Bold').fillColor(GREEN).text(`+ ${clean(b.nom)}`, 50, y, { width: 110, continued: true });
                doc.font('Helvetica').fillColor(DARK).text(` ${b.pct||'?'}% | MW ${b.mw||'?'} | ${(b.roles||[]).join(', ')}`, { width: W - 110 });
                y = doc.y + 2;
            });
        }
        
        // Methodologie
        y = checkY(y, 35);
        y += 4;
        doc.moveTo(50, y).lineTo(545, y).strokeColor('#DDD').lineWidth(0.5).stroke(); y += 4;
        doc.fontSize(7).font('Helvetica-Bold').fillColor(GOLD).text('METHODOLOGIE', 50, y); y += 10;
        doc.fontSize(6).font('Helvetica').fillColor(GREY).text(
            'Diffusion: Clausius-Clapeyron (pression vapeur) + Stokes-Einstein (diffusion moleculaire). Charge max: Flory-Huggins + Hildebrand. Sources: PubChem, Barton 1991, Hansen 2007, Leffingwell, MFC.',
            50, y, { width: W, lineGap: 1 }
        );
        
        // Footer already rendered inline - just end
        doc.end();
        
    } catch (e) { 
        console.error('PDF report error:', e.message);
        if (!res.headersSent) res.status(500).json({ error: e.message }); 
    }
});

// ══════════════════════════════════════════════════════
// POST /api/fragrances/cleanup — Nettoyer la base parfums
// Supprime : noms de fichiers PDF, headers/bruit, doublons
// ══════════════════════════════════════════════════════
app.post('/api/fragrances/cleanup', async (req, res) => {
    try {
        const dryRun = req.query.dry === '1';
        const log = [];
        let deleted = 0, merged = 0;

        const all = await db.all('SELECT id, name, reference FROM fragrances ORDER BY id');

        // 1. Supprimer les noms de fichiers PDF
        for (const f of all) {
            if (f.name && f.name.toUpperCase().endsWith('.PDF')) {
                log.push({ action: 'delete', reason: 'pdf_filename', name: f.name, id: f.id });
                if (!dryRun) {
                    await db.run('DELETE FROM fragrance_components WHERE fragrance_id = ?', [f.id]);
                    await db.run('DELETE FROM fragrances WHERE id = ?', [f.id]);
                }
                deleted++;
            }
        }

        // 2. Supprimer le bruit (headers FDS mal parsés)
        const noiseNames = ['NOM COMMERCIAL', 'NOM DE LA SUBSTANCE/MÉLANGE', 'EAN',
            'ÉDITÉE LE :', 'ATELIER DE PRODUCTIONS AROMATIQUES', 'COULEUR LIQUIDE POUR BOUGIES',
            '03-16 PAEVA', '05:33 A MINHA VIDA PORTUGUESA'];
        for (const f of all) {
            if (noiseNames.includes(f.name)) {
                log.push({ action: 'delete', reason: 'noise_header', name: f.name, id: f.id });
                if (!dryRun) {
                    await db.run('DELETE FROM fragrance_components WHERE fragrance_id = ?', [f.id]);
                    await db.run('DELETE FROM fragrances WHERE id = ?', [f.id]);
                }
                deleted++;
            }
        }

        // 3. Fusionner les doublons (même parfum avec et sans ref dans le nom)
        // Ex: "ARMAGNAC" + "ARMAGNAC G 117 11061" → garder celui avec composants, supprimer l'autre
        const remaining = await db.all('SELECT f.id, f.name, f.reference, COUNT(fc.id) as comp_count FROM fragrances f LEFT JOIN fragrance_components fc ON fc.fragrance_id = f.id GROUP BY f.id ORDER BY f.name');
        
        const processed = new Set();
        for (let i = 0; i < remaining.length; i++) {
            if (processed.has(remaining[i].id)) continue;
            for (let j = i + 1; j < remaining.length; j++) {
                if (processed.has(remaining[j].id)) continue;
                const a = remaining[i], b = remaining[j];
                const an = a.name.toUpperCase().replace(/['']/g, '').trim();
                const bn = b.name.toUpperCase().replace(/['']/g, '').trim();
                
                // Detect duplicates: exact match after normalization, or one has a ref code appended
                // A "ref suffix" is: starts with a letter+space+digits pattern (G 116 xxx, RT12345, etc.)
                // NOT: additional name words like "CASSIS", "ENCHANTE", "MOD"
                let isDup = false;
                if (an === bn) isDup = true;
                else if (an.replace(/[^A-Z0-9]/g, '') === bn.replace(/[^A-Z0-9]/g, '')) isDup = true;
                else {
                    // Check if one is the other + a reference suffix
                    let shorter = null, longer = null;
                    if (bn.startsWith(an + ' ') && bn.length > an.length + 3) { shorter = an; longer = bn; }
                    else if (an.startsWith(bn + ' ') && an.length > bn.length + 3) { shorter = bn; longer = an; }
                    
                    if (shorter && longer) {
                        const suffix = longer.substring(shorter.length).trim();
                        // Suffix must look like a reference code, not a name word
                        // Reference patterns: "G 117 11061", "G118 20556", "RT8137", "6371886 FranceSDS..."
                        // Name words: "CASSIS", "ENCHANTE", "MOD", "CANDLE"
                        const isRefSuffix = /^[A-Z]?\s*\d[\d\s]+/.test(suffix)  // starts with optional letter + digits
                            || /^\d{4,}/.test(suffix)                            // starts with 4+ digits
                            || /^(RT|AR|ITM|EAN|EAP)\d/.test(suffix);           // known ref prefixes
                        isDup = isRefSuffix;
                    }
                }
                
                if (isDup) {
                    // Keep the one with more components, or shorter name if equal
                    const keep = a.comp_count >= b.comp_count ? a : (b.comp_count > a.comp_count ? b : (a.name.length <= b.name.length ? a : b));
                    const remove = keep.id === a.id ? b : a;
                    
                    log.push({ action: 'merge', keep: keep.name + ' (id=' + keep.id + ', ' + keep.comp_count + ' comp)', remove: remove.name + ' (id=' + remove.id + ', ' + remove.comp_count + ' comp)' });
                    
                    if (!dryRun) {
                        // Transfer components if remove has more
                        if (remove.comp_count > 0 && keep.comp_count === 0) {
                            await db.run('UPDATE fragrance_components SET fragrance_id = ? WHERE fragrance_id = ?', [keep.id, remove.id]);
                        }
                        // Transfer reference if keep has none
                        if (!keep.reference && remove.reference) {
                            await db.run('UPDATE fragrances SET reference = ? WHERE id = ?', [remove.reference, keep.id]);
                        }
                        // Update formulations pointing to remove
                        await db.run('UPDATE formulations SET fragrance_id = ? WHERE fragrance_id = ?', [keep.id, remove.id]);
                        // Delete remove
                        await db.run('DELETE FROM fragrance_components WHERE fragrance_id = ?', [remove.id]);
                        await db.run('DELETE FROM fragrances WHERE id = ?', [remove.id]);
                    }
                    merged++;
                    processed.add(remove.id);
                }
            }
        }

        const finalCount = dryRun ? all.length - deleted - merged : (await db.get('SELECT COUNT(*) as c FROM fragrances')).c;
        
        res.json({
            mode: dryRun ? 'DRY RUN (rien modifié)' : 'EXÉCUTÉ',
            deleted, merged,
            before: all.length, after: finalCount,
            log
        });
    } catch (e) {
        console.error('Cleanup error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// ══════════════════════════════════════════════════════
// POST /api/fragrances/:id/repair-components — Corriger composants mal parsés
// Body: { components: [{cas, name, percentage}] }
// ══════════════════════════════════════════════════════
app.post('/api/fragrances/:id/repair-components', async (req, res) => {
    try {
        const fragId = req.params.id;
        const { components } = req.body;
        const dry = req.query.dry === '1';
        
        const frag = await db.get('SELECT * FROM fragrances WHERE id = ?', [fragId]);
        if (!frag) return res.status(404).json({ error: 'Parfum non trouvé' });
        
        const existing = await db.all('SELECT * FROM fragrance_components WHERE fragrance_id = ?', [fragId]);
        
        if (dry) {
            return res.json({ 
                fragrance: frag.name, 
                existing_count: existing.length,
                new_count: components.length,
                preview: components.slice(0, 5)
            });
        }
        
        // Delete existing bad components
        await db.run('DELETE FROM fragrance_components WHERE fragrance_id = ?', [fragId]);
        
        // Insert corrected components
        let inserted = 0;
        for (const c of components) {
            if (!c.cas && !c.name) continue;
            // Find molecule_id if exists
            
            
            await db.run(
                `INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max, flash_point)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [fragId, c.cas || null, c.name, c.percentage || null, c.percentage || null, (c.cas ? _MOL_FP[c.cas] : null) || null]
            );
            inserted++;
        }
        
        res.json({ success: true, fragrance: frag.name, deleted: existing.length, inserted });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/fragrances/batch-repair — Corriger plusieurs parfums en une fois
// Body: { repairs: [{name_pattern, components: [{cas, name, percentage}]}] }
app.post('/api/fragrances/batch-repair', async (req, res) => {
    try {
        const { repairs } = req.body;
        const results = [];
        
        for (const repair of repairs) {
            const frag = await db.get(
                'SELECT * FROM fragrances WHERE UPPER(name) LIKE ?',
                ['%' + repair.name_pattern.toUpperCase() + '%']
            );
            if (!frag) {
                results.push({ pattern: repair.name_pattern, status: 'not_found' });
                continue;
            }
            
            await db.run('DELETE FROM fragrance_components WHERE fragrance_id = ?', [frag.id]);
            
            let inserted = 0;
            for (const c of repair.components) {
                if (!c.cas && !c.name) continue;
                
                
                await db.run(
                    `INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max, flash_point)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [frag.id, c.cas || null, c.name, c.percentage || null, c.percentage || null, (c.cas ? _MOL_FP[c.cas] : null) || null]
                );
                inserted++;
            }
            results.push({ pattern: repair.name_pattern, id: frag.id, name: frag.name, inserted });
        }
        
        res.json({ success: true, results });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/fragrances/fix-component-name — Corriger le nom d'un composant par CAS
app.post('/api/fragrances/fix-component-name', async (req, res) => {
    try {
        const { cas, new_name } = req.body;
        if (!cas || !new_name) return res.status(400).json({ error: 'cas et new_name requis' });
        const result = await db.run(
            'UPDATE fragrance_components SET name = ? WHERE cas_number = ?',
            [new_name, cas]
        );
        res.json({ success: true, updated: result.changes || 0, cas, new_name });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/molecules/bulk-add — Ajouter manuellement des molécules au dictionnaire (knowledge_base)
app.post('/api/molecules/bulk-add', async (req, res) => {
    try {
        const { molecules } = req.body; // [{cas, name, mw, bp, family, volatility, odor}]
        if (!molecules || !molecules.length) return res.status(400).json({ error: 'molecules array requis' });
        let added = 0;
        for (const m of molecules) {
            const content = JSON.stringify({
                name: m.name, cas: m.cas, molecular_weight: m.mw || null,
                boiling_point: m.bp || null, flash_point: m.fp || null,
                family: m.family || '', volatility: m.volatility || '',
                odor: m.odor || '', source: 'manual_enrichment'
            });
            await db.run(
                `INSERT OR REPLACE INTO knowledge_base (category, subcategory, title, content, source, priority, tags)
                 VALUES ('molecule_db', ?, ?, ?, 'enrichissement_manuel', 5, ?)`,
                [m.family || 'unknown', `${m.name} (${m.cas})`, content, `molecule,manual,${m.cas},${m.family||''}`]
            );
            added++;
        }
        res.json({ success: true, added });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/throw-kb/import — Injecter thermodynamique dans KB
app.post('/api/throw-kb/import', async (req, res) => {
    try {
        const entries = throwDiagnostic.generateThrowKBEntries();
        let imported = 0;
        for (const entry of entries) {
            await db.run(
                'INSERT OR REPLACE INTO knowledge_base (category, subcategory, title, content, source, priority, tags) VALUES (?,?,?,?,?,?,?)',
                [entry.category, entry.subcategory, entry.title, entry.content, entry.source, entry.priority, entry.tags]
            );
            imported++;
        }
        res.json({ success: true, imported, message: `${imported} entrees thermodynamiques importees` });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/blend-matrix — Matrice d'interactions entre cires
app.get('/api/blend-matrix', (req, res) => {
    res.json(blendRecommender.WAX_BLEND_MATRIX);
});

// POST /api/blend-kb/import — Injecter les données blend dans la KB
app.post('/api/blend-kb/import', async (req, res) => {
    try {
        const entries = blendRecommender.generateBlendKBEntries();
        let imported = 0;
        for (const entry of entries) {
            await db.run(
                'INSERT OR REPLACE INTO knowledge_base (category, subcategory, title, content, source, priority, tags) VALUES (?,?,?,?,?,?,?)',
                [entry.category, entry.subcategory, entry.title, entry.content, entry.source, entry.priority, entry.tags]
            );
            imported++;
        }
        res.json({ success: true, imported, message: `${imported} entrées blend importées dans la KB` });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// API : Recherche PubMed (NCBI E-utilities — gratuit)
app.get('/api/research/pubmed', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: 'Paramètre q requis' });
    
    try {
        // Step 1: Search for IDs
        const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=10&retmode=json&sort=relevance`;
        const searchRes = await fetch(searchUrl);
        const searchData = await searchRes.json();
        
        const ids = searchData.esearchresult?.idlist || [];
        if (ids.length === 0) {
            return res.json({ articles: [], total: 0 });
        }
        
        // Step 2: Fetch summaries
        const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json`;
        const summaryRes = await fetch(summaryUrl);
        const summaryData = await summaryRes.json();
        
        // Step 3: Fetch abstracts
        const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${ids.join(',')}&rettype=abstract&retmode=xml`;
        const fetchRes = await fetch(fetchUrl);
        const fetchText = await fetchRes.text();
        
        // Parse abstracts from XML (simple extraction)
        const abstracts = {};
        const abstractMatches = [...fetchText.matchAll(/<PMID[^>]*>(\d+)<\/PMID>[\s\S]*?<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g)];
        abstractMatches.forEach(m => {
            const pmid = m[1];
            // Clean XML tags from abstract
            const abstract = m[2].replace(/<[^>]+>/g, '').trim();
            if (!abstracts[pmid]) abstracts[pmid] = abstract;
            else abstracts[pmid] += ' ' + abstract;
        });
        
        const articles = ids.map(pmid => {
            const s = summaryData.result?.[pmid] || {};
            const authors = (s.authors || []).map(a => a.name).slice(0, 3).join(', ');
            // Extract DOI from articleids
            const doiObj = (s.articleids || []).find(a => a.idtype === 'doi');
            return {
                pmid,
                title: s.title || '',
                authors: authors + (s.authors?.length > 3 ? ' et al.' : ''),
                journal: s.fulljournalname || s.source || '',
                year: s.pubdate ? s.pubdate.split(' ')[0] : '',
                doi: doiObj?.value || '',
                abstract: abstracts[pmid] || ''
            };
        });
        
        res.json({ 
            articles, 
            total: parseInt(searchData.esearchresult?.count || 0),
            query 
        });
    } catch(e) {
        res.status(500).json({ error: 'Erreur PubMed: ' + e.message });
    }
});

// API : Recherche PubChem (par CAS ou nom)
app.get('/api/research/pubchem', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: 'Paramètre q requis' });
    
    try {
        // Try by name first
        const searchType = /^\d{2,7}-\d{2}-\d$/.test(query) ? 'name' : 'name';
        const searchUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/${searchType}/${encodeURIComponent(query)}/property/MolecularWeight,MolecularFormula,IUPACName,ExactMass,CanonicalSMILES/JSON`;
        
        const searchRes = await fetch(searchUrl);
        if (!searchRes.ok) {
            return res.json({ found: false, query });
        }
        const data = await searchRes.json();
        const props = data.PropertyTable?.Properties?.[0];
        
        if (!props) return res.json({ found: false, query });
        
        res.json({
            found: true,
            cid: props.CID,
            name: props.IUPACName || query,
            molecular_formula: props.MolecularFormula,
            molecular_weight: props.MolecularWeight,
            exact_mass: props.ExactMass,
            smiles: props.CanonicalSMILES,
            pubchem_url: `https://pubchem.ncbi.nlm.nih.gov/compound/${props.CID}`
        });
    } catch(e) {
        res.status(500).json({ error: 'Erreur PubChem: ' + e.message });
    }
});

// API : Recherche PubMed (NCBI E-utilities — gratuit)
