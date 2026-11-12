# community-tips — « Tips de la communauté » des matchups LoL

Synthèse TeamUpp, par couple de champions, de ce que disent les joueurs (guides, vidéos, discussions), réécrite sans copie et vérifiée avec Data Dragon. Méthode complète : `docs/refonte/PROMPT_TIPS_COMMUNAUTE.md`.

## Commandes

```sh
cd tools/community-tips && npm ci
node src/add.ts <brouillon.json> <brouillon.notes.json>   # intègre un matchup (abilityHash, ordre d'affichage, index, progress)
node src/detect-reworks.ts [--dry-run]                     # reworks depuis la recherche → needsRecheck + issue GitHub
npm test                                                   # tests des accords et de la détection de rework
npm run tips:check                                         # depuis la racine : contrôle de tous les fichiers
```

`detect-reworks` tourne dans le workflow Builds (`.github/workflows/lol-stats.yml`), après la publication des statistiques. Une empreinte différente ne suffit pas : on compare les compétences du patch de la recherche et du patch courant. Un sort ou un passif renommé, ou une description réécrite (moins de 60 % de mots communs, chiffres exclus), compte comme un rework. Un simple changement de chiffres est ignoré. Les fichiers du champion passent en `needsRecheck` (badge « À revérifier depuis le rework ») et une issue « Rework détecté : {champion} » liste les matchups à refaire.

## Fichiers

- `public/assets/data/community-tips/{A}__{B}.json` : un fichier par couple (ids Data Dragon triés), schéma zod `src/schema.ts`.
- `public/assets/data/community-tips/index.json` : couples disponibles et statut, lu par le site.
- `notes/{A}__{B}.notes.json` (non publié) : recherches, pages tentées, idées gardées / retirées, phrases des sources pour le contrôle anti-copie.
- `progress.json` : couples faits, en cours, sources insuffisantes.
- `sites.json` : sites qui s'ouvrent bien ou bloquent la lecture, et `blacklist` : sites jamais acceptés comme source (contrôlé).

## Règles de consensus

- Seules les pages réellement lues comptent comme sources.
- Phase de lane et Vision & macro : au moins 2 sources lues.
- Mécaniques : 2 sources lues, ou 1 source lue + mécanique vérifiée dans Data Dragon.
- Une seule liste par point de vue, 8 tips au plus, triée par nombre de sources lues, puis vérifiés en jeu d'abord, puis lane, mécaniques, macro (la catégorie ne s'affiche pas).
- 30 mots max, gameplay uniquement (ni objets, ni runes, ni ordre de montée des sorts ; les fenêtres de puissance lvl 2/3/6 sont autorisées).
- FR : touches AZERTY et accords de genre des termes du glossaire (`tools/i18n-matchups/glossaire-lol-fr.md`, section 8).

`abilityHash` : SHA-256 du passif et des 4 sorts (noms, descriptions, temps de recharge, `en_US`) au patch `gameVersion`.
