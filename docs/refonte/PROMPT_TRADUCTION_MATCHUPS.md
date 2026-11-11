# Traduction FR des données de Matchups : jargon League of Legends + passage QWERTY → AZERTY

Tu travailles sur le dépôt Angular de TeamUpp. Crée une branche `feature/traduction-matchups` depuis `feature/matchups-v2`.

## Objectif

Les conseils de matchup (champ `counters_matchups` des guides champions, environ 170 champions et plusieurs milliers de conseils) sont **en anglais**, même sur la version FR du site. Il faut les traduire en **français tel que le parlent les joueurs de League of Legends en France**, pas en français scolaire ni en traduction automatique littérale. Il faut aussi convertir les **touches de compétences du QWERTY vers l'AZERTY**.

C'est **toi qui traduis**, directement, par lots. N'appelle aucune API de traduction payante sans mon accord.

---

## Règle n°1 — Le langage LoL avant tout

Un joueur français de LoL doit avoir l'impression qu'un autre joueur lui parle, pas un traducteur.

- **On garde les termes anglais que la communauté FR emploie réellement** : lane, laning, botlane, toplane, mid, jungle, jungler, ADC, support, trade, short trade, poke, all-in, burst, sustain, engage, disengage, peel, kite, roam, gank, dive, tower dive, freeze, slow push, fast push, wave, back, recall, CS, farm, last hit, cooldown (CD), early, mid game, late game, power spike, snowball, scale, carry, tank, engage, cheese, prio, zoner, setup, bait, punish, outplay, hook, ult, AA (auto-attaque), lvl 2, lvl 6, etc.
- **On les intègre à la grammaire française**, comme le font les joueurs : « tu peux trade », « il va te poke », « punis-le », « joue safe », « il outscale », « ta wave doit crash sous sa tour ».
- **Sorts d'invocateur — usage communautaire** : Flash, Ignite, TP, Exhaust, Heal, Ghost, Cleanse, Smite, Barrière. Les touches **D/F ne changent pas**.
- **Objets et runes** : utilise le **nom officiel FR de Data Dragon `fr_FR`**. Une abréviation communautaire courante peut suivre entre parenthèses à la première mention si elle aide, par exemple « Ceinture d'argent vif (QSS) ».
- **Champions** : le nom officiel est le même en FR. Les surnoms courants de la source (« Blitz », « Naut », « Vel'Koz » → « Vel ») sont conservés s'ils sont aussi utilisés en FR.
- **Compétences** : si le texte nomme une compétence, utilise **le surnom communautaire s'il existe** (le hook de Blitz, l'ult, la tornade de Janna). Sinon, utilise le **nom officiel FR de Data Dragon**. Dans les deux cas, ajoute la **touche AZERTY entre parenthèses** à la première mention : « son grappin (A) », « l'ult (R) ».
- **Ton** : tutoiement, phrases courtes et directes, à l'impératif quand la source l'est. **Fidélité totale au sens** : n'ajoute aucun conseil, n'en retire aucun, ne change aucun chiffre.

### Exemples de référence (le style attendu)

| Anglais (source) | Mauvais (scolaire / littéral) | Bon (joueur LoL FR) |
|---|---|---|
| If you get hooked in lane by Blitz with no flash you die. | Si vous êtes accroché par Blitz sans flash, vous mourez. | Si Blitz te hook en lane et que tu n'as pas Flash, tu meurs. |
| You need to punish Blitz when he misses his hook. | Vous devez punir Blitz quand il rate son crochet. | Punis Blitz dès qu'il rate son hook (A). |
| You lose out on all trades against Senna, so dont walk up to trade with her. | Vous perdez tous les échanges contre Senna. | Tu perds tous les trades contre Senna, donc ne t'avance pas pour trade. |
| Need to heavily roam in this match up as Sona has bad 2v1 dive pressure. Rush Chemtech Putrifier. | Il faut beaucoup errer… | Roam beaucoup dans ce matchup : Sona a peu de pression en dive 2v1. Rush le Putrificateur techno-chimique. |
| Max Q first, then E. Your W is your main trading tool. | Maximisez Q en premier… | Max A en premier, puis E. Ton Z est ton outil principal pour trade. |

Vérifie dans `item.json` (`fr_FR`) le nom exact de chaque objet, par exemple « Putrificateur techno-chimique » (Chemtech Putrifier, patch 16.22). N'invente jamais un nom.

---

## Règle n°2 — QWERTY → AZERTY (touches de compétences)

Le client FR sur clavier AZERTY place les compétences sur **A Z E R** au lieu de **Q W E R** :

| QWERTY (source) | AZERTY (FR) |
|---|---|
| Q | **A** |
| W | **Z** |
| E | E |
| R | R |
| D / F (sorts d'invocateur) | D / F (inchangés) |

- Convertis **toutes** les références aux compétences : « Q », « (Q) », « Q-W combo », « max Q », « E-Q », « QWE », « RQ », « after his W », « hold Q », etc.
  Par exemple, « Q-W combo » donne « combo A-Z », et « EQ flash » donne « EA Flash ».
- **Ne convertis pas** ce qui n'est pas une compétence :
  - les noms d'objets ou d'abréviations (QSS reste QSS) ;
  - les mots anglais traduits ;
  - les numéros de niveau ;
  - les noms de joueurs ;
  - « W » au sens de « win » s'il apparaît.
  En cas de doute, **liste le cas dans ton rapport** au lieu de deviner.
- La version **EN** du site garde le texte d'origine en QWERTY.
- **Règle globale pour le site FR :** partout où une touche de compétence est affichée en français (ordre des compétences de la page Builds, guides, matchups), affiche **A Z E R**, et garde **Q W E R** en anglais. Crée un pipe ou un service unique `abilityKey(slot, lang)` et utilise-le partout.

---

## Méthode de travail (efficace et vérifiable)

### 1. Inventaire

Localise toutes les données de matchup. Selon l'état du dépôt, ce sera `AllGuides.json` ou les fichiers découpés par champion de la refonte.

Extrais les conseils dans `tools/i18n-matchups/source.json`, avec un identifiant stable par conseil : `champion|adversaire|index`. Le format actuel est une chaîne `"Champion\nDifficulté\nConseil"` : **seul le texte du conseil se traduit**, la ligne champion et la ligne difficulté restent intactes.

Donne-moi les comptes : nombre de champions, de conseils et de caractères.

### 2. Référentiel automatique

Écris `tools/i18n-matchups/build-glossary` pour générer `glossary.json` depuis Data Dragon (`en_US` et `fr_FR`, patch courant). Il doit contenir :
- les champions ;
- **pour chaque champion, ses compétences** : nom EN → nom FR, avec la touche QWERTY et la touche AZERTY ;
- les objets (EN → FR) ;
- les runes (EN → FR) ;
- les sorts d'invocateur (EN → FR → nom communautaire).

Ajoute `glossaire-lol-fr.md`, qui contient le jargon de la règle n°1 avec les exemples ci-dessus, et que tu suivras pendant toute la traduction.

### 3. Pilote — STOP

Traduis **3 champions complets** de rôles différents (par exemple Janna, Yasuo, Lee Sin) dans `matchups-fr.json`.

Montre-moi chaque paire source / traduction et **attends ma validation du ton** avant de continuer.

### 4. Traduction par lots

Traduis par lots d'environ 10 champions, en sauvegardant après chaque lot. Le travail doit pouvoir reprendre là où il s'est arrêté : si un identifiant est déjà traduit, ne le refais pas.

Pour chaque conseil, utilise `glossary.json` pour les noms d'objets, de runes et de compétences, et convertis les touches.

### 5. Contrôles automatiques

Écris `tools/i18n-matchups/check` et fais-le passer à 100 %. Il vérifie :
- **même nombre de conseils et mêmes identifiants** que la source ;
- **lignes champion et difficulté strictement inchangées** ;
- **mêmes nombres** dans la source et la traduction : niveaux, pourcentages, timings ;
- **aucune touche QWERTY résiduelle** dans le FR : motifs comme `\bQ\b`, `\bW\b`, `(Q)`, `max Q` hors exceptions listées (QSS…) ; et chaque Q/W de la source doit avoir son A/Z correspondant ;
- **aucun nom d'objet ou de rune anglais** resté alors qu'il existe en FR dans le glossaire ;
- **aucun reste d'anglais courant** (heuristique sur des mots comme « the », « you », « your », « when », « don't », « can't ») ;
- un ratio de longueur FR/EN entre 0,8 et 1,7, les écarts étant listés.

### 6. Rapport de relecture

Donne-moi :
- 25 paires tirées au hasard ;
- tous les cas douteux listés pendant la traduction ;
- le résultat des contrôles.

### 7. Intégration au site

- La page Matchups FR affiche la traduction ; s'il manque une traduction, elle affiche l'anglais avec le badge « EN ».
- Ajoute une mention discrète « Conseils traduits et adaptés par TeamUpp » sous la carte de conseils.
- Les nouvelles données de matchup ajoutées plus tard doivent passer par le même script de vérification. Documente la marche à suivre dans `tools/i18n-matchups/README.md`.

### 8. Guides complets (optionnel, rapport seulement)

Le champ `guideFr` existe déjà. Relis un échantillon de 5 guides et dis-moi s'il souffre des mêmes défauts : traduction littérale, touches QWERTY, noms d'objets anglais. **Ne le retraduis pas sans mon accord.**

---

Lance `npm run build` à la fin. Résume-moi ce qui a été traduit, vérifié et ce qui reste douteux.
