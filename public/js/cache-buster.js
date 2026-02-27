/**
 * MFC Laboratoire — Cache Buster v3 (Nuclear)
 * Purge TOUT : Service Workers, caches, et force reload si version change.
 */
(async function() {
    // 1. Toujours désenregistrer les Service Workers
    if ('serviceWorker' in navigator) {
        try {
            const regs = await navigator.serviceWorker.getRegistrations();
            for (const reg of regs) await reg.unregister();
        } catch(e) {}
    }

    // 2. Toujours purger les caches
    if ('caches' in window) {
        try {
            const keys = await caches.keys();
            for (const k of keys) await caches.delete(k);
        } catch(e) {}
    }

    // 3. Vérifier la version et reload si nécessaire
    try {
        const res = await fetch('/api/version?t=' + Date.now(), { cache: 'no-store' });
        if (!res.ok) return;
        const { version } = await res.json();
        const cached = localStorage.getItem('mfc-v');
        
        if (cached && cached !== version) {
            localStorage.setItem('mfc-v', version);
            sessionStorage.clear();
            window.location.replace(window.location.pathname + '?v=' + Date.now());
            return;
        }
        localStorage.setItem('mfc-v', version);
    } catch(e) {}
})();
