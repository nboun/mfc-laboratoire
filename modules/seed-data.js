/**
 * MFC Laboratoire - Données initiales
 * Fournisseurs, cires, mèches, colorants
 */

const db = require('./database');

async function seedData() {
    console.log('Insertion des données initiales...');
    
    // Vérifier si déjà initialisé
    const existing = await db.get('SELECT COUNT(*) as count FROM suppliers');
    if (existing && existing.count > 0) {
        console.log('✓ Données déjà présentes');
        return;
    }

    // === FOURNISSEURS ===
    await db.run(`INSERT INTO suppliers (name, country, specialty, website) VALUES 
        ('Hywax', 'Pays-Bas', 'Cires paraffine', 'https://www.hywax.com'),
        ('Stéarinerie Dubois', 'France', 'Cires paraffine et végétales', 'https://www.stearinerie-dubois.com'),
        ('Wedo', 'Allemagne', 'Mèches', 'https://www.wedobraids.com'),
        ('Kaiser Lacke GmbH', 'Allemagne', 'Colorants', 'https://www.kaiser-lacke.de'),
        ('Grasse Fragrance', 'France', 'Compositions parfumées', NULL),
        ('Firmenich', 'Suisse', 'Parfums et arômes', 'https://www.firmenich.com'),
        ('Givaudan', 'Suisse', 'Parfums et arômes', 'https://www.givaudan.com'),
        ('IFF', 'États-Unis', 'Parfums et arômes', 'https://www.iff.com'),
        ('Symrise', 'Allemagne', 'Parfums et arômes', 'https://www.symrise.com'),
        ('Robertet', 'France', 'Matières premières naturelles et parfums', 'https://www.robertet.com'),
        ('SER SpA', 'Italie', 'Cires paraffine (groupe AWAX)', NULL),
        ('Nucera Solutions', 'États-Unis', 'Additifs polymères (Vybar)', NULL),
        ('Charabot', 'France', 'Matières premières naturelles et parfums', 'https://www.charabot.com')
    `);
    console.log('  ✓ Fournisseurs (13 — dont 6 parfumeurs)');

    // === PARFUMS ===
    // Pas de parfums pré-enregistrés — les parfums sont ajoutés manuellement ou via FDS
    console.log('  ✓ Parfums (aucun pré-enregistré — ajout via FDS ou saisie manuelle)');

    // === CIRES HYWAX — Catalogue 2024 (données authentiques) ===
    // Paraffines universelles (fully refined, hydrogenated, snow-white)
    await db.run(`INSERT INTO waxes (supplier_id, reference, name, type, sub_type, category, congealing_point_min, congealing_point_max, oil_content_min, oil_content_max, penetration_min, penetration_max, saybolt_color_min, saybolt_color_max, packaging, application, recommended_use, comments) VALUES 
        (1, 'HYWAX 5203', 'Hywax 5203', 'Paraffine', 'Universelle', 'Paraffine universelle', 52, 54, 0.0, 0.5, 16, 20, 28, 30, 'Liquide, Slabs, Pastilles', 'Universelle', 'Blending, formulation de base', 'Paraffine raffinée hydrogénée blanc neige'),
        (1, 'HYWAX 5403', 'Hywax 5403', 'Paraffine', 'Universelle', 'Paraffine universelle', 54, 56, 0.0, 0.5, 16, 20, 29, 30, 'Liquide, Slabs, Pastilles', 'Universelle', 'Blending, formulation de base', 'Paraffine raffinée hydrogénée blanc neige'),
        (1, 'HYWAX 5601', 'Hywax 5601', 'Paraffine', 'Universelle', 'Paraffine universelle', 56, 58, 0.0, 0.5, 14, 18, 29, 30, 'Liquide', 'Universelle', 'Blending, formulation de base', 'Paraffine raffinée hydrogénée blanc neige'),
        (1, 'HYWAX 5603', 'Hywax 5603', 'Paraffine', 'Universelle', 'Paraffine universelle', 56, 58, 0.0, 0.5, 15, 19, 29, 30, 'Liquide, Slabs, Pastilles', 'Universelle', 'Blending, formulation de base', 'Paraffine raffinée hydrogénée blanc neige'),
        (1, 'HYWAX 5801', 'Hywax 5801', 'Paraffine', 'Universelle', 'Paraffine universelle', 58, 60, 0.0, 0.5, 14, 18, 29, 30, 'Liquide', 'Universelle', 'Blending, formulation de base', 'Paraffine raffinée hydrogénée blanc neige'),
        (1, 'HYWAX 5803', 'Hywax 5803', 'Paraffine', 'Universelle', 'Paraffine universelle', 58, 60, 0.0, 0.5, 15, 19, 29, 30, 'Liquide, Slabs, Pastilles', 'Universelle', 'Blending, formulation de base', 'Paraffine raffinée hydrogénée blanc neige'),
        (1, 'HYWAX 6003', 'Hywax 6003', 'Paraffine', 'Universelle', 'Paraffine universelle', 60, 62, 0.0, 0.5, 16, 22, 29, 30, 'Liquide', 'Universelle', 'Blending, formulation de base', 'Paraffine raffinée hydrogénée blanc neige')
    `);

    // Bougie pilier
    await db.run(`INSERT INTO waxes (supplier_id, reference, name, type, sub_type, category, congealing_point_min, congealing_point_max, oil_content_min, oil_content_max, penetration_min, penetration_max, saybolt_color_min, saybolt_color_max, packaging, application, recommended_use, comments) VALUES 
        (1, 'HYWAX 0155', 'Hywax 0155', 'Paraffine', 'Pilier', 'Bougie pilier', 54, 56, 0.0, 2.0, 21, 26, 28, 30, 'Liquide', 'Pilier', 'Moulage, coulage — Basse viscosité, bon niveau adhésion', NULL),
        (1, 'HYWAX 5480', 'Hywax 5480', 'Paraffine/FT', 'Pilier', 'Bougie pilier', 54, 58, NULL, NULL, 12, 16, 28, 30, 'Liquide, Slabs', 'Pilier', 'Moulage, coulage — Basse viscosité, bon niveau adhésion', 'Contient cire Fischer-Tropsch'),
        (1, 'HYWAX 6243', 'Hywax 6243', 'Paraffine/Stéarique', 'Pilier', 'Bougie pilier', 55, 57, NULL, NULL, 14, 19, 27, 30, 'Pastilles, Poudre', 'Pilier', 'Moulage — Excellente rétraction, pas de résidu moule', 'Contient acide stéarique'),
        (1, 'HYWAX 0716', 'Hywax 0716', 'Paraffine', 'Pilier', 'Bougie pilier', 56, 60, 0.0, 0.8, 14, 20, 29, 30, 'Liquide, Pastilles', 'Pilier', 'Extrusion — Haute plasticité, ne casse ni ne se déforme au fraisage', NULL),
        (1, 'HYWAX 0215', 'Hywax 0215', 'Paraffine/Cire abeille', 'Pilier', 'Bougie pilier', 56, 59, NULL, NULL, 14, 18, 20, 30, 'Pastilles', 'Pilier', 'Extrusion, moulage — Contient cire d''abeille naturelle', 'Contient cire d''abeille naturelle'),
        (1, 'HYWAX 4126', 'Hywax 4126', 'Paraffine', 'Pilier', 'Bougie pilier', 58, 61, 0.0, 0.5, 15, 19, 27, 30, 'Liquide, Pastilles', 'Pilier', 'Extrusion — Haute plasticité, ne casse ni ne se déforme au fraisage', NULL),
        (1, 'HYWAX 4110', 'Hywax 4110', 'Paraffine/FT', 'Pilier', 'Bougie pilier', 60, 62, 0.0, 0.5, 13, 16, 29, 30, 'Liquide, Slabs, Pastilles', 'Pilier', 'Moulage — Excellente rétraction, pas de résidu moule', 'Contient cire Fischer-Tropsch')
    `);

    // Bougie container
    await db.run(`INSERT INTO waxes (supplier_id, reference, name, type, sub_type, category, congealing_point_min, congealing_point_max, oil_content_min, oil_content_max, penetration_min, penetration_max, saybolt_color_min, saybolt_color_max, packaging, application, recommended_use, comments) VALUES 
        (1, 'HYWAX 6213', 'Hywax 6213', 'Paraffine blend', 'Container', 'Bougie container', 45, 49, NULL, NULL, 40, 80, 5, 30, 'Liquide, Slabs', 'Container', 'Container — Standard industrie, all-rounder, forte adhésion paroi, bonne absorption parfum', 'Paraffine raffinée + triglycérides (20% cire végétale). Pas de diffusion huile. Max parfum 7-8%. Coulage 60-65°C'),
        (1, 'HYWAX 6214', 'Hywax 6214', 'Paraffine blend', 'Container', 'Bougie container', 45, 50, NULL, NULL, 40, 80, 5, 30, 'Liquide, Slabs', 'Container', 'Container — Charge parfum élevée, forte adhésion paroi', 'Pourcentage parfum supérieur au 6213. REACH, sans OGM, 100% Vegan'),
        (1, 'HYWAX 6217', 'Hywax 6217', 'Paraffine blend', 'Container', 'Bougie container', 53, 55, NULL, NULL, 22, 28, 5, 30, 'Liquide, Slabs', 'Container', 'Container — Point de congélation plus élevé, meilleure tenue', NULL),
        (1, 'HYWAX 6220', 'Hywax 6220', 'Paraffine blend', 'Container', 'Bougie container', 47, 52, NULL, NULL, 80, 120, 24, 30, 'Liquide, Slabs', 'Container', 'Container — Très haute pénétration, bassin de fusion étendu', NULL)
    `);

    // Bougies chandelles (tapered)
    await db.run(`INSERT INTO waxes (supplier_id, reference, name, type, sub_type, category, congealing_point_min, congealing_point_max, oil_content_min, oil_content_max, penetration_min, penetration_max, saybolt_color_min, saybolt_color_max, packaging, application, recommended_use, comments) VALUES 
        (1, 'HYWAX 5405', 'Hywax 5405', 'Paraffine', 'Chandelle', 'Bougie chandelle', 53, 55, 0.0, 0.75, 20, 25, 29, 30, 'Liquide, Slabs, Pastilles', 'Chandelle', 'Tirage (drawing)', NULL),
        (1, 'HYWAX 5605', 'Hywax 5605', 'Paraffine', 'Chandelle', 'Bougie chandelle', 54, 56, 0.0, 0.75, 20, 24, 29, 30, 'Liquide, Slabs, Pastilles', 'Chandelle', 'Tirage (drawing)', NULL),
        (1, 'HYWAX 5705', 'Hywax 5705', 'Paraffine', 'Chandelle', 'Bougie chandelle', 56, 58, NULL, NULL, 16, 24, 16, 24, 'Liquide, Slabs, Pastilles', 'Chandelle', 'Tirage (drawing)', NULL),
        (1, 'HYWAX 5706', 'Hywax 5706', 'Paraffine/FT', 'Chandelle', 'Bougie chandelle', 56, 58, 0.0, 1.0, 12, 16, 29, 30, 'Liquide, Slabs', 'Chandelle', 'Tirage — Flexible en production, très dur après solidification', 'Contient cire Fischer-Tropsch'),
        (1, 'HYWAX 5805', 'Hywax 5805', 'Paraffine', 'Chandelle', 'Bougie chandelle', 58, 60, 0.0, 0.5, 19, 23, 29, 30, 'Liquide, Slabs, Pastilles', 'Chandelle', 'Tirage (drawing)', NULL),
        (1, 'HYWAX 5880', 'Hywax 5880', 'Paraffine/FT', 'Chandelle', 'Bougie chandelle', 59, 63, 0.0, 0.5, 12, 16, 28, 30, 'Liquide, Pastilles', 'Chandelle', 'Extrusion — Très haute dureté, ne plie pas', 'Contient cire Fischer-Tropsch'),
        (1, 'HYWAX 8461', 'Hywax 8461', 'Paraffine', 'Chandelle', 'Bougie chandelle', 57, 60, 0.0, 0.75, 13, 17, 29, 30, 'Pastilles', 'Chandelle', 'Trempage (dipping) — Idéal bougies artisanales', NULL)
    `);

    // Photophores / Gravelights
    await db.run(`INSERT INTO waxes (supplier_id, reference, name, type, sub_type, category, congealing_point_min, congealing_point_max, oil_content_min, oil_content_max, penetration_min, penetration_max, saybolt_color_min, saybolt_color_max, packaging, application, recommended_use, comments) VALUES 
        (1, 'HYWAX 0951', 'Hywax 0951', 'Paraffine', 'Photophore / Chauffe-plat', 'Photophore / Gravelight / Chauffe-plat', 48, 52, 0.0, 5.0, 30, 50, 28, 30, 'Liquide, Slabs', 'Photophore, Chauffe-plat', 'Photophores et chauffe-plats — Bas point de congélation', NULL),
        (1, 'HYWAX 0995', 'Hywax 0995', 'Paraffine', 'Photophore / Chauffe-plat', 'Photophore / Gravelight / Chauffe-plat', 51, 54, 0.0, 3.5, 25, 42, 28, 30, 'Liquide', 'Photophore, Chauffe-plat', 'Photophores et chauffe-plats — Moulage ou coulage', NULL),
        (1, 'HYWAX 5325', 'Hywax 5325', 'Paraffine', 'Photophore', 'Photophore / Gravelight', 52, 54, 1.0, 5.0, 40, 60, 25, 30, 'Liquide, Slabs', 'Photophore', 'Photophores — Coulage et blending', NULL)
    `);

    // Chauffe-plats / Tealights
    await db.run(`INSERT INTO waxes (supplier_id, reference, name, type, sub_type, category, congealing_point_min, congealing_point_max, oil_content_min, oil_content_max, penetration_min, penetration_max, saybolt_color_min, saybolt_color_max, packaging, application, recommended_use, comments) VALUES 
        (1, 'HYWAX 0990', 'Hywax 0990', 'Paraffine', 'Chauffe-plat', 'Chauffe-plat', 52, 55, 0.0, 2.0, 22, 30, 28, 30, 'Liquide', 'Chauffe-plat', 'Chauffe-plats, votives, maxi-lights — Moulage et coulage', NULL),
        (1, 'HYWAX 5251', 'Hywax 5251', 'Paraffine blend', 'Chauffe-plat', 'Chauffe-plat', 52, 56, NULL, NULL, 25, 50, 24, 30, 'Liquide', 'Chauffe-plat', 'Chauffe-plats colorés et parfumés — Bonne absorption parfum, blanc neige', NULL)
    `);

    // Cire pour mèche
    await db.run(`INSERT INTO waxes (supplier_id, reference, name, type, sub_type, category, congealing_point_min, congealing_point_max, oil_content_min, oil_content_max, penetration_min, penetration_max, saybolt_color_min, saybolt_color_max, packaging, application, recommended_use, comments) VALUES 
        (1, 'HYWAX 6305', 'Hywax 6305', 'Paraffine', 'Cire mèche', 'Cire pour mèche', 65, 69, NULL, NULL, 18, 22, 24, 30, 'Pastilles', 'Cire mèche', 'Cirage de mèche — Flexible à basse température, haute cadence', 'Flexible'),
        (1, 'HYWAX 8204', 'Hywax 8204', 'Paraffine', 'Cire mèche', 'Cire pour mèche', 66, 70, NULL, NULL, 10, 14, 24, 30, 'Slabs', 'Cire mèche', 'Cirage de mèche — Dur, mèche reste droite dans bain de fusion', 'Dur'),
        (1, 'HYWAX 6301', 'Hywax 6301', 'Paraffine', 'Cire mèche', 'Cire pour mèche', 68, 70, NULL, NULL, 14, 18, 24, 30, 'Slabs, Pastilles', 'Cire mèche', 'Cirage de mèche — Universel', 'Universel')
    `);

    // Finish / Trempage décoratif
    await db.run(`INSERT INTO waxes (supplier_id, reference, name, type, sub_type, category, congealing_point_min, congealing_point_max, oil_content_min, oil_content_max, penetration_min, penetration_max, saybolt_color_min, saybolt_color_max, packaging, application, recommended_use, comments) VALUES 
        (1, 'HYWAX KTM 40', 'Hywax KTM 40', 'Paraffine', 'Finish', 'Finish / Trempage', 55, 58, NULL, NULL, 12, 17, 28, 30, 'Liquide, Pastilles', 'Finish', 'Masse de trempage (KTM) — Surface brillante ou mate, distribution homogène pigments', NULL),
        (1, 'HYWAX KTM 23', 'Hywax KTM 23', 'Paraffine', 'Finish', 'Finish / Trempage', 61, 63, NULL, NULL, 12, 16, 28, 30, 'Liquide, Slabs', 'Finish', 'Masse de trempage (KTM) — Surface brillante ou mate, haute stabilité thermique', NULL),
        (1, 'HYWAX 3977', 'Hywax 3977', 'Micro/Paraffine', 'Finish', 'Finish / Trempage', 69, 72, NULL, NULL, 14, 18, 20, 30, 'Slabs, Pastilles', 'Finish', 'Blend micro + paraffine — Très flexible, idéal art ornemental et relief', 'Pas de conformité RAL')
    `);

    // Additifs
    await db.run(`INSERT INTO waxes (supplier_id, reference, name, type, sub_type, category, congealing_point_min, congealing_point_max, oil_content_min, oil_content_max, penetration_min, penetration_max, saybolt_color_min, saybolt_color_max, packaging, application, recommended_use, comments) VALUES 
        (1, 'VARAPLUS 06', 'Varaplus 06', 'Additif', 'Démoulant', 'Additif', 59, 61, NULL, NULL, 1, 6, 2, 30, 'Pastilles', 'Additif', 'Additif 1-5% — Facilite démoulage, surface plus brillante et ferme', NULL),
        (1, 'HYWAX 7837', 'Hywax 7837', 'Microcristalline', 'Dureté', 'Additif', 70, 80, 0.0, 2.5, 25, 30, 20, 30, 'Liquide, Slabs', 'Additif', 'Additif — Modifie dureté, ajoute flexibilité ou transparence', 'Pas de conformité RAL'),
        (1, 'HYWAX 7881', 'Hywax 7881', 'Microcristalline', 'Flexibilité', 'Additif', 80, 90, NULL, NULL, 20, 40, 24, 30, 'Liquide, Slabs', 'Additif', 'Additif — Modifie dureté, ajoute flexibilité ou transparence', NULL),
        (1, 'HYWAX 2528', 'Hywax 2528', 'Microcristalline', 'Adhérence', 'Additif', 62, 68, NULL, NULL, 20, 30, NULL, NULL, 'Slabs, Pastilles', 'Container', 'Microcristalline adhérence verre — 5-10% dans blend container', 'Petits cailloux — comble les espaces, améliore finition')
    `);
    console.log('  ✓ Cires Hywax (38 références — Catalogue 2024)');

    // === MATIÈRES COMPLÉMENTAIRES (SER, Nucera, Stéarinerie Dubois) ===
    // Paraffine pilier SER
    await db.run(`INSERT INTO waxes (supplier_id, reference, name, type, sub_type, category, congealing_point_min, congealing_point_max, oil_content_min, oil_content_max, penetration_min, penetration_max, saybolt_color_min, saybolt_color_max, packaging, application, recommended_use, comments) VALUES 
        (11, 'SER 6670', 'Paraffine 6670', 'Paraffine', 'Pilier', 'Paraffine haute fusion', 58, 62, NULL, NULL, NULL, NULL, NULL, NULL, 'Pastilles', 'Pilier', 'Base structurelle pilier — haute fusion, rigidité', 'SER SpA (groupe AWAX, Italie). Grade spécialisé pilier.')
    `);

    // Vybar 260 — polymère rétention parfum
    await db.run(`INSERT INTO waxes (supplier_id, reference, name, type, sub_type, category, congealing_point_min, congealing_point_max, oil_content_min, oil_content_max, penetration_min, penetration_max, saybolt_color_min, saybolt_color_max, packaging, application, recommended_use, comments) VALUES 
        (12, 'VYBAR 260', 'Vybar 260', 'Additif', 'Polymère', 'Additif', 52, 56, NULL, NULL, NULL, NULL, NULL, NULL, 'Granulés', 'Pilier/Container', 'Rétention parfum 1-3% — Anti-mottling, opacifiant, durcisseur', 'Polyalphaoléfine hyper-branchée. >3% = parfum emprisonné.')
    `);

    // DUB AL 1618 — alcool céto-stéarylique
    await db.run(`INSERT INTO waxes (supplier_id, reference, name, type, sub_type, category, congealing_point_min, congealing_point_max, oil_content_min, oil_content_max, penetration_min, penetration_max, saybolt_color_min, saybolt_color_max, packaging, application, recommended_use, comments) VALUES 
        (2, 'DUB AL 1618', 'DUB AL 1618 50/50', 'Additif', 'Alcool gras', 'Additif', 49, 55, NULL, NULL, NULL, NULL, NULL, NULL, 'Pastilles', 'Universel', 'Anti-défauts 5-10% — Anti-polymorphisme, réduction viscosité, dispersion parfum', 'Mélange 50/50 alcool cétylique C16 + stéarylique C18. INCI: Cetearyl Alcohol.')
    `);

    // Alcool cétylique pur
    await db.run(`INSERT INTO waxes (supplier_id, reference, name, type, sub_type, category, congealing_point_min, congealing_point_max, oil_content_min, oil_content_max, penetration_min, penetration_max, saybolt_color_min, saybolt_color_max, packaging, application, recommended_use, comments) VALUES 
        (2, 'CETYLIQUE', 'Alcool cétylique', 'Additif', 'Alcool gras', 'Additif', 49, 50, NULL, NULL, NULL, NULL, NULL, NULL, 'Pastilles', 'Container', 'Combustion parfums difficiles 5-10% — Opacité + diffusion améliorée', 'CAS 36653-82-4. 1-Hexadécanol C16. Triple fonction: combustion + opacité + diffusion.')
    `);

    // DUB RAPESEED 1618 — cire colza/tournesol
    await db.run(`INSERT INTO waxes (supplier_id, reference, name, type, sub_type, category, congealing_point_min, congealing_point_max, oil_content_min, oil_content_max, penetration_min, penetration_max, saybolt_color_min, saybolt_color_max, packaging, application, recommended_use, comments) VALUES 
        (2, 'DUB RAPESEED 1618', 'DUB Rapeseed 1618', 'Végétale', 'Container', 'Végétale', 50, 54, NULL, NULL, NULL, NULL, NULL, NULL, 'Pastilles', 'Container', 'Container végétal — Base colza/tournesol, naturelle', 'Ne pas confondre avec DUB AL 1618 (alcool gras)')
    `);
    console.log('  ✓ Matières complémentaires (SER 6670, Vybar 260, DUB AL 1618, Alcool cétylique, DUB Rapeseed)');

    // === CIRES STÉARINERIE DUBOIS ===
    await db.run(`INSERT INTO waxes (supplier_id, reference, name, type, sub_type, category, congealing_point_min, congealing_point_max, oil_content_min, oil_content_max, penetration_min, penetration_max, saybolt_color_min, saybolt_color_max, packaging, application, recommended_use, comments) VALUES 
        (2, 'SD-P52', 'Paraffine 52', 'Paraffine', 'Container', 'Paraffine', 52, 53, 0.0, 0.5, 18, 24, 28, 30, 'Slabs, Pastilles', 'Container', 'Container — Bas point de fusion, bonne absorption parfum', 'Paraffine raffinée hydrogénée, certifiée RAL'),
        (2, 'SD-P54', 'Paraffine 54', 'Paraffine', 'Polyvalente', 'Paraffine', 54, 55, 0.0, 0.5, 16, 22, 28, 30, 'Slabs, Pastilles', 'Polyvalente', 'Polyvalente — Usage container et pilier', 'Paraffine raffinée hydrogénée, certifiée RAL'),
        (2, 'SD-P56', 'Paraffine 56', 'Paraffine', 'Mixte', 'Paraffine', 56, 57, 0.0, 0.5, 14, 20, 29, 30, 'Slabs, Pastilles', 'Container/Pilier', 'Container et pilier — Bonne polyvalence', 'Paraffine raffinée hydrogénée, certifiée RAL'),
        (2, 'SD-P58', 'Paraffine 58', 'Paraffine', 'Pilier', 'Paraffine', 58, 59, 0.0, 0.5, 14, 18, 29, 30, 'Slabs, Pastilles', 'Pilier', 'Pilier — Bonne dureté, moulage', 'Paraffine raffinée hydrogénée, certifiée RAL'),
        (2, 'SD-P60', 'Paraffine 60', 'Paraffine', 'Pilier', 'Paraffine', 60, 61, 0.0, 0.5, 12, 16, 29, 30, 'Slabs, Pastilles', 'Pilier', 'Pilier — Haute dureté, extrusion', 'Paraffine raffinée hydrogénée, certifiée RAL'),
        (2, 'SD-P62', 'Paraffine 62', 'Paraffine', 'Pilier', 'Paraffine', 62, 63, 0.0, 0.5, 10, 14, 29, 30, 'Slabs, Pastilles', 'Pilier', 'Pilier — Très haute dureté, chandelle', 'Paraffine raffinée hydrogénée, certifiée RAL'),
        (2, 'SD-VS100', 'Végétale Soja 100%', 'Végétale', 'Container', 'Végétale', 48, 50, NULL, NULL, 20, 35, NULL, NULL, 'Flocons', 'Container', 'Container — 100% soja, bonne adhérence verre, naturelle', 'Soja hydrogéné, sans OGM'),
        (2, 'SD-VC100', 'Végétale Colza 100%', 'Végétale', 'Container', 'Végétale', 52, 54, NULL, NULL, 15, 25, NULL, NULL, 'Pastilles', 'Container', 'Container — 100% colza, dure, bon diffusion à chaud', 'Colza hydrogéné, origine européenne'),
        (2, 'SD-VCC', 'Végétale Coco', 'Végétale', 'Massage', 'Végétale', 24, 26, NULL, NULL, NULL, NULL, NULL, NULL, 'Pastilles', 'Massage', 'Bougie de massage — Très bas point de fusion, fond sur la peau', 'Coco hydrogéné, contact peau sûr'),
        (2, 'SD-VMIX', 'Végétale Mix', 'Végétale', 'Container', 'Végétale', 50, 52, NULL, NULL, 18, 30, NULL, NULL, 'Pastilles', 'Container', 'Container — Blend végétal soja/colza, bon compromis', 'Blend végétal multi-sources')
    `);
    console.log('  ✓ Cires Stéarinerie Dubois');

    // === MÈCHES WEDOO ===
    // Série LX
    await db.run(`INSERT INTO wicks (supplier_id, reference, series, type, core, diameter_min, diameter_max, wax_type, application, manufacturer_notes) VALUES 
        (3, 'LX 8', 'LX', 'Coton tressé', 'Sans', 35, 45, 'Paraffine', 'Container verre', 'Petit diamètre, flamme stable'),
        (3, 'LX 10', 'LX', 'Coton tressé', 'Sans', 40, 50, 'Paraffine', 'Container verre', 'Usage polyvalent'),
        (3, 'LX 12', 'LX', 'Coton tressé', 'Sans', 45, 55, 'Paraffine', 'Container verre', 'Usage polyvalent'),
        (3, 'LX 14', 'LX', 'Coton tressé', 'Sans', 50, 60, 'Paraffine', 'Container verre', 'Diamètre moyen'),
        (3, 'LX 16', 'LX', 'Coton tressé', 'Sans', 55, 65, 'Paraffine', 'Container verre', 'Diamètre moyen'),
        (3, 'LX 18', 'LX', 'Coton tressé', 'Sans', 60, 70, 'Paraffine', 'Container verre', 'Grand diamètre'),
        (3, 'LX 20', 'LX', 'Coton tressé', 'Sans', 65, 75, 'Paraffine', 'Container verre', 'Grand diamètre'),
        (3, 'LX 22', 'LX', 'Coton tressé', 'Sans', 70, 80, 'Paraffine', 'Container verre', 'Très grand diamètre'),
        (3, 'LX 24', 'LX', 'Coton tressé', 'Sans', 75, 85, 'Paraffine', 'Container verre', 'Très grand diamètre'),
        (3, 'LX 26', 'LX', 'Coton tressé', 'Sans', 80, 90, 'Paraffine', 'Container verre', 'Extra large')
    `);
    
    // Série ECO
    await db.run(`INSERT INTO wicks (supplier_id, reference, series, type, core, diameter_min, diameter_max, wax_type, application, manufacturer_notes) VALUES 
        (3, 'ECO 1', 'ECO', 'Coton', 'Papier', 35, 45, 'Végétale', 'Container', 'Écologique, cire végétale'),
        (3, 'ECO 2', 'ECO', 'Coton', 'Papier', 40, 50, 'Végétale', 'Container', 'Écologique, cire végétale'),
        (3, 'ECO 4', 'ECO', 'Coton', 'Papier', 45, 55, 'Végétale', 'Container', 'Écologique, cire végétale'),
        (3, 'ECO 6', 'ECO', 'Coton', 'Papier', 50, 60, 'Végétale', 'Container', 'Écologique, cire végétale'),
        (3, 'ECO 8', 'ECO', 'Coton', 'Papier', 55, 65, 'Végétale', 'Container', 'Écologique, cire végétale'),
        (3, 'ECO 10', 'ECO', 'Coton', 'Papier', 60, 70, 'Végétale', 'Container', 'Écologique, cire végétale'),
        (3, 'ECO 12', 'ECO', 'Coton', 'Papier', 65, 75, 'Végétale', 'Container', 'Écologique, cire végétale'),
        (3, 'ECO 14', 'ECO', 'Coton', 'Papier', 70, 80, 'Végétale', 'Container', 'Écologique, cire végétale'),
        (3, 'ECO 16', 'ECO', 'Coton', 'Papier', 75, 85, 'Végétale', 'Container', 'Écologique, cire végétale')
    `);
    
    // Série CD
    await db.run(`INSERT INTO wicks (supplier_id, reference, series, type, core, diameter_min, diameter_max, wax_type, application, manufacturer_notes) VALUES 
        (3, 'CD 3', 'CD', 'Coton plat', 'Sans', 30, 40, 'Mixte', 'Container', 'Tressage plat, polyvalent'),
        (3, 'CD 5', 'CD', 'Coton plat', 'Sans', 35, 45, 'Mixte', 'Container', 'Tressage plat, polyvalent'),
        (3, 'CD 6', 'CD', 'Coton plat', 'Sans', 40, 50, 'Mixte', 'Container', 'Tressage plat, polyvalent'),
        (3, 'CD 8', 'CD', 'Coton plat', 'Sans', 45, 55, 'Mixte', 'Container', 'Tressage plat, polyvalent'),
        (3, 'CD 10', 'CD', 'Coton plat', 'Sans', 50, 60, 'Mixte', 'Container', 'Tressage plat, polyvalent'),
        (3, 'CD 12', 'CD', 'Coton plat', 'Sans', 55, 65, 'Mixte', 'Container', 'Tressage plat, polyvalent'),
        (3, 'CD 14', 'CD', 'Coton plat', 'Sans', 60, 70, 'Mixte', 'Container', 'Tressage plat, polyvalent'),
        (3, 'CD 18', 'CD', 'Coton plat', 'Sans', 70, 80, 'Mixte', 'Container', 'Tressage plat, polyvalent'),
        (3, 'CD 22', 'CD', 'Coton plat', 'Sans', 80, 90, 'Mixte', 'Container', 'Tressage plat, polyvalent')
    `);
    
    // Série HTP
    await db.run(`INSERT INTO wicks (supplier_id, reference, series, type, core, diameter_min, diameter_max, wax_type, application, manufacturer_notes) VALUES 
        (3, 'HTP 31', 'HTP', 'Coton', 'Papier', 30, 40, 'Paraffine', 'Container', 'Haute performance'),
        (3, 'HTP 41', 'HTP', 'Coton', 'Papier', 35, 45, 'Paraffine', 'Container', 'Haute performance'),
        (3, 'HTP 52', 'HTP', 'Coton', 'Papier', 40, 50, 'Paraffine', 'Container', 'Haute performance'),
        (3, 'HTP 62', 'HTP', 'Coton', 'Papier', 45, 55, 'Paraffine', 'Container', 'Haute performance'),
        (3, 'HTP 73', 'HTP', 'Coton', 'Papier', 50, 60, 'Paraffine', 'Container', 'Haute performance'),
        (3, 'HTP 83', 'HTP', 'Coton', 'Papier', 55, 65, 'Paraffine', 'Container', 'Haute performance'),
        (3, 'HTP 93', 'HTP', 'Coton', 'Papier', 60, 70, 'Paraffine', 'Container', 'Haute performance'),
        (3, 'HTP 104', 'HTP', 'Coton', 'Papier', 65, 75, 'Paraffine', 'Container', 'Haute performance'),
        (3, 'HTP 115', 'HTP', 'Coton', 'Papier', 70, 80, 'Paraffine', 'Container', 'Haute performance'),
        (3, 'HTP 126', 'HTP', 'Coton', 'Papier', 80, 90, 'Paraffine', 'Container', 'Haute performance')
    `);
    
    // Série TCR
    await db.run(`INSERT INTO wicks (supplier_id, reference, series, type, core, diameter_min, diameter_max, wax_type, application, manufacturer_notes) VALUES 
        (3, 'TCR 18/10', 'TCR', 'Coton', 'Papier', 30, 40, 'Paraffine', 'Container/Pilier', 'Bonne rigidité'),
        (3, 'TCR 20/12', 'TCR', 'Coton', 'Papier', 35, 45, 'Paraffine', 'Container/Pilier', 'Bonne rigidité'),
        (3, 'TCR 22/14', 'TCR', 'Coton', 'Papier', 40, 50, 'Paraffine', 'Container/Pilier', 'Bonne rigidité'),
        (3, 'TCR 24/16', 'TCR', 'Coton', 'Papier', 45, 55, 'Paraffine', 'Container/Pilier', 'Bonne rigidité'),
        (3, 'TCR 26/18', 'TCR', 'Coton', 'Papier', 50, 60, 'Paraffine', 'Container/Pilier', 'Bonne rigidité'),
        (3, 'TCR 28/18', 'TCR', 'Coton', 'Papier', 55, 65, 'Paraffine', 'Container/Pilier', 'Bonne rigidité'),
        (3, 'TCR 30/20', 'TCR', 'Coton', 'Papier', 60, 70, 'Paraffine', 'Container/Pilier', 'Bonne rigidité'),
        (3, 'TCR 32/20', 'TCR', 'Coton', 'Papier', 65, 75, 'Paraffine', 'Container/Pilier', 'Bonne rigidité'),
        (3, 'TCR 34/22', 'TCR', 'Coton', 'Papier', 70, 80, 'Paraffine', 'Container/Pilier', 'Bonne rigidité'),
        (3, 'TCR 36/22', 'TCR', 'Coton', 'Papier', 80, 90, 'Paraffine', 'Container/Pilier', 'Bonne rigidité')
    `);
    console.log('  ✓ Mèches Wedo (48 références)');

    // === COLORANTS KAISER LACKE ===
    // Série liquiDYE (Liquides)
    await db.run(`INSERT INTO colorants (supplier_id, reference, name, short_name, form, series, color_hex, color_rgb_r, color_rgb_g, color_rgb_b, density, viscosity, flash_point, hazard_h315, hazard_h319) VALUES 
        (4, '2620280', 'liquiDYE 280 pink', 'Rose', 'Liquide', 'liquiDYE', '#FF69B4', 255, 105, 180, 1.02, 300, 88, 0, 0),
        (4, '2620330', 'liquiDYE 330 green', 'Vert', 'Liquide', 'liquiDYE', '#228B22', 34, 139, 34, 0.99, 1400, 88, 0, 0),
        (4, '2620340', 'liquiDYE 340 black', 'Noir', 'Liquide', 'liquiDYE', '#1A1A1A', 26, 26, 26, 0.96, NULL, 88, 0, 0),
        (4, '2620390', 'liquiDYE 390 orange', 'Orange', 'Liquide', 'liquiDYE', '#FF8C00', 255, 140, 0, 0.97, 1000, 88, 1, 1),
        (4, '2620410', 'liquiDYE 410 bordeaux', 'Bordeaux', 'Liquide', 'liquiDYE', '#800020', 128, 0, 32, 0.93, 300, 88, 0, 0)
    `);
    
    // Série KWC DYE (Granulés)
    await db.run(`INSERT INTO colorants (supplier_id, reference, name, short_name, form, series, color_hex, color_rgb_r, color_rgb_g, color_rgb_b, density, congealing_point, flash_point, hazard_h317) VALUES 
        (4, '2705365', 'KWC DYE black', 'Noir (granulé)', 'Granulé', 'KWC DYE', '#1A1A1A', 26, 26, 26, 1.02, 62, 140, 1),
        (4, '2803240', 'KWC DYE 240 orange', 'Orange (granulé)', 'Granulé', 'KWC DYE', '#FF8C00', 255, 140, 0, 0.96, NULL, 150, 0),
        (4, '2803280', 'KWC DYE 280 pink', 'Rose (granulé)', 'Granulé', 'KWC DYE', '#FF69B4', 255, 105, 180, 0.97, NULL, 150, 0),
        (4, '2803290', 'KWC DYE 290 violet', 'Violet', 'Granulé', 'KWC DYE', '#8A2BE2', 138, 43, 226, 0.96, NULL, 150, 0),
        (4, '2803300', 'KWC DYE 300 blue', 'Bleu foncé', 'Granulé', 'KWC DYE', '#00008B', 0, 0, 139, 0.96, NULL, 150, 0)
    `);
    console.log('  ✓ Colorants Kaiser Lacke (10 références)');

    // === BASE DE CONNAISSANCES ===
    await db.run(`INSERT INTO knowledge_base (category, subcategory, title, content, source, priority) VALUES 
        ('technique', 'cire', 'Dosage parfum', 'Le parfum est exprimé en pourcentage de la masse totale. Exemple: 200g total avec 10% parfum = 20g parfum + 180g cire.', 'MFC', 1),
        ('technique', 'colorant', 'Dosage colorant', 'Le colorant est dosé en grammes, entre 0.20% et 0.25% maximum de la masse de cire. Ne pas dépasser 0.25% pour éviter les problèmes de combustion.', 'MFC', 1),
        ('technique', 'mèche', 'Sélection mèche', 'Le diamètre de la bougie détermine la taille de la mèche. Toujours tester plusieurs tailles pour trouver l optimal.', 'MFC', 1),
        ('technique', 'test', 'Protocole de test', 'Effectuer des cycles de 4 heures avec mesures avant/après. Minimum 3 cycles recommandés pour une évaluation complète.', 'MFC', 1),
        ('terminologie', 'français', 'Bassin de fusion', 'Diamètre de la zone de cire liquide pendant la combustion. En anglais: pool diameter.', 'MFC', 2),
        ('terminologie', 'français', 'Champignonnage', 'Formation d un amas noir en forme de champignon au bout de la mèche. En anglais: mushrooming.', 'MFC', 2),
        ('terminologie', 'français', 'Effet tunnel', 'Phénomène où la bougie brûle en formant un tunnel, laissant de la cire non consumée sur les bords. En anglais: tunneling.', 'MFC', 2),
        ('terminologie', 'français', 'Diffusion', 'Capacité du parfum à se diffuser dans l espace. Diffusion à chaud (à chaud) et diffusion à froid (à froid).', 'MFC', 2)
    `);
    console.log('  ✓ Base de connaissances');

    // === RECETTES VALIDÉES — Import fiches production ===
    const existingRecipes = await db.get("SELECT COUNT(*) as c FROM knowledge_base WHERE tags LIKE '%recette,chandelle,paraffine,5603%'");
    if (!existingRecipes || existingRecipes.c === 0) {
        await db.run(`INSERT INTO knowledge_base (category, subcategory, title, content, source, priority, tags) VALUES 
            ('Recettes MFC', 'chandelle', '✅ Chandelle classique — Paraffine 5603 / Dub 1618 / Vybar 260',
             'RECETTE CHANDELLE VALIDÉE\n\nCode article : ART4428\nLot : GP4491\nDate : 23/06/2025\n\n🕯️ Type : Chandelle (non parfumée)\n⚖️ Masse totale : 130 000 g (lot production)\n\n🧪 Composition cires :\n  • Paraffine réf. 5603 — 92%\n  • Dub (microcristalline) réf. 1618 — 6%\n  • Vybar réf. 260 — 2%\n  Total : 100%\n\n🎨 Colorant :\n  • Bekro réf. 15081 — 0.2% (260 g pour 130 kg)\n\n🧵 Mèche : 3x6 (tressée 3 fils)\n\n🌸 Parfum : 0% (chandelle non parfumée)\n\n📝 Notes :\n  Formule de production validée MFC.\n  Paraffine 5603 = base structurelle.\n  Dub 1618 = microcristalline pour tenue et souplesse.\n  Vybar 260 = polymère pour opacité et rigidité.\n  Colorant Bekro 15081 à 0.2% du poids total.\n  Ratio éprouvé pour chandelles classiques.',
             'Fiche production MFC — ART4428 / GP4491', 2,
             'recette,chandelle,paraffine,5603,dub,1618,vybar,260,bekro,15081,mèche 3x6,validé'),
            ('Recettes MFC', 'pilier', '✅ Pilier cylindrique parfumée — Paraffine 6670 / Dub 1618 / Vybar 260 — Parfum 10%',
             'RECETTE PILIER CYLINDRIQUE PARFUMÉE VALIDÉE\n\nDate : 03/02/2026\n\n🕯️ Type : Pilier cylindrique\n⚖️ Masse totale : 8 000 g\n\n🌸 Parfum : Louboutin — 10% (800 g)\n\n🧪 Composition cires (90% restant) :\n  • Paraffine réf. 6670 — 77%\n  • Dub (microcristalline) réf. 1618 — 10%\n  • Vybar réf. 260 — 3%\n  Total cires : 90%\n  Total parfum : 10%\n  Total général : 100%\n\n🎨 Colorant :\n  • Bekro réf. 15081 — 0.2% (16 g)\n\n🧵 Mèche : 3X10 — 600 gr + LX22\n\n📝 Notes :\n  Formule validée MFC pour pilier parfumée.\n  Paraffine 6670 = base structurelle pilier.\n  Dub 1618 = microcristalline 10% pour rigidité et tenue au parfum.\n  Vybar 260 = 3% polymère pour opacité.\n  Ratio cire/parfum éprouvé : 90/10.\n  Mèche 3X10 adaptée au diamètre cylindrique avec renfort LX22.\n  Colorant Bekro 15081 à 0.2%.',
             'Fiche production MFC — Pilier cylindrique Louboutin', 2,
             'recette,pilier,cylindrique,paraffine,6670,dub,1618,vybar,260,bekro,15081,parfum,10%,louboutin,mèche 3X10,LX22,validé')
        `);
        console.log('  ✓ Session 23 : 2 recettes validées (chandelle + pilier cylindrique)');
    } else {
        console.log('  ✓ Session 23 : recettes production déjà présentes');
    }

    console.log('✓ Toutes les données initiales insérées');
}

module.exports = { seedData };
