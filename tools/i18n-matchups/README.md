# Traduction FR des conseils de matchup

Les conseils de matchup (`counters_matchups` des guides, `data/lol/<champion>.json`) sont rédigés en anglais. Ce dossier contient leur traduction française par TeamUpp, avec le langage des joueurs de LoL et les touches **AZERTY** (Q → A, W → Z, E et R inchangés).

## Fichiers

| Fichier | Rôle |
|---|---|
| `glossaire-lol-fr.md` | Règles de style : jargon conservé, ton, touches, exemples. À suivre pour toute traduction. |
| `glossary.json` | Noms officiels Data Dragon EN → FR : champions et compétences (touche QWERTY + AZERTY), objets, runes, sorts d'invocateur. |
| `source.json` | Conseils anglais publiés, un par matchup. Id : `champion|adversaire|0` (slugs). |
| `matchups-fr.json` | Traductions validées (même id, même champion / adversaire / difficulté, `text` en français). |
| `batches/*.json` | Lots de traduction `{ id: texte FR }`, fusionnés dans `matchups-fr.json`. |
| `work/` | Fichiers de travail temporaires (non versionnés). |

## Comment le site les utilise

`npm run build` lance `tools/split-guides.mjs`, qui remplit `tipsFr` dans `public/assets/data/matchups/<slug>.json` à partir de `matchups-fr.json`, **seulement si le texte anglais n'a pas changé** depuis la traduction (comparaison avec `source.json`). La page Matchups FR affiche alors la traduction et la mention « Conseils traduits et adaptés par TeamUpp ». Sinon, elle affiche l'anglais avec le badge « EN ». Le build indique combien de conseils sont traduits et combien sont périmés.

## Ajouter ou mettre à jour des conseils

1. Mettre à jour les données sources (`data/lol/…`), puis régénérer : `npm run data:lol`.
2. Ré-extraire les textes anglais : `node tools/i18n-matchups/extract-source.mjs`.
   Les conseils modifiés ou nouveaux n'ont plus de traduction valable : ils s'affichent en anglais.
3. Si le patch a changé, mettre le glossaire à jour : `node tools/i18n-matchups/build-glossary.mjs`.
4. Traduire les conseils manquants en suivant `glossaire-lol-fr.md` :
   - `node tools/i18n-matchups/prepare-work.mjs 1` crée `work/chunk-01.json` (conseils non traduits) et `work/glossary-compact.md` ;
   - écrire un lot `batches/<nom>.json` au format `{ "champion|adversaire|0": "texte FR" }` ;
   - pour un conseil dont l'anglais a changé, supprimer l'ancienne entrée de `matchups-fr.json` ou fusionner avec `--force`.
5. Vérifier le lot : `node tools/i18n-matchups/check.mjs --batch=tools/i18n-matchups/batches/<nom>.json`.
6. Fusionner : `node tools/i18n-matchups/apply-batch.mjs` (reprise possible : les ids déjà traduits ne sont pas refaits).
7. Contrôle global : `node tools/i18n-matchups/check.mjs --complete`, qui doit afficher `OK: no blocking error`.
8. `npm run build`.

## Contrôles de `check.mjs`

- mêmes ids que la source, champion / adversaire / difficulté inchangés ;
- mêmes nombres (niveaux, %, timings) dans l'anglais et le français ;
- aucune touche QWERTY restante (Q / W isolés, hors QSS) et autant de A / Z que de Q / W dans la source (avertissement) ;
- aucun nom d'objet ou de rune anglais quand un nom FR existe ;
- aucun mot anglais courant (the, you, your, when, with…) ;
- rapport de longueur FR / EN entre 0,8 et 1,7 (avertissement).
