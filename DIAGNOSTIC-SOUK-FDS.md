# DIAGNOSTIC — Pourquoi c'était le souk

## 5 causes racines identifiées

---

### CAUSE 1 : Le parser Python laisse passer des noms parasites

**Fichier** : `modules/fds-parser.py`

**Problème** : Quand le parser ne trouve pas de nom chimique explicite
(label "Nom chimique:"), il cherche "un texte alphabétique proche du CAS".
Ce fallback ramasse des lignes de classification GHS, des headers de page,
ou des phrases réglementaires.

**Lignes fautives** (parse_composition_universal, ~ligne 1280) :
```python
if not nom:
    for j, L in context_lines:
        if (len(L) > 3 and not RE_CAS.search(L) and ...):
            nom = L.strip()  # ← ramasse n'importe quoi
```

**Résultat** : "Aquatic Chronic 2, H411", "Skin Irrit. 2, H315",
"FICHE DE DONNÉES...", "SAFETY DATA SHEET", "[Page 3 / 7]"

**Même problème dans** :
- `parse_composition_jeanniel` (ligne 599) : crée `CAS {cas}` en fallback
- `parse_composition_labeled` (ligne 823) : collecte les `nom_parts` sans
  filtrer les lignes GHS/réglementaires

**FIX** : Ajouter une validation de nom AVANT insertion :
```python
BAD_NAME_PATTERNS = [
    r'^(CAS\s|FICHE|SAFETY|RUBRIQUE|SECTION|Skin\s|Eye\s|Flam\.|Aquatic|Acute|STOT|Asp\.|Repr\.)',
    r'^(Facteur|Information|Rapport|règlement|\?$|-ONE\s|EINECS|\[Page)',
    r'H\d{3}',  # H-codes = classification, pas un nom
    r'^Page\s+\d',
]

def is_valid_component_name(name):
    if not name or len(name) < 3:
        return False
    for pat in BAD_NAME_PATTERNS:
        if re.match(pat, name, re.IGNORECASE):
            return False
    return True
```

---

### CAUSE 2 : L'import crée des parfums avec noms pourris

**Fichier** : `server.js` — routes `reimport-archive` (~4952) et `import-db` (~5306)

**Problème** : Le nom du parfum est extrait du JSON parsé SANS validation :
```js
const nom = (id.nom || p.fichier || '').toUpperCase().trim();
```
Quand `id.nom` est vide, ça prend le NOM DU FICHIER PDF comme nom de parfum.
Ex: "8572751_COUR_DES_EPICES_2026-02-12.pdf" → parfum nommé comme le fichier.

**Résultat** : 12 parfums doublons avec préfixe numérique ou suffixe date.

**FIX** : Nettoyer le nom avant insertion :
```js
function cleanFragranceName(raw) {
    let name = raw.toUpperCase().trim();
    // Supprimer extension et dates
    name = name.replace(/\.PDF$/i, '');
    name = name.replace(/_\d{4}-\d{2}-\d{2}.*/g, '');
    // Supprimer préfixe numérique (code Robertet)
    name = name.replace(/^\d{7,}\s*[_\s]+/, '');
    // Underscores → espaces
    name = name.replace(/_/g, ' ').trim();
    return name;
}
```

---

### CAUSE 3 : Le dédoublonnage KB est trop strict

**Fichier** : `server.js` — `reimport-archive` (~4949)

**Problème** : Le check doublon utilise le titre EXACT :
```js
if (!(await db.get('SELECT id FROM knowledge_base WHERE title = ?', [title])))
```
Le titre est construit comme `"FDS Parfum : ${nom}"` + le code.
Si le nom change légèrement (accents, underscores, date dans le nom de fichier),
c'est considéré comme une NOUVELLE FDS → doublons en cascade.

**Résultat** : 5 FDS pour Cour des Epices, 11 pour Armagnac, etc.

**FIX** : Dédoublonner par reference/code ou par nom normalisé :
```js
// Vérifier si une FDS existe déjà pour ce parfum
const normalizedName = cleanFragranceName(nom);
const existingKB = await db.get(
    `SELECT id FROM knowledge_base WHERE category = 'fds_parfum'
     AND (title LIKE ? OR title LIKE ?)`,
    [`%${normalizedName}%`, `%${code}%`]
);
if (existingKB) {
    // UPDATE le contenu au lieu de créer un doublon
    await db.run('UPDATE knowledge_base SET content = ?, updated_at = datetime("now") WHERE id = ?',
        [JSON.stringify(p, null, 2), existingKB.id]);
} else {
    // INSERT nouvelle entrée
}
```

---

### CAUSE 4 : Le dédoublonnage fragrances est trop naïf

**Fichier** : `server.js` — `reimport-archive` et `import-db`

**Problème** : Le check utilise `UPPER(name)` exact :
```js
const existing = await db.get('SELECT id FROM fragrances WHERE UPPER(name) = ?', [nom]);
```
- "COUR DES EPICES" ≠ "8572751 COUR DES EPICES" → doublon créé
- "L'ORANGERIE" ≠ "LORANGERIE" → doublon créé
- "CHAMBRE D'AMBRE" ≠ "CHAMBRE DAMBRE" → doublon créé

**FIX** : Normaliser pour la comparaison + chercher aussi par reference :
```js
function normalizeForMatch(name) {
    return name.toUpperCase()
        .replace(/^\d{7,}\s*/, '')     // strip numeric prefix
        .replace(/['']/g, '')          // strip apostrophes
        .replace(/[_\-./]/g, ' ')      // normalize separators
        .replace(/\s+/g, ' ').trim();
}

// Check par reference OU par nom normalisé
const cleaned = normalizeForMatch(nom);
const existing = await db.get(
    `SELECT id FROM fragrances WHERE reference = ? OR UPPER(REPLACE(REPLACE(name, "'", ""), "_", " ")) = ?`,
    [code, cleaned]
);
```

---

### CAUSE 5 : Le contenu JSON de la FDS KB n'a pas de fragrance_id

**Fichier** : `server.js` — `reimport-archive` et `import-db`

**Problème** : La FDS est insérée dans knowledge_base AVANT que le parfum
ne soit créé dans la table fragrances. Le JSON `content` ne contient ni
`fragrance_id` ni `reference` ni `product_name` exploitables.

**Résultat** : Impossible de relier FDS ↔ Parfum après coup sans parser
le titre (ce qu'on a dû faire dans fix-fds-cleanup.js).

**FIX** : Après création du parfum, mettre à jour la FDS KB :
```js
// Après avoir créé/trouvé le fragId :
const kbEntry = await db.get(
    "SELECT id, content FROM knowledge_base WHERE category = 'fds_parfum' AND title LIKE ?",
    [`%${normalizedName}%`]
);
if (kbEntry) {
    const content = JSON.parse(kbEntry.content);
    content.fragrance_id = fragId;
    content.reference = code;
    content.product_name = nom;
    await db.run('UPDATE knowledge_base SET content = ? WHERE id = ?',
        [JSON.stringify(content), kbEntry.id]);
}
```

---

## Résumé des 5 fixes

| # | Cause | Fichier | Impact |
|---|-------|---------|--------|
| 1 | Parser accepte noms parasites | fds-parser.py | 330 noms pourris |
| 2 | Noms de fichiers PDF comme noms de parfums | server.js | Noms illisibles |
| 3 | Dédup KB par titre exact | server.js | 78 FDS doublons |
| 4 | Dédup fragrances trop naïf | server.js | 12 parfums doublons |
| 5 | Pas de fragrance_id dans FDS KB | server.js | Matching impossible |

## Ordre d'implémentation

1. **fds-parser.py** : Validation des noms composants (CAUSE 1)
2. **server.js** : Fonction `cleanFragranceName()` (CAUSE 2)
3. **server.js** : Dédup KB par nom normalisé/reference (CAUSE 3)
4. **server.js** : Dédup fragrances normalisé (CAUSE 4)
5. **server.js** : Lien fragrance_id dans FDS KB (CAUSE 5)
