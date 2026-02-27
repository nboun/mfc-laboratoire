#!/usr/bin/env node
/**
 * fix-fragrance-fp-from-kb.js — v5.44.12c
 * Corrige les flash_point des parfums en utilisant les données FDS de la KB
 * (plus fiable que le min des composants ou le parsing initial)
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'mfc-data', 'database.sqlite');

(async () => {
    const SQL = await initSqlJs();
    const buf = fs.readFileSync(DB_PATH);
    const db = new SQL.Database(buf);

    // 1. Charger toutes les FDS KB avec flash_point
    const kbRows = db.exec("SELECT id, title, content FROM knowledge_base WHERE category = 'fds_parfum'");
    if (!kbRows[0]?.values) {
        console.log('Aucune FDS en KB.');
        db.close();
        return;
    }

    let corrected = 0, skipped = 0, noFP = 0;
    const corrections = [];

    for (const [kbId, title, contentStr] of kbRows[0].values) {
        try {
            const c = JSON.parse(contentStr);
            const pp = c.proprietes_physiques || c.proprietes || {};
            const fpRaw = pp.flash_point_c || pp.flash_point || null;
            if (!fpRaw) { noFP++; continue; }

            const fpVal = parseFloat(String(fpRaw).replace(/[<>≥≤°C\s]/g, ''));
            if (isNaN(fpVal)) { noFP++; continue; }

            const id = c.identification || {};
            const nom = id.nom || '';
            const code = id.code || '';

            // Trouver le parfum correspondant
            let frag = null;
            if (code) {
                const r = db.exec("SELECT id, name, flash_point FROM fragrances WHERE reference = ?", [code]);
                if (r[0]?.values?.[0]) frag = { id: r[0].values[0][0], name: r[0].values[0][1], oldFP: r[0].values[0][2] };
            }
            if (!frag && nom) {
                const r = db.exec("SELECT id, name, flash_point FROM fragrances WHERE UPPER(name) = UPPER(?)", [nom.split(' ')[0]]);
                if (r[0]?.values?.[0]) frag = { id: r[0].values[0][0], name: r[0].values[0][1], oldFP: r[0].values[0][2] };
            }

            if (!frag) { skipped++; continue; }

            // Comparer et corriger si différent
            if (frag.oldFP !== fpVal) {
                db.run("UPDATE fragrances SET flash_point = ? WHERE id = ?", [fpVal, frag.id]);
                corrections.push({ id: frag.id, name: frag.name, old: frag.oldFP, new: fpVal });
                corrected++;
            } else {
                skipped++;
            }
        } catch (e) {
            skipped++;
        }
    }

    console.log(`\n🔬 FDS analysées : ${kbRows[0].values.length}`);
    console.log(`✅ Corrigées : ${corrected}`);
    console.log(`⏭️  Déjà OK ou non trouvées : ${skipped}`);
    console.log(`⚠️  Sans flash_point dans FDS : ${noFP}`);

    if (corrections.length) {
        console.log('\n📋 Corrections appliquées :');
        for (const c of corrections) {
            console.log(`   #${c.id} ${c.name.substring(0, 30).padEnd(30)} : ${c.old}°C → ${c.new}°C`);
        }
    }

    // Save
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
    console.log('\n💾 Base sauvegardée.\n');

    db.close();
})();
