# « Tips de la communauté » : recherche approfondie par matchup + données du patch en complément

Tu travailles sur le dépôt Angular de TeamUpp. Crée une branche `feature/tips-communaute` depuis `feature/traduction-matchups` : tu réutiliseras son glossaire LoL et sa règle QWERTY → AZERTY.

**Maquette de référence :** `docs/refonte/maquettes/LolMatchups.dc.html` (retirée du dépôt, à restaurer avec `git checkout f40e2e7 -- docs/refonte/maquettes docs/refonte/assets`), bloc « Tips de la communauté » entre la carte des conseils et les listes de counters.

## Objectif

Sur chaque page de matchup, trois sources **clairement séparées** :

1. **Conseils de l'auteur haut elo** (existant) : on ne change rien. Ils restent attribués à leur auteur, avec son rang et un lien vers son guide.
2. **Tips de la communauté** (nouveau, le cœur de ce chantier) : une **synthèse rédigée par TeamUpp** à partir d'une **recherche approfondie** de ce que disent les joueurs sur ce matchup. Elle comble les matchups sans auteur haut elo et complète les autres.
3. **Les données du patch** (en complément) : quelques chiffres du collecteur Builds. Si ce collecteur n'est pas encore en place, le bloc reste masqué.

**Le contenu ne concerne que le gameplay** : mécaniques, interactions de sorts, trades, gestion de la lane, vision, jungle, macro. **Aucun conseil d'objets, de build ou de runes** : la page Builds s'en charge.

**Rythme :** la recherche se fait **une seule fois par matchup**. On ne la refait **que si un des deux champions est retravaillé (rework)**, ce qui est détecté automatiquement (étape 6).

---

## Règles non négociables

- **Pas de copie.** Tu lis des sources comme le ferait un chercheur, tu en extrais les **idées**, puis tu **rédiges entièrement avec tes propres mots**. Aucune phrase reprise, aucune citation de plus de quelques mots, aucune reprise de la structure d'un guide.
- **Pas de scraping en masse.** Utilise tes outils de recherche et de lecture de pages, page par page. Respecte les sites qui bloquent l'accès, n'ouvre pas les contenus payants et n'écris aucun script de collecte automatique sur ces sites.
- **Traçabilité.** Pour chaque matchup, garde la liste des sources consultées (titre, site, URL, date). Elle s'affiche repliée sous le bloc.
- **Exactitude.** Toute affirmation mécanique (temps de recharge, portée, interaction, effet de contrôle) est **vérifiée sur les données du jeu** (Data Dragon `champion/{id}.json` du patch courant). Si elle ne peut pas être vérifiée ou si elle est contredite, **retire-la**. Attention aux conseils d'avant un rework : vérifie que les compétences citées existent encore avec cet effet.
- **Langue :** en FR, applique le **glossaire LoL** et la conversion **AZERTY** (A Z E R) du chantier traduction : jargon des joueurs, tutoiement, phrases courtes. En EN, rédige directement en anglais (Q W E R), sans traduire le FR mot à mot.
- **Honnêteté du bloc.** Il s'intitule « Tips de la communauté », avec la mention « Synthèse TeamUpp de guides, vidéos et discussions de joueurs, réécrite et vérifiée avec les données du jeu ». Ne présente jamais un tip comme venant d'une personne précise.

---

## Étape 1 — Inventaire et priorités

1. Dresse la liste des **matchups de lane à couvrir** :
   - tous les couples présents dans les données de matchup existantes ;
   - plus les adversaires de lane réalistes par rôle, d'après les rôles de `AllChampions.json`, ou les données du collecteur Builds s'il est en place.
   - Un matchup A vs B est **une seule recherche**, qui produit **deux points de vue** : conseils pour A et conseils pour B.
2. **Ordre de priorité :**
   1. les matchups affichés sur le site **sans conseils d'auteur haut elo** ;
   2. les champions les plus joués ;
   3. le reste.
3. Donne-moi les comptes et **une estimation du temps et du volume de travail**, puis propose un premier lot réaliste. **Attends ma validation.**

## Étape 2 — Méthode de recherche, pour chaque matchup

1. **Requêtes variées, en anglais et en français**, par exemple :
   - « {A} vs {B} matchup tips » ;
   - « how to play {A} against {B} » ;
   - « {B} counter {A} reddit » ;
   - « {A} vs {B} conseils » ;
   - les subreddits de mains du champion et r/summonerschool ;
   - les guides de matchup de joueurs haut elo ;
   - les vidéos de matchup (titre, description, chapitres) ;
   - le wiki LoL pour les interactions de sorts.
2. **Au moins 5 sources indépendantes** quand elles existent ; privilégie les sources récentes et les joueurs haut elo.
3. **Range les idées** dans 3 catégories :
   - **Phase de lane** : trades, niveaux 2 et 3, gestion de la wave, positionnement ;
   - **Mécaniques & combos** : interactions de sorts, timings, annulations, esquives ;
   - **Vision & macro** : wards, jungle, roams, objectifs, mid et late game.
4. **Consensus :** compte combien de sources indépendantes donnent chaque idée.
   - Garde les idées citées par **au moins 2 sources**.
   - Une idée citée par **1 seule source** n'est gardée que si elle est confirmée par les données du jeu ; marque-la `verifiedByGameData`.
   - Si deux sources se contredisent, garde la position majoritaire ou retire l'idée, et note-le dans le rapport.
5. **Rédaction :** au maximum 3 à 4 tips par catégorie et par point de vue, **une idée par tip, 30 mots au plus**. Quand une compétence est citée, ajoute sa touche entre parenthèses : en FR, le hook de Blitz (A) ; en EN, Blitz's hook (Q).
6. Si la recherche ne donne pas assez de matière : enregistre le matchup comme `insufficientSources`, sans inventer. Le site affiche alors seulement les données du patch et le bouton « Proposer un tip ».

## Étape 3 — Format des données

Un fichier par couple : `src/assets/data/lol/community-tips/{champA}__{champB}.json`, avec les identifiants Data Dragon triés par ordre alphabétique. Valide-le avec un schéma `zod` :

```
{
  "pair": ["Blitzcrank", "Janna"],
  "researchedAt": "AAAA-MM-JJ",
  "gameVersion": "16.22",
  "abilityHash": { "Blitzcrank": "...", "Janna": "..." },
  "status": "ok" | "insufficientSources" | "needsRecheck",
  "perspectives": {
    "Janna": { "fr": { "lane": [...], "mechanics": [...], "macro": [...] }, "en": { ... } },
    "Blitzcrank": { ... }
  },
  // chaque tip : { "text": "...", "sources": 4, "verifiedByGameData": true }
  "sources": [ { "title": "...", "site": "...", "url": "...", "consultedAt": "AAAA-MM-JJ" } ]
}
```

`abilityHash` est une empreinte du passif et des 4 sorts du champion (noms, descriptions, temps de recharge) **au moment de la recherche**.

## Étape 4 — Pilote — STOP

Fais **3 matchups complets** :
- Janna vs Blitzcrank (support) ;
- Yasuo vs Yone (mid) ;
- Darius vs Garen (top).

Montre-moi pour chacun les tips FR et EN, leur nombre de sources, ce qui a été vérifié sur les données du jeu, et la liste des sources. **J'ajuste la méthode et le ton avant que tu continues.**

## Étape 5 — Production par lots

- Travaille par **lots de 10 matchups**, dans l'ordre de priorité. Le travail doit pouvoir reprendre : tiens à jour `tools/community-tips/progress.json` (fait, en cours, sources insuffisantes).
- Après chaque lot, fais-moi un **rapport court** : matchups faits, cas douteux, tips retirés et pourquoi.
- Écris un script `tools/community-tips/check` qui vérifie :
  - le schéma ;
  - l'absence de touches QWERTY dans le FR ;
  - la longueur des tips ;
  - l'absence de conseils d'objets ou de runes (détection des noms d'objets et de runes du glossaire) ;
  - au moins 1 source par tip et au moins 2 sources par matchup ;
  - l'absence de phrase identique à un texte de source enregistré.

## Étape 6 — Détection automatique des reworks

- Ajoute une commande `tools/community-tips/detect-reworks`, lancée à chaque nouveau patch (dans le workflow du collecteur Builds s'il existe, sinon dans un workflow GitHub Actions dédié).
- Elle recalcule l'`abilityHash` de chaque champion à partir de Data Dragon. Si l'empreinte change de façon importante (sorts renommés, ou descriptions très différentes, au-delà d'une simple variation de chiffres), elle passe tous les fichiers de ce champion en `needsRecheck` et ouvre une **issue GitHub** « Rework détecté : {champion} » avec la liste des matchups à refaire.
- Sur le site, un tip `needsRecheck` affiche le badge « À revérifier depuis le rework ».

## Étape 7 — Affichage (suivre la maquette)

- **Bloc « Tips de la communauté »** :
  - 3 colonnes (Phase de lane / Mécaniques & combos / Vision & macro) avec leurs couleurs ;
  - chaque tip affiche son **indicateur de consensus** (5 points, « Cité par N sources ») ;
  - les tips du point de vue du **champion sélectionné par le joueur** sont affichés, et le point de vue s'inverse avec le bouton « Inverser la sélection ».
- **Bandeau « Les données du patch »** (si le collecteur Builds existe) : écart d'or à 10 min, first blood, lane gagnée (écart d'or positif à 14 min), taux de victoire. Ce sont des chiffres seuls, sans commentaire généré.
- **Sources consultées** dans un bloc dépliable, avec des liens `rel="nofollow noopener"`.
- **Bouton « Proposer un tip »** : formulaire (catégorie, texte de 200 caractères au plus, pseudo facultatif) envoyé via l'endpoint `send-email` sécurisé. Il n'y a pas de publication automatique : je valide à la main.
- Mobile : les 3 catégories passent en onglets.
- Les états « aucun tip » et `insufficientSources` sont propres : bouton « Proposer un tip » mis en avant.

## Fin

Lance `npm run build` et le script de contrôle, puis résume-moi ce qui est en ligne, ce qui a été vérifié, et le plan des lots restants.
