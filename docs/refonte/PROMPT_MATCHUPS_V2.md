# Matchups v2 : difficulté très visuelle + états « aucun champion » et « un seul champion »

Contexte : la page `:lang/lol/matchups` est refaite (branche `refonte-2026`). Quand les deux champions sont choisis, le rendu est bon. En revanche, l'état initial est vide et sans intérêt : un bandeau, deux champs, un encadré. Et la difficulté ne se lit pas assez vite.

Travaille sur une nouvelle branche `feature/matchups-v2`, créée depuis `refonte-2026`. Présente-moi un plan court avant de coder.

**Maquettes de référence** (dans `docs/refonte/maquettes/`) :
- `LolMatchups.dc.html` : deux champions choisis. La tweak `difficulty` montre les 5 niveaux.
- `LolMatchupsEmpty.dc.html` : aucun champion choisi.
- `LolMatchupsOne.dc.html` : un seul champion choisi.
- `MobileMatchups.dc.html` : version mobile.

## 1. Système de difficulté (composant partagé)

Crée un modèle unique `MatchupDifficulty`. Les valeurs de l'API (`Tiny`, `Minor`, `Even`, `Major`, `Extreme`) correspondent à : Très facile, Facile, Moyen, Difficile, Extrême. Pour chaque niveau :

| Niveau | Couleur | Texte | Icône (SVG) | Message |
|---|---|---|---|---|
| Très facile | `#39C6D6` | `#5FD8E6` | double chevron haut | Tu domines la lane |
| Facile | `#4FD18B` | `#6FE0A2` | chevron haut | Avantage pour toi |
| Moyen | `#FFC93C` | `#FFD56B` | signe égal | Matchup équilibré |
| Difficile | `#FF8B3D` | `#FFA066` | chevron bas | Joue prudemment |
| Extrême | `#FF4F6D` | `#FF7A92` | double chevron bas | Survis à la lane |

La difficulté n'est **jamais portée par la couleur seule** : toujours couleur + icône + libellé, plus une jauge de 1 à 5 avec `aria-label`.

Composants à créer :
- **`DifficultyVerdict`** : grande pastille pleine dans la couleur du niveau, avec le texte « Matchup pour {champion} » et le niveau en Barlow Condensed italique 38 px, et un halo de la même couleur. Dessous, l'échelle 5 segments : le niveau courant est opaque et plus haut, les autres à 28 % d'opacité, avec leurs libellés. Puis une phrase de conseil générique du niveau.
- **`DifficultyBadge`** compact : icône + libellé sur fond à 16 %.
- **`DifficultyPips`** : 5 barrettes.

## 2. État « deux champions choisis » (existant, à enrichir)

- Le héros gagne un **halo radial** dans la couleur du niveau, en bas, et une bordure basse de 3 px de cette couleur.
- `DifficultyVerdict` s'affiche sous les sélecteurs.
- La carte de conseils a une **bordure haute de 4 px** dans la couleur du niveau, et un badge à droite du titre.
- Ajoute un bouton « Build de {champion} » quand la page Builds existe ; sinon, masque-le.
- Dans les 4 listes :
  - chaque ligne a une **barre gauche de 4 px** et un **dégradé de fond** dans la couleur du niveau, ainsi que l'icône, le libellé et les barrettes ;
  - en tête de chaque liste, une **barre de répartition** horizontale empilée montre la part de chaque niveau ;
  - un clic sur une ligne charge ce matchup.
- La légende séparée « Échelle de difficulté » disparaît : l'échelle est maintenant dans le verdict.

## 3. État « aucun champion » (nouveau)

- Héros plus haut avec le fond existant `matchup_bkg` et un grand titre.
- **Deux grands emplacements circulaires de 148 px** :
  - à gauche, « Ton champion » : contour vert pointillé, halo, « + », libellé « Étape 1 », avec le champ de recherche dessous ;
  - au centre, « VS » ;
  - à droite, « L'adversaire » : estompé, cadenas, « Étape 2 », avec le texte « Choisis d'abord ton champion ».
- **Grille « Avec qui joues-tu ? »** : tous les champions qui ont des données de matchup, avec un filtre par rôle (puces Tous, Top, Jungle, Mid, ADC, Support, à partir des champs `isTop`… de `AllChampions.json`). Un clic sur un champion le sélectionne.
- 3 cartes « Comment ça marche ».
- La **légende des 5 niveaux** en cartes colorées.

## 4. État « un seul champion » (nouveau)

- Héros coupé en deux :
  - à gauche, le splash du champion choisi, son portrait de 132 px avec un halo vert, son nom, son rôle, « Voir son build » (si la page existe) et « Changer » ;
  - à droite, l'emplacement ennemi en pointillé rouge, avec la **combobox ouverte**. Les suggestions affichent déjà le badge de difficulté de chaque adversaire.
- **Tableau « Contre qui joues-tu ? » en 5 colonnes**, de Extrême à Très facile :
  - un en-tête plein dans la couleur du niveau, avec l'icône et le nombre de champions ;
  - les champions de ce niveau en grille de 2, avec un liseré de couleur autour de l'icône ;
  - pour une colonne vide : « Aucun matchup classé ici pour l'instant ».
  - Source des données : `counters_matchups` et la liste « Avantageux pour » déjà calculée.
- Bandeau en bas : « Ton adversaire n'est pas dans la liste ? » avec le bouton « Demande de mise à jour », qui réutilise le formulaire existant.

Le même schéma s'applique dans l'autre sens : si seul l'ennemi est choisi, montre « Qui le contre le mieux ? » avec les niveaux vus du côté de l'ennemi.

## 5. Mobile (390 px)

- Le verdict devient une **barre pleine** sous les portraits (icône, « Matchup pour X », niveau, 5 barrettes).
- Le tableau à 5 colonnes devient **5 sections empilées** repliables, la plus difficile ouverte par défaut.
- La grille de l'état vide passe à 4 colonnes.

## 6. Qualité

- L'état de sélection est reflété dans l'URL (`?me=janna&vs=blitzcrank`), pour que chaque matchup soit partageable et indexable. Prérends au minimum les pages des champions seuls.
- Navigation complète au clavier (combobox ARIA, grille de champions).
- Animations uniquement en `transform`/`opacity`, avec `prefers-reduced-motion` respecté.
- Tous les textes passent par l'i18n FR/EN.
- Lance `npm run build` et vérifie les 3 états en desktop et en mobile, plus les 5 niveaux de difficulté. Résume-moi ce qui a été vérifié.
