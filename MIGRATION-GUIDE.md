# Migration : pubchem-enrichment.js → molecule-enrichment.js

## Date : 26/02/2026 — v5.44.13

---

## Ce qui change

### Avant (1 source)
```
CAS → PubChem API → MW, LogP, formule, IUPAC → KB
```
- 8 huiles essentielles échouent (CAS 8xxx = mélanges)
- Pas de données olfactives
- Pas de synonymes/noms courants

### Après (3 sources + fallback Claude)
```
CAS → PubChem + Common Chemistry + TGSC → Fusion → KB enrichie
         ↓ si incomplet
      Export JSON → Session Claude → Import app
```
- PubChem : MW, LogP, BP, FP, densité, formule, IUPAC, SMILES
- Common Chemistry : nom officiel, synonymes, point de fusion, InChI
- TGSC : type d'odeur, description olfactive (dégradation gracieuse)
- Session Claude : données métier bougie, HE, mélanges complexes

---

## Fichiers

| Fichier | Action |
|---------|--------|
| `modules/molecule-enrichment.js` | **NOUVEAU** — remplace pubchem-enrichment.js |
| `modules/pubchem-enrichment.js` | **GARDER** en backup, ne plus require |
| `server.js` | Modifier (voir ci-dessous) |
| `public/molecules.html` | Modifier boutons UI (voir ci-dessous) |

---

## Étapes de migration dans server.js

### 1. Changer le require (en haut du fichier)

```javascript
// AVANT
const pubchem = require('./modules/pubchem-enrichment');

// APRÈS
const enrichment = require('./modules/molecule-enrichment');
```

### 2. Remplacer getMoleculeKB() (~ligne 8728)

```javascript
// AVANT (fonction locale dans server.js)
function getMoleculeKB() {
    // ... parsing KB texte ...
}

// APRÈS
function getMoleculeKB() {
    return enrichment.getMoleculeKB(db);
}
```

### 3. Remplacer les endpoints /api/pubchem/*

Chercher tous les `app.get('/api/pubchem/` et `app.post('/api/pubchem/` 
et les remplacer par les endpoints dans `PATCH-SERVER-ENDPOINTS.js`.

Les anciens endpoints `/api/pubchem/enrich/:cas` et `/api/pubchem/batch-enrich`
sont gardés en rétrocompatibilité (ils redirigent vers le nouveau module).

### 4. Nouveaux endpoints

| Endpoint | Méthode | Rôle |
|----------|---------|------|
| `/api/enrichment/stats` | GET | Stats enrichissement (couverture, sources, manquants) |
| `/api/enrichment/single/:cas` | GET | Enrichir 1 CAS (3 sources + sauvegarde KB) |
| `/api/enrichment/test/:cas` | GET | Tester enrichissement sans sauvegarder |
| `/api/enrichment/batch` | POST | Batch tous les CAS inconnus |
| `/api/enrichment/batch/stream` | GET | Batch avec SSE progression temps réel |
| `/api/enrichment/import-claude` | POST | Import JSON session Claude |
| `/api/enrichment/needs-claude` | GET | Liste CAS nécessitant session Claude |
| `/api/enrichment/orphans` | GET | CAS sans aucune fiche KB |

---

## Test rapide après migration

Coller dans la console navigateur :

```javascript
// Test 1 : enrichissement single (linalool — doit trouver 2-3 sources)
fetch('/api/enrichment/test/78-70-6').then(r=>r.json()).then(d => {
  console.log('Sources:', d.sources);
  console.log('MW:', d.molecular_weight);
  console.log('LogP:', d.logp);
  console.log('Odeur:', d.odor_type);
  console.log('Nom CC:', d.name);
})

// Test 2 : enrichissement single HE (geranium oil — PubChem échoue, CC ou TGSC peut répondre)
fetch('/api/enrichment/test/8000-46-2').then(r=>r.json()).then(d => {
  console.log('Sources:', d.sources);
  console.log('Nom:', d.name);
  console.log('Besoin Claude:', d.needs_claude_session);
})

// Test 3 : stats globales
fetch('/api/enrichment/stats').then(r=>r.json()).then(console.log)

// Test 4 : orphelins
fetch('/api/enrichment/orphans').then(r=>r.json()).then(d => {
  console.log('Orphelins:', d.count);
  d.orphans.forEach(o => console.log(' ', o.cas, o.name, 'dans', o.parfum_count, 'parfums'));
})
```

---

## Format KB enrichi (nouveau)

Chaque fiche `molecule_db` a maintenant un champ `metadata` JSON :

```json
{
  "cas": "78-70-6",
  "name": "Linalool",
  "mw": 154.25,
  "logp": 2.97,
  "bp": 198,
  "mp": null,
  "fp": 76,
  "density": 0.87,
  "vp": 0.159,
  "formula": "C10H18O",
  "smiles": "C=CC(O)(CCC=C(C)C)C",
  "odor_type": "floral",
  "odor_desc": "floral, woody, citrus",
  "volatility": "tete",
  "sources": ["pubchem", "common_chemistry", "tgsc"],
  "needs_claude": false
}
```

Ce format est lu par `getMoleculeKB()` pour le module prédictif.

---

## Workflow session Claude (pour les CAS incomplets)

### Exporter les CAS à enrichir
```javascript
fetch('/api/enrichment/needs-claude').then(r=>r.json()).then(d => {
  console.log(JSON.stringify(d.molecules, null, 2));
  // Copier ce JSON et le coller dans une session Claude
})
```

### Format d'import (à préparer en session Claude)
```json
[
  {
    "cas": "8000-46-2",
    "name": "Huile essentielle de géranium",
    "common_name": "Geranium oil",
    "odor_type": "floral",
    "odor_description": "Rose-like, green, sweet, minty",
    "olfactory_family": "floral",
    "is_natural": true,
    "pyramid_position": "coeur",
    "candle_behavior": "Bonne diffusion, compatible cires végétales, dosage 6-8%"
  }
]
```

### Importer les résultats
```javascript
fetch('/api/enrichment/import-claude', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({ entries: [ /* le JSON ci-dessus */ ] })
}).then(r=>r.json()).then(console.log)
```

---

## Rétrocompatibilité

Les anciens endpoints `/api/pubchem/*` fonctionnent toujours — ils appellent le nouveau module en interne. Tu peux migrer progressivement l'UI sans urgence.

Le module `molecule-engine.js` (MOLECULE_DB en RAM) n'est PAS modifié. Le nouveau module enrichit la KB, qui est la source de vérité. Le prédictif utilise `getMoleculeKB()` qui lit la KB.
