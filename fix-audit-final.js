#!/usr/bin/env node
/**
 * fix-audit-final.js — v5.44.12d
 * Corrige les 4 problèmes restants de l'audit :
 * 1. 79 noms avec résidu GHS collé ("nom SAFETY DATA SHEET...")
 * 2. 5 composants doublons (même CAS + même parfum)
 * 3. 21 analyses orphelines (fragrance_id supprimé)
 * 4. 49 FP incohérents parfum vs composants
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'mfc-data', 'database.sqlite');

// Patterns GHS à nettoyer dans les noms
const GHS_TAIL_PATTERNS = [
    / SAFETY DATA SHEET.*/i,
    / Repr\.\s*\d.*$/i,
    / Hazards not Otherwi.*/i,
    / \[Page \d.*/i,
    / selon le r.glement.*/i,
    / according to Regulation.*/i,
];

(async () => {
    const SQL = await initSqlJs();
    const buf = fs.readFileSync(DB_PATH);
    const db = new SQL.Database(buf);

    console.log('\n' + '='.repeat(60));
    console.log('FIX AUDIT FINAL — 4 problèmes');
    console.log('='.repeat(60));

    // ── 1. Noms avec résidu GHS collé ──
    console.log('\n-- 1. Nettoyage résidus GHS collés aux noms --');
    
    const allComps = db.exec('SELECT id, name FROM fragrance_components WHERE name IS NOT NULL');
    let ghsFixed = 0;
    if (allComps[0]?.values) {
        for (const [id, name] of allComps[0].values) {
            let cleaned = name;
            for (const pat of GHS_TAIL_PATTERNS) {
                cleaned = cleaned.replace(pat, '');
            }
            // Also clean trailing " [1]", " [2]" annotations
            cleaned = cleaned.replace(/\s*\[\d+\]\s*$/, '').trim();
            if (cleaned !== name && cleaned.length > 3) {
                db.run('UPDATE fragrance_components SET name = ? WHERE id = ?', [cleaned, id]);
                ghsFixed++;
            }
        }
    }
    console.log(`  ${ghsFixed} noms nettoyés`);

    // ── 2. Composants doublons ──
    console.log('\n-- 2. Suppression composants doublons (même CAS + parfum) --');
    
    const dupes = db.exec(`
        SELECT fragrance_id, cas_number, COUNT(*) as cnt, GROUP_CONCAT(id) as ids
        FROM fragrance_components 
        WHERE cas_number IS NOT NULL 
        GROUP BY fragrance_id, cas_number 
        HAVING cnt > 1
    `);
    let dupesDeleted = 0;
    if (dupes[0]?.values) {
        for (const [fragId, cas, cnt, idsStr] of dupes[0].values) {
            const ids = idsStr.split(',').map(Number);
            // Garder le premier (le plus ancien), supprimer les autres
            for (let i = 1; i < ids.length; i++) {
                db.run('DELETE FROM fragrance_components WHERE id = ?', [ids[i]]);
                dupesDeleted++;
            }
        }
    }
    console.log(`  ${dupesDeleted} doublons supprimés`);

    // ── 3. Analyses orphelines ──
    console.log('\n-- 3. Suppression analyses orphelines --');
    
    const orphans = db.exec(`
        SELECT fa.id FROM fragrance_analyses fa
        LEFT JOIN fragrances f ON f.id = fa.fragrance_id
        WHERE f.id IS NULL
    `);
    let orphansDeleted = 0;
    if (orphans[0]?.values) {
        for (const [id] of orphans[0].values) {
            db.run('DELETE FROM fragrance_analyses WHERE id = ?', [id]);
            orphansDeleted++;
        }
    }
    console.log(`  ${orphansDeleted} analyses orphelines supprimées`);

    // ── 4. FP incohérents — recalculer FP parfums depuis FDS KB ──
    console.log('\n-- 4. Correction FP parfums depuis FDS KB --');
    
    // D'abord, récupérer les FP depuis les FDS KB (source fiable = mesure sur le mélange)
    const kbFds = db.exec("SELECT content FROM knowledge_base WHERE category = 'fds_parfum'");
    const fpFromFds = {}; // fragrance_id → flash_point from FDS
    if (kbFds[0]?.values) {
        for (const [contentStr] of kbFds[0].values) {
            try {
                const content = JSON.parse(contentStr);
                const fid = content.fragrance_id;
                const fp = content.proprietes_physiques?.flash_point_c 
                    || content.proprietes?.flash_point_c
                    || content.proprietes_physiques?.flash_point
                    || content.proprietes?.flash_point;
                if (fid && fp != null) {
                    const val = parseFloat(String(fp).replace(/[<>°C\s≥]/g, ''));
                    if (!isNaN(val) && val > 0 && val < 200) {
                        fpFromFds[fid] = val;
                    }
                }
            } catch(e) {}
        }
    }
    
    // Pour les parfums sans FDS FP, utiliser min des composants
    const fragFpResults = db.exec(`
        SELECT f.id, f.name, f.flash_point, MIN(fc.flash_point) as min_comp_fp
        FROM fragrances f
        LEFT JOIN fragrance_components fc ON fc.fragrance_id = f.id AND fc.flash_point IS NOT NULL
        GROUP BY f.id
    `);
    
    let fpCorrected = 0;
    if (fragFpResults[0]?.values) {
        for (const [fid, fname, currentFp, minCompFp] of fragFpResults[0].values) {
            const fdsFp = fpFromFds[fid];
            let bestFp = null;
            
            if (fdsFp != null) {
                // FDS = source de vérité pour le mélange
                bestFp = fdsFp;
            } else if (minCompFp != null) {
                // Fallback : min des composants
                bestFp = minCompFp;
            }
            
            if (bestFp != null && currentFp !== bestFp) {
                db.run('UPDATE fragrances SET flash_point = ? WHERE id = ?', [bestFp, fid]);
                if (currentFp !== bestFp) {
                    fpCorrected++;
                }
            }
        }
    }
    console.log(`  FDS avec FP : ${Object.keys(fpFromFds).length}`);
    console.log(`  ${fpCorrected} parfums FP corrigés`);

    // ── Stats finales ──
    const totalComps = db.exec('SELECT COUNT(*) FROM fragrance_components')[0].values[0][0];
    const totalFrags = db.exec('SELECT COUNT(*) FROM fragrances')[0].values[0][0];
    const totalAnalyses = db.exec('SELECT COUNT(*) FROM fragrance_analyses')[0].values[0][0];
    
    console.log('\n' + '='.repeat(60));
    console.log('RESULTAT');
    console.log('='.repeat(60));
    console.log(`\n  Composants  : ${totalComps}`);
    console.log(`  Parfums     : ${totalFrags}`);
    console.log(`  Analyses    : ${totalAnalyses}`);
    console.log(`  Corrections : ${ghsFixed} GHS + ${dupesDeleted} dupes + ${orphansDeleted} orphelins + ${fpCorrected} FP`);

    // Save
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
    console.log('\n  Base sauvegardee.\n');
    db.close();
})();
