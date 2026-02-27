/**
 * MFC Laboratoire — Sélecteur d'opérateur (barre de navigation)
 * Injecte un sélecteur dans la navbar + gère l'opérateur actif via localStorage
 * 
 * v5.25.5 : Écran de verrouillage — l'opérateur DOIT s'identifier avant de travailler.
 *           Seule la page operateurs.html reste accessible sans identification.
 */
(function() {
    const STORAGE_KEY = 'mfc_operator';

    // ── API publique ──

    window.mfcOperator = function() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null; } 
        catch(e) { return null; }
    };

    window.mfcSetOperator = function(op) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(op));
    };

    window.mfcLogActivity = async function(action, entityType, entityId, entityCode, detail) {
        const op = mfcOperator();
        try {
            await fetch('/api/activity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    operator_id: op?.id || null,
                    operator_name: op?.name || 'Non identifié',
                    action, entity_type: entityType,
                    entity_id: entityId || null,
                    entity_code: entityCode || null,
                    detail: detail || null
                })
            });
        } catch(e) { console.warn('Activity log failed:', e); }
    };

    // ── Écran de verrouillage ──

    function isOperateursPage() {
        return window.location.pathname.includes('operateurs');
    }

    function showLockScreen(operators) {
        if (isOperateursPage()) return;
        // Supprimer un éventuel ancien lock
        const old = document.getElementById('mfc-lock-screen');
        if (old) old.remove();

        // Remettre le masque CSS si absent (cas déconnexion)
        if (!document.getElementById('mfc-auth-wall')) {
            var s = document.createElement('style');
            s.id = 'mfc-auth-wall';
            s.textContent = 'body{visibility:hidden!important;}';
            document.head.appendChild(s);
        }

        const hasOps = operators && operators.length > 0;

        const overlay = document.createElement('div');
        overlay.id = 'mfc-lock-screen';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(30,28,25,0.92);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;font-family:"Segoe UI",system-ui,-apple-system,sans-serif;visibility:visible!important;';

        let btns = '';
        if (hasOps) {
            btns = operators.map(o => {
                const d = JSON.stringify({id:o.id,name:o.name,initials:o.initials}).replace(/"/g,'&quot;');
                return '<button class="lock-op-btn" data-op="' + d + '" style="display:flex;align-items:center;gap:0.8rem;padding:0.7rem 1rem;border:1px solid #e0d8cc;border-radius:10px;background:#fff;cursor:pointer;transition:all 0.15s;text-align:left;width:100%;font-size:0.88rem;">'
                    + '<span style="background:#d4a853;color:#fff;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:0.8rem;flex-shrink:0;">' + o.initials + '</span>'
                    + '<span style="color:#333;font-weight:500;">' + o.name + '</span>'
                    + '<span style="color:#aaa;font-size:0.72rem;margin-left:auto;">' + (o.role || '') + '</span>'
                    + '</button>';
            }).join('');
        }

        overlay.innerHTML = '<div style="background:#faf8f5;border-radius:16px;padding:2.5rem 2rem;max-width:380px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.4);text-align:center;border:1px solid #e8e0d4;">'
            + '<div style="font-size:2.5rem;margin-bottom:0.8rem;">🔒</div>'
            + '<h2 style="margin:0 0 0.3rem;color:#2c2c2c;font-size:1.3rem;font-weight:600;">MFC Laboratoire</h2>'
            + '<p style="color:#888;font-size:0.82rem;margin:0 0 1.5rem;">Identifiez-vous pour commencer</p>'
            + (hasOps
                ? '<div style="display:flex;flex-direction:column;gap:0.5rem;margin-bottom:1rem;">' + btns + '</div>'
                : '<div style="background:#fef9e7;padding:1rem;border-radius:8px;margin-bottom:1rem;border:1px solid #f0e6c8;font-size:0.82rem;color:#8a7340;">Aucun opérateur créé.<br><a href="operateurs.html" style="color:#d4a853;font-weight:600;">→ Créer un opérateur</a></div>')
            + '<p style="color:#bbb;font-size:0.68rem;margin:0.8rem 0 0;">Maison Française des Cires · Maître Cirier depuis 1904</p>'
            + '</div>';

        document.body.appendChild(overlay);

        // Hover + click
        overlay.querySelectorAll('.lock-op-btn').forEach(function(btn) {
            btn.addEventListener('mouseenter', function() { btn.style.borderColor='#d4a853'; btn.style.background='#fdfbf6'; });
            btn.addEventListener('mouseleave', function() { btn.style.borderColor='#e0d8cc'; btn.style.background='#fff'; });
            btn.addEventListener('click', function() {
                var op = JSON.parse(btn.dataset.op);
                mfcSetOperator(op);
                btn.style.borderColor = '#27ae60';
                btn.style.background = '#e8f5e9';
                btn.querySelector('span').style.background = '#27ae60';
                setTimeout(function() {
                    overlay.style.opacity = '0';
                    overlay.style.transition = 'opacity 0.3s';
                    setTimeout(function() {
                        overlay.remove();
                        // Retirer le masque CSS anti-flash
                        var wall = document.getElementById('mfc-auth-wall');
                        if (wall) wall.remove();
                        updateNavbarSelector(op);
                        document.getElementById('mfc-operator-logout').style.display = '';
                    }, 300);
                }, 400);
                mfcLogActivity('connexion', 'opérateur', op.id, op.initials, op.name + ' connecté');
            });
        });
    }

    function updateNavbarSelector(op) {
        var sel = document.getElementById('mfc-operator-select');
        if (!sel || !op) return;
        for (var i = 0; i < sel.options.length; i++) {
            try {
                var v = JSON.parse(sel.options[i].value);
                if (v.id === op.id) { sel.selectedIndex = i; break; }
            } catch(e) {}
        }
    }

    // ── Init ──

    document.addEventListener('DOMContentLoaded', async function() {
        var navbar = document.querySelector('.navbar-menu');
        if (!navbar) return;

        // Créer le sélecteur navbar
        var container = document.createElement('div');
        container.style.cssText = 'display:flex;align-items:center;gap:4px;margin-left:0.5rem;padding-left:0.5rem;border-left:1px solid rgba(212,168,83,0.3);';
        container.innerHTML = '<span style="font-size:0.68rem;color:#999;">👤</span>'
            + '<select id="mfc-operator-select" style="padding:0.25rem 0.4rem;border:1px solid #d4c5b0;border-radius:12px;font-size:0.7rem;background:#faf8f5;color:#333;outline:none;max-width:130px;cursor:pointer;">'
            + '<option value="">Opérateur...</option></select>'
            + '<button id="mfc-operator-logout" style="font-size:0.65rem;color:#e74c3c;background:none;border:none;cursor:pointer;padding:2px;display:none;" title="Se déconnecter">🚪</button>'
            + '<a href="operateurs.html" style="font-size:0.65rem;color:#d4a853;text-decoration:none;" title="Gérer les opérateurs">⚙️</a>';
        navbar.appendChild(container);

        // Charger les opérateurs
        var operators = [];
        try {
            var r = await fetch('/api/operators');
            operators = (await r.json()).filter(function(o) { return o.active; });
        } catch(e) { console.warn('Operators load failed:', e); }

        var sel = document.getElementById('mfc-operator-select');
        operators.forEach(function(o) {
            var opt = document.createElement('option');
            opt.value = JSON.stringify({ id: o.id, name: o.name, initials: o.initials });
            opt.textContent = o.initials + ' — ' + o.name;
            sel.appendChild(opt);
        });

        // Restaurer la sélection
        var current = mfcOperator();
        if (current) {
            // Vérifier que l'opérateur existe toujours
            var exists = operators.some(function(o) { return o.id === current.id; });
            if (exists) {
                updateNavbarSelector(current);
                document.getElementById('mfc-operator-logout').style.display = '';
            } else {
                // Opérateur supprimé/désactivé
                localStorage.removeItem(STORAGE_KEY);
                current = null;
            }
        }

        // Changement depuis navbar
        sel.addEventListener('change', function() {
            if (sel.value) {
                var op = JSON.parse(sel.value);
                mfcSetOperator(op);
                sel.style.borderColor = '#27ae60';
                document.getElementById('mfc-operator-logout').style.display = '';
                setTimeout(function() { sel.style.borderColor = '#d4c5b0'; }, 1000);
                mfcLogActivity('changement_opérateur', 'opérateur', op.id, op.initials, 'Changé vers ' + op.name);
            } else {
                localStorage.removeItem(STORAGE_KEY);
                document.getElementById('mfc-operator-logout').style.display = 'none';
                showLockScreen(operators);
            }
        });

        // Bouton déconnexion
        document.getElementById('mfc-operator-logout').addEventListener('click', function() {
            var op = mfcOperator();
            if (op) mfcLogActivity('déconnexion', 'opérateur', op.id, op.initials, op.name + ' déconnecté');
            localStorage.removeItem(STORAGE_KEY);
            sel.selectedIndex = 0;
            document.getElementById('mfc-operator-logout').style.display = 'none';
            showLockScreen(operators);
        });

        // ── VERROUILLAGE ──
        if (!current && !isOperateursPage()) {
            showLockScreen(operators);
        }
    });
})();
