# Glossaire LoL FR — conseils de matchup

Référence de style pour traduire `counters_matchups` en français **tel que le parlent les joueurs de League of Legends en France**. Les noms officiels (champions, compétences, objets, runes, sorts) viennent de `glossary.json` (Data Dragon `fr_FR`).

## 1. Ton

- Tutoiement, phrases courtes et directes, impératif quand la source l'est.
- Fidélité totale au sens : on n'ajoute aucun conseil, on n'en retire aucun, on ne change aucun chiffre (niveaux, %, timings, nombres de stacks…).
- Un joueur doit avoir l'impression qu'un autre joueur lui parle, pas un traducteur.

## 2. Termes anglais gardés tels quels (et conjugués à la française)

lane, laning, phase de lane, botlane, toplane, mid, jungle, jungler, ADC, support, trade (tu peux trade, il trade), short trade, poke (il va te poke), all-in, burst, sustain, engage, disengage, peel, kite, roam, gank, dive, tower dive, freeze, slow push, fast push, wave, crash (ta wave doit crash), back, recall, CS, farm, last hit, cooldown (CD), early, mid game, late game, power spike, spike, snowball, scale, outscale, carry, tank, cheese, prio, zone / zoner, setup, bait, punish (punis-le), outplay, hook, ult, AA (auto-attaque), lvl 2, lvl 3, lvl 6, safe (joue safe), skillshot, CC, root, stun, slow, knock-up, shield, heal, proc, stack, range, melee, minions, tour / tourelle, brush, ward, vision, objectifs, drake, Nashor/Baron, Herald, teamfight, split push, matchup, counter, pick, ban, build, rush, item, core, mana, cleanse (l'action), dash, blink, zone de contrôle.

Formes francisées courantes : **trade** (verbe invariable : « tu peux trade »), **poke**, **punir** / « punis-le », **max** une compétence (« max A en premier »), **rush** un objet, **farm** (« farm safe »), « il outscale », « il te zone », « joue safe ».

## 3. Sorts d'invocateur (nom communautaire, touches D/F inchangées)

| EN | FR officiel | À écrire |
|---|---|---|
| Flash | Saut éclair | Flash |
| Ignite | Embrasement | Ignite |
| Teleport | Téléportation | TP |
| Exhaust | Fatigue | Exhaust |
| Heal | Soins | Heal |
| Ghost | Fantôme | Ghost |
| Cleanse | Purge | Cleanse |
| Smite | Châtiment | Smite |
| Barrier | Barrière | Barrière |

## 4. Objets et runes

- Toujours le **nom officiel FR** de `glossary.json` (Data Dragon `fr_FR`). Jamais un nom inventé.
- Une abréviation communautaire courante peut suivre entre parenthèses à la première mention si elle aide : « Ceinture de mercure (QSS) ».
- Objets retirés du jeu (absents du glossaire) : garder le nom anglais d'origine et le lister dans le rapport.

## 5. Champions et compétences

- Nom officiel du champion (identique en FR). Surnoms de la source conservés s'ils sont aussi employés en FR (Blitz, Naut, Vel, Kass, TF, MF, J4, Mumu…).
- Compétence nommée : **surnom communautaire** s'il existe (le hook de Blitz, l'ult, la tornade de Janna, la cage de Veigar, le stun), sinon **nom officiel FR** du glossaire. Dans les deux cas, **touche AZERTY entre parenthèses à la première mention** : « son grappin (A) », « l'ult (R) ».

## 6. Touches : QWERTY → AZERTY

| Source (QWERTY) | FR (AZERTY) |
|---|---|
| Q | **A** |
| W | **Z** |
| E | E |
| R | R |
| D / F | D / F (inchangées) |

- Convertir **toutes** les références : « Q », « (Q) », « max Q », « Q-W combo » → « combo A-Z », « EQ flash » → « EA Flash », « RQ » → « RA », « QWE » → « AZE ».
- **Ne pas convertir** : QSS, noms d'objets, mots anglais traduits, numéros de niveau, noms de joueurs, « W » au sens de « win ». En cas de doute : le noter dans le rapport.

## 7. Exemples de référence

| Anglais (source) | Mauvais (scolaire / littéral) | Bon (joueur LoL FR) |
|---|---|---|
| If you get hooked in lane by Blitz with no flash you die. | Si vous êtes accroché par Blitz sans flash, vous mourez. | Si Blitz te hook en lane et que tu n'as pas Flash, tu meurs. |
| You need to punish Blitz when he misses his hook. | Vous devez punir Blitz quand il rate son crochet. | Punis Blitz dès qu'il rate son hook (A). |
| You lose out on all trades against Senna, so dont walk up to trade with her. | Vous perdez tous les échanges contre Senna. | Tu perds tous les trades contre Senna, donc ne t'avance pas pour trade. |
| Need to heavily roam in this match up as Sona has bad 2v1 dive pressure. Rush Chemtech Putrifier. | Il faut beaucoup errer… | Roam beaucoup dans ce matchup : Sona a peu de pression en dive 2v1. Rush le Putrificateur techno-chimique. |
| Max Q first, then E. Your W is your main trading tool. | Maximisez Q en premier… | Max A en premier, puis E. Ton Z est ton outil principal pour trade. |

## 8. Genre des termes (accords)

Genre d'usage chez les joueurs FR. Il commande l'article, le possessif, l'adjectif, le participe et le pronom de reprise : « son ult (R) projette tout ce qu'**il** traverse », « une fois qu'elle l'a utilis**é** (l'ult) », « ta wave doit crash ». Ce tableau est lu par `npm run tips:check` (colonne Genre : `m` ou `f`).

| Terme | Genre |
|---|---|
| ult | m |
| hook | m |
| CD | m |
| cooldown | m |
| lvl | m |
| trade | m |
| short trade | m |
| poke | m |
| all-in | m |
| burst | m |
| engage | m |
| gank | m |
| dive | m |
| roam | m |
| freeze | m |
| slow push | m |
| fast push | m |
| back | m |
| recall | m |
| farm | m |
| last hit | m |
| CS | m |
| power spike | m |
| spike | m |
| snowball | m |
| combo | m |
| dash | m |
| blink | m |
| skillshot | m |
| CC | m |
| root | m |
| stun | m |
| slow | m |
| knock-up | m |
| shield | m |
| bouclier | m |
| heal | m |
| proc | m |
| stack | m |
| setup | m |
| bait | m |
| outplay | m |
| pull | m |
| passif | m |
| saignement | m |
| brush | m |
| buisson | m |
| drake | m |
| Nashor | m |
| Baron | m |
| Herald | m |
| teamfight | m |
| split push | m |
| matchup | m |
| counter | m |
| tank | m |
| sustain | m |
| wave | f |
| lane | f |
| botlane | f |
| toplane | f |
| jungle | f |
| tourelle | f |
| range | f |
| portée | f |
| prio | f |
| ward | f |
| vision | f |
| tornade | f |
| lame | f |
| hampe | f |
| zone | f |
| auto | f |
| AA | f |
