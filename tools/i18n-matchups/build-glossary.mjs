#!/usr/bin/env node
// Builds tools/i18n-matchups/glossary.json from Data Dragon (en_US + fr_FR, current patch):
// champions with their abilities (QWERTY + AZERTY key), items, runes and summoner spells.
//
// Usage: node tools/i18n-matchups/build-glossary.mjs [version]

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DDRAGON = 'https://ddragon.leagueoflegends.com';
const OUT = fileURLToPath(new URL('./glossary.json', import.meta.url));

const QWERTY = ['Q', 'W', 'E', 'R'];
const AZERTY = { Q: 'A', W: 'Z', E: 'E', R: 'R' };

/** Names used by French players for summoner spells (keys D/F never change). */
const SUMMONER_COMMUNITY = {
  SummonerFlash: 'Flash',
  SummonerDot: 'Ignite',
  SummonerTeleport: 'TP',
  SummonerExhaust: 'Exhaust',
  SummonerHeal: 'Heal',
  SummonerHaste: 'Ghost',
  SummonerBoost: 'Cleanse',
  SummonerSmite: 'Smite',
  SummonerBarrier: 'Barrière',
};

async function json(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

const version = process.argv[2] ?? (await json(`${DDRAGON}/api/versions.json`))[0];
const data = (lang, file) => json(`${DDRAGON}/cdn/${version}/data/${lang}/${file}`);
const [champEn, champFr, itemEn, itemFr, runeEn, runeFr, sumEn, sumFr] = await Promise.all([
  data('en_US', 'championFull.json'),
  data('fr_FR', 'championFull.json'),
  data('en_US', 'item.json'),
  data('fr_FR', 'item.json'),
  data('en_US', 'runesReforged.json'),
  data('fr_FR', 'runesReforged.json'),
  data('en_US', 'summoner.json'),
  data('fr_FR', 'summoner.json'),
]);

const champions = {};
for (const [id, en] of Object.entries(champEn.data)) {
  const fr = champFr.data[id];
  champions[id] = {
    en: en.name,
    fr: fr.name,
    passive: { en: en.passive.name, fr: fr.passive.name },
    abilities: en.spells.map((spell, i) => ({
      qwerty: QWERTY[i],
      azerty: AZERTY[QWERTY[i]],
      en: spell.name,
      fr: fr.spells[i].name,
    })),
  };
}

// Items: Summoner's Rift (map 11), purchasable or upgraded; keep unique EN → FR pairs.
const items = {};
for (const [id, en] of Object.entries(itemEn.data)) {
  const fr = itemFr.data[id];
  if (!fr || !en.name || !en.maps?.['11']) continue;
  if (en.name !== fr.name || !(en.name in items)) items[en.name] = fr.name;
}

const runes = {};
for (const [i, treeEn] of runeEn.entries()) {
  const treeFr = runeFr[i];
  runes[treeEn.name] = treeFr.name;
  treeEn.slots.forEach((slot, s) =>
    slot.runes.forEach((rune, r) => {
      runes[rune.name] = treeFr.slots[s].runes[r].name;
    })
  );
}

const summoners = {};
for (const [id, en] of Object.entries(sumEn.data)) {
  if (!SUMMONER_COMMUNITY[id]) continue;
  summoners[en.name] = { fr: sumFr.data[id].name, community: SUMMONER_COMMUNITY[id] };
}

const glossary = { version, keys: AZERTY, champions, items, runes, summoners };
writeFileSync(OUT, JSON.stringify(glossary, null, 1) + '\n');
console.log(
  `Data Dragon ${version}: ${Object.keys(champions).length} champions, ${Object.keys(items).length} items, ` +
    `${Object.keys(runes).length} runes, ${Object.keys(summoners).length} summoner spells → ${OUT}`
);
