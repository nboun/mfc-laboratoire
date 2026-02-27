# MFC LABORATOIRE — ROADMAP v6.0
## Innovations préparées pour déploiement sur PC Windows

---

## 🔬 MODULE 1 : VEILLE SCIENTIFIQUE INTELLIGENTE
**Page : `recherche.html` — Nouvelle page**

### 1A. Recherche PubMed (API gratuite NCBI)
- Saisir un sujet → recherche automatique sur PubMed (E-utilities API)
- Extraction des abstracts, DOI, auteurs, dates
- Filtres : candle, fragrance, wax, combustion, olfactory, essential oil
- Résultats affichés avec résumé + bouton "Importer en KB"
- **Zéro coût, zéro clé API**

### 1B. Base The Good Scents Company
- Recherche de molécules par CAS ou nom
- Extraction automatique : Bp, Mw, vapor pressure, odor description, FEMA, IFRA
- Enrichissement automatique de MOLECULE_DB dans le serveur
- **Scraping autorisé, données publiques**

### 1C. Recherche IA (optionnel, avec clé API)
- Route `/api/knowledge/ai-research` déjà codée (commentée)
- Décommenter + ajouter fichier `.env` avec `ANTHROPIC_API_KEY=sk-ant-...`
- Claude analyse la question + contexte MFC → réponse structurée
- Auto-extraction CAS/Bp/Mw via le moteur import-text existant
- **Coût : ~0.01-0.05€ par recherche**

### 1D. Import de texte intelligent (DÉJÀ CODÉ)
- Route `/api/knowledge/import-text` opérationnelle
- Coller un texte (article, FDS, page web) → extraction automatique
- Détection : CAS, molécules, Bp, Mw, flash points, densités, %
- 27 molécules dans MOLECULE_DB avec données complètes
- Enrichissement croisé avec composants FDS existants

---

## 📊 MODULE 2 : ANALYTICS AVANCÉS
**Page : `analytics.html` — Nouvelle page**

### 2A. Corrélation FDS ↔ Tests de combustion
- Croiser les compositions FDS avec les résultats de tests
- Graphiques : % DPG vs score combustion, % insolubles vs suintage
- Détection automatique de patterns :
  "Les parfums avec >20% DPG ont tous eu du champignonnage"
- **Valeur : transformer les données en insights actionnables**

### 2B. Dashboard fournisseurs
- Performance par fournisseur de parfum : taux de réussite des tests
- Carte des solvants porteurs par fournisseur
- Alerte : "Ce fournisseur utilise systématiquement du DPG"

### 2C. Timeline de maturation
- Suivi des temps de cure par formulation
- Rappels automatiques : "Échantillon X prêt pour test (D+14)"
- Historique des résultats D+3 vs D+7 vs D+14

### 2D. Coûts matières
- Prix au kg par matière première
- Calcul automatique du coût de revient par formulation
- Marge par client, par recette, par volume

---

## 🏭 MODULE 3 : PRODUCTION & TRAÇABILITÉ
**Page : `production.html` — Nouvelle page**

### 3A. Ordres de fabrication (OF)
- Créer un OF depuis une formulation validée
- Calculer les quantités pour N bougies
- Checklist de production avec étapes validables
- Impression fiche atelier (déjà partiellement existante)

### 3B. Gestion des lots
- N° de lot par production (format MFC existant)
- Traçabilité matière → lot → client
- Historique complet : quel lot, quelle cire, quel parfum, quelle mèche

### 3C. Stock matières premières
- Entrées/sorties par matière
- Alerte stock bas
- Consommation moyenne par mois

---

## 🧪 MODULE 4 : SIMULATEUR DE FORMULATION
**Intégré à `formulations.html`**

### 4A. Prédicteur de comportement
- Basé sur les 219 formulations Excel + KB
- Saisir une formulation → prédiction du throw, de la tenue, du risque
- Score de confiance basé sur les formulations similaires dans la base

### 4B. Recommandation de mèche
- Algorithme existant enrichi avec données FDS
- Si parfum avec DPG : recommander mèche +1 taille
- Si parfum dense (Bp moyen > 280°C) : mèche standard ou -1

### 4C. Compatibilité parfum-cire
- Sélectionner un parfum + une base cire → score de compatibilité
- Basé sur l'analyse FDS + retours d'expérience (tests validés)

---

## 📱 MODULE 5 : AMÉLIORATIONS UX/UI
**Toutes les pages**

### 5A. Mode sombre/clair
- Toggle dans le header
- Sauvegardé en localStorage

### 5B. Notifications & rappels
- Web Notifications API
- Rappels de cure, de tests planifiés
- Alertes stock bas

### 5C. Import/Export Excel amélioré
- Importer les 219 formulations Excel existantes en un clic
- Exporter toute la base en Excel (clients, formulations, tests, KB)

### 5D. Multi-utilisateur (futur)
- Login simple (nom + code)
- Historique par utilisateur
- Rôles : atelier / laboratoire / direction

---

## 🔗 MODULE 6 : INTÉGRATIONS EXTERNES
**Selon les besoins**

### 6A. PubChem API (gratuite)
- Recherche de molécules par CAS ou nom
- Données complètes : structure, propriétés, synonymes
- Enrichissement automatique de MOLECULE_DB

### 6B. ECHA / REACH (scraping)
- Vérification réglementaire des substances
- Statut SVHC, restrictions, limites IFRA

### 6C. Backup cloud (Google Drive)
- Sauvegarde automatique de la base SQLite
- Restauration en un clic

---

## PRIORITÉS DE DÉVELOPPEMENT

| Priorité | Module | Effort | Impact |
|----------|--------|--------|--------|
| 🔴 1 | Veille PubMed + Good Scents | 1 session | Enrichissement continu KB |
| 🔴 2 | Analytics FDS↔Tests | 1 session | Insights formulation |
| 🟠 3 | Simulateur formulation | 1-2 sessions | Gain temps R&D |
| 🟠 4 | Production & lots | 1-2 sessions | Traçabilité client |
| 🟡 5 | Coûts matières | 1 session | Gestion financière |
| 🟡 6 | Import Excel bulk | 1 session | Migration données |
| 🟢 7 | PubChem + ECHA | 1 session | Réglementaire |
| 🟢 8 | Mode sombre + UX | 0.5 session | Confort |

---

## ÉTAT ACTUEL v5.15.1

- **5009 lignes** server.js
- **136 routes API**
- **283 fiches KB** (dont science, FDS Kaiser, FDS parfums, savoir empirique)
- **27 molécules** dans MOLECULE_DB
- **13 pages HTML** (+ formulateur IA)
- **9 recettes MFC** (A-I)
- **51 cires** (Hywax + Stéarinerie Dubois)
- **48 mèches** Wedoo
- **10 colorants** Kaiser Lacke
- **Import texte intelligent** opérationnel
- **Analyse FDS** avec auto-détection solvants + cross-référencement
- **Assistant Formulateur IA** avec workflow itératif
- **Route IA** prête (commentée, besoin clé API)
- **Anti-cache** : SW killer + cache-buster v3 + headers no-cache
