// Prints a champion's passive and 4 abilities from the official League of Legends wiki (wiki.leagueoflegends.com),
// for the « Tips pour jouer » research: official FR / EN names (Data Dragon), description, cooldown, range and
// the wiki notes (terrain, cancels, interactions). Uses the MediaWiki API: the HTML pages sit behind a bot check.
//
//   node src/wiki-abilities.ts <championId> [--raw]
import { readdirSync, readFileSync } from 'node:fs';
import { STATIC_DIR } from './paths.ts';

const id = process.argv[2];
const raw = process.argv.includes('--raw');
if (!id) {
  console.error('usage: node src/wiki-abilities.ts <championId> [--raw]');
  process.exit(1);
}

const latest = readdirSync(STATIC_DIR)
  .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
  .at(-1)!;
type Static = { name: string; passive: { name: string }; spells: { name: string }[] };
const read = (lang: string) => JSON.parse(readFileSync(`${STATIC_DIR}/${latest}/${lang}/champions/${id}.json`, 'utf8')) as Static;
const en = read('en_US');
const fr = read('fr_FR');

const API = 'https://wiki.leagueoflegends.com/en-us/api.php';
const FIELDS = /^(name|description\d*|leveling\d*|cooldown|static|target range|range|effect radius|cast time|speed|width|notes)$/;

/** Light wikitext → text: keeps the shown label of templates and links. */
function clean(s: string): string {
  const known = /\{\{(?:tt|tip|ai|ais|ri|ci|cai|ii|sti|as|sbc|fd|pp|ap|st|nie|tip2)\|([^{}|]*)\|?([^{}]*)\}\}/g;
  let out = s.replace(/<ref[^>]*>.*?<\/ref>|<ref[^>]*\/>/gs, '');
  // Innermost templates first: resolve the known ones until stable, then drop one level of unknown ones.
  for (let i = 0; i < 8; i++) {
    let prev;
    do {
      prev = out;
      out = out.replace(known, (_, a: string, b: string) => (b && !b.includes('=') ? `${a} [${b.split('|')[0]}]` : a));
    } while (out !== prev);
    out = out.replace(/\{\{[^{}]*\}\}/g, '');
  }
  out = out.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1');
  return out.replace(/'''?/g, '').replace(/<br\s*\/?>/g, ' ').replace(/[ \t]+/g, ' ');
}

async function ability(slot: string): Promise<string> {
  const page = `Template:Data_${en.name.replace(/ /g, '_')}/${slot}`;
  const url = `${API}?action=parse&format=json&redirects=1&prop=wikitext&page=${encodeURIComponent(page)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'TeamUppResearch/1.0' } });
  if (!res.ok) return `${slot}: HTTP ${res.status} (${page})`;
  const json = (await res.json()) as { parse?: { wikitext: { '*': string } }; error?: { info: string } };
  if (!json.parse) return `${slot}: ${json.error?.info ?? 'not found'} (${page})`;
  const text = json.parse.wikitext['*'];
  if (raw) return text;
  const fields: string[] = [];
  for (const part of text.split(/\n\|(?=[\w ]+?\s*=)/)) {
    const m = part.match(/^([\w ]+?)\s*=\s*([\s\S]*)$/);
    if (m && FIELDS.test(m[1]!.trim()) && m[2]!.trim()) fields.push(`${m[1]!.trim()}: ${clean(m[2]!).trim()}`);
  }
  return fields.join('\n');
}

const slots = ['I', 'Q', 'W', 'E', 'R'];
const names = [en.passive, ...en.spells].map((a, i) => `${slots[i] === 'I' ? 'P' : slots[i]}  EN « ${a.name} » · FR « ${[fr.passive, ...fr.spells][i]!.name} »`);
console.log(`# ${en.name} (Data Dragon ${latest})\n${names.join('\n')}\n`);
for (const slot of slots) console.log(`## ${slot}\n${await ability(slot)}\n`);
console.log(`Source: https://wiki.leagueoflegends.com/en-us/${en.name.replace(/ /g, '_')}`);
