#!/bin/bash
# ══════════════════════════════════════
# MFC Laboratoire — Install Termux
# UNE SEULE COMMANDE : bash go.sh
# ══════════════════════════════════════

echo "🕯️ Installation MFC Laboratoire..."

# Outils
pkg update -y 2>/dev/null
pkg install -y nodejs unzip 2>/dev/null

# Stockage
termux-setup-storage 2>/dev/null
sleep 3

# Trouver le ZIP
Z=""
for D in ~/storage/downloads ~/storage/shared/Download ~/Download; do
  F=$(ls -t $D/mfc-laboratoire*.zip 2>/dev/null | head -1)
  [ -n "$F" ] && Z="$F" && break
done

if [ -z "$Z" ]; then
  echo "❌ ZIP pas trouvé dans Downloads"
  echo "Télécharge le ZIP depuis Claude puis relance: bash go.sh"
  exit 1
fi

echo "✓ ZIP: $Z"

# Sauver la base
mkdir -p ~/mfc-data
[ -f ~/mfc-laboratoire/database.sqlite ] && cp ~/mfc-laboratoire/database.sqlite ~/mfc-data/

# Nettoyer + installer
rm -rf ~/mfc-laboratoire
cd ~ && unzip -qo "$Z"
cd ~/mfc-laboratoire && npm install 2>&1 | tail -1

echo ""
echo "✅ MFC v$(node -e "console.log(require('./package.json').version)") prêt !"
echo ""
echo "Lance maintenant: node ~/mfc-laboratoire/server.js"
