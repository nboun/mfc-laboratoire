/**
 * MFC Laboratoire — Toggle thème sombre/clair
 * Sauvegardé en localStorage, appliqué avant le premier rendu
 */

(function() {
    // Appliquer le thème sauvegardé immédiatement (avant DOMContentLoaded)
    const saved = localStorage.getItem('mfc_theme');
    if (saved === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
    
    // Injecter le bouton toggle dans la navbar une fois le DOM prêt
    document.addEventListener('DOMContentLoaded', function() {
        const navbar = document.querySelector('.navbar-menu');
        if (!navbar) return;
        
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        
        const btn = document.createElement('button');
        btn.className = 'theme-toggle';
        btn.id = 'theme-toggle';
        btn.title = isDark ? 'Mode clair' : 'Mode sombre';
        btn.innerHTML = isDark ? '☀️' : '🌙';
        btn.setAttribute('aria-label', 'Basculer le thème');
        
        btn.addEventListener('click', function() {
            const current = document.documentElement.getAttribute('data-theme');
            if (current === 'dark') {
                document.documentElement.removeAttribute('data-theme');
                localStorage.setItem('mfc_theme', 'light');
                btn.innerHTML = '🌙';
                btn.title = 'Mode sombre';
            } else {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('mfc_theme', 'dark');
                btn.innerHTML = '☀️';
                btn.title = 'Mode clair';
            }
        });
        
        // Insérer avant le premier lien de la navbar
        navbar.insertBefore(btn, navbar.firstChild);
    });
})();
