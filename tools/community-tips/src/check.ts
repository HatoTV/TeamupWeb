// Checks every community tips file (pairs and « how to play against » files in vs/). Exit code 1 on any error.
//
// - zod schema (8 tips max per perspective), index.json in sync with the files;
// - display order: sources read (desc), verified in game data first, then lane / mechanics / macro;
// - consensus: lane / macro tips need 2 sources read, mechanics 2, or 1 when verified in Data Dragon;
//   an `ok` matchup lists at least 2 sources, none from a site blacklisted on its consultation date (sites.json)
//   or an excluded YouTube channel (channels.json);
// - FR / EN parity (same ideas, same order, same source counts and categories);
// - at most 30 words per tip, no QWERTY key in French, gender agreement of the glossary terms;
// - no item, rune or skill-order advice (glossary names + keywords);
// - no sentence copied from a recorded source;
// - one video backs 3 pairs at most, and 3 « how to play against » files at most;
// - vs/ files: same rules, one list of tips; anti-heal may be advised there without naming an item.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { agreementIssues, parseGenders } from './agreement.ts';
import { CHANNELS_FILE, DATA_DIR, STATIC_DIR, GLOSSARY_FILE, GLOSSARY_MD, NOTES_DIR, SITES_FILE, VS_DIR, VS_NOTES_DIR, readIndex, readVsIndex } from './paths.ts';
import { MAX_TIP_WORDS, communityTipsSchema, compareTips, notesSchema, pairKey, vsTipsSchema, type Tip } from './schema.ts';
import { qwertyRe, sharedRun, words } from './text.ts';

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
// Blacklisted sites: refused as a source when consulted on or after their `since` date.
const blacklist = Object.entries((JSON.parse(readFileSync(SITES_FILE, 'utf8')) as { blacklist?: Record<string, { since: string }> }).blacklist ?? {});
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

const byVersion = (a: string, b: string) => a.localeCompare(b, 'en', { numeric: true });
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Names shared with abilities (Janna's passive « Zéphyr ») or gameplay words (recall) are not build advice.
const notBuild = new Set(['Recall', 'Rappel']);
for (const c of Object.values(glossary.champions)) for (const a of [c.passive, ...c.abilities]) notBuild.add(a.en).add(a.fr);
// Champions newer than the glossary (e.g. Yunara's « Célérité des kanmei »): names from the static Data Dragon files.
for (const lang of ['en_US', 'fr_FR']) {
  const dir = `${STATIC_DIR}/${readdirSync(STATIC_DIR).sort(byVersion).at(-1)}/${lang}/champions`;
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir)) {
    const c = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')) as { passive: { name: string }; spells: { name: string }[] };
    for (const a of [c.passive, ...c.spells]) for (const name of a.name.split(/ \| |\//)) notBuild.add(name.trim());
  }
}
const buildNames = [...Object.entries(glossary.items), ...Object.entries(glossary.runes)]
  .flat()
  .filter((name) => name.length >= 4 && !notBuild.has(name));
// Ability names are removed before the item / rune check (« Volonté de fer » is not the rune « Volonté »).
const abilityNamesRe = new RegExp(`(?<![\\p{L}])(${[...notBuild].sort((a, b) => b.length - a.length).map(escape).join('|')})(?![\\p{L}])`, 'gu');
const buildNamesRe = new RegExp(`(?<![\\p{L}])(${[...new Set(buildNames)].map(escape).join('|')})(?![\\p{L}])`, 'u');
const buildWordsRe = /\b(runes?|items?|objets?|build|stuff|rush|max(er)?\s+(ton|ta|son|sa|your|his|her|the)?\s*[QWERAZ]\b|skill order|ordre des comp[ée]tences)\b/i;
const hostOf = (url: string) => new URL(url).hostname.replace(/^www\./, '');
const isBlacklisted = (url: string, consultedAt: string) =>
  blacklist.some(([site, { since }]) => (hostOf(url) === site || hostOf(url).endsWith(`.${site}`)) && consultedAt >= since);

/** Max files (pairs, or vs/ files) that one video may back. */
const MAX_FILES_PER_VIDEO = 3;
const videoId = (url: string) => url.match(/(?:v=|youtu\.be\/|shorts\/)([\w-]{11})/)?.[1];
// Anti-heal (Grievous Wounds) may be advised against a champion, without naming an item.
const antiHealRe = /anti-?heal|blessures graves|grievous wounds/i;

type Source = { url: string; consultedAt: string; channel?: string | undefined; title: string };

function readNotes(name: string, notesFile: string): string[] {
  if (!existsSync(notesFile)) {
    fail(name, 'missing research notes (copy check impossible)');
    return [];
  }
  return notesSchema.parse(JSON.parse(readFileSync(notesFile, 'utf8'))).sourceSentences;
}

function checkSources(name: string, sources: Source[], videoUses: Map<string, string[]>): void {
  const urls = sources.map((s) => s.url);
  if (new Set(urls).size !== urls.length) fail(name, 'duplicate source URL');
  for (const { url, consultedAt } of sources) if (isBlacklisted(url, consultedAt)) fail(name, `blacklisted source ${hostOf(url)} (sites.json)`);
  for (const { channel, title, url } of sources) {
    const id = videoId(url);
    if (id) videoUses.set(id, [...(videoUses.get(id) ?? []), name]);
    if (!channel) continue;
    if (isExcludedChannel(channel)) fail(name, `excluded channel "${channel}" (channels.json)`);
    const mustInclude = titleRules.get(channel.trim());
    if (mustInclude && !title.toLowerCase().includes(mustInclude)) fail(name, `"${channel}" only counts for "${mustInclude}" videos: "${title}"`);
  }
}

/** Checks one list of tips (FR + EN) and returns the number of tips. */
function checkTips(where: string, fr: Tip[], en: Tip[], sourceCount: number, sourceSentences: string[], vs = false): number {
  let count = 0;
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
      count++;
      if (i > 0 && compareTips(tips[i - 1]!, tip) > 0) fail(at, 'not in display order (sources, verified, category)');
      const minSources = tip.category === 'mechanics' && tip.verifiedByGameData ? 1 : 2;
      if (tip.sources < minSources) fail(at, `${tip.sources} source(s), ${minSources} required for ${tip.category}`);
      if (tip.sources > sourceCount) fail(at, `${tip.sources} sources but only ${sourceCount} listed`);
      if (words(tip.text).length > MAX_TIP_WORDS) fail(at, `${words(tip.text).length} words (max ${MAX_TIP_WORDS})`);
      if (lang === 'fr') {
        if (qwertyRe.test(tip.text.replace(/\bQSS\b/g, ''))) fail(at, `QWERTY key in French: "${tip.text}"`);
        for (const issue of agreementIssues(tip.text, genders)) fail(at, issue);
      }
      const text = tip.text.replace(abilityNamesRe, '');
      const item = text.match(buildNamesRe);
      if (item) fail(at, `item / rune name "${item[1]}"`);
      const keyword = (vs && antiHealRe.test(text) ? text.replace(/\b(objets?|items?)\b/gi, '') : text).match(buildWordsRe);
      if (keyword) fail(at, `build advice keyword "${keyword[0]}"`);
      if (sourceSentences.some((s) => sharedRun(tip.text, s))) fail(at, `copied from a source: "${tip.text}"`);
    });
  }
  return count;
}

function checkStatus(name: string, status: string, sourceCount: number, tipCount: number): void {
  if (status === 'ok') {
    if (sourceCount < 2) fail(name, `status ok with ${sourceCount} source(s), 2 required`);
    if (tipCount === 0) fail(name, 'status ok without any tip');
  }
  if (status === 'insufficientSources' && tipCount > 0) fail(name, 'insufficientSources must not contain tips');
}

function checkVideoUses(kind: string, uses: Map<string, string[]>): void {
  for (const [id, names] of uses) {
    if (names.length > MAX_FILES_PER_VIDEO) fail(kind, `video ${id} backs ${names.length} files (max ${MAX_FILES_PER_VIDEO}): ${names.join(', ')}`);
  }
}

// ---------- pairs ----------
const index = readIndex();
const files = existsSync(DATA_DIR) ? readdirSync(DATA_DIR).filter((f) => f.endsWith('.json') && f !== 'index.json') : [];
const seen = new Set<string>();
const pairVideos = new Map<string, string[]>();

for (const name of files) {
  const parsed = communityTipsSchema.safeParse(JSON.parse(readFileSync(`${DATA_DIR}/${name}`, 'utf8')));
  if (!parsed.success) {
    fail(name, `schema: ${parsed.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`);
    continue;
  }
  const file = parsed.data;
  const key = pairKey(...file.pair);
  seen.add(key);
  if (name !== `${key}.json`) fail(name, `file name must be ${key}.json`);
  if (index.pairs[key] !== file.status) fail(name, `index.json says ${index.pairs[key] ?? 'nothing'}, file says ${file.status}`);
  const sourceSentences = readNotes(name, `${NOTES_DIR}/${key}.notes.json`);
  checkSources(name, file.sources, pairVideos);
  let tipCount = 0;
  for (const [champion, { fr, en }] of Object.entries(file.perspectives)) {
    tipCount += checkTips(`${name} ${champion}`, fr, en, file.sources.length, sourceSentences);
  }
  checkStatus(name, file.status, file.sources.length, tipCount);
}
for (const key of Object.keys(index.pairs)) if (!seen.has(key)) fail('index.json', `${key} has no file`);
checkVideoUses('pairs', pairVideos);

// ---------- « how to play against » (vs/) ----------
const vsIndex = readVsIndex();
const vsFiles = existsSync(VS_DIR) ? readdirSync(VS_DIR).filter((f) => f.endsWith('.json') && f !== 'index.json') : [];
const vsSeen = new Set<string>();
const vsVideos = new Map<string, string[]>();

for (const name of vsFiles) {
  const where = `vs/${name}`;
  const parsed = vsTipsSchema.safeParse(JSON.parse(readFileSync(`${VS_DIR}/${name}`, 'utf8')));
  if (!parsed.success) {
    fail(where, `schema: ${parsed.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`);
    continue;
  }
  const file = parsed.data;
  vsSeen.add(file.champion);
  if (name !== `${file.champion}.json`) fail(where, `file name must be ${file.champion}.json`);
  if (vsIndex.champions[file.champion] !== file.status) fail(where, `vs/index.json says ${vsIndex.champions[file.champion] ?? 'nothing'}, file says ${file.status}`);
  const sourceSentences = readNotes(where, `${VS_NOTES_DIR}/${file.champion}.notes.json`);
  checkSources(where, file.sources, vsVideos);
  const tipCount = checkTips(where, file.tips.fr, file.tips.en, file.sources.length, sourceSentences, true);
  checkStatus(where, file.status, file.sources.length, tipCount);
}
for (const id of Object.keys(vsIndex.champions)) if (!vsSeen.has(id)) fail('vs/index.json', `${id} has no file`);
checkVideoUses('vs', vsVideos);

if (errors.length) {
  console.error(errors.join('\n'));
  console.error(`\n${errors.length} error(s) in ${files.length} pair file(s) and ${vsFiles.length} vs file(s)`);
  process.exit(1);
}
console.log(`community tips: ${files.length} pair file(s) and ${vsFiles.length} vs file(s) OK`);
