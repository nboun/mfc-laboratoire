// ═══════════════════════════════════════════════════════════════
// ENRICHISSEMENT v5.20.8 — Données manquantes + KB complémentaire
// Colorants Kaiser manquants, fiches sécurité, process, clients,
// fournisseurs parfumeurs, glossaire R&D
// ═══════════════════════════════════════════════════════════════

async function seedEnrichmentV5208(db) {
    const marker = await db.get("SELECT COUNT(*) as c FROM knowledge_base WHERE tags LIKE '%v5.20.8%'");
    if (marker && marker.c > 0) { console.log('  ✓ Enrichissement v5.20.8 déjà appliqué'); return; }

    // ════════════════════════════════════════════════
    // 1. COLORANTS KAISER MANQUANTS dans la table colorants
    //    (FDS analysées en KB mais pas dans la table produits)
    // ════════════════════════════════════════════════

    const missingColorants = [
        // KWC DYE série (granulé)
        { supplier_id: 4, reference: '2803250', name: 'KWC DYE 250 red', short_name: 'Rouge 250', form: 'Granulé', series: 'KWC DYE',
          color_hex: '#CC0000', r: 204, g: 0, b: 0, density: 0.96, flash_point: 140, hazard_h315: 1, hazard_h319: 1,
          dosage_recommended: 0.1, dosage_max: 0.5, notes: 'Contient Solvent Red 24 (CAS 85-83-6) — colorant azoïque. Irritant peau/yeux.' },

        { supplier_id: 4, reference: '2803330', name: 'KWC DYE 330 green', short_name: 'Vert 330', form: 'Granulé', series: 'KWC DYE',
          color_hex: '#006400', r: 0, g: 100, b: 0, density: 0.95, flash_point: 150, hazard_h315: 0, hazard_h319: 0,
          dosage_recommended: 0.1, dosage_max: 0.5, notes: 'Aucun composant dangereux. WGK nwg (sans danger eau). Le plus propre de la gamme Kaiser.' },

        { supplier_id: 4, reference: '2803350', name: 'KWC DYE 350 black', short_name: 'Noir 350', form: 'Granulé', series: 'KWC DYE',
          color_hex: '#1A1A1A', r: 26, g: 26, b: 26, density: 0.94, flash_point: 140, hazard_h315: 0, hazard_h319: 0,
          dosage_recommended: 0.1, dosage_max: 0.5, notes: 'Aucun composant dangereux déclaré mais WGK 2 (danger important eau).' },

        { supplier_id: 4, reference: '2803366', name: 'KWC DYE 366 black', short_name: 'Noir 366', form: 'Granulé', series: 'KWC DYE',
          color_hex: '#0D0D0D', r: 13, g: 13, b: 13, density: 0.99, flash_point: 140, hazard_h315: 1, hazard_h319: 1,
          dosage_recommended: 0.1, dosage_max: 0.5, notes: 'Contient Sudan Red B (CAS 85-83-6) 2.5-10%. WGK 3 (très grave danger eau). Densité la plus élevée de la gamme.' },

        { supplier_id: 4, reference: '2803380', name: 'KWC DYE 380 yellow', short_name: 'Jaune 380', form: 'Granulé', series: 'KWC DYE',
          color_hex: '#FFD700', r: 255, g: 215, b: 0, density: 0.93, flash_point: 140, hazard_h315: 0, hazard_h319: 0,
          dosage_recommended: 0.1, dosage_max: 0.5, notes: 'Aucun composant dangereux. Densité la plus basse de la gamme.' },

        { supplier_id: 4, reference: '280415450', name: 'KWC DYE mahogany', short_name: 'Acajou', form: 'Granulé', series: 'KWC DYE',
          color_hex: '#C04000', r: 192, g: 64, b: 0, density: 0.95, flash_point: 140, hazard_h315: 0, hazard_h319: 0,
          dosage_recommended: 0.1, dosage_max: 0.5, notes: 'Teinte acajou/brun chaud. Référence custom.' },

        // liquiDYE série (liquide) — manquants
        { supplier_id: 4, reference: '2620280', name: 'liquiDYE 280 pink', short_name: 'Rose 280', form: 'Liquide', series: 'liquiDYE',
          color_hex: '#FF69B4', r: 255, g: 105, b: 180, density: null, flash_point: null, hazard_h315: 0, hazard_h319: 0,
          dosage_recommended: 0.1, dosage_max: 0.3, notes: 'Format liquide — dosage plus précis que granulé.' },

        { supplier_id: 4, reference: '262418931K', name: 'liquiDYE light blue custom', short_name: 'Bleu clair', form: 'Liquide', series: 'liquiDYE',
          color_hex: '#87CEEB', r: 135, g: 206, b: 235, density: null, flash_point: null, hazard_h315: 0, hazard_h319: 0,
          dosage_recommended: 0.1, dosage_max: 0.3, notes: 'Teinte bleu clair. Référence custom.' },

        { supplier_id: 4, reference: '262418923K', name: 'liquiDYE mahagoni custom', short_name: 'Acajou liquide', form: 'Liquide', series: 'liquiDYE',
          color_hex: '#C04000', r: 192, g: 64, b: 0, density: null, flash_point: null, hazard_h315: 0, hazard_h319: 0,
          dosage_recommended: 0.1, dosage_max: 0.3, notes: 'Teinte acajou. Référence custom.' },
    ];

    for (const c of missingColorants) {
        const exists = await db.get('SELECT id FROM colorants WHERE reference = ?', [c.reference]);
        if (!exists) {
            await db.run(`INSERT INTO colorants (supplier_id, reference, name, short_name, form, series, 
                color_hex, color_rgb_r, color_rgb_g, color_rgb_b, density, flash_point,
                hazard_h315, hazard_h319, dosage_recommended, dosage_max, notes, available, active) 
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,1)`,
                [c.supplier_id, c.reference, c.name, c.short_name, c.form, c.series,
                 c.color_hex, c.r, c.g, c.b, c.density, c.flash_point,
                 c.hazard_h315, c.hazard_h319, c.dosage_recommended, c.dosage_max, c.notes]);
        }
    }
    console.log('  ✓ Enrichissement : +9 colorants Kaiser manquants');

    // ════════════════════════════════════════════════
    // 2. FICHES KB — SÉCURITÉ LABO
    // ════════════════════════════════════════════════

    const kbEntries = [
        // --- SÉCURITÉ ---
        ['sécurité', 'labo', 'Sécurité labo — Équipements de protection individuelle (EPI)',
         "EPI obligatoires en production de bougies :\n\n" +
         "LUNETTES DE PROTECTION :\n- Obligatoires lors de la manipulation de cires chaudes (>60°C)\n- Obligatoires avec colorants classés H315/H319 (irritants yeux)\n- Type : lunettes enveloppantes anti-éclaboussures\n\n" +
         "GANTS :\n- Gants thermiques pour cire fondue (>80°C)\n- Gants nitrile pour manipulation colorants Kaiser (surtout DYE 366, DYE 390, DYE 250)\n- Pas de latex (allergies croisées avec certains additifs)\n\n" +
         "VENTILATION :\n- Hotte aspirante ou ventilation forcée lors du chauffage de parfums\n- Point éclair parfum = température à laquelle les vapeurs sont inflammables\n- Toujours travailler sous le point éclair du parfum\n\n" +
         "EXTINCTEUR :\n- Type B (liquides inflammables) à portée de main\n- Jamais d'eau sur une cire en feu (risque d'explosion par vaporisation)",
         'Réglementation + expertise MFC', 1,
         'sécurité,EPI,gants,lunettes,ventilation,extincteur,v5.20.8'],

        ['sécurité', 'labo', 'Sécurité labo — Gestion des températures critiques',
         "TEMPÉRATURES CRITIQUES EN PRODUCTION :\n\n" +
         "DANGER IMMÉDIAT (>200°C) :\n- Point d'auto-inflammation paraffine : 245-270°C\n- Ne JAMAIS chauffer une cire au-dessus de 120°C sans contrôle permanent\n- Thermomètre de contrôle obligatoire\n\n" +
         "ZONE DE TRAVAIL PARFUM (60-90°C) :\n- Incorporation parfum : 5-10°C SOUS le point éclair du parfum\n- Température idéale de coulée container : 55-65°C selon la cire\n- Température idéale de coulée pilier : 65-75°C (plus chaud = meilleure adhésion)\n\n" +
         "POINTS ÉCLAIR PARFUMS MFC :\n- Minimum observé : ~60°C (parfums riches en terpènes)\n- Maximum observé : >100°C (parfums lourds/ambrés)\n- Toujours consulter la FDS avant incorporation\n\n" +
         "BRÛLURES :\n- Cire fondue sur peau = brûlure 2e degré possible\n- Rincer 15min à l'eau froide, ne pas arracher la cire solidifiée\n- Trousse de premiers secours à portée de main",
         'Réglementation + expertise MFC', 1,
         'sécurité,température,brûlure,point éclair,auto-inflammation,v5.20.8'],

        ['sécurité', 'labo', 'Sécurité labo — Stockage matières premières',
         "RÈGLES DE STOCKAGE MFC :\n\n" +
         "CIRES (paraffine, micro, végétale) :\n- Température ambiante (15-25°C), à l'abri du soleil\n- Pas d'humidité (la cire absorbe l'eau → défauts de surface)\n- Éloigner des sources de chaleur (>40°C = déformation pastilles)\n- DLC : 24 mois en condition normales\n\n" +
         "PARFUMS / FRAGRANCES :\n- Flacons fermés, à l'abri de la lumière\n- Température stable 15-20°C (pas de variations)\n- Séparation des parfums DPG (interdits MFC) et IPM/ester\n- DLC : 12-18 mois après ouverture\n- Étiquetage : nom + réf + fournisseur + date réception + point éclair\n\n" +
         "COLORANTS KAISER :\n- Granulés : sac fermé, sec, température ambiante\n- Liquides (liquiDYE) : flacon fermé, agiter avant usage\n- Séparer les colorants dangereux (DYE 366 WGK 3, DYE 390 irritant)\n\n" +
         "MÈCHES :\n- Au sec impérativement (mèche humide = flamme instable)\n- Pas en contact avec huiles ou parfums avant usage",
         'Expertise MFC + bonnes pratiques', 1,
         'sécurité,stockage,DLC,température,parfum,cire,colorant,mèche,v5.20.8'],

        // --- PROCESS / PROCÉDURES ---
        ['procédure', 'production', 'Procédure — Coulée container pas à pas',
         "PROCÉDURE STANDARD DE COULÉE CONTAINER MFC :\n\n" +
         "PRÉPARATION (30 min avant) :\n1. Sortir les verres, les pré-chauffer à 40°C si ambiant <18°C\n2. Centrer et coller la mèche (point de colle ou pied adhésif)\n3. Peser les matières premières selon la formulation\n\n" +
         "FUSION (45-60 min) :\n4. Fondre les cires au bain-marie ou fondoir à 80-90°C\n5. Mélanger régulièrement, attendre fonte complète\n6. Vérifier la température au thermomètre\n\n" +
         "INCORPORATION (5 min) :\n7. Descendre à la température d'incorporation parfum (voir FDS)\n8. Ajouter le parfum (% selon formulation), mélanger 2 min\n9. Ajouter le colorant si nécessaire, mélanger 1 min\n\n" +
         "COULÉE :\n10. Couler à 55-65°C (selon cire) en un seul geste régulier\n11. Ne pas déplacer les verres pendant 2h minimum\n12. Laisser refroidir lentement (pas de courant d'air)\n\n" +
         "FINITION :\n13. Retouche de surface si nécessaire (pistolet thermique)\n14. Couper la mèche à 5-7mm\n15. Cure minimum 48h avant test (idéal : 7-14 jours)",
         'Process MFC validé', 1,
         'procédure,coulée,container,production,process,étapes,v5.20.8'],

        ['procédure', 'production', 'Procédure — Coulée pilier pas à pas',
         "PROCÉDURE STANDARD DE COULÉE PILIER MFC :\n\n" +
         "SPÉCIFICITÉS PILIER vs CONTAINER :\n- La cire doit tenir seule (pas de verre) → point de fusion plus élevé\n- Démoulage = étape critique\n- Vybar obligatoire (rétention parfum sans support)\n\n" +
         "PRÉPARATION :\n1. Préparer le moule (silicone ou métal)\n2. Appliquer un agent démoulant si moule métal\n3. Fixer la mèche au centre du moule (tige de centrage)\n\n" +
         "FUSION :\n4. Fondre la base (Paraffine 6670 + Vybar 260 + DUB AL 1618)\n5. Température de fusion : 85-95°C (plus élevée que container)\n6. Le Vybar fond en dernier — s'assurer de la dissolution complète\n\n" +
         "INCORPORATION :\n7. Parfum à 80-85°C (pilier nécessite température plus haute)\n8. Colorant Bekro de préférence (meilleure compatibilité pilier)\n\n" +
         "COULÉE :\n9. Couler à 70-80°C (plus chaud que container)\n10. Coulée en 2 temps si >500g (éviter le retrait central)\n11. Piquer la croûte de surface après 2h, recouler\n\n" +
         "DÉMOULAGE :\n12. Attendre refroidissement complet (12-24h)\n13. Réfrigérateur 30min si moule résiste\n14. Démouler délicatement\n15. Cure 7-14 jours minimum avant test",
         'Process MFC validé', 1,
         'procédure,coulée,pilier,production,moule,démoulage,vybar,v5.20.8'],

        ['procédure', 'test', 'Procédure — Test de combustion standardisé MFC',
         "PROTOCOLE DE TEST DE COMBUSTION MFC :\n\n" +
         "CONDITIONS :\n- Pièce fermée, sans courant d'air\n- Température ambiante 20-22°C\n- Surface plane et ignifugée\n- Cure minimum 48h (idéal 7j) après coulée\n\n" +
         "CYCLE TYPE (4h par cycle) :\n1. Peser la bougie (masse avant)\n2. Allumer, noter l'heure\n3. Observer toutes les 30 min :\n   - Diamètre du bain de fusion (melt pool)\n   - Hauteur de flamme (mm)\n   - Couleur de la flamme\n   - Fumée/suie\n   - Champignonnage de la mèche\n   - Comportement général\n4. Éteindre après 4h\n5. Peser (masse après)\n6. Laisser refroidir 2h minimum entre cycles\n\n" +
         "CRITÈRES DE VALIDATION :\n- Bain de fusion complet (mur à mur) en 2-3h max\n- Pas de tunneling\n- Flamme stable 15-25mm\n- Pas de fumée noire visible\n- Pas de suintage (weeping)\n- Consommation régulière (4-6g/h pour Ø70-80mm)\n\n" +
         "NOMBRE DE CYCLES :\n- Minimum 3 cycles pour validation\n- 4 cycles recommandés pour clients luxe (Rothschild, Ladurée)",
         'Process MFC validé', 1,
         'procédure,test,combustion,cycle,validation,melt pool,protocole,v5.20.8'],

        // --- GLOSSAIRE R&D ---
        ['terminologie', 'glossaire', 'Glossaire — Bain de fusion (Melt Pool)',
         "BAIN DE FUSION (angl. Melt Pool) :\n\n" +
         "Définition : Zone de cire liquide qui se forme autour de la mèche pendant la combustion.\n\n" +
         "Critères de qualité :\n- Le bain doit atteindre les parois du verre (\"mur à mur\") en 2-3h maximum\n- Profondeur idéale : 10-15mm\n- Surface uniforme sans zones solides résiduelles\n\n" +
         "Problèmes associés :\n- Bain trop petit = mèche trop fine → tunneling\n- Bain trop profond = mèche trop grosse → surchauffe, fumée, risque verre\n- Bain irrégulier = mauvais centrage mèche ou courant d'air\n\n" +
         "Impact du parfum :\n- Les parfums à base d'IPM élargissent naturellement le bain\n- Les parfums lourds (ambrés, musqués) peuvent ralentir la formation du bain\n- Le % parfum influence la viscosité de la cire fondue",
         'Expertise MFC', 2,
         'terminologie,bain de fusion,melt pool,combustion,v5.20.8'],

        ['terminologie', 'glossaire', 'Glossaire — Champignonnage (Mushrooming)',
         "CHAMPIGNONNAGE (angl. Mushrooming) :\n\n" +
         "Définition : Formation d'une boule de carbone à l'extrémité de la mèche, en forme de champignon.\n\n" +
         "Causes :\n- Mèche trop grosse pour le diamètre de la bougie\n- Excès de colorant (surtout pigments → obstruction capillaire)\n- Parfum trop lourd qui ne brûle pas complètement\n- Mèche non adaptée au type de cire\n\n" +
         "Conséquences :\n- Flamme instable et trop grande\n- Production de suie (fumée noire)\n- Dépôt noir sur les parois du verre\n- Risque de chute du champignon dans le bain (dangereux)\n\n" +
         "Solutions MFC :\n- Réduire la taille de mèche d'un cran\n- Passer aux colorants liposolubles Kaiser (pas de pigments)\n- Vérifier que le parfum est sans DPG\n- Tester une série de mèche auto-coupante (HTP, ECO)",
         'Expertise MFC', 2,
         'terminologie,champignonnage,mushrooming,mèche,suie,carbone,v5.20.8'],

        ['terminologie', 'glossaire', 'Glossaire — Tunneling',
         "TUNNELING :\n\n" +
         "Définition : La bougie ne brûle qu'au centre, laissant un mur de cire non fondu sur les bords.\n\n" +
         "C'est le défaut N°1 en bougisterie. Un client qui constate du tunneling ne rachètera pas.\n\n" +
         "Causes :\n- Mèche trop fine pour le diamètre (cause principale)\n- Premier allumage trop court (<2h) — la bougie a une \"mémoire\" de son premier bain\n- Cire trop dure (point de congélation trop élevé pour un container)\n- Courant d'air pendant la combustion\n\n" +
         "Prévention MFC :\n- Règle absolue : le premier allumage doit durer jusqu'au bain complet\n- Choisir la mèche qui donne un bain mur à mur en 2-3h max\n- Pour containers Ø>80mm : envisager mèches multiples\n- Cire à point de congélation ≤56°C pour containers\n\n" +
         "Récupération (si client signale) :\n- Papier aluminium autour du bord supérieur\n- Allumer 4h+ pour fondre le mur résiduel\n- Pas toujours récupérable si tunnel profond (>3cm)",
         'Expertise MFC', 1,
         'terminologie,tunneling,défaut,mèche,bain de fusion,v5.20.8'],

        ['terminologie', 'glossaire', 'Glossaire — Suintage / Sweating / Weeping',
         "SUINTAGE (angl. Sweating / Weeping) :\n\n" +
         "Définition : Gouttelettes de parfum qui apparaissent à la surface ou autour de la mèche après solidification.\n\n" +
         "Causes :\n- Surcharge de parfum (>10% sur une cire à faible rétention)\n- Cire à teneur en huile trop basse (<0.5%) qui ne retient pas\n- Absence de Vybar ou autre polymère de rétention\n- Variations de température lors du refroidissement\n- Parfum avec DPG (insoluble dans la cire → migration)\n\n" +
         "Prévention MFC :\n- Vybar 260 à 2-3% (polymère de rétention)\n- Cire avec teneur en huile 1-3% (ex: Hywax 5203)\n- Respecter les % parfum de la formulation validée\n- Refroidissement lent et régulier\n- JAMAIS de parfum avec DPG (exigence MFC absolue)\n\n" +
         "Distinction suintage vs DPG :\n- Suintage classique = gouttelettes uniformes, odeur du parfum\n- Migration DPG = film huileux, aspect gras, odeur chimique",
         'Expertise MFC', 1,
         'terminologie,suintage,sweating,weeping,DPG,vybar,rétention,v5.20.8'],

        ['terminologie', 'glossaire', 'Glossaire — Wet Spots / Décollement',
         "WET SPOTS (taches humides / décollement verre) :\n\n" +
         "Définition : Zones où la cire se décolle du verre, créant des taches claires/translucides visibles de l'extérieur.\n\n" +
         "Ce n'est PAS un défaut de combustion — c'est purement esthétique. Mais inacceptable pour du luxe.\n\n" +
         "Causes :\n- Retrait différentiel cire/verre lors du refroidissement\n- Verre froid au moment de la coulée\n- Refroidissement trop rapide (courant d'air, climatisation)\n- Cire avec point de congélation trop élevé\n\n" +
         "Prévention MFC :\n- Préchauffer les verres à 40-50°C avant coulée\n- Couler à 55-60°C (pas trop chaud = trop de retrait)\n- Refroidissement lent, couverture si nécessaire\n- Microcristalline (Hywax 2528) à 3-5% = adhérence verre\n- DUB AL 1618 à 10% améliore aussi l'adhérence\n\n" +
         "Récupération :\n- Pistolet thermique sur les zones décollées (avec précaution)\n- Pas toujours durable — le wet spot peut revenir",
         'Expertise MFC', 2,
         'terminologie,wet spots,décollement,verre,adhérence,micro,v5.20.8'],

        // --- FOURNISSEURS PARFUMEURS ---
        ['fournisseur', 'fournisseur', 'Firmenich — Maison de création parfums et arômes',
         "FIRMENICH (depuis 2023 : DSM-FIRMENICH)\n\n" +
         "Siège : Genève, Suisse\n" +
         "Fondation : 1895\n" +
         "CA : ~12 milliards CHF (après fusion DSM 2023)\n" +
         "Effectifs : ~30 000 employés\n\n" +
         "Profil :\n- N°2 mondial parfums et arômes (après IFF)\n- Fusion avec DSM (nutrition/santé) en 2023\n- Division Fine Fragrance + Consumer Fragrance + Ingredients\n- Créateur de nombreux parfums iconiques\n\n" +
         "Pertinence MFC :\n- Fournisseur potentiel de concentrés pour bougies haut de gamme\n- Gamme d'ingrédients captifs (molécules exclusives)\n- Hedione, Iso E Super souvent présents dans leurs compositions\n- FDS disponibles sur demande via portail fournisseur\n\n" +
         "Exigence MFC : toute composition Firmenich doit être vérifiée sans DPG avant intégration.",
         'Recherche MFC', 2,
         'fournisseur,Firmenich,DSM,parfum,Suisse,v5.20.8'],

        ['fournisseur', 'fournisseur', 'IFF — International Flavors & Fragrances',
         "IFF — INTERNATIONAL FLAVORS & FRAGRANCES\n\n" +
         "Siège : New York, USA\n" +
         "Fondation : 1889 (sous le nom Polak & Schwarz)\n" +
         "CA : ~12 milliards USD (après fusion DuPont Nutrition 2021)\n" +
         "Effectifs : ~23 000 employés\n\n" +
         "Profil :\n- N°1 mondial parfums et arômes (depuis fusion DuPont N&B)\n- Coté NYSE : IFF\n- Divisions : Nourish, Health & Biosciences, Scent, Pharma Solutions\n- Acquisition de Frutarom (2018), Lucas Meyer (2012)\n\n" +
         "Pertinence MFC :\n- Leader mondial, fournisseur de grands comptes bougie (Yankee, Bath & Body Works)\n- Très large palette d'ingrédients\n- FDS standardisées et complètes\n- Gamme « Home Care & Air Care » dédiée bougies\n\n" +
         "Exigence MFC : vérifier base solvant (DPG fréquent chez IFF → exiger IPM ou ester).",
         'Recherche MFC', 2,
         'fournisseur,IFF,parfum,New York,USA,DuPont,v5.20.8'],

        ['fournisseur', 'fournisseur', 'Givaudan — Leader création parfums et arômes',
         "GIVAUDAN\n\n" +
         "Siège : Vernier (Genève), Suisse\n" +
         "Fondation : 1895\n" +
         "CA : ~7 milliards CHF\n" +
         "Effectifs : ~16 000 employés\n\n" +
         "Profil :\n- Top 3 mondial parfums et arômes\n- Coté SIX Swiss Exchange\n- Très forte en fine fragrance (parfumerie de luxe)\n- Centre de création majeur à Grasse\n- Acquisitions : Ungerer (2020), DDW (2022), Myrissi (IA olfactive)\n\n" +
         "Pertinence MFC :\n- Excellence en parfumerie fine → idéal pour clients luxe (Rothschild, Ladurée)\n- Programme Home Fragrance dédié\n- Expertise en reformulation pour bougies (volatilité, stabilité thermique)\n- Centre technique Grasse accessible pour MFC\n\n" +
         "Exigence MFC : mêmes critères — pas de DPG, FDS obligatoire, vérification point éclair.",
         'Recherche MFC', 2,
         'fournisseur,Givaudan,parfum,Suisse,Grasse,luxe,v5.20.8'],

        ['fournisseur', 'fournisseur', 'Symrise — Parfums, arômes et ingrédients cosmétiques',
         "SYMRISE\n\n" +
         "Siège : Holzminden, Allemagne\n" +
         "Fondation : 2003 (fusion Haarmann & Reimer + Dragoco)\n" +
         "CA : ~4.7 milliards EUR\n" +
         "Effectifs : ~11 000 employés\n\n" +
         "Profil :\n- Top 4 mondial parfums et arômes\n- Coté MDAX Francfort\n- Divisions : Scent & Care, Nutrition, Aroma Molecules\n- Producteur majeur de vanilline et éthylvanilline\n- Forte en molécules aromatiques (vertical intégré)\n\n" +
         "Pertinence MFC :\n- Gamme « Ambient Scenting » pour bougies et diffuseurs\n- Bonne traçabilité des ingrédients (programme SymSelect)\n- Vanilline et dérivés très utilisés en bougisterie\n- FDS conformes REACh disponibles\n\n" +
         "Exigence MFC : vérifier la base solvant systématiquement.",
         'Recherche MFC', 2,
         'fournisseur,Symrise,parfum,Allemagne,vanilline,v5.20.8'],

        // --- CLIENTS MFC ---
        ['technique', 'client', 'Clients MFC — Positionnement luxe et exigences',
         "POSITIONNEMENT MFC — MAÎTRE CIRIER DEPUIS 1904 :\n\n" +
         "MFC opère exclusivement sur le segment luxe/premium de la bougie parfumée.\n\n" +
         "CLIENTS IDENTIFIÉS :\n- Rothschild — Maison historique, exigence absolue sur la qualité\n- Ladurée — Maison de luxe pâtisserie, bougies d'ambiance\n- Parfums d'Orsay — Maison de parfum historique française\n- Lola James Harper — Créateur de parfums d'ambiance\n\n" +
         "EXIGENCES COMMUNES DU LUXE :\n- Combustion parfaite (4 cycles minimum validés)\n- Aucun défaut visible (pas de wet spots, pas de bulles)\n- Diffusion olfactive puissante et fidèle au brief\n- Reproductibilité lot à lot parfaite\n- Packaging spécifique (verres, étiquettes, coffrets)\n- Traçabilité complète (lot → matières → fournisseurs)\n\n" +
         "EXIGENCES MFC SPÉCIFIQUES :\n- Zéro DPG dans les parfums (non négociable)\n- Colorants liposolubles uniquement (Kaiser Lacke)\n- 3 cycles de test minimum, 4 pour les clients luxe\n- Cure 7-14 jours avant livraison",
         'Expertise MFC', 1,
         'client,luxe,Rothschild,Ladurée,Orsay,Lola James Harper,positionnement,v5.20.8'],

        // --- TECHNIQUE COMPLÉMENTAIRE ---
        ['technique', 'formulation', 'Règle MFC — Ratio parfum / cire selon le type de bougie',
         "RATIOS PARFUM MFC PAR TYPE DE BOUGIE :\n\n" +
         "CONTAINER (verre) :\n- Standard : 8% parfum\n- Fort : 10% parfum\n- Maximum recommandé : 12% (au-delà → suintage)\n- Clients luxe : 8-10% avec cure 14 jours\n\n" +
         "PILIER :\n- Standard : 6-8% parfum\n- Le Vybar 260 compense le % plus bas (piège le parfum)\n- Au-delà de 8% en pilier → risque de migration\n\n" +
         "CHANDELLE (taper) :\n- Maximum : 3-5%\n- La chandelle n'est pas faite pour diffuser\n- Le parfum peut fragiliser la structure\n\n" +
         "CHAUFFE-PLAT / PHOTOPHORE :\n- Standard : 6-8%\n- La cire molle (48-52°C) retient naturellement bien le parfum\n- Temps de combustion court (4-6h) → dosage peut être plus élevé\n\n" +
         "RÈGLE D'OR : mieux vaut 8% parfait que 12% qui suinte. La qualité du parfum compte plus que la quantité.",
         'Expertise MFC', 1,
         'technique,parfum,ratio,pourcentage,container,pilier,chandelle,v5.20.8'],

        ['technique', 'combustion', 'Consommation horaire — Barème MFC par diamètre',
         "CONSOMMATION HORAIRE DE RÉFÉRENCE MFC :\n\n" +
         "Le suivi de la consommation horaire (g/h) est l'indicateur principal de la bonne adéquation mèche/cire.\n\n" +
         "BARÈME PAR DIAMÈTRE (container paraffine, 8% parfum) :\n- Ø 50mm : 3-4 g/h (chauffe-plat, petit container)\n- Ø 60mm : 4-5 g/h\n- Ø 70mm : 5-6 g/h (container standard)\n- Ø 80mm : 6-7 g/h (grand container)\n- Ø 90mm : 7-9 g/h\n- Ø 100mm+ : 9-12 g/h (mèches multiples probable)\n\n" +
         "INTERPRÉTATION :\n- Consommation trop basse = mèche trop fine → tunneling\n- Consommation trop haute = mèche trop grosse → surchauffe, fumée\n- Consommation irrégulière entre cycles = problème de formulation\n\n" +
         "FACTEURS QUI MODIFIENT LA CONSOMMATION :\n- Parfum lourd → consommation plus lente\n- Colorant excessif → obstruction mèche → consommation erratique\n- Microcristalline → ralentit légèrement la consommation\n- Végétale → consommation souvent plus rapide que paraffine",
         'Expertise MFC', 1,
         'technique,consommation,g/h,diamètre,mèche,barème,v5.20.8'],

        ['technique', 'défauts', 'Diagnostic rapide — Les 10 défauts les plus courants',
         "DIAGNOSTIC RAPIDE MFC — TOP 10 DÉFAUTS :\n\n" +
         "1. TUNNELING → Mèche trop fine. Monter d'1 taille.\n" +
         "2. CHAMPIGNONNAGE → Mèche trop grosse OU colorant pigment. Descendre d'1 taille ou changer colorant.\n" +
         "3. SUINTAGE → Trop de parfum OU pas de Vybar. Réduire % ou ajouter Vybar 260 à 2%.\n" +
         "4. WET SPOTS → Verre froid à la coulée. Préchauffer à 40-50°C.\n" +
         "5. FUMÉE NOIRE → Mèche trop grosse OU champignon non coupé. Réduire taille mèche.\n" +
         "6. FLAMME TREMBLANTE → Courant d'air OU mèche décentrée.\n" +
         "7. FISSURES DE SURFACE → Refroidissement trop rapide. Couler plus lentement, couvrir.\n" +
         "8. RETRAIT CENTRAL (cratère) → Normal en pilier. Piquer et recouler.\n" +
         "9. BULLES D'AIR → Cire coulée trop chaude OU mélange trop vigoureux.\n" +
         "10. DÉCOLORATION → Parfum photosensible OU exposition UV. Stocker à l'abri.\n\n" +
         "MÉTHODE : toujours changer UN SEUL paramètre à la fois pour isoler la cause.",
         'Expertise MFC', 1,
         'technique,défauts,diagnostic,tunneling,champignonnage,suintage,wet spots,v5.20.8'],
    ];

    for (const [category, subcategory, title, content, source, priority, tags] of kbEntries) {
        const exists = await db.get('SELECT id FROM knowledge_base WHERE title = ?', [title]);
        if (!exists) {
            await db.run(
                'INSERT INTO knowledge_base (category, subcategory, title, content, source, priority, tags) VALUES (?,?,?,?,?,?,?)',
                [category, subcategory, title, content, source, priority, tags]
            );
        }
    }
    console.log('  ✓ Enrichissement : +' + kbEntries.length + ' fiches KB (sécurité, process, glossaire, fournisseurs, clients)');
}

module.exports = { seedEnrichmentV5208 };
