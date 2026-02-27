#!/data/data/com.termux/files/usr/bin/bash
# ══════════════════════════════════════════════════════
#  MFC LABORATOIRE — Lancement automatique complet
#  Maison Française des Cires — Maître Cirier depuis 1904
#
#  Ce script :
#  1. Tue tout ancien serveur MFC
#  2. Lance le serveur Node.js
#  3. Attend qu'il soit prêt
#  4. Ouvre automatiquement Chrome sur localhost:3000
# ══════════════════════════════════════════════════════

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

clear
echo ""
echo -e "${CYAN}  ╔══════════════════════════════════════╗${NC}"
echo -e "${CYAN}  ║${NC}  ${BOLD}🕯️  MFC LABORATOIRE${NC}                  ${CYAN}║${NC}"
echo -e "${CYAN}  ║${NC}     Maître Cirier depuis 1904        ${CYAN}║${NC}"
echo -e "${CYAN}  ╚══════════════════════════════════════╝${NC}"
echo ""

MFC_DIR="$HOME/mfc-laboratoire"
PORT=3000

# Vérifier que le dossier existe
if [ ! -d "$MFC_DIR" ]; then
    echo -e "${RED}  ✗ Dossier $MFC_DIR introuvable !${NC}"
    echo -e "    Lancez d'abord ${YELLOW}install-termux.sh${NC}"
    exit 1
fi

cd "$MFC_DIR"

# Vérifier node_modules
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}  ⏳ Première utilisation — installation des dépendances...${NC}"
    npm install > /dev/null 2>&1
    echo -e "${GREEN}  ✓ Dépendances installées${NC}"
fi

# Tuer ancien serveur si actif
if pgrep -f "node server.js" > /dev/null 2>&1; then
    echo -e "${YELLOW}  ⏳ Arrêt de l'ancien serveur...${NC}"
    pkill -f "node server.js" 2>/dev/null
    sleep 1
fi

# Lancer le serveur en arrière-plan
echo -e "${YELLOW}  ⏳ Démarrage du serveur...${NC}"
node server.js > "$MFC_DIR/mfc.log" 2>&1 &
SERVER_PID=$!

# Attendre que le serveur soit prêt (max 15 secondes)
READY=0
for i in $(seq 1 30); do
    sleep 0.5
    if curl -s http://localhost:$PORT > /dev/null 2>&1; then
        READY=1
        break
    fi
done

if [ $READY -eq 0 ]; then
    echo -e "${RED}  ✗ Le serveur ne répond pas après 15 secondes${NC}"
    echo -e "    Vérifiez les logs : ${YELLOW}cat $MFC_DIR/mfc.log${NC}"
    exit 1
fi

echo -e "${GREEN}  ✓ Serveur démarré ! (PID: $SERVER_PID)${NC}"
echo ""

# Ouvrir Chrome automatiquement
echo -e "${YELLOW}  ⏳ Ouverture du navigateur...${NC}"
am start -a android.intent.action.VIEW -d "http://localhost:$PORT" > /dev/null 2>&1

echo -e "${GREEN}  ✓ Chrome ouvert sur http://localhost:$PORT${NC}"
echo ""
echo -e "${CYAN}  ─────────────────────────────────────${NC}"
echo -e "  ${BOLD}Serveur actif.${NC} Le navigateur s'est ouvert."
echo ""
echo -e "  ${YELLOW}Commandes utiles :${NC}"
echo -e "    Ctrl+C        → Arrêter le serveur"
echo -e "    mfc-stop      → Arrêter depuis un autre terminal"
echo -e "    mfc-status     → Vérifier l'état"
echo ""
echo -e "${CYAN}  ─────────────────────────────────────${NC}"
echo ""

# Ramener les logs au premier plan (le serveur tourne en arrière-plan)
# Mais on le fait proprement : on attend que le processus finisse
wait $SERVER_PID 2>/dev/null
