/**
 * fix-flash-points-cleanup.js — v5.44.14
 * Nettoie les flash points aberrants + audit cohérence FP déclaré vs composants
 * Utilise sql.js (même module que l'app)
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const _repo = path.join(__dirname, 'mfc-data');
const _parent = path.join(__dirname, '..', 'mfc-data');
const DATA_DIR = process.env.MFC_DATA_DIR || (fs.existsSync(path.join(_repo, 'database.sqlite')) ? _repo : (fs.existsSync(_parent) ? _parent : _repo));
const DB_PATH = path.join(DATA_DIR, 'database.sqlite');

async function main() {
    if (!fs.existsSync(DB_PATH)) {
        console.error('❌ Base non trouvée :', DB_PATH);
        process.exit(1);
    }

    const SQL = await initSqlJs();
    const buffer = fs.readFileSync(DB_PATH);
    const db = new SQL.Database(buffer);

    console.log('═══════════════════════════════════════');
    console.log('  Nettoyage flash points aberrants');
    console.log('═══════════════════════════════════════\n');

    // 1. Composants aberrants (>300, <-20, années 1900-2099)
    const aberrants = db.exec(`
        SELECT fc.id, fc.fragrance_id, fc.cas_number, fc.name, fc.flash_point,
               f.name as fragrance_name
        FROM fragrance_components fc
        LEFT JOIN fragrances f ON f.id = fc.fragrance_id
        WHERE fc.flash_point IS NOT NULL 
          AND (fc.flash_point > 300 OR fc.flash_point < -20 OR (fc.flash_point >= 1900 AND fc.flash_point <= 2099))
        ORDER BY fc.flash_point DESC
    `);

    if (!aberrants.length || !aberrants[0].values.length) {
        console.log('✅ Aucun flash point aberrant dans les composants.\n');
    } else {
        const rows = aberrants[0].values;
        console.log(`⚠️  ${rows.length} composant(s) avec flash point aberrant :\n`);
        for (const [id, fragId, cas, name, fp, fragName] of rows) {
            console.log(`  [${id}] ${name || '?'} (CAS ${cas || '?'}) → FP ${fp}°C  (parfum: ${fragName})`);
        }
        db.run(`
            UPDATE fragrance_components SET flash_point = NULL 
            WHERE flash_point IS NOT NULL 
              AND (flash_point > 300 OR flash_point < -20 OR (flash_point >= 1900 AND flash_point <= 2099))
        `);
        console.log(`\n✅ ${db.getRowsModified()} composant(s) corrigé(s)`);
    }

    // 2. Parfums aberrants
    const aberrantFrags = db.exec(`
        SELECT id, name, flash_point FROM fragrances 
        WHERE flash_point IS NOT NULL 
          AND (flash_point > 300 OR flash_point < -20 OR (flash_point >= 1900 AND flash_point <= 2099))
        ORDER BY flash_point DESC
    `);

    if (aberrantFrags.length && aberrantFrags[0].values.length) {
        const rows = aberrantFrags[0].values;
        console.log(`\n⚠️  ${rows.length} parfum(s) avec FP global aberrant :`);
        for (const [id, name, fp] of rows) {
            console.log(`  [${id}] ${name} → FP ${fp}°C`);
        }
        db.run(`
            UPDATE fragrances SET flash_point = NULL 
            WHERE flash_point IS NOT NULL 
              AND (flash_point > 300 OR flash_point < -20 OR (flash_point >= 1900 AND flash_point <= 2099))
        `);
        console.log(`✅ ${db.getRowsModified()} parfum(s) corrigé(s)`);
    }

    // 3. Audit cohérence : FP déclaré < FP min composants (erreur parsing FDS)
    console.log('\n═══════════════════════════════════════');
    console.log('  Audit cohérence FP déclaré vs composants');
    console.log('═══════════════════════════════════════\n');

    const incoherents = db.exec(`
        SELECT f.id, f.name, f.flash_point as fp_declare,
               MIN(fc.flash_point) as fp_min_composant,
               COUNT(fc.id) as nb_comps
        FROM fragrances f
        JOIN fragrance_components fc ON fc.fragrance_id = f.id
        WHERE f.flash_point IS NOT NULL 
          AND f.flash_point > 0 AND f.flash_point <= 300
          AND fc.flash_point IS NOT NULL 
          AND fc.flash_point > 0 AND fc.flash_point <= 300
        GROUP BY f.id
        HAVING f.flash_point < (MIN(fc.flash_point) - 10)
        ORDER BY (MIN(fc.flash_point) - f.flash_point) DESC
    `);

    if (!incoherents.length || !incoherents[0].values.length) {
        console.log('✅ Aucune incohérence FP détectée.\n');
    } else {
        const rows = incoherents[0].values;
        console.log(`⚠️  ${rows.length} parfum(s) avec FP déclaré incohérent :\n`);
        console.log('  Parfum                                    FP déclaré   FP min composants   Écart');
        console.log('  ─────────────────────────────────────────────────────────────────────────────────');
        for (const [id, name, fpDeclare, fpMinComp, nbComps] of rows) {
            const displayName = (name || '?').substring(0, 40).padEnd(40);
            console.log(`  ${displayName}  ${String(fpDeclare).padStart(6)}°C   ${String(fpMinComp).padStart(6)}°C           +${fpMinComp - fpDeclare}°C`);
        }
        console.log(`\n  → FP déclaré inférieur au composant le plus volatil = erreur parsing FDS.`);

        let corrected = 0;
        for (const [id, name, fpDeclare, fpMinComp] of rows) {
            db.run('UPDATE fragrances SET flash_point = ? WHERE id = ?', [fpMinComp, id]);
            corrected++;
        }
        console.log(`✅ ${corrected} parfum(s) corrigé(s) → FP = min(composants)\n`);
    }

    // 4. Enrichir les parfums sans FP depuis leurs composants
    const recalc = db.exec(`
        SELECT fc.fragrance_id, MIN(fc.flash_point) as min_fp
        FROM fragrance_components fc
        JOIN fragrances f ON f.id = fc.fragrance_id
        WHERE fc.flash_point IS NOT NULL AND fc.flash_point > 0 AND fc.flash_point <= 300
          AND f.flash_point IS NULL
        GROUP BY fc.fragrance_id
    `);

    let updated = 0;
    if (recalc.length && recalc[0].values.length) {
        for (const [fragId, minFp] of recalc[0].values) {
            db.run('UPDATE fragrances SET flash_point = ? WHERE id = ?', [minFp, fragId]);
            updated++;
        }
    }
    console.log(`✅ ${updated} parfum(s) sans FP → enrichi depuis composants`);

    // 5. Stats finales
    const totalComps = db.exec('SELECT COUNT(*) FROM fragrance_components')[0].values[0][0];
    const withFP = db.exec('SELECT COUNT(*) FROM fragrance_components WHERE flash_point IS NOT NULL AND flash_point > 0 AND flash_point <= 300')[0].values[0][0];
    const totalFrags = db.exec('SELECT COUNT(*) FROM fragrances')[0].values[0][0];
    const fragsWithFP = db.exec('SELECT COUNT(*) FROM fragrances WHERE flash_point IS NOT NULL AND flash_point > 0 AND flash_point <= 300')[0].values[0][0];

    console.log('\n───────────────────────────────────────');
    console.log(`Composants : ${withFP}/${totalComps} avec FP valide`);
    console.log(`Parfums    : ${fragsWithFP}/${totalFrags} avec FP valide`);
    console.log('───────────────────────────────────────\n');

    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
    console.log('✅ Base sauvegardée.\n');
    db.close();
}

main().catch(e => { console.error('❌ Erreur:', e.message); process.exit(1); });
