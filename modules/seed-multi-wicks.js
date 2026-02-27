// ═══════════════════════════════════════════════════════════════
// ENRICHISSEMENT v5.21.5 — Mèches Wedo complètes
// 1) Mèches plates tressées (flat braid) gamme 3xN
// 2) Séries Wedo manquantes : STABILO, RRD, VRL, FD, TG
// 3) Correction nom fournisseur Wedoo → Wedo
// 4) Fiche KB technique flat braid
// ═══════════════════════════════════════════════════════════════

async function seedMultiWicks(db) {
    // Corriger le nom fournisseur si nécessaire
    await db.run("UPDATE suppliers SET name = 'Wedo' WHERE UPPER(name) = 'WEDOO'");

    // Trouver l'ID fournisseur Wedo
    const wedo = await db.get("SELECT id FROM suppliers WHERE UPPER(name) LIKE '%WEDO%'");
    if (!wedo) {
        console.log('  ⚠ Fournisseur Wedo non trouvé, skip mèches');
        return;
    }
    const sid = wedo.id;

    // Vérifier si les flat braid sont déjà là
    const check = await db.get("SELECT COUNT(*) as c FROM wicks WHERE series = 'Flat Braid'");
    if (check && check.c > 0) {
        console.log('  ✓ Mèches Wedo flat braid déjà présentes');
        return;
    }

    // Supprimer les faux assemblages "Multi" s'ils existent (erreur v5.21.4)
    await db.run("DELETE FROM wicks WHERE series LIKE '%Multi%'");

    let count = 0;

    // ═══════════════════════════════════════════════════════════
    // GAMME FLAT BRAID (mèches plates tressées) 3×N
    // Format : 3 brins × N fils par brin
    // Plus N est grand, plus la mèche est épaisse
    // Usage : bougies coulées, trempées, extrudées
    // Containers, votives, piliers
    // ═══════════════════════════════════════════════════════════
    const flatBraids = [
        { ref: '3x4',  dmin: 8,   dmax: 15,  wax: 'Mixte', app: 'Bougie fine / Votive', notes: 'Flat braid 3 brins × 4 fils, très fine, petites bougies et votives' },
        { ref: '3x5',  dmin: 10,  dmax: 18,  wax: 'Mixte', app: 'Votive / Petit container', notes: 'Flat braid 3 brins × 5 fils, petits diamètres' },
        { ref: '3x6',  dmin: 10,  dmax: 20,  wax: 'Mixte', app: 'Votive / Petit container', notes: 'Flat braid 3 brins × 6 fils, chandelles fines' },
        { ref: '3x7',  dmin: 12,  dmax: 22,  wax: 'Mixte', app: 'Petit container / Chandelle', notes: 'Flat braid 3 brins × 7 fils, transition petit→moyen' },
        { ref: '3x8',  dmin: 15,  dmax: 25,  wax: 'Mixte', app: 'Container petit / Chandelle', notes: 'Flat braid 3 brins × 8 fils' },
        { ref: '3x9',  dmin: 18,  dmax: 28,  wax: 'Mixte', app: 'Container / Chandelle', notes: 'Flat braid 3 brins × 9 fils' },
        { ref: '3x10', dmin: 20,  dmax: 30,  wax: 'Mixte', app: 'Container / Pilier petit', notes: 'Flat braid 3 brins × 10 fils' },
        { ref: '3x11', dmin: 22,  dmax: 33,  wax: 'Mixte', app: 'Container / Pilier', notes: 'Flat braid 3 brins × 11 fils' },
        { ref: '3x12', dmin: 25,  dmax: 38,  wax: 'Mixte', app: 'Container moyen / Pilier', notes: 'Flat braid 3 brins × 12 fils' },
        { ref: '3x13', dmin: 28,  dmax: 40,  wax: 'Mixte', app: 'Container moyen / Pilier', notes: 'Flat braid 3 brins × 13 fils' },
        { ref: '3x14', dmin: 30,  dmax: 45,  wax: 'Mixte', app: 'Container / Pilier moyen', notes: 'Flat braid 3 brins × 14 fils' },
        { ref: '3x15', dmin: 33,  dmax: 48,  wax: 'Mixte', app: 'Container / Pilier', notes: 'Flat braid 3 brins × 15 fils' },
        { ref: '3x16', dmin: 35,  dmax: 50,  wax: 'Mixte', app: 'Pilier moyen / Container large', notes: 'Flat braid 3 brins × 16 fils' },
        { ref: '3x17', dmin: 38,  dmax: 55,  wax: 'Mixte', app: 'Pilier / Container large', notes: 'Flat braid 3 brins × 17 fils' },
        { ref: '3x18', dmin: 40,  dmax: 60,  wax: 'Mixte', app: 'Pilier large / Grand container', notes: 'Flat braid 3 brins × 18 fils, la plus épaisse courante' },
        { ref: '3x20', dmin: 45,  dmax: 65,  wax: 'Mixte', app: 'Pilier large', notes: 'Flat braid 3 brins × 20 fils, grands piliers' },
        { ref: '3x22', dmin: 50,  dmax: 70,  wax: 'Mixte', app: 'Pilier XL', notes: 'Flat braid 3 brins × 22 fils, très grands diamètres' },
        { ref: '3x24', dmin: 55,  dmax: 80,  wax: 'Mixte', app: 'Pilier XL / Décoratif', notes: 'Flat braid 3 brins × 24 fils, piliers décoratifs grands formats' },
    ];

    for (const w of flatBraids) {
        try {
            await db.run(
                `INSERT INTO wicks (supplier_id, reference, series, type, core, diameter_min, diameter_max, wax_type, application, manufacturer_notes)
                 VALUES (?, ?, 'Flat Braid', 'Coton tressé plat', 'Sans', ?, ?, ?, ?, ?)`,
                [sid, w.ref, w.dmin, w.dmax, w.wax, w.app, w.notes]
            );
            count++;
        } catch (e) { /* doublon, skip */ }
    }

    // ═══════════════════════════════════════════════════════════
    // SÉRIES WEDO MANQUANTES
    // ═══════════════════════════════════════════════════════════

    // Série STABILO (ex-CD/CDN Heinz Jansen, fusionné avec Wedo 2017)
    const stabilos = [
        { ref: 'STABILO 4',  dmin: 30, dmax: 40, notes: 'Ex-CD, flat braid papier, paraffine et végétale' },
        { ref: 'STABILO 6',  dmin: 35, dmax: 45, notes: 'Polyvalent, bon auto-rognage' },
        { ref: 'STABILO 8',  dmin: 40, dmax: 50, notes: 'Polyvalent, usage courant' },
        { ref: 'STABILO 10', dmin: 45, dmax: 55, notes: 'Container moyen' },
        { ref: 'STABILO 12', dmin: 50, dmax: 60, notes: 'Container moyen à large' },
        { ref: 'STABILO 14', dmin: 55, dmax: 65, notes: 'Container large' },
        { ref: 'STABILO 16', dmin: 60, dmax: 70, notes: 'Grand container' },
        { ref: 'STABILO 20', dmin: 65, dmax: 80, notes: 'Très grand container' },
    ];

    for (const w of stabilos) {
        try {
            await db.run(
                `INSERT INTO wicks (supplier_id, reference, series, type, core, diameter_min, diameter_max, wax_type, application, manufacturer_notes)
                 VALUES (?, ?, 'STABILO', 'Coton tressé plat', 'Papier', ?, ?, 'Mixte', 'Container / Pilier', ?)`,
                [sid, w.ref, w.dmin, w.dmax, w.notes]
            );
            count++;
        } catch (e) { /* doublon, skip */ }
    }

    // Série RRD — Mèche ronde, similaire LX mais section ronde
    const rrds = [
        { ref: 'RRD 29',  dmin: 30, dmax: 40, notes: 'Mèche ronde, paraffine/végétale, bonne rigidité' },
        { ref: 'RRD 37',  dmin: 35, dmax: 45, notes: 'Mèche ronde, polyvalente' },
        { ref: 'RRD 40',  dmin: 38, dmax: 48, notes: 'Mèche ronde, container moyen' },
        { ref: 'RRD 47',  dmin: 42, dmax: 52, notes: 'Mèche ronde, container moyen' },
        { ref: 'RRD 50',  dmin: 45, dmax: 55, notes: 'Mèche ronde, container large' },
        { ref: 'RRD 60',  dmin: 50, dmax: 65, notes: 'Mèche ronde, grand diamètre' },
        { ref: 'RRD 70',  dmin: 55, dmax: 70, notes: 'Mèche ronde, grand container' },
        { ref: 'RRD 80',  dmin: 60, dmax: 80, notes: 'Mèche ronde, très grand diamètre' },
    ];

    for (const w of rrds) {
        try {
            await db.run(
                `INSERT INTO wicks (supplier_id, reference, series, type, core, diameter_min, diameter_max, wax_type, application, manufacturer_notes)
                 VALUES (?, ?, 'RRD', 'Coton rond', 'Sans', ?, ?, 'Mixte', 'Container / Pilier', ?)`,
                [sid, w.ref, w.dmin, w.dmax, w.notes]
            );
            count++;
        } catch (e) { /* doublon, skip */ }
    }

    // Série VRL — Végétale haute viscosité
    const vrls = [
        { ref: 'VRL 1',  dmin: 35, dmax: 45, notes: 'Cire végétale haute viscosité, traitement P9, fils blancs' },
        { ref: 'VRL 2',  dmin: 40, dmax: 50, notes: 'Cire végétale, container moyen' },
        { ref: 'VRL 3',  dmin: 45, dmax: 55, notes: 'Cire végétale, container moyen à large' },
        { ref: 'VRL 4',  dmin: 50, dmax: 60, notes: 'Cire végétale, container large' },
        { ref: 'VRL 5',  dmin: 55, dmax: 65, notes: 'Cire végétale, grand container' },
        { ref: 'VRL 6',  dmin: 60, dmax: 75, notes: 'Cire végétale, très grand container, jusqu\'à 10% parfum' },
    ];

    for (const w of vrls) {
        try {
            await db.run(
                `INSERT INTO wicks (supplier_id, reference, series, type, core, diameter_min, diameter_max, wax_type, application, manufacturer_notes)
                 VALUES (?, ?, 'VRL', 'Coton', 'Filaments naturels', ?, ?, 'Végétale', 'Container végétal', ?)`,
                [sid, w.ref, w.dmin, w.dmax, w.notes]
            );
            count++;
        } catch (e) { /* doublon, skip */ }
    }

    // Série FD — Classique avec fil directeur
    const fds = [
        { ref: 'FD 4',  dmin: 25, dmax: 35, notes: 'Classique avec fil directeur, petite flamme' },
        { ref: 'FD 6',  dmin: 30, dmax: 40, notes: 'Classique, usage traditionnel' },
        { ref: 'FD 8',  dmin: 35, dmax: 45, notes: 'Classique, polyvalente' },
        { ref: 'FD 10', dmin: 40, dmax: 50, notes: 'Classique, container moyen' },
        { ref: 'FD 12', dmin: 45, dmax: 55, notes: 'Classique, container large' },
    ];

    for (const w of fds) {
        try {
            await db.run(
                `INSERT INTO wicks (supplier_id, reference, series, type, core, diameter_min, diameter_max, wax_type, application, manufacturer_notes)
                 VALUES (?, ?, 'FD', 'Coton tressé', 'Fil directeur', ?, ?, 'Paraffine', 'Container / Pilier', ?)`,
                [sid, w.ref, w.dmin, w.dmax, w.notes]
            );
            count++;
        } catch (e) { /* doublon, skip */ }
    }

    // Série TG — Paraffine spécifique, traitement P103
    const tgs = [
        { ref: 'TG 1',  dmin: 30, dmax: 40, notes: 'Paraffine, traitement P103, coton ultra-fin' },
        { ref: 'TG 2',  dmin: 35, dmax: 45, notes: 'Paraffine, piliers et containers' },
        { ref: 'TG 3',  dmin: 40, dmax: 50, notes: 'Paraffine, container moyen' },
        { ref: 'TG 4',  dmin: 45, dmax: 55, notes: 'Paraffine, container large' },
        { ref: 'TG 5',  dmin: 50, dmax: 65, notes: 'Paraffine, grand container / pilier' },
    ];

    for (const w of tgs) {
        try {
            await db.run(
                `INSERT INTO wicks (supplier_id, reference, series, type, core, diameter_min, diameter_max, wax_type, application, manufacturer_notes)
                 VALUES (?, ?, 'TG', 'Coton fin', 'Fil stabilisateur', ?, ?, 'Paraffine', 'Container / Pilier paraffine', ?)`,
                [sid, w.ref, w.dmin, w.dmax, w.notes]
            );
            count++;
        } catch (e) { /* doublon, skip */ }
    }

    // ═══════════════════════════════════════════════════════════
    // FICHE KB — Mèches plates tressées + gamme Wedo complète
    // ═══════════════════════════════════════════════════════════
    // Supprimer l'ancienne fiche incorrecte si elle existe
    await db.run("DELETE FROM knowledge_base WHERE title LIKE '%Guide multi-mèches%'");

    const kbExists = await db.get("SELECT id FROM knowledge_base WHERE title = 'Mèches plates tressées (flat braid) — Gamme Wedo 3×N'");
    if (!kbExists) {
        await db.run(
            `INSERT INTO knowledge_base (title, category, content, tags) VALUES (?, ?, ?, ?)`,
            [
                'Mèches plates tressées (flat braid) — Gamme Wedo 3×N',
                'technique',
                JSON.stringify({
                    sujet: 'Gamme mèches plates tressées Wedo (flat braid)',
                    fabricant: 'Wedo — Westdeutsche Dochtfabrik GmbH & Co. KG, Nettetal, Allemagne (fondé 1954)',
                    site: 'https://www.wedobraids.com',
                    principe: 'Le format 3×N signifie 3 brins de N fils chacun. Plus N est grand, plus la mèche est épaisse et adaptée aux grands diamètres.',
                    construction: 'Tressage plat (flat braid) — les 3 brins sont tressés à plat. La mèche se courbe en brûlant (auto-rognage), réduisant le mushrooming et la suie.',
                    gamme_complete: {
                        '3x4_à_3x6': 'Très fines, votives et chandelles, Ø < 20mm',
                        '3x7_à_3x10': 'Petits containers et chandelles, Ø 15-30mm',
                        '3x11_à_3x14': 'Containers moyens et piliers, Ø 25-45mm',
                        '3x15_à_3x18': 'Grands containers et piliers, Ø 35-60mm',
                        '3x20_à_3x24': 'Très grands piliers décoratifs, Ø 45-80mm'
                    },
                    compatibilite_cire: 'Universelle : paraffine, végétale (soja, colza), cire d\'abeille, mixtes',
                    series_wedo: {
                        'Flat Braid 3xN': 'Gamme de base universelle, coton tressé plat sans noyau',
                        'LX': 'Flat braid + fils stabilisateurs, flamme contrôlée, anti-mushrooming',
                        'ECO': 'Flat braid + filaments papier, primée en cire végétale, haute viscosité',
                        'STABILO': 'Ex-CD/CDN (Heinz Jansen fusionné 2017), flat braid papier, équivalent HTP',
                        'HTP': 'Flat braid papier, haute performance, paraffine',
                        'RRD': 'Section ronde (pas plate), similaire LX, bonne rigidité',
                        'VRL': 'Végétale haute viscosité, traitement P9, fils blancs, ≤10% parfum',
                        'CD': 'Ancien nom STABILO avant fusion Heinz Jansen/Wedo',
                        'TCR': 'Coton + papier, rigide, container et pilier',
                        'FD': 'Classique avec fil directeur',
                        'TG': 'Paraffine spécifique, traitement P103, coton ultra-fin'
                    },
                    source: 'wedobraids.com + documentation technique Wedo + savoir-faire MFC'
                }),
                'flat braid,mèche plate,3x6,3x8,3x10,3x12,3x14,3x16,3x18,Wedo,tressage,STABILO,RRD,VRL,v5.21.5'
            ]
        );
        count++;
    }

    // ═══════════════════════════════════════════════════════════
    // TAILLES LX MANQUANTES (21, 28, 30)
    // ═══════════════════════════════════════════════════════════
    const lxExtras = [
        { ref: 'LX 21', dmin: 68, dmax: 78, notes: 'Intermédiaire LX20/LX22, grands containers' },
        { ref: 'LX 28', dmin: 95, dmax: 110, notes: 'Très grand container / pilier, paraffine ~4.5"' },
        { ref: 'LX 30', dmin: 100, dmax: 120, notes: 'Le plus grand LX, paraffine ~4.75", soy ~3.75"' },
    ];
    for (const w of lxExtras) {
        const exists = await db.get("SELECT id FROM wicks WHERE reference = ?", [w.ref]);
        if (!exists) {
            try {
                await db.run(
                    `INSERT INTO wicks (supplier_id, reference, series, type, core, diameter_min, diameter_max, wax_type, application, manufacturer_notes)
                     VALUES (?, ?, 'LX', 'Coton tressé', 'Sans', ?, ?, 'Paraffine', 'Container / Pilier', ?)`,
                    [sid, w.ref, w.dmin, w.dmax, w.notes]
                );
                count++;
            } catch (e) { /* skip */ }
        }
    }

    // ═══════════════════════════════════════════════════════════
    // ENRICHISSEMENT TECHNIQUE — yield m/kg, traitement chimique
    // Sources : Eco Candle Project (STABILO chart confirmé),
    // Cosy Owl, Waxing Moonshine, Blaizen Candles, Craftovator
    // Les yield non-STABILO sont estimés proportionnellement
    // ═══════════════════════════════════════════════════════════
    const techData = [
        // ── STABILO (yield confirmé Eco Candle Project) ──
        { ref: 'STABILO 4',  mpk: 1083, treat: 'Standard', st: 1, dir: 0, cont: '25-40' },
        { ref: 'STABILO 6',  mpk: 900,  treat: 'Standard', st: 1, dir: 0, cont: '30-50' },
        { ref: 'STABILO 8',  mpk: 760,  treat: 'Standard', st: 1, dir: 0, cont: '40-60' },
        { ref: 'STABILO 10', mpk: 680,  treat: 'Standard', st: 1, dir: 0, cont: '50-70' },
        { ref: 'STABILO 12', mpk: 630,  treat: 'Standard', st: 1, dir: 0, cont: '55-75' },
        { ref: 'STABILO 14', mpk: 591,  treat: 'Standard', st: 1, dir: 0, cont: '60-85' },
        { ref: 'STABILO 16', mpk: 520,  treat: 'Standard', st: 1, dir: 0, cont: '70-95' },
        { ref: 'STABILO 20', mpk: 430,  treat: 'Standard', st: 1, dir: 0, cont: '80-110' },
        // ── LX (traitement X, proportionnel) ──
        { ref: 'LX 8',  mpk: 1100, treat: 'X', st: 1, dir: 0, cont: '25-32' },
        { ref: 'LX 10', mpk: 950,  treat: 'X', st: 1, dir: 0, cont: '30-38' },
        { ref: 'LX 12', mpk: 800,  treat: 'X', st: 1, dir: 0, cont: '38-50' },
        { ref: 'LX 14', mpk: 720,  treat: 'X', st: 1, dir: 0, cont: '45-57' },
        { ref: 'LX 16', mpk: 650,  treat: 'X', st: 1, dir: 0, cont: '50-65' },
        { ref: 'LX 18', mpk: 580,  treat: 'X', st: 1, dir: 0, cont: '57-70' },
        { ref: 'LX 20', mpk: 520,  treat: 'X', st: 1, dir: 0, cont: '65-78' },
        { ref: 'LX 21', mpk: 500,  treat: 'X', st: 1, dir: 0, cont: '68-82' },
        { ref: 'LX 22', mpk: 480,  treat: 'X', st: 1, dir: 0, cont: '70-88' },
        { ref: 'LX 24', mpk: 440,  treat: 'X', st: 1, dir: 0, cont: '80-100' },
        { ref: 'LX 26', mpk: 400,  treat: 'X', st: 1, dir: 0, cont: '88-108' },
        { ref: 'LX 28', mpk: 370,  treat: 'X', st: 1, dir: 0, cont: '95-115' },
        { ref: 'LX 30', mpk: 340,  treat: 'X', st: 1, dir: 0, cont: '100-120' },
        // ── ECO (primée cire végétale) ──
        { ref: 'ECO 1',  mpk: 1200, treat: 'Végétal', st: 1, dir: 0, cont: '25-35' },
        { ref: 'ECO 2',  mpk: 1050, treat: 'Végétal', st: 1, dir: 0, cont: '30-40' },
        { ref: 'ECO 4',  mpk: 900,  treat: 'Végétal', st: 1, dir: 0, cont: '44-56' },
        { ref: 'ECO 6',  mpk: 780,  treat: 'Végétal', st: 1, dir: 0, cont: '50-63' },
        { ref: 'ECO 8',  mpk: 680,  treat: 'Végétal', st: 1, dir: 0, cont: '56-68' },
        { ref: 'ECO 10', mpk: 600,  treat: 'Végétal', st: 1, dir: 0, cont: '68-75' },
        { ref: 'ECO 12', mpk: 540,  treat: 'Végétal', st: 1, dir: 0, cont: '68-83' },
        { ref: 'ECO 14', mpk: 490,  treat: 'Végétal', st: 1, dir: 0, cont: '75-90' },
        { ref: 'ECO 16', mpk: 440,  treat: 'Végétal', st: 1, dir: 0, cont: '83-96' },
        // ── HTP ──
        { ref: 'HTP 31',  mpk: 1400, treat: 'Standard', st: 1, dir: 0, cont: '15-25' },
        { ref: 'HTP 41',  mpk: 1100, treat: 'Standard', st: 1, dir: 0, cont: '25-50' },
        { ref: 'HTP 52',  mpk: 900,  treat: 'Standard', st: 1, dir: 0, cont: '38-55' },
        { ref: 'HTP 62',  mpk: 780,  treat: 'Standard', st: 1, dir: 0, cont: '45-63' },
        { ref: 'HTP 73',  mpk: 650,  treat: 'Standard', st: 1, dir: 0, cont: '55-76' },
        { ref: 'HTP 83',  mpk: 560,  treat: 'Standard', st: 1, dir: 0, cont: '65-88' },
        { ref: 'HTP 93',  mpk: 490,  treat: 'Standard', st: 1, dir: 0, cont: '75-95' },
        { ref: 'HTP 104', mpk: 430,  treat: 'Standard', st: 1, dir: 0, cont: '80-100' },
        { ref: 'HTP 115', mpk: 380,  treat: 'Standard', st: 1, dir: 0, cont: '88-108' },
        { ref: 'HTP 126', mpk: 330,  treat: 'Standard', st: 1, dir: 0, cont: '95-115' },
        // ── CD ──
        { ref: 'CD 3',  mpk: 1150, treat: 'Standard', st: 1, dir: 0, cont: '20-35' },
        { ref: 'CD 5',  mpk: 980,  treat: 'Standard', st: 1, dir: 0, cont: '25-50' },
        { ref: 'CD 6',  mpk: 870,  treat: 'Standard', st: 1, dir: 0, cont: '25-55' },
        { ref: 'CD 8',  mpk: 760,  treat: 'Standard', st: 1, dir: 0, cont: '50-63' },
        { ref: 'CD 10', mpk: 680,  treat: 'Standard', st: 1, dir: 0, cont: '50-76' },
        { ref: 'CD 12', mpk: 620,  treat: 'Standard', st: 1, dir: 0, cont: '63-88' },
        { ref: 'CD 14', mpk: 570,  treat: 'Standard', st: 1, dir: 0, cont: '63-88' },
        { ref: 'CD 18', mpk: 480,  treat: 'Standard', st: 1, dir: 0, cont: '88-114' },
        { ref: 'CD 22', mpk: 400,  treat: 'Standard', st: 1, dir: 0, cont: '100-120' },
        // ── TCR ──
        { ref: 'TCR 18/10', mpk: 1000, treat: 'Standard', st: 1, dir: 0, cont: '25-35' },
        { ref: 'TCR 20/12', mpk: 900,  treat: 'Standard', st: 1, dir: 0, cont: '30-40' },
        { ref: 'TCR 22/14', mpk: 810,  treat: 'Standard', st: 1, dir: 0, cont: '35-50' },
        { ref: 'TCR 24/16', mpk: 730,  treat: 'Standard', st: 1, dir: 0, cont: '40-55' },
        { ref: 'TCR 26/18', mpk: 660,  treat: 'Standard', st: 1, dir: 0, cont: '50-65' },
        { ref: 'TCR 28/18', mpk: 610,  treat: 'Standard', st: 1, dir: 0, cont: '55-70' },
        { ref: 'TCR 30/20', mpk: 550,  treat: 'Standard', st: 1, dir: 0, cont: '60-78' },
        { ref: 'TCR 32/20', mpk: 500,  treat: 'Standard', st: 1, dir: 0, cont: '65-85' },
        { ref: 'TCR 34/22', mpk: 460,  treat: 'Standard', st: 1, dir: 0, cont: '70-90' },
        { ref: 'TCR 36/22', mpk: 420,  treat: 'Standard', st: 1, dir: 0, cont: '80-100' },
        // ── RRD (ronde, directionnelle) ──
        { ref: 'RRD 29', mpk: 1000, treat: 'Standard', st: 1, dir: 1, cont: '25-38' },
        { ref: 'RRD 37', mpk: 850,  treat: 'Standard', st: 1, dir: 1, cont: '30-45' },
        { ref: 'RRD 40', mpk: 780,  treat: 'Standard', st: 1, dir: 1, cont: '35-50' },
        { ref: 'RRD 47', mpk: 680,  treat: 'Standard', st: 1, dir: 1, cont: '40-55' },
        { ref: 'RRD 50', mpk: 620,  treat: 'Standard', st: 1, dir: 1, cont: '45-60' },
        { ref: 'RRD 60', mpk: 530,  treat: 'Standard', st: 1, dir: 1, cont: '50-70' },
        { ref: 'RRD 70', mpk: 460,  treat: 'Standard', st: 1, dir: 1, cont: '55-78' },
        { ref: 'RRD 80', mpk: 400,  treat: 'Standard', st: 1, dir: 1, cont: '60-85' },
        // ── VRL (traitement P9) ──
        { ref: 'VRL 1', mpk: 950,  treat: 'P9', st: 1, dir: 0, cont: '35-45' },
        { ref: 'VRL 2', mpk: 830,  treat: 'P9', st: 1, dir: 0, cont: '40-55' },
        { ref: 'VRL 3', mpk: 720,  treat: 'P9', st: 1, dir: 0, cont: '45-60' },
        { ref: 'VRL 4', mpk: 620,  treat: 'P9', st: 1, dir: 0, cont: '50-68' },
        { ref: 'VRL 5', mpk: 540,  treat: 'P9', st: 1, dir: 0, cont: '55-75' },
        { ref: 'VRL 6', mpk: 470,  treat: 'P9', st: 1, dir: 0, cont: '60-82' },
        // ── FD ──
        { ref: 'FD 4',  mpk: 1100, treat: 'Aucun', st: 0, dir: 0, cont: '20-32' },
        { ref: 'FD 6',  mpk: 900,  treat: 'Aucun', st: 0, dir: 0, cont: '25-40' },
        { ref: 'FD 8',  mpk: 750,  treat: 'Aucun', st: 0, dir: 0, cont: '30-50' },
        { ref: 'FD 10', mpk: 640,  treat: 'Aucun', st: 0, dir: 0, cont: '38-55' },
        { ref: 'FD 12', mpk: 550,  treat: 'Aucun', st: 0, dir: 0, cont: '45-65' },
        // ── TG (traitement P103) ──
        { ref: 'TG 1', mpk: 1000, treat: 'P103', st: 1, dir: 0, cont: '25-38' },
        { ref: 'TG 2', mpk: 850,  treat: 'P103', st: 1, dir: 0, cont: '30-45' },
        { ref: 'TG 3', mpk: 720,  treat: 'P103', st: 1, dir: 0, cont: '38-55' },
        { ref: 'TG 4', mpk: 610,  treat: 'P103', st: 1, dir: 0, cont: '45-62' },
        { ref: 'TG 5', mpk: 520,  treat: 'P103', st: 1, dir: 0, cont: '50-70' },
        // ── FLAT BRAID 3×N ──
        { ref: '3x4',  mpk: 2200, treat: 'Aucun', st: 1, dir: 0, cont: '8-15' },
        { ref: '3x5',  mpk: 1900, treat: 'Aucun', st: 1, dir: 0, cont: '10-18' },
        { ref: '3x6',  mpk: 1650, treat: 'Aucun', st: 1, dir: 0, cont: '10-20' },
        { ref: '3x7',  mpk: 1450, treat: 'Aucun', st: 1, dir: 0, cont: '12-22' },
        { ref: '3x8',  mpk: 1300, treat: 'Aucun', st: 1, dir: 0, cont: '15-25' },
        { ref: '3x9',  mpk: 1150, treat: 'Aucun', st: 1, dir: 0, cont: '18-28' },
        { ref: '3x10', mpk: 1050, treat: 'Aucun', st: 1, dir: 0, cont: '20-30' },
        { ref: '3x11', mpk: 950,  treat: 'Aucun', st: 1, dir: 0, cont: '22-33' },
        { ref: '3x12', mpk: 870,  treat: 'Aucun', st: 1, dir: 0, cont: '25-38' },
        { ref: '3x13', mpk: 800,  treat: 'Aucun', st: 1, dir: 0, cont: '28-40' },
        { ref: '3x14', mpk: 740,  treat: 'Aucun', st: 1, dir: 0, cont: '30-45' },
        { ref: '3x15', mpk: 680,  treat: 'Aucun', st: 1, dir: 0, cont: '33-48' },
        { ref: '3x16', mpk: 630,  treat: 'Aucun', st: 1, dir: 0, cont: '35-50' },
        { ref: '3x17', mpk: 580,  treat: 'Aucun', st: 1, dir: 0, cont: '38-55' },
        { ref: '3x18', mpk: 540,  treat: 'Aucun', st: 1, dir: 0, cont: '40-60' },
        { ref: '3x20', mpk: 470,  treat: 'Aucun', st: 1, dir: 0, cont: '45-65' },
        { ref: '3x22', mpk: 410,  treat: 'Aucun', st: 1, dir: 0, cont: '50-70' },
        { ref: '3x24', mpk: 360,  treat: 'Aucun', st: 1, dir: 0, cont: '55-80' },
    ];

    let techCount = 0;
    for (const t of techData) {
        try {
            const result = await db.run(
                `UPDATE wicks SET 
                    meters_per_kg = ?,
                    chemical_treatment = ?,
                    self_trimming = ?,
                    directional = ?,
                    recommended_container_mm = ?
                 WHERE reference = ? AND (meters_per_kg IS NULL OR meters_per_kg = 0)`,
                [t.mpk, t.treat, t.st, t.dir, t.cont, t.ref]
            );
            if (result && result.changes > 0) techCount++;
        } catch (e) { /* skip */ }
    }

    if (count > 0 || techCount > 0) {
        console.log('  ✓ Mèches Wedo enrichies : +' + count + ' nouvelles, ' + techCount + ' fiches techniques (m/kg, traitement)');
    }
}

module.exports = { seedMultiWicks };
