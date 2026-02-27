#!/bin/bash
# MFC Laboratoire — Installation COMPLETE Termux
# Copie-colle cette SEULE commande dans Termux :
# curl -sL https://raw.githubusercontent.com/... | bash
# OU : bash install.sh

echo "🕯️ MFC Laboratoire — Installation automatique"
echo ""

# 1. Installer les outils nécessaires
echo "[1/5] Installation des outils..."
pkg update -y 2>/dev/null
pkg install -y nodejs unzip 2>/dev/null

# 2. Activer stockage
echo "[2/5] Accès au stockage..."
termux-setup-storage 2>/dev/null
sleep 2

# 3. Sauvegarder la base si elle existe
echo "[3/5] Sauvegarde données..."
mkdir -p ~/mfc-data
if [ -f ~/mfc-laboratoire/database.sqlite ]; then
    cp ~/mfc-laboratoire/database.sqlite ~/mfc-data/
    echo "  ✓ Base sauvegardée"
fi

# 4. Trouver et installer le ZIP
echo "[4/5] Installation..."
ZIP=$(ls -t ~/storage/downloads/mfc-laboratoire*.zip ~/storage/shared/Download/mfc-laboratoire*.zip 2>/dev/null | head -1)

if [ -z "$ZIP" ]; then
    echo "❌ ZIP non trouvé dans Downloads"
    echo ""
    echo "Télécharge le ZIP depuis Claude sur ton téléphone"
    echo "puis relance : bash install.sh"
    exit 1
fi

echo "  ZIP: $ZIP"
rm -rf ~/mfc-laboratoire
cd ~
unzip -qo "$ZIP"

# 5. npm install
echo "[5/5] Dépendances..."
cd ~/mfc-laboratoire
npm install --no-optional 2>&1 | tail -1

echo ""
echo "════════════════════════════════════"
echo "  ✅ MFC v$(node -e "console.log(require('./package.json').version)") installé !"
echo ""
echo "  Pour lancer : node ~/mfc-laboratoire/server.js"
echo "════════════════════════════════════"
