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
npm run test:published      # contrôle des JSON publiés (schéma, aucun doublon dans la ligne principale ni dans un emplacement)
npm run typecheck
```

La clé Riot est lue dans `tools/lol-stats/.env` (`RIOT_API_KEY=RGAPI-…`, ignoré par Git) ou dans le secret GitHub `RIOT_API_KEY`. Elle n'est jamais écrite dans un fichier, un log ou le site.

## Configuration (variables d'environnement)

| Variable | Défaut | Rôle |
|---|---|---|
| `LOL_STATS_PLATFORMS` | plateformes activées dans `PLATFORMS` (`src/config.ts`) : `EUW1,KR,NA1` | Plateformes collectées, séparées par des virgules. Chaque région a ses propres limites et est collectée en parallèle. |
| `LOL_STATS_BUDGET_MINUTES` | `50` (workflow : 330 ou 240) | Durée maximale d'une collecte. |
| `LOL_STATS_PLAYER_CONCURRENCY` | `16` | Joueurs parcourus en même temps (4 parties en parallèle par joueur) ; le limiteur garde le rythme (45 appels/s par région). |
| `LOL_STATS_FLUSH_GAMES`, `LOL_STATS_FLUSH_MINUTES` | `1000`, `5` | Sauvegarde de l'état (R2) toutes les 1 000 nouvelles parties ou toutes les 5 min. |
| `LOL_STATS_MAX_GAMES` | `0` | Plafond de nouvelles parties par collecte (0 = budget seul). |
| `LOL_STATS_PAGES_PER_DIVISION` | `0` | Pages de 205 joueurs par division Diamant / Émeraude (0 = toutes : collecte complète). |
| `LOL_STATS_MIN_BUILD_GAMES`, `LOL_STATS_MIN_BUILD_SHARE` | `50`, `0.03` | Seuil des 3 builds les plus joués : `max(50 parties, 3 % des parties du champion dans le rôle)`. |
| `LOL_STATS_OFF_META_MIN_SHARE`, `LOL_STATS_OFF_META_MAX_SHARE`, `LOL_STATS_OFF_META_MIN_GAMES` | `0.005`, `0.03`, `30` | Build OFF-META : entre 0,5 % et 3 % des parties, au moins 30 parties. |
| `LOL_STATS_ALT_MIN_SHARE`, `LOL_STATS_ALT_MIN_GAMES` | `0.08`, `3` | Part minimale des achats faits à son emplacement et nombre minimal de parties d'une alternative (4ᵉ à 6ᵉ objet). |
| `LOL_STATS_LATE_SHARE` | `0.7` | Un objet acheté 6ᵉ dans plus de 70 % des cas n'est pas proposé 4ᵉ. |
| `LOL_STATS_MIN_MATCHUP_GAMES` | `50` | Seuil des adversaires et duos. |
| `LOL_STATS_MIN_GAMES_NEW_PATCH` | `200` | Parties d'un champion/rôle avant de basculer sur le nouveau patch. |
| `LOL_STATS_LOW_SAMPLE_GAMES` | `200` | En dessous, la page affiche un avertissement « peu de données ». |
| `LOL_STATS_STATE_DIR` | `tools/lol-stats/.state` | État local (développement). |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | — | État sur Cloudflare R2 (production). |

## Limites Riot

Le client lit les limites dans les en-têtes de chaque réponse (`X-App-Rate-Limit`, `X-App-Rate-Limit-Count`, `X-Method-Rate-Limit`, `X-Method-Rate-Limit-Count`). Il garde une marge de 10 % et respecte `Retry-After` sur les erreurs 429. Il fonctionne donc avec n'importe quelle clé : développement (20 req/s, 100 req/2 min, expire en 24 h), personnelle ou production. Il y a un limiteur par région et par méthode.

## Données

1. **Joueurs** : collecte complète, sur EUW1, KR et NA1 : tous les Challenger, Grand Maître et Maître, et toutes les pages Diamant I-IV et Émeraude I-IV (environ 690 000 joueurs sur EUW1, 620 000 sur KR, 290 000 sur NA1 en novembre 2026). La liste est rafraîchie une fois par jour (`players/{PLATEFORME}.tsv.gz`) et parcourue en rotation : chaque joueur est consulté une fois par passe, en demandant les parties depuis le début de la passe précédente (`rotation/{PLATEFORME}.json`) ; la première passe remonte au début du patch précédent.
2. **Parties** : classées solo (`queue=420`) du patch courant et du patch précédent, chacune rangée sous son propre patch. Elles sont dédoublonnées, et seules sont gardées les parties d'au moins 15 minutes, sans reddition anticipée. Chaque joueur de la liste garde son palier dans l'enregistrement : ses parties comptent dans les filtres de son palier (les enregistrements antérieurs au 2026-11-15 n'ont que le palier de la partie, le plus bas des joueurs connus).
3. **Extraction compacte par participant** (le JSON brut n'est jamais stocké) :
   - champion, rôle, victoire, adversaire de lane, coéquipiers ;
   - runes complètes, paire de sorts ;
   - ordre d'achat reconstruit depuis la timeline (annulations, reventes et composants gérés), puis phases d'objets : départ (< 1:30), premiers achats, objets majeurs, bottes de niveau 2 ;
   - ordre des compétences.
4. **État** (bucket R2 privé `R2_BUCKET`, hors Git : il contient les identifiants des joueurs et n'est jamais public) : enregistrements de parties en JSONL compressé et IDs déjà traités, par patch, liste des joueurs, rotation, manifestes de publication.

## Calculs

- **Pondération par joueur** : une partie compte pour 1/10 dans un filtre par joueur de ce filtre. Le taux de pick est la part du champion parmi les joueurs du rôle dans le filtre, × 2 (deux joueurs par rôle et par partie), plafonnée à 1.

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
- **Objets 4 à 6** : l'emplacement N prend l'objet le plus acheté en position N, hors objets déjà retenus et hors objets exclusifs avec eux : la ligne principale n'a aucun doublon. Chaque emplacement reçoit au plus 2 alternatives, les autres objets les plus achetés à cette position (au moins 8 % des achats faits à cet emplacement et 3 parties, jamais un objet du core ni un objet exclusif avec lui) ; une alternative peut apparaître à un autre emplacement (Rabadon souvent acheté 4ᵉ ou 5ᵉ). Un objet acheté 6ᵉ dans plus de 70 % des cas n'est pas proposé 4ᵉ.
- **Objets exclusifs** (déduits de Data Dragon, qui n'a pas de champ « groupe ») : une seule paire de bottes, un seul objet construit à partir de la Larme de la déesse, un seul objet par passif unique partagé (Ligne de vie, Lame enchantée, Fendoir…).
- **Matchups** : Faible contre / Fort contre (6 adversaires de lane, au moins 50 parties), meilleure synergie (jungle pour top et mid, support pour ADC et inversement, mid pour jungle).

## Sorties

- `builds/{patch}/{filtre}[/{PLATEFORME}]/{ChampionId}_{rôle}.json` : un fichier par champion et rôle (identifiants seulement, < 30 Ko, validé par `zod`). Filtres « et au-dessus » : `emerald_plus`, `diamond_plus`, `master_plus`, `grandmaster_plus`, `challenger` ; rang exact : `emerald`, `diamond`, `master`, `grandmaster`.
- `public/data/lol/builds/{patch}/{palier}/index.json` : champions, rôles, tier, taux.
- `public/data/lol/builds/meta.json` : patchs disponibles, date de mise à jour, parties par palier.
- `public/data/lol/static/{version}/{fr_FR|en_US}/core.json` et `champions/{Id}.json` : noms, descriptions et icônes Data Dragon dans la langue de la page.

Avec plusieurs plateformes, des fichiers par plateforme sont ajoutés sous `{filtre}/{PLATEFORME}/`. Le patch courant et le précédent sont publiés ; un patch sans nouvelle partie depuis la dernière publication n'est pas réagrégé, sauf si le format des fichiers a changé (`FORMAT` dans `src/publish.ts`).

**Hébergement** : tous les fichiers `builds/` vont dans le bucket R2 public `R2_PUBLIC_BUCKET` (variable du dépôt ; seuls les fichiers modifiés sont envoyés, d'après un manifeste de hachages). Git ne garde que `{patch}/emerald_plus/*.json` (toutes régions), `meta.json` et les données statiques, nécessaires au prérendu. Vercel sert le reste via la réécriture `/data/lol/builds/:path*` vers l'URL publique du bucket (`vercel.json`) : un fichier présent dans le déploiement est servi en priorité.

## Workflow GitHub (`.github/workflows/lol-stats.yml`)

- 00:17 UTC : collecte de 5 h 30. 12:17 UTC : collecte de 4 h, puis publication des deux patchs, `tools/sync-champions.mjs`, `detect-reworks` au premier passage d'un nouveau patch, commit (sous l'identité du propriétaire, pour que Vercel déploie) et Deploy Hook Vercel. 06:17 et 18:17 UTC : collecte de rattrapage de 5 h 30, qui s'arrête d'elle-même dès que le premier passage sur tous les joueurs de chaque région est terminé (environ 22 h de runner par jour pendant le rattrapage). Environ 10 h de runner par jour ensuite : les runs planifiés ne démarrent que si le dépôt est public (minutes gratuites).
- Manuel (`workflow_dispatch`) : `mode` = `full`, `crawl`, `publish`, `smoke` (clé et limites) ou `count` (joueurs par palier et par région), `budget_minutes` (330 au plus), `platforms`.
- Une erreur Riot passagère (5xx ou 429 après les nouvelles tentatives) saute la partie ou le joueur ; 401 / 403 arrêtent la collecte.
