#!/usr/bin/env node
/**
 * fix-fds-cleanup.js — v5.44.12c
 * 1. Parse FDS titles to extract fragrance name + reference
 * 2. Match FDS to fragrances
 * 3. Deduplicate (keep best FDS per fragrance)
 * 4. Remove garbage entries
 * 5. Update content with reference/product_name for future matching
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'mfc-data', 'database.sqlite');

// Manual matches for the 6 unresolved FDS
const MANUAL_FDS_MATCHES = {
    // FDS id → fragrance id
    439:  192,  // FDS_10128_03-16_PAEVA → CONCENTRE VIOLETTE BO 10128
    463:  169,  // ONYX_MYSTICS_WOODS_PATCHOULI → MYSTICS WOODS & PATCHOULI
    464:  169,  // ONYX_MYSTICS_WOODS_PATCHOULI (dup)
    494:  189,  // TABAC FDS LONDRES → TABAC
};

// Garbage FDS IDs (not real FDS entries)
const GARBAGE_IDS = [
    480,  // SDS_13374-50-36_FR.pdf
    492,  // EAN
    4332, // Nom de la substance/mélange
    4334, // Nom commercial
    4342, // Couleur liquide pour bougies
];

// FDS with no matching fragrance (truly orphan — no fragrance to link to)
const ORPHAN_FDS = [
    358,  // 05:33 A MINHA VIDA PORTUGUESA — no fragrance in DB
    423,  // AMBRE MYRR FIGUE — no fragrance in DB
];

function parseFdsTitle(title) {
    let t = title.replace(/^FDS Parfum\s*:\s*/, '').trim();
    t = t.replace(/_\d{4}-\d{2}-\d{2}.*$/, '');
    t = t.replace(/\.pdf$/i, '');
    
    const refMatch = t.match(/\(([^)]+)\)\s*$/);
    const refInParens = refMatch ? refMatch[1].trim() : '';
    if (refMatch) t = t.substring(0, refMatch.index).trim();
    
    t = t.replace(/_/g, ' ').trim();
    
    // Numeric code prefix (Robertet style: 8572751 COUR DES EPICES)
    const numMatch = t.match(/^(\d{5,})\s+(.+)$/);
    if (numMatch) return { name: numMatch[2].trim(), ref: numMatch[1], ref2: refInParens };
    
    // G ref code (G 117 11061)
    const gMatch = t.match(/^(.+?)\s+(G\s+\d+\s+\d+)$/);
    if (gMatch) return { name: gMatch[1].trim(), ref: gMatch[2], ref2: refInParens };
    
    return { name: t.trim(), ref: refInParens, ref2: '' };
}

function normalize(s) {
    if (!s) return '';
    return s.replace(/[\s\-_./]+/g, ' ').toUpperCase().trim();
}

(async () => {
    const SQL = await initSqlJs();
    const buf = fs.readFileSync(DB_PATH);
    const db = new SQL.Database(buf);

    console.log('\n' + '═'.repeat(60));
    console.log('NETTOYAGE FDS : DÉDUPLICATION + MATCHING');
    console.log('═'.repeat(60));

    // Load data
    const fdsRows = db.exec("SELECT id, title, content FROM knowledge_base WHERE category = 'fds_parfum'");
    const fragRows = db.exec("SELECT id, name, reference, supplier_id FROM fragrances");
    
    if (!fdsRows[0] || !fragRows[0]) {
        console.log('Pas de données FDS ou parfums');
        return;
    }

    const fdsEntries = fdsRows[0].values.map(r => ({
        id: r[0], title: r[1], content: r[2]
    }));
    const fragrances = fragRows[0].values.map(r => ({
        id: r[0], name: r[1], reference: r[2], supplier_id: r[3]
    }));

    console.log(`\nFDS total    : ${fdsEntries.length}`);
    console.log(`Parfums      : ${fragrances.length}`);

    // Parse FDS titles
    const fdsParsed = fdsEntries.map(f => {
        const parsed = parseFdsTitle(f.title);
        let compCount = 0;
        try {
            const c = JSON.parse(f.content);
            compCount = (c.components || c.composants || []).length;
        } catch(e) {}
        return { ...f, ...parsed, compCount };
    });

    // Match FDS to fragrances
    function findFragMatch(fds) {
        // Manual match?
        if (MANUAL_FDS_MATCHES[fds.id]) return { id: MANUAL_FDS_MATCHES[fds.id], method: 'manual' };
        
        const pname = normalize(fds.name);
        const pref = normalize(fds.ref);
        const pref2 = normalize(fds.ref2);
        
        for (const f of fragrances) {
            const fname = normalize(f.name);
            const fref = normalize(f.reference);
            
            if (pname && fname && pname === fname) return { id: f.id, method: 'name_exact' };
            if (pname && fname && pname.length > 5 && fname.length > 5) {
                if (pname.startsWith(fname) || fname.startsWith(pname)) return { id: f.id, method: 'name_prefix' };
            }
            if (pref && fref && (pref === fref || pref.includes(fref) || fref.includes(pref))) return { id: f.id, method: 'ref_match' };
            if (pref2 && fref && (pref2 === fref || pref2.includes(fref) || fref.includes(pref2))) return { id: f.id, method: 'ref2_match' };
            if (pref && fname && fname.includes(pref)) return { id: f.id, method: 'ref_in_name' };
            if (pname && fname && fname.length > 8 && pname.includes(fname)) return { id: f.id, method: 'name_contains' };
        }
        return null;
    }

    // Group FDS by fragrance
    const fdsPerFrag = {}; // frag_id → [fds entries]
    const unmatchedFds = [];
    let garbageCount = 0;
    let orphanCount = 0;

    for (const fds of fdsParsed) {
        if (GARBAGE_IDS.includes(fds.id)) {
            garbageCount++;
            continue;
        }
        if (ORPHAN_FDS.includes(fds.id)) {
            orphanCount++;
            continue;
        }
        
        const match = findFragMatch(fds);
        if (match) {
            if (!fdsPerFrag[match.id]) fdsPerFrag[match.id] = [];
            fdsPerFrag[match.id].push({ ...fds, method: match.method });
        } else {
            unmatchedFds.push(fds);
        }
    }

    console.log(`\nMatchées     : ${Object.keys(fdsPerFrag).length} parfums`);
    console.log(`Garbage      : ${garbageCount}`);
    console.log(`Orphelines   : ${orphanCount} (parfums pas en base)`);
    console.log(`Non matchées : ${unmatchedFds.length}`);

    if (unmatchedFds.length > 0) {
        console.log('\n⚠️  FDS non matchées restantes:');
        for (const u of unmatchedFds) {
            console.log(`  #${u.id} | ${u.name} | ref=${u.ref}`);
        }
    }

    // ── STEP 1: Delete garbage ──
    console.log('\n── Étape 1 : Suppression garbage ──');
    for (const gid of GARBAGE_IDS) {
        db.run('DELETE FROM knowledge_base WHERE id = ?', [gid]);
    }
    console.log(`✅ ${GARBAGE_IDS.length} entrées garbage supprimées`);

    // ── STEP 2: Delete orphans ──
    console.log('\n── Étape 2 : Suppression orphelines ──');
    for (const oid of ORPHAN_FDS) {
        db.run('DELETE FROM knowledge_base WHERE id = ?', [oid]);
    }
    console.log(`✅ ${ORPHAN_FDS.length} entrées orphelines supprimées`);

    // ── STEP 3: Deduplicate — keep best FDS per fragrance ──
    console.log('\n── Étape 3 : Déduplication (1 FDS par parfum) ──');
    let dupsDeleted = 0;
    let keptCount = 0;
    
    for (const [fragId, fdsList] of Object.entries(fdsPerFrag)) {
        // Sort: prefer entries with most components, then prefer clean titles (no .pdf, no dates)
        fdsList.sort((a, b) => {
            if (b.compCount !== a.compCount) return b.compCount - a.compCount;
            // Prefer titles without .pdf or date patterns
            const aClean = !a.title.includes('.pdf') && !a.title.match(/_\d{4}-/) ? 1 : 0;
            const bClean = !b.title.includes('.pdf') && !b.title.match(/_\d{4}-/) ? 1 : 0;
            if (bClean !== aClean) return bClean - aClean;
            // Prefer higher ID (more recent import)
            return b.id - a.id;
        });
        
        const best = fdsList[0];
        keptCount++;
        
        // Delete duplicates
        for (let i = 1; i < fdsList.length; i++) {
            db.run('DELETE FROM knowledge_base WHERE id = ?', [fdsList[i].id]);
            dupsDeleted++;
        }
        
        // Update best FDS with proper reference and product_name in content
        try {
            const frag = fragrances.find(f => f.id === parseInt(fragId));
            const content = JSON.parse(best.content);
            content.reference = frag?.reference || best.ref || '';
            content.product_name = frag?.name || best.name || '';
            content.fragrance_id = parseInt(fragId);
            db.run('UPDATE knowledge_base SET content = ? WHERE id = ?', [JSON.stringify(content), best.id]);
        } catch(e) {
            // Content not valid JSON, skip update
        }
    }
    console.log(`✅ ${keptCount} FDS conservées (1 par parfum)`);
    console.log(`✅ ${dupsDeleted} doublons supprimés`);

    // ── STATS FINALES ──
    const remaining = db.exec("SELECT COUNT(*) FROM knowledge_base WHERE category = 'fds_parfum'")[0].values[0][0];
    const fragTotal = db.exec("SELECT COUNT(*) FROM fragrances")[0].values[0][0];
    
    console.log('\n' + '═'.repeat(60));
    console.log('RÉSULTAT FINAL');
    console.log('═'.repeat(60));
    console.log(`\n  FDS restantes       : ${remaining} (était ${fdsEntries.length})`);
    console.log(`  Parfums total       : ${fragTotal}`);
    console.log(`  Couverture FDS      : ${keptCount}/${fragTotal} (${Math.round(keptCount/fragTotal*100)}%)`);
    console.log(`  Supprimées          : ${GARBAGE_IDS.length + ORPHAN_FDS.length + dupsDeleted} (garbage: ${GARBAGE_IDS.length}, orphelines: ${ORPHAN_FDS.length}, doublons: ${dupsDeleted})`);

    // Parfums sans FDS
    const fragsWithFds = new Set(Object.keys(fdsPerFrag).map(Number));
    const fragsWithout = fragrances.filter(f => !fragsWithFds.has(f.id));
    console.log(`\n  Parfums sans FDS    : ${fragsWithout.length}`);
    if (fragsWithout.length > 0 && fragsWithout.length <= 20) {
        for (const f of fragsWithout) {
            console.log(`    #${f.id} ${f.name}`);
        }
    }

    // Save
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
    console.log('\n💾 Base sauvegardée.\n');
    db.close();
})();
