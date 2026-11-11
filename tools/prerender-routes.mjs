#!/usr/bin/env node
// Writes routes.txt (prerendered routes), public/sitemap.xml and public/robots.txt.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SITE = 'https://www.teamupp.app';
const LANGS = ['fr', 'en'];
const slugify = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const mechanics = JSON.parse(readFileSync(join(ROOT, 'public/assets/rlmecanics.json'), 'utf8'));
const paths = [
  '/home',
  '/lol/matchups',
  '/lol/picker',
  '/lol/game',
  '/lol/laning',
  '/lol/wavemanagement',
  '/lol/jungle',
  '/tft',
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
