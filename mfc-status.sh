#!/data/data/com.termux/files/usr/bin/bash
# Statut du serveur MFC
if pgrep -f "node server.js" > /dev/null 2>&1; then
    PID=$(pgrep -f "node server.js")
    echo "✓ Serveur MFC actif (PID: $PID)"
    echo "  → http://localhost:3000"
    echo ""
    echo "Dernières lignes de log :"
    tail -5 ~/mfc-laboratoire/mfc.log 2>/dev/null
else
    echo "✗ Serveur MFC inactif"
    echo "  Lancez : mfc-start"
fi
