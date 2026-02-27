/**
 * fix-flash-points-cleanup.js — v5.44.14
 * Nettoie les flash points aberrants dans fragrance_components et fragrances
 * 
 * Critères d'aberration :
 *   - FP > 300°C (aucune molécule de parfumerie ne dépasse ~250°C)
 *   - FP < 0°C (pas réaliste pour des composants liquides/solides)
 *   - FP = valeur type "année" (1900-2099)
 * 
 * Puis recalcule fragrances.flash_point = MIN(composants valides)
 */

const sqlite3 = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'mfc.db');
const db = sqlite3(dbPath);

console.log('═══════════════════════════════════════');
console.log('  Nettoyage flash points aberrants');
console.log('═══════════════════════════════════════\n');

// 1. Diagnostic : trouver les valeurs aberrantes
const aberrants = db.prepare(`
    SELECT fc.id, fc.fragrance_id, fc.cas_number, fc.name, fc.flash_point,
           f.name as fragrance_name
    FROM fragrance_components fc
    LEFT JOIN fragrances f ON f.id = fc.fragrance_id
    WHERE fc.flash_point IS NOT NULL 
      AND (fc.flash_point > 300 OR fc.flash_point < -20 OR (fc.flash_point >= 1900 AND fc.flash_point <= 2099))
    ORDER BY fc.flash_point DESC
`).all();

if (aberrants.length === 0) {
    console.log('✅ Aucun flash point aberrant trouvé.\n');
} else {
    console.log(`⚠️  ${aberrants.length} composant(s) avec flash point aberrant :\n`);
    for (const a of aberrants) {
        console.log(`  [${a.id}] ${a.name || '?'} (CAS ${a.cas_number || '?'}) → FP ${a.flash_point}°C  (parfum: ${a.fragrance_name})`);
    }

    // 2. Corriger : mettre à NULL les FP aberrants
    const fix = db.prepare(`
        UPDATE fragrance_components 
        SET flash_point = NULL 
        WHERE flash_point IS NOT NULL 
          AND (flash_point > 300 OR flash_point < -20 OR (flash_point >= 1900 AND flash_point <= 2099))
    `);
    const result = fix.run();
    console.log(`\n✅ ${result.changes} flash point(s) aberrant(s) mis à NULL`);
}

// 3. Même chose pour la table fragrances
const aberrantFrags = db.prepare(`
    SELECT id, name, flash_point 
    FROM fragrances 
    WHERE flash_point IS NOT NULL 
      AND (flash_point > 300 OR flash_point < -20 OR (flash_point >= 1900 AND flash_point <= 2099))
    ORDER BY flash_point DESC
`).all();

if (aberrantFrags.length > 0) {
    console.log(`\n⚠️  ${aberrantFrags.length} parfum(s) avec flash point global aberrant :`);
    for (const f of aberrantFrags) {
        console.log(`  [${f.id}] ${f.name} → FP ${f.flash_point}°C`);
    }
    const fixF = db.prepare(`
        UPDATE fragrances 
        SET flash_point = NULL 
        WHERE flash_point IS NOT NULL 
          AND (flash_point > 300 OR flash_point < -20 OR (flash_point >= 1900 AND flash_point <= 2099))
    `);
    const resF = fixF.run();
    console.log(`✅ ${resF.changes} parfum(s) corrigé(s)`);
}

// 4. Recalculer fragrances.flash_point = MIN des composants valides
const recalc = db.prepare(`
    SELECT fc.fragrance_id, MIN(fc.flash_point) as min_fp
    FROM fragrance_components fc
    WHERE fc.flash_point IS NOT NULL AND fc.flash_point > 0 AND fc.flash_point <= 300
    GROUP BY fc.fragrance_id
`).all();

let updated = 0;
const updateFP = db.prepare('UPDATE fragrances SET flash_point = ? WHERE id = ?');
for (const r of recalc) {
    updateFP.run(r.min_fp, r.fragrance_id);
    updated++;
}
console.log(`\n✅ ${updated} parfum(s) : flash_point recalculé depuis composants valides`);

// 5. Stats finales
const totalComps = db.prepare('SELECT COUNT(*) as n FROM fragrance_components').get().n;
const withFP = db.prepare('SELECT COUNT(*) as n FROM fragrance_components WHERE flash_point IS NOT NULL AND flash_point > 0 AND flash_point <= 300').get().n;
const nullFP = db.prepare('SELECT COUNT(*) as n FROM fragrance_components WHERE flash_point IS NULL').get().n;
const totalFrags = db.prepare('SELECT COUNT(*) as n FROM fragrances').get().n;
const fragsWithFP = db.prepare('SELECT COUNT(*) as n FROM fragrances WHERE flash_point IS NOT NULL AND flash_point > 0 AND flash_point <= 300').get().n;

console.log('\n───────────────────────────────────────');
console.log(`Composants : ${withFP}/${totalComps} avec FP valide (${nullFP} sans FP)`);
console.log(`Parfums    : ${fragsWithFP}/${totalFrags} avec FP valide`);
console.log('───────────────────────────────────────\n');

db.close();
