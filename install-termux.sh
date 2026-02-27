#!/data/data/com.termux/files/usr/bin/bash
# ══════════════════════════════════════════════════════════
#  MFC LABORATOIRE — Installation automatique COMPLÈTE
#  Maison Française des Cires — Maître Cirier depuis 1904
#
#  Ce script installe tout :
#  ✓ Node.js + dépendances
#  ✓ L'application MFC Laboratoire
#  ✓ Widget écran d'accueil (lancement en 1 tap)
#  ✓ Démarrage auto quand Termux s'ouvre
#  ✓ Commandes rapides : mfc-start, mfc-stop, mfc-status
#  ✓ Ouverture automatique de Chrome
# ══════════════════════════════════════════════════════════

clear
echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║     🕯️  MFC LABORATOIRE                  ║"
echo "  ║     Installation automatique COMPLÈTE    ║"
echo "  ║     Maître Cirier depuis 1904            ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""

# ──────────────────────────────────────────────
# 1. Mise à jour Termux + installation paquets
# ──────────────────────────────────────────────
echo "⏳ [1/7] Mise à jour de Termux..."
pkg update -y > /dev/null 2>&1
pkg upgrade -y > /dev/null 2>&1
echo "✓ Termux à jour"

echo "⏳ [2/7] Installation de Node.js + outils..."
pkg install nodejs termux-api unzip curl -y > /dev/null 2>&1
echo "✓ Node.js $(node -v 2>/dev/null || echo '?') installé"

# ──────────────────────────────────────────────
# 2. Accès au stockage
# ──────────────────────────────────────────────
echo "⏳ [3/7] Configuration du stockage..."
if [ ! -d ~/storage ]; then
    termux-setup-storage
    sleep 3
fi
echo "✓ Stockage configuré"

# ──────────────────────────────────────────────
# 3. Trouver et installer l'application
# ──────────────────────────────────────────────
echo "⏳ [4/7] Recherche de mfc-laboratoire.zip..."

ZIP_FOUND=""
for dir in ~/storage/downloads ~/storage/shared/Download ~/storage/shared/Downloads ~/storage/shared; do
    if [ -f "$dir/mfc-laboratoire.zip" ]; then
        ZIP_FOUND="$dir/mfc-laboratoire.zip"
        break
    fi
done

if [ -z "$ZIP_FOUND" ]; then
    ZIP_FOUND=$(find ~/storage -name "mfc-laboratoire.zip" 2>/dev/null | head -1)
fi

if [ -z "$ZIP_FOUND" ]; then
    echo ""
    echo "  ⚠ Fichier mfc-laboratoire.zip introuvable !"
    echo ""
    echo "  Téléchargez-le depuis la conversation Claude,"
    echo "  puis relancez ce script."
    echo ""
    exit 1
fi

echo "✓ Trouvé : $ZIP_FOUND"

# Nettoyer et installer
rm -rf ~/mfc-laboratoire 2>/dev/null
cp "$ZIP_FOUND" ~/mfc-laboratoire.zip
cd ~
unzip -o mfc-laboratoire.zip > /dev/null 2>&1
rm -f mfc-laboratoire.zip
echo "✓ Application décompressée"

# ──────────────────────────────────────────────
# 4. Installer dépendances Node.js
# ──────────────────────────────────────────────
echo "⏳ [5/7] Installation des dépendances npm..."
cd ~/mfc-laboratoire
npm install > /dev/null 2>&1
echo "✓ Dépendances installées"

# ──────────────────────────────────────────────
# 5. Rendre les scripts exécutables
# ──────────────────────────────────────────────
echo "⏳ [6/7] Configuration des scripts..."
chmod +x ~/mfc-laboratoire/mfc-start.sh 2>/dev/null
chmod +x ~/mfc-laboratoire/mfc-stop.sh 2>/dev/null
chmod +x ~/mfc-laboratoire/mfc-status.sh 2>/dev/null

# ──────────────────────────────────────────────
# 6. Créer les commandes globales
# ──────────────────────────────────────────────

BINDIR="$PREFIX/bin"

cat > "$BINDIR/mfc-start" << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash
exec ~/mfc-laboratoire/mfc-start.sh "$@"
EOF
chmod +x "$BINDIR/mfc-start"

cat > "$BINDIR/mfc-stop" << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash
exec ~/mfc-laboratoire/mfc-stop.sh "$@"
EOF
chmod +x "$BINDIR/mfc-stop"

cat > "$BINDIR/mfc-status" << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash
exec ~/mfc-laboratoire/mfc-status.sh "$@"
EOF
chmod +x "$BINDIR/mfc-status"

# Auto-start dans .bashrc
BASHRC="$HOME/.bashrc"
touch "$BASHRC"
# Retirer anciens blocs MFC si présents
sed -i '/# --- MFC LABORATOIRE AUTO ---/,/# --- FIN MFC AUTO ---/d' "$BASHRC" 2>/dev/null

cat >> "$BASHRC" << 'BASHBLOCK'
# --- MFC LABORATOIRE AUTO ---
if ! pgrep -f "node server.js" > /dev/null 2>&1; then
    echo ""
    echo "  🕯️  Démarrage de MFC Laboratoire..."
    cd ~/mfc-laboratoire 2>/dev/null && {
        [ ! -d "node_modules" ] && npm install > /dev/null 2>&1
        node server.js > ~/mfc-laboratoire/mfc.log 2>&1 &
        _MFC_PID=$!
        for _i in $(seq 1 20); do
            sleep 0.5
            curl -s http://localhost:3000 > /dev/null 2>&1 && break
        done
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            echo "  ✓ Serveur MFC actif → http://localhost:3000"
            am start -a android.intent.action.VIEW -d "http://localhost:3000" > /dev/null 2>&1
            echo "  ✓ Chrome ouvert"
        else
            echo "  ✗ Erreur — voir: cat ~/mfc-laboratoire/mfc.log"
        fi
        cd ~ 2>/dev/null
    }
    echo ""
else
    echo ""
    echo "  🕯️  MFC Laboratoire déjà actif → http://localhost:3000"
    echo ""
fi
# --- FIN MFC AUTO ---
BASHBLOCK

echo "✓ Démarrage automatique configuré"

# ──────────────────────────────────────────────
# 7. Widget + Boot
# ──────────────────────────────────────────────
echo "⏳ [7/7] Configuration du widget et raccourcis..."

# Widget : lancement en 1 tap depuis l'écran d'accueil
mkdir -p ~/.shortcuts
cat > ~/.shortcuts/MFC-Labo.sh << 'WIDGET'
#!/data/data/com.termux/files/usr/bin/bash
cd ~/mfc-laboratoire 2>/dev/null || exit 1
if pgrep -f "node server.js" > /dev/null 2>&1; then
    am start -a android.intent.action.VIEW -d "http://localhost:3000" > /dev/null 2>&1
else
    [ ! -d "node_modules" ] && npm install > /dev/null 2>&1
    node server.js > ~/mfc-laboratoire/mfc.log 2>&1 &
    for i in $(seq 1 20); do sleep 0.5; curl -s http://localhost:3000 > /dev/null 2>&1 && break; done
    am start -a android.intent.action.VIEW -d "http://localhost:3000" > /dev/null 2>&1
fi
WIDGET
chmod +x ~/.shortcuts/MFC-Labo.sh

# Boot : démarrage au boot du téléphone (si Termux:Boot installé)
mkdir -p ~/.termux/boot
cat > ~/.termux/boot/mfc-autostart << 'BOOT'
#!/data/data/com.termux/files/usr/bin/bash
termux-wake-lock 2>/dev/null
cd ~/mfc-laboratoire 2>/dev/null || exit 1
[ ! -d "node_modules" ] && npm install > /dev/null 2>&1
node server.js > ~/mfc-laboratoire/mfc.log 2>&1 &
BOOT
chmod +x ~/.termux/boot/mfc-autostart

echo "✓ Widget et boot configurés"

# ──────────────────────────────────────────────
# TERMINÉ !
# ──────────────────────────────────────────────
echo ""
echo "  ╔══════════════════════════════════════════════╗"
echo "  ║  ✓ INSTALLATION TERMINÉE !                   ║"
echo "  ╠══════════════════════════════════════════════╣"
echo "  ║                                              ║"
echo "  ║  🚀 CE QUI EST CONFIGURÉ :                   ║"
echo "  ║                                              ║"
echo "  ║  ✓ Serveur + Chrome auto à chaque            ║"
echo "  ║    ouverture de Termux                       ║"
echo "  ║                                              ║"
echo "  ║  ✓ Widget 'MFC-Labo' pour l'écran            ║"
echo "  ║    d'accueil (installer Termux:Widget)       ║"
echo "  ║                                              ║"
echo "  ║  ✓ Commandes : mfc-start / mfc-stop          ║"
echo "  ║                 mfc-status                   ║"
echo "  ║                                              ║"
echo "  ╚══════════════════════════════════════════════╝"
echo ""
echo "  📱 UTILISATION :"
echo ""
echo "  MÉTHODE 1 — Ouvrir Termux"
echo "    → Tout se lance automatiquement !"
echo ""
echo "  MÉTHODE 2 — Widget écran d'accueil"
echo "    1. Installez 'Termux:Widget' (F-Droid)"
echo "    2. Appui long écran → Widgets → Termux:Widget"
echo "    3. Sélectionnez 'MFC-Labo'"
echo "    4. 1 tap = serveur + Chrome !"
echo ""
echo "  MÉTHODE 3 — Commandes manuelles"
echo "    mfc-start   → Lancer le serveur + Chrome"
echo "    mfc-stop    → Arrêter le serveur"
echo "    mfc-status  → Voir l'état du serveur"
echo ""
echo "  ─────────────────────────────────────────"
echo "  Premier lancement..."
echo "  ─────────────────────────────────────────"
echo ""

# Premier lancement !
cd ~/mfc-laboratoire
node server.js > ~/mfc-laboratoire/mfc.log 2>&1 &
MFC_PID=$!

for i in $(seq 1 20); do
    sleep 0.5
    curl -s http://localhost:3000 > /dev/null 2>&1 && break
done

if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "  ✓ Serveur MFC actif (PID: $MFC_PID)"
    am start -a android.intent.action.VIEW -d "http://localhost:3000" > /dev/null 2>&1
    echo "  ✓ Chrome ouvert → http://localhost:3000"
    echo ""
    echo "  🕯️  MFC Laboratoire est prêt !"
    echo ""
else
    echo "  ✗ Erreur de démarrage"
    echo "  Voir les logs : cat ~/mfc-laboratoire/mfc.log"
fi
