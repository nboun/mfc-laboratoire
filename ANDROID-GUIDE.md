# MFC Laboratoire — Guide Tablette Android

## 🚀 Installation en 1 minute

### Étape 1 : Installer Termux
- Aller sur **F-Droid** : https://f-droid.org/packages/com.termux/
- Télécharger et installer l'APK
- ⚠️ **Ne pas utiliser** la version Play Store (obsolète)

### Étape 2 : Télécharger MFC
- Depuis la conversation Claude, télécharger `mfc-laboratoire.zip`
- Le fichier va dans le dossier Téléchargements

### Étape 3 : Lancer l'installation
Ouvrir Termux, copier-coller cette commande :
```bash
cp ~/storage/shared/Download/mfc-laboratoire.zip ~ 2>/dev/null || cp ~/storage/downloads/mfc-laboratoire.zip ~ 2>/dev/null && cd ~ && unzip -o mfc-laboratoire.zip > /dev/null && bash ~/mfc-laboratoire/install-termux.sh
```

Si Termux demande l'accès au stockage, taper d'abord :
```bash
termux-setup-storage
```
Puis relancer la commande ci-dessus.

### C'est terminé !
L'installateur configure automatiquement :
- ✅ Le serveur démarre tout seul quand Termux s'ouvre
- ✅ Chrome s'ouvre tout seul sur la page MFC
- ✅ Commandes `mfc-start`, `mfc-stop`, `mfc-status`

---

## 📱 3 façons de lancer MFC

### Méthode 1 — Ouvrir Termux (la plus simple)
1. Ouvrir l'app Termux
2. → Le serveur démarre automatiquement
3. → Chrome s'ouvre automatiquement
4. C'est tout !

### Méthode 2 — Widget écran d'accueil (1 tap)
1. Installer **Termux:Widget** depuis F-Droid
2. Appui long sur l'écran d'accueil → Widgets
3. Trouver « Termux:Widget » → glisser sur l'écran
4. Sélectionner « MFC-Labo »
5. **1 tap sur l'icône = serveur + Chrome !**

### Méthode 3 — Commandes manuelles
Dans Termux :
```bash
mfc-start    # Lance le serveur + ouvre Chrome
mfc-stop     # Arrête le serveur
mfc-status   # Vérifie l'état du serveur
```

---

## 🔧 Dépannage

### Le serveur ne démarre pas
```bash
cat ~/mfc-laboratoire/mfc.log
```

### Réinstaller les dépendances
```bash
cd ~/mfc-laboratoire && rm -rf node_modules && npm install
```

### Le navigateur ne s'ouvre pas automatiquement
Ouvrir Chrome manuellement et taper : `http://localhost:3000`

### Désactiver le démarrage automatique
```bash
sed -i '/# --- MFC LABORATOIRE AUTO ---/,/# --- FIN MFC AUTO ---/d' ~/.bashrc
```

---

## 💾 Sauvegarder la base de données

```bash
cp ~/mfc-laboratoire/database.sqlite ~/storage/shared/mfc-backup-$(date +%Y%m%d).sqlite
```

---

## 🔋 Garder le serveur actif en veille

Pour empêcher Android de tuer Termux en arrière-plan :
1. Paramètres Android → Applications → Termux → Batterie → « Non restreint »
2. Ou dans Termux : `termux-wake-lock`

---

## 📋 Résumé des fichiers

| Fichier | Rôle |
|---------|------|
| `install-termux.sh` | Installation complète (une seule fois) |
| `mfc-start.sh` | Lancer serveur + ouvrir Chrome |
| `mfc-stop.sh` | Arrêter le serveur |
| `mfc-status.sh` | Vérifier l'état |
| `~/.shortcuts/MFC-Labo.sh` | Widget écran d'accueil |
| `~/.termux/boot/mfc-autostart` | Boot automatique |
| `~/.bashrc` | Démarrage auto à l'ouverture Termux |
