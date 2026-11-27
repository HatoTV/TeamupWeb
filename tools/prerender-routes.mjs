#!/usr/bin/env node
// Writes routes.txt (prerendered routes), public/sitemap.xml and public/robots.txt.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SITE = 'https://www.teamupp.eu';
const LANGS = ['fr', 'en'];
const slugify = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Matchup pages of a single champion, both directions (`/:me` and `/vs/:vs`).
const allChampions = JSON.parse(readFileSync(join(ROOT, 'public/assets/data/champions.json'), 'utf8')).champions;
const champions = allChampions.filter((c) => c.hasMatchups);
// « How to play against » advice (community tips `vs/`): the enemy page of a champion without author matchups shows it.
const vsIndex = JSON.parse(readFileSync(join(ROOT, 'public/assets/data/community-tips/vs/index.json'), 'utf8'));
const vsStatus = vsIndex.champions ?? vsIndex;
const vsOnly = allChampions.filter((c) => !c.hasMatchups && vsStatus[c.ddragonId] === 'ok');
// Champion build pages (tools/lol-stats output): every champion × role of the latest patch.
function buildPaths() {
  const dir = join(ROOT, 'public/data/lol/builds');
  try {
    const meta = JSON.parse(readFileSync(join(dir, 'meta.json'), 'utf8'));
    const latest = meta.patches.find((p) => p.patch === meta.latest) ?? meta.patches[0];
    const index = JSON.parse(readFileSync(join(dir, latest.patch, 'emerald_plus', 'index.json'), 'utf8'));
    const core = JSON.parse(readFileSync(join(ROOT, 'public/data/lol/static', latest.ddragonVersion, 'en_US', 'core.json'), 'utf8'));
    const slugByDdragon = new Map(champions.map((c) => [c.ddragonId, c.slug]));
    for (const c of allChampions) slugByDdragon.set(c.ddragonId, c.slug);
    return index.champions.flatMap((c) => {
      const slug = slugByDdragon.get(core.champions[c.champion]?.id);
      return slug ? c.roles.flatMap((r) => [`/lol/champions/${slug}/build/${r.role}`, `/lol/champions/${slug}/counters/${r.role}`]) : [];
    });
  } catch {
    return []; // no build data yet
  }
}

// TFT tools: champion and item pages of the current set (tools/tft-static output).
function tftPaths() {
  try {
    const { set } = JSON.parse(readFileSync(join(ROOT, 'public/data/tft/static/current.json'), 'utf8'));
    const data = JSON.parse(readFileSync(join(ROOT, `public/data/tft/static/set${set}/en.json`), 'utf8'));
    return [
      '/tft/compositions',
      '/tft/champions',
      ...data.champions.filter((c) => !c.variantOf).map((c) => `/tft/champions/${c.slug}`),
      '/tft/objets',
      ...data.items.filter((i) => ['complete', 'emblem', 'component'].includes(i.kind)).map((i) => `/tft/objets/${i.slug}`),
      '/tft/team-builder',
    ];
  } catch {
    return []; // no TFT static data yet
  }
}

const mechanics = JSON.parse(readFileSync(join(ROOT, 'public/assets/rlmecanics.json'), 'utf8'));
const paths = [
  '/home',
  '/lol/matchups',
  ...champions.flatMap((c) => [`/lol/matchups/${c.slug}`, `/lol/matchups/vs/${c.slug}`]),
  ...vsOnly.map((c) => `/lol/matchups/vs/${c.slug}`),
  '/lol/tier-list',
  '/lol/builds',
  ...buildPaths(),
  '/lol/picker',
  '/lol/game',
  '/lol/laning',
  '/lol/wavemanagement',
  '/lol/jungle',
  '/tft',
  ...tftPaths(),
  '/rocket/mecanics',
  ...mechanics.map((m) => `/rocket/mecanics/${slugify(m.name)}`),
  '/contact',
  '/cgu',
  '/privacy',
  '/mentions-legales',
];

const routes = LANGS.flatMap((lang) => paths.map((p) => `/${lang}${p}`));
writeFileSync(join(ROOT, 'routes.txt'), routes.join('\n') + '\n');

const today = new Date().toISOString().slice(0, 10);
const urls = paths
  .flatMap((p) =>
    LANGS.map(
      (lang) => `  <url>
    <loc>${SITE}/${lang}${p}</loc>
    <lastmod>${today}</lastmod>
${LANGS.map((alt) => `    <xhtml:link rel="alternate" hreflang="${alt}" href="${SITE}/${alt}${p}"/>`).join('\n')}
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/fr${p}"/>
  </url>`
    )
  )
  .join('\n');
writeFileSync(
  join(ROOT, 'public/sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`
);
writeFileSync(join(ROOT, 'public/robots.txt'), `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`${routes.length} prerendered routes, sitemap with ${routes.length} URLs`);
