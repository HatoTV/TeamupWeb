#!/usr/bin/env node
// The TFT pages use the design tokens only: no hard-coded colour (#hex, rgb(), hsl()) nor font family in their
// styles and templates. Game colours (cost, trait tiers) are tokens too (src/styles/_tokens.scss).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// New TFT components (the hub sidebar is the former LoL sidebar, unchanged in its colours).
const ROOTS = ['src/app/tft'];
const COLOR = /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/i;
const FONT = /font-family\s*:(?!\s*var\()|\bfont\s*:[^;]*\b(?:Archivo|Arial|Helvetica|sans-serif|serif|monospace)\b/i;
const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(scss|css|html|ts)$/.test(name) && !name.endsWith('.spec.ts')) files.push(p);
  }
};
ROOTS.forEach(walk);
const problems = [];
for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    // In TypeScript only inline styles count (lines inside a `styles:` template): keep it simple and check style-like lines.
    if (file.endsWith('.ts') && !/^\s*[a-z-]+\s*:\s*[^;]*;\s*$/.test(line)) return;
    if (COLOR.test(line) || FONT.test(line)) problems.push(`${file}:${i + 1}: ${line.trim()}`);
  });
}
if (problems.length) {
  console.error(`Hard-coded colours or fonts in the TFT pages (use the tokens):\n${problems.join('\n')}`);
  process.exit(1);
}
console.log(`TFT styles: ${files.length} files, tokens only.`);
