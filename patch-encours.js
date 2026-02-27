/**
 * Patch Encours — Remplace "Parfums les plus formulés" par bloc Encours combiné
 * Usage : node patch-encours.js   (depuis mfc-laboratoire/)
 */
const fs = require('fs');

// ═══════════════════════════════════════
// 1. PATCH SERVER.JS — Ajouter formulations en cours
// ═══════════════════════════════════════
let srv = fs.readFileSync('server.js', 'utf8');
let srvChanges = 0;

// Ajouter pending_formulations après pending_samples
if (!srv.includes('pending_formulations')) {
    srv = srv.replace(
        `WHERE s.status IN ('demande', 'en_cours')
             ORDER BY s.created_at ASC LIMIT 15`
        + `\`
        );`,
        `WHERE s.status IN ('demande', 'en_cours')
             ORDER BY s.created_at ASC LIMIT 15`
        + `\`
        );

// ── Formulations en cours ──
        const pending_formulations = await db.all(
            \`SELECT f.code, f.name, f.fragrance_name, f.status, f.created_at,
                    f.wax_type, f.wick_ref
             FROM formulations f
             WHERE f.status NOT IN ('validé', 'annulé', 'archivé')
             ORDER BY f.created_at DESC LIMIT 15\`
        );`
    );

    // Ajouter pending_formulations dans la réponse JSON
    srv = srv.replace(
        'pending_samples,\n            active_tests,',
        'pending_formulations,\n            pending_samples,\n            active_tests,'
    );

    srvChanges++;
    console.log('✅ server.js : requête pending_formulations ajoutée');
} else {
    console.log('⏭️  server.js : pending_formulations existe déjà');
}

if (srvChanges > 0) {
    fs.writeFileSync('server.js', srv);
    console.log('💾 server.js sauvegardé');
}

// ═══════════════════════════════════════
// 2. PATCH INDEX.HTML — Remplacer le bloc Top Parfums
// ═══════════════════════════════════════
let html = fs.readFileSync('public/index.html', 'utf8');

// Remplacer le card "Parfums les plus formulés"
const oldCard = `<div class="card">
                <div class="card-header"><h3 class="card-title">🌸 Parfums les plus formulés</h3></div>
                <div id="top-fragrances" style="padding:0 0.5rem;">
                    <div class="loading"><div class="spinner"></div></div>
                </div>
            </div>`;

const newCard = `<div class="card" style="border-left:3px solid #e67e22;">
                <div class="card-header"><h3 class="card-title">📋 Encours</h3></div>
                <div id="encours-panel" style="padding:0 0.5rem;max-height:400px;overflow-y:auto;">
                    <div class="loading"><div class="spinner"></div></div>
                </div>
            </div>`;

if (html.includes('Parfums les plus formulés')) {
    html = html.replace(oldCard, newCard);
    console.log('✅ index.html : carte Encours remplace Top Parfums');
} else {
    console.log('⚠️  Carte "Parfums les plus formulés" non trouvée — vérifier manuellement');
}

// Remplacer le JS qui peuplait top-fragrances
const oldJS = `// Top parfums
                const fragEl = document.getElementById('top-fragrances');
                if (d.top_fragrances?.length) {
                    fragEl.innerHTML = d.top_fragrances.map((f, i) => \`
                        <div style="display:flex;align-items:center;padding:0.4rem 0;border-bottom:1px solid #f0ebe3;">
                            <span style="font-size:0.75rem;color:#999;min-width:24px;text-align:center;">\${i+1}.</span>
                            <span style="flex:1;font-size:0.82rem;font-weight:500;">🌸 \${f.name}\${f.pct ? ' <span style="color:#999;font-size:0.72rem;">'+f.pct+'%</span>' : ''}</span>
                            <span style="font-size:0.82rem;font-weight:700;color:var(--mfc-cire);min-width:30px;text-align:right;">\${f.count}</span>
                        </div>
                    \`).join('');
                } else {
                    fragEl.innerHTML = '<div style="padding:1rem;text-align:center;color:#999;font-size:0.82rem;">Aucune formulation encore</div>';
                }`;

const newJS = `// Encours combiné
                const encPanel = document.getElementById('encours-panel');
                const encSections = [];
                
                // Formulations en cours
                if (d.pending_formulations?.length) {
                    encSections.push('<div style="padding:0.3rem 0 0.15rem;font-size:0.72rem;font-weight:700;color:#e67e22;text-transform:uppercase;letter-spacing:0.5px;">🧪 Formulations</div>');
                    encSections.push(...d.pending_formulations.map(f => \`
                        <div style="display:flex;align-items:center;padding:0.3rem 0;border-bottom:1px solid #f0ebe3;">
                            <span style="flex:1;font-size:0.8rem;">\${f.code || '—'} · \${f.fragrance_name || f.name || '—'}</span>
                            <span style="font-size:0.7rem;padding:2px 6px;border-radius:8px;background:\${f.status==='brouillon'?'#fff3e0':'#e3f2fd'};color:\${f.status==='brouillon'?'#e65100':'#1565c0'};">\${f.status || 'brouillon'}</span>
                        </div>
                    \`));
                }
                
                // Tests en cours
                if (d.active_tests?.length) {
                    encSections.push('<div style="padding:0.5rem 0 0.15rem;font-size:0.72rem;font-weight:700;color:#c62828;text-transform:uppercase;letter-spacing:0.5px;">🔥 Tests de combustion</div>');
                    encSections.push(...d.active_tests.map(t => \`
                        <div style="display:flex;align-items:center;padding:0.3rem 0;border-bottom:1px solid #f0ebe3;">
                            <span style="flex:1;font-size:0.8rem;">\${t.test_number || '—'} · \${t.fragrance_name || t.formulation_name || '—'}</span>
                            <span style="font-size:0.7rem;color:#666;">\${t.total_burn_time ? t.total_burn_time+'h' : 'démarré'}</span>
                        </div>
                    \`));
                }
                
                // Échantillons en attente
                if (d.pending_samples?.length) {
                    encSections.push('<div style="padding:0.5rem 0 0.15rem;font-size:0.72rem;font-weight:700;color:#2e7d32;text-transform:uppercase;letter-spacing:0.5px;">📦 Échantillons</div>');
                    encSections.push(...d.pending_samples.map(s => \`
                        <div style="display:flex;align-items:center;padding:0.3rem 0;border-bottom:1px solid #f0ebe3;">
                            <span style="flex:1;font-size:0.8rem;">\${s.sample_number || '—'} · \${s.fragrance_name || '—'}\${s.client_name ? ' <span style="color:#999;font-size:0.72rem;">— '+s.client_name+'</span>' : ''}</span>
                            <span style="font-size:0.7rem;padding:2px 6px;border-radius:8px;background:\${s.status==='demande'?'#fce4ec':'#fff8e1'};color:\${s.status==='demande'?'#c62828':'#f57f17'};">\${s.status}</span>
                        </div>
                    \`));
                }
                
                if (encSections.length > 0) {
                    encPanel.innerHTML = encSections.join('');
                } else {
                    encPanel.innerHTML = '<div style="padding:1.5rem;text-align:center;color:#999;font-size:0.82rem;">✨ Aucun encours — tout est à jour !</div>';
                }`;

if (html.includes('// Top parfums')) {
    html = html.replace(oldJS, newJS);
    console.log('✅ index.html : JS encours remplace JS top parfums');
} else {
    console.log('⚠️  JS "Top parfums" non trouvé — vérifier manuellement');
}

fs.writeFileSync('public/index.html', html);
console.log('💾 index.html sauvegardé');

console.log('\n🔄 Redémarre le serveur.');
