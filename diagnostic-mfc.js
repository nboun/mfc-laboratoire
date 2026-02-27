#!/usr/bin/env node
/**
 * MFC Laboratoire — Diagnostic Automatique v1.0
 * 
 * Lance : node diagnostic-mfc.js
 * 
 * Vérifie server.js + modules/ pour détecter bugs SQL, modules manquants,
 * async cassés, incohérences métier, et propose des corrections auto.
 */

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════

const BASE_DIR = __dirname; // dossier mfc-laboratoire
const SERVER_FILE = path.join(BASE_DIR, 'server.js');
const MODULES_DIR = path.join(BASE_DIR, 'modules');

const COLORS = {
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    green: '\x1b[32m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m',
    bold: '\x1b[1m',
    reset: '\x1b[0m'
};

const SEVERITY = {
    CRITIQUE: `${COLORS.red}${COLORS.bold}[CRITIQUE]${COLORS.reset}`,
    HAUTE: `${COLORS.yellow}${COLORS.bold}[HAUTE]${COLORS.reset}`,
    MOYENNE: `${COLORS.cyan}[MOYENNE]${COLORS.reset}`,
    BASSE: `${COLORS.gray}[BASSE]${COLORS.reset}`,
    OK: `${COLORS.green}[OK]${COLORS.reset}`
};

let bugs = [];
let bugId = 0;
let checks = { total: 0, passed: 0, failed: 0 };

function addBug(severity, title, file, line, problem, impact, fix) {
    bugId++;
    bugs.push({ id: bugId, severity, title, file, line, problem, impact, fix });
}

function check(name, passed, detail) {
    checks.total++;
    if (passed) {
        checks.passed++;
        console.log(`  ${SEVERITY.OK} ${name}`);
    } else {
        checks.failed++;
        console.log(`  ${COLORS.red}✗${COLORS.reset} ${name} — ${detail || ''}`);
    }
    return passed;
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function readFile(filepath) {
    try {
        return fs.readFileSync(filepath, 'utf-8');
    } catch (e) {
        return null;
    }
}

function findLines(content, pattern) {
    const results = [];
    const lines = content.split('\n');
    const regex = typeof pattern === 'string' ? new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g') : pattern;
    for (let i = 0; i < lines.length; i++) {
        if (regex.test(lines[i])) {
            results.push({ line: i + 1, text: lines[i].trim() });
        }
        regex.lastIndex = 0;
    }
    return results;
}

function countOccurrences(content, pattern) {
    const regex = typeof pattern === 'string' ? new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g') : new RegExp(pattern, 'g');
    return (content.match(regex) || []).length;
}

// ═══════════════════════════════════════════════════════════════
// TEST 1 : FICHIERS PRÉSENTS
// ═══════════════════════════════════════════════════════════════

function checkFiles() {
    console.log(`\n${COLORS.bold}═══ 1. FICHIERS & MODULES ═══${COLORS.reset}`);
    
    const serverExists = fs.existsSync(SERVER_FILE);
    check('server.js existe', serverExists, 'FICHIER MANQUANT');
    if (!serverExists) {
        addBug('CRITIQUE', 'server.js introuvable', 'server.js', 0,
            'Le fichier server.js n\'existe pas dans le dossier',
            'Le serveur ne peut pas démarrer',
            'Vérifier que le script est lancé depuis le bon dossier');
        return false;
    }

    const server = readFile(SERVER_FILE);
    
    // Trouver tous les require('./modules/...')
    const moduleRequires = [...server.matchAll(/require\(['"]\.\/modules\/([^'"]+)['"]\)/g)];
    const requiredModules = [...new Set(moduleRequires.map(m => m[1]))];
    
    console.log(`\n  Modules requis par server.js : ${requiredModules.length}`);
    
    let missingModules = [];
    let presentModules = [];
    let optionalModules = [];
    
    for (const mod of requiredModules) {
        const modPath = path.join(MODULES_DIR, mod.endsWith('.js') ? mod : mod + '.js');
        const modPathIndex = path.join(MODULES_DIR, mod, 'index.js');
        const exists = fs.existsSync(modPath) || fs.existsSync(modPathIndex);
        
        // Vérifier si le require est dans un try/catch
        const requireLine = server.indexOf(`require('./modules/${mod}')`);
        const contextBefore = server.substring(Math.max(0, requireLine - 200), requireLine);
        const isOptional = contextBefore.includes('try {') || contextBefore.includes('try{');
        
        if (exists) {
            presentModules.push(mod);
            check(`  modules/${mod}`, true);
        } else if (isOptional) {
            optionalModules.push(mod);
            console.log(`  ${COLORS.gray}⊘ modules/${mod} (optionnel — try/catch)${COLORS.reset}`);
        } else {
            missingModules.push(mod);
            check(`  modules/${mod}`, false, 'ABSENT du dossier');
            addBug('CRITIQUE', `Module absent : ${mod}`, 'server.js', 0,
                `require('./modules/${mod}') référencé mais fichier absent du dossier modules/`,
                `Si le fichier n'existe pas sur le serveur → crash au démarrage "Cannot find module"`,
                `Vérifier que le fichier existe sur le serveur. Sinon, créer le module ou envelopper dans try/catch`);
        }
    }
    
    console.log(`\n  ${COLORS.green}Présents : ${presentModules.length}${COLORS.reset} | ${COLORS.red}Absents : ${missingModules.length}${COLORS.reset} | ${COLORS.gray}Optionnels : ${optionalModules.length}${COLORS.reset}`);
    
    if (missingModules.length > 0) {
        console.log(`  ${COLORS.yellow}⚠ Modules absents du dossier (vérifier qu'ils existent sur le serveur) :${COLORS.reset}`);
        console.log(`  ${COLORS.yellow}  ${missingModules.join(', ')}${COLORS.reset}`);
    }
    
    return true;
}

// ═══════════════════════════════════════════════════════════════
// TEST 2 : ERREURS SQL — NOMS DE TABLES/COLONNES
// ═══════════════════════════════════════════════════════════════

function checkSQL() {
    console.log(`\n${COLORS.bold}═══ 2. ERREURS SQL — TABLES & COLONNES ═══${COLORS.reset}`);
    
    const server = readFile(SERVER_FILE);
    const enrichment = readFile(path.join(MODULES_DIR, 'molecule-enrichment.js'));
    
    const filesToCheck = [
        { name: 'server.js', content: server },
    ];
    if (enrichment) filesToCheck.push({ name: 'molecule-enrichment.js', content: enrichment });
    
    // Modules existants (exclure database.js qui EST le wrapper — db.prepare() y est normal)
    const moduleFiles = fs.existsSync(MODULES_DIR) ? fs.readdirSync(MODULES_DIR).filter(f => f.endsWith('.js') && !f.endsWith('.bak') && f !== 'database.js') : [];
    for (const mf of moduleFiles) {
        if (mf === 'molecule-enrichment.js') continue; // déjà ajouté
        const mc = readFile(path.join(MODULES_DIR, mf));
        if (mc) filesToCheck.push({ name: mf, content: mc });
    }
    
    const sqlErrors = [
        {
            pattern: /parfum_components/gi,
            severity: 'CRITIQUE',
            title: 'Table inexistante : parfum_components',
            fix: 'Remplacer par fragrance_components'
        },
        {
            pattern: /pc\.component_name/gi,
            severity: 'CRITIQUE',
            title: 'Colonne inexistante : pc.component_name',
            fix: 'Remplacer par pc.name'
        },
        {
            pattern: /pc\.parfum_id/gi,
            severity: 'CRITIQUE',
            title: 'Colonne inexistante : pc.parfum_id',
            fix: 'Remplacer par pc.fragrance_id'
        },
        {
            pattern: /\bt\.formulation_code\b/g,
            severity: 'CRITIQUE',
            title: 'Colonne inexistante : t.formulation_code sur burn_tests',
            fix: 'Ajouter LEFT JOIN formulations f ON t.formulation_id = f.id et utiliser f.code'
        },
        {
            pattern: /\bt\.formulation_name\b/g,
            severity: 'CRITIQUE',
            title: 'Colonne inexistante : t.formulation_name sur burn_tests',
            fix: 'Utiliser f.name avec JOIN formulations'
        },
        {
            pattern: /\bt\.fragrance_name\b/g,
            severity: 'HAUTE',
            title: 'Colonne t.fragrance_name sur burn_tests (vérifier JOIN)',
            fix: 'Si pas de JOIN formulations dans la requête → ajouter LEFT JOIN formulations f ON t.formulation_id = f.id et utiliser f.fragrance_name',
            checkContext: (line, lines, lineIdx) => {
                // Remonter dans la requête SQL pour voir s'il y a un JOIN
                const queryBlock = lines.slice(Math.max(0, lineIdx - 15), lineIdx + 1).join('\n');
                return !queryBlock.includes('JOIN formulations') && !queryBlock.includes('JOIN burn_tests');
            }
        },
        {
            pattern: /kb\.metadata/gi,
            severity: 'CRITIQUE',
            title: 'Colonne inexistante : kb.metadata sur knowledge_base',
            fix: 'Utiliser kb.content (métadonnées JSON stockées dans content après ---JSON_META---)'
        },
        {
            pattern: /db\.prepare\s*\(/g,
            severity: 'CRITIQUE',
            title: 'API DB incompatible : db.prepare() (sync better-sqlite3)',
            fix: 'Remplacer par await db.get/run/all() (async wrapper)'
        },
        {
            pattern: /\.prepare\([^)]+\)\.(get|run|all)\(/g,
            severity: 'CRITIQUE',
            title: 'API DB incompatible : .prepare().get/run/all()',
            fix: 'Remplacer par await db.get/run/all(sql, params)'
        }
    ];
    
    for (const { name, content } of filesToCheck) {
        let fileHasErrors = false;
        const lines = content.split('\n');
        
        for (const err of sqlErrors) {
            const matches = findLines(content, err.pattern);
            if (matches.length > 0) {
                for (const m of matches) {
                    // Skip comments
                    if (m.text.trim().startsWith('//') || m.text.trim().startsWith('*')) continue;
                    
                    // Context check (e.g., verify if JOIN exists in surrounding query)
                    if (err.checkContext && !err.checkContext(m.text, lines, m.line - 1)) continue;
                    
                    if (!fileHasErrors) {
                        console.log(`\n  ${COLORS.bold}${name}${COLORS.reset}`);
                        fileHasErrors = true;
                    }
                    
                    check(`  L${m.line}: ${err.title}`, false, m.text.substring(0, 80));
                    addBug(err.severity, err.title, name, m.line, 
                        `"${m.text.substring(0, 100)}"`, 
                        'Erreur SQL au runtime → endpoint cassé',
                        err.fix);
                }
            }
        }
        
        if (!fileHasErrors) {
            check(`${name} — aucune erreur SQL connue`, true);
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// TEST 3 : ASYNC / AWAIT
// ═══════════════════════════════════════════════════════════════

function checkAsync() {
    console.log(`\n${COLORS.bold}═══ 3. ASYNC / AWAIT ═══${COLORS.reset}`);
    
    const server = readFile(SERVER_FILE);
    
    // Trouver les handlers de route sans async
    const routePattern = /app\.(get|post|put|delete|patch)\s*\([^,]+,\s*(?:express\.\w+\([^)]*\)\s*,\s*)?(\([^)]*\)\s*=>|function\s*\([^)]*\))\s*\{/g;
    let match;
    const lines = server.split('\n');
    let nonAsyncRoutes = 0;
    let asyncRoutes = 0;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/app\.(get|post|put|delete|patch)\s*\(/.test(line)) {
            // Vérifier si c'est async
            const hasAsync = /async\s/.test(line);
            
            // Trouver la fin du handler (chercher }); sur une ligne)
            let handlerEnd = Math.min(i + 30, lines.length);
            let braceCount = 0;
            for (let j = i; j < Math.min(i + 50, lines.length); j++) {
                for (const ch of lines[j]) {
                    if (ch === '{') braceCount++;
                    if (ch === '}') braceCount--;
                }
                if (braceCount <= 0 && j > i) { handlerEnd = j; break; }
            }
            
            const block = lines.slice(i, handlerEnd + 1).join('\n');
            const usesDB = /\bdb\.(get|run|all)\b/.test(block) || /\bawait\s+db\./.test(block);
            
            if (usesDB && !hasAsync) {
                nonAsyncRoutes++;
                if (nonAsyncRoutes <= 5) { // Limiter l'affichage
                    check(`L${i + 1}: Route DB sans async`, false, line.trim().substring(0, 80));
                    addBug('HAUTE', 'Route DB sans async', 'server.js', i + 1,
                        `Handler utilise db.get/run/all sans être async`,
                        'Les requêtes DB retournent des promesses non résolues → réponse vide ou [object Promise]',
                        'Ajouter async devant le handler');
                }
            } else if (usesDB) {
                asyncRoutes++;
            }
        }
    }
    
    if (nonAsyncRoutes > 5) {
        console.log(`  ${COLORS.red}  ... et ${nonAsyncRoutes - 5} autres routes sans async${COLORS.reset}`);
    }
    
    if (nonAsyncRoutes === 0) {
        check(`Toutes les routes DB sont async (${asyncRoutes} vérifiées)`, true);
    } else {
        console.log(`  ${COLORS.red}${nonAsyncRoutes} routes DB sans async${COLORS.reset} / ${asyncRoutes} OK`);
    }
    
    // Vérifier les try/catch dans les handlers async
    let routesWithoutTryCatch = 0;
    const routeRegex = /app\.(get|post|put|delete|patch)\s*\([^,]+,.*?async\s/g;
    let routeMatch;
    
    while ((routeMatch = routeRegex.exec(server)) !== null) {
        const startIdx = routeMatch.index;
        const nextLines = server.substring(startIdx, startIdx + 500);
        if (!nextLines.includes('try {') && !nextLines.includes('try{')) {
            routesWithoutTryCatch++;
        }
    }
    
    check(`Routes async avec try/catch`, routesWithoutTryCatch === 0, 
        routesWithoutTryCatch > 0 ? `${routesWithoutTryCatch} routes sans try/catch` : '');
    if (routesWithoutTryCatch > 0) {
        addBug('HAUTE', 'Routes async sans try/catch', 'server.js', 0,
            `${routesWithoutTryCatch} routes async n'ont pas de try/catch`,
            'Erreurs non attrapées → crash du serveur ou réponse 500 silencieuse',
            'Ajouter try { ... } catch(e) { res.status(500).json({error: e.message}) }');
    }
}

// ═══════════════════════════════════════════════════════════════
// TEST 4 : ROUTES DUPLIQUÉES
// ═══════════════════════════════════════════════════════════════

function checkDuplicateRoutes() {
    console.log(`\n${COLORS.bold}═══ 4. ROUTES DUPLIQUÉES ═══${COLORS.reset}`);
    
    const server = readFile(SERVER_FILE);
    const lines = server.split('\n');
    const routes = {};
    
    for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(/app\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/);
        if (match) {
            const key = `${match[1].toUpperCase()} ${match[2]}`;
            if (!routes[key]) routes[key] = [];
            routes[key].push(i + 1);
        }
    }
    
    let duplicates = 0;
    for (const [route, lineNums] of Object.entries(routes)) {
        if (lineNums.length > 1) {
            duplicates++;
            check(`${route}`, false, `Déclarée ${lineNums.length}× aux lignes ${lineNums.join(', ')}`);
            addBug('HAUTE', `Route dupliquée : ${route}`, 'server.js', lineNums[1],
                `Route déclarée ${lineNums.length} fois (lignes ${lineNums.join(', ')})`,
                'La dernière déclaration écrase les précédentes — comportement imprévisible',
                `Fusionner les déclarations en une seule ou supprimer le doublon`);
        }
    }
    
    if (duplicates === 0) {
        check(`Aucune route dupliquée (${Object.keys(routes).length} routes uniques)`, true);
    }
}

// ═══════════════════════════════════════════════════════════════
// TEST 5 : MODULE ENRICHISSEMENT
// ═══════════════════════════════════════════════════════════════

function checkEnrichment() {
    console.log(`\n${COLORS.bold}═══ 5. MODULE ENRICHISSEMENT ═══${COLORS.reset}`);
    
    const enrichment = readFile(path.join(MODULES_DIR, 'molecule-enrichment.js'));
    if (!enrichment) {
        check('molecule-enrichment.js existe', false, 'FICHIER MANQUANT');
        return;
    }
    
    // Vérifier tables
    const hasParfumComponents = /parfum_components/.test(enrichment);
    check('Utilise fragrance_components (pas parfum_components)', !hasParfumComponents,
        hasParfumComponents ? 'ENCORE parfum_components !' : '');
    
    // Vérifier colonnes
    const hasComponentName = /pc\.component_name/.test(enrichment);
    check('Utilise pc.name (pas pc.component_name)', !hasComponentName);
    
    const hasPcParfumId = /pc\.parfum_id/.test(enrichment);
    check('Utilise pc.fragrance_id (pas pc.parfum_id)', !hasPcParfumId);
    
    // Vérifier db.prepare
    const hasDbPrepare = /db\.prepare/.test(enrichment);
    check('Pas de db.prepare (utilise db.get/run/all async)', !hasDbPrepare);
    
    // Vérifier offset pour pagination batch
    const hasOffset = /offset/.test(enrichment);
    check('Batch supporte offset (pagination)', hasOffset,
        !hasOffset ? 'forceRefresh boucle sur les mêmes CAS' : '');
    
    // Vérifier JSON_META format
    const hasJsonMeta = /JSON_META/.test(enrichment);
    check('Format JSON_META pour métadonnées KB', hasJsonMeta);
    
    // Vérifier pas de colonne metadata
    const hasMetadataCol = /kb\.metadata|metadata LIKE/.test(enrichment);
    check('Pas de référence à kb.metadata (colonne inexistante)', !hasMetadataCol);
    
    // Vérifier exports
    const exports = enrichment.match(/module\.exports\s*=\s*\{([^}]+)\}/s);
    if (exports) {
        const exportedFns = exports[1].match(/\w+/g) || [];
        const requiredExports = ['enrichSingle', 'enrichUnknownMolecules', 'saveToKB', 'getMoleculeKB', 'getEnrichmentStats', 'importClaudeSession', 'exportNeedsClaude', 'exportOrphans'];
        for (const fn of requiredExports) {
            check(`Export: ${fn}`, exportedFns.includes(fn), `Fonction manquante dans module.exports`);
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// TEST 6 : LOGIQUE MÉTIER
// ═══════════════════════════════════════════════════════════════

function checkBusinessLogic() {
    console.log(`\n${COLORS.bold}═══ 6. LOGIQUE MÉTIER ═══${COLORS.reset}`);
    
    const server = readFile(SERVER_FILE);
    
    // Flash Point : vérifier si calcul = min composants
    const fpMinPattern = /Math\.min\([^)]*flash_point|flash_point[^}]*Math\.min|min.*flash|fp_min|minimum.*flash/gi;
    const fpMinMatches = findLines(server, fpMinPattern);
    if (fpMinMatches.length > 0) {
        check('Flash Point calculé correctement', false, 
            'Utilise MIN des composants au lieu du FP déclaré FDS');
        addBug('HAUTE', 'Flash Point incorrect', 'server.js', fpMinMatches[0].line,
            'FP parfum = minimum FP composants → alpha-pinène (33°C) fausse tous les résultats',
            '22+ parfums affichent FP=33°C alors que FDS indique >100°C',
            'Utiliser le FP extrait de la rubrique 9 de la FDS (proprietes_physiques.flash_point_c)');
    } else {
        // Chercher comment le FP est calculé
        const fpCalcLines = findLines(server, /flash_point/gi);
        check(`Flash Point: ${fpCalcLines.length} références trouvées`, true, 'Vérifier manuellement la logique');
    }
    
    // DPG check
    const dpgLines = findLines(server, /DPG|dipropylene.glycol/gi);
    if (dpgLines.length > 0) {
        console.log(`  ${COLORS.gray}ℹ DPG référencé ${dpgLines.length}× (documenté KB, exclu production)${COLORS.reset}`);
    }
    
    // Vérifier termes anglais non traduits dans les réponses JSON
    const englishTerms = ['hot throw', 'cold throw', 'melt pool', 'scent throw'];
    for (const term of englishTerms) {
        const matches = findLines(server, new RegExp(term, 'gi'));
        // Filtrer les commentaires
        const nonComment = matches.filter(m => !m.text.trim().startsWith('//') && !m.text.trim().startsWith('*'));
        if (nonComment.length > 0) {
            check(`Terme EN non traduit : "${term}"`, false, `${nonComment.length} occurrences`);
            addBug('BASSE', `Terme anglais non traduit : ${term}`, 'server.js', nonComment[0].line,
                `"${term}" doit être en français avec tooltip anglais`,
                'Interface non conforme aux règles MFC',
                `Remplacer par équivalent FR`);
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// TEST 7 : SYNTAXE JS
// ═══════════════════════════════════════════════════════════════

function checkSyntax() {
    console.log(`\n${COLORS.bold}═══ 7. SYNTAXE JAVASCRIPT ═══${COLORS.reset}`);
    
    const { execSync } = require('child_process');
    
    const files = [
        { name: 'server.js', path: SERVER_FILE }
    ];
    
    // Ajouter tous les modules existants
    if (fs.existsSync(MODULES_DIR)) {
        const moduleFiles = fs.readdirSync(MODULES_DIR).filter(f => f.endsWith('.js') && !f.endsWith('.bak'));
        for (const mf of moduleFiles) {
            files.push({ name: `modules/${mf}`, path: path.join(MODULES_DIR, mf) });
        }
    }
    
    for (const file of files) {
        if (!fs.existsSync(file.path)) continue;
        
        try {
            execSync(`node -c "${file.path}" 2>&1`, { encoding: 'utf-8' });
            check(`${file.name} — syntaxe JS valide`, true);
        } catch (e) {
            const errMsg = (e.stdout || e.stderr || e.message || '').split('\n')[0];
            check(`${file.name} — syntaxe JS`, false, errMsg);
            addBug('CRITIQUE', `Erreur de syntaxe : ${file.name}`, file.name, 0,
                errMsg,
                'Le fichier ne peut pas être chargé par Node.js',
                'Corriger l\'erreur de syntaxe indiquée');
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// TEST 8 : ENDPOINTS CRITIQUES
// ═══════════════════════════════════════════════════════════════

function checkEndpoints() {
    console.log(`\n${COLORS.bold}═══ 8. ENDPOINTS CRITIQUES ═══${COLORS.reset}`);
    
    const server = readFile(SERVER_FILE);
    
    const criticalEndpoints = [
        // 6 pages cœur
        { method: 'GET', path: '/api/fragrances', desc: 'Liste parfums (FDS)' },
        { method: 'GET', path: '/api/formulations', desc: 'Liste formulations' },
        { method: 'GET', path: '/api/burn-tests', desc: 'Liste tests combustion' },
        { method: 'GET', path: '/api/samples', desc: 'Liste échantillons' },
        { method: 'GET', path: '/api/waxes', desc: 'Liste cires (Matières)' },
        { method: 'GET', path: '/api/wicks', desc: 'Liste mèches (Matières)' },
        // Dashboard
        { method: 'GET', path: '/api/dashboard', desc: 'Dashboard principal' },
        // Enrichissement
        { method: 'GET', path: '/api/enrichment/stats', desc: 'Stats enrichissement' },
        { method: 'POST', path: '/api/enrichment/batch', desc: 'Batch enrichissement' },
        // KB
        { method: 'GET', path: '/api/knowledge', desc: 'Base de connaissances' },
        // Clients
        { method: 'GET', path: '/api/clients', desc: 'Liste clients' },
        // Recettes
        { method: 'GET', path: '/api/recipes', desc: 'Liste recettes' },
    ];
    
    for (const ep of criticalEndpoints) {
        const pattern = new RegExp(`app\\.${ep.method.toLowerCase()}\\s*\\(\\s*['"\`]${ep.path.replace(/\//g, '\\/')}['"\`]`);
        const exists = pattern.test(server);
        check(`${ep.method} ${ep.path} — ${ep.desc}`, exists, 'ENDPOINT MANQUANT');
        
        if (!exists) {
            addBug('HAUTE', `Endpoint manquant : ${ep.method} ${ep.path}`, 'server.js', 0,
                `${ep.desc} — route non trouvée dans server.js`,
                `Page ${ep.desc} ne fonctionne pas`,
                `Ajouter la route ${ep.method} ${ep.path}`);
        }
    }
    
    // Vérifier les CRUD complets pour entités principales
    const entities = [
        { name: 'clients', paths: ['/api/clients'] },
        { name: 'formulations', paths: ['/api/formulations'] },
        { name: 'samples', paths: ['/api/samples'] },
        { name: 'burn-tests', paths: ['/api/burn-tests'] },
        { name: 'recipes', paths: ['/api/recipes'] },
        { name: 'waxes', paths: ['/api/waxes'] },
        { name: 'wicks', paths: ['/api/wicks'] },
    ];
    
    console.log(`\n  ${COLORS.bold}CRUD complet :${COLORS.reset}`);
    for (const entity of entities) {
        const base = entity.paths[0];
        const hasGet = new RegExp(`app\\.get\\s*\\(\\s*['"\`]${base.replace(/\//g, '\\/')}['"\`]`).test(server);
        const hasGetOne = new RegExp(`app\\.get\\s*\\(\\s*['"\`]${base.replace(/\//g, '\\/')}/:id['"\`]`).test(server);
        const hasPost = new RegExp(`app\\.post\\s*\\(\\s*['"\`]${base.replace(/\//g, '\\/')}['"\`]`).test(server);
        const hasPut = new RegExp(`app\\.put\\s*\\(\\s*['"\`]${base.replace(/\//g, '\\/')}/:id['"\`]`).test(server);
        const hasDelete = new RegExp(`app\\.delete\\s*\\(\\s*['"\`]${base.replace(/\//g, '\\/')}/:id['"\`]`).test(server);
        
        const ops = [];
        if (hasGet) ops.push('LIST');
        if (hasGetOne) ops.push('GET');
        if (hasPost) ops.push('CREATE');
        if (hasPut) ops.push('UPDATE');
        if (hasDelete) ops.push('DELETE');
        
        const complete = ops.length >= 4;
        const missing = ['LIST', 'GET', 'CREATE', 'UPDATE', 'DELETE'].filter(o => !ops.includes(o));
        
        check(`  ${entity.name}: ${ops.join(', ')}`, complete,
            missing.length > 0 ? `Manque: ${missing.join(', ')}` : '');
    }
}

// ═══════════════════════════════════════════════════════════════
// TEST 9 : COHÉRENCE DB RUNTIME (live test)
// ═══════════════════════════════════════════════════════════════

function checkDBRuntime() {
    console.log(`\n${COLORS.bold}═══ 9. VÉRIFICATION DB RUNTIME ═══${COLORS.reset}`);
    
    // Chercher le fichier DB
    const possibleDBPaths = [
        path.join(BASE_DIR, 'data', 'mfc.db'),
        path.join(BASE_DIR, 'data', 'mfc-laboratoire.db'),
        path.join(BASE_DIR, 'mfc.db'),
        path.join(BASE_DIR, 'database.db'),
    ];
    
    // Chercher dans server.js le path de la DB
    const server = readFile(SERVER_FILE);
    const dbPathMatch = server.match(/(?:database|db_path|DB_PATH|dbPath)\s*[:=]\s*(?:path\.join\([^)]+\)|['"`]([^'"`]+)['"`])/);
    
    let dbFound = false;
    for (const p of possibleDBPaths) {
        if (fs.existsSync(p)) {
            dbFound = true;
            const stats = fs.statSync(p);
            console.log(`  ${COLORS.green}DB trouvée : ${p} (${(stats.size / 1024 / 1024).toFixed(1)} MB)${COLORS.reset}`);
            break;
        }
    }
    
    if (!dbFound) {
        console.log(`  ${COLORS.gray}ℹ DB SQLite non trouvée localement (normal si lancé hors serveur)${COLORS.reset}`);
        console.log(`  ${COLORS.gray}  → Les vérifications SQL seront statiques uniquement${COLORS.reset}`);
    }
    
    // Extraire toutes les requêtes SQL et vérifier les tables référencées
    const allSQLTables = new Set();
    const sqlPattern = /(?:FROM|JOIN|INTO|UPDATE)\s+(\w+)/gi;
    let sqlMatch;
    while ((sqlMatch = sqlPattern.exec(server)) !== null) {
        const table = sqlMatch[1].toLowerCase();
        if (!['set', 'values', 'where', 'select', 'null', 'not', 'and', 'or', 'on', 'as',
             'real', 'integer', 'text', 'blob', 'json', 'total', 'count', 'sum', 'avg',
             'max', 'min', 'group', 'order', 'limit', 'offset', 'having', 'like', 'between',
             'exists', 'case', 'when', 'then', 'else', 'end', 'distinct', 'coalesce',
             'sample', 'header', 'xml', 'abstract', 'articleids', 'keywords',
             'validated', 'refused', 'rules', 'knowledge', 'feedbacks'].includes(table)) {
            allSQLTables.add(table);
        }
    }
    
    const knownTables = new Set([
        'fragrances', 'fragrance_components', 'fragrance_analyses',
        'formulations', 'formulation_waxes', 'formulation_colorants', 'formulation_sessions',
        'burn_tests', 'burn_cycles',
        'knowledge_base', 'knowledge_patterns', 'learned_rules',
        'waxes', 'wicks', 'colorants',
        'samples', 'clients', 'projects', 'documents', 'suppliers',
        'recipes', 'recipe_waxes', 'recipe_wicks', 'recipe_colorants',
        'activity_log', 'change_log', 'test_history',
        'photos', 'operators'
    ]);
    
    const suspiciousTables = [];
    for (const table of allSQLTables) {
        if (!knownTables.has(table) && table.length > 2) {
            suspiciousTables.push(table);
        }
    }
    
    console.log(`  Tables SQL référencées : ${allSQLTables.size}`);
    console.log(`  Tables connues : ${knownTables.size}`);
    
    if (suspiciousTables.length > 0) {
        console.log(`  ${COLORS.yellow}Tables suspectes (possiblement inexistantes) :${COLORS.reset}`);
        for (const t of suspiciousTables) {
            console.log(`    ${COLORS.yellow}→ ${t}${COLORS.reset}`);
        }
    } else {
        check('Toutes les tables SQL sont connues', true);
    }
}

// ═══════════════════════════════════════════════════════════════
// TEST 10 : TAILLE & COMPLEXITÉ
// ═══════════════════════════════════════════════════════════════

function checkComplexity() {
    console.log(`\n${COLORS.bold}═══ 10. TAILLE & COMPLEXITÉ ═══${COLORS.reset}`);
    
    const server = readFile(SERVER_FILE);
    const lines = server.split('\n');
    
    console.log(`  server.js : ${lines.length} lignes`);
    
    const routeCount = (server.match(/app\.(get|post|put|delete|patch)\s*\(/g) || []).length;
    console.log(`  Routes : ${routeCount}`);
    
    const awaitCount = (server.match(/\bawait\b/g) || []).length;
    console.log(`  Appels await : ${awaitCount}`);
    
    const dbCallCount = (server.match(/db\.(get|run|all)\b/g) || []).length;
    console.log(`  Appels DB : ${dbCallCount}`);
    
    if (lines.length > 5000) {
        addBug('BASSE', 'server.js trop volumineux', 'server.js', 0,
            `${lines.length} lignes — maintenabilité dégradée`,
            'Difficile à débugger et à maintenir',
            'Envisager de découper en modules par domaine (clients, formulations, tests, etc.)');
    }
}

// ═══════════════════════════════════════════════════════════════
// RAPPORT FINAL
// ═══════════════════════════════════════════════════════════════

function printReport() {
    console.log(`\n${COLORS.bold}${'═'.repeat(60)}${COLORS.reset}`);
    console.log(`${COLORS.bold}       RAPPORT DIAGNOSTIC MFC LABORATOIRE${COLORS.reset}`);
    console.log(`${COLORS.bold}${'═'.repeat(60)}${COLORS.reset}`);
    
    console.log(`\n  Date : ${new Date().toLocaleString('fr-FR')}`);
    console.log(`  Checks : ${checks.passed}/${checks.total} passés | ${checks.failed} échoués`);
    
    // Compter par sévérité
    const critiques = bugs.filter(b => b.severity === 'CRITIQUE');
    const hautes = bugs.filter(b => b.severity === 'HAUTE');
    const moyennes = bugs.filter(b => b.severity === 'MOYENNE');
    const basses = bugs.filter(b => b.severity === 'BASSE');
    
    console.log(`\n  ${SEVERITY.CRITIQUE} ${critiques.length} critique(s)`);
    console.log(`  ${SEVERITY.HAUTE} ${hautes.length} haute(s)`);
    console.log(`  ${SEVERITY.MOYENNE} ${moyennes.length} moyenne(s)`);
    console.log(`  ${SEVERITY.BASSE} ${basses.length} basse(s)`);
    console.log(`  ${COLORS.bold}Total : ${bugs.length} bugs détectés${COLORS.reset}`);
    
    if (critiques.length > 0) {
        console.log(`\n${COLORS.red}${COLORS.bold}╔════════════════════════════════════════════╗${COLORS.reset}`);
        console.log(`${COLORS.red}${COLORS.bold}║         BUGS CRITIQUES — À CORRIGER        ║${COLORS.reset}`);
        console.log(`${COLORS.red}${COLORS.bold}╚════════════════════════════════════════════╝${COLORS.reset}`);
        for (const bug of critiques) {
            console.log(`\n  ${COLORS.red}#${bug.id}${COLORS.reset} ${COLORS.bold}${bug.title}${COLORS.reset}`);
            console.log(`  ${COLORS.gray}${bug.file}${bug.line ? `:${bug.line}` : ''}${COLORS.reset}`);
            console.log(`  Problème : ${bug.problem}`);
            console.log(`  Impact   : ${bug.impact}`);
            console.log(`  ${COLORS.green}Fix : ${bug.fix}${COLORS.reset}`);
        }
    }
    
    if (hautes.length > 0) {
        console.log(`\n${COLORS.yellow}${COLORS.bold}── BUGS HAUTE PRIORITÉ ──${COLORS.reset}`);
        for (const bug of hautes) {
            console.log(`\n  ${COLORS.yellow}#${bug.id}${COLORS.reset} ${bug.title}`);
            console.log(`  ${COLORS.gray}${bug.file}${bug.line ? `:${bug.line}` : ''}${COLORS.reset}`);
            console.log(`  ${bug.problem}`);
            console.log(`  ${COLORS.green}Fix : ${bug.fix}${COLORS.reset}`);
        }
    }
    
    if (moyennes.length + basses.length > 0) {
        console.log(`\n${COLORS.gray}── BUGS MOYENNE/BASSE PRIORITÉ ──${COLORS.reset}`);
        for (const bug of [...moyennes, ...basses]) {
            console.log(`  ${COLORS.gray}#${bug.id} ${bug.title} (${bug.file}${bug.line ? `:${bug.line}` : ''})${COLORS.reset}`);
        }
    }
    
    // Export JSON
    const reportPath = path.join(BASE_DIR, 'diagnostic-report.json');
    const report = {
        date: new Date().toISOString(),
        version: 'diagnostic-mfc v1.0',
        checks: checks,
        bugs: bugs,
        summary: {
            critique: critiques.length,
            haute: hautes.length,
            moyenne: moyennes.length,
            basse: basses.length,
            total: bugs.length
        }
    };
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`\n  ${COLORS.green}Rapport JSON sauvegardé : ${reportPath}${COLORS.reset}`);
    
    // Score santé
    const maxScore = 100;
    const confirmedBugs = bugs.filter(b => !b.title.startsWith('Module absent'));
    const moduleBugs = bugs.filter(b => b.title.startsWith('Module absent'));
    const confirmedCritiques = confirmedBugs.filter(b => b.severity === 'CRITIQUE');
    const confirmedHautes = confirmedBugs.filter(b => b.severity === 'HAUTE');
    
    const penalty = confirmedCritiques.length * 10 + confirmedHautes.length * 4 + moyennes.length * 2 + basses.length * 1;
    const modulePenalty = Math.min(15, moduleBugs.length * 1); // max 15 pts pour modules absents
    const score = Math.max(0, maxScore - penalty - modulePenalty);
    const scoreColor = score >= 80 ? COLORS.green : score >= 50 ? COLORS.yellow : COLORS.red;
    
    console.log(`\n  ${COLORS.bold}Score santé : ${scoreColor}${score}/100${COLORS.reset}`);
    if (moduleBugs.length > 0) {
        console.log(`  ${COLORS.gray}(${moduleBugs.length} modules absents du dossier — vérifier qu'ils existent sur le serveur)${COLORS.reset}`);
    }    
    if (score >= 80) {
        console.log(`  ${COLORS.green}✓ Application en bon état${COLORS.reset}`);
    } else if (score >= 50) {
        console.log(`  ${COLORS.yellow}⚠ Corrections recommandées avant mise en production${COLORS.reset}`);
    } else {
        console.log(`  ${COLORS.red}✗ Corrections critiques nécessaires${COLORS.reset}`);
    }
    
    console.log(`\n${'═'.repeat(60)}\n`);
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

console.log(`\n${COLORS.bold}${COLORS.cyan}`);
console.log(`  ╔═══════════════════════════════════════════╗`);
console.log(`  ║   MFC LABORATOIRE — DIAGNOSTIC AUTO v1.0 ║`);
console.log(`  ╚═══════════════════════════════════════════╝`);
console.log(`${COLORS.reset}`);
console.log(`  Dossier : ${BASE_DIR}`);
console.log(`  Date    : ${new Date().toLocaleString('fr-FR')}`);

const hasServer = checkFiles();
if (hasServer) {
    checkSQL();
    checkAsync();
    checkDuplicateRoutes();
    checkEnrichment();
    checkBusinessLogic();
    checkSyntax();
    checkEndpoints();
    checkDBRuntime();
    checkComplexity();
}

printReport();
