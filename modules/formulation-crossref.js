/**
 * MFC Laboratoire — Croisement FDS × Formulations
 * Base de corrélations parfum → recette validée (données terrain ~219 Excel)
 * 
 * Chaque entrée = une formulation réelle validée en production
 */

const VALIDATED_FORMULATIONS = [
    // ═══ TRIPARTITE STANDARD 49/36/5 (MFC-A) ═══
    // ~90+ bougies validées avec cette base
    { parfum: 'Ambre Délice', client: 'MFC', recette: 'MFC-A', pct_parfum: 10, meche: 'LX20', contenant: 'Macaron 25', masse: 200, notes: 'Standard' },
    { parfum: 'Pink Vibe', client: 'MFC', recette: 'MFC-A', pct_parfum: 10, meche: 'LX20', contenant: 'Biscuit 25', masse: 200, notes: 'Standard' },
    { parfum: 'Pois de Senteur', client: 'MFC', recette: 'MFC-A', pct_parfum: 10, meche: 'LX20', contenant: 'Biscuit 25', masse: 200, notes: 'Standard' },
    { parfum: 'Pompadour', client: 'MFC', recette: 'MFC-A', pct_parfum: 10, meche: 'LX20', contenant: 'Macaron 25', masse: 200, notes: 'Standard' },
    { parfum: 'Roma', client: 'MFC', recette: 'MFC-A', pct_parfum: 10, meche: 'LX20', contenant: 'Macaron 25', masse: 200, notes: 'Standard' },
    { parfum: 'Rouge Bisous Madame', client: 'MFC', recette: 'MFC-A', pct_parfum: 10, meche: 'LX20', contenant: 'Macaron 25', masse: 200, notes: 'Standard' },
    { parfum: 'Sa Majesté au Bois', client: 'MFC', recette: 'MFC-A', pct_parfum: 10, meche: 'LX20', contenant: 'Macaron 25', masse: 200, notes: 'Standard' },
    { parfum: 'Singapour Jasmin', client: 'MFC', recette: 'MFC-A', pct_parfum: 10, meche: 'LX20', contenant: 'Macaron 25', masse: 200, notes: 'Standard' },
    { parfum: 'Tokyo Thé Jaune', client: 'MFC', recette: 'MFC-A', pct_parfum: 10, meche: 'LX20', contenant: 'Macaron 25', masse: 200, notes: 'Standard' },
    { parfum: 'Verveine Menthe', client: 'MFC', recette: 'MFC-A', pct_parfum: 10, meche: 'LX20', contenant: 'Macaron 25', masse: 200, notes: 'Standard' },
    { parfum: 'New York', client: 'MFC', recette: 'MFC-A', pct_parfum: 10, meche: 'LX20', contenant: 'Macaron 25', masse: 200, notes: 'Standard' },
    { parfum: 'Opoponax IFF', client: 'MFC', recette: 'MFC-A', pct_parfum: 10, meche: 'LX20', contenant: 'Macaron 25', masse: 200, notes: 'Standard' },
    { parfum: 'Paeva Violette', client: 'MFC', recette: 'MFC-A', pct_parfum: 10, meche: 'LX20', contenant: 'Macaron 25', masse: 200, notes: 'Standard' },
    { parfum: 'Paris in Love', client: 'MFC', recette: 'MFC-A', pct_parfum: 10, meche: 'LX20', contenant: 'Macaron 25', masse: 200, notes: 'Standard' },
    
    // Parfums d'Orsay — Tripartite 49/36/5 @ 12%
    { parfum: 'Bouquet d\'Orsay', client: 'Parfums d\'Orsay', recette: 'MFC-A', pct_parfum: 12, meche: 'LX22', contenant: 'Stockholm 27', masse: 200, notes: 'Orsay standard 12%' },
    { parfum: 'Chevalier d\'Orsay', client: 'Parfums d\'Orsay', recette: 'MFC-A', pct_parfum: 12, meche: 'LX22', contenant: 'Stockholm 27', masse: 200, notes: 'Orsay standard 12%' },
    { parfum: 'Tilleul d\'Orsay', client: 'Parfums d\'Orsay', recette: 'MFC-A', pct_parfum: 12, meche: 'LX22', contenant: 'Stockholm 27', masse: 200, notes: 'Orsay standard 12%' },
    
    // Ladurée — Tripartite 49/36/5 @ 10-12%
    { parfum: 'Amande', client: 'Ladurée', recette: 'MFC-A', pct_parfum: 10, meche: 'LX18', contenant: 'Caravelle 25', masse: 150, notes: 'Petit format Ladurée' },
    { parfum: 'Rose', client: 'Ladurée', recette: 'MFC-A', pct_parfum: 10, meche: 'LX18', contenant: 'Caravelle 25', masse: 150, notes: 'Petit format Ladurée' },
    { parfum: 'Chèvrefeuille', client: 'Ladurée', recette: 'MFC-A', pct_parfum: 10, meche: 'LX18', contenant: 'Caravelle 25', masse: 150, notes: 'Petit format Ladurée' },
    
    // Lola James Harper — Tripartite @ 10%
    { parfum: 'Merci 12 (30298596)', client: 'Lola James Harper', recette: 'MFC-A', pct_parfum: 10, meche: 'LX22', contenant: 'Stockholm 27', masse: 200, notes: 'Production 370kg' },
    
    // EDP — Tripartite 49/36/5
    { parfum: 'Gardenia', client: 'EDP', recette: 'MFC-A', pct_parfum: 10, meche: 'LX20', contenant: 'Porcelaine 2017', masse: 250, notes: '1007 unités' },
    { parfum: 'Café Society', client: 'EDP', recette: 'MFC-A', pct_parfum: 9, meche: 'LX20', contenant: 'Porcelaine 2017', masse: 250, notes: 'Parfum à 9% atypique' },
    { parfum: 'Lavande Noir 23:15', client: 'EDP', recette: 'MFC-A', pct_parfum: 10, meche: 'LX20', contenant: 'Porcelaine 2017', masse: 250, notes: '987 unités' },
    
    // Da Rosa
    { parfum: 'Da Rosa 10 (30364972)', client: 'Da Rosa', recette: 'MFC-A', pct_parfum: 10, meche: 'LX22', contenant: 'Stockholm 27', masse: 200, notes: 'Givaudan' },
    
    // Toba — Tripartite standard
    { parfum: 'Toba Bois Sakura', client: 'Toba', recette: 'MFC-A', pct_parfum: 10, meche: 'LX20', contenant: 'Stockholm 27', masse: 200, notes: '' },

    // ═══ BIPARTITE 80/10 (MFC-B) — sans 6213 ═══
    { parfum: 'Bois de Coton', client: 'MFC', recette: 'MFC-B', pct_parfum: 10, meche: 'LX18', contenant: 'Caravelle 25', masse: 150, notes: '6213 bloque combustion → MFC-B' },
    { parfum: 'The Place Beyond the Pines', client: 'MFC', recette: 'MFC-B', pct_parfum: 12, meche: 'LX22', contenant: 'Stockholm 27', masse: 200, notes: 'Ratio 78/10 avec 12% parfum' },
    { parfum: 'Green Leather', client: 'MFC', recette: 'MFC-B', pct_parfum: 10, meche: 'LX18', contenant: 'Stockholm 27', masse: 200, notes: 'Incompatible 6213' },

    // ═══ TRIPARTITE RENFORCÉE 47/38/5 (MFC-C) ═══
    { parfum: 'Dita', client: 'MFC', recette: 'MFC-C', pct_parfum: 10, meche: 'LX22', contenant: 'Stockholm 27', masse: 200, notes: 'Parfum lourd' },
    { parfum: 'Sole Nero', client: 'MFC', recette: 'MFC-C', pct_parfum: 10, meche: 'LX18', contenant: 'Caravelle 25', masse: 150, notes: 'Parfum lourd' },

    // ═══ BASE CÉTYLIQUE (MFC-D) ═══
    { parfum: 'Paris la Nuit', client: 'MFC', recette: 'MFC-D', pct_parfum: 12, meche: 'LX24', contenant: 'Stockholm 27', masse: 200, notes: 'Alcool cétylique 10% — 43/30/10/5' },
    { parfum: 'Noël Nuit Mystérieuse', client: 'MFC', recette: 'MFC-D', pct_parfum: 10, meche: 'LX22', contenant: 'Macaron 25', masse: 200, notes: 'Cétylique 8% — 43/34/8/5' },

    // ═══ HAUTE 5203 (MFC-E) ═══
    // 5203 à 70-73%, ouverture formule
    { parfum: 'Othello Thé Vert', client: 'MFC', recette: 'MFC-E', pct_parfum: 10, meche: 'LX20', contenant: 'Macaron 25', masse: 200, notes: 'Micro 2528 à 8% — 46/36/8' },

    // ═══ PURE 6213 (MFC-F) — Rothschild ═══
    { parfum: 'Rothschild Collection', client: 'Rothschild', recette: 'MFC-F', pct_parfum: 10, meche: 'LX20', contenant: 'Porcelaine', masse: 320, notes: '90% 6213 pure — diffusion max, opaque/crémeux' },
    { parfum: 'Figuier Rothschild', client: 'Rothschild', recette: 'MFC-F', pct_parfum: 10, meche: 'LX20', contenant: 'Porcelaine', masse: 320, notes: '90% 6213' },
    { parfum: 'Fleur d\'Oranger Rothschild', client: 'Rothschild', recette: 'MFC-F', pct_parfum: 12, meche: 'LX20', contenant: 'Pampille', masse: 250, notes: '88% 6213' },
    { parfum: 'Tilleul Rothschild', client: 'Rothschild', recette: 'MFC-F', pct_parfum: 10, meche: 'LX20', contenant: 'Pampille', masse: 250, notes: '90% 6213' },
    { parfum: 'Verveine Rothschild', client: 'Rothschild', recette: 'MFC-F', pct_parfum: 10, meche: 'LX20', contenant: 'Pampille', masse: 250, notes: '90% 6213' },
    // La Romaine — aussi 6213 pure
    { parfum: 'Fleur d\'Oranger Vallauris', client: 'La Romaine Éditions', recette: 'MFC-F', pct_parfum: 12, meche: 'LX20', contenant: 'Pampille coloré', masse: 250, notes: '88% 6213' },
    { parfum: 'Figuier La Romaine', client: 'La Romaine Éditions', recette: 'MFC-F', pct_parfum: 10, meche: 'LX20', contenant: 'Pampille coloré', masse: 250, notes: '90% 6213' },
    { parfum: 'Tilleul du Luberon', client: 'La Romaine Éditions', recette: 'MFC-F', pct_parfum: 10, meche: 'LX20', contenant: 'Pampille coloré', masse: 250, notes: '90% 6213' },
    { parfum: 'Verveine des Baronnies', client: 'La Romaine Éditions', recette: 'MFC-F', pct_parfum: 10, meche: 'LX20', contenant: 'Pampille coloré', masse: 250, notes: '90% 6213' },
    // Toba — 6213 pure
    { parfum: 'Toba Chenpi Pu\'er', client: 'Toba', recette: 'MFC-F', pct_parfum: 10, meche: 'LX18', contenant: 'Pot 300g', masse: 300, notes: '6213 pure format 300g' },

    // ═══ TRIPARTITE INVERSÉE 49/36/5 (MFC-G) — Almon ═══
    { parfum: 'Almon Collection', client: 'Almon', recette: 'MFC-G', pct_parfum: 10, meche: 'LX20', contenant: 'Pot Bleu 270g', masse: 270, notes: '6213(49)/5203(36)/2528(5) — ratio inversé selon le parfum, colorant 2624 1831k 0.09%' },
    // Poudre de Riz — inversée aussi (6213 dominante)
    { parfum: 'Poudre de Riz Drom', client: 'MFC', recette: 'MFC-G', pct_parfum: 10, meche: 'LX20', contenant: 'Macaron 25', masse: 200, notes: '6213(49)/5203(31)/cétylique(5)/2528(5) — inversé pour meilleur rendu olfactif' },

    // ═══ PILIER (MFC-H) ═══
    { parfum: 'Louboutin Collection', client: 'Louboutin', recette: 'MFC-H', pct_parfum: 10, meche: '3xLX22', contenant: 'Moule cylindrique', masse: 8000, notes: 'Paraffine 6670(77%)/DUB(10%)/Vybar(3%), colorant Bekro 15081' },

    // ═══ VÉGÉTALE (MFC-I) ═══
    { parfum: 'La Bruket Collection', client: 'La Bruket', recette: 'MFC-I', pct_parfum: 10, meche: 'LX22', contenant: 'Stockholm 27', masse: 2000, notes: 'Soja G60/40(60%)/Nafol(20%)/DUB(10%)' },
    { parfum: 'Monrose Collection', client: 'Monrose', recette: 'MFC-I', pct_parfum: 10, meche: 'LX20', contenant: 'Stockholm 27', masse: 200, notes: 'Soja G60/40(60%)/Nafol(20%)/CETO(10%)' },
    // Orsay transition végétale 2026
    { parfum: 'Orsay Végétal Test', client: 'Parfums d\'Orsay', recette: 'MFC-I', pct_parfum: 10, meche: 'LX20', contenant: 'INDRO 27', masse: 200, notes: 'Test transition végétale 2026' },

    // ═══ CAS SPÉCIAUX / FORMULATIONS ÉCHEC ═══
    { parfum: 'Ambre Délice Chambre52', client: 'Chambre 52', recette: 'ECHEC', pct_parfum: 12, meche: 'LX24', contenant: 'Pot Ambre 52', masse: 200, notes: '44/39/5 — ECHEC combustion + rendu olfactif. Trop de 6213 vs paraffine' },
    { parfum: 'Soleil Tonka Chambre52', client: 'Chambre 52', recette: 'ECHEC', pct_parfum: 10, meche: 'LX20', contenant: 'Pot Ambre 52', masse: 200, notes: '44/41/5 — ECHEC mêmes raisons' },
    { parfum: 'Une Chambre à Soi', client: 'Chambre 52', recette: 'ECHEC', pct_parfum: 10, meche: 'LX20', contenant: 'Pot Ambre 52', masse: 200, notes: '44/41/5 — ECHEC mêmes raisons' },

    // Bois Blond — 6243 pure (référence différente de 6213)
    { parfum: 'Bois Blond', client: 'MFC', recette: 'SPECIAL', pct_parfum: 10, meche: 'LX18', contenant: 'Stockholm 27', masse: 200, notes: 'Paraffine 6243 pure 90/10 — référence DIFFÉRENTE de 6213, ART4428' },
    
    // Nina Ricci — 50/35/5 volontaire (ajustement spécifique)
    { parfum: 'Nina Ricci Collection', client: 'Nina Ricci', recette: 'MFC-A', pct_parfum: 10, meche: 'LX20', contenant: 'Stockholm 27', masse: 200, notes: 'Ratio ajusté 50/35/5 (volontaire, pas 49/36/5 standard)' },
];

// ═══ Règles apprises des formulations ═══

const LEARNED_RULES = [
    // Règles de combustion
    { condition: 'ratio 6213 > 45%', effect: 'Risque combustion difficile', recommendation: 'Ajouter alcool cétylique ou réduire 6213', source: 'Chambre 52 échec' },
    { condition: '6213 pure (88-93%)', effect: 'Combustion OK si seule cire', recommendation: 'Recette MFC-F, pas de mélange', source: 'Rothschild, La Romaine' },
    { condition: 'parfum incompatible 6213', effect: 'Combustion bloquée', recommendation: 'Basculer MFC-B (80/10 sans 6213)', source: 'Bois de Coton, Green Leather' },
    
    // Règles de diffusion
    { condition: 'parfum lourd/tenace', effect: 'Diffusion insuffisante en standard', recommendation: '6213 à 38% (MFC-C) pour diffusion', source: 'Dita, Sole Nero' },
    { condition: '6213 inversée (49%)', effect: 'Meilleur rendu olfactif', recommendation: 'Recette MFC-G pour parfums nécessitant fidélité', source: 'Poudre de Riz Drom, Almon' },
    { condition: 'parfum difficile + opacité', effect: 'Besoin multi-fonction', recommendation: 'Alcool cétylique (MFC-D) : combustion + opacité + diffusion', source: 'Paris la Nuit' },
    
    // Règles mèche
    { condition: 'diamètre 65-75mm + parfum 10%', effect: 'standard', recommendation: 'LX18', source: 'Caravelle 25, petit format' },
    { condition: 'diamètre 75-85mm + parfum 10%', effect: 'standard', recommendation: 'LX20', source: 'Stockholm 27, Macaron 25' },
    { condition: 'diamètre 75-85mm + parfum 12%', effect: 'besoin mèche supérieure', recommendation: 'LX22', source: 'Orsay 12%, formats moyens' },
    { condition: 'alcool cétylique dans formule', effect: 'combustion modifiée', recommendation: 'LX24 (+1-2 tailles vs standard)', source: 'Paris la Nuit MFC-D' },
    { condition: 'diamètre >120mm', effect: 'mèche unique insuffisante', recommendation: 'Triple mèche 3xLX20 ou 3xLX22', source: 'Pilier Louboutin, La Bruket grand format' },
    
    // Règles client
    { condition: 'client Orsay', effect: 'standard spécifique', recommendation: '12% parfum systématique + LX22', source: 'Historique Orsay' },
    { condition: 'client Rothschild', effect: 'luxe maximal', recommendation: '6213 pure (MFC-F) en porcelaine', source: 'Historique Rothschild' },
    { condition: 'demande végétale', effect: 'base universelle', recommendation: 'MFC-I : soja(60)/Nafol(20)/DUB ou CETO(10)', source: 'La Bruket, Monrose' },
];

// ═══ Fonction de croisement ═══

function crossFDSWithFormulations(fdsData, params, dbFormulations, dbRules) {
    const results = {
        validated_matches: [],   // Formulations validées avec ce parfum ou similaire
        recipe_stats: {},        // Stats par recette
        learned_insights: [],    // Règles applicables
        molecule_analysis: [],   // Analyse molécule × cire (PRIORITÉ 1)
        flash_safety: [],        // Sécurité flash point (PRIORITÉ 2)
        recommendation: null     // Recommandation finale
    };
    
    const composition = fdsData?.composition || [];
    const props = fdsData?.proprietes_physiques || {};
    const fp = parseFloat(props.flash_point_c);
    
    // Fusionner les formulations codées en dur + celles de la base
    const allFormulations = [...VALIDATED_FORMULATIONS];
    if (dbFormulations && dbFormulations.length) {
        for (const dbf of dbFormulations) {
            // Éviter les doublons (même parfum + même recette)
            const exists = allFormulations.find(f => 
                f.parfum.toLowerCase() === (dbf.parfum || dbf.fragrance_name || '').toLowerCase() &&
                f.recette === (dbf.recette || dbf.recipe_code || '')
            );
            if (!exists) {
                allFormulations.push({
                    parfum: dbf.parfum || dbf.fragrance_name || '?',
                    client: dbf.client || dbf.client_name || 'DB',
                    recette: dbf.recette || dbf.recipe_code || '?',
                    pct_parfum: dbf.pct_parfum || dbf.fragrance_percentage || 10,
                    meche: dbf.meche || dbf.wick_reference || '?',
                    contenant: dbf.contenant || dbf.container_type || '?',
                    masse: dbf.masse || dbf.total_mass || 200,
                    notes: dbf.notes || 'Importé depuis base',
                    source: 'db'
                });
            }
        }
    }
    
    // Fusionner les règles apprises
    if (dbRules && dbRules.length) {
        for (const rule of dbRules) {
            try {
                const cond = typeof rule.condition === 'string' ? JSON.parse(rule.condition) : rule.condition;
                const rec = typeof rule.recommendation === 'string' ? JSON.parse(rule.recommendation) : rule.recommendation;
                results.learned_insights.push({
                    type: rule.rule_type,
                    confidence: rule.confidence,
                    condition: cond,
                    recommendation: rec,
                    source: 'auto-apprentissage'
                });
            } catch(e) { /* skip malformed rules */ }
        }
    }
    
    // 1. Chercher des matchs directs par nom de parfum
    const parfumName = (params.fragrance_name || fdsData?.identification?.nom || '').toLowerCase();
    if (parfumName) {
        for (const v of allFormulations) {
            if (v.parfum.toLowerCase().includes(parfumName) || parfumName.includes(v.parfum.toLowerCase())) {
                results.validated_matches.push(v);
            }
        }
    }
    
    // 2. Chercher des matchs par fournisseur FDS
    const fournisseur = (fdsData?.identification?.fournisseur || '').toLowerCase();
    if (fournisseur) {
        for (const v of allFormulations) {
            if (v.notes && v.notes.toLowerCase().includes(fournisseur)) {
                if (!results.validated_matches.find(m => m.parfum === v.parfum)) {
                    results.validated_matches.push({ ...v, match_type: 'fournisseur' });
                }
            }
        }
    }
    
    // 3. Stats par recette
    for (const v of allFormulations) {
        if (v.recette === 'ECHEC' || v.recette === 'SPECIAL') continue;
        if (!results.recipe_stats[v.recette]) {
            results.recipe_stats[v.recette] = { count: 0, clients: new Set(), parfums: [] };
        }
        results.recipe_stats[v.recette].count++;
        results.recipe_stats[v.recette].clients.add(v.client);
        results.recipe_stats[v.recette].parfums.push(v.parfum);
    }
    for (const k of Object.keys(results.recipe_stats)) {
        results.recipe_stats[k].clients = [...results.recipe_stats[k].clients];
    }
    
    // ═══ PRIORITÉ 1 : Compatibilité molécule × recette cire ═══
    
    // Molécules connues pour bloquer la combustion avec 6213
    const COMBUSTION_BLOCKERS_6213 = [
        // Molécules lourdes / cireuses qui saturent la 6213
    ];
    
    // Analyse de chaque molécule pour impact sur formulation
    let totalHeavyMolecules = 0;
    let dominantMoleculeWarning = false;
    
    for (const m of composition) {
        const parts = (m.concentration || '').toString().split('-');
        const lo = parseFloat(parts[0]) || 0;
        const hi = parseFloat(parts[parts.length - 1]) || lo;
        const avg = (lo + hi) / 2;
        
        const entry = { 
            nom: m.nom_chimique || m.cas, 
            cas: m.cas, 
            concentration: m.concentration,
            avg_pct: avg,
            impact: [] 
        };
        
        // Molécule dominante > 20% → impact sur combustion
        if (hi > 20) {
            dominantMoleculeWarning = true;
            entry.impact.push({
                type: 'combustion',
                severity: 'warning',
                message: `Concentration élevée (${m.concentration}%) — peut modifier la viscosité du bain de cire et la combustion`
            });
        }
        
        // Molécules lourdes (MW élevé) → parfum lourd → MFC-C ou MFC-G
        // Muscs, bases boisées, résines
        const heavyMolecules = {
            '1222-05-5': 'Galaxolide (musc synthétique) — parfum lourd',
            '54464-57-2': 'Iso E Super — boisé ambré lourd',
            '33704-61-9': 'Cashmeran — musc boisé lourd',
            '127-51-5': 'α-Isomethyl ionone — floral persistant',
        };
        if (heavyMolecules[m.cas]) {
            if (avg > 5) {
                totalHeavyMolecules += avg;
                entry.impact.push({
                    type: 'diffusion',
                    severity: 'info',
                    message: `${heavyMolecules[m.cas]} à ${m.concentration}% — favoriser recette avec 6213 renforcée (MFC-C/G) pour diffusion`
                });
            }
        }
        
        // Molécules volatiles → flash bas → impact process
        const volatileMolecules = {
            '78-70-6': { name: 'Linalol', fp: 76 },
            '5989-27-5': { name: 'D-Limonène', fp: 48 },
            '127-91-3': { name: 'β-Pinène', fp: 47 },
            '80-56-8': { name: 'α-Pinène', fp: 33 },
            '98-55-5': { name: 'α-Terpinéol', fp: 90 },
        };
        if (volatileMolecules[m.cas] && avg > 3) {
            const mol = volatileMolecules[m.cas];
            entry.impact.push({
                type: 'flash_point',
                severity: mol.fp < 55 ? 'danger' : 'warning',
                message: `${mol.name} (flash ${mol.fp}°C) à ${m.concentration}% — abaisse le flash global du parfum`
            });
        }
        
        // DPG check
        if (m.cas === '34590-94-8') {
            entry.impact.push({
                type: 'exclusion',
                severity: 'danger',
                message: 'DPG (dipropylène glycol) — EXCLU chez MFC. Demander reformulation base IPM/ester.'
            });
        }
        
        // H304 aspiration hazard
        if (m.h_codes && m.h_codes.includes('H304')) {
            entry.impact.push({
                type: 'securite',
                severity: 'info',
                message: 'Danger par aspiration (H304) — manipuler avec précaution'
            });
        }
        
        if (entry.impact.length > 0) {
            results.molecule_analysis.push(entry);
        }
    }
    
    // Bilan molécules lourdes → recommandation recette
    if (totalHeavyMolecules > 15) {
        results.learned_insights.push({
            rule: 'Parfum lourd (molécules denses > 15%)',
            detail: `${totalHeavyMolecules.toFixed(0)}% de molécules lourdes — recette MFC-C (6213 renforcée 38%) ou MFC-G (inversée 49%) pour meilleur rendu olfactif`,
            severity: 'warning'
        });
    }
    if (dominantMoleculeWarning) {
        results.learned_insights.push({
            rule: 'Molécule dominante détectée',
            detail: 'Une molécule > 20% peut influencer le comportement du bain. Tester la combustion en priorité.',
            severity: 'warning'
        });
    }
    
    // ═══ PRIORITÉ 2 : Sécurité flash point ═══
    
    if (!isNaN(fp)) {
        if (fp < 55) {
            results.flash_safety.push({
                severity: 'danger',
                message: `Flash point très bas : ${fp}°C`,
                detail: `Température ajout parfum max : ${Math.max(fp - 15, 35)}°C. Ajouter dans cire tiède, PAS en fusion.`,
                temp_max_ajout: Math.max(fp - 15, 35)
            });
        } else if (fp < 70) {
            results.flash_safety.push({
                severity: 'warning',
                message: `Flash point bas : ${fp}°C`,
                detail: `Température ajout parfum max : ${fp - 10}°C. Surveiller la température de la cuve.`,
                temp_max_ajout: fp - 10
            });
        } else {
            results.flash_safety.push({
                severity: 'ok',
                message: `Flash point correct : ${fp}°C`,
                detail: 'Ajout parfum selon procédure standard.',
                temp_max_ajout: null
            });
        }
        
        // Identifier les molécules responsables du flash bas
        for (const m of composition) {
            const volatileMolecules = {
                '5989-27-5': { name: 'D-Limonène', fp: 48 },
                '127-91-3': { name: 'β-Pinène', fp: 47 },
                '80-56-8': { name: 'α-Pinène', fp: 33 },
                '78-70-6': { name: 'Linalol', fp: 76 },
            };
            if (volatileMolecules[m.cas]) {
                const parts = (m.concentration || '').toString().split('-');
                const hi = parseFloat(parts[parts.length - 1]) || 0;
                if (hi > 2 && volatileMolecules[m.cas].fp < fp + 10) {
                    results.flash_safety.push({
                        severity: 'info',
                        message: `${volatileMolecules[m.cas].name} (${m.concentration}%) — flash ${volatileMolecules[m.cas].fp}°C`,
                        detail: 'Contribue à abaisser le flash point global'
                    });
                }
            }
        }
    }
    
    // DPG check global
    const hasDPG = composition.some(m => m.cas === '34590-94-8');
    if (hasDPG) {
        results.learned_insights.push({
            rule: 'DPG détecté — EXCLU MFC',
            detail: 'Demander reformulation sans DPG au fournisseur. Utiliser base IPM ou ester.',
            severity: 'danger'
        });
    }
    
    // 5. Recommandation finale
    if (results.validated_matches.length > 0 && results.validated_matches[0].recette !== 'ECHEC' && results.validated_matches[0].recette !== 'SPECIAL') {
        const best = results.validated_matches[0];
        results.recommendation = {
            type: 'match_direct',
            message: `Ce parfum a déjà été validé avec la recette ${best.recette} chez ${best.client}`,
            recette: best.recette,
            pct_parfum: best.pct_parfum,
            meche: best.meche,
            confidence: 'haute'
        };
    } else if (params.candle_type === 'pillar' || params.candle_type === 'pilier') {
        results.recommendation = {
            type: 'rule',
            message: 'Pilier → MFC-H (paraffine 6670/DUB/Vybar) — seule recette pilier validée',
            recette: 'MFC-H',
            confidence: 'haute'
        };
    } else if (params.vegetal || (params.candle_type && params.candle_type.includes('végétal'))) {
        results.recommendation = {
            type: 'rule',
            message: 'Végétal → MFC-I (soja/Nafol/DUB) — base universelle validée La Bruket/Monrose',
            recette: 'MFC-I',
            confidence: 'haute'
        };
    } else if (totalHeavyMolecules > 15) {
        results.recommendation = {
            type: 'rule',
            message: 'Parfum lourd → MFC-C (renforcée) ou MFC-G (inversée) pour meilleure diffusion',
            recette: 'MFC-C',
            confidence: 'moyenne'
        };
    } else {
        results.recommendation = {
            type: 'default',
            message: 'Recette MFC-A recommandée (validée sur 90+ formulations, tous types de parfums)',
            recette: 'MFC-A',
            pct_parfum: params.fragrance_pct || 10,
            confidence: 'moyenne'
        };
    }
    
    return results;
}

module.exports = { VALIDATED_FORMULATIONS, LEARNED_RULES, crossFDSWithFormulations };
