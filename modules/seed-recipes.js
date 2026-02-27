// Recettes MFC — Savoir-faire numérisé depuis entretien terrain
async function seedRecipes(db) {
    const count = await db.get('SELECT COUNT(*) as c FROM recipes');
    if (count.c > 0) { console.log('  ✓ Recettes déjà présentes'); return; }

    const recipes = [
        {
            name: 'Tripartite 47/36/5', code: 'MFC-A', candle_type: 'container',
            description: 'Base principale MFC — 3 cires. La plus utilisée, validée sur 7+ formulations.',
            diameter_min: 65, diameter_max: 90,
            fragrance_pct_min: 10, fragrance_pct_max: 12, fragrance_pct_default: 12,
            wick_series: 'LX',
            wick_size_guide: 'LX18: petit format/parfum léger\nLX20: format moyen (Caravelle 25)\nLX22: gros format (Caravelle 27, Stockholm) ou parfum 12%\nChoix = verre × % parfum × masse totale',
            pour_temp_min: 70, pour_temp_max: 75, cure_hours: 72,
            empirical_notes: 'Recette de référence MFC. Fonctionne avec 90% des parfums.\n\nAnalogie des cailloux :\n• 5203 (paraffine) = gros cailloux — structure avec espaces où le parfum se loge\n• 6213 (cire dure) = cailloux moyens — dureté + combustion + diffusion (riche en huile)\n• 2528 (micro) = petits cailloux — adhérence verre\n\nLa 6213 brûle bien et donne de la dureté MAIS rend translucide.\n\nParfums lourds → monter 6213 à 38% (recette MFC-C).\n1-2 parfums rares ne brûlent PAS avec 6213 → basculer MFC-B.',
            known_variants: 'Parfum 10% → 6213 à 38% (MFC-C)\nParfum lourd/tenace → 6213 à 38%\nTranslucidité gênante → réduire 6213',
            pitfalls: 'Certains parfums (rare) bloquent avec 6213 → MFC-B\n6213 rend translucide\nNe pas dépasser 12% parfum',
            best_for: 'Containers verre, parfums standards 12%, production série',
            waxes: [
                { wax_name: 'HYWAX 5203', percentage: 47, role: 'Base (espaces pour parfum)' },
                { wax_name: '6213', percentage: 36, role: 'Dureté + combustion + diffusion' },
                { wax_name: '2528 Micro', percentage: 5, role: 'Adhérence verre' }
            ]
        },
        {
            name: 'Bipartite 80/10 (sans 6213)', code: 'MFC-B', candle_type: 'container',
            description: 'Base 2 cires — quand un parfum ne brûle pas avec la 6213.',
            diameter_min: 60, diameter_max: 85,
            fragrance_pct_min: 10, fragrance_pct_max: 12, fragrance_pct_default: 10,
            wick_series: 'LX',
            wick_size_guide: 'LX18: standard (Caravelle 25, parfum 10%)\nLX22: gros format ou parfum 12%',
            pour_temp_min: 70, pour_temp_max: 75, cure_hours: 72,
            empirical_notes: 'Sans 6213, le brûlage est parfait — la 5203 seule laisse max d\'espace au parfum.\n\nValidé : Bois de Coton (80/10, parfum 10%, LX18), The Place Beyond the Pines (78/10, parfum 12%, LX22).\n\nPlus souple que Tripartite mais meilleur aspect visuel (pas translucide).',
            pitfalls: 'Moins dure → transport/stockage été\nDiffusion parfois moindre (pas d\'huile 6213)',
            best_for: 'Parfums incompatibles avec 6213, rendu opaque souhaité',
            waxes: [
                { wax_name: 'HYWAX 5203', percentage: 80, role: 'Base quasi-seule' },
                { wax_name: '2528 Micro', percentage: 10, role: 'Adhérence verre' }
            ]
        },
        {
            name: 'Tripartite renforcée 47/38/5', code: 'MFC-C', candle_type: 'container',
            description: '6213 montée à 38% — parfums lourds nécessitant tenue et diffusion.',
            diameter_min: 65, diameter_max: 90,
            fragrance_pct_min: 10, fragrance_pct_max: 10, fragrance_pct_default: 10,
            wick_series: 'LX',
            wick_size_guide: 'LX18: standard parfum lourd\nLX22: gros format',
            pour_temp_min: 70, pour_temp_max: 75, cure_hours: 72,
            empirical_notes: '6213 à 38% pour parfums lourds/tenaces. Le parfum à 10% car ces parfums sont naturellement dosés plus bas.\nLa 6213 riche en huile aide à diffuser les parfums lourds.\n\nValidé : Dita (LX22), Sole Nero (LX18).',
            pitfalls: 'Plus translucide (38% de 6213)\nPas pour parfums légers/frais',
            best_for: 'Parfums lourds, orientaux, musqués',
            waxes: [
                { wax_name: 'HYWAX 5203', percentage: 47, role: 'Base' },
                { wax_name: '6213', percentage: 38, role: 'Structure renforcée + diffusion' },
                { wax_name: '2528 Micro', percentage: 5, role: 'Adhérence' }
            ]
        },
        {
            name: 'Base Cétylique', code: 'MFC-D', candle_type: 'container',
            description: 'Alcool cétylique — triple action : combustion + opacité + diffusion.',
            diameter_min: 65, diameter_max: 90,
            fragrance_pct_min: 10, fragrance_pct_max: 12, fragrance_pct_default: 12,
            wick_series: 'LX',
            wick_size_guide: 'LX24: validé (monter 1-2 tailles vs Tripartite)',
            pour_temp_min: 68, pour_temp_max: 75, cure_hours: 72,
            empirical_notes: 'Alcool cétylique = 3 fonctions :\n1. Combustion parfums difficiles\n2. Opacité (compense translucidité 6213)\n3. Diffusion améliorée\n\nMicro 7837 remplace 2528.\n\nValidé : Paris la Nuit (43/30/10/5, parfum 12%, LX24).',
            pitfalls: 'Texture modifiée → toujours tester\nMèche +1-2 tailles\nStock cétylique séparé',
            best_for: 'Parfums difficiles, besoin opacité + diffusion',
            waxes: [
                { wax_name: 'HYWAX 5203', percentage: 43, role: 'Base' },
                { wax_name: '6213', percentage: 30, role: 'Structure + diffusion' },
                { wax_name: 'Alcool cétylique', percentage: 10, role: 'Combustion + opacité + diffusion' },
                { wax_name: '7837 Micro', percentage: 5, role: 'Adhérence (remplace 2528)' }
            ]
        },
        {
            name: 'Haute 5203 (ouverture)', code: 'MFC-E', candle_type: 'container',
            description: '5203 dominante (70-73%) — "ouvre" la formule pour parfums semi-difficiles.',
            diameter_min: 65, diameter_max: 85,
            fragrance_pct_min: 11, fragrance_pct_max: 12, fragrance_pct_default: 12,
            wick_series: 'LX',
            wick_size_guide: 'LX20 à LX22 selon format',
            pour_temp_min: 70, pour_temp_max: 75, cure_hours: 72,
            empirical_notes: 'Quand le ratio standard 47/36 bloque → augmenter 5203 = "ouvrir" (plus de gros cailloux = plus d\'espace pour le parfum).\n6213 réduite à 10-11% (juste assez pour un peu de tenue).\n\nCompromis entre Tripartite et Bipartite.\n\nValidé : Green Leather (70/10/8), Charbon Rose (73/11/5).',
            pitfalls: 'Moins dure → fragile transport\nSi toujours pas OK → MFC-B (zéro 6213) ou MFC-D (cétylique)',
            best_for: 'Parfums semi-difficiles — entre Tripartite et Bipartite',
            waxes: [
                { wax_name: 'HYWAX 5203', percentage: 70, role: 'Base dominante (ouvre formule)' },
                { wax_name: '6213', percentage: 10, role: 'Minimum structure/diffusion' },
                { wax_name: '2528 Micro', percentage: 8, role: 'Adhérence + compensation' }
            ]
        }
    ];

    for (const r of recipes) {
        const result = await db.run(
            `INSERT INTO recipes (name,code,candle_type,description,diameter_min,diameter_max,
             fragrance_pct_min,fragrance_pct_max,fragrance_pct_default,wick_series,wick_size_guide,
             pour_temp_min,pour_temp_max,cure_hours,empirical_notes,known_variants,pitfalls,best_for)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [r.name,r.code,r.candle_type,r.description,r.diameter_min,r.diameter_max,
             r.fragrance_pct_min,r.fragrance_pct_max,r.fragrance_pct_default,r.wick_series,r.wick_size_guide,
             r.pour_temp_min,r.pour_temp_max,r.cure_hours,r.empirical_notes,r.known_variants||null,r.pitfalls,r.best_for]
        );
        for (const w of r.waxes) {
            await db.run('INSERT INTO recipe_waxes (recipe_id,wax_name,percentage,role) VALUES (?,?,?,?)',
                [result.lastInsertRowid, w.wax_name, w.percentage, w.role]);
        }
        // Auto KB entry
        let kb = 'Recette ' + r.name + ' (' + r.code + ') — ' + r.candle_type;
        kb += '\nComposition : ' + r.waxes.map(w => w.wax_name + ' ' + w.percentage + '% (' + w.role + ')').join(', ');
        if (r.empirical_notes) kb += '\n\n' + r.empirical_notes;
        await db.run('INSERT INTO knowledge_base (category,subcategory,title,content,source,priority,tags) VALUES (?,?,?,?,?,?,?)',
            ['Recettes MFC', r.candle_type, '📋 ' + r.name, kb, 'Recette ' + r.code, 1,
             ['recette', r.code, r.candle_type, r.wick_series].join(',')]);
    }
    console.log('  ✓ Recettes MFC : ' + recipes.length + ' recettes + base de connaissances');
}
// exported at end of file

// Additional recipes from second batch of Excel files
async function seedRecipesBatch2(db) {
    const existing = await db.get("SELECT COUNT(*) as c FROM recipes WHERE code IN ('MFC-F','MFC-G')");
    if (existing.c > 0) return;

    const recipes = [
        {
            name: 'Pure 6213 (diffusion max)', code: 'MFC-F', candle_type: 'container',
            description: 'Base 100% 6213 — diffusion parfum maximale. Développée pour Rothschild (pot porcelaine).',
            diameter_min: 65, diameter_max: 90,
            fragrance_pct_min: 10, fragrance_pct_max: 10, fragrance_pct_default: 10,
            wick_series: 'LX',
            wick_size_guide: 'LX20: parfums légers (jasmin, floraux)\nLX22: parfums plus lourds (encens, boisés)\nChoix basé sur le diamètre intérieur du pot, pas la masse',
            pour_temp_min: 70, pour_temp_max: 75, cure_hours: 72,
            empirical_notes: "100% 6213 = diffusion maximale grâce à la teneur en huile.\n\nRendu : cire opaque et crémeuse (pas translucide contrairement au mélange avec 5203).\n\nLIMITE IMPORTANTE : les notes olfactives sont moins nuancées qu'avec de la 5203. La 6213 seule \"aplatit\" un peu le parfum — on gagne en puissance de diffusion mais on perd en subtilité.\n\nLes matières seules ne fonctionnent pas de manière exceptionnelle — c'est le mélange qui fait la qualité. Cette recette est un compromis volontaire : max diffusion au détriment de la nuance.\n\nValidé sur pot porcelaine 320g : Château Clarke (LX22), Château des Laurets (LX22), Jasmin Citronnier (LX20), Malengin (LX20), Purple Flashas (LX22).",
            known_variants: "Pas de variantes connues — la formule est simple (90% 6213 + 10% parfum).\nSi le client veut plus de nuance → passer à MFC-A ou MFC-C avec de la 5203.",
            pitfalls: "Notes olfactives moins nuancées que les bases avec 5203\nPas adapté aux parfums subtils/complexes où la nuance compte\nParfum strictement à 10% (la 6213 seule ne supporte pas 12%)",
            best_for: "Diffusion maximale, pots opaques (porcelaine), parfums simples/directs, client Rothschild",
            waxes: [
                { wax_name: '6213', percentage: 90, role: 'Seule cire — diffusion max (teneur en huile)' }
            ]
        },
        {
            name: 'Tripartite inversée 49/36/5', code: 'MFC-G', candle_type: 'container',
            description: 'Ratio inversé (6213 dominante) — adaptée au format/matière spécifique du pot Almon + colorant.',
            diameter_min: 60, diameter_max: 85,
            fragrance_pct_min: 10, fragrance_pct_max: 10, fragrance_pct_default: 10,
            wick_series: 'LX',
            wick_size_guide: 'LX18 110mm systématique pour le pot Almon\nLa longueur 110mm est adaptée à la hauteur du pot\nChoix basé sur le diamètre intérieur du pot',
            pour_temp_min: 70, pour_temp_max: 75, cure_hours: 72,
            empirical_notes: "Ratio inversé par rapport à MFC-A : la 6213 passe de 36% à 49% (dominante) et la 5203 descend de 47% à 36%.\n\nDéveloppée empiriquement pour le pot bleu Almon (270g) et le Stockholm 27 (270g). Le format et la matière du pot imposent ce ratio — plus de 6213 pour la dureté et la tenue adaptées à ce contenant.\n\nInclut un colorant bleu (2624 1831k) à 0.09% — dosage très faible car :\n- Teinte subtile/légère souhaitée\n- Colorant très concentré\n- Harmonisation avec le pot bleu\n\nValidé sur 10 parfums différents (1945, BARR, BERRYBOMB, BLUES AWAY, CHADO, KASSETT, KOBENHAVN, MUSEET, SISU BOUQUET, UNICORN) → recette très stable.",
            pitfalls: "Spécifique au format Almon — ne pas appliquer tel quel à d'autres contenants\nLe colorant à 0.09% est propre à ce client\nPlus de 6213 = plus translucide si pot transparent (le pot bleu cache ça)",
            best_for: "Client Almon, pot bleu 270g, pot Stockholm 27, parfums 10% avec colorant subtil",
            waxes: [
                { wax_name: '6213', percentage: 49, role: 'Dominante (dureté + diffusion adaptée au pot)' },
                { wax_name: 'HYWAX 5203', percentage: 36, role: 'Complément structure' },
                { wax_name: '2528 Micro', percentage: 5, role: 'Adhérence' }
            ]
        }
    ];

    for (const r of recipes) {
        const result = await db.run(
            `INSERT INTO recipes (name,code,candle_type,description,diameter_min,diameter_max,
             fragrance_pct_min,fragrance_pct_max,fragrance_pct_default,wick_series,wick_size_guide,
             pour_temp_min,pour_temp_max,cure_hours,empirical_notes,known_variants,pitfalls,best_for)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [r.name,r.code,r.candle_type,r.description,r.diameter_min,r.diameter_max,
             r.fragrance_pct_min,r.fragrance_pct_max,r.fragrance_pct_default,r.wick_series,r.wick_size_guide,
             r.pour_temp_min,r.pour_temp_max,r.cure_hours,r.empirical_notes,r.known_variants||null,r.pitfalls,r.best_for]
        );
        for (const w of r.waxes) {
            await db.run('INSERT INTO recipe_waxes (recipe_id,wax_name,percentage,role) VALUES (?,?,?,?)',
                [result.lastInsertRowid, w.wax_name, w.percentage, w.role]);
        }
        let kb = 'Recette ' + r.name + ' (' + r.code + ') — ' + r.candle_type;
        kb += '\nComposition : ' + r.waxes.map(w => w.wax_name + ' ' + w.percentage + '% (' + w.role + ')').join(', ');
        if (r.empirical_notes) kb += '\n\n' + r.empirical_notes;
        await db.run('INSERT INTO knowledge_base (category,subcategory,title,content,source,priority,tags) VALUES (?,?,?,?,?,?,?)',
            ['Recettes MFC', r.candle_type, '📋 ' + r.name, kb, 'Recette ' + r.code, 1,
             ['recette', r.code, r.candle_type, r.wick_series].join(',')]);
    }

    // Add empirical insight about 6213 alone
    await db.run(`INSERT OR IGNORE INTO knowledge_base (category,subcategory,title,content,source,priority,tags) VALUES (?,?,?,?,?,?,?)`,
        ['technique', 'cire', 'Limites des matières seules vs mélanges',
         "Les matières premières seules ne fonctionnent pas de manière exceptionnelle — c'est le MÉLANGE qui fait la qualité.\n\nExemple 6213 seule (100%) :\n• Diffusion max grâce à la teneur en huile → OK\n• Rendu opaque et crémeux → OK\n• MAIS notes olfactives moins nuancées, parfum \"aplati\"\n• On gagne en puissance, on perd en subtilité\n\nC'est pour ça que les bases MFC-A à MFC-E mélangent 5203+6213+micro — la 5203 apporte les espaces (gros cailloux) qui permettent aux molécules de parfum de s'exprimer individuellement.\n\nRègle MFC : utiliser la 6213 seule uniquement quand la diffusion brute prime sur la nuance (ex: Rothschild porcelaine).",
         'Savoir-faire MFC — Entretien terrain', 1,
         '6213,5203,mélange,nuance,diffusion,matière,seule']);

    // Add insight about diameter vs mass for wick selection
    await db.run(`INSERT OR IGNORE INTO knowledge_base (category,subcategory,title,content,source,priority,tags) VALUES (?,?,?,?,?,?,?)`,
        ['technique', 'mèche', 'Diamètre intérieur = facteur n°1 pour la mèche',
         "C'est le DIAMÈTRE INTÉRIEUR du pot qui détermine la mèche, PAS la masse du contenant.\n\nExemple : pot porcelaine Rothschild (320g) et pot Almon (270g) — la masse diffère de 50g mais c'est le diamètre intérieur qui dicte LX18, LX20 ou LX22.\n\nLa longueur de mèche (ex: 110mm) est adaptée à la HAUTEUR du pot.\n\nFacteurs pour le choix de mèche par ordre d'importance :\n1. Diamètre intérieur du pot\n2. Type et % de parfum\n3. Composition de la cire (ratio 5203/6213)\n4. Hauteur du pot (pour la longueur de mèche)",
         'Savoir-faire MFC — Entretien terrain', 1,
         'mèche,diamètre,intérieur,pot,masse,longueur,choix']);

    console.log('  ✓ Recettes batch 2 : MFC-F (Rothschild) + MFC-G (Almon) + 2 fiches savoir');
}

module.exports = { seedRecipes, seedRecipesBatch2 };

// MFC-H (Pillar) and MFC-I (Vegetable universal) — VRAIES RECETTES
async function seedRecipesBatch3(db) {
    const existing = await db.get("SELECT COUNT(*) as c FROM recipes WHERE code IN ('MFC-H','MFC-I')");
    if (existing && existing.c > 0) {
        // Check KB too
        const kb = await db.get("SELECT id FROM knowledge_base WHERE title LIKE '%MFC-H%'");
        if (kb) return;
    }

    const recipes = [
        {
            name: 'Pilier paraffine 6670/DUB/Vybar', code: 'MFC-H', candle_type: 'pilier',
            description: 'Base pilier autoportant — paraffine haute fusion SER + Vybar pour rigidité et rétention parfum. Validée sur Cylindrique Louboutin 8000g.',
            diameter_min: 100, diameter_max: 200,
            fragrance_pct_min: 10, fragrance_pct_max: 10, fragrance_pct_default: 10,
            wick_series: 'LX',
            wick_size_guide: '3 × LX22 pour Cylindrique 8000g\nMulti-mèches obligatoire sur grands formats\nAdapter nombre et taille selon diamètre',
            pour_temp_min: 75, pour_temp_max: 82, cure_hours: 96,
            empirical_notes: 'PILIER = tout change par rapport au container :\n- La cire DOIT tenir sa forme seule (pas de verre)\n- Paraffine 6670 (SER Italie, groupe AWAX) = haute fusion pour rigidité structurelle\n- Vybar 260 à 3% = polymère de rétention parfum + rigidité → INDISPENSABLE en pilier\n- DUB AL 1618 à 10% = toujours là, même en pilier (anti-défauts universel MFC)\n- Colorant Bekro 15081 au lieu de Kaiser Lacke (meilleure compatibilité pilier)\n- Coulée en moule → démoulage, température critique\n\nLe Vybar piège le parfum dans un réseau polymère → restitution longue durée.\nSans Vybar, le parfum migrerait et suinterait sur un pilier.',
            known_variants: 'Adapter nombre de mèches au diamètre\nPetit pilier (100mm) → 1×LX22\nMoyen (150mm) → 2×LX22\nGrand (200mm+) → 3×LX22\nColorant ajustable selon demande client',
            pitfalls: 'JAMAIS utiliser une cire container (5203, 6213) pour un pilier → trop mou\nSans Vybar → suintement parfum garanti\nDémoulage : température et timing critiques\nMulti-mèches : espacement régulier obligatoire',
            best_for: 'Piliers autoportants, bougies décoratives, grands formats luxe',
            waxes: [
                { wax_name: 'Paraffine 6670 (SER)', percentage: 77, role: 'Base haute fusion — rigidité structurelle' },
                { wax_name: 'DUB AL 1618', percentage: 10, role: 'Anti-défauts universel' },
                { wax_name: 'Vybar 260', percentage: 3, role: 'Rétention parfum + rigidité polymère' }
            ]
        },
        {
            name: 'Base végétale universelle soja/Nafol/DUB', code: 'MFC-I', candle_type: 'container végétal',
            description: 'Base universelle végétale — soja + 30% alcools gras. Validée La Bruket Stockholm 27. Adaptable via mèche selon format.',
            diameter_min: 60, diameter_max: 100,
            fragrance_pct_min: 10, fragrance_pct_max: 10, fragrance_pct_default: 10,
            wick_series: 'LX',
            wick_size_guide: 'LX18: petit format (< 200g)\nLX22: format moyen (Stockholm 27, ~270g)\n3×LX20: grand format (> 400g)\nLe végétal nécessite souvent une mèche plus grosse que la paraffine',
            pour_temp_min: 60, pour_temp_max: 65, cure_hours: 168,
            empirical_notes: 'BASE VÉGÉTALE = 30% d\'alcools gras obligatoire pour combattre le polymorphisme du soja.\n\nLe soja seul est INUTILISABLE en bougie :\n- Polymorphisme (cristallisation imprévisible)\n- Adhérence verre catastrophique\n- Surface irrégulière, taches, fissures\n\nSolution MFC : 60% soja + 20% Nafol 1822 + 10% DUB AL 1618 = 30% d\'alcools gras au total\n- Nafol 1822 (Sasol) : mélange C18-C22 = durcisseur + anti-polymorphe\n- DUB AL 1618 (Dubois) : mélange C16-C18 = anti-défauts + dispersion parfum\n- Les deux créent une structure amorphe qui empêche la cristallisation ordonnée\n\nCure : 7 jours minimum (pas 72h comme la paraffine)\nPas de colorant dans la base La Bruket (choix esthétique naturel)\n\nLe DUB AL 1618 est l\'UNIQUE additif commun entre paraffine et végétale → secret MFC.',
            known_variants: 'Format petit → LX18 seul\nFormat moyen → LX22\nGrand format → multi-mèches 3×LX20\nColza (DUB GREEN WAX RAPESEED) possible en remplacement partiel du soja',
            pitfalls: 'Cure trop courte → surface irrégulière\nCouler trop chaud → frosting garanti\nSous 25% alcools gras → polymorphisme revient\nNe PAS utiliser de colorant Kaiser Lacke (dosage différent en végétal)',
            best_for: 'Containers végétaux, marques premium naturelles, clients éco-responsables',
            waxes: [
                { wax_name: 'Cire Végétale S (soja G 60/40)', percentage: 60, role: 'Base végétale — structure poreuse' },
                { wax_name: 'Nafol 1822', percentage: 20, role: 'Durcisseur + anti-polymorphe (C18-C22)' },
                { wax_name: 'DUB AL 1618', percentage: 10, role: 'Anti-défauts universel + dispersion parfum' }
            ]
        }
    ];

    for (const r of recipes) {
        const result = await db.run(
            `INSERT INTO recipes (name,code,candle_type,description,diameter_min,diameter_max,
             fragrance_pct_min,fragrance_pct_max,fragrance_pct_default,wick_series,wick_size_guide,
             pour_temp_min,pour_temp_max,cure_hours,empirical_notes,known_variants,pitfalls,best_for)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [r.name,r.code,r.candle_type,r.description,r.diameter_min,r.diameter_max,
             r.fragrance_pct_min,r.fragrance_pct_max,r.fragrance_pct_default,r.wick_series,r.wick_size_guide,
             r.pour_temp_min,r.pour_temp_max,r.cure_hours,r.empirical_notes,r.known_variants||null,r.pitfalls,r.best_for]
        );
        for (const w of r.waxes) {
            await db.run('INSERT INTO recipe_waxes (recipe_id,wax_name,percentage,role) VALUES (?,?,?,?)',
                [result.lastInsertRowid, w.wax_name, w.percentage, w.role]);
        }
        // Auto KB entry
        let kb = 'Recette ' + r.name + ' (' + r.code + ') — ' + r.candle_type;
        kb += '\nComposition : ' + r.waxes.map(w => w.wax_name + ' ' + w.percentage + '% (' + w.role + ')').join(', ');
        if (r.empirical_notes) kb += '\n\n' + r.empirical_notes;
        await db.run('INSERT OR IGNORE INTO knowledge_base (category,subcategory,title,content,source,priority,tags) VALUES (?,?,?,?,?,?,?)',
            ['Recettes MFC', r.candle_type, '📋 ' + r.name, kb, 'Recette ' + r.code, 1,
             ['recette', r.code, r.candle_type, r.wick_series].join(',')]);
    }
    console.log('  ✓ Recettes batch 3 : MFC-H (pilier) + MFC-I (végétale universelle)');
}

module.exports.seedRecipesBatch3 = seedRecipesBatch3;
