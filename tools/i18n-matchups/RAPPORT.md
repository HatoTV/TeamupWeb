# Rapport de traduction des conseils de matchup

Patch Data Dragon 16.22.1 · 8226 conseils traduits sur 8226 (159 champions) · 2 924 854 caractères en français.

## Résultat des contrôles

`node tools/i18n-matchups/check.mjs --complete` : **OK, aucune erreur bloquante** (8226/8226).

Exceptions explicites (chiffre de la source qui est une coquille pour « to / too ») : nasus|yone, sejuani|illaoi, sejuani|fiora.

24 avertissements, tous relus : rapports de longueur sur des conseils très courts, et faux positifs du compteur de touches (« WW » = Warwick, « w/ » = with, « w/r » = winrate, « YOU'RE », « q-q » émoticône).

- cassiopeia|aurelion-sol|0: fewer Z (1) than source W (2)
- gragas|warwick|0: fewer A (2) than source Q (3)
- janna|taric|0: length ratio 0.67
- jarvan-iv|zac|0: length ratio 1.80
- lillia|nautilus|0: length ratio 1.71
- lillia|wukong|0: length ratio 1.78
- mel|fizz|0: fewer A (2) than source Q (3)
- mordekaiser|sejuani|0: length ratio 1.83
- pantheon|akali|0: length ratio 1.78
- pantheon|vayne|0: fewer A (0) than source Q (2)
- quinn|warwick|0: fewer A (4) than source Q (5)
- rammus|urgot|0: length ratio 0.79
- rumble|teemo|0: fewer Z (1) than source W (2)
- sion|gragas|0: length ratio 2.00
- sion|vayne|0: length ratio 1.70
- tristana|shaco|0: length ratio 0.76
- tryndamere|dr-mundo|0: length ratio 1.90
- vex|syndra|0: fewer A (0) than source Q (1)
- viego|udyr|0: fewer Z (0) than source W (1)
- vladimir|kassadin|0: fewer Z (0) than source W (1)
- yasuo|karma|0: fewer A (1) than source Q (2)
- zac|bard|0: fewer Z (0) than source W (1)
- zed|veigar|0: length ratio 2.20
- zilean|teemo|0: length ratio 0.80

## À traiter dans la source (anglais, affiché tel quel sur le site EN)

- **Propos offensants** : racisme (zeri|lucian), validisme (zeri|aphelios, viktor|akali, viktor|malzahar), homophobie (tips Vladimir), insultes (shaco|*, hecarim|shaco). Neutralisés en français, toujours présents en anglais.
- **Textes décalés** (le conseil décrit un autre champion) : nocturne|taliyah → zac, dr-mundo|xayah → zeri, tahm-kench|tryndamere → yorick.
- **Source inutilisable** : les 16 tips de Xayah (traduction automatique incompréhensible).
- **Bloc espagnol** « ESP: » dans les tips de Viktor (traduit aussi : texte redondant).
- **Objets / runes retirés du jeu** gardés en anglais : Phase Rush, Predator, Divine Sunderer, Goredrinker, Galeforce, Stopwatch, Nullifying Orb, Duskblade, Everfrost, etc.

## Cas douteux par lot


### c03 (459/459, OK)
- Gardés en anglais (absents du glossaire) : Phase Rush (Olaf, Orianna, Jax, Kog'Maw) ; Sweeping/Sweeper Lens (olaf|shaco, olaf|teemo) ; Sunderer (jax|poppy, jax|sejuani) ; Stopwatch (master-yi|master-yi).
- Sens ambigu : olaf|aatrox (« 20 seconds extra » : CD ou durée ?), olaf|singed (« forced to execute »), sylas|ryze (double négation).
- Libertés : olaf|kled « sur Skaarl » ajouté ; touches (E) ajoutées olaf|rumble, jax|singed.
- Contournements dus au check (corrigé depuis) : « recall » → « back », « dont » évité.

### c05 (486/486, OK)
- Gardés en anglais : Galeforce, Sunderer, Duskblade, Evenshroud, Goredrinker, Hex Core, Navori (ambigu), Phase Rush, Predator.
- Erreurs de la source : zac|bard (« W » pour Route magique → écrit E) ; trundle|xin-zhao « Infected Cleaver » ; trundle|hecarim « Mega Adhesive » ; trundle|jarvan-iv mentionne Dr. Mundo.
- Ancien kit : trundle|aurelion-sol (noms FR de l'ancien kit, non vérifiables) ; trundle|olaf (ancien Z remplacé par l'actuel).
- trundle|yorick « the Maiden » → « la Vierge » (hors glossaire).
- Sens peu clair : trundle|illaoi, neeko|twisted-fate (« pre even lane »), kassadin|akshan/tristana/lucian (« full clear enjoyers »).
- zac|zac : vouvoiement conservé (la source s'adresse à « u guys »).

### c01 (319/319, OK)
- Gardés en anglais : Phase Rush (nombreux Quinn/Syndra), Nullifying Orb, Galeforce, Klepto, Omnistone, (Divine) Sunderer, Stopwatch.
- quinn|heimerdinger (argot « back Heim your BISH »), quinn|mordekaiser (« low ever » lu « never »), quinn|tristana (Z de Quinn peu clair), quinn|lillia (« sweet spot » → « bord »).
- « 2 » seul rendu par « lvl 2 » (quinn|lucian, quinn|tristana) ; syndra|hwei « QQ » → « A-A ».
- syndra|swain « chapter » → Chapitre perdu ; malzahar|tryndamere « dodge angle » obscur ; yorick|urgot interprété.
- kayn « Shadow Assassin » → « Assassin de l'ombre » (nom FR supposé, à vérifier).
- « level one » → « premier rang / premier niveau » pour ne pas ajouter de chiffre (quinn|camille, renekton, shen).
- WARN quinn|warwick : faux positif du compteur (« WW » = Warwick).

### c04 (353/353, OK)
- Gardés en anglais : Phase Rush, Predator, Nullifying Orb, Hextech Revolver, Frostfire Gauntlet, Stopwatch ; « Ninja Tabi » → « Coques en acier (Tabi) ».
- Textes décalés dans la SOURCE (à corriger côté données) : nocturne|taliyah parle de Trundle ; nocturne|trundle parle d'Udyr ; nocturne|udyr, vi, volibear, warwick, wukong, xin-zhao, zac parlent tous de Vi.
- Ancien kit : nocturne|graves (« True Grit »), nocturne|shyvana, nocturne|skarner, nocturne|trundle (postures d'Udyr).
- Source corrigée par l'agent (lot lancé avant la consigne « ne pas corriger ») : nocturne|jarvan-iv, nocturne|rek-sai, nocturne|udyr/vi (ult de Vi), rumble|galio (« Bloque ses A avec ton Z »), anivia|karthus.
- Sens incertain : ambessa|olaf (Z de qui ?), smolder|galio (« electrocute baus combo »).
- WARN rumble|teemo : faux positif (« w/ » = with).

### c08 (511/511, OK)
- Gardés en anglais : Phase Rush, Predator, Divine Sunderer, Adaptive Helm, Frozen Mallet, Sunfire Cape, Glacial Shroud, Warrior (enchantement jungle).
- Anciens kits remplacés par la touche (aucun nom inventé) : Shyvana « Burnout », Malphite « Primal Howl », Olaf « Vicious Strikes », Aurelion Sol (ancien kit), Quinn « SkyStrike », Riven « Wind Slash », Yorick « Maiden of the Mist ».
- Touches de la source gardées même si fausses : shyvana|pantheon (Z), aatrox|lillia (Z), malphite|kalista (A).
- Sens flou : malphite|illaoi, shyvana|olaf, shyvana|zed ; caractères cassés restitués (riven|quinn, riven|poppy).
- Étiquettes [EXTREME]/[MINOR]/[EVEN] laissées telles quelles (aatrox|irelia/fiora/riven/jax).
- Libellés Malphite : « Trades 1v1 prolongés », « Avantage en late », « Items (core) recommandés ».

### c02 (492/492, OK)
- Gardés en anglais : Frozen Gauntlet, Goredrinker, Phase Rush (nombreux), Divine Sunderer, Protobelt, Predator, Relic Shield, Stopwatch, Hexflash, Adaptive Helm, Snowball (ARAM).
- « cheater recall » écrit « cheater back » (Fiora) : contournement du check, corrigé depuis.
- Incertains : fiora|rengar/kalista (« whip »), fiora|ryze (coquille « not possible »), irelia|lee-sin, irelia|gangplank, fiora|nocturne, vladimir|illaoi, vladimir|aatrox.
- Libellés « Major » / « MINOR » gardés (irelia|mordekaiser, irelia|poppy).
- SOURCE À NETTOYER : insultes dans des tips Vladimir (« fucking gay »), atténuées en FR (« vraiment relou ») ; l'anglais les affiche toujours.
- WARN vladimir|kassadin : faux positif (« w » = with).

### c07 (562/562, OK)
- Gardés en anglais : Phase Rush, Relic Shield, Nullifying Orb, Legend: Tenacity, (Divine) Sunderer, Goredrinker ; anciens kits : Tremors (Rammus), Thunder Claws / Frenzy (Volibear) ; « Brittle » (Ornn).
- À REPRENDRE : nasus|yone — la source « dont get 2 far away » (coquille pour « too far ») ; l'agent a ajouté « Retiens juste ces 2 règles » pour garder le chiffre → corriger + exception du check.
- Contournements du check (corrigé depuis) : « recall » → « back », « dont » évité.
- Sens incertain : nasus|vex (« Feat » = fear ?), sivir|kalista (« boot supports »), nasus|yone (« close the game »), nasus|akali (Sheen), soraka « Rejuvenation » → « régénération », rammus|yorick « Mist Walkers » → « goules ».

### c06 (646/646, OK)
- Gardés en anglais : Phase Rush (nombreux), Divine Sunderer, Duskblade, Legend: Tenacity, Goredrinker, Frostfire, Ingenious ; « Package » de Corki.
- Daisy (Ivern) → « Marguerite » (nom FR du client) partout.
- SOURCE À NETTOYER : zeri|lucian (« Black man » → « Lucian »), zeri|aphelios (« diagnosed with autism » → « n'est pas humain »), vulgarités Zeri / Sion atténuées en FR.
- Tips de Sion en MAJUSCULES comme la source ; libellés Zilean « EN TOPLANE / EN MIDLANE ».
- Interprétés : rengar|karthus, rengar|diana, rengar|lulu, rengar|gwen, diana|fizz, sion|gwen, sion|ornn, zeri|nilah ; kled|tahm-kench (E gardé, source fausse) ; pantheon|vayne « q-q » (émoticône) → « T-T ».

### c11 (529/529, OK)
- Gardés en anglais : Phase Rush, Duskblade, Warrior, Stopwatch, Galeforce, Predator, Divine Sunderer, Bilgewater's Cutlass, Frostfire Gauntlet, Adaptive Helm, Goredrinker.
- Hypothèses : teemo|gnar « Divine Nerfs » → nerfs de Divine (Sunderer) ; gangplank|olaf « tonic » → Philtre de chronodistorsion (ou Triple tonique ?).
- Ancien kit / source fausse : warwick|aurelion-sol, warwick|kayle, warwick|olaf, warwick|quinn, warwick|tahm-kench (« Devour (W) »), warwick|vladimir (« Bloodthrist »), warwick|riven, warwick|renekton, warwick|zac (« Singed »).
- Sens incertain : vi|sejuani, vi|skarner, gangplank|teemo, warwick|illaoi, warwick|malzahar, warwick|lillia, warwick|olaf, teemo|mordekaiser, kha-zix|lulu (charabia conservé).

### c10 (526/526, OK)
- Gardés en anglais : Stopwatch, Klepto, Twin Shadows, Divine Sunderer (nombreux Volibear), Phase Rush ; abréviations « Dshield », « BORK », « BC ».
- Touches fausses dans la source, gardées : fizz|karma, zyra|heimerdinger, akali|swain, akali|yorick, akali|taliyah, miss-fortune|xayah, miss-fortune|senna.
- Sens peu clair : pyke|bard, viego|sejuani, viego|warwick, akali|sion, kennen|sion, kennen|riven, fizz|azir, darius|teemo, miss-fortune|vayne.
- WARN viego|udyr : faux positif (« w/r » = winrate).

### c09 (570/570, OK)
- Gardés en anglais : Phase Rush, Everfrost, Protobelt, Divine Sunderer, Goredrinker, Crystal Spires (Skarner), Brittle (Ornn).
- Textes décalés dans la SOURCE : dr-mundo|xerath (parle de Zed), dr-mundo|xin-zhao (Zeri), dr-mundo|xayah (Yuumi), dr-mundo|yuumi (Zilean), dr-mundo|zed, dr-mundo|zeri (« aurora top »), dr-mundo|viego.
- Touches / kits faux dans la source, gardés : vex|ekko, vex|neeko, annie|aurelion-sol, briar|poppy, amumu|alistar ; vex|yone, vex|yasuo, dr-mundo|yone (Tempo mortel dit supprimé).
- Sens peu clair : dr-mundo|olaf, amumu|vayne, lissandra|zoe, lux|anivia, dr-mundo|renekton, sett|warwick, nami|ashe, nami|karma.
- Vocabulaire : « PV fixes / PV évolutifs » (Lux), « scie (A) » (Mundo), « frénésie » (Briar).
- WARN vex|syndra : faux positif (« YOU'RE »).

### c15 (620/620, OK)
- Gardés en anglais : Phase Rush, Predator, Stopwatch, Galeforce, Luden's Companion, Everfrost, Protobelt.
- Anciens noms de sorts gardés en anglais : singed|aurelion-sol, singed|jax, singed|olaf, singed|quinn, singed|tahm-kench, singed|vladimir ; sources fausses gardées : singed|kalista, singed|akshan.
- Effet de bord du check : les noms anglais contenant « the » ont été remplacés (« son passif », « la Maiden »).
- Interprétés : singed|azir, lillia|bel-veth, lillia|nautilus (« Mercy » = Sandales de Mercure), lillia|shaco, lillia|quinn, cassiopeia|leblanc, mordekaiser|graves (« Last game » = late game).
- Grossièretés adoucies : kindred|katarina, morgana|tristana, mordekaiser|xayah.

### c12 (536/536, OK)
- Gardés en anglais : Phase Rush (nombreux Gragas/Jayce), Everfrost, Goredrinker, Nullifying Orb, (Divine) Sunderer, Evenshroud, Relic Shield, Spellthief's.
- Corrigé à la fusion : sejuani|illaoi (« Easy 2 Space ») et sejuani|fiora (« try 2 hit ») → « 2 » = « to », ajoutés aux exceptions du check.
- Sources erronées gardées : graves|diana (AP / MR ?), ornn|aatrox (contradiction), brand|braum, aurora|naafiri, gragas|warwick, sejuani|kennen.
- Texte source corrompu (« ? » pour les apostrophes, première lettre manquante) : nombreux tips Jayce.
- Sens flou : ornn|warwick, karma|maokai, graves|maokai, jayce|vladimir ; yasuo|jayce « 2 Doran's ».
- « Blessures graves » et « mythique » utilisés (hors glossaire).
- WARN gragas|warwick (« WW ») et yasuo|karma (« RW ») : faux positifs.

### c13 (617/617, OK)
- Gardés en anglais : Phase Rush, (Divine) Sunderer, Legend: Tenacity, Relic Shield, Spellthief, Everfrost, Klepto ; « balise trinket » ; « mythique » (notion retirée).
- Textes décalés dans la SOURCE : tahm-kench|tryndamere → yorick, chaque texte décrit le champion suivant (urgot→Vayne, volibear→Warwick, warwick→Wukong, xin-zhao→Yasuo, yasuo→Yone, yone→Yorick, yorick→Zac) ; tahm-kench|tryndamere contient aussi le texte d'Urgot.
- SOURCE INUTILISABLE : les 16 tips de Xayah sont une traduction automatique incompréhensible ; FR lissé (tristana, sivir, lucian, caitlyn) et fragments absurdes restants.
- Touches douteuses gardées : tryndamere|kog-maw, nilah, tristana, rumble ; ekko|corki ; katarina|pantheon, aurelion-sol.
- Interprétés : katarina|azir, tryndamere|katarina, tryndamere|sivir, ekko|veigar, katarina|heimerdinger ; « sword » (Katarina) → Épée longue.

### c14 (461/461, OK, aucun WARN)
- Viktor : bloc « ESP: » (espagnol) traduit aussi en FR → texte partiellement redondant (à décider : supprimer ce bloc dans la source ?).
- Garen : source en CSV brut (\n, \", \t) conservé.
- Gardés en anglais : Phase Rush, Goredrinker, Stopwatch, Emberknife, Protobelt, Future Markets, « Package » (Corki), Maiden (Yorick).
- Abréviations déduites : MoM → Gueule de Malmortius, « Blade » → Lame du roi déchu, « dirk » → Dague dentelée, « Red Trinket » → Brouilleur oraculaire, « Second Air » → Second souffle.
- Touches : garen|gwen et garen|gnar ont déjà « Z » dans la source (AZERTY) ; ryze|jax, evelynn|skarner (ancien kit).
- Insultes adoucies : viktor|akali, viktor|malzahar (« Rword »), shaco|fiddlesticks, shaco|udyr (« aids »), shaco|kha-zix, kindred, master-yi (« cuck »).
- Sens peu clair : evelynn|rengar, viktor|yone, viktor|katarina, viktor|zed, shaco|nidalee, shaco|skarner, hwei|ahri, hwei|lissandra, yone|ekko.

### c16 (441/441, OK)
- Gardés en anglais : Divine Sunderer (nombreux Poppy / Camille), Galeforce, Phase Rush (nombreux Hecarim), Legend: Tenacity ; « RTO » non identifié (camille|renekton).
- Hors glossaire : Gravitum / Calibrum (Aphelios), « Shiruma Shuffle » (coquille gardée), Remount (Kled), Maiden (Yorick), Mega Gnar.
- Sources erronées : mel|ziggs, mel|talon, poppy|jax, hecarim (« ? » pour apostrophes), mel|galio, k-sante|quinn, poppy|sylas, poppy|cho-gath ; gwen|garen « Greaves » → Jambières du berzerker.
- Adouci : hecarim|shaco (« dumb laners »).

## 25 paires tirées au hasard

### akali|swain|0 (difficulté 3)

- **EN** : | - Dodge his Abilities, Especially E (hand) he can use whole combo on you, It's huge chunk of our HP | - Save Ignite for his Ult if possible | - Minions DON'T Block his Q DMG | - He is insane in long fights (His ult perma refreshes if he hits any champion target) So try waiting it out if possible
- **FR** : | - Esquive ses compétences, surtout son E (la main) : il peut utiliser tout son combo sur toi, c'est une énorme partie de nos PV | - Garde Ignite pour son ult si possible | - Les minions NE bloquent PAS les dégâts de son A | - Il est de malade dans les longs fights (son ult se refresh en permanence s'il touche un champion), donc essaie d'attendre sa fin si possible

### aphelios|sivir|0 (difficulté 1)

- **EN** : Tied for lowest attack range ADC, Sivir is easy for Aphelios to bully with his abilities and basic attacks. Her Q helps her play from a bit further away, but is very weak early on until she builds a few crit items so it doesn't help much for winning the lane from outside Aphelios's range. Additionally, her spell shield is quite bad against Aphelios since half his abilities are hard to react to, and others can't be fully blocked because they work off of multiple hits.
- **FR** : Ex aequo pour la plus faible range d'attaque des ADC, Sivir est facile à malmener pour Aphelios avec ses compétences et ses AA. Son A l'aide à jouer d'un peu plus loin, mais il est très faible en early tant qu'elle n'a pas quelques items crit, donc il ne l'aide pas beaucoup à gagner la lane depuis l'extérieur de la range d'Aphelios. En plus, son bouclier magique (E) est assez mauvais contre Aphelios, car la moitié de ses compétences sont dures à anticiper, et les autres ne peuvent pas être entièrement bloquées, car elles fonctionnent sur plusieurs coups.

### gnar|yasuo|0 (difficulté 4)

- **EN** : Yasuo is an absolute nightmare for Gnar. His E can be used indefinitely as long as he has minions to use it on. Because of this, Gnar’s only option to stay at a range is to step far from his own minion wave. The best time to trade with Yasuo is when he has no minions to E through. Watch carefully for when Yasuo has his tornado. Yasuo’s W will eat Gnar’s Q and put it on the full cooldown. It’ll also stop Mega Gnar’s Q from travelling.
- **FR** : Yasuo est un véritable cauchemar pour Gnar. Il peut utiliser son E indéfiniment tant qu'il a des minions sur lesquels l'utiliser. À cause de ça, la seule option de Gnar pour rester à distance, c'est de s'éloigner beaucoup de sa propre wave. Le meilleur moment pour trade avec Yasuo, c'est quand il n'a aucun minion à traverser avec son E. Surveille bien quand Yasuo a sa tornade. Le Z de Yasuo absorbe le A de Gnar et le remet en CD complet. Il empêche aussi le A de Méga Gnar d'avancer.

### ivern|jayce|0 (difficulté 3)

- **EN** : | His cannon Q counts as an aoe projectile, which means that Daisy takes reduced damage from it. Abuse this to deny his poke. | Ease of gank depends heavily on which champion your laner picked and whether he has phase rush or not. Can range from easy to impossible. | A fun IQ test you can administer upon a Jayce player is to run Daisy at him and see if he uses hammer E to knock her away or not. You'd be surprised at how many just let Daisy kill them and never cast E.
- **FR** : | Son A en forme canon compte comme un projectile AOE, donc Marguerite en subit moins de dégâts. Abuse de ça pour bloquer son poke. | La facilité à gank dépend beaucoup du champion de ton laner et de s'il a Phase Rush ou pas. Ça peut aller de facile à impossible. | Petit test de QI marrant pour un joueur de Jayce : envoie Marguerite sur lui et regarde s'il utilise son E en forme marteau pour la repousser. Tu serais surpris du nombre de joueurs qui laissent juste Marguerite les tuer sans jamais lancer leur E.

### jayce|katarina|0 (difficulté 1)

- **EN** : | Katarina is a weak laner outside of a couple key moments. Make sure you don? stand on any daggers and respect her level 2 and level 6 all in. For the most part Katarina will just look to spam roam and cheese kills from other lanes so placing good wards and pinging missing or retreat pings on lanes to keep her from getting kills is really important. If you can ever lock her in lane or kill her you will be massively ahead. Make sure you save melee E in order to cancel her ultimate. This is a matchup you can consider running electrocute ignite in as well.
- **FR** : | Katarina est faible en lane en dehors de quelques moments clés. Assure-toi de ne te placer sur aucune dague et respecte ses all-in aux niveaux 2 et 6. La plupart du temps, Katarina va juste chercher à roam en boucle et voler des kills sur les autres lanes, donc poser de bonnes wards et mettre des pings « missing » ou « retreat » sur les lanes pour l'empêcher de prendre des kills est vraiment important. Si tu arrives à la bloquer en lane ou à la tuer, tu auras une énorme avance. Garde ton E melee pour annuler son ult (R). C'est aussi un matchup où tu peux envisager de jouer Électrocution + Ignite.

### kayle|malzahar|0 (difficulté 3)

- **EN** : Malzahar is not a problem if you buy some magic resistance like Wit'z End or Quick Silver to get rid of his ultimate
- **FR** : Malzahar n'est pas un problème si tu achètes de la résistance magique comme Au bout du rouleau, ou la Ceinture de mercure (QSS) pour te débarrasser de son ult

### lissandra|veigar|0 (difficulté 3)

- **EN** : | useless . go ignite , poke him , your e can get you out of cage defensively and offensively and your selfcast R can counter his R . Just win lane win game situation . Be carefull ganking him when he is 6 your jungler will be level 4-5 and he can get oneshotted and that would be extremely bad .
- **FR** : | Inutile. Prends Ignite, poke-le ; ton E peut te sortir de la cage en défense comme en attaque, et ton R sur toi-même peut contrer son R. Gagne la lane, gagne la game. Fais attention en le gankant quand il est 6 : ton jungler sera niveau 4-5 et il peut se faire one shot, ce qui serait extrêmement mauvais.

### lulu|thresh|0 (difficulté 4)

- **EN** : | You have to be very careful not to overstep into his Flay range. If you're fast enough, you can auto attack him once, and back away immediately, and he shouldn't be able to reach you. But your next threat is he may walk forward and try to Q first. If you get hit by either ability, be ready to W his lane partner.
- **FR** : | Tu dois faire très attention à ne pas t'avancer dans la portée de son flay (E). Si tu es assez rapide, tu peux l'auto-attaquer une fois et reculer immédiatement, et il ne devrait pas pouvoir t'atteindre. Mais la menace suivante, c'est qu'il avance et tente son A en premier. Si tu te fais toucher par l'une ou l'autre compétence, prépare-toi à Z son partenaire de lane.

### mel|pantheon|0 (difficulté 1)

- **EN** : Pantheon is horrible into Mel. Spam your spells on him. Do not use your W when he engages with his W onto you. He can hold his auto attacks and wait out your W in this case. Instead, if he does W on you (he shouldn't you have too much range), wait out the stun, root him after, and reflect one of the Qs that come later. Super easy lane and ping out his movements/roams since he use his ultimate to kill your teammates. We outscale here.
- **FR** : Pantheon est horrible contre Mel. Spam tes sorts sur lui. N'utilise pas ton Z quand il t'engage avec son Z. Dans ce cas, il peut retenir ses AA et attendre la fin de ton Z. À la place, s'il te Z (il ne devrait pas, tu as trop de range), attends la fin du stun, root-le ensuite et renvoie un des A qui suivent. Lane super facile, et ping ses déplacements/roams, car il peut utiliser son ult (R) pour tuer tes coéquipiers. Tu l'outscale ici.

### qiyana|azir|0 (difficulté 4)

- **EN** : | He has a lot of range. Avoid poke and go in after he uses Q. Electrocute and Ignite with Long Sword 3Pots if you are confident for a kill, otherwise First Strike Resolve (Second Wind) and Teleport with Tear Of Goddess 2Pots.
- **FR** : | Il a beaucoup de range. Évite le poke et rentre après qu'il a utilisé son A. Électrocution et Ignite avec Épée longue + 3 potions si tu es sûr de toi pour le kill, sinon Premier coup Volonté (Second souffle) et TP avec Larme de la déesse + 2 potions.

### quinn|gangplank|0 (difficulté 2)

- **EN** : | I recommend Fleet for this match-up, though PTA is better to punish GP in lane. | Electrocute is good too, but you must be better than GP to succeed with this. | If you take bad trades with Electrocute or PTA, you will have a tough laning phase. | The choice is yours, and if you are playing against Easier GPs in lower elos, then PTA/E-Cute will be the better choice to win lane easier. | I recommend Fleet overall against GP though because GP can sustain quite well with his corrupting pots in lane along with W, and he also has reliable poke that is a lock on ability with his Q. | If you run fleet, you can sustain his poke in lane. | Level 1 Gangplank has no pressure to out trade you, so use your vault aggessively. | If Gangplank ever Qs you, retaliate with Vault + many Auto Attacks to win the trade. | Since most GPs run corrupting pot, it's very important to keep tab on if he has the pots active. | To check if he has a corrupting pot active, click on Gangplank's character and on the top-left of the screen, it will show the corrupting pot timer under his name. | Do NOT trade with Gangplank while he has corrupting pots active because these consumables grant him more damage while active. | Your goal in the early laning phase is to get GP to consume all 3 corrupting pots as soon as possible, and every time he uses one pot, back off until it wears off before you go in for trades. | Level 3 onwards the lane gets really fun. The most important interaction is to practice dodging his barrel explosing with your E, Vault. | To do so, when Gangplank explodes a barrel, he will try to throw one in front of you to hit a Double/triple barrel combo. | The key to time this correctly is when Gangplank explodes his first barrel, immeditately retaliate with Vault, and if timed correctly, Quinn will dodge the explosions from the other barrels. | Master this mechanic and GP has no chance in lane. | If he misses his Barrels, immediately run him down and launch your whole combo on his to get a big trade win. | Ideally, you want to land your Q on Gangplank in lane first, and if you land it, go in for a quick trade becasue Gangplank cannot retaliate with his Q since it is a lock on ability, which means you will get a free trade in lane. | Even if you are behind in this lane guys, when you get 1-2 items, you will be able to 1v1 GP ALWAYS because your crit build will provide enough damage to destroy him. | All you need are 2 crit items and you will out DPS him in 1v1s. | GP is a bad 1v1 champ, and you can think of him as a poke AD caster mage. | He is quite squishy for the most part, which means our crit build will do wonders later on :) | Side Note: Gang plank can win level 1 if he plays it correctly. | The only GP player that I ever struggled with level 1 was Solarbacca, the best GP in the world, but most GP players wont do what he does. | If you see GP with ignite start, be careful of his level 1 cheese. | He will poke you 2 times with his Q, and then he'll flash forward to AA you, and this AA is his passive so he gets MS from it. | When you flash away, he'll ignite and then Q grasp you to kill you. | Overall, you hard win level 1, but if the GP plays like this, just be a little mindful of long trades early game. | Also, Solarbacca rushed bramble into me last time I vsed him, which was not fun lol. | If you see bramble GP, go Kraken rush and wait for 1-2 items. | You win 1v1 with 2 items no matter what.
- **FR** : | Je recommande Jeu de jambes (Fleet) dans ce matchup, même si Attaque soutenue (PTA) est meilleure pour punir GP en lane. | Électrocution marche bien aussi, mais tu dois être meilleur que le GP pour réussir avec. | Si tu prends de mauvais trades avec Électrocution ou PTA, ta phase de lane va être difficile. | À toi de choisir : si tu joues contre des GP plus faciles dans les elos plus bas, PTA/Électrocution sera le meilleur choix pour gagner la lane plus facilement. | Mais globalement, je recommande Jeu de jambes contre GP, car il sustain plutôt bien en lane avec ses Potions de corruption et son Z, et il a aussi un poke fiable avec son A, un sort ciblé. | Si tu prends Jeu de jambes, tu peux encaisser son poke en lane. | Au niveau 1, Gangplank n'a pas la pression pour te battre en trade, donc utilise ton Salto (E) agressivement. | Si Gangplank te met son A, riposte avec ton Salto + plein d'auto-attaques pour gagner le trade. | Comme la plupart des GP prennent la Potion de corruption, c'est très important de surveiller s'il a une potion active. | Pour vérifier s'il a une Potion de corruption active, clique sur Gangplank : en haut à gauche de l'écran, le timer de la potion s'affiche sous son nom. | Ne trade PAS avec Gangplank quand il a une Potion de corruption active, car ces consommables lui donnent plus de dégâts tant qu'ils sont actifs. | Ton objectif au début de la phase de lane, c'est de faire consommer à GP ses 3 Potions de corruption le plus vite possible, et chaque fois qu'il en utilise une, recule jusqu'à ce que l'effet se termine avant d'aller trade. | À partir du niveau 3, la lane devient vraiment fun. L'interaction la plus importante, c'est de t'entraîner à esquiver l'explosion de ses barils avec ton E, le Salto. | Pour ça : quand Gangplank fait exploser un baril, il va essayer d'en lancer un devant toi pour placer un combo double/triple baril. | La clé pour bien timer, c'est de riposter immédiatement avec ton Salto quand Gangplank fait exploser son premier baril. Si c'est bien timé, Quinn esquive les explosions des autres barils. | Maîtrise cette mécanique et GP n'a aucune chance en lane. | S'il rate ses barils, cours-lui dessus tout de suite et lance tout ton combo sur lui pour gagner un gros trade. | Idéalement, tu veux placer ton A sur Gangplank en lane en premier, et si tu le touches, va chercher un trade rapide, car Gangplank ne peut pas riposter avec son A puisque c'est un sort ciblé : tu obtiens donc un trade gratuit en lane. | Même si vous êtes en retard dans cette lane, les gars, quand tu as 1-2 items, tu pourras TOUJOURS 1v1 GP, car ton build crit te donne assez de dégâts pour le détruire. | Il te suffit de 2 items crit et tu vas le dépasser en DPS dans les 1v1. | GP est mauvais en 1v1, tu peux le voir comme un mage AD de poke. | Il est assez squishy la plupart du temps, ce qui veut dire que notre build crit fera des merveilles plus tard :) | Remarque : Gangplank peut gagner le niveau 1 s'il le joue correctement. | Le seul joueur de GP contre qui j'ai galéré au niveau 1, c'est Solarbacca, le meilleur GP du monde, mais la plupart des joueurs de GP ne feront pas ce qu'il fait. | Si tu vois un GP qui part avec Ignite, méfie-toi de son cheese niveau 1. | Il va te poke 2 fois avec son A, puis il va Flash en avant pour te mettre une AA, et cette AA est son passif, donc il gagne de la vitesse avec. | Quand tu Flash pour fuir, il va Ignite puis te mettre un A avec Poigne de l'immortel pour te tuer. | Globalement, tu gagnes largement le niveau 1, mais si le GP joue comme ça, méfie-toi un peu des long trades en early. | Aussi, Solarbacca a rush l'Armure roncière contre moi la dernière fois que je l'ai affronté, et ce n'était pas fun lol. | Si tu vois un GP avec l'Armure roncière, rush Tueur de krakens et attends d'avoir 1-2 items. | Tu gagnes le 1v1 avec 2 items quoi qu'il arrive.

### rengar|shaco|0 (difficulté 2)

- **EN** : | Lvl1 invade with your team into Shaco's raptors early as he always places a box there to guard invade. Shaco heavily relies on his boxes for his clear and has the fastest lvl3 in the game if he does it perfectly. If you can't break his boxes try and look for countergank, smite his boxes when he places them down in 1v1, and make sure to land E so he cant Q away. If E isn't up then immediately use scanner when you jump him as scanner is just big enough that when he Q's he's on the edge of the scanner range so you can trail him down.
- **FR** : | Invade lvl1 avec ton équipe les raptors de Shaco, car il pose toujours une boîte (Z) là pour se protéger des invades. Shaco dépend énormément de ses boîtes pour son clear et a le lvl3 le plus rapide du jeu s'il le fait parfaitement. Si tu ne peux pas casser ses boîtes, cherche le counter gank, Smite ses boîtes quand il les pose en 1v1, et place bien ton E pour qu'il ne puisse pas fuir avec son A. Si ton E n'est pas up, utilise tout de suite le Brouilleur oraculaire quand tu lui sautes dessus, car sa zone est juste assez grande pour que, quand il utilise son A, il soit au bord de la portée, donc tu peux le suivre.

### rumble|vladimir|0 (difficulté 3)

- **EN** : | Vlad is tough to kill but he’s a REALLY easy lane opponent. You can take Comet or Electrocute, whatever the game calls for-- Electrocute for more skirmish/roam playstyle which is what I prefer, especially in this matchup. Vlad is also really easy to kill provided he doesn’t have W. If you can force his W pool out then you can kill him, do not dive him with it up unless you’re certain you can kill him. | If I’m mid, I look to roam often since he’ll probably be playing really far back. If you're in the top lane you can easily run him down the lane. Watch his resource bar, it’ll tell you when he has his Q up and don’t trade with him when it’s glowing red or about to be full, just walk away.
- **FR** : | Vlad est dur à tuer, mais c'est un adversaire de lane VRAIMENT facile. Tu peux prendre Comète arcanique ou Électrocution, selon ce que demande la game -- Électrocution pour un style plus axé escarmouche/roam, ce que je préfère, surtout dans ce matchup. Vlad est aussi très facile à tuer tant qu'il n'a pas son Z. Si tu arrives à lui faire sortir son Z (bain de sang), tu peux le tuer ; ne le dive pas quand il l'a up, sauf si tu es sûr de pouvoir le tuer. | Si je suis mid, je cherche souvent à roam, car il va sûrement jouer très en retrait. Si tu es top, tu peux facilement lui rouler dessus dans la lane. Surveille sa barre de ressource : elle t'indique quand son A est up. Ne trade pas avec lui quand elle brille en rouge ou qu'elle est presque pleine, éloigne-toi juste.

### smolder|veigar|0 (difficulté 4)

- **EN** : Both Veigar and Smolder scale, but Veigar out scales Smolder and you must be aware of his minion farming. When he early game goes to Q farm minions, E, W, Q and poke him. He will most likely E you here, so play around it and dodge his W to take reduced damage. If he E's you when you're far enough on his side, flash out because you'll probably die too quickly to secure a kill as you will be either be getting ganked or you'll take too much poke to sustain in lane.
- **FR** : Veigar et Smolder scalent tous les deux, mais Veigar outscale Smolder et tu dois faire attention à son farm de minions. Quand il va farm les minions avec son A en early, fais E, Z, A et poke-le. Il va très probablement te mettre sa cage (E) à ce moment-là, donc joue autour et esquive son Z pour prendre moins de dégâts. S'il te met son E quand tu es assez loin de son côté, Flash pour sortir, car tu vas sûrement mourir trop vite pour prendre un kill : soit tu vas te faire gank, soit tu vas prendre trop de poke pour tenir en lane.

### thresh|nami|0 (difficulté 4)

- **EN** : Do not underestimate Namis damage, punish her if she misses her Q, but don't over commit, her lane partner might chase you down with the slows from Nami.
- **FR** : Ne sous-estime pas les dégâts de Nami. Punis-la si elle rate sa A, mais ne t'engage pas trop, car son partenaire de lane pourrait te chase grâce aux slows de Nami.

### tryndamere|tristana|0 (difficulté 4)

- **EN** : | This champion is a major threat because her kit counters yours. If E is on you always disengage because she can W on your head and recast and safely damage you. There is a window to kill tristana post 6 when her E is on CD and preferrably her Q as well. Post 6, it's almost impossible to kill her unless she's terrible, so just avoid.
- **FR** : | Ce champion est une menace majeure, car son kit counter le tien. Si son E est sur toi, disengage toujours, car elle peut Z sur ta tête, le relancer et te faire des dégâts en sécurité. Il y a une fenêtre pour tuer Tristana après le 6, quand son E est en CD, et idéalement son A aussi. Après le 6, c'est presque impossible de la tuer sauf si elle est nulle, donc évite juste.

### viego|bel-veth|0 (difficulté 5)

- **EN** : | Jungle - Basically Viego but better. Be'veth if allowed to gain a lead early will snowball the game just like Viego, especially post 6. She will likely 3 camp into invade and she will beat you. Theres a chance she priorities' herald the moment it spawns so watch out for that.
- **FR** : | Jungle - En gros, Viego en mieux. Si on la laisse prendre de l'avance tôt, Bel'Veth va snowball la game comme Viego, surtout après le 6. Elle va sûrement faire 3 camps puis invade, et elle va te battre. Il y a des chances qu'elle priorise le Herald dès qu'il spawn, donc fais attention à ça.

### vladimir|renekton|0 (difficulté 3)

- **EN** : If you fuck up early then you're in trouble, rush seekers for a lot less damage, cdr can help, you outrange him just be careful about his double dash, if you win this matchup, the game is freelo
- **FR** : Si tu te rates en early, tu es dans la merde. Rush le Protège-bras du savant pour prendre bien moins de dégâts, le CDR peut aider. Tu l'outranges, fais juste attention à son double dash. Si tu gagnes ce matchup, la game est freelo

### warwick|rengar|0 (difficulté 3)

- **EN** : | Opt to build tank against Rengar, Rengar has a lot of burst damage potential if he is near the brush. Use Primal Howl or Infinite Duress to prevent Unseen Predator(Passive). (Recommended Items: Plated Steelcaps) (Sustained 1v1 Battles: Even) (Outscaling Edge: Warwick) (Jaws of the Beast can follow Unseen Predator)
- **FR** : | Choisis de build tank contre Rengar, il a énormément de potentiel de burst s'il est près d'un brush. Utilise Hurlement bestial (E) ou Contrainte infinie (R) pour bloquer son Prédateur invisible (passif). (Items recommandés : Coques en acier) (Combats longs en 1v1 : égal) (Avantage en scaling : Warwick) (Dents de la bête (A) peut suivre Prédateur invisible)

### warwick|vladimir|0 (difficulté 3)

- **EN** : | You will have to make trades early game and stick on Vladimir. Juke or kite out his TIdes of Blood. Avoid fighting Vladimir while he has Bloodthrist(Q) passive or he will able to heal. Dodge or juke out his Hemoplague and he will lose majority of his damage. (Outscaling Edge: Even) (Sustained 1v1 Trades: Even) (Recommended Items: Executioner's)
- **FR** : | Tu devras faire tes trades en early game et coller Vladimir. Feinte ou kite ses Vagues de sang (E). Évite de combattre Vladimir quand il a le passif de son Bloodthrist (A), sinon il pourra se heal. Esquive ou feinte sa Peste sanguine et il perdra la plupart de ses dégâts. (Avantage en scaling : égal) (Trades longs en 1v1 : égal) (Items recommandés : Marque du bourreau)

### zac|cassiopeia|0 (difficulté 5)

- **EN** : | Zac's matchup against Cassiopeia is one of the most difficult for him. Most of her abilities are more powerful than Zac's, making fighting or trading with her a risky endeavor. Her Q is easy to hit, granting her bonus movespeed and damage, making it easier for her to kite him out. Her W ground can also cancel Zac's E, making it difficult for him to engage. Therefore, it is best to avoid trading or fighting Cassiopeia unless you are sure you can kill her.
- **FR** : | Le matchup de Zac contre Cassiopeia est un des plus durs pour lui. La plupart de ses compétences sont plus puissantes que celles de Zac, donc se battre ou trade avec elle est risqué. Son A est facile à placer et lui donne de la vitesse de déplacement et des dégâts en plus, ce qui l'aide à te kite. La zone au sol de son Z peut aussi annuler le E de Zac, ce qui lui rend l'engage difficile. Donc le mieux, c'est d'éviter de trade ou de te battre contre Cassiopeia, sauf si tu es sûr de la tuer.

### zac|fiora|0 (difficulté 4)

- **EN** : | This matchup is one of my favorites and it is completely based on skill. The counter I have found to this is to Q1 a minion and then press the S key next to Fiora. This will create the illusion of an auto attack, which 80% of the time will force the parry. Make sure you wait for the whole parry before completing the Q2 auto attack. There have been times when I have auto attacked too early and got myself killed. If you wait it out, you are almost guaranteed to win the 1v1. The only time Fiora truly outscales is at level 16, and even then most of the time she probably won't be killing you as the main target.
- **FR** : | Ce matchup est un de mes préférés et il est entièrement basé sur le skill. Le counter que j'ai trouvé, c'est de mettre ton A1 sur un minion puis d'appuyer sur la touche S à côté de Fiora. Ça donne l'illusion d'une auto-attaque, ce qui force la parade (Z) 80% du temps. Attends bien la fin de la parade avant de finir l'auto-attaque de ton A2. Il m'est arrivé d'auto trop tôt et de me faire tuer. Si tu attends, tu es presque sûr de gagner le 1v1. Le seul moment où Fiora t'outscale vraiment, c'est au niveau 16, et même là, la plupart du temps elle ne va sûrement pas te tuer en tant que cible principale.

### ziggs|malphite|0 (difficulté 4)

- **EN** : | [I would use the First Strike page in this lane, with the Precision path, and start Amplifying Tome.] | Malphite is pretty hard to poke out due to his passive, Doran's Shield and Second Wind. Try to get as much gold from him as you can using First Strike, and try to maintain dominance over the wave so he's unable to roam with his ultimate.
- **FR** : | [Je prendrais la page Premier coup dans cette lane, avec l'arbre Précision, et je commencerais Tome d'amplification.] | Malphite est assez dur à poke à cause de son passif, du Bouclier de Doran et de Second souffle. Essaie de récupérer le plus de gold possible sur lui avec Premier coup, et essaie de garder le contrôle de la wave pour qu'il ne puisse pas roam avec son ult.

### zoe|ekko|0 (difficulté 3)

- **EN** : | This is pretty good for Zoe overall but you do need to be careful not to waste your E. If you hold your E for when he jumps on you he pretty much has no choice but to just get poked for free without giving him a window.
- **FR** : | C'est plutôt bon pour Zoe globalement, mais tu dois faire attention à ne pas gâcher ton E. Si tu gardes ton E pour quand il te saute dessus, il n'a quasiment pas d'autre choix que de se faire poke gratuitement sans que tu lui laisses de fenêtre.

### zyra|sona|0 (difficulté 3)

- **EN** : | She has a fair amount of sustain and poke, so bring your potions and be good with your E. Her E also gives a lot of MS. She will out-poke you but you win all ins early. Once 6, you must ensure you aren't in a position to get double stunned with your ADC.
- **FR** : | Elle a pas mal de sustain et de poke, donc prends tes potions et sois bon avec ton E. Son E lui donne aussi beaucoup de vitesse de déplacement. Elle va te out-poke, mais tu gagnes les all-in en early. Une fois 6, assure-toi de ne pas être en position de te faire double stun avec ton ADC.
