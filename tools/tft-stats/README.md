# tft-stats — statistiques TFT pour TeamUpp

Collecte les parties TFT **Classée** (file 1100) et **Double Up** (1160) via l'**API officielle Riot** (`tft-league-v1`, `tft-match-v1`, `tft-summoner-v1`) et calcule les compositions, les statistiques des champions et des objets du patch courant et du précédent. Données statiques : `tools/tft-static` (CommunityDragon). Aucun site tiers.

Paquet Node 22 en TypeScript (exécuté directement par Node). Il réutilise le client Riot (limites lues dans les en-têtes, `Retry-After`, un limiteur par région et par méthode), le stockage d'état R2 et Data Dragon (numéro de patch) de `tools/lol-stats`.

## Commandes

```bash
cd tools/tft-stats
npm ci && npm ci --prefix ../lol-stats
node src/cli.ts smoke     # appels TFT de test : codes HTTP, champs d'une partie, limites (jamais la clé)
node src/cli.ts count     # joueurs par palier et par file (dimensionnement)
node src/cli.ts crawl     # collecte (TFT_STATS_BUDGET_MINUTES, 45 par défaut)
node src/cli.ts publish   # agrégation des deux patchs, fichiers + meta.json
node src/cli.ts full      # crawl puis publish
node src/cli.ts sample    # données d'EXEMPLE inventées (sans clé), marquées `sample: true`
npm test                  # tests unitaires (node:test)
npm run typecheck
```

Clé : `RIOT_TFT_API_KEY` (produit TFT), sinon `RIOT_API_KEY` (une clé de développement couvre LoL et TFT), dans `tools/tft-stats/.env` (ignoré par Git) ou dans les secrets GitHub. Elle n'est jamais écrite dans un fichier, un log ou le site.

## Collecte

1. **Joueurs** (une fois par jour, `players/{PLATEFORME}.json.gz`) : Challenger, Grand Maître, Maître, puis Diamant, Émeraude (toutes les pages) et Platine (`TFT_STATS_PAGES_PLATINUM` pages par division, 5 par défaut), pour chaque file (classée et Double Up ont chacune leur classement). Chaque joueur garde son palier dans chaque file.
2. **Parties** : chaque joueur est consulté en rotation ; on demande ses `TFT_STATS_GAMES_PER_PLAYER` (20) parties les plus récentes depuis le début de la passe précédente. Une partie n'est téléchargée qu'une fois (dédoublonnage par patch). Sont gardées : files 1100 et 1160, set courant, patch courant et précédent. Les autres parties sont notées comme vues et jamais retéléchargées.
3. **Extraction** (le JSON brut n'est jamais stocké) : pour chacun des 8 joueurs, `placement`, `level`, synergies (`name`, `num_units`, `style`), unités (`character_id`, étoiles = `tier`, `itemNames`), augments, et le palier du joueur (sinon le plus bas palier connu de la partie).
4. **État** (bucket R2 privé `R2_BUCKET`, préfixe `tft-stats/`, jamais public : il contient les identifiants des joueurs) : parties en JSONL compressé, IDs vus, joueurs, rotation, patchs. Sauvegarde toutes les 2 000 parties ou 5 minutes : un run coupé reprend où il s'est arrêté.
5. Erreur passagère (5xx, 429 après nouvelles tentatives) : la partie ou le joueur est sauté. 401 / 403 arrêtent la collecte.

**Ce que l'API ne donne pas** : ni la position des unités sur le plateau, ni l'historique des montées de niveau, ni le début de partie. Seul le plateau final est connu (voir « Éditorial » plus bas).

## Calculs (par patch, file et filtre de rang)

Filtres : `platinum_plus` (défaut), `emerald_plus`, `diamond_plus`, `master_plus`. Un plateau compte dans les filtres du palier de son joueur.

- **Place moyenne** (1 = première), **top 4**, **victoire** (1ʳᵉ place), **taux de jeu** (plateaux concernés / plateaux du filtre).
- **Correction par le volume** : `place corrigée = (somme des places + K × 4,5) / (parties + K)`, `K = TFT_STATS_SHRINK_GAMES` (100). Un petit échantillon tend vers 4,5.
- **Tiers** S / A / B / C : seuils sur la place corrigée, configurables par type (`TFT_STATS_CUTS_COMPS` 4,15 / 4,35 / 4,55 ; `_CHAMPIONS` 4,25 / 4,45 / 4,6 ; `_ITEMS` 4,2 / 4,4 / 4,6 ; `_COMPAT` 4,1 / 4,3 / 4,5). Ces valeurs de départ sont à ajuster sur les vraies données.
- **Compositions** :
  - regroupement des plateaux d'une file (tous rangs) :
    - graines = plateaux de même synergie principale (synergie active non unique de meilleur palier, puis la plus fournie) et de même carry principal (unité qui porte le plus d'objets complets) ;
    - les graines dont les champions se ressemblent fusionnent (similarité de Jaccard pondérée par le coût ≥ `TFT_STATS_MERGE_SIMILARITY`, 0,72) ;
    - puis chaque plateau rejoint la compo la plus proche (similarité pondérée par le coût + 0,1 si même synergie principale, au moins `TFT_STATS_MIN_SIMILARITY`, 0,45), en 3 passes ;
    - les plateaux de moins de 4 champions ne rejoignent aucune compo ;
  - une compo est affichée dans un filtre si elle y a au moins `TFT_STATS_MIN_COMP_GAMES` (2 000) plateaux ;
  - **nom** = synergie principale la plus fréquente + champion qui porte le plus d'objets complets en moyenne ;
  - **version principale** : champions présents dans au moins la moitié des parties, autant que le niveau final médian (7 à 10), complétée jusqu'à 6 par ceux d'au moins un quart des parties ; étoiles = les plus fréquentes ;
  - **3 carrys** = les 3 unités qui portent le plus souvent 3 objets ; pour chacune, ses 3 objets les plus portés (% des parties de la compo où le carry le porte, place moyenne avec) et 2 alternatives ;
  - **variantes** : pour chaque unité principale X, le champion hors version principale le plus présent dans les parties sans X (au moins 30 % de ces parties et `TFT_STATS_MIN_VARIANT_GAMES`) → « Remplace X par Y au niveau N » (niveau médian) ;
  - **style** : « Reroll » si le carry coûte 1 à 3 et est 3 étoiles dans au moins la moitié des parties, sinon « Fast 9 » (niveau final moyen ≥ 8,6), « Fast 8 » (≥ 7,8), sinon « Niv. X » ;
  - **difficulté** (calculée, 1 facile à 3 difficile) : 1 point par champion à 5 PO au-delà du premier, +1 Fast 9, +1 reroll d'un 3 PO, +1 emblème parmi les objets des carrys.
- **Champions** : statistiques des plateaux où il est joué (une copie compte une fois), tier, objets seuls (≥ `TFT_STATS_MIN_HOLDER_GAMES`, 100) avec part et **écart** = place moyenne du champion avec l'objet − sans, triplets d'objets portés ensemble (≥ `TFT_STATS_MIN_TRIO_GAMES`, 50).
- **Objets** : plateaux où au moins une unité le porte (≥ `TFT_STATS_MIN_ITEM_GAMES`, 200), tier, **porteurs** = tous les champions au-dessus du seuil, triés par compatibilité (place corrigée), avec écart et tier de compatibilité.

## Éditorial (`public/data/tft/tft-comps-overrides.json`)

Par identifiant de compo (`?comp=`) : `placement` (case 0-27 de chaque unité, ligne 0 = ligne avant), `levelling` (montée de niveau), `early` (début de partie), `difficulty`, `notes`. Sans surcharge, le site calcule un **placement conseillé** (tanks devant au centre, carrys à distance dans les coins arrière, assassins sur les côtés arrière, autres unités à distance derrière ; règle dans `src/app/tft/logic/board.ts`) et masque montée de niveau et début de partie.

## Sorties

- `public/data/tft/stats/{patch}/{ranked|double_up}/{filtre}.json` (validé par `zod`, `src/schema.ts`) et `meta.json`.
- Tous les fichiers vont dans le bucket R2 public (`R2_PUBLIC_BUCKET`, préfixe `tft/stats/`), servi sous `/data/tft/stats/` par le Worker Cloudflare du site (`worker/index.js`, binding R2 `STATS`). Git ne garde que `platinum_plus` et `meta.json` (prérendu) ; un fichier présent dans le déploiement est servi en priorité.

## Workflow (`.github/workflows/tft-stats.yml`)

03:47 et 15:47 UTC : collecte de 45 min puis publication, commit, puis déploiement (`deploy-production.yml`). Les runs planifiés ne démarrent que si la variable du dépôt `TFT_STATS_ENABLED` vaut `true`. Manuel : `mode` = `full`, `crawl`, `publish`, `smoke`, `count`.
