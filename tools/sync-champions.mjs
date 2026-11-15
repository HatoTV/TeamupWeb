#!/usr/bin/env node
// Keeps the site's champion list in line with Data Dragon (run by .github/workflows/lol-stats.yml).
//   - adds every Data Dragon champion missing from data/lol/AllChampions.json, with the same fields as the others:
//     name, difficulty (Data Dragon info.difficulty 1–10 → site scale 1–5), roles;
//   - roles come from the build statistics (roles with at least 5 % of the champion's Emerald+ games) when the
//     published data is real and has enough games; otherwise from the Data Dragon tags, marked provisional
//     (`rolesSource: "ddragon-tags"`) and replaced by the statistics on a later run;
//   - regenerates the index, matchup files, prerendered routes and sitemap (tools/split-guides.mjs,
//     tools/prerender-routes.mjs). Icons and splash arts come from Data Dragon through the site's image loader;
//   - opens a GitHub issue « Nouveau champion : {nom}, fiche tips à produire » (tips stay a manual step).
// Writes `new_patch=true|false` to $GITHUB_OUTPUT (Data Dragon version different from the committed index).
//
// Usage: node tools/sync-champions.mjs [--dry-run]

import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SOURCE_FILE = join(ROOT, 'data', 'lol', 'AllChampions.json');
const INDEX_FILE = join(ROOT, 'public', 'assets', 'data', 'champions.json');
const BUILDS_DIR = join(ROOT, 'public', 'data', 'lol', 'builds');
const CDN = 'https://ddragon.leagueoflegends.com';
const DRY_RUN = process.argv.includes('--dry-run');

const ROLE_FIELDS = { top: 'isTop', jungle: 'isJungle', mid: 'isMid', adc: 'isAdc', support: 'isSupport' };
/** Usual lanes of a champion class (first Data Dragon tag), from the roles of the champions already listed. */
const TAG_ROLES = {
  Fighter: ['top', 'jungle'],
  Tank: ['top', 'support'],
  Mage: ['mid'],
  Assassin: ['mid', 'jungle'],
  Marksman: ['adc'],
  Support: ['support'],
};
const MIN_ROLE_SHARE = 0.05;
/** Games needed before the statistics replace provisional roles (same threshold as the small-sample warning). */
const MIN_GAMES_FOR_ROLES = 200;

const normalize = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const getJson = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} on ${url}`);
  return res.json();
};

/** Data Dragon `info.difficulty` (1–10) → site difficulty (1 very easy … 5 extreme). */
export const difficultyOf = (d) => Math.min(5, Math.max(1, Math.ceil(Number(d) / 2) || 3));
export const rolesFromTags = (tags) => TAG_ROLES[tags?.[0]] ?? ['mid'];
/** Roles with at least 5 % of the champion's games, most played first; null below MIN_GAMES_FOR_ROLES games. */
export function rolesFromStats(roles) {
  const total = (roles ?? []).reduce((n, r) => n + r.games, 0);
  if (total < MIN_GAMES_FOR_ROLES) return null;
  return roles
    .filter((r) => r.games / total >= MIN_ROLE_SHARE)
    .sort((a, b) => b.games - a.games)
    .map((r) => r.role);
}

/** Emerald+ roles of the latest published patch, by champion key; empty for sample data. */
function loadStats() {
  const metaFile = join(BUILDS_DIR, 'meta.json');
  if (!existsSync(metaFile)) return new Map();
  const meta = readJson(metaFile);
  if (meta.sample) return new Map();
  const indexFile = join(BUILDS_DIR, meta.latest, 'emerald_plus', 'index.json');
  if (!existsSync(indexFile)) return new Map();
  return new Map(readJson(indexFile).champions.map((c) => [String(c.champion), c.roles]));
}

const setRoles = (row, roles) => {
  for (const [role, field] of Object.entries(ROLE_FIELDS)) row[field] = roles.includes(role) ? 'True' : null;
};

async function openIssue(name, version, roles, provisional) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  const title = `Nouveau champion : ${name}, fiche tips à produire`;
  if (!token || !repo || DRY_RUN) {
    console.log(`(issue « ${title} » not opened: ${DRY_RUN ? 'dry run' : 'no GITHUB_TOKEN / GITHUB_REPOSITORY'})`);
    return;
  }
  const api = `https://api.github.com/repos/${repo}/issues`;
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  const existing = await (await fetch(`${api}?state=all&per_page=100`, { headers })).json();
  if (Array.isArray(existing) && existing.some((i) => i.title === title)) return;
  const body = [
    `Data Dragon ${version} : **${name}** a été ajouté automatiquement au site (Picker, Matchups, recherche, pages Builds, sitemap).`,
    '',
    `Rôles : ${roles.join(', ')}${provisional ? ' (provisoires, tags Data Dragon ; remplacés par les statistiques dès 200 parties)' : ' (statistiques Builds)'}.`,
    '',
    '**À faire dans une session Claude Code** (méthode : `tools/community-tips/README.md`, `channels.json`, `sites.json`)',
    `- [ ] Fiche « Comment jouer contre ${name} » (\`vs/\`) : vidéos d'abord, web en complément, 2 sources par tip (1 si vérifié dans Data Dragon), FR + EN, \`npm run tips:check\``,
    `- [ ] Fiche « Tips pour jouer ${name} » (\`play/\`)`,
    '- [ ] Sinon, statut `insufficientSources` (rien d’inventé)',
  ].join('\n');
  const res = await fetch(api, { method: 'POST', headers, body: JSON.stringify({ title, body }) });
  if (!res.ok) throw new Error(`GitHub issue: ${res.status} ${await res.text()}`);
  console.log(`Issue opened: ${title}`);
}

async function main() {
  const version = (await getJson(`${CDN}/api/versions.json`))[0];
  const ddragon = (await getJson(`${CDN}/cdn/${version}/data/en_US/champion.json`)).data;
  const rows = readJson(SOURCE_FILE);
  const index = existsSync(INDEX_FILE) ? readJson(INDEX_FILE) : { version: null, champions: [] };
  const newPatch = index.version !== version;
  const stats = loadStats();

  const known = new Set();
  for (const row of rows) for (const k of [row.championName, row.spellingForUrl, row.spellingFix]) known.add(normalize(k));
  for (const c of index.champions) if (c.ddragonId) known.add(normalize(c.ddragonId));

  const added = [];
  for (const champion of Object.values(ddragon).sort((a, b) => a.name.localeCompare(b.name))) {
    if (known.has(normalize(champion.id)) || known.has(normalize(champion.name))) continue;
    const statRoles = rolesFromStats(stats.get(champion.key));
    const roles = statRoles ?? rolesFromTags(champion.tags);
    const row = {
      championName: champion.name.trim(),
      difficulty: String(difficultyOf(champion.info?.difficulty)),
      iconImg: null,
      isAdc: null,
      isJungle: null,
      isMid: null,
      isSupport: null,
      isTop: null,
      spellingFix: champion.name.trim(),
      spellingForUrl: champion.id,
      splashImg: null,
      rolesSource: statRoles ? 'stats' : 'ddragon-tags',
    };
    setRoles(row, roles);
    rows.push(row);
    added.push({ id: champion.id, name: row.championName, roles, provisional: !statRoles });
  }

  // Provisional roles → statistics once there are enough real games.
  const byKey = new Map(Object.values(ddragon).map((c) => [normalize(c.id), c.key]));
  const updated = [];
  for (const row of rows) {
    if (row.rolesSource !== 'ddragon-tags' || added.some((a) => a.name === row.championName)) continue;
    const roles = rolesFromStats(stats.get(byKey.get(normalize(row.spellingForUrl))));
    if (!roles?.length) continue;
    setRoles(row, roles);
    row.rolesSource = 'stats';
    updated.push(`${row.championName} (${roles.join(', ')})`);
  }

  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `new_patch=${newPatch}\n`);
  console.log(`Data Dragon ${version}${newPatch ? ` (new patch, index was ${index.version})` : ''}`);
  console.log(added.length ? `New champions: ${added.map((a) => `${a.name} (${a.roles.join(', ')}${a.provisional ? ', provisional' : ''})`).join('; ')}` : 'No new champion.');
  if (updated.length) console.log(`Roles from the statistics: ${updated.join('; ')}`);
  if (DRY_RUN || (!added.length && !updated.length && !newPatch)) return;

  writeFileSync(SOURCE_FILE, JSON.stringify(rows, null, 4) + '\n');
  for (const script of ['split-guides.mjs', 'prerender-routes.mjs']) execFileSync(process.execPath, [join(ROOT, 'tools', script)], { stdio: 'inherit' });
  // No issue when the tips were already produced (e.g. researched before the champion reached the site).
  const vsFile = join(ROOT, 'public', 'assets', 'data', 'community-tips', 'vs', 'index.json');
  const vsDone = existsSync(vsFile) ? readJson(vsFile).champions ?? {} : {};
  for (const a of added) if (!vsDone[a.id]) await openIssue(a.name, version, a.roles, a.provisional);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
