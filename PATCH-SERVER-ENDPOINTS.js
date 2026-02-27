/**
 * MFC Laboratoire — Endpoints enrichissement multi-sources
 * 
 * INSTRUCTIONS DE MIGRATION :
 * 
 * 1. Remplacer dans server.js :
 *    const pubchem = require('./modules/pubchem-enrichment');
 *    → const enrichment = require('./modules/molecule-enrichment');
 * 
 * 2. Remplacer les endpoints /api/pubchem/* par ceux ci-dessous
 * 
 * 3. Remplacer la fonction getMoleculeKB() locale par :
 *    enrichment.getMoleculeKB(db)
 * 
 * 4. Garder le fichier pubchem-enrichment.js en backup (ne pas supprimer)
 */

// ═══════════════════════════════════════════════════════════════
// COPIER CES ENDPOINTS DANS server.js
// (remplacer les anciens /api/pubchem/*)
// ═══════════════════════════════════════════════════════════════

// --- Stats enrichissement ---
// GET /api/enrichment/stats
app.get('/api/enrichment/stats', (req, res) => {
    try {
        const stats = enrichment.getEnrichmentStats(db);
        res.json(stats);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Enrichir un CAS unique ---
// GET /api/enrichment/single/:cas
app.get('/api/enrichment/single/:cas', async (req, res) => {
    try {
        const cas = req.params.cas;
        const skipTGSC = req.query.skipTGSC === 'true';
        
        const result = await enrichment.enrichSingle(cas, null, { skipTGSC });
        
        // Sauvegarder en KB
        const saveResult = enrichment.saveToKB(db, cas, result);
        
        res.json({
            ...result,
            saved: saveResult
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Enrichir un CAS unique (test sans sauvegarde) ---
// GET /api/enrichment/test/:cas
app.get('/api/enrichment/test/:cas', async (req, res) => {
    try {
        const cas = req.params.cas;
        const result = await enrichment.enrichSingle(cas, null, { skipTGSC: false });
        res.json(result);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Batch enrichissement (tous les CAS inconnus) ---
// POST /api/enrichment/batch
app.post('/api/enrichment/batch', express.json(), async (req, res) => {
    try {
        const batchSize = parseInt(req.body.batch_size) || 999;
        const skipTGSC = req.body.skipTGSC || false;
        const forceRefresh = req.body.forceRefresh || false;

        const report = await enrichment.enrichUnknownMolecules(db, {
            batchSize,
            skipTGSC,
            forceRefresh
        });

        res.json(report);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Batch enrichissement avec SSE (progression temps réel) ---
// GET /api/enrichment/batch/stream?batch_size=999&skipTGSC=false
app.get('/api/enrichment/batch/stream', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
        const batchSize = parseInt(req.query.batch_size) || 999;
        const skipTGSC = req.query.skipTGSC === 'true';

        const report = await enrichment.enrichUnknownMolecules(db, {
            batchSize,
            skipTGSC,
            onProgress: (progress) => {
                res.write(`data: ${JSON.stringify(progress)}\n\n`);
            }
        });

        res.write(`data: ${JSON.stringify({ done: true, report })}\n\n`);
        res.end();
    } catch (e) {
        res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
        res.end();
    }
});

// --- Import session Claude (JSON) ---
// POST /api/enrichment/import-claude
app.post('/api/enrichment/import-claude', express.json({ limit: '10mb' }), (req, res) => {
    try {
        const entries = req.body.entries || req.body;
        if (!Array.isArray(entries)) {
            return res.status(400).json({ error: 'Format attendu : { entries: [...] } ou [...]' });
        }

        const report = enrichment.importClaudeSession(db, entries);
        res.json(report);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Export CAS qui nécessitent enrichissement Claude ---
// GET /api/enrichment/needs-claude
app.get('/api/enrichment/needs-claude', (req, res) => {
    try {
        const list = enrichment.exportNeedsClaude(db);
        res.json({ count: list.length, molecules: list });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Export CAS orphelins (aucune fiche KB) ---
// GET /api/enrichment/orphans
app.get('/api/enrichment/orphans', (req, res) => {
    try {
        const list = enrichment.exportOrphans(db);
        res.json({ count: list.length, orphans: list });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════
// RÉTROCOMPATIBILITÉ — ANCIENS ENDPOINTS /api/pubchem/*
// Redirigent vers les nouveaux endpoints
// ═══════════════════════════════════════════════════════════════

// Ancien : GET /api/pubchem/enrich/:cas → Nouveau : GET /api/enrichment/single/:cas
app.get('/api/pubchem/enrich/:cas', async (req, res) => {
    try {
        const cas = req.params.cas;
        const result = await enrichment.enrichSingle(cas, null, { skipTGSC: false });
        enrichment.saveToKB(db, cas, result);
        
        // Format de réponse compatible ancien endpoint
        res.json({
            found: result.sources_found > 0,
            cas: result.cas,
            iupac_name: result.iupac_name,
            molecular_weight: result.molecular_weight,
            logp: result.logp,
            sources: result.sources
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Ancien : POST /api/pubchem/batch-enrich → Nouveau : POST /api/enrichment/batch
app.post('/api/pubchem/batch-enrich', express.json(), async (req, res) => {
    try {
        const batchSize = parseInt(req.body.batch_size) || 999;
        const report = await enrichment.enrichUnknownMolecules(db, { batchSize });
        
        // Format compatible ancien rapport
        res.json({
            total_unknown: report.total_to_process,
            enriched: report.enriched,
            failed: report.failed,
            already_known: report.already_known,
            stats: report.stats
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════
// REMPLACEMENT DE getMoleculeKB() DANS LE SERVEUR
// ═══════════════════════════════════════════════════════════════
// 
// Chercher dans server.js la fonction getMoleculeKB() (~ ligne 8728)
// et la remplacer par :
//
//   function getMoleculeKB() {
//       return enrichment.getMoleculeKB(db);
//   }
//
// Cela garantit que les endpoints prédictifs utilisent le nouveau format
// de métadonnées (avec odor_type, sources, etc.)
// ═══════════════════════════════════════════════════════════════
