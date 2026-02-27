/**
 * fix-fds-labels-cleanup.js — v5.44.14
 * Supprime les parfums et fournisseurs créés par erreur
 * à partir de labels FDS (NOM COMMERCIAL, COMPANY, etc.)
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.MFC_DATA_DIR || path.join(__dirname, '..', 'mfc-data');
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
    console.log('  Nettoyage labels FDS en base');
    console.log('═══════════════════════════════════════\n');

    // Labels connus capturés par erreur comme noms de parfums
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
    ];

    // Labels connus capturés par erreur comme fournisseurs
    const BAD_SUPPLIERS = [
        'COMPANY', 'IDENTIFICATION DE LA SOCIÉTÉ/ENTREPRISE',
        'IDENTIFICATION DE LA SOCIETE/ENTREPRISE',
        'IDENTIFICATION DE LA SOCIÉTÉ', 'IDENTIFICATION DE LA SOCIETE',
        'FOURNISSEUR', 'PRODUCTEUR', 'FABRICANT', 'MANUFACTURER', 'SUPPLIER',
        'RAISON SOCIALE', 'SOCIÉTÉ', 'SOCIETE',
        'DÉTAILS DU FOURNISSEUR', 'DETAILS DU FOURNISSEUR',
        'COORDONNÉES DU FOURNISSEUR', 'COORDONNEES DU FOURNISSEUR',
        'RENSEIGNEMENTS CONCERNANT',
    ];

    // 1. Parfums à supprimer
    const placeholders = BAD_NAMES.map(() => '?').join(',');
    const badFrags = db.exec(
        `SELECT id, name, reference FROM fragrances WHERE UPPER(TRIM(name)) IN (${placeholders})`,
        BAD_NAMES
    );

    let fragsDeleted = 0;
    if (badFrags.length && badFrags[0].values.length) {
        console.log(`⚠️  ${badFrags[0].values.length} parfum(s) label FDS trouvé(s) :\n`);
        for (const [id, name, ref] of badFrags[0].values) {
            console.log(`  [${id}] "${name}" (ref: ${ref || '—'})`);
            // Supprimer composants associés
            db.run('DELETE FROM fragrance_components WHERE fragrance_id = ?', [id]);
            // Supprimer le parfum
            db.run('DELETE FROM fragrances WHERE id = ?', [id]);
            fragsDeleted++;
        }
        console.log(`\n✅ ${fragsDeleted} parfum(s) supprimé(s) avec leurs composants`);
    } else {
        console.log('✅ Aucun parfum label FDS trouvé.');
    }

    // 2. Fournisseurs à supprimer
    const placeholders2 = BAD_SUPPLIERS.map(() => '?').join(',');
    const badSupps = db.exec(
        `SELECT id, name FROM suppliers WHERE UPPER(TRIM(name)) IN (${placeholders2})`,
        BAD_SUPPLIERS
    );

    let suppsDeleted = 0;
    if (badSupps.length && badSupps[0].values.length) {
        console.log(`\n⚠️  ${badSupps[0].values.length} fournisseur(s) label FDS trouvé(s) :\n`);
        for (const [id, name] of badSupps[0].values) {
            console.log(`  [${id}] "${name}"`);
            // Détacher les parfums liés (mettre supplier_id à NULL)
            db.run('UPDATE fragrances SET supplier_id = NULL WHERE supplier_id = ?', [id]);
            db.run('DELETE FROM suppliers WHERE id = ?', [id]);
            suppsDeleted++;
        }
        console.log(`\n✅ ${suppsDeleted} fournisseur(s) supprimé(s)`);
    } else {
        console.log('✅ Aucun fournisseur label FDS trouvé.');
    }

    // 3. Chercher aussi les parfums suspects (noms très courts ou patterns de labels)
    const suspects = db.exec(`
        SELECT id, name, reference FROM fragrances 
        WHERE LENGTH(TRIM(name)) <= 3
           OR UPPER(name) LIKE 'SECTION %'
           OR UPPER(name) LIKE 'RUBRIQUE %'
           OR UPPER(name) LIKE 'FICHE DE %'
           OR UPPER(name) LIKE 'SAFETY %'
           OR UPPER(name) LIKE 'IDENTIFICATION %'
        ORDER BY name
    `);

    if (suspects.length && suspects[0].values.length) {
        console.log(`\n⚠️  ${suspects[0].values.length} parfum(s) suspect(s) (noms très courts ou labels) :`);
        for (const [id, name, ref] of suspects[0].values) {
            console.log(`  [${id}] "${name}" (ref: ${ref || '—'}) — À vérifier manuellement`);
        }
    }

    // 4. Stats finales
    const totalFrags = db.exec('SELECT COUNT(*) FROM fragrances')[0].values[0][0];
    const totalSupps = db.exec('SELECT COUNT(*) FROM suppliers')[0].values[0][0];

    console.log('\n───────────────────────────────────────');
    console.log(`Parfums restants    : ${totalFrags}`);
    console.log(`Fournisseurs restants : ${totalSupps}`);
    console.log(`Supprimés : ${fragsDeleted} parfum(s), ${suppsDeleted} fournisseur(s)`);
    console.log('───────────────────────────────────────\n');

    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
    console.log('✅ Base sauvegardée.\n');
    db.close();
}

main().catch(e => { console.error('❌ Erreur:', e.message); process.exit(1); });
