# lol-stats — statistiques de builds LoL pour TeamUpp

Collecte des parties classées solo/duo via l'**API officielle Riot** et calcule, pour chaque champion et chaque rôle, les meilleurs builds du patch en cours. Les seules sources de données sont l'API Riot (avec la clé du projet), Data Dragon et CommunityDragon (données statiques). Aucun site tiers n'est utilisé.

Paquet Node 22 en TypeScript (exécuté directement par Node), indépendant d'Angular.

## Commandes

```bash
cd tools/lol-stats
npm ci
node src/cli.ts crawl       # collecte (budget de temps : LOL_STATS_BUDGET_MINUTES, 50 par défaut)
node src/cli.ts aggregate   # calcule les stats du patch courant et écrit public/data/lol/builds/{patch}/…
node src/cli.ts publish     # aggregate + meta.json + données statiques, garde le patch courant et le précédent
node src/smoke.ts           # quelques appels league-v4 et limites annoncées (échoue si ce ne sont pas celles de production)
node src/cli.ts dev         # petit échantillon avec une clé de développement (500 parties) puis publish
npm test                    # tests unitaires (node:test)
npm run test:published      # contrôle des JSON publiés (schéma, aucun objet en double dans un build)
npm run typecheck
```

La clé Riot est lue dans `tools/lol-stats/.env` (`RIOT_API_KEY=RGAPI-…`, ignoré par Git) ou dans le secret GitHub `RIOT_API_KEY`. Elle n'est jamais écrite dans un fichier, un log ou le site.

## Configuration (variables d'environnement)

| Variable | Défaut | Rôle |
|---|---|---|
| `LOL_STATS_PLATFORMS` | plateformes activées dans `PLATFORMS` (`src/config.ts`) : `EUW1` | Plateformes collectées, séparées par des virgules (`EUW1,KR,NA1`). KR et NA1 sont prêtes mais désactivées. Chaque région a ses propres limites et est collectée en parallèle. |
| `LOL_STATS_BUDGET_MINUTES` | `50` | Durée maximale d'une collecte. |
| `LOL_STATS_PLAYER_CONCURRENCY` | `8` | Joueurs parcourus en même temps (4 parties en parallèle par joueur) ; le limiteur garde le rythme. |
| `LOL_STATS_FLUSH_GAMES`, `LOL_STATS_FLUSH_MINUTES` | `1000`, `5` | Sauvegarde de l'état (R2) toutes les 1 000 nouvelles parties ou toutes les 5 min. |
| `LOL_STATS_MAX_GAMES` | `0` | Plafond de nouvelles parties par collecte (0 = budget seul). |
| `LOL_STATS_PAGES_PER_DIVISION` | `5` | Pages de 205 joueurs échantillonnées par division Diamant / Émeraude. |
| `LOL_STATS_MIN_BUILD_GAMES`, `LOL_STATS_MIN_BUILD_SHARE` | `50`, `0.03` | Seuil des 3 builds les plus joués : `max(50 parties, 3 % des parties du champion dans le rôle)`. |
| `LOL_STATS_OFF_META_MIN_SHARE`, `LOL_STATS_OFF_META_MAX_SHARE`, `LOL_STATS_OFF_META_MIN_GAMES` | `0.005`, `0.03`, `30` | Build OFF-META : entre 0,5 % et 3 % des parties, au moins 30 parties. |
| `LOL_STATS_ALT_MIN_SHARE` | `0.08` | Part minimale d'une alternative à son emplacement (4ᵉ à 6ᵉ objet). |
| `LOL_STATS_LATE_SHARE` | `0.7` | Un objet acheté 6ᵉ dans plus de 70 % des cas n'est pas proposé 4ᵉ. |
| `LOL_STATS_MIN_MATCHUP_GAMES` | `50` | Seuil des adversaires et duos. |
| `LOL_STATS_MIN_GAMES_NEW_PATCH` | `200` | Parties d'un champion/rôle avant de basculer sur le nouveau patch. |
| `LOL_STATS_LOW_SAMPLE_GAMES` | `200` | En dessous, la page affiche un avertissement « peu de données ». |
| `LOL_STATS_STATE_DIR` | `tools/lol-stats/.state` | État local (développement). |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | — | État sur Cloudflare R2 (production). |

## Limites Riot

Le client lit les limites dans les en-têtes de chaque réponse (`X-App-Rate-Limit`, `X-App-Rate-Limit-Count`, `X-Method-Rate-Limit`, `X-Method-Rate-Limit-Count`). Il garde une marge de 10 % et respecte `Retry-After` sur les erreurs 429. Il fonctionne donc avec n'importe quelle clé : développement (20 req/s, 100 req/2 min, expire en 24 h), personnelle ou production. Il y a un limiteur par région et par méthode.

## Données

1. **Joueurs** : tous les Challenger, Grand Maître et Maître, plus un échantillon de Diamant I-IV et Émeraude I-IV. La liste est rafraîchie une fois par jour et parcourue en rotation.
2. **Parties** : classées solo (`queue=420`) depuis le début du patch. Elles sont dédoublonnées, et seules sont gardées les parties du patch d'au moins 15 minutes, sans reddition anticipée. Le palier d'une partie est le plus bas des joueurs échantillonnés qui y figurent.
3. **Extraction compacte par participant** (le JSON brut n'est jamais stocké) :
   - champion, rôle, victoire, adversaire de lane, coéquipiers ;
   - runes complètes, paire de sorts ;
   - ordre d'achat reconstruit depuis la timeline (annulations, reventes et composants gérés), puis phases d'objets : départ (< 1:30), premiers achats, objets majeurs, bottes de niveau 2 ;
   - ordre des compétences.
4. **État** (hors Git) : enregistrements de parties en JSONL compressé et IDs déjà traités, par patch. Un nouveau patch ouvre un nouvel état sans effacer l'ancien.

## Calculs

- **Taux** :
  - victoire = victoires / parties ;
  - pick = parties du champion dans le rôle / parties du palier ;
  - ban = parties où il est banni / parties du palier ;
  - delta = écart avec le patch précédent (même palier).
- **Tier** (par rôle, parmi les champions avec au moins `LOL_STATS_MIN_MATCHUP_GAMES` parties dans le rôle) :

  ```
  score = z(borne basse de Wilson 95 % du taux de victoire) + 0,5 × z(ln taux de pick) + 0,25 × z(taux de ban)
  ```

  Découpage en percentiles : S+ 5 %, S 15 %, A 25 %, B 25 %, C 20 %, D 10 %. La borne de Wilson pénalise les petits échantillons ; le pick et le ban départagent les champions qui gagnent autant.
- **Builds** :
  - Objets principaux = objets terminés (même classification) **et bottes de niveau 2**, dans l'ordre réel d'achat. Ni composants, ni consommables, ni balises.
  - Clé d'un build = ses 3 premiers objets principaux (sans tenir compte de l'ordre ; on affiche l'ordre le plus fréquent) + rune clé + arbre secondaire. Mêmes objets avec une autre page = autre build. Les parties sous 3 objets principaux ne comptent que dans les statistiques générales.
  - Quatre builds au maximum :
    1. à 3. les 3 clés les plus jouées au-dessus de `max(50 parties, 3 % des parties du champion dans le rôle)` ;
    4. **OFF-META** : parmi les autres clés, entre 0,5 % et 3 % des parties, au moins 30 parties et un taux de victoire supérieur à celui du champion, la meilleure borne basse de Wilson. Absent si aucune ne remplit ces conditions.
- **Par build** (sur ses seules parties) : page de runes complète la plus fréquente (même rune clé et arbre secondaire), paire de sorts, départ et premier retour (multiensembles avec quantités), timing médian de chacun des 3 objets principaux, ordre des compétences et ordre de max.
- **Objets 4 à 6** : l'emplacement N prend l'objet le plus acheté en position N, hors objets déjà retenus et hors objets exclusifs avec eux ; au plus 2 alternatives par emplacement (au moins 8 % des parties du build, jamais affichées ailleurs). Aucun objet n'apparaît deux fois. Un objet acheté 6ᵉ dans plus de 70 % des cas n'est pas proposé 4ᵉ.
- **Objets exclusifs** (déduits de Data Dragon, qui n'a pas de champ « groupe ») : une seule paire de bottes, un seul objet construit à partir de la Larme de la déesse, un seul objet par passif unique partagé (Ligne de vie, Lame enchantée, Fendoir…).
- **Matchups** : Faible contre / Fort contre (6 adversaires de lane, au moins 50 parties), meilleure synergie (jungle pour top et mid, support pour ADC et inversement, mid pour jungle).

## Sorties

- `public/data/lol/builds/{patch}/{palier}/{ChampionId}_{rôle}.json` : un fichier par champion et rôle (identifiants seulement, < 30 Ko, validé par `zod`). Paliers : `emerald_plus`, `diamond_plus`, `master_plus`, `grandmaster_plus`, `challenger`.
- `public/data/lol/builds/{patch}/{palier}/index.json` : champions, rôles, tier, taux.
- `public/data/lol/builds/meta.json` : patchs disponibles, date de mise à jour, parties par palier.
- `public/data/lol/static/{version}/{fr_FR|en_US}/core.json` et `champions/{Id}.json` : noms, descriptions et icônes Data Dragon dans la langue de la page.

Avec plusieurs plateformes, des fichiers par plateforme sont ajoutés sous `{palier}/{PLATEFORME}/`. Seuls le patch courant et le précédent sont conservés.

## Workflow GitHub (`.github/workflows/lol-stats.yml`)

- Quotidien à 05:17 UTC, budget de 50 min : collecte, publication, `tools/sync-champions.mjs`, `detect-reworks` (au premier passage d'un nouveau patch), commit et Deploy Hook Vercel.
- Manuel (`workflow_dispatch`) : `mode` = `full`, `crawl` (collecte seule), `publish` (agrégation et publication seules) ou `smoke` (clé et limites), `budget_minutes` (330 au plus : un job GitHub dure 6 h maximum), `platforms`.
- Une erreur Riot passagère (5xx ou 429 après les nouvelles tentatives) saute la partie ou le joueur ; 401 / 403 arrêtent la collecte.
