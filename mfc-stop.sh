#!/data/data/com.termux/files/usr/bin/bash
# Arrêt du serveur MFC
if pgrep -f "node server.js" > /dev/null 2>&1; then
    pkill -f "node server.js"
    echo "✓ Serveur MFC arrêté"
else
    echo "ℹ Aucun serveur MFC actif"
fi
