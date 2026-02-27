/**
 * fix-fds-cleanup-v2.js
 * 1) Supprime les parfums/fournisseurs créés par erreur depuis labels FDS
 * 2) Corrige les flash points aberrants (33°C methanol, etc.)
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.MFC_DATA_DIR || path.join(__dirname, '..', 'mfc-data');
const DB_PATH = path.join(DATA_DIR, 'database.sqlite');

async function main() {
    if (!fs.existsSync(DB_PATH)) {
        console.error('Base non trouvee :', DB_PATH);
        process.exit(1);
    }

    const SQL = await initSqlJs();
    const buffer = fs.readFileSync(DB_PATH);
    const db = new SQL.Database(buffer);

    console.log('===========================================');
    console.log('  Nettoyage FDS labels + Flash Points');
    console.log('  DB:', DB_PATH);
    console.log('===========================================\n');

    // ═══════ 1. PARFUMS LABELS FDS ═══════
    
    const BAD_NAMES = [
        'NOM COMMERCIAL', 'NOM DE LA SUBSTANCE', 'NOM DE LA SUBSTANCE/MÉLANGE',
        'NOM DE LA SUBSTANCE/MELANGE', 'NOM DU PRODUIT', 'NOM DU MÉLANGE',
        'NOM DU MELANGE', 'PRODUCT NAME', 'TRADE NAME', 'SUBSTANCE NAME',
        'IDENTIFICATION DU PRODUIT', 'IDENTIFICATION DE LA SUBSTANCE',
        'IDENTIFICATEUR DE PRODUIT', 'DÉNOMINATION COMMERCIALE',
        'DENOMINATION COMMERCIALE', 'RÉFÉRENCE COMMERCIALE', 'REFERENCE COMMERCIALE',
        'FICHE DE DONNÉES DE SÉCURITÉ', 'FICHE DE DONNEES DE SECURITE',
        'SAFETY DATA SHEET', 'MATERIAL SAFETY DATA SHEET',
        'COULEUR LIQUIDE POUR BOUGIES',
        'COMPANY',
    ];

    // Patterns regex pour noms suspects
    const BAD_PATTERNS = [
        /^ÉDITÉE?\s+LE/i, /^EDITEE?\s+LE/i,
        /^SECTION\s+\d/i, /^RUBRIQUE\s+\d/i,
        /^IDENTIFICATION\s+DE/i,
        /^FICHE\s+DE\s+DONN/i, /^SAFETY\s+DATA/i,
        /^DATE\s+D/i, /^REVISION/i, /^VERSION\s+\d/i,
        /^PAGE\s+\d/i,
        /^\d{2}\/\d{2}\/\d{4}/,
    ];

    const allFrags = db.exec('SELECT id, name, reference FROM fragrances ORDER BY name');
    let fragsDeleted = 0;

    if (allFrags.length && allFrags[0].values.length) {
        for (const [id, name, ref] of allFrags[0].values) {
            const upper = (name || '').trim().toUpperCase();
            const isLabel = BAD_NAMES.includes(upper) || BAD_PATTERNS.some(p => p.test(upper));
            if (isLabel) {
                console.log('  SUPPRIME parfum [' + id + '] "' + name + '"');
                db.run('DELETE FROM fragrance_components WHERE fragrance_id = ?', [id]);
                db.run('DELETE FROM fragrances WHERE id = ?', [id]);
                fragsDeleted++;
            }
        }
    }
    console.log(fragsDeleted > 0 ? fragsDeleted + ' parfum(s) label FDS supprime(s)' : 'Aucun parfum label FDS.');

    // ═══════ 2. FOURNISSEURS LABELS FDS ═══════
    
    const BAD_SUPPLIERS = [
        'COMPANY', 'IDENTIFICATION DE LA SOCIÉTÉ/ENTREPRISE',
        'IDENTIFICATION DE LA SOCIETE/ENTREPRISE',
        'IDENTIFICATION DE LA SOCIÉTÉ', 'IDENTIFICATION DE LA SOCIETE',
        'FOURNISSEUR', 'PRODUCTEUR', 'FABRICANT', 'MANUFACTURER', 'SUPPLIER',
        'RAISON SOCIALE', 'SOCIÉTÉ', 'SOCIETE',
        'DÉTAILS DU FOURNISSEUR', 'DETAILS DU FOURNISSEUR',
        'COORDONNÉES DU FOURNISSEUR', 'COORDONNEES DU FOURNISSEUR',
    ];

    const allSupps = db.exec('SELECT id, name FROM suppliers ORDER BY name');
    let suppsDeleted = 0;

    if (allSupps.length && allSupps[0].values.length) {
        for (const [id, name] of allSupps[0].values) {
            const upper = (name || '').trim().toUpperCase();
            if (BAD_SUPPLIERS.includes(upper)) {
                console.log('  SUPPRIME fournisseur [' + id + '] "' + name + '"');
                db.run('UPDATE fragrances SET supplier_id = NULL WHERE supplier_id = ?', [id]);
                db.run('DELETE FROM suppliers WHERE id = ?', [id]);
                suppsDeleted++;
            }
        }
    }
    console.log(suppsDeleted > 0 ? suppsDeleted + ' fournisseur(s) label FDS supprime(s)' : 'Aucun fournisseur label FDS.');

    // ═══════ 3. FLASH POINTS ABERRANTS ═══════
    
    console.log('\n--- Correction Flash Points ---\n');
    
    // 3a. Parfums avec FP venant de solvants traces (methanol 33°C, ethanol 13°C)
    // Le FP déclaré sur la FDS est la valeur qui compte
    // Mais si le rescan a écrasé avec des valeurs aberrantes, on recalcule
    
    const SOLVENT_FP = {
        '67-56-1': 11,   // methanol
        '64-17-5': 13,   // ethanol  
        '67-63-0': 12,   // isopropanol
    };
    
    // Trouver les parfums dont le FP = FP d'un solvant trace
    const fragsWithFP = db.exec('SELECT id, name, flash_point FROM fragrances WHERE flash_point IS NOT NULL ORDER BY flash_point');
    let fpFixed = 0;
    
    if (fragsWithFP.length && fragsWithFP[0].values.length) {
        for (const [fragId, fragName, currentFP] of fragsWithFP[0].values) {
            // FP suspect ? (<= 33°C = probablement un solvant trace)
            if (currentFP > 40) continue;
            
            // Vérifier si ce FP correspond à un composant trace
            const comps = db.exec(
                'SELECT cas_number, flash_point, percentage_min, percentage_max FROM fragrance_components WHERE fragrance_id = ? AND flash_point IS NOT NULL ORDER BY flash_point',
                [fragId]
            );
            
            if (!comps.length || !comps[0].values.length) continue;
            
            const compList = comps[0].values;
            const minFPComp = compList[0]; // [cas, fp, pct_min, pct_max]
            const minFP = minFPComp[1];
            const minPctMax = minFPComp[3] || minFPComp[2] || 0;
            
            // Si le FP du parfum = FP min composant ET ce composant est trace (< 5%)
            if (Math.abs(currentFP - minFP) <= 2 && minPctMax < 5) {
                // Recalculer le FP comme le min des composants NON-traces (> 5%)
                const significantComps = compList.filter(c => {
                    const pctMax = c[3] || c[2] || 0;
                    return pctMax >= 5;
                });
                
                let newFP = null;
                if (significantComps.length > 0) {
                    newFP = Math.min(...significantComps.map(c => c[1]));
                } else {
                    // Pas de composant significatif avec FP — mettre NULL
                    newFP = null;
                }
                
                console.log('  FP [' + fragName + '] : ' + currentFP + ' -> ' + (newFP || 'NULL') + ' (solvant trace ' + minFPComp[0] + ' a ' + minPctMax + '%)');
                db.run('UPDATE fragrances SET flash_point = ? WHERE id = ?', [newFP, fragId]);
                fpFixed++;
            }
        }
    }
    console.log(fpFixed > 0 ? fpFixed + ' flash point(s) corrige(s)' : 'Aucun FP aberrant a corriger.');

    // 3b. FP aberrants (> 300°C, < -20°C, ressemblant à des années)
    const aberrants = db.exec("SELECT id, name, flash_point FROM fragrances WHERE flash_point > 300 OR flash_point < -20 OR (flash_point >= 1900 AND flash_point <= 2100)");
    let aberrantsFixed = 0;
    if (aberrants.length && aberrants[0].values.length) {
        for (const [id, name, fp] of aberrants[0].values) {
            console.log('  ABERRANT [' + name + '] : ' + fp + ' -> NULL');
            db.run('UPDATE fragrances SET flash_point = NULL WHERE id = ?', [id]);
            aberrantsFixed++;
        }
    }
    if (aberrantsFixed) console.log(aberrantsFixed + ' FP aberrant(s) supprime(s).');

    // ═══════ STATS FINALES ═══════
    
    const totalFrags = db.exec('SELECT COUNT(*) FROM fragrances')[0].values[0][0];
    const totalSupps = db.exec('SELECT COUNT(*) FROM suppliers')[0].values[0][0];
    const withFP = db.exec('SELECT COUNT(*) FROM fragrances WHERE flash_point IS NOT NULL')[0].values[0][0];
    const fpList = db.exec('SELECT name, flash_point FROM fragrances WHERE flash_point IS NOT NULL ORDER BY flash_point LIMIT 10');
    
    console.log('\n===========================================');
    console.log('  Parfums    : ' + totalFrags + ' (' + withFP + ' avec FP)');
    console.log('  Fournisseurs: ' + totalSupps);
    console.log('  Supprimés  : ' + fragsDeleted + ' parfum(s), ' + suppsDeleted + ' fournisseur(s)');
    console.log('  FP corrigés: ' + fpFixed + ' traces, ' + aberrantsFixed + ' aberrants');
    console.log('===========================================');
    
    if (fpList.length && fpList[0].values.length) {
        console.log('\n  10 plus bas FP restants :');
        for (const [name, fp] of fpList[0].values) {
            console.log('    ' + fp + ' C  ' + name);
        }
    }

    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
    console.log('\nBase sauvegardee.\n');
    db.close();
}

main().catch(e => { console.error('Erreur:', e.message); process.exit(1); });
