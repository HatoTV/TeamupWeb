# Refonte complète de TeamUpp : sécurité + nouveau design

Tu travailles sur le dépôt Angular de **TeamUpp** (teamupp.app), un hub de guides pour League of Legends, Teamfight Tactics et Rocket League. Le site est en Angular 18.2.7, hébergé sur Vercel, bilingue FR/EN via les fichiers `assets/i18n/fr.json` et `en.json`. Les routes sont de la forme `:lang/...`.

Ta mission comporte deux volets, **dans cet ordre** :

- **Phase 0 :** corriger une fuite de secrets.
- **Phases 1 à 6 :** appliquer la refonte visuelle complète définie par les maquettes de ce dossier.

## Règles de travail

- Commence par explorer le dépôt et me présenter un plan court (fichiers touchés, ordre, risques). **Attends ma validation** avant de modifier le code.
- Travaille sur une branche `refonte-2026`. Fais un commit par phase, avec un message clair.
- Après chaque phase, lance `ng build`, puis les tests et le lint s'ils existent. Corrige les erreurs avant de passer à la suite. Indique-moi ce qui a été vérifié et ce qui ne l'a pas été.
- **Ne supprime aucun contenu ni aucune fonctionnalité existante.** Tout le texte des fichiers i18n doit rester présent ; la refonte change la présentation, pas le fond. Seules exceptions : les corrections listées plus bas.
- Chaque nouveau texte d'interface passe par une clé i18n ajoutée dans `fr.json` **et** `en.json`. Pas de texte en dur dans les templates.
- **Ne touche jamais aux valeurs des secrets.** Je les configure moi-même dans le tableau de bord Vercel.
- Si une information te manque (comportement d'une route, texte légal, choix d'API), **pose-moi la question** au lieu de deviner.

---

## Phase 0 — Sécurité (prioritaire)

**Constat :** l'endpoint public `/api/vercel-datas` (fonction Vercel du projet) renvoie au navigateur, sans authentification, les variables suivantes :

- `RIOT_API_KEY`
- `TWITCH_CLIENT_ID`
- `TWITCH_CLIENT_SECRET`
- `TWITCH_ACCESS_TOKEN`
- `EMAIL_USER`
- `EMAIL_PASS`

Le front les récupère via un service Angular (`getData()` sur `.../api/vercel-datas`), puis appelle directement l'API Twitch (`api.twitch.tv/helix/streams`) et l'API Riot. J'ai déjà changé le mot de passe mail. Je régénère moi-même les autres secrets.

À faire :

1. **Supprimer l'endpoint `api/vercel-datas`** et tout le code front qui l'appelle. Aucun secret ne doit plus jamais arriver dans le navigateur, ni dans le bundle, ni dans les fichiers `assets`.

2. **Statut Twitch :** créer une fonction serverless `api/twitch-live`.
   - Elle obtient un *app access token* via le flux OAuth *client credentials* avec `TWITCH_CLIENT_ID` et `TWITCH_CLIENT_SECRET`, côté serveur uniquement.
   - Elle met ce token en cache en mémoire jusqu'à son expiration.
   - Elle interroge `helix/streams?user_login=Hato_TV`.
   - Elle renvoie seulement `{ live: boolean, title?: string, viewers?: number }`, avec un en-tête `Cache-Control: s-maxage=60, stale-while-revalidate=120`.
   - La variable `TWITCH_ACCESS_TOKEN` devient inutile : signale-le-moi pour que je la supprime de Vercel.

3. **API Riot :** recense tous les appels Riot du front (`europe.api.riotgames.com`, `euw1.api.riotgames.com`, endpoints match v5, league v4, summoner v4) et dis-moi s'ils sont réellement utilisés.
   - S'ils sont utilisés : crée un proxy serverless `api/riot/*` qui ajoute la clé côté serveur. Il doit avoir une **liste blanche stricte** des routes autorisées, une validation des paramètres et un cache.
   - Sinon : supprime le code mort.

4. **`api/send-email`** (actuellement `Access-Control-Allow-Origin: *`) :
   - Limiter l'origine à `https://teamupp.app` et `https://www.teamupp.app`.
   - Accepter uniquement `POST` avec `Content-Type: application/json`.
   - Valider le corps : champs attendus, longueurs maximales, type de problème parmi une liste fermée.
   - Ajouter un champ *honeypot* invisible dans le formulaire.
   - Renvoyer des erreurs génériques, sans détail interne.
   - Propose-moi une limitation de débit adaptée à Vercel, sans service payant.

5. **Historique Git :** vérifie si un secret a été commité, par exemple avec `git log -p -S "RGAPI-"`, et des recherches équivalentes pour les noms de variables. Ajoute `.env*` au `.gitignore`. Ne réécris pas l'historique sans mon accord : dis-moi juste ce que tu trouves.

6. **En-têtes de sécurité** dans `vercel.json` :
   - `Strict-Transport-Security: max-age=63072000; includeSubDomains`
   - `X-Content-Type-Options: nosniff`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy` restrictive (caméra, micro, géolocalisation désactivés)
   - le `frame-ancestors` existant conservé
   - **suppression du `Access-Control-Allow-Origin: *`** sur le HTML et les assets
   - une CSP complète en **`Content-Security-Policy-Report-Only`** d'abord (AdSense, Twitch embed, YouTube nocookie, Data Dragon, Google Fonts si encore utilisé), pour que je la valide avant de l'appliquer.

7. Liste-moi à la fin **les actions que je dois faire moi-même** dans les consoles Vercel, Twitch, Riot et Google.

---

## Phase 1 — Fondations du design system

Les maquettes de référence sont dans `docs/refonte/maquettes/*.dc.html`, avec leurs images dans `docs/refonte/assets/`.

Ce sont des maquettes HTML avec des styles en ligne et une petite logique JS dans une balise `<script type="text/x-dc">`, où les données sont dans `renderVals()`. **Lis-les comme une spécification visuelle exacte** : structure, couleurs, tailles, espacements, textes. Traduis-les en composants Angular + SCSS propres, **sans recopier les styles en ligne**.

La planche `Identite.dc.html` résume l'identité. Les tokens ci-dessous font foi.

### Tokens (variables CSS sur `:root`, dans un fichier `styles/_tokens.scss`)

| Rôle | Valeur |
|---|---|
| Fond nuit | `#0D0D18` (barre du haut et pied de page : `#0B0B15`) |
| Surface | `#161626` · Surface + `#1E1E32` · Surface active `#22223A` |
| Lignes | `#2A2A42` (séparateurs : `#23233A`, bordure forte : `#3A3A58`) |
| Texte | `#F1F1F7` · secondaire `#C9C9DA` / `#A8A8BF` · discret `#7F7F99` |
| Accent marque « Or Upp » | `#FFC93C` (texte posé dessus : `#141420`) |
| League of Legends | `#9B7BFF` |
| Teamfight Tactics | `#FF5C9E` |
| Rocket League | `#36A3FF` |
| Difficulté : Très facile / Facile / Moyen / Difficile / Extrême | `#39C6D6` / `#4FD18B` / `#FFC93C` / `#FF8B3D` / `#FF4F6D`, badges en texte clair sur fond à 16 % d'opacité (voir maquettes) |
| Rayons | 6 (tags) · 8–10 (boutons, champs) · 12–16 (cartes) · 20 (grands blocs) |
| Espacements | grille de 8 px ; conteneur max 1280 px, marges latérales 32 px (16 px en mobile) |

Pour les couleurs de jeu, utilise des **thèmes par hub** : par exemple `[data-game="lol"]` qui définit `--game-accent`.

### Typographie

- **Barlow Condensed** 600/700, plus 700 italique : titres de page en capitales italiques, titres de section et boutons en capitales.
- **Barlow** 400/500/600/700 : tout le reste ; texte des guides en 17–18 px avec un interligne de 1.7.
- **Héberge les polices toi-même** en woff2, sous-ensemble latin, avec `font-display: swap`. Précharge les 2 graisses critiques.
- Supprime Poppins, Roboto, Roboto Condensed et **Font Awesome 6.0.0-beta3** ; remplace les icônes par des SVG en ligne.
- Vérifie si Bootstrap sert à autre chose que le reboot et la grille. Si ce n'est pas le cas, retire-le.

### Mouvement

- **Supprime toute règle `transition: all`**, en particulier la règle globale appliquée à presque tous les éléments.
- Survol des cartes : translation de −4 px et zoom de l'image de 5 %, en 250 ms, courbe `cubic-bezier(.2,.8,.2,1)`.
- Survol des lignes et des liens : couleur seule, en 180 ms.
- Anime uniquement `transform`, `opacity` et les couleurs. Respecte `prefers-reduced-motion`.

### Accessibilité

- Un seul `h1` par page, jamais vide.
- `alt` pertinent sur chaque image, ou `alt=""` si elle est décorative.
- `:focus-visible` visible avec un anneau or.
- Cibles tactiles d'au moins 44 px.
- Contraste du texte d'au moins 4.5:1.
- Attribut `lang` de `<html>` synchronisé avec la langue de la route.
- Recherche de champion en vrai combobox ARIA, utilisable au clavier.

---

## Phase 2 — Composants partagés

À créer en composants standalone :

- **`TopbarComponent`** (`Topbar.dc.html`) :
  - logo TU et wordmark « TEAMUPP » ;
  - onglets LoL / TFT / RL, l'onglet actif étant souligné de la couleur du jeu, avec `aria-current` ;
  - recherche globale (champions, guides, mécaniques) ;
  - lien « À propos » ;
  - sélecteur FR/EN qui garde la page courante ;
  - bouton Discord.
  - En mobile : barre compacte (`MobileHome.dc.html`) plus **barre d'onglets en bas** (Accueil, LoL, TFT, RL, À propos).
- **`LolSidebarComponent`** (`LolSidebar.dc.html`) :
  - logo LoL ;
  - bloc « Outils champions » (Matchups, Picker) ;
  - bloc « Gameplay guides » en 4 groupes, avec un compteur par groupe et l'élément actif mis en évidence.
  - En dessous de 900 px, il passe au-dessus du contenu, repliable.
- **`FooterComponent`** (`Footer.dc.html`) : réseaux sociaux, colonnes de liens, mention légale Riot/Psyonix, © et langue.
- **Composants d'interface :**
  - `ChampionChip` (icône ronde, nom, bordure verte pour son champion, rouge pour l'ennemi) ;
  - `DifficultyBadge` ;
  - `Meter` (jauge de 1 à 5) ;
  - `PageHero` (image, dégradé nuit, fil d'Ariane, titre, sous-titre, tags) ;
  - `GuideLayout` (chapitres, contenu limité à 760 px, sommaire collant à droite avec barre de progression) ;
  - `Callout` (variantes « À retenir », « Info bonus », « Astuce ») ;
  - `ProsCons` ;
  - `StepList` (étapes numérotées).

---

## Phase 3 — Pages

Chaque page suit sa maquette. Garde les routes existantes.

1. **Accueil** (`:lang/home` → `Main.dc.html`)
   - Héros avec splash art, recherche et accès rapides.
   - 3 cartes jeux.
   - Grille « Tes outils pour progresser » : Matchups, Picker, Wave management, TFT, mécaniques RL.
   - Bloc « Une plateforme pensée pour vous » avec les **emblèmes de rang Fer → Challenger** et la barre 85 %.
   - 3 piliers illustrés, puis le CTA Discord/Twitch avec l'avatar de Hato.
   - **Tous les textes de `HOME` sont conservés.**

2. **Matchups** (`:lang/lol/matchups` → `LolMatchups.dc.html`)
   - Héros en double splash art, avec une diagonale or et « VS ».
   - Sélecteurs Votre champion / Champion ennemi, plus le bouton « Inverser la sélection ».
   - Carte de conseils avec la jauge de difficulté et l'auteur, avec son rang et son emblème.
   - Formulaire « Demande de mise à jour » (types : Données fausses/incomplètes, Aucune donnée ; message facultatif).
   - 4 listes : avantageux pour / counters de, pour chaque champion. **Un clic sur une ligne charge ce matchup.**
   - Les conseils viennent de `counters_matchups`, en anglais. Affiche `tipsFr` s'il existe ; sinon affiche le texte anglais avec un petit badge « EN ». Ne traduis pas automatiquement.
   - Ajoute un lien « Lire le guide complet » vers `urlGuideFr` / `urlGuide`.
   - États à gérer : aucune sélection (sélecteurs seuls, avec une invite), un seul champion choisi (ses listes), aucune donnée.

3. **Picker** (`:lang/lol/picker` → `LolPicker.dc.html`)
   - Barre de filtres collante : recherche, rôles avec les icônes de rôle, difficulté (Facile / Intermédiaire / Difficile / Extrême, selon le mapping existant).
   - Bouton « Champion aléatoire (avec filtres) » qui affiche la **carte de tirage** : splash art, rôle, difficulté, « Voir ses matchups », « Relancer ».
   - Grille de champions avec le portrait, les badges de rôle et le point de difficulté.

4. **Guides LoL** (`:lang/lol/game`, `/laning`, `/wavemanagement`, `/jungle` → `LolGuide.dc.html`)
   - **Même modèle pour les 4 guides** : héros avec l'image du guide (les `bkgContent_*` existants), fil d'Ariane, tags (chapitres, durée de lecture calculée), onglets de chapitres, sommaire à droite, navigation précédent/suivant.
   - Restructure le contenu existant sans changer le sens : listes de types en cartes, cycles en frise, « Info bonus » en encadré, « Comment faire » en étapes numérotées, avantages/inconvénients en double colonne.
   - Les ancres du sommaire correspondent aux entrées du menu latéral.
   - Inclus aussi les sections `GAME` absentes du menu actuel (« Wards », « Concepts & Lexique ») si elles ont du contenu.
   - Vérifie à quoi servent `:lang/lol`, `/lol/builds` et `/lol/guides`, et dis-le-moi.

5. **TFT** (`:lang/tft` → `Tft.dc.html`)
   - Héros avec le logo TFT et 3 chiffres clés.
   - Sommaire collant ; phases du round en 4 cartes ; tiers 1 à 5 en couleurs de rareté ; schéma ★ → ★★ → ★★★.
   - Tableaux intérêts / séries ; bloc « L'avis de Hato » ; 6 cartes de conseils.
   - **Tout le texte `TFT` est conservé.**

6. **Rocket League — liste** (`:lang/rocket/mecanics` → `RlMecanics.dc.html`)
   - Héros avec le logo RL ; barre recherche + filtre difficulté 1–5 + tri (utilité, difficulté, nom).
   - Grille de cartes 16:9 : miniature, bouton lecture, auteur, jauges difficulté/utilité.
   - Données : `assets/rlmecanics.json`.

7. **Rocket League — fiche** : **nouvelle route `:lang/rocket/mecanics/:slug`** qui remplace la fenêtre modale (`RlMecanic.dc.html`).
   - Lecteur vidéo 16:9 avec affiche (la miniature), `preload="none"`, vitesse ×0,5 et lecture en boucle.
   - Étapes en frise verticale, bloc « Pourquoi utiliser cette mécanique ? », 3 mécaniques suggérées.
   - L'ancienne modale redirige vers cette page. Chaque fiche a son propre titre et sa propre meta description.

8. **À propos** (`:lang/contact` → `About.dc.html`)
   - Bannière, double avatar, « Hato_TV ».
   - **Badge live alimenté par `api/twitch-live`** : « En live » ou « Hors ligne ».
   - Texte `CONTACT` complet ; les emojis peuvent rester dans le texte.
   - Cartes réseaux avec les handles, Instagram en premier.

9. **Légal** (`:lang/cgu`, `:lang/privacy` → `Legal.dc.html`)
   - Onglets CGU / Confidentialité / **Mentions légales (nouvelle route `:lang/mentions-legales`)**.
   - Sommaire numéroté et sections numérotées.
   - **Mentions légales : crée la page avec des marqueurs `[À COMPLÉTER]`** (éditeur, contact, hébergeur Vercel avec son adresse). Je fournirai les informations ; n'invente rien.
   - **Textes juridiques :** la section « Gestion des données » dit qu'aucune donnée n'est collectée, alors que le site utilise AdSense et un formulaire de contact. Propose-moi une nouvelle rédaction, mais **ne remplace pas les textes juridiques sans mon accord**.

---

## Phase 4 — Images et données

- **Data Dragon** pour les icônes et les splash arts des champions :
  - `https://ddragon.leagueoflegends.com/cdn/<version>/img/champion/<Id>.png`
  - `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/<Id>_0.jpg`
  - Récupère la version via `api/versions.json` au build, ou en runtime avec un cache.
  - Crée un `IMAGE_LOADER` pour `NgOptimizedImage`.
  - Corrige les noms de champions qui ont des espaces en trop dans `AllChampions.json`, par exemple `"Janna "`.
- **Emblèmes de rang :** utilise ceux fournis dans `docs/refonte/assets/rank_*.webp`. Déplace-les dans `src/assets`.
- **Images locales :**
  - Convertis tous les `assets/img` en **AVIF + WebP** avec `srcset` : 1600 px pour les héros, 640 px pour les cartes, 96 px pour les icônes.
  - Le fond `backgroundSpace.png` (701 Ko) et `bkgHome.jpg` (626 Ko) doivent descendre sous 150 Ko.
  - Remplace les icônes réseaux, des JPG en 500×500, par des SVG.
  - Les `.webp` de `docs/refonte/assets` sont déjà optimisés : réutilise-les quand ils correspondent.
- **`AllGuides.json` pèse 3,3 Mo.**
  - Écris un script `tools/split-guides` qui le découpe en un fichier par champion.
  - La page Matchups ne charge que les 2 champions sélectionnés, plus un index léger : nom, icône, rôles, difficulté.
  - Vérifie aussi `AllChampions.json`.

---

## Phase 5 — Performance, SEO, publicité

- **Prérendu (SSG)** avec `@angular/ssr` de toutes les routes FR et EN, y compris chaque fiche RL. Aujourd'hui un robot sans JavaScript ne voit qu'une page vide titrée « TeamUpp ».
- Routes en chargement différé ; `@defer` pour AdSense, l'embed Twitch, `apis.google.com` et le player YouTube. Rien de tout cela ne doit charger sur l'accueil avant une interaction ou l'affichage à l'écran.
- Par page :
  - `Title` et `Meta` (description, Open Graph, Twitter card avec image) ;
  - `link rel="alternate" hreflang` fr/en ;
  - `canonical`.
- Ajoute `sitemap.xml` et `robots.txt`.
- **Consentement :** AdSense dans l'UE exige une plateforme de gestion du consentement certifiée par Google. Utilise le module de consentement d'AdSense (« Confidentialité et messages »), ou propose-moi une solution gratuite équivalente. Aucun script publicitaire ne doit charger avant le consentement.
- **Objectifs :** Core Web Vitals dans le vert sur mobile (LCP < 2,5 s, CLS < 0,1, INP < 200 ms). Donne-moi la taille des bundles avant/après et, si tu peux le lancer, un rapport Lighthouse.

---

## Phase 6 — Corrections de contenu

Corrige ces fautes **dans `fr.json`**, et l'équivalent en anglais s'il y a lieu :

- « En règle général » → « En règle générale »
- « TFT est jeu de type » → « TFT est un jeu de type »
- « Cette informatione st indiqué » → « Cette information est indiquée »
- « un joueur plus débutant de verra pas » → « … ne verra pas »
- « coutera » → « coûtera »
- « League Of Legends » → « League of Legends »
- « Aucune données » → « Aucune donnée »
- « l'intéraction » → « l'interaction »

Signale-moi toute autre faute que tu trouves, **sans réécrire le fond des guides**.

---

## Livrable final

Résume en quelques lignes :

- ce qui a été fait, phase par phase ;
- ce qui a été vérifié (build, tests, rendu de chaque page en desktop 1440 px et en mobile 390 px) ;
- ce qui reste à faire de mon côté (secrets, consentement, mentions légales, textes juridiques).
