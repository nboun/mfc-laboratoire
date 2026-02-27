#!/data/data/com.termux/files/usr/bin/bash
# MFC Laboratoire — Lancement rapide
# Usage: bash mfc.sh  ou  bash mfc.sh update

cd ~/mfc-laboratoire 2>/dev/null || { echo "❌ mfc-laboratoire non trouvé. Lance d'abord update-termux.sh"; exit 1; }

if [ "$1" = "update" ]; then
    bash update-termux.sh "$2"
    exit 0
fi

# Créer mfc-data si besoin
mkdir -p ~/mfc-data

echo "🕯️ MFC Laboratoire v$(node -e "console.log(require('./package.json').version)")"
echo "   Base: ~/mfc-data/database.sqlite"
echo ""

node server.js
