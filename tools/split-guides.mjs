#!/usr/bin/env node
// Builds the LoL data consumed by the site from the source exports:
//   - public/assets/data/champions.json      light index (name, Data Dragon id, roles, difficulty, aliases)
//   - public/assets/data/matchups/<slug>.json one file per champion (guide author/rank/links + matchup tips)
// Also trims stray spaces in AllChampions.json (e.g. "Janna " -> "Janna").
//
// Usage: node tools/split-guides.mjs [--offline]
// The Data Dragon version and champion ids are fetched at build time; with --offline (or on network
// failure) the previously generated values are reused.

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SOURCE_DIR = join(ROOT, 'data', 'lol');
const OUT_DIR = join(ROOT, 'public', 'assets', 'data');
const INDEX_FILE = join(OUT_DIR, 'champions.json');
const MATCHUPS_DIR = join(OUT_DIR, 'matchups');
/** French matchup tips translated by TeamUpp (see tools/i18n-matchups/README.md). */
const I18N_DIR = join(ROOT, 'tools', 'i18n-matchups');

/** Matchup difficulty (for the selected champion) on the site's 1–5 scale. */
const LEVELS = { tiny: 1, minor: 2, even: 3, major: 4, extreme: 5 };
const ROLE_FIELDS = { isTop: 'top', isJungle: 'jungle', isMid: 'mid', isAdc: 'adc', isSupport: 'support' };

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const normalize = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const slugify = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const clean = (s) => (typeof s === 'string' ? s.trim() : s);
const isTrue = (v) => v === true || String(v).toLowerCase() === 'true';

async function fetchDataDragon() {
  if (process.argv.includes('--offline')) throw new Error('offline mode');
  const versions = await (await fetch('https://ddragon.leagueoflegends.com/api/versions.json')).json();
  const version = versions[0];
  const data = await (await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`)).json();
  return { version, champions: Object.values(data.data).map((c) => ({ id: c.id, name: c.name })) };
}

/**
 * TeamUpp French translations by id (`champion|enemy|0`). A translation is only used while its English source
 * is unchanged (source.json); edited tips fall back to English until they are translated and checked again.
 */
function loadTranslations() {
  const frFile = join(I18N_DIR, 'matchups-fr.json');
  const sourceFile = join(I18N_DIR, 'source.json');
  if (!existsSync(frFile) || !existsSync(sourceFile)) return new Map();
  const sourceText = new Map(readJson(sourceFile).map((e) => [e.id, e.text]));
  return new Map(readJson(frFile).map((e) => [e.id, { text: e.text, source: sourceText.get(e.id) }]));
}

async function main() {
  const translations = loadTranslations();
  let translated = 0;
  let stale = 0;
  // 1. Source champions (trim names in place).
  const championsFile = join(SOURCE_DIR, 'AllChampions.json');
  const rows = readJson(championsFile).map((row) => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, clean(v)])));
  writeFileSync(championsFile, JSON.stringify(rows, null, 4) + '\n');

  // 2. Data Dragon ids.
  let ddragon;
  try {
    ddragon = await fetchDataDragon();
  } catch (error) {
    if (!existsSync(INDEX_FILE)) throw new Error(`Data Dragon unavailable and no previous index: ${error.message}`);
    const previous = readJson(INDEX_FILE);
    ddragon = { version: previous.version, champions: previous.champions.map((c) => ({ id: c.ddragonId, name: c.name })) };
    console.warn(`Data Dragon unavailable (${error.message}); reusing version ${ddragon.version}`);
  }
  const ddragonByKey = new Map();
  for (const c of ddragon.champions) {
    ddragonByKey.set(normalize(c.id), c.id);
    ddragonByKey.set(normalize(c.name), c.id);
  }

  // 3. Guide metadata (author, rank, links) — the long guide texts are not shipped.
  const guides = readJson(join(SOURCE_DIR, 'AllGuides.json'));
  const guideByName = new Map(guides.map((g) => [normalize(g.champion), g]));

  // 4. Merge rows by champion name (duplicates only carry search aliases).
  const byName = new Map();
  for (const row of rows) {
    const name = row.championName;
    const entry =
      byName.get(name) ??
      byName
        .set(name, {
          name,
          fileKey: row.spellingForUrl.toLowerCase(),
          difficulty: Number(row.difficulty) || null,
          roles: new Set(),
          aliases: new Set(),
        })
        .get(name);
    for (const [field, role] of Object.entries(ROLE_FIELDS)) if (isTrue(row[field])) entry.roles.add(role);
    if (row.spellingFix && normalize(row.spellingFix) !== normalize(name)) entry.aliases.add(row.spellingFix);
  }

  rmSync(MATCHUPS_DIR, { recursive: true, force: true });
  mkdirSync(MATCHUPS_DIR, { recursive: true });

  const index = [];
  const unmatched = [];
  for (const entry of [...byName.values()].sort((a, b) => a.name.localeCompare(b.name))) {
    const slug = slugify(entry.name);
    const ddragonId = ddragonByKey.get(normalize(entry.name)) ?? ddragonByKey.get(normalize(entry.fileKey));
    if (!ddragonId) unmatched.push(entry.name);

    const sourceFile = join(SOURCE_DIR, `${entry.fileKey}.json`);
    let matchups = [];
    if (existsSync(sourceFile)) {
      const seen = new Set();
      for (const m of readJson(sourceFile)) {
        const level = LEVELS[String(m.difficulty).toLowerCase()];
        const enemy = clean(m.championName);
        if (!level || !enemy || seen.has(enemy)) continue;
        seen.add(enemy);
        const tips = clean(m.tips) ?? '';
        const translation = translations.get(`${slug}|${slugify(enemy)}|0`);
        let tipsFr = clean(m.tipsFr);
        if (translation && translation.source === tips) {
          tipsFr = translation.text;
          translated++;
        } else if (translation) {
          stale++;
        }
        matchups.push({ enemy, level, tips, ...(tipsFr ? { tipsFr } : {}) });
      }
    }

    const guide = guideByName.get(normalize(entry.name));
    if (matchups.length || guide) {
      writeFileSync(
        join(MATCHUPS_DIR, `${slug}.json`),
        JSON.stringify({
          champion: entry.name,
          author: clean(guide?.author) ?? null,
          rank: clean(guide?.rank) ?? null,
          urlGuide: clean(guide?.urlGuide) ?? null,
          urlGuideFr: clean(guide?.urlGuideFr) ?? null,
          matchups,
        })
      );
    }

    index.push({
      slug,
      name: entry.name,
      ddragonId: ddragonId ?? null,
      roles: [...entry.roles],
      difficulty: entry.difficulty,
      hasMatchups: matchups.length > 0,
      ...(entry.aliases.size ? { aliases: [...entry.aliases] } : {}),
    });
  }

  writeFileSync(INDEX_FILE, JSON.stringify({ version: ddragon.version, champions: index }) + '\n');

  const sizeKb = (f) => (readFileSync(f).length / 1024).toFixed(1);
  const files = readdirSync(MATCHUPS_DIR);
  console.log(`Data Dragon ${ddragon.version} · ${index.length} champions · index ${sizeKb(INDEX_FILE)} kB`);
  console.log(`${files.length} matchup files · ${index.filter((c) => !c.hasMatchups).length} champions without matchups`);
  console.log(`${translated} French matchup tips (TeamUpp)${stale ? ` · ${stale} outdated (source changed, shown in English)` : ''}`);
  if (unmatched.length) console.warn(`No Data Dragon id for: ${unmatched.join(', ')}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
