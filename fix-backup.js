/**
 * Patch backup + nettoyage — v5.44.12c
 * 1. Corrige l'effet boule de neige (backups dans les backups)
 * 2. Réduit la rétention à 3 backups max par type
 * 3. Nettoie immédiatement les anciens fichiers
 * 
 * Usage : node fix-backup.js
 * Depuis le dossier mfc-laboratoire/
 */
const fs = require('fs');
const path = require('path');

let srv = fs.readFileSync('server.js', 'utf8');
let changes = 0;

// ── 1. Corriger l'effet boule de neige ──
if (srv.includes('// Exclure les gros PDFs du backup complet (ils sont dans done/)')) {
    const oldPattern = `execSync(\`xcopy "\${dataDir}" "\${dataTarget}\\\\\\\\" /E /I /Q 2>nul\`, { stdio: 'pipe' });
                // Exclure les gros PDFs du backup complet (ils sont dans done/)
                const fdsDir = path.join(dataTarget, 'fds', 'done');
                if (fs.existsSync(fdsDir)) {
                    // Garder la liste des PDFs mais pas les fichiers (trop lourds)
                    const pdfs = fs.readdirSync(fdsDir).filter(f => f.endsWith('.pdf'));
                    fs.writeFileSync(path.join(fdsDir, '_liste_fds.txt'), pdfs.join('\\\\n'), 'utf-8');
                    pdfs.forEach(f => { try { fs.unlinkSync(path.join(fdsDir, f)); } catch(e){} });
                }`;

    const newBlock = `execSync(\`xcopy "\${dataDir}" "\${dataTarget}\\\\\\\\" /E /I /Q 2>nul\`, { stdio: 'pipe' });
                
                // Supprimer les backups precedents (sinon effet boule de neige !)
                const bkDir = path.join(dataTarget, 'backups');
                if (fs.existsSync(bkDir)) execSync(\`rmdir /s /q "\${bkDir}"\`, { stdio: 'pipe' });
                
                // Exclure les gros PDFs du backup complet (done/ et inbox/)
                for (const sub of ['done', 'inbox']) {
                    const fdsSubDir = path.join(dataTarget, 'fds', sub);
                    if (fs.existsSync(fdsSubDir)) {
                        const pdfs = fs.readdirSync(fdsSubDir).filter(f => f.endsWith('.pdf'));
                        if (pdfs.length > 0) {
                            fs.writeFileSync(path.join(fdsSubDir, \`_liste_fds_\${sub}.txt\`), pdfs.join('\\n'), 'utf-8');
                            pdfs.forEach(f => { try { fs.unlinkSync(path.join(fdsSubDir, f)); } catch(e){} });
                        }
                    }
                }`;

    srv = srv.replace(oldPattern, newBlock);
    
    // Branche Linux aussi
    srv = srv.replace(
        `-x "\${dataName}/fds/done/*.pdf"\``,
        `-x "\${dataName}/fds/done/*.pdf" -x "\${dataName}/fds/inbox/*.pdf" -x "\${dataName}/backups/*"\``
    );
    changes++;
    console.log('✅ Effet boule de neige corrigé');
} else if (srv.includes('Supprimer les backups precedents')) {
    console.log('⏭️  Boule de neige déjà corrigée');
} else {
    console.log('⚠️  Pattern boule de neige non trouvé — vérifier manuellement');
}

// ── 2. Réduire la rétention : 10 → 3 SQLite, 5 → 3 ZIP ──
if (srv.includes('.slice(10)')) {
    srv = srv.replace(
        /for \(const old of sqliteFiles\.slice\(10\)\)/g,
        'for (const old of sqliteFiles.slice(3))'
    );
    srv = srv.replace(
        /for \(const old of jsonFiles\.slice\(10\)\)/g,
        'for (const old of jsonFiles.slice(3))'
    );
    changes++;
    console.log('✅ Rétention SQLite/JSON : 10 → 3');
}

if (srv.includes('completeBackups.slice(5)')) {
    srv = srv.replace('completeBackups.slice(5)', 'completeBackups.slice(3)');
    changes++;
    console.log('✅ Rétention ZIP complets : 5 → 3');
}

// Sauvegarder si modifié
if (changes > 0) {
    fs.writeFileSync('server.js', srv);
    console.log(`\n💾 server.js sauvegardé (${changes} corrections)`);
} else {
    console.log('\nAucune modification nécessaire dans server.js');
}

// ── 3. Nettoyage immédiat du dossier backups ──
const backupDir = path.join(__dirname, '..', 'mfc-data', 'backups');
if (fs.existsSync(backupDir)) {
    const files = fs.readdirSync(backupDir);
    
    const sqlites = files.filter(f => f.endsWith('.sqlite')).sort().reverse();
    const jsons = files.filter(f => f.endsWith('.json')).sort().reverse();
    const zips = files.filter(f => f.endsWith('.zip')).sort().reverse();
    
    let deleted = 0;
    let freed = 0;
    
    function cleanOld(list, keep) {
        for (const f of list.slice(keep)) {
            const fp = path.join(backupDir, f);
            const size = fs.statSync(fp).size;
            fs.unlinkSync(fp);
            deleted++;
            freed += size;
        }
    }
    
    cleanOld(sqlites, 3);
    cleanOld(jsons, 3);
    cleanOld(zips, 3);
    
    // Taille restante
    let remaining = 0;
    fs.readdirSync(backupDir).forEach(f => {
        remaining += fs.statSync(path.join(backupDir, f)).size;
    });
    
    console.log(`\n🧹 Nettoyage backups/`);
    console.log(`   Supprimé : ${deleted} fichier(s) — ${Math.round(freed / 1024 / 1024)} Mo libérés`);
    console.log(`   Conservé : ${Math.min(sqlites.length, 3)} SQLite + ${Math.min(jsons.length, 3)} JSON + ${Math.min(zips.length, 3)} ZIP`);
    console.log(`   Taille restante : ${Math.round(remaining / 1024 / 1024)} Mo`);
} else {
    console.log('\n📁 Dossier backups/ non trouvé');
}

console.log('\n🔄 Redémarre le serveur.');
