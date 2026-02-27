#!/usr/bin/env node
/**
 * fix-flash-points.js — v5.44.12c
 * Enrichit fragrance_components.flash_point depuis MOLECULE_DB
 * + met à jour fragrances.flash_point (le FP min des composants)
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const { MOLECULE_DB } = require('./modules/molecule-engine');

const DB_PATH = path.join(__dirname, '..', 'mfc-data', 'database.sqlite');

(async () => {
    const SQL = await initSqlJs();
    const buf = fs.readFileSync(DB_PATH);
    const db = new SQL.Database(buf);

    // Build CAS → flash_point lookup
    const fpLookup = {};
    for (const [cas, info] of Object.entries(MOLECULE_DB)) {
        if (info.fp != null) fpLookup[cas] = info.fp;
    }
    console.log(`\n🔬 MOLECULE_DB : ${Object.keys(fpLookup).length} molécules avec point éclair\n`);

    // 1. Update fragrance_components
    const comps = db.exec("SELECT DISTINCT cas_number FROM fragrance_components WHERE cas_number IS NOT NULL AND cas_number != '' AND flash_point IS NULL");
    let updated = 0, notFound = 0;
    
    if (comps[0]?.values) {
        for (const [cas] of comps[0].values) {
            const fp = fpLookup[cas];
            if (fp != null) {
                db.run("UPDATE fragrance_components SET flash_point = ? WHERE cas_number = ? AND flash_point IS NULL", [fp, cas]);
                updated++;
            } else {
                notFound++;
            }
        }
    }
    
    console.log(`✅ Composants enrichis : ${updated} CAS mis à jour`);
    console.log(`⚠️  CAS sans FP dans moteur : ${notFound}`);

    // 2. Update fragrances.flash_point = MIN flash_point of their components
    const frags = db.exec(`
        SELECT fc.fragrance_id, MIN(fc.flash_point) as min_fp
        FROM fragrance_components fc 
        WHERE fc.flash_point IS NOT NULL
        GROUP BY fc.fragrance_id
    `);
    
    let fragUpdated = 0;
    if (frags[0]?.values) {
        for (const [fragId, minFp] of frags[0].values) {
            db.run("UPDATE fragrances SET flash_point = ? WHERE id = ? AND flash_point IS NULL", [minFp, fragId]);
            fragUpdated++;
        }
    }
    console.log(`✅ Parfums enrichis : ${fragUpdated} flash_point global calculé (min composants)`);

    // 3. Stats
    const totalComps = db.exec("SELECT COUNT(*) FROM fragrance_components")[0].values[0][0];
    const withFP = db.exec("SELECT COUNT(*) FROM fragrance_components WHERE flash_point IS NOT NULL")[0].values[0][0];
    const totalFrags = db.exec("SELECT COUNT(*) FROM fragrances")[0].values[0][0];
    const fragsWithFP = db.exec("SELECT COUNT(*) FROM fragrances WHERE flash_point IS NOT NULL")[0].values[0][0];
    
    console.log(`\n📊 Résultat final :`);
    console.log(`   Composants : ${withFP}/${totalComps} avec flash_point (${Math.round(withFP/totalComps*100)}%)`);
    console.log(`   Parfums    : ${fragsWithFP}/${totalFrags} avec flash_point (${Math.round(fragsWithFP/totalFrags*100)}%)\n`);

    // Save
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
    console.log('💾 Base sauvegardée.\n');
    
    db.close();
})();
