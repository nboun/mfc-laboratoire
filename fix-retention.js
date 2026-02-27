/**
 * Réduit la rétention des backups à 3
 * Usage : node fix-retention.js
 * Depuis mfc-laboratoire/
 */
const fs = require('fs');
let srv = fs.readFileSync('server.js', 'utf8');
let count = 0;

// Chercher toutes les variantes possibles
const replacements = [
    ['.slice(10)', '.slice(3)'],
    ['.slice(5)', '.slice(3)'],
];

for (const [old, nw] of replacements) {
    const before = srv;
    srv = srv.split(old).join(nw);
    if (srv !== before) {
        const nb = before.split(old).length - 1;
        console.log(`✅ ${old} → ${nw}  (${nb} occurrence(s))`);
        count += nb;
    }
}

if (count > 0) {
    fs.writeFileSync('server.js', srv);
    console.log(`\n💾 server.js sauvegardé — rétention réduite à 3 backups max`);
} else {
    console.log('Aucun .slice(10) ou .slice(5) trouvé.');
    console.log('Peut-être déjà corrigé ? Vérifie avec :');
    console.log('  node -e "console.log(require(\'fs\').readFileSync(\'server.js\',\'utf8\').match(/slice\\(\\d+\\)/g))"');
}

console.log('\n🔄 Redémarre le serveur.');
