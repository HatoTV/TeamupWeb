import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { indexSchema } from './schema.ts';

const root = (path: string): string => fileURLToPath(new URL(`../../../${path}`, import.meta.url));

export const DATA_DIR = root('public/assets/data/community-tips');
export const INDEX_FILE = `${DATA_DIR}/index.json`;
export const NOTES_DIR = root('tools/community-tips/notes');
export const PROGRESS_FILE = root('tools/community-tips/progress.json');
export const GLOSSARY_FILE = root('tools/i18n-matchups/glossary.json');
export const GLOSSARY_MD = root('tools/i18n-matchups/glossaire-lol-fr.md');
export const SITES_FILE = root('tools/community-tips/sites.json');

export const today = (): string => new Date().toISOString().slice(0, 10);

export function readIndex() {
  return existsSync(INDEX_FILE) ? indexSchema.parse(JSON.parse(readFileSync(INDEX_FILE, 'utf8'))) : { updatedAt: today(), pairs: {} };
}

export interface Progress {
  done: string[];
  inProgress: string[];
  insufficientSources: string[];
}

export function readProgress(): Progress {
  return existsSync(PROGRESS_FILE)
    ? (JSON.parse(readFileSync(PROGRESS_FILE, 'utf8')) as Progress)
    : { done: [], inProgress: [], insufficientSources: [] };
}
