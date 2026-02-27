#!/usr/bin/env node
/**
 * fix-merge-duplicate-fragrances.js — v5.44.12c
 * Merges duplicate fragrances (#194-205) into their originals.
 * These were created by a double import with numeric code prefix in name.
 * Redirects all FK references then deletes the duplicates.
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'mfc-data', 'database.sqlite');

// dup_id → original_id
const MERGE_MAP = {
    194: 10,   // 8572751 COUR DES EPICES → COUR DES EPICES
    195: 152,  // 8572759 REINE IMMORTELLE → REINE IMMORTELLE
    196: 153,  // 8572771 ROSE MAJESTE → ROSE MAJESTE
    197: 154,  // 8595760 FUMOIR → FUMOIR
    198: 155,  // 8605331 FOUGERE ROYALE → FOUGERE ROYALE
    199: 156,  // 8605335 L'ORANGERIE → LORANGERIE
    200: 157,  // 8605726 POTAGER DU PRINCE → POTAGER DU PRINCE
    201: 158,  // 8607276 FEU SOUVERAIN → FEU SOUVERAIN
    202: 159,  // 8647703 BASSIN DU PARC → BASSIN DU PARC
    203: 160,  // 8687118 PARADORES → PARADORES
    204: 161,  // 8687119 CHAMBRE D'AMBRE → CHAMBRE DAMBRE
    205: 162,  // 9020279 DIVINE BASTIDE → DIVINE BASTIDE
};

// Tables with fragrance_id FK
const FK_TABLES = [
    'fragrance_components',
    'fragrance_analyses',
    'formulations',
    'samples',
];

(async () => {
    const SQL = await initSqlJs();
    const buf = fs.readFileSync(DB_PATH);
    const db = new SQL.Database(buf);

    console.log('\n' + '═'.repeat(60));
    console.log('FUSION PARFUMS DOUBLONS');
    console.log('═'.repeat(60));

    for (const [dupId, origId] of Object.entries(MERGE_MAP)) {
        const dup = db.exec(`SELECT name FROM fragrances WHERE id = ${dupId}`);
        const orig = db.exec(`SELECT name FROM fragrances WHERE id = ${origId}`);
        
        if (!dup[0] || !orig[0]) {
            console.log(`  ⚠️  #${dupId} ou #${origId} introuvable, skip`);
            continue;
        }
        
        const dupName = dup[0].values[0][0];
        const origName = orig[0].values[0][0];
        
        console.log(`\n  #${dupId} "${dupName}" → #${origId} "${origName}"`);
        
        // Redirect FK references
        for (const table of FK_TABLES) {
            // Check if table exists and has fragrance_id column
            const cols = db.exec(`PRAGMA table_info(${table})`);
            const hasFK = cols[0]?.values.some(c => c[1] === 'fragrance_id');
            if (!hasFK) continue;
            
            // Count existing refs
            const count = db.exec(`SELECT COUNT(*) FROM ${table} WHERE fragrance_id = ${dupId}`);
            const n = count[0]?.values[0][0] || 0;
            
            if (n > 0) {
                // Delete duplicate components (original already has same components)
                if (table === 'fragrance_components' || table === 'fragrance_analyses') {
                    db.run(`DELETE FROM ${table} WHERE fragrance_id = ?`, [parseInt(dupId)]);
                    console.log(`    ${table}: ${n} supprimés (déjà présents dans original)`);
                } else {
                    // Redirect formulations/samples to original
                    db.run(`UPDATE ${table} SET fragrance_id = ? WHERE fragrance_id = ?`, [parseInt(origId), parseInt(dupId)]);
                    console.log(`    ${table}: ${n} redirigés`);
                }
            }
        }
        
        // Also redirect knowledge_base FDS entries
        try {
            const kbEntries = db.exec(`SELECT id, content FROM knowledge_base WHERE category = 'fds_parfum'`);
            if (kbEntries[0]) {
                for (const row of kbEntries[0].values) {
                    try {
                        const content = JSON.parse(row[1]);
                        if (content.fragrance_id === parseInt(dupId)) {
                            content.fragrance_id = parseInt(origId);
                            db.run('UPDATE knowledge_base SET content = ? WHERE id = ?', [JSON.stringify(content), row[0]]);
                            console.log(`    knowledge_base FDS: redirigée`);
                        }
                    } catch(e) {}
                }
            }
        } catch(e) {}
        
        // Update original name if it has better form (e.g. L'ORANGERIE vs LORANGERIE)
        if (dupName.includes("'") && !origName.includes("'")) {
            // Strip numeric prefix from dup name
            const cleanName = dupName.replace(/^\d+\s+/, '');
            db.run('UPDATE fragrances SET name = ? WHERE id = ?', [cleanName, parseInt(origId)]);
            console.log(`    Nom corrigé: "${origName}" → "${cleanName}"`);
        }
        
        // Also update original reference if it's empty and dup has numeric code
        const origRef = orig[0].values[0][0]; // already have name, need ref
        const origRefRow = db.exec(`SELECT reference FROM fragrances WHERE id = ${origId}`);
        const origRefVal = origRefRow[0]?.values[0][0];
        const numCode = dupName.match(/^(\d{7,})/);
        if (numCode && (!origRefVal || origRefVal === numCode[1])) {
            // reference is already the numeric code from the original import
        }
        
        // Delete duplicate fragrance
        db.run('DELETE FROM fragrances WHERE id = ?', [parseInt(dupId)]);
        console.log(`    ✅ Parfum #${dupId} supprimé`);
    }

    // Final stats
    const fragCount = db.exec('SELECT COUNT(*) FROM fragrances')[0].values[0][0];
    const compCount = db.exec('SELECT COUNT(*) FROM fragrance_components')[0].values[0][0];
    const fdsCount = db.exec("SELECT COUNT(*) FROM knowledge_base WHERE category = 'fds_parfum'")[0].values[0][0];
    
    console.log('\n' + '═'.repeat(60));
    console.log('RÉSULTAT');
    console.log('═'.repeat(60));
    console.log(`\n  Parfums    : ${fragCount} (supprimés: ${Object.keys(MERGE_MAP).length})`);
    console.log(`  Composants : ${compCount}`);
    console.log(`  FDS        : ${fdsCount}`);

    // Save
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
    console.log('\n💾 Base sauvegardée.\n');
    db.close();
})();
