# MFC LABORATOIRE - Spécifications Techniques Complètes

**Version:** 4.5  
**Date:** 5 février 2026  
**Application:** Gestion de laboratoire pour bougies parfumées  
**Entreprise:** Maison Française des Cires (MFC) - Fondée en 1904 (120 ans d'expertise)

---

## 1. ARCHITECTURE GLOBALE

### 1.1 Stack Technique
- **Backend:** Node.js + Express.js
- **Base de données:** SQLite (fichier: database.sqlite) via sql.js (100% JavaScript)
- **Frontend:** HTML/CSS/JavaScript vanilla
- **Design:** Luxe noir/or/crème (haute gamme)
- **Architecture:** Modulaire (évite fichiers monolithiques)

### 1.2 Structure des Fichiers
```
mfc-laboratoire/
├── server.js              # Serveur Express + Routes API
├── package.json           # Dépendances npm
├── database.sqlite        # Base de données (généré)
├── MFC-Laboratoire.bat    # Lanceur Windows
├── modules/
│   ├── database.js        # Wrapper SQLite avec promesses (sql.js)
│   ├── init-db.js         # Création des tables
│   └── seed-data.js       # Données initiales
└── public/
    ├── index.html         # Page d'accueil
    ├── echantillons.html  # Module échantillons
    ├── formulations.html  # Module formulations
    ├── tests.html         # Module tests combustion
    ├── matieres.html      # Module matières premières
    ├── connaissances.html # Base de connaissances
    ├── assistant.html     # Assistant IA
    ├── logo.jpg           # Logo MFC
    ├── css/
    │   └── style.css      # Styles globaux (noir/or/crème)
    └── js/
        └── pantone-converter.js  # Conversion couleurs Pantone
```

### 1.3 Dépendances NPM
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "sql.js": "^1.10.3"
  }
}
```

---

## 2. BASE DE DONNÉES

### 2.1 Table: clients
```sql
CREATE TABLE clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    company TEXT,
    address TEXT,
    client_type TEXT DEFAULT 'client',  -- 'client' ou 'operateur'
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 2.2 Table: samples (Échantillons)
```sql
CREATE TABLE samples (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sample_number TEXT UNIQUE NOT NULL,   -- Format: AA-CX-MMJJ
    client_id INTEGER,
    client_request TEXT,                  -- Demande initiale du client
    candle_type TEXT,                     -- container/pilier/chauffe-plat/massage
    diameter INTEGER,                     -- mm
    height INTEGER,                       -- mm
    total_mass REAL,                      -- g (masse totale souhaitée)
    fragrance_name TEXT,
    fragrance_percentage REAL,            -- % du total
    pantone_code TEXT,                    -- ex: "485 C"
    pantone_hex TEXT,                     -- ex: "#DA291C"
    source TEXT DEFAULT 'manual',
    status TEXT DEFAULT 'demande',        -- demande/en_cours/en_test/validé
    date_request DATE,
    date_creation DATE,
    date_tests DATE,
    date_validation DATE,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id)
);
```

### 2.3 Table: formulations
```sql
CREATE TABLE formulations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,            -- Format: F-YYYYMMDD-XXX
    sample_id INTEGER,
    client_id INTEGER,
    name TEXT NOT NULL,
    container_type TEXT,
    diameter INTEGER,                     -- mm
    height INTEGER,                       -- mm
    total_mass REAL NOT NULL,             -- g
    fragrance_name TEXT,
    fragrance_percentage REAL,            -- % du total
    fragrance_mass REAL,                  -- g (calculé)
    wax_mass REAL,                        -- g (calculé: total - parfum)
    colorant_mass REAL,                   -- g (séparé, non inclus dans calcul)
    pantone_code TEXT,
    pantone_hex TEXT,
    wick_reference TEXT,                  -- Référence mèche
    wick_id INTEGER,
    status TEXT DEFAULT 'en_cours',       -- en_cours/en_test/validé/rejeté
    version INTEGER DEFAULT 1,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sample_id) REFERENCES samples(id),
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (wick_id) REFERENCES wicks(id)
);
```

### 2.4 Table: formulation_waxes (Cires par formulation)
```sql
CREATE TABLE formulation_waxes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    formulation_id INTEGER NOT NULL,
    wax_id INTEGER NOT NULL,
    percentage REAL NOT NULL,             -- % de la masse cire
    mass REAL,                            -- g (calculé)
    FOREIGN KEY (formulation_id) REFERENCES formulations(id),
    FOREIGN KEY (wax_id) REFERENCES waxes(id)
);
```

### 2.5 Table: burn_tests (Tests de combustion)
```sql
CREATE TABLE burn_tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_number TEXT UNIQUE NOT NULL,     -- Format: T-YYYYMMDD-XXX
    formulation_id INTEGER NOT NULL,
    sample_id INTEGER,
    initial_mass REAL NOT NULL,           -- g (hérité de formulation)
    wick_reference TEXT,                  -- Héritée de formulation
    status TEXT DEFAULT 'en_cours',       -- en_cours/terminé
    start_date DATE,
    end_date DATE,
    total_burn_time INTEGER DEFAULT 0,    -- minutes totales
    conclusion TEXT,                      -- Conclusion générale
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (formulation_id) REFERENCES formulations(id),
    FOREIGN KEY (sample_id) REFERENCES samples(id)
);
```

### 2.6 Table: burn_cycles (Cycles de 4h)
```sql
CREATE TABLE burn_cycles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_id INTEGER NOT NULL,
    cycle_number INTEGER NOT NULL,        -- 1, 2, 3...
    start_time DATETIME,
    end_time DATETIME,
    duration_minutes INTEGER DEFAULT 240, -- 4 heures
    -- Mesures avant allumage
    mass_before REAL,                     -- g
    -- Mesures après extinction
    mass_after REAL,                      -- g
    mass_consumed REAL,                   -- g (calculé)
    pool_diameter REAL,                   -- mm (bassin de fusion)
    flame_height REAL,                    -- mm
    -- Observations qualitatives
    flame_stability TEXT,                 -- stable/instable/vacillante
    smoke_level TEXT,                     -- aucune/légère/moyenne/forte
    soot_level TEXT,                      -- aucune/légère/moyenne/forte
    mushrooming TEXT,                     -- aucun/léger/modéré/important (champignonnage)
    tunneling TEXT,                       -- aucun/léger/modéré/important (effet tunnel)
    scent_throw TEXT,                     -- faible/modérée/bonne/excellente (diffusion)
    notes TEXT,
    FOREIGN KEY (test_id) REFERENCES burn_tests(id)
);
```

### 2.7 Table: suppliers (Fournisseurs)
```sql
CREATE TABLE suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    country TEXT,
    website TEXT,
    email TEXT,
    phone TEXT,
    specialty TEXT,                       -- cires/mèches/colorants/parfums
    notes TEXT,
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 2.8 Table: waxes (Cires)
```sql
CREATE TABLE waxes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_id INTEGER,
    reference TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT,                            -- paraffine/végétale/microcristalline
    sub_type TEXT,                        -- container/pilier/mélange
    melting_point REAL,                   -- °C (point de fusion)
    congealing_point REAL,                -- °C (point de congélation)
    penetration REAL,                     -- dmm (pénétration)
    oil_content REAL,                     -- % (teneur en huile)
    viscosity REAL,                       -- mPa.s
    density REAL,                         -- g/cm³
    fragrance_load_max REAL,              -- % max de parfum
    application TEXT,                     -- container/pilier/massage/etc
    notes TEXT,
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);
```

### 2.9 Table: wicks (Mèches)
```sql
CREATE TABLE wicks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_id INTEGER,
    reference TEXT NOT NULL,              -- ex: "LX 14"
    series TEXT,                          -- LX/TCR/ECO/CD/HTP
    type TEXT,                            -- coton/papier/bois
    core TEXT,                            -- sans/zinc/papier
    diameter_min INTEGER,                 -- mm (diamètre bougie min)
    diameter_max INTEGER,                 -- mm (diamètre bougie max)
    wax_type TEXT,                        -- paraffine/végétale/mixte
    application TEXT,                     -- container/pilier/chauffe-plat
    manufacturer_notes TEXT,              -- Conseils fabricant
    notes TEXT,
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);
```

### 2.10 Table: colorants
```sql
CREATE TABLE colorants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_id INTEGER,
    reference TEXT NOT NULL,              -- ex: "2620340"
    name TEXT NOT NULL,                   -- ex: "liquiDYE 340 black"
    short_name TEXT,                      -- ex: "Noir"
    form TEXT,                            -- liquide/granulé
    series TEXT,                          -- liquiDYE/KWC DYE
    color_hex TEXT,                       -- ex: "#1A1A1A"
    color_rgb_r INTEGER,
    color_rgb_g INTEGER,
    color_rgb_b INTEGER,
    density REAL,                         -- g/cm³
    viscosity REAL,                       -- mPa.s (si liquide)
    flash_point REAL,                     -- °C
    congealing_point REAL,                -- °C (si granulé)
    hazard_h315 INTEGER DEFAULT 0,        -- Irritation cutanée
    hazard_h317 INTEGER DEFAULT 0,        -- Allergie cutanée
    hazard_h319 INTEGER DEFAULT 0,        -- Irritation oculaire
    dosage_recommended REAL DEFAULT 0.2,  -- % recommandé
    dosage_max REAL DEFAULT 0.25,         -- % maximum
    notes TEXT,
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);
```

### 2.11 Table: fragrances (Parfums)
```sql
CREATE TABLE fragrances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_id INTEGER,
    reference TEXT,
    name TEXT NOT NULL,
    family TEXT,                          -- floral/boisé/oriental/frais/etc
    top_notes TEXT,                       -- Notes de tête
    heart_notes TEXT,                     -- Notes de cœur
    base_notes TEXT,                      -- Notes de fond
    ifra_max REAL,                        -- % max IFRA
    flash_point REAL,                     -- °C
    recommended_percentage REAL,          -- % recommandé
    notes TEXT,
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);
```

### 2.12 Table: knowledge_base (Base de connaissances)
```sql
CREATE TABLE knowledge_base (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,               -- technique/formulation/test/général
    subcategory TEXT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    source TEXT,                          -- interne/externe/apprentissage
    priority INTEGER DEFAULT 3,           -- 1=haute, 2=moyenne, 3=basse
    tags TEXT,                            -- JSON array
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 2.13 Table: learned_rules (Apprentissage IA)
```sql
CREATE TABLE learned_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_type TEXT NOT NULL,              -- formulation/colorant/mèche/test
    condition TEXT NOT NULL,              -- JSON: conditions d'application
    recommendation TEXT NOT NULL,         -- Recommandation
    confidence REAL DEFAULT 0.5,          -- 0-1 (confiance)
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    source_formulation_id INTEGER,
    source_test_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. ROUTES API

### 3.1 Clients
```
GET    /api/clients              Liste tous les clients
GET    /api/clients/:id          Détail d'un client
POST   /api/clients              Créer un client
PUT    /api/clients/:id          Modifier un client
DELETE /api/clients/:id          Supprimer un client
```

### 3.2 Échantillons
```
GET    /api/samples              Liste tous les échantillons
GET    /api/samples/:id          Détail d'un échantillon
POST   /api/samples              Créer un échantillon
PUT    /api/samples/:id          Modifier un échantillon
DELETE /api/samples/:id          Supprimer un échantillon
GET    /api/samples/:id/formulations   Formulations liées
```

### 3.3 Formulations
```
GET    /api/formulations         Liste toutes les formulations
GET    /api/formulations/:id     Détail avec cires
POST   /api/formulations         Créer une formulation
PUT    /api/formulations/:id     Modifier une formulation
DELETE /api/formulations/:id     Supprimer une formulation
POST   /api/formulations/:id/waxes     Ajouter une cire
DELETE /api/formulations/:id/waxes/:waxId   Retirer une cire
```

### 3.4 Tests de combustion
```
GET    /api/burn-tests           Liste tous les tests
GET    /api/burn-tests/:id       Détail avec cycles
POST   /api/burn-tests           Créer un test
PUT    /api/burn-tests/:id       Modifier un test
DELETE /api/burn-tests/:id       Supprimer un test
POST   /api/burn-tests/:id/cycles      Ajouter un cycle
PUT    /api/burn-tests/:id/cycles/:cycleId   Modifier un cycle
```

### 3.5 Matières premières
```
GET    /api/suppliers            Liste fournisseurs
GET    /api/waxes                Liste cires (avec filtres)
GET    /api/wicks                Liste mèches (avec filtres)
GET    /api/colorants            Liste colorants (avec filtres)
GET    /api/fragrances           Liste parfums
POST   /api/waxes                Ajouter une cire
POST   /api/wicks                Ajouter une mèche
POST   /api/colorants            Ajouter un colorant
```

### 3.6 Base de connaissances
```
GET    /api/knowledge            Liste avec filtres
GET    /api/knowledge/:id        Détail
POST   /api/knowledge            Ajouter une entrée
PUT    /api/knowledge/:id        Modifier
DELETE /api/knowledge/:id        Supprimer
```

### 3.7 Assistant IA
```
POST   /api/assistant/ask        Poser une question
POST   /api/assistant/recommend  Demander une recommandation
POST   /api/assistant/learn      Enregistrer un apprentissage
```

---

## 4. DONNÉES INITIALES

### 4.1 Fournisseurs
| ID | Nom | Pays | Spécialité |
|----|-----|------|------------|
| 1 | Hywax | Pays-Bas | Cires paraffine |
| 2 | Stéarinerie Dubois | France | Cires paraffine et végétales |
| 3 | Wedoo | France | Mèches |
| 4 | Kaiser Lacke GmbH | Allemagne | Colorants |

### 4.2 Cires Hywax (11 références)
| Référence | Nom | Type | Point fusion | Pénétration | Huile % |
|-----------|-----|------|--------------|-------------|---------|
| HW-5600A | Hywax 5600A | Paraffine | 58°C | 16 dmm | <0.5% |
| HW-5800A | Hywax 5800A | Paraffine | 58°C | 18 dmm | <0.5% |
| HW-6000A | Hywax 6000A | Paraffine | 60°C | 16 dmm | <0.5% |
| HW-6200A | Hywax 6200A | Paraffine | 62°C | 15 dmm | <0.5% |
| HW-6400A | Hywax 6400A | Paraffine | 64°C | 14 dmm | <0.5% |
| HW-6800A | Hywax 6800A | Paraffine | 68°C | 12 dmm | <0.5% |
| HW-7000A | Hywax 7000A | Paraffine | 70°C | 11 dmm | <0.5% |
| MC-75 | Microcire 75 | Microcristalline | 75°C | 25 dmm | <1% |
| MC-80 | Microcire 80 | Microcristalline | 80°C | 22 dmm | <1% |
| MC-85 | Microcire 85 | Microcristalline | 85°C | 18 dmm | <1% |
| MC-90 | Microcire 90 | Microcristalline | 90°C | 15 dmm | <1% |

### 4.3 Cires Stéarinerie Dubois (10 références)
| Référence | Nom | Type | Point fusion | Application |
|-----------|-----|------|--------------|-------------|
| SD-P52 | Paraffine 52 | Paraffine | 52°C | Container |
| SD-P54 | Paraffine 54 | Paraffine | 54°C | Container |
| SD-P56 | Paraffine 56 | Paraffine | 56°C | Container/Pilier |
| SD-P58 | Paraffine 58 | Paraffine | 58°C | Pilier |
| SD-P60 | Paraffine 60 | Paraffine | 60°C | Pilier |
| SD-P62 | Paraffine 62 | Paraffine | 62°C | Pilier |
| SD-VS100 | Végétale Soja | Végétale | 48°C | Container |
| SD-VC100 | Végétale Colza | Végétale | 52°C | Container |
| SD-VCC | Végétale Coco | Végétale | 24°C | Massage |
| SD-VMIX | Végétale Mix | Végétale | 50°C | Container |

### 4.4 Mèches Wedoo (48 références)
Séries disponibles avec plages de diamètres:
- **LX** (8-26): Coton tressé, pour containers verre
- **TCR** (18/10-36/22): Coton avec âme papier, bonne rigidité
- **ECO** (1-16): Coton avec âme papier, écologique
- **CD** (3-22): Coton tressé plat, cire végétale
- **HTP** (31-126): Coton avec âme papier, haute performance

### 4.5 Colorants Kaiser Lacke (16 références)

#### Série liquiDYE (Liquides)
| Référence | Nom | Couleur | Densité | Viscosité |
|-----------|-----|---------|---------|-----------|
| 2620280 | liquiDYE 280 pink | Rose foncé (#FF69B4) | 1.02 | 300 mPa.s |
| 2620330 | liquiDYE 330 green | Vert (#228B22) | 0.99 | 1400 mPa.s |
| 2620340 | liquiDYE 340 black | Noir (#1A1A1A) | 0.96 | - |
| 2620390 | liquiDYE 390 orange | Orange (#FF8C00) | 0.97 | 1000 mPa.s |
| 2620410 | liquiDYE 410 bordeaux | Rouge foncé (#800020) | 0.93 | 300 mPa.s |

#### Série KWC DYE (Granulés)
| Référence | Nom | Couleur | Densité | Point éclair |
|-----------|-----|---------|---------|--------------|
| 2705365 | KWC DYE black | Noir (#1A1A1A) | 1.02 | >140°C |
| 2803240 | KWC DYE 240 orange | Orange (#FF8C00) | 0.96 | >150°C |
| 2803280 | KWC DYE 280 pink | Rose (#FF69B4) | 0.97 | >150°C |
| 2803290 | KWC DYE 290 violet | Violet (#8A2BE2) | 0.96 | >150°C |
| 2803300 | KWC DYE 300 blue | Bleu foncé (#00008B) | 0.96 | >150°C |

**Note:** 6 FDS restantes à analyser pour compléter la base.

---

## 5. RÈGLES MÉTIER IMPORTANTES

### 5.1 Calcul des masses
```
TOTAL = Masse totale souhaitée (g)
PARFUM % = Pourcentage de parfum demandé
PARFUM (g) = TOTAL × (PARFUM % / 100)
CIRE (g) = TOTAL - PARFUM (g)
COLORANT (g) = À part, NON inclus dans le calcul
```

Exemple: 200g total avec 10% parfum
- Parfum = 200 × 0.10 = 20g
- Cire = 200 - 20 = 180g
- Colorant = 0.4g (0.2% de la cire, comptabilisé séparément)

### 5.2 Dosage colorants
- **Recommandé:** 0.20% de la masse de cire
- **Maximum:** 0.25% de la masse de cire
- Formule: Masse colorant (g) = Masse cire × (dosage % / 100)

### 5.3 Tests de combustion
- Cycles de **4 heures** (240 minutes)
- Mesures avant/après chaque cycle
- Calcul automatique de la consommation
- Observations qualitatives normalisées

### 5.4 Traçabilité
- Échantillon → Formulation → Test
- Les données doivent se transmettre automatiquement
- Historique complet conservé

---

## 6. TERMINOLOGIE FRANÇAISE

| Anglais | Français (à utiliser) |
|---------|----------------------|
| Pool diameter | Bassin de fusion |
| Mushrooming | Champignonnage |
| Tunneling | Effet tunnel |
| Hot throw | Diffusion (à chaud) |
| Cold throw | Diffusion (à froid) |
| Wick | Mèche |
| Wax | Cire |

---

## 7. ASSISTANT IA - SOURCES DE RECOMMANDATION

### 7.1 Trois modes de recommandation
1. **Règles métier MFC** (120 ans d'expertise, prioritaire)
2. **Connaissances externes** (littérature technique)
3. **Apprentissage continu** (corrections et validations)

### 7.2 Comportements attendus
- Prioriser l'expertise MFC sur les sources externes
- Apprendre des corrections utilisateur
- Stocker les combinaisons validées
- Signaler les incompatibilités connues

---

## 8. INTERFACE UTILISATEUR

### 8.1 Design
- **Palette:** Noir (#1a1a1a), Or (#c9a227), Crème (#f5f5dc)
- **Police:** Système, élégante et lisible
- **Style:** Luxueux, sobre, professionnel

### 8.2 Modules
1. **Accueil** - Dashboard avec statistiques
2. **Échantillons** - Gestion demandes clients
3. **Formulations** - Création et suivi recettes
4. **Tests** - Protocoles de combustion
5. **Matières** - Cires, mèches, colorants, parfums
6. **Connaissances** - Base documentaire
7. **Assistant** - IA avec 3 sources

### 8.3 Fonctionnalités Pantone
- Saisie code Pantone → Affichage HEX automatique
- Saisie HEX → Suggestion code Pantone
- Palette de ~80 couleurs Pantone standards

---

## 9. INSTALLATION ET LANCEMENT

### 9.1 Installation
```bash
# Extraire le ZIP
unzip mfc-laboratoire.zip
cd mfc-laboratoire

# Installer les dépendances
npm install

# Démarrer
npm start
# OU
node server.js
# OU double-clic sur MFC-Laboratoire.bat (Windows)
```

### 9.2 Accès
```
http://localhost:3000
```

---

## 10. FONCTIONNALITÉS À DÉVELOPPER

### 10.1 Priorité Haute
- [ ] Compléter les 6 colorants manquants (FDS à analyser)
- [ ] Module clients avec sous-dossiers (arborescence)
- [ ] Export PDF des formulations
- [ ] Import/export données CSV

### 10.2 Priorité Moyenne
- [ ] Historique des modifications
- [ ] Validation des combinaisons matières
- [ ] Rapports statistiques

### 10.3 Priorité Basse
- [ ] Interface tablette optimisée
- [ ] Mode hors-ligne avancé
- [ ] Graphiques de tendances

---

## 11. NOTES IMPORTANTES

### 11.1 Architecture modulaire
- Fichiers de moins de 500 lignes
- Modules séparés et testables
- Éviter les fichiers monolithiques

### 11.2 Compatibilité
- Node.js v16+
- Navigateurs modernes
- Fonctionne hors-ligne

### 11.3 Sauvegarde
- Base SQLite = fichier unique
- Sauvegarde automatique toutes les 30 secondes
- Copie du fichier database.sqlite pour backup

---

**Document généré pour Claude Opus 4.5**  
**Utilisation:** Copier ce document pour reprendre le développement avec tout le contexte nécessaire.
