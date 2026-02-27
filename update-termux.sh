#!/data/data/com.termux/files/usr/bin/bash
# ══════════════════════════════════════════════════════
#  MFC Laboratoire — Mise à jour automatique Termux
#  Usage: bash update-termux.sh [chemin_vers_zip]
# ══════════════════════════════════════════════════════

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}══════════════════════════════════════════${NC}"
echo -e "${YELLOW}  MFC Laboratoire — Mise à jour Termux${NC}"
echo -e "${YELLOW}══════════════════════════════════════════${NC}"
echo ""

APP_DIR="$HOME/mfc-laboratoire"
DATA_DIR="$HOME/mfc-data"
ZIP_PATH="$1"

# ── 1. Trouver le ZIP ──
if [ -z "$ZIP_PATH" ]; then
    # Chercher dans Downloads
    echo -e "${YELLOW}[1/6]${NC} Recherche du ZIP..."
    
    # Chercher le zip le plus récent
    ZIP_PATH=$(ls -t ~/storage/downloads/mfc-laboratoire-v*.zip 2>/dev/null | head -1)
    
    if [ -z "$ZIP_PATH" ]; then
        ZIP_PATH=$(ls -t ~/storage/shared/Download/mfc-laboratoire-v*.zip 2>/dev/null | head -1)
    fi
    
    if [ -z "$ZIP_PATH" ]; then
        echo -e "${RED}❌ Aucun ZIP trouvé dans Downloads${NC}"
        echo "   Télécharge le ZIP depuis Claude, puis relance :"
        echo "   bash update-termux.sh ~/storage/downloads/mfc-laboratoire-v5.25.7.zip"
        exit 1
    fi
fi

echo -e "${GREEN}   ✓ ZIP trouvé : $ZIP_PATH${NC}"

# ── 2. Sauvegarder les données ──
echo -e "${YELLOW}[2/6]${NC} Sauvegarde des données..."

mkdir -p "$DATA_DIR"

# Migrer l'ancienne base si elle existe
if [ -f "$APP_DIR/database.sqlite" ] && [ ! -f "$DATA_DIR/database.sqlite" ]; then
    cp "$APP_DIR/database.sqlite" "$DATA_DIR/database.sqlite"
    echo -e "${GREEN}   ✓ Base migrée vers mfc-data/${NC}"
elif [ -f "$DATA_DIR/database.sqlite" ]; then
    echo -e "${GREEN}   ✓ Base déjà dans mfc-data/ ($(du -h "$DATA_DIR/database.sqlite" | cut -f1))${NC}"
else
    echo -e "${YELLOW}   ℹ Première installation — pas de base à migrer${NC}"
fi

# Sauvegarder uploads si existent
if [ -d "$APP_DIR/uploads" ] && [ "$(ls -A "$APP_DIR/uploads" 2>/dev/null)" ]; then
    cp -r "$APP_DIR/uploads" "$DATA_DIR/uploads_backup" 2>/dev/null
    echo -e "${GREEN}   ✓ Uploads sauvegardés${NC}"
fi

# ── 3. Supprimer l'ancienne version ──
echo -e "${YELLOW}[3/6]${NC} Suppression ancienne version..."
if [ -d "$APP_DIR" ]; then
    rm -rf "$APP_DIR"
    echo -e "${GREEN}   ✓ Ancien répertoire supprimé${NC}"
fi

# ── 4. Dézipper ──
echo -e "${YELLOW}[4/6]${NC} Installation nouvelle version..."
cd "$HOME"
unzip -qo "$ZIP_PATH"
echo -e "${GREEN}   ✓ Dézippé${NC}"

# ── 5. npm install ──
echo -e "${YELLOW}[5/6]${NC} Installation des dépendances (npm)..."
cd "$APP_DIR"
npm install --no-optional 2>&1 | tail -3
echo -e "${GREEN}   ✓ Dépendances installées${NC}"

# ── 6. Vérification ──
echo -e "${YELLOW}[6/6]${NC} Vérification..."
VERSION=$(node -e "console.log(require('./package.json').version)" 2>/dev/null)
echo -e "${GREEN}   ✓ Version installée : ${VERSION}${NC}"

if [ -f "$DATA_DIR/database.sqlite" ]; then
    echo -e "${GREEN}   ✓ Base de données : $DATA_DIR/database.sqlite${NC}"
fi

echo ""
echo -e "${GREEN}══════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Mise à jour terminée ! v${VERSION}${NC}"
echo -e "${GREEN}══════════════════════════════════════════${NC}"
echo ""
echo -e "  Lancer l'app :  ${YELLOW}cd ~/mfc-laboratoire && node server.js${NC}"
echo ""
