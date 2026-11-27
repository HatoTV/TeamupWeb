#!/usr/bin/env node
// Checks the Angular build against the Workers static assets limits of the free plan before `wrangler deploy`
// (20,000 files, 25 MiB per file), and writes worker/asset-sizes.json (byte size of each video, for the Range
// answers of worker/range.js: asset responses have no Content-Length). Run after `ng build`, see
// `npm run build:cloudflare`.
import { existsSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = fileURLToPath(new URL('../dist/teamup-web/browser', import.meta.url));
const MAX_FILES = 20_000;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const VIDEO_DIRS = ['assets/lolVideos', 'assets/rlVideos'];
const SIZES_FILE = fileURLToPath(new URL('../worker/asset-sizes.json', import.meta.url));

if (!existsSync(join(DIR, 'index.csr.html'))) {
  console.error('index.csr.html missing: the Worker serves it for pages that are not prerendered.');
  process.exit(1);
}

const files = readdirSync(DIR, { recursive: true, withFileTypes: true }).filter((e) => e.isFile());
const tooLarge = files
  .map((e) => join(e.parentPath, e.name))
  .filter((path) => statSync(path).size > MAX_FILE_BYTES)
  .map((path) => relative(DIR, path));

if (files.length > MAX_FILES || tooLarge.length > 0) {
  if (files.length > MAX_FILES) console.error(`${files.length} files (limit ${MAX_FILES}).`);
  for (const path of tooLarge) console.error(`Over 25 MiB: ${path}`);
  process.exit(1);
}
const sizes = {};
for (const dir of VIDEO_DIRS) {
  for (const name of readdirSync(join(DIR, dir))) sizes[`/${dir}/${name}`] = statSync(join(DIR, dir, name)).size;
}
writeFileSync(SIZES_FILE, `${JSON.stringify(sizes, null, 2)}
`);
console.log(`Cloudflare assets ready: ${files.length} files, none over 25 MiB, ${Object.keys(sizes).length} video sizes.`);
