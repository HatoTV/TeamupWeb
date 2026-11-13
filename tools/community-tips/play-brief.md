# Brief : recherche « Tips pour jouer {champion} » (TeamUpp)

Projet : `d:\ENTREPRISE\Projets\DevWEB\4 - TeamUpp` (Angular, ne lance PAS de build, ne fais AUCUN commit, ne touche à aucun autre fichier que ceux listés en « Livrables »).
Lis d'abord la section « Fiches « Tips pour jouer {champion} » (`play/`) » de `tools/community-tips/README.md` (format, règles) et un exemple de schéma : `playTipsSchema` dans `tools/community-tips/src/schema.ts`.
Patch actuel : 16.22 (Data Dragon 16.22.1). Date du jour : 2026-11-13.

## But par champion
- 2 à 5 combos réellement joués (engage, trade court, burst, animation cancel, combos avec Flash).
- 4 à 8 astuces concrètes, type « X peut traverser un mur avec tel sort », interactions entre sorts, timings, pièges classiques.
- Uniquement combos et astuces : pas de guide général, pas d'objets/runes/ordre de montée (une interaction mécanique précise avec un objet est tolérée si vérifiée).
- Si le contenu vérifié manque, mets-en moins. Moins de 2 entrées vérifiées au total → ne crée PAS de fichier, signale-le.

## Sources (ordre de priorité)
1. Wiki officiel : `node tools/community-tips/src/wiki-abilities.ts <ChampionId>` (depuis la racine du projet) imprime noms FR/EN officiels, descriptions, CD, portées et surtout les `notes` (franchissement de terrain, cancels, interactions). URL de source à citer : `https://wiki.leagueoflegends.com/en-us/<Nom_Wiki>` (type `wiki`, date 2026-11-13). Les pages HTML du wiki sont bloquées par un anti-bot : n'essaie pas WebFetch dessus, utilise l'outil (ou l'API `https://wiki.leagueoflegends.com/en-us/api.php?action=parse&format=json&redirects=1&prop=wikitext&page=...` via curl).
   Attention : pour un sort en deux temps (ex. Lee Sin « Sonic Wave / Resonating Strike »), l'outil ne lit que la 1re forme. Lis la 2de via l'API : `page=Template:Data_<Nom_Wiki>/<Nom EN de la 2de forme>` (espaces → `_`). Idem pour les formes alternatives (Nidalee, Jayce, Elise, Gnar…).
2. Patch notes Riot (type `patchnote`) si un changement récent compte.
3. Joueurs : vidéos YouTube de joueurs haut elo / OTP via les outils MCP hato-clips (charge-les avec ToolSearch `select:mcp__hato-clips__chercher_videos,mcp__hato-clips__sous_titres,mcp__hato-clips__chercher_dans_sous_titres`) ; cherche « {champion} combos guide », « {champion} tips and tricks », « {champion} mechanics guide », « combos {champion} » (FR). Préfère < 18 mois, après le dernier rework. Utilise `chercher_dans_sous_titres` avec des mots-clés (noms de sorts, « combo », « flash », « wall », « cancel ») plutôt que de lire tout. 4 vidéos ouvertes max par champion. Guides écrits (Mobalytics, etc.) via WebSearch/WebFetch s'ils sont disponibles ; Mobafire et Reddit bloquent souvent : n'insiste pas. Sites interdits : `blacklist` de `tools/community-tips/sites.json`.

## Vérification (le contrôle automatique l'impose via `refs`)
- Chaque combo / astuce : confirmé par le wiki officiel (ou une patch note), OU par au moins 2 sources d'auteurs différents (`author` = chaîne YouTube ou auteur).
- Chaque combo cite en plus au moins une source joueur (type `video` ou `guide`) : il doit être réellement joué.
- Cohérent avec les données du sort au patch 16.22 (descriptions de l'outil wiki). Écarte ce qui date d'avant un rework ou a été modifié depuis.
- Franchissement de mur : uniquement si une source le dit explicitement (ex. note wiki « The dash can cross terrain »).
- N'invente rien. Dans le doute, écarte et note-le dans `rejected`.
- Note dans `toVerifyInGame` les points vrais selon les sources mais subtils (timing précis, interaction rare) qu'il vaudrait mieux tester en jeu.

## Rédaction
- Ton TeamUpp : tutoiement, phrases courtes, jargon FR (CD, trade, all-in, wave, burst, engage). Reformule, pas de copie (8 mots consécutifs identiques à une phrase source = refus automatique).
- Noms officiels des sorts : FR dans `fr`, EN dans `en` (donnés par l'outil wiki, ligne « EN « … » · FR « … » »). Touche entre parenthèses : FR en AZERTY (A, Z, E, R), EN en QWERTY (Q, W, E, R). Jamais « Q » ou « W » seul dans un texte FR.
- Nom de combo : 6 mots max. Desc de combo : 1 à 2 phrases, 45 mots max. Astuce : 40 mots max. FR et EN disent la même chose.
- Accords en FR : respecte le genre des termes du glossaire (`tools/i18n-matchups/glossaire-lol-fr.md`, section 8 ; ex. « la wave », « le CD »).
- `keys` en QWERTY dans l'ordre de lancement ; sorts d'invocateur = `D` ou `F` + `summoners: { "F": "SummonerFlash" }` (noms d'image Data Dragon : SummonerFlash, SummonerDot (Embrasement), SummonerExhaust, SummonerHaste, SummonerTeleport, SummonerSmite, SummonerHeal, SummonerBarrier, SummonerBoost). Convention : Flash sur F, l'autre sort sur D.
- `level` : `easy` (2 sorts sans timing serré), `medium`, `hard` (buffer / cancel / timing fin).
- `tag` : `mechanic`, `passive`, `terrain`, `timing`, `interaction`.

## Livrables (par champion `<Id>` = id Data Dragon, ex. `LeeSin`)
1. `public/assets/data/community-tips/play/<Id>.json` :
```json
{ "champion": "<Id>", "patch": "16.22", "lastResearch": "2026-11-13",
  "combos": [{ "name": {"fr": "", "en": ""}, "keys": ["E","Q"], "level": "medium", "desc": {"fr": "", "en": ""}, "refs": [0, 1] }],
  "tips": [{ "tag": "terrain", "text": {"fr": "", "en": ""}, "refs": [0] }],
  "sources": [{ "title": "", "url": "", "type": "wiki", "date": "2026-11-13", "author": "League of Legends Wiki" }] }
```
   (`summoners` seulement si `D`/`F` dans `keys`. `refs` = index dans `sources`.)
2. `tools/community-tips/notes/play/<Id>.notes.json` :
```json
{ "searches": 0, "pagesRead": 0,
  "sourceSentences": ["phrases (ou extraits de sous-titres) des sources qui fondent chaque entrée, en VO, pour le contrôle anti-copie"],
  "rejected": [{ "idea": "", "reason": "" }],
  "toVerifyInGame": [""] }
```
NE modifie PAS `play/index.json` ni `docs/tips-progress.md` : l'agent principal s'en charge.

## Contrôle avant de rendre
Pour chaque champion, ajoute temporairement l'entrée dans une copie… non : lance simplement `node tools/community-tips/src/check-play.ts` ; il signalera « play/index.json says nothing » pour tes fichiers (normal, ignore cette seule erreur) et toute autre erreur doit être corrigée.

## Rapport final (court)
Par champion : nb combos / nb astuces, sources utilisées (titre + URL), points écartés notables, points à vérifier en jeu, et champions sans fichier (raison).

## Pièges constatés au lot 0 (à éviter)
- Pas d'astuce générique valable pour tout champion (ex. « ton skillshot est bloqué par un bouclier de sort ») : il faut une info propre au champion.
- `tag` juste : `passive` = le passif inné du champion (ou l'effet passif d'un sort s'il est explicitement passif) ; une mécanique d'ult = `mechanic` ou `timing`.
- Le volume vidéo est limité : 4 vidéos max par champion. Une même vidéo ne sert qu'à son champion.
- Date d'une vidéo : date de publication si `infos_video` la donne, sinon date de consultation.
