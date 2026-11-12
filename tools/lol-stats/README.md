# lol-stats — statistiques de builds LoL pour TeamUpp

Collecte des parties classées solo/duo via l'**API officielle Riot** et calcule, pour chaque champion et chaque rôle, les meilleurs builds du patch en cours. Les seules sources de données sont l'API Riot (avec la clé du projet), Data Dragon et CommunityDragon (données statiques). Aucun site tiers n'est utilisé.

Paquet Node 22 en TypeScript (exécuté directement par Node), indépendant d'Angular.

## Commandes

```bash
cd tools/lol-stats
npm ci
node src/cli.ts crawl       # collecte (budget de temps : LOL_STATS_BUDGET_MINUTES, 35 par défaut)
node src/cli.ts aggregate   # calcule les stats du patch courant et écrit public/data/lol/builds/{patch}/…
node src/cli.ts publish     # aggregate + meta.json + données statiques, garde le patch courant et le précédent
node src/cli.ts dev         # petit échantillon avec une clé de développement (500 parties) puis publish
npm test                    # tests unitaires (node:test)
npm run typecheck
```

La clé Riot est lue dans `tools/lol-stats/.env` (`RIOT_API_KEY=RGAPI-…`, ignoré par Git) ou dans le secret GitHub `RIOT_API_KEY`. Elle n'est jamais écrite dans un fichier, un log ou le site.

## Configuration (variables d'environnement)

| Variable | Défaut | Rôle |
|---|---|---|
| `LOL_STATS_PLATFORMS` | `EUW1` | Plateformes collectées, séparées par des virgules (`EUW1,KR,NA1`). Chaque région a ses propres limites et est collectée en parallèle. |
| `LOL_STATS_BUDGET_MINUTES` | `35` | Durée maximale d'une collecte. |
| `LOL_STATS_MAX_GAMES` | `0` | Plafond de nouvelles parties par collecte (0 = budget seul). |
| `LOL_STATS_PAGES_PER_DIVISION` | `5` | Pages de 205 joueurs échantillonnées par division Diamant / Émeraude. |
| `LOL_STATS_MIN_BUILD_GAMES` | `100` | Seuil minimal d'un build candidat (avec 3 % des parties du champion dans le rôle). |
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
  - Clé d'un build = ses 3 premiers objets majeurs (hors bottes), sans tenir compte de l'ordre. On garde l'ordre d'achat le plus fréquent.
  - Seuil des candidats : `max(100 parties, 3 % des parties du champion dans le rôle)`.
  - Trois builds au maximum :
    1. le plus joué ;
    2. la meilleure borne basse de Wilson parmi les autres ;
    3. le suivant le plus joué qui a au moins un objet de core absent des deux premiers.
  - On ne complète jamais avec un build trop peu joué.
- **Par build** : page de runes la plus fréquente, sorts, départ, premiers achats (timing médian), timing médian du core, bottes, build complet (core + bottes + 4ᵉ et 5ᵉ objets), objets situationnels (alternatives en 4ᵉ à 6ᵉ position), ordre des compétences et ordre de max.
- **Matchups** : Faible contre / Fort contre (6 adversaires de lane, au moins 50 parties), meilleure synergie (jungle pour top et mid, support pour ADC et inversement, mid pour jungle), taux de victoire et core le plus joué contre chaque adversaire.
- **Meilleurs joueurs** : au moins 15 parties sur le champion et le rôle, triés par borne basse de Wilson.

## Sorties

- `public/data/lol/builds/{patch}/{palier}/{ChampionId}_{rôle}.json` : un fichier par champion et rôle (identifiants seulement, < 30 Ko, validé par `zod`). Paliers : `emerald_plus`, `diamond_plus`, `master_plus`, `grandmaster_plus`, `challenger`.
- `public/data/lol/builds/{patch}/{palier}/index.json` : champions, rôles, tier, taux.
- `public/data/lol/builds/meta.json` : patchs disponibles, date de mise à jour, parties par palier.
- `public/data/lol/static/{version}/{fr_FR|en_US}/core.json` et `champions/{Id}.json` : noms, descriptions et icônes Data Dragon dans la langue de la page.

Avec plusieurs plateformes, des fichiers par plateforme sont ajoutés sous `{palier}/{PLATEFORME}/`. Seuls le patch courant et le précédent sont conservés.
