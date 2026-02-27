# RÈGLES CLAUDE — LIRE AVANT TOUTE MODIFICATION

## Règle 1 — Ne jamais modifier ce qui fonctionne

Avant de toucher un fichier, une fonction, un bloc, un endpoint :
- Est-ce que ça produit un MAUVAIS RÉSULTAT ? (pas "est-ce que je ferais autrement")
- Si NON → NE PAS TOUCHER
- "Pas optimal" ≠ "cassé"
- "Deux bases coexistent" ≠ "bug"
- "Je ferais autrement" ≠ "raison de modifier"

## Règle 2 — Corriger les données, pas la structure

Si une valeur est fausse (LogP, BP, solubilité, odor_note) → corriger la valeur.
Ne PAS en profiter pour :
- Restructurer le module
- Unifier des bases
- Supprimer du code
- Changer des schémas
- Renommer des variables
- Déplacer des fonctions

## Règle 3 — Checklist AVANT toute modification

1. N a-t-il demandé cette modification ? OUI / NON
2. La fonction actuelle produit-elle un résultat faux ? OUI / NON
3. Ma modification change-t-elle UNIQUEMENT ce qui est faux ? OUI / NON
4. Ma modification touche-t-elle un bloc stable (voir liste) ? OUI / NON → STOP

Si réponse 1=NON ou 2=NON ou 3=NON ou 4=OUI → NE PAS MODIFIER.

## Règle 4 — Périmètre de travail

Quand N demande "corrige X" :
- Corriger X
- Ne PAS corriger Y, Z, W que j'ai vu en passant
- Ne PAS proposer de "profiter pour" améliorer autre chose
- Si je vois un vrai bug ailleurs → le SIGNALER, ne pas le corriger

## Blocs stables — NE PAS TOUCHER

| Composant | Fichier | Statut |
|-----------|---------|--------|
| MOLECULE_DB local | server.js L7145-7257 | ✅ STABLE — sert le parseur FDS |
| MOLECULE_NAMES | server.js L7269 | ✅ STABLE |
| Parseur FDS | server.js L7282-7530 | ✅ STABLE |
| Enrichissement composants | server.js L7549-7590 | ✅ STABLE |
| API /api/molecules-db | server.js L7541 | ✅ STABLE |
| API /api/molecules/db | server.js L7608 | ✅ STABLE |
| enrichAll() | molecule-profiles.js | ✅ STABLE (sauf MEASURED_DATA) |
| ODOR_DB merge | molecule-engine.js L1700 | ✅ STABLE |
| computeMoleculeProfile | molecule-engine.js | ✅ STABLE |
| analyzeFragranceProfile | molecule-engine.js | ✅ STABLE |
| Dashboard encours | server.js + public/ | ✅ STABLE |
| 6 pages cœur | public/*.html | ✅ STABLE |
| Backup system | server.js | ✅ STABLE |
| Import FDS/Excel | server.js | ✅ STABLE |

## Ce qui PEUT être modifié

- Valeurs dans MOLECULE_DB (molecule-engine.js) : données fausses uniquement
- Valeurs dans ODOR_DB (molecule-odors.js) : données fausses uniquement
- Valeurs dans MEASURED_DATA (molecule-profiles.js) : ajout de données vérifiées
- Nouveau code AJOUTÉ (pas remplaçant de l'existant)
- Fichiers HTML/CSS : uniquement sur demande de N
