# Nouvelle fonctionnalité : pages « Build » pour chaque champion LoL, mises à jour à chaque patch

Tu travailles sur le dépôt Angular de TeamUpp. Crée une branche `feature/builds-champions` depuis la branche la plus à jour (`refonte-2026` si elle n'est pas encore fusionnée, sinon `main`).

**Objectif :** une page par champion et par rôle, avec les meilleurs builds du patch en cours, calculés **uniquement à partir de l'API officielle Riot et de Data Dragon**. Les données doivent être recalculées automatiquement pendant tout le patch, et basculer seules au patch suivant (environ toutes les 2 semaines).

**Maquettes de référence** (dans `docs/refonte/maquettes/`) :
- `LolBuild.dc.html` : desktop. Les chiffres sont des **données d'exemple**.
- `MobileBuild.dc.html` : mobile.
- Dans les maquettes, les images `/_blob/…` sont des icônes Data Dragon ; on les identifie par leur `alt`/`title`. Dans le JS de `LolBuild.dc.html`, les tables `IT` et `R` sont indexées par **les vrais identifiants Riot** des objets et des runes.

## Règles

- **Commence par un plan** (architecture, fichiers, estimation des volumes d'appels API) et **pose-moi les questions ouvertes** listées en fin de document. Attends ma validation.
- **Interdiction absolue de récupérer des données sur Mobalytics, u.gg, op.gg, lolalytics ou tout autre site** : ni scraping ni copie. Seules sources autorisées : l'API Riot (avec ma clé) et Data Dragon / CommunityDragon pour les données statiques.
- La clé Riot ne va **jamais** dans le front, le bundle ou le dépôt. Elle passe uniquement par des secrets : GitHub Actions et `.env` local ignoré par Git.
- Fais un commit par étape, avec des tests unitaires pour toute la logique de calcul, et lance `npm run build` à la fin de chaque étape.

---

## Étape 1 — Contraintes Riot (à respecter dans le code)

- **Types de clé :**
  - La clé de **développement** expire toutes les 24 h : prototypage uniquement.
  - La clé **personnelle** ne peut pas servir à un site public.
  - Il faut une clé de **production** pour TeamUpp ; je la demanderai avec le prototype. Son plafond de départ est de 500 requêtes / 10 s et 30 000 / 10 min, **par région**.
  - Le code doit donc fonctionner avec n'importe quelle clé : il **lit les limites dans les en-têtes de réponse** (`X-App-Rate-Limit`, `X-App-Rate-Limit-Count`, `X-Method-Rate-Limit`, `X-Method-Rate-Limit-Count`) et **respecte `Retry-After` sur les erreurs 429**.
- **Limites par région :**
  - Les limites s'appliquent séparément à chaque région : collecte les régions **en parallèle**, avec une file d'attente et un limiteur par région et par méthode.
  - Correspondance plateforme → routage régional : `EUW1`/`EUN1`/`TR1`/`RU` → `europe` ; `KR`/`JP1` → `asia` ; `NA1`/`BR1`/`LA1`/`LA2` → `americas`. Les plateformes sont configurables ; par défaut `EUW1`, `KR`, `NA1`.
- **Endpoints utilisés :**
  - `league-v4` : `challengerleagues`, `grandmasterleagues`, `masterleagues` en `RANKED_SOLO_5x5`, et `entries/{queue}/{tier}/{division}?page=` pour Diamant et Émeraude. Utilise le `puuid` des entrées ; s'il est absent, résous-le via `summoner-v4`.
  - `match-v5` : `matches/by-puuid/{puuid}/ids?queue=420&startTime=…&count=100`, `matches/{id}` et `matches/{id}/timeline`.
- **Données statiques :**
  - Data Dragon (`versions.json`, `champion.json`, `champion/{id}.json`, `item.json`, `runesReforged.json`, `summoner.json`) en `fr_FR` et `en_US`.
  - CommunityDragon pour les icônes des fragments de stats (`perks.json`, dossier `statmods`).
- La mention légale Riot du pied de page doit rester.

## Étape 2 — Collecteur `tools/lol-stats/`

Paquet Node 22 en TypeScript, indépendant d'Angular, avec un `README` et des commandes `crawl`, `aggregate`, `publish`.

1. **Détection du patch :**
   - Le patch courant est le `major.minor` de la première entrée de `versions.json` de Data Dragon.
   - Une partie appartient au patch si `info.gameVersion` commence par ce `major.minor`.
   - Quand un nouveau patch apparaît, ouvre un nouvel état d'agrégation **sans effacer l'ancien**.
2. **Échantillonnage des joueurs :**
   - Pour chaque plateforme : tout Challenger, Grand Maître et Maître, plus un échantillon paginé de Diamant I-IV et Émeraude I-IV.
   - Garde le palier de chaque joueur pour les filtres « Émeraude+ », « Diamant+ » et « Maître+ ».
   - Rafraîchis la liste une fois par jour.
3. **Parties :**
   - IDs de parties classées solo (`queue=420`) depuis le début du patch, dédoublonnés dans un ensemble persistant.
   - Pour chaque nouvelle partie : `match` + `timeline`.
   - Ignore les parties trop courtes (`gameDuration` < 15 min, remakes et redditions rapides) et celles d'un autre patch.
4. **Extraction compacte, par participant** — ne stocke **pas** le JSON brut :
   - champion, `teamPosition` (TOP/JUNGLE/MIDDLE/BOTTOM/UTILITY), victoire, `puuid`, `riotIdGameName#riotIdTagline`, plateforme, palier ;
   - adversaire de lane (même `teamPosition` dans l'équipe adverse) et coéquipiers ;
   - runes complètes : `perks.styles` (style principal + 4 choix, style secondaire + 2 choix) et `perks.statPerks` ;
   - sorts d'invocateur sous forme de paire non ordonnée ;
   - bannissements de la partie (`teams[].bans`, une seule fois par partie) ;
   - **ordre d'achat** reconstruit depuis la timeline : `ITEM_PURCHASED`, en gérant `ITEM_UNDO`, `ITEM_SOLD` et `ITEM_DESTROYED`, avec l'horodatage de chaque achat ;
   - **ordre des compétences** : `SKILL_LEVEL_UP`, avec `skillSlot` 1–4 = Q/W/E/R, niveaux 1 à 18.
5. **Classification des objets**, depuis `item.json` du patch, dans un module testé :
   - **départ** : achats avant 1:30 ;
   - **premiers achats** : ce qui est acheté au premier retour en base, avant le premier objet majeur ;
   - **objets majeurs** : objets terminés (pas de champ `into`, achetables sur la Faille, hors consommables, balises et composants) ;
   - **bottes** : les bottes de niveau 2 ;
   - **build complet** : les 6 premiers objets majeurs terminés, bottes comprises.
   - Garde le **timing médian** de chaque palier (départ, premiers achats, core).

## Étape 3 — Agrégation

Clé d'agrégation : `patch × champion × rôle × palier (emerald_plus, diamond_plus, master_plus) × région (all + chaque plateforme)`.

1. **Statistiques générales :**
   - parties, victoires, taux de victoire ;
   - taux de pick = parties du champion dans le rôle / total des parties du palier ;
   - taux de ban = parties où il est banni / total ;
   - écarts par rapport au patch précédent.
2. **Tier S+/S/A/B/C/D**, par rôle, à partir d'un score documenté. Proposition : z-score de la borne basse de Wilson du taux de victoire + 0,5 × z-score du log du taux de pick + 0,25 × z-score du taux de ban, découpé en percentiles. Explique la formule dans le README.
3. **Builds recommandés — règle demandée par Hato :**
   - La **clé d'un build = ses 3 premiers objets majeurs**, hors bottes. Deux builds avec les mêmes 3 objets dans un ordre différent sont **le même build** ; garde l'ordre le plus fréquent.
   - Candidats : au moins `max(100 parties, 3 % des parties du champion dans ce rôle)` (seuils configurables).
   - Retiens **au maximum 3 builds distincts** :
     1. **Le plus joué** : le plus de parties ;
     2. **Meilleur taux de victoire** : la plus haute borne basse de Wilson à 95 %, parmi les autres ;
     3. **Alternative** : le suivant le plus joué, avec au moins un objet de core différent des deux premiers.
   - S'il y a moins de 3 candidats, affiche-en moins. Ne complète jamais avec des builds trop peu joués.
4. **Pour chaque build retenu**, calculé sur les parties de ce build :
   - la page de runes complète la plus fréquente, avec son taux de victoire ;
   - les sorts les plus fréquents ;
   - les objets de départ les plus fréquents (multiensemble) et leur timing médian ;
   - les premiers achats ;
   - le core et son timing médian ;
   - le build complet (4e, 5e et 6e objets les plus fréquents après ce core) ;
   - les **objets situationnels** : alternatives fréquentes en 4e–6e position, avec le slot qu'elles remplacent (« alternative au 4e objet : Danse de la mort »), leur taux de victoire et leur nombre de parties ;
   - l'**ordre des compétences** : la séquence la plus fréquente sur les niveaux 1 à 18, et l'**ordre de max** (ordre dans lequel Q, W et E atteignent le rang 5).
5. **Matchups :**
   - « Faible contre » et « Fort contre » : les 6 adversaires de lane ayant les pires et les meilleurs taux de victoire, avec au moins 50 parties (configurable) ;
   - « Meilleure synergie (duo) » : les coéquipiers pertinents (jungle pour top et mid, support pour ADC et inversement), avec le même seuil ;
   - « Build selon l'adversaire » : le taux de victoire contre un adversaire précis, et le core le plus joué contre lui si l'échantillon le permet.
6. **Meilleurs joueurs :** au moins 15 parties sur ce champion et ce rôle, triés par borne basse de Wilson. Affiche le Riot ID, la plateforme, le palier, le taux de victoire et le nombre de parties.
7. **Texte de synthèse** généré depuis les données, en FR et en EN, sur le modèle du paragraphe de la maquette. Utilise les noms localisés de Data Dragon.

### Sorties

- Fichiers : `public/data/lol/builds/{patch}/{palier}/{championId}_{role}.json`, plus `index.json` (champions, rôles disponibles, tier, taux de victoire, de pick et de ban) et `meta.json` (patch, date de mise à jour, nombre de parties par région).
- **Valide chaque fichier avec un schéma `zod`.**
- Vise moins de 30 Ko par fichier. Les noms et les icônes viennent de Data Dragon côté front : stocke seulement les identifiants.
- Garde le patch courant et le patch précédent.

## Étape 4 — Stockage de l'état et planification

1. **État entre deux exécutions :** compteurs agrégés et ensemble des IDs de parties traités, par patch. Il ne va **pas dans Git**.
   - Crée une interface `StateStore` avec une implémentation fichier local pour le développement.
   - Ajoute une implémentation S3 compatible pour **Cloudflare R2**, ma recommandation : offre gratuite de 10 Go. Demande-moi avant de choisir.
2. **Workflow GitHub Actions `lol-stats.yml` :**
   - déclenché par cron une fois par jour, plus `workflow_dispatch` ;
   - étapes : détection du patch, collecte avec un budget de temps configurable (par défaut 50 min), agrégation, écriture des JSON ;
   - **commit automatique** des JSON seulement s'ils ont changé, puis appel d'un **Deploy Hook Vercel** pour reconstruire le site prérendu ;
   - secrets : `RIOT_API_KEY`, identifiants R2, `VERCEL_DEPLOY_HOOK`.
   - Tiens compte du quota de minutes des dépôts privés de l'offre gratuite de GitHub (vérifie le chiffre actuel et indique-le-moi).
3. **Changement de patch :**
   - Tant que le nouveau patch n'a pas assez de données (seuil configurable, par exemple 200 parties pour un couple champion/rôle), la page affiche le patch précédent avec le bandeau « Données du patch X, mise à jour en cours ».
   - Elle bascule automatiquement dès que le seuil est atteint.
4. Ajoute une commande `npm run lol-stats:dev` qui collecte un petit échantillon avec une **clé de développement** (500 parties par exemple). Elle sert à produire de vraies données pour développer la page et à monter le dossier de demande de clé de production.

## Étape 5 — Page Angular

**Routes :**
- `:lang/lol/champions/:championId` redirige vers le rôle principal ;
- `:lang/lol/champions/:championId/build/:role` ;
- paramètres de requête `rank`, `region`, `patch`, `build` (index 0–2).
- Vérifie à quoi sert la route existante `:lang/lol/builds` : réutilise-la ou fais-en la liste des champions (grille avec tier, taux de victoire et rôles, triable).

**Composants, en suivant `LolBuild.dc.html` :**
- **En-tête :** splash et portrait avec l'**hexagone de tier** ; passif et sorts du champion (icônes, nom et description en infobulle) ; 4 statistiques avec leur variation depuis le patch précédent ; synthèse ; onglets **Build / Counters / Guide TeamUpp / Matchups (conseils)** — les deux derniers pointent vers l'existant.
- **Barre de filtres :** rôle (seuls les rôles disponibles sont actifs), palier, région, file « Classée solo/duo » fixe, patch ; plus « Mis à jour il y a … ».
- **Colonne gauche :** les builds recommandés (rune clé + 3 objets du core, taux de victoire, parties ; sélection en surbrillance or), les meilleurs joueurs, « Build selon l'adversaire » avec une recherche.
- **Bloc principal :**
  - bandeau du build choisi avec « Copier le build » (copie un texte lisible : objets, runes, sorts, ordre des compétences ; **pas** d'import dans le client) ;
  - **arbre de runes complet** : toutes les runes des deux arbres, celles du build en couleur avec un anneau, les autres grisées à 30 % ; fragments en 3 lignes ;
  - sorts avec les touches D/F ;
  - **objets** : départ › premiers achats › core › build complet, avec quantités et timings médians ;
  - **grille d'ordre des compétences** sur 18 niveaux (Q or, W bleu, E vert, R rose) et « Max : Q → E → W » ;
  - **objets situationnels** en onglets : nom, « alternative à… », taux de victoire et parties, plus une explication rédigée **facultative** (fichier i18n `LOL.ITEM_TIPS.{itemId}` ; si elle est absente, n'affiche que les données).
- **Bas de page :** Faible contre / Fort contre / Meilleure synergie, chaque champion menant à sa propre page, plus la carte « Conseils de matchup TeamUpp » vers l'outil Matchups existant.
- **Infobulles** sur chaque objet et chaque rune (nom, coût, description Data Dragon dans la langue de la page).

**Intégrations :**
- ajoute « Builds & runes » dans le menu LoL ;
- ajoute « Voir le build » sur le Picker, sur l'outil Matchups et dans la recherche globale ;
- ajoute les pages au sitemap.

**Rendu :** prérends toutes les pages champion × rôle disponibles, FR et EN. Données chargées depuis les JSON statiques. États à gérer : chargement (squelettes), **données insuffisantes** (message + dernier patch disponible), champion absent.

**SEO :** titre « Build {Champion} {Rôle} patch {x} : runes, objets, ordre des compétences | TeamUpp », description générée, `canonical` et `hreflang`.

**Mobile :** suivre `MobileBuild.dc.html` (builds en onglets horizontaux, core en premier, runes compactes, frise des compétences, bouton « Copier le build » fixé en bas).

## Étape 6 — Tests et vérifications

- **Tests unitaires** de :
  - la reconstruction de l'ordre d'achat (annulation, revente, transformation d'objets) ;
  - la classification des objets ;
  - le regroupement des builds et la règle des 3 builds distincts ;
  - Wilson, le tier et l'ordre de max.
- **Fixtures :** 5 vraies parties (match + timeline) récupérées avec une clé de développement, dans `tools/lol-stats/fixtures/`.
- Lance la collecte de développement, puis génère les pages pour 3 champions de rôles différents. Compare le rendu aux maquettes en desktop 1440 px et en mobile 390 px.
- Fais-moi un **rapport** :
  - ce qui marche et ce qui a été vérifié ;
  - le volume d'appels par jour et le nombre de parties collectées par heure avec chaque type de clé ;
  - ce que je dois faire moi-même (inscrire le produit sur le portail développeur Riot, demander la clé de production, créer le bucket R2, ajouter les secrets GitHub, créer le Deploy Hook Vercel).

## Questions à me poser avant de coder

1. Stockage de l'état : Cloudflare R2, Vercel Blob, ou autre ?
2. Régions par défaut : EUW1, KR, NA1, ou seulement EUW1 au début ?
3. Paliers proposés dans le filtre : Émeraude+, Diamant+, Maître+ ?
4. Le dépôt est-il public ou privé (pour le quota de minutes GitHub Actions) ?
