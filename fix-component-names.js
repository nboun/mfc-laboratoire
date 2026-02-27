#!/usr/bin/env node
/**
 * fix-component-names.js — v5.44.12c
 * Répare les noms parasites des composants (CAS xxx, FICHE..., SAFETY..., etc.)
 * Étape 1 : corrige depuis les bons noms existants en DB (même CAS)
 * Étape 2 : corrige les 32 CAS restants avec noms manuels
 * Étape 3 : re-enrichit les flash_points depuis MOLECULE_DB
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const { MOLECULE_DB } = require('./modules/molecule-engine');

const DB_PATH = path.join(__dirname, '..', 'mfc-data', 'database.sqlite');

// Noms manuels pour les 32 CAS sans bon nom en DB
const MANUAL_NAMES = {
    '106185-75-5': '2-Isobutylquinoline',
    '118-71-8':    'Maltol',
    '121-39-1':    'Phénylacétate d\'éthyle (Ethyl phenylacetate)',
    '124-13-0':    'Octanal (Caprylic aldehyde)',
    '124-19-6':    'Nonanal (Pelargonaldehyde)',
    '126-91-0':    'Fenchol (endo)',
    '141-10-6':    'Pseudoionone',
    '141-13-9':    'Neryl acétone (Géranylacétone)',
    '142-92-7':    'Hexyl acétate',
    '15323-35-0':  'Cyclohexadecanolide (Muscolide)',
    '16510-27-3':  'Méthyl alpha-ionone',
    '165184-98-5': 'Précyclemone B',
    '18172-67-3':  '(-)-bêta-Pinène (levo)',
    '18871-14-2':  'Romilat (Dihydro-alpha-terpinéol)',
    '21368-68-3':  'OTNE (Iso E Super Plus)',
    '23911-56-0':  'Cétalox / Ambrox DL',
    '27939-60-2':  'Diméthylcyclohex-3-ène-1-carbaldéhyde (Triplal)',
    '3658-77-3':   '2-Acétyl-1-pyrroline (Furaneol)',
    '502-61-4':    'alpha-Farnésène',
    '5471-51-2':   'Frambinone (Raspberry ketone)',
    '5989-54-8':   '(S)-(-)-Limonène',
    '6485-40-1':   '(R)-(-)-Carvone (L-carvone)',
    '65443-14-3':  'MEFROSOL (Pentaméthylcyclopentènebutanol)',
    '67634-01-9':  'Myrac aldéhyde',
    '68259-31-4':  'Cyclopentadécanolide (Macrolide C15)',
    '68901-15-5':  '(Cyclohexyloxy)acétate d\'allyle',
    '7212-44-4':   'Nérolidol',
    '76-22-2':     'Camphre',
    '8014-09-3':   'Huile de Patchouli',
    '8016-26-0':   'Huile de Galanga',
    '93-53-8':     'Phénylacétaldéhyde (Hyacinthe)',
    '98-52-2':     '4-tert-Butylcyclohexanol',
};

// Pattern de détection des noms parasites
const BAD_PATTERNS = [
    /^CAS \d/i, /^FICHE/i, /^RUBRIQUE/i, /^SAFETY/i, /^Facteur/i,
    /^Asp\./i, /^Aquatic/i, /^Repr\./i, /^Acute/i, /^règlement/i,
    /^\?$/, /^Flam\./i, /^Skin/i, /^Eye /i, /^EINECS/i,
    /^Information/i, /^Rapport/i, /^STOT/i, /^-ONE /i, /Page \d+.*\//,
    /^\[Page/i
];

function isBadName(name) {
    return BAD_PATTERNS.some(p => p.test(name));
}

(async () => {
    const SQL = await initSqlJs();
    const buf = fs.readFileSync(DB_PATH);
    const db = new SQL.Database(buf);

    console.log('\n' + '═'.repeat(60));
    console.log('RÉPARATION NOMS COMPOSANTS + FLASH POINTS');
    console.log('═'.repeat(60));

    // ── ÉTAPE 1 : Corriger depuis les bons noms en DB ──
    console.log('\n── ÉTAPE 1 : Correction depuis DB (même CAS, bon nom) ──\n');
    
    const allComps = db.exec(`
        SELECT id, cas_number, name FROM fragrance_components 
        WHERE cas_number IS NOT NULL AND cas_number != ''
        ORDER BY cas_number
    `);
    
    // Build good names by CAS
    const goodNames = {};
    if (allComps[0]?.values) {
        for (const [id, cas, name] of allComps[0].values) {
            if (!isBadName(name) && name.length > 3) {
                if (!goodNames[cas] || name.length > goodNames[cas].length) {
                    goodNames[cas] = name;
                }
            }
        }
    }

    // Also add from molecule engine
    for (const [cas, info] of Object.entries(MOLECULE_DB)) {
        if (info.name && (!goodNames[cas] || goodNames[cas].length < info.name.length)) {
            goodNames[cas] = info.name;
        }
    }

    // Also add manual names
    for (const [cas, name] of Object.entries(MANUAL_NAMES)) {
        goodNames[cas] = name;
    }

    let step1Fixed = 0;
    if (allComps[0]?.values) {
        for (const [id, cas, name] of allComps[0].values) {
            if (isBadName(name) && goodNames[cas]) {
                db.run('UPDATE fragrance_components SET name = ? WHERE id = ?', [goodNames[cas], id]);
                step1Fixed++;
            }
        }
    }
    console.log(`✅ ${step1Fixed} composants corrigés`);

    // ── ÉTAPE 2 : Enrichir flash_points manquants ──
    console.log('\n── ÉTAPE 2 : Flash points composants depuis MOLECULE_DB ──\n');
    
    const fpLookup = {};
    for (const [cas, info] of Object.entries(MOLECULE_DB)) {
        if (info.fp != null) fpLookup[cas] = info.fp;
    }

    const noFP = db.exec(`
        SELECT DISTINCT cas_number FROM fragrance_components 
        WHERE cas_number IS NOT NULL AND cas_number != '' AND flash_point IS NULL
    `);
    
    let step2Fixed = 0;
    let step2Missing = 0;
    if (noFP[0]?.values) {
        for (const [cas] of noFP[0].values) {
            if (fpLookup[cas] != null) {
                db.run('UPDATE fragrance_components SET flash_point = ? WHERE cas_number = ? AND flash_point IS NULL', [fpLookup[cas], cas]);
                step2Fixed++;
            } else {
                step2Missing++;
            }
        }
    }
    console.log(`✅ ${step2Fixed} CAS enrichis avec flash_point`);
    console.log(`⚠️  ${step2Missing} CAS sans FP dans le moteur`);

    // ── ÉTAPE 3 : Recalculer FP global des parfums ──
    console.log('\n── ÉTAPE 3 : Recalcul FP global parfums (min composants) ──\n');
    
    const fragFP = db.exec(`
        SELECT fc.fragrance_id, MIN(fc.flash_point) as min_fp
        FROM fragrance_components fc 
        WHERE fc.flash_point IS NOT NULL
        GROUP BY fc.fragrance_id
    `);
    
    let step3Fixed = 0;
    if (fragFP[0]?.values) {
        for (const [fragId, minFp] of fragFP[0].values) {
            const current = db.exec('SELECT flash_point FROM fragrances WHERE id = ?', [fragId]);
            const curFP = current[0]?.values?.[0]?.[0];
            if (curFP === null || curFP === undefined) {
                db.run('UPDATE fragrances SET flash_point = ? WHERE id = ?', [minFp, fragId]);
                step3Fixed++;
            }
        }
    }
    console.log(`✅ ${step3Fixed} parfums sans FP → calculé depuis composants`);

    // ── STATS FINALES ──
    console.log('\n' + '═'.repeat(60));
    console.log('RÉSULTAT FINAL');
    console.log('═'.repeat(60));
    
    const totalComps = db.exec('SELECT COUNT(*) FROM fragrance_components')[0].values[0][0];
    const stillBad = db.exec(`
        SELECT COUNT(*) FROM fragrance_components 
        WHERE name LIKE 'CAS %' OR name LIKE 'FICHE%' OR name LIKE 'SAFETY%' 
        OR name LIKE 'Facteur%' OR name LIKE 'Aquatic%' OR name LIKE 'Repr.%'
        OR name LIKE 'Acute%' OR name = '?' OR name LIKE 'Asp.%'
        OR name LIKE 'Flam.%' OR name LIKE 'Skin%' OR name LIKE 'Eye %'
        OR name LIKE 'règlement%' OR name LIKE 'STOT%' OR name LIKE '-ONE %'
    `)[0].values[0][0];
    const withFP = db.exec('SELECT COUNT(*) FROM fragrance_components WHERE flash_point IS NOT NULL')[0].values[0][0];
    const fragsTotal = db.exec('SELECT COUNT(*) FROM fragrances')[0].values[0][0];
    const fragsWithFP = db.exec('SELECT COUNT(*) FROM fragrances WHERE flash_point IS NOT NULL')[0].values[0][0];
    
    console.log(`\n  Composants total     : ${totalComps}`);
    console.log(`  Noms parasites restants : ${stillBad} (était 329)`);
    console.log(`  Avec flash_point    : ${withFP}/${totalComps} (${Math.round(withFP/totalComps*100)}%)`);
    console.log(`  Parfums avec FP     : ${fragsWithFP}/${fragsTotal}\n`);

    // Save
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
    console.log('💾 Base sauvegardée.\n');
    
    db.close();
})();
