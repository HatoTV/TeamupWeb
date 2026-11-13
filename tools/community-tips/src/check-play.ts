// Checks the « Tips pour jouer {champion} » files (play/): combos and mechanics tips shown on the build page.
// Exit code 1 on any error.
//
// - zod schema, file name, play/index.json in sync, champion and summoner spells known to Data Dragon;
// - every combo and tip is backed by the official wiki / a patch note, or by 2 independent sources;
//   a combo also needs one player source (video or guide): it must be really played;
// - D / F keys name their summoner spell; at least 2 combos or tips per file;
// - short texts (combo: 2 sentences, 45 words; tip: 40 words), FR in AZERTY with glossary gender agreement;
// - no sentence copied from a recorded source (notes/play/{championId}.notes.json).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { agreementIssues, parseGenders } from './agreement.ts';
import { GLOSSARY_MD, PLAY_DIR, PLAY_INDEX_FILE, PLAY_NOTES_DIR, SITES_FILE, STATIC_DIR } from './paths.ts';
import { notesSchema, playIndexSchema, playTipsSchema, type PlayTips } from './schema.ts';
import { qwertyRe, sharedRun, words } from './text.ts';

const MAX_COMBO_WORDS = 45;
const MAX_COMBO_SENTENCES = 2;
const MAX_TIP_WORDS = 40;
const MIN_ENTRIES = 2;

const errors: string[] = [];
const fail = (where: string, message: string) => errors.push(`${where}: ${message}`);

const genders = parseGenders(readFileSync(GLOSSARY_MD, 'utf8'));
const blacklist = Object.keys((JSON.parse(readFileSync(SITES_FILE, 'utf8')) as { blacklist?: Record<string, unknown> }).blacklist ?? {});
const latest = readdirSync(STATIC_DIR)
  .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
  .at(-1)!;
const champions = new Set(readdirSync(`${STATIC_DIR}/${latest}/en_US/champions`).map((f) => f.replace(/\.json$/, '')));
const core = JSON.parse(readFileSync(`${STATIC_DIR}/${latest}/en_US/core.json`, 'utf8')) as { summoners: Record<string, { icon: string }> };
const summoners = new Set(Object.values(core.summoners).map((s) => s.icon.replace(/\.png$/, '')));

const hostOf = (url: string) => new URL(url).hostname.replace(/^www\./, '');
const sentences = (s: string) => s.split(/[.!?](?:\s|$)/).filter((p) => p.trim()).length;

function checkRefs(where: string, refs: number[], sources: PlayTips['sources']): void {
  const used = refs.map((i) => sources[i]);
  if (used.some((s) => !s)) {
    fail(where, `refs ${JSON.stringify(refs)} point outside sources (${sources.length})`);
    return;
  }
  if (used.some((s) => s!.type === 'wiki' || s!.type === 'patchnote')) return;
  const authors = new Set(used.map((s) => (s!.author ?? hostOf(s!.url)).toLowerCase()));
  if (authors.size < 2) fail(where, 'needs the official wiki / a patch note, or 2 independent sources');
}

function checkText(where: string, lang: 'fr' | 'en', text: string, sourceSentences: string[]): void {
  if (lang === 'fr') {
    if (qwertyRe.test(text.replace(/\bQSS\b/g, ''))) fail(where, `QWERTY key in French: "${text}"`);
    for (const issue of agreementIssues(text, genders)) fail(where, issue);
  } else if (/\((A|Z)\)/.test(text)) {
    fail(where, `AZERTY key in English: "${text}"`);
  }
  if (sourceSentences.some((s) => sharedRun(text, s))) fail(where, `copied from a source: "${text}"`);
}

const index = existsSync(PLAY_INDEX_FILE)
  ? playIndexSchema.parse(JSON.parse(readFileSync(PLAY_INDEX_FILE, 'utf8')))
  : { updatedAt: '', champions: {} as Record<string, string> };
const files = existsSync(PLAY_DIR) ? readdirSync(PLAY_DIR).filter((f) => f.endsWith('.json') && f !== 'index.json') : [];
const seen = new Set<string>();

for (const name of files) {
  const where = `play/${name}`;
  const parsed = playTipsSchema.safeParse(JSON.parse(readFileSync(`${PLAY_DIR}/${name}`, 'utf8')));
  if (!parsed.success) {
    fail(where, `schema: ${parsed.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`);
    continue;
  }
  const file = parsed.data;
  seen.add(file.champion);
  if (name !== `${file.champion}.json`) fail(where, `file name must be ${file.champion}.json`);
  if (!champions.has(file.champion)) fail(where, `unknown champion ${file.champion} (Data Dragon ${latest})`);
  if (index.champions[file.champion] !== file.patch) {
    fail(where, `play/index.json says ${index.champions[file.champion] ?? 'nothing'}, file says ${file.patch}`);
  }
  const entries = file.combos.length + file.tips.length;
  if (entries < MIN_ENTRIES) fail(where, `${entries} combo(s) and tip(s), ${MIN_ENTRIES} required`);

  const notesFile = `${PLAY_NOTES_DIR}/${file.champion}.notes.json`;
  let sourceSentences: string[] = [];
  if (existsSync(notesFile)) sourceSentences = notesSchema.parse(JSON.parse(readFileSync(notesFile, 'utf8'))).sourceSentences;
  else fail(where, 'missing research notes (copy check impossible)');

  file.sources.forEach((s, i) => {
    const host = hostOf(s.url);
    if (blacklist.some((site) => host === site || host.endsWith(`.${site}`))) fail(`${where} sources[${i}]`, `blacklisted site ${host}`);
  });

  file.combos.forEach((combo, i) => {
    const at = `${where} combos[${i}]`;
    checkRefs(at, combo.refs, file.sources);
    // A combo must be really played: at least one player source (video or guide) besides the wiki.
    if (!combo.refs.some((r) => file.sources[r]?.type === 'video' || file.sources[r]?.type === 'guide')) {
      fail(at, 'combo without a player source (video or guide)');
    }
    for (const key of ['D', 'F'] as const) {
      const spell = combo.summoners?.[key];
      if (combo.keys.includes(key) && !spell) fail(at, `key ${key} without its summoner spell`);
      if (!combo.keys.includes(key) && spell) fail(at, `summoner spell for ${key} but no ${key} key`);
      if (spell && !summoners.has(spell)) fail(at, `unknown summoner spell ${spell}`);
    }
    for (const lang of ['fr', 'en'] as const) {
      const desc = combo.desc[lang];
      if (words(combo.name[lang]).length > 6) fail(`${at}.name.${lang}`, 'name longer than 6 words');
      if (words(desc).length > MAX_COMBO_WORDS) fail(`${at}.desc.${lang}`, `${words(desc).length} words (max ${MAX_COMBO_WORDS})`);
      if (sentences(desc) > MAX_COMBO_SENTENCES) fail(`${at}.desc.${lang}`, `${sentences(desc)} sentences (max ${MAX_COMBO_SENTENCES})`);
      checkText(`${at}.name.${lang}`, lang, combo.name[lang], []);
      checkText(`${at}.desc.${lang}`, lang, desc, sourceSentences);
    }
  });

  file.tips.forEach((tip, i) => {
    const at = `${where} tips[${i}]`;
    checkRefs(at, tip.refs, file.sources);
    for (const lang of ['fr', 'en'] as const) {
      const text = tip.text[lang];
      if (words(text).length > MAX_TIP_WORDS) fail(`${at}.${lang}`, `${words(text).length} words (max ${MAX_TIP_WORDS})`);
      checkText(`${at}.${lang}`, lang, text, sourceSentences);
    }
  });
}
for (const id of Object.keys(index.champions)) if (!seen.has(id)) fail('play/index.json', `${id} has no file`);

if (errors.length) {
  console.error(errors.join('\n'));
  console.error(`\n${errors.length} error(s) in ${files.length} play file(s)`);
  process.exit(1);
}
console.log(`play tips: ${files.length} file(s) OK`);
