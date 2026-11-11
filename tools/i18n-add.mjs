#!/usr/bin/env node
// Merge new translation keys into public/assets/i18n/{fr,en}.json without reformatting
// the rest of the file. Only top-level namespaces are rewritten (and only when touched).
//
// Usage: node tools/i18n-add.mjs <keys.json>
// keys.json: { "fr": { "NAV": { ... } }, "en": { "NAV": { ... } } }
// Existing leaf values are never overwritten (an error is raised on conflict).

import { readFileSync, writeFileSync } from 'node:fs';

const I18N_DIR = new URL('../public/assets/i18n/', import.meta.url);

/** Returns [start, end) of the value of a top-level key, or null. */
function findTopLevelValue(text, key) {
  let depth = 0;
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === '\\') i++;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      if (depth === 1) {
        const end = text.indexOf('"', i + 1);
        const name = text.slice(i + 1, end);
        const colon = text.indexOf(':', end);
        if (name === key && /^\s*$/.test(text.slice(end + 1, colon))) {
          let j = colon + 1;
          while (/\s/.test(text[j])) j++;
          return [j, matchValueEnd(text, j)];
        }
      }
      inString = true;
      continue;
    }
    if (ch === '{' || ch === '[') depth++;
    else if (ch === '}' || ch === ']') depth--;
  }
  return null;
}

function matchValueEnd(text, start) {
  if (text[start] !== '{') throw new Error('Only object namespaces can be merged');
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === '\\') i++;
      else if (ch === '"') inString = false;
    } else if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return i + 1;
  }
  throw new Error('Unbalanced JSON');
}

function deepMerge(target, source, path = '') {
  for (const [key, value] of Object.entries(source)) {
    const p = path ? `${path}.${key}` : key;
    if (value && typeof value === 'object') {
      if (target[key] !== undefined && typeof target[key] !== 'object') throw new Error(`Conflict at ${p}`);
      target[key] = deepMerge(target[key] ?? {}, value, p);
    } else if (target[key] !== undefined && target[key] !== value) {
      throw new Error(`Refusing to overwrite existing key ${p}`);
    } else {
      target[key] = value;
    }
  }
  return target;
}

function indent(json, spaces) {
  return json.replace(/\n/g, '\n' + ' '.repeat(spaces));
}

const additions = JSON.parse(readFileSync(process.argv[2], 'utf8'));
for (const [lang, namespaces] of Object.entries(additions)) {
  const file = new URL(`${lang}.json`, I18N_DIR);
  let text = readFileSync(file, 'utf8');
  const current = JSON.parse(text);
  for (const [ns, value] of Object.entries(namespaces)) {
    const merged = deepMerge(structuredClone(current[ns] ?? {}), value, ns);
    const serialized = indent(JSON.stringify(merged, null, 2), 2);
    const range = current[ns] === undefined ? null : findTopLevelValue(text, ns);
    if (range) {
      text = text.slice(0, range[0]) + serialized + text.slice(range[1]);
    } else {
      const close = text.lastIndexOf('}');
      const before = text.slice(0, close).replace(/\s*$/, '');
      text = `${before},\n  "${ns}": ${serialized}\n}\n`;
    }
    current[ns] = merged;
  }
  JSON.parse(text); // sanity check
  writeFileSync(file, text);
  console.log(`${lang}.json updated: ${Object.keys(namespaces).join(', ')}`);
}
