# MFC LABORATOIRE — PLAN VERROUILLÉ
# Version du plan : 21 février 2026
# Règle absolue : ON NE SORT PAS DE CE PLAN

---

## ÉTAT CERTIFIÉ v5.44.0

### Ce qui est construit et validé syntaxiquement :
- ✅ server.js — 8 289 lignes, syntaxe OK
- ✅ 24 modules JS — tous syntaxe OK
- ✅ 17 pages HTML
- ✅ Parseur FDS Python (pymupdf + OCR)
- ✅ Import Excel (label-based parser)
- ✅ Moteur moléculaire (316 molécules, 96 avec odeur)
- ✅ Docker prêt (Dockerfile + docker-compose.yml + DATA_DIR configurable)
- ✅ 5 dépendances npm : express, multer, pdfkit, sql.js, xlsx

### Ce qui N'EST PAS testé en conditions réelles :
- ⚠️ Aucune page testée avec de vraies données sur NAS
- ⚠️ Import Excel jamais fait sur 50+ fichiers d'un coup
- ⚠️ Interactions entre pages (créer formulation → lancer test → valider)
- ⚠️ Responsive mobile en situation réelle

---

## PHASE 0 — DOCKER NAS (Lundi 9h-9h30)

### Action unique : déployer et vérifier que ça démarre.

```
1. Copier le ZIP sur le NAS dans /volume1/docker/mfc-laboratoire/
2. Dézipper
3. Ouvrir SSH ou Terminal Container Manager
4. cd /volume1/docker/mfc-laboratoire
5. docker-compose up -d --build
6. Attendre 3-5 min (build)
7. Ouvrir http://IP-NAS:3000
```

### Critère de passage : la page d'accueil s'affiche.
### Si ça échoue : on regarde les logs (`docker logs mfc-laboratoire`) et on corrige en session Claude.
### On ne passe PAS à la phase 1 tant que ça ne démarre pas.

---

## PHASE 1 — TEST DE CHAQUE PAGE (Lundi 9h30-10h30)

### Méthode : ouvrir chaque page, noter OK ou KO, ne rien corriger.

Pour chaque page, on vérifie UNE chose : est-ce qu'elle charge sans erreur JS dans la console (F12) ?

| # | Page | Vérifie | Status |
|---|------|---------|--------|
| 1 | index.html | Dashboard affiche les compteurs | ☐ |
| 2 | matieres.html | Liste cires + mèches + colorants | ☐ |
| 3 | fds.html | Zone dépôt PDF visible, liste parfums | ☐ |
| 4 | formulations.html | Liste formulations, bouton nouveau | ☐ |
| 5 | tests.html | Liste tests brûlage | ☐ |
| 6 | molecules.html | Liste parfums avec profils | ☐ |
| 7 | echantillons.html | Liste échantillons, bouton nouveau | ☐ |
| 8 | clients.html | Liste clients | ☐ |
| 9 | recettes.html | Liste recettes | ☐ |
| 10 | connaissances.html | Base de connaissances | ☐ |
| 11 | diagnostic.html | Interface diagnostic | ☐ |
| 12 | formulateur.html | Assistant formulateur | ☐ |
| 13 | analytics.html | Graphiques analytics | ☐ |
| 14 | recherche.html | Barre de recherche | ☐ |
| 15 | operateurs.html | Liste opérateurs | ☐ |
| 16 | simulateur.html | Interface simulation | ☐ |
| 17 | print.html | Impression | ☐ |

### Résultat attendu : une liste de pages OK et pages KO.
### On ouvre UNE session Claude avec la liste KO.
### Je corrige TOUT d'un coup — pas page par page en 17 sessions.
### Critère de passage : les 6 pages cœur (2-7) chargent sans erreur console.

---

## PHASE 2 — IMPORT DONNÉES (Lundi 10h30-12h30)

### Ordre strict. Chaque étape DOIT être finie avant la suivante.

### 2.1 — Scanner les FDS (30 min)

```
1. Copier TOUS les PDF FDS dans /volume1/docker/mfc-laboratoire/mfc-data/fds/inbox/
   (ou les glisser via la page FDS)
2. Page FDS → bouton "Scanner inbox"
3. Attendre la fin
4. Vérifier : nombre de parfums créés = ____
5. Vérifier : nombre de composants CAS extraits = ____
```

**Problème fréquent :** Le parseur ne trouve pas Python.
**Solution :** Vérifier dans les logs Docker que Python3 est bien installé.

### 2.2 — Importer les Excel (60 min)

```
Pour CHAQUE fichier Excel :
1. Page Formulations → Nouvelle formulation
2. Glisser le fichier Excel dans la zone droite
3. Vérifier l'aperçu :
   - Client trouvé ? ☐
   - Cires trouvées ? ☐
   - Mèche trouvée ? ☐
   - % parfum correct ? ☐
   - Colorants extraits ? ☐
4. Si une FDS existe pour ce parfum → la glisser zone gauche
5. Enregistrer
6. NOTER les erreurs (ne pas corriger en live)
```

**Après les 50+ imports :**
- Lister toutes les erreurs
- Corriger EN UNE FOIS (créer les cires/mèches manquantes, etc.)
- Ré-importer les fichiers en erreur

### 2.3 — Enrichir PubChem (30 min)

```
Page Molécules → onglet PubChem → "Enrichir tout"
Ou en session Claude : on enrichit les CAS sans données en batch
```

### 2.4 — Backup de référence

```
Page Accueil → Backup → Télécharger la BDD
OU copier /volume1/docker/mfc-laboratoire/mfc-data/database.sqlite

Nommer : "mfc-v5.44.0-lundi-base-remplie.sqlite"
NE PLUS JAMAIS Y TOUCHER
```

### Critère de passage : 50+ formulations + 80+ parfums + backup fait.

---

## PHASE 3 — STABILISER LES 6 PAGES CŒUR (Semaine 3)

### Règle : 1 page par session Claude. On ne passe à la suivante que quand la précédente marche PARFAITEMENT.

### Page 1 : MATIÈRES (matieres.html)
**Test complet :**
- ☐ Lister toutes les cires → correctes ?
- ☐ Ajouter une cire → elle apparaît ?
- ☐ Modifier une cire → changement sauvé ?
- ☐ Lister toutes les mèches → correctes ?
- ☐ Ajouter une mèche → elle apparaît ?
- ☐ Lister les colorants → corrects ?
- ☐ Filtrer par type → ça marche ?
- ☐ Mobile → lisible ?

### Page 2 : FDS PARFUMS (fds.html)
**Test complet :**
- ☐ Glisser 1 PDF → parsé en <30s ?
- ☐ Composants extraits avec CAS + noms + % ?
- ☐ Scan batch inbox → traite tous les PDF ?
- ☐ Stats couverture moléculaire affichées ?
- ☐ Lien parfum → FDS fonctionne ?
- ☐ Mobile → glisser PDF marche ?

### Page 3 : FORMULATIONS (formulations.html)
**Test complet :**
- ☐ Import Excel → preview correct ?
- ☐ Client auto-créé si inconnu ?
- ☐ Cires matchées par référence ?
- ☐ Mèche matchée ?
- ☐ Colorants avec vrais % (pas 0.20%) ?
- ☐ Total parfum + cire + colorant = 100% ?
- ☐ Enregistrement OK ?
- ☐ Liste : filtrer par client, par parfum ?
- ☐ Détail : toutes les infos ?
- ☐ Impression fiche : propre ?
- ☐ Lien FDS → composants visibles ?
- ☐ Mobile → formulaire utilisable ?

### Page 4 : TESTS BRÛLAGE (tests.html)
**Test complet :**
- ☐ Créer un test lié à une formulation ?
- ☐ Ajouter cycle : heure allumage, extinction, notes ?
- ☐ Évaluation : diffusion froid, chaud, bain de cire, mèche ?
- ☐ Photo optionnelle ?
- ☐ Valider / reprendre / échec ?
- ☐ Historique V1 → V2 → V3 ?
- ☐ Le test enrichit la base de connaissances ?
- ☐ Mobile → saisie terrain possible ?

### Page 5 : MOLÉCULES (molecules.html)
**Test complet :**
- ☐ Liste parfums avec profils moléculaires ?
- ☐ Détail : volatilité, familles, combustion, diffusion ?
- ☐ Profil olfactif : familles, pyramide, alertes chaud ?
- ☐ 4 boutons diagnostic → résultats cohérents ?
- ☐ Tableau composants : colonnes odeur + note visibles ?
- ☐ Analyse batch → corrélations ?
- ☐ Mobile → tableau lisible ?

### Page 6 : ÉCHANTILLONS (echantillons.html)
**Test complet :**
- ☐ Créer échantillon (client, parfum, quantité) ?
- ☐ Lier à une formulation ?
- ☐ Changer statut : préparation → envoyé → retour ?
- ☐ Lancer un test brûlage depuis l'échantillon ?
- ☐ Mobile → utilisable ?

### Critère de passage : les 6 pages passent TOUS les tests ci-dessus.
### Durée estimée : 3-5 sessions Claude sur la semaine.

---

## PHASE 4 — ACCÈS DISTANT (Fin semaine 3)

### 4.1 — Choisir la méthode
- Tailscale (le plus simple et sécurisé) : installer sur NAS + chaque appareil
- QuickConnect + reverse proxy : gratuit, intégré Synology
- DDNS + redirection port : plus technique

### 4.2 — Configurer
En session Claude, on configure ensemble selon la méthode choisie.

### 4.3 — Raccourcis
- PC bureau : raccourci vers http://IP-NAS:3000
- Téléphone : "Ajouter à l'écran d'accueil" depuis le navigateur
- PC maison : raccourci vers l'URL distante

### Critère de passage : j'accède à l'app depuis mon téléphone en 4G.

---

## PHASE 5 — PAGES SECONDAIRES (Semaine 4)

Uniquement si les 6 pages cœur sont stables depuis 5 jours.

| Page | Ce qu'on fait | Durée |
|------|--------------|-------|
| clients.html | Vérifier CRUD fonctionne | 1 session |
| recettes.html | Vérifier templates | 1 session |
| index.html | Dashboard avec vrais chiffres | 1 session |
| connaissances.html | Vérifier la base tips | rapide |
| Les autres | Tester, corriger si KO | au cas par cas |

---

## PHASE 6 — PRÉDICTIF (Semaine 5)

Prérequis : au moins 30 formulations avec burn tests validés.

- Glisser une FDS → l'app propose cire + mèche + %
- Basé sur similarité moléculaire avec les formulations passées
- Alertes automatiques (composition à risque)
- Chaque burn test enrichit les patterns

---

## RÈGLES ABSOLUES — CE QUI ME BLOQUE

À partir de maintenant, si N me demande quelque chose qui sort du plan, je réponds :

> "On est en Phase X. Ce que tu demandes c'est Phase Y.
> On finit d'abord Phase X. Ça prend encore [durée].
> Je le note pour Phase Y."

### Ce que je refuse de faire tant que les 6 pages cœur ne sont pas stables :
- ❌ Ajouter une nouvelle page
- ❌ Ajouter un nouveau module
- ❌ Changer le design d'une page qui fonctionne
- ❌ Ajouter des champs à la BDD sans besoin immédiat
- ❌ Refactorer du code qui marche
- ❌ Intégrer une API externe (sauf PubChem déjà fait)

### Ce que je fais systématiquement à chaque livraison :
- ✅ Valider syntaxe JS de tous les fichiers modifiés
- ✅ Incrémenter la version
- ✅ Lister exactement ce qui a changé
- ✅ Livrer un ZIP propre
- ✅ Rappeler à N de tester et backup

---

## SUIVI — COMPTEUR DE PROGRESSION

### Phase 0 : Docker NAS
- ☐ Container démarre
- ☐ Page d'accueil visible

### Phase 1 : Test pages
- ☐ Pages cœur OK : ___ / 6
- ☐ Pages secondaires OK : ___ / 11
- ☐ Bugs critiques : ___

### Phase 2 : Import données
- ☐ FDS scannées : ___ / total
- ☐ Excel importés : ___ / 50+
- ☐ Molécules enrichies PubChem : ___ / 316
- ☐ Molécules avec odeur : ___ / 316
- ☐ Backup fait : ☐

### Phase 3 : 6 pages stables
- ☐ Matières : ___ / 8 tests
- ☐ FDS : ___ / 6 tests
- ☐ Formulations : ___ / 12 tests
- ☐ Tests brûlage : ___ / 8 tests
- ☐ Molécules : ___ / 7 tests
- ☐ Échantillons : ___ / 5 tests

### Phase 4 : Accès distant
- ☐ Méthode choisie : ___
- ☐ Configuré
- ☐ Test 4G OK

### Phase 5 : Pages secondaires
- ☐ clients OK
- ☐ recettes OK
- ☐ index dashboard OK

### Phase 6 : Prédictif
- ☐ 30+ formulations validées
- ☐ Moteur recommandation actif
