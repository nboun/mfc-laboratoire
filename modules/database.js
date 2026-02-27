/**
 * MFC Laboratoire - Module Base de données (sql.js)
 * Version pure JavaScript, aucune compilation requise
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

// Base de données — chemin configurable (Docker: MFC_DATA_DIR=/data)
// Cherche d'abord dans le repo (mfc-data/), sinon à côté du repo (../mfc-data/)
const DATA_DIR_REPO = path.join(__dirname, '..', 'mfc-data');
const DATA_DIR_PARENT = path.join(__dirname, '..', '..', 'mfc-data');
const DATA_DIR = process.env.MFC_DATA_DIR || (fs.existsSync(path.join(DATA_DIR_REPO, 'database.sqlite')) ? DATA_DIR_REPO : (fs.existsSync(DATA_DIR_PARENT) ? DATA_DIR_PARENT : DATA_DIR_REPO));
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}
const DB_PATH = path.join(DATA_DIR, 'database.sqlite');

// Migration: si l'ancienne base existe dans l'app, la déplacer
const OLD_DB_PATH = path.join(__dirname, '..', 'database.sqlite');
if (fs.existsSync(OLD_DB_PATH) && !fs.existsSync(DB_PATH)) {
    fs.copyFileSync(OLD_DB_PATH, DB_PATH);
    console.log('✓ Base de données migrée vers mfc-data/');
}

let db = null;
let SQL = null;

// Initialiser la base de données
async function initDB() {
    if (db) return db;
    
    SQL = await initSqlJs();
    
    // Charger la base existante ou en créer une nouvelle
    if (fs.existsSync(DB_PATH)) {
        const buffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(buffer);
        console.log('✓ Base de données chargée');
    } else {
        db = new SQL.Database();
        console.log('✓ Nouvelle base de données créée');
    }
    
    return db;
}

// Sauvegarder la base sur disque
function saveDB() {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(DB_PATH, buffer);
    }
}

// Sauvegarde périodique
let saveInterval = null;
function startAutoSave(intervalMs = 30000) {
    if (saveInterval) clearInterval(saveInterval);
    saveInterval = setInterval(saveDB, intervalMs);
    console.log(`✓ Sauvegarde automatique activée (${intervalMs/1000}s)`);
}

// Wrapper pour exécuter une requête et retourner tous les résultats
async function all(sql, params = []) {
    await initDB();
    try {
        const cleanParams = params.map(p => p === undefined ? null : p);
        const stmt = db.prepare(sql);
        if (cleanParams.length) stmt.bind(cleanParams);
        
        const results = [];
        while (stmt.step()) {
            const row = stmt.getAsObject();
            results.push(row);
        }
        stmt.free();
        return results;
    } catch (e) {
        console.error('SQL Error (all):', e.message, sql);
        return [];
    }
}

// Wrapper pour exécuter une requête et retourner un seul résultat
async function get(sql, params = []) {
    await initDB();
    try {
        const cleanParams = params.map(p => p === undefined ? null : p);
        const stmt = db.prepare(sql);
        if (cleanParams.length) stmt.bind(cleanParams);
        
        let result = null;
        if (stmt.step()) {
            result = stmt.getAsObject();
        }
        stmt.free();
        return result;
    } catch (e) {
        console.error('SQL Error (get):', e.message, sql);
        return null;
    }
}

// Wrapper pour exécuter une requête d'insertion/update/delete
async function run(sql, params = []) {
    await initDB();
    try {
        // sql.js ne supporte pas undefined - convertir en null
        const cleanParams = params.map(p => p === undefined ? null : p);
        
        if (cleanParams.length) {
            db.run(sql, cleanParams);
        } else {
            db.run(sql);
        }
        
        // Récupérer le lastInsertRowid et les changements
        let lastId = null;
        let changes = 0;
        try {
            const idResult = db.exec("SELECT last_insert_rowid()");
            if (idResult.length > 0 && idResult[0].values.length > 0) {
                lastId = idResult[0].values[0][0];
            }
            changes = db.getRowsModified();
        } catch (e2) {
            // Ignorer les erreurs de récupération d'ID
        }
        
        saveDB();
        
        return { 
            lastInsertRowid: lastId,
            changes: changes
        };
    } catch (e) {
        console.error('SQL Error (run):', e.message, sql);
        throw e;
    }
}

// Exécuter plusieurs requêtes (pour les migrations)
async function exec(sql) {
    await initDB();
    try {
        db.exec(sql);
        saveDB();
        return true;
    } catch (e) {
        console.error('SQL Error (exec):', e.message);
        throw e;
    }
}

module.exports = {
    initDB,
    saveDB,
    startAutoSave,
    all,
    get,
    run,
    exec,
    getDB: () => db
};
