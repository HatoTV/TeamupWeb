// Checks every community tips file. Exit code 1 on any error.
//
// - zod schema (8 tips max per perspective), index.json in sync with the files;
// - display order: sources read (desc), verified in game data first, then lane / mechanics / macro;
// - consensus: lane / macro tips need 2 sources read, mechanics 2, or 1 when verified in Data Dragon;
//   an `ok` matchup lists at least 2 sources, none from a blacklisted site (sites.json)
//   or an excluded YouTube channel (channels.json);
// - FR / EN parity (same ideas, same order, same source counts and categories);
// - at most 30 words per tip, no QWERTY key in French, gender agreement of the glossary terms;
// - no item, rune or skill-order advice (glossary names + keywords);
// - no sentence copied from a recorded source.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { agreementIssues, parseGenders } from './agreement.ts';
import { CHANNELS_FILE, DATA_DIR, GLOSSARY_FILE, GLOSSARY_MD, NOTES_DIR, SITES_FILE, readIndex } from './paths.ts';
import { MAX_TIP_WORDS, communityTipsSchema, compareTips, notesSchema, pairKey, type Tip } from './schema.ts';

/** Run of consecutive words shared with a source sentence that counts as copying. */
const COPY_RUN_WORDS = 8;

const errors: string[] = [];
const fail = (where: string, message: string) => errors.push(`${where}: ${message}`);

interface Named {
  en: string;
  fr: string;
}
const glossary = JSON.parse(readFileSync(GLOSSARY_FILE, 'utf8')) as {
  items: Record<string, string>;
  runes: Record<string, string>;
  champions: Record<string, { passive: Named; abilities: Named[] }>;
};
const genders = parseGenders(readFileSync(GLOSSARY_MD, 'utf8'));
if (genders.size === 0) fail('glossaire-lol-fr.md', 'gender table (section 8) not found');
const blacklist = Object.keys((JSON.parse(readFileSync(SITES_FILE, 'utf8')) as { blacklist?: Record<string, unknown> }).blacklist ?? {});
const channels = JSON.parse(readFileSync(CHANNELS_FILE, 'utf8')) as {
  guides?: Record<string, { titleMustInclude?: string }>;
  excluded?: Record<string, unknown>;
  excludedPatterns?: Record<string, unknown>;
};
const excludedChannels = new Set(Object.keys(channels.excluded ?? {}).map((c) => c.trim()));
const excludedPatterns = Object.keys(channels.excludedPatterns ?? {}).map((p) => new RegExp(p, 'i'));
const isExcludedChannel = (channel: string) => excludedChannels.has(channel.trim()) || excludedPatterns.some((re) => re.test(channel.trim()));
// Channels where only some videos count (e.g. Booshi: « PRO GUIDE » only).
const titleRules = new Map(
  Object.entries(channels.guides ?? {}).flatMap(([name, g]) => (g.titleMustInclude ? [[name.trim(), g.titleMustInclude.toLowerCase()] as const] : []))
);

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Names shared with abilities (Janna's passive « Zéphyr ») or gameplay words (recall) are not build advice.
const notBuild = new Set(['Recall', 'Rappel']);
for (const c of Object.values(glossary.champions)) for (const a of [c.passive, ...c.abilities]) notBuild.add(a.en).add(a.fr);
const buildNames = [...Object.entries(glossary.items), ...Object.entries(glossary.runes)]
  .flat()
  .filter((name) => name.length >= 4 && !notBuild.has(name));
// Ability names are removed before the item / rune check (« Volonté de fer » is not the rune « Volonté »).
const abilityNamesRe = new RegExp(`(?<![\\p{L}])(${[...notBuild].sort((a, b) => b.length - a.length).map(escape).join('|')})(?![\\p{L}])`, 'gu');
const buildNamesRe = new RegExp(`(?<![\\p{L}])(${[...new Set(buildNames)].map(escape).join('|')})(?![\\p{L}])`, 'u');
const buildWordsRe = /\b(runes?|items?|objets?|build|stuff|rush|max(er)?\s+(ton|ta|son|sa|your|his|her|the)?\s*[QWERAZ]\b|skill order|ordre des comp[ée]tences)\b/i;
const qwertyRe = /(?<![\p{L}\d])[QW](?![\p{L}\d])/u;

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean);
const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

function sharedRun(tip: string, source: string): boolean {
  if (normalize(tip) === normalize(source)) return true;
  const t = normalize(tip).split(' ');
  const s = ` ${normalize(source)} `;
  for (let i = 0; i + COPY_RUN_WORDS <= t.length; i++) {
    if (s.includes(` ${t.slice(i, i + COPY_RUN_WORDS).join(' ')} `)) return true;
  }
  return false;
}

const hostOf = (url: string) => new URL(url).hostname.replace(/^www\./, '');
const isBlacklisted = (url: string) => blacklist.some((site) => hostOf(url) === site || hostOf(url).endsWith(`.${site}`));

const index = readIndex();
const files = existsSync(DATA_DIR) ? readdirSync(DATA_DIR).filter((f) => f.endsWith('.json') && f !== 'index.json') : [];
const seen = new Set<string>();

for (const name of files) {
  const raw = JSON.parse(readFileSync(`${DATA_DIR}/${name}`, 'utf8'));
  const parsed = communityTipsSchema.safeParse(raw);
  if (!parsed.success) {
    fail(name, `schema: ${parsed.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`);
    continue;
  }
  const file = parsed.data;
  const key = pairKey(...file.pair);
  seen.add(key);
  if (name !== `${key}.json`) fail(name, `file name must be ${key}.json`);
  if (index.pairs[key] !== file.status) fail(name, `index.json says ${index.pairs[key] ?? 'nothing'}, file says ${file.status}`);

  const notesFile = `${NOTES_DIR}/${key}.notes.json`;
  const sourceSentences = existsSync(notesFile) ? notesSchema.parse(JSON.parse(readFileSync(notesFile, 'utf8'))).sourceSentences : [];
  if (!existsSync(notesFile)) fail(name, 'missing research notes (copy check impossible)');

  const urls = file.sources.map((s) => s.url);
  if (new Set(urls).size !== urls.length) fail(name, 'duplicate source URL');
  for (const url of urls) if (isBlacklisted(url)) fail(name, `blacklisted source ${hostOf(url)} (sites.json)`);
  for (const { channel, title } of file.sources) {
    if (!channel) continue;
    if (isExcludedChannel(channel)) fail(name, `excluded channel "${channel}" (channels.json)`);
    const mustInclude = titleRules.get(channel.trim());
    if (mustInclude && !title.toLowerCase().includes(mustInclude)) fail(name, `"${channel}" only counts for "${mustInclude}" videos: "${title}"`);
  }
  let tipCount = 0;

  for (const [champion, perspective] of Object.entries(file.perspectives)) {
    const { fr, en } = perspective;
    const where = `${name} ${champion}`;
    if (fr.length !== en.length) fail(where, `FR has ${fr.length} tips, EN ${en.length}`);
    fr.forEach((tip, i) => {
      const twin = en[i];
      if (twin && (twin.sources !== tip.sources || twin.verifiedByGameData !== tip.verifiedByGameData || twin.category !== tip.category)) {
        fail(`${where}[${i}]`, 'FR and EN differ in sources / verifiedByGameData / category');
      }
    });
    for (const [lang, tips] of [['fr', fr], ['en', en]] as const) {
      tips.forEach((tip: Tip, i) => {
        const at = `${where}.${lang}[${i}]`;
        tipCount++;
        if (i > 0 && compareTips(tips[i - 1]!, tip) > 0) fail(at, 'not in display order (sources, verified, category)');
        const minSources = tip.category === 'mechanics' && tip.verifiedByGameData ? 1 : 2;
        if (tip.sources < minSources) fail(at, `${tip.sources} source(s), ${minSources} required for ${tip.category}`);
        if (tip.sources > file.sources.length) fail(at, `${tip.sources} sources but only ${file.sources.length} listed`);
        if (words(tip.text).length > MAX_TIP_WORDS) fail(at, `${words(tip.text).length} words (max ${MAX_TIP_WORDS})`);
        if (lang === 'fr') {
          if (qwertyRe.test(tip.text.replace(/\bQSS\b/g, ''))) fail(at, `QWERTY key in French: "${tip.text}"`);
          for (const issue of agreementIssues(tip.text, genders)) fail(at, issue);
        }
        const item = tip.text.replace(abilityNamesRe, '').match(buildNamesRe);
        if (item) fail(at, `item / rune name "${item[1]}"`);
        const keyword = tip.text.match(buildWordsRe);
        if (keyword) fail(at, `build advice keyword "${keyword[0]}"`);
        if (sourceSentences.some((s) => sharedRun(tip.text, s))) fail(at, `copied from a source: "${tip.text}"`);
      });
    }
  }

  if (file.status === 'ok') {
    if (file.sources.length < 2) fail(name, `status ok with ${file.sources.length} source(s), 2 required`);
    if (tipCount === 0) fail(name, 'status ok without any tip');
  }
  if (file.status === 'insufficientSources' && tipCount > 0) fail(name, 'insufficientSources must not contain tips');
}

for (const key of Object.keys(index.pairs)) if (!seen.has(key)) fail('index.json', `${key} has no file`);

if (errors.length) {
  console.error(errors.join('\n'));
  console.error(`\n${errors.length} error(s) in ${files.length} file(s)`);
  process.exit(1);
}
console.log(`community tips: ${files.length} file(s) OK`);
