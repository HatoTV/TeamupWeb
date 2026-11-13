import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { indexSchema, vsIndexSchema } from './schema.ts';

const root = (path: string): string => fileURLToPath(new URL(`../../../${path}`, import.meta.url));

export const DATA_DIR = root('public/assets/data/community-tips');
export const INDEX_FILE = `${DATA_DIR}/index.json`;
export const NOTES_DIR = root('tools/community-tips/notes');
export const PROGRESS_FILE = root('tools/community-tips/progress.json');
export const GLOSSARY_FILE = root('tools/i18n-matchups/glossary.json');
export const GLOSSARY_MD = root('tools/i18n-matchups/glossaire-lol-fr.md');
export const SITES_FILE = root('tools/community-tips/sites.json');
export const CHANNELS_FILE = root('tools/community-tips/channels.json');
/** Static Data Dragon data published for the site (one folder per version). */
export const STATIC_DIR = root('public/data/lol/static');
/** « How to play against {champion} » files, their notes and their resumable progress. */
export const VS_DIR = `${DATA_DIR}/vs`;
export const VS_INDEX_FILE = `${VS_DIR}/index.json`;
export const VS_NOTES_DIR = `${NOTES_DIR}/vs`;
export const VS_PROGRESS_FILE = root('tools/community-tips/progress-vs.json');
/** « Tips pour jouer {champion} » files (combos and mechanics tips, build page) and their notes. */
export const PLAY_DIR = `${DATA_DIR}/play`;
export const PLAY_INDEX_FILE = `${PLAY_DIR}/index.json`;
export const PLAY_NOTES_DIR = `${NOTES_DIR}/play`;

export const today = (): string => new Date().toISOString().slice(0, 10);

export function readIndex() {
  return existsSync(INDEX_FILE) ? indexSchema.parse(JSON.parse(readFileSync(INDEX_FILE, 'utf8'))) : { updatedAt: today(), pairs: {} };
}

export function readVsIndex() {
  return existsSync(VS_INDEX_FILE) ? vsIndexSchema.parse(JSON.parse(readFileSync(VS_INDEX_FILE, 'utf8'))) : { updatedAt: today(), champions: {} };
}

export interface Progress {
  done: string[];
  inProgress: string[];
  insufficientSources: string[];
}

export function readProgress(file = PROGRESS_FILE): Progress {
  return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as Progress) : { done: [], inProgress: [], insufficientSources: [] };
}
