#!/usr/bin/env node
// TFT static data of the active set, from CommunityDragon (`cdragon/tft/{fr_fr,en_us}.json`):
//   public/data/tft/static/set{N}/{fr,en}.json   champions, traits, items (names in the page language)
//   public/assets/img/tft/set{N}/{champions,traits,items}/{id}.webp   icons, downloaded once and cached
// Usage: node tools/tft-static/build.ts            (TFT_SET=18 by default; TFT_SET_MUTATOR=TFTSet18)
// Run it again at each patch (same workflow as the LoL static data).
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { cleanDescription, shortId, slugify, type AbilityVariable, type Lang } from './text.ts';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const CACHE = fileURLToPath(new URL('./.cache/', import.meta.url));
const SET = Number(process.env['TFT_SET'] ?? 18);
const MUTATOR = process.env['TFT_SET_MUTATOR'] ?? `TFTSet${SET}`;
const CDRAGON = 'https://raw.communitydragon.org/latest';
const OUT_DATA = join(ROOT, `public/data/tft/static/set${SET}`);
const OUT_IMG = join(ROOT, `public/assets/img/tft/set${SET}`);
const IMG_URL = `assets/img/tft/set${SET}`;
/** Icon sizes (px): enough for the largest display (2x) of each kind. */
const SIZES = { champions: 128, items: 64, traits: 48 } as const;

interface CdChampion {
  apiName: string;
  name: string;
  cost: number;
  traits: string[];
  tileIcon: string | null;
  squareIcon: string | null;
  ability: { name: string; desc: string | null; variables: AbilityVariable[] };
  stats: { hp: number | null; damage: number | null; armor: number | null; magicResist: number | null; attackSpeed: number | null; range: number | null; mana: number | null; initialMana: number | null };
}
interface CdTrait {
  apiName: string;
  name: string;
  icon: string;
  desc: string | null;
  effects: Array<{ minUnits: number | null; maxUnits: number | null; style: number }>;
}
interface CdItem {
  apiName: string;
  name: string;
  icon: string;
  desc: string | null;
  composition: string[];
  associatedTraits: string[];
}
interface CdFile {
  items: CdItem[];
  setData: Array<{ mutator: string; number: number; champions: CdChampion[]; traits: CdTrait[]; items: string[] }>;
}

/** CommunityDragon trait styles → tier name. 4 = unique trait (one unit). */
const STYLE: Record<number, TraitStyle> = { 1: 'bronze', 2: 'silver', 3: 'silver', 4: 'unique', 5: 'gold', 6: 'prismatic' };
type TraitStyle = 'bronze' | 'silver' | 'gold' | 'prismatic' | 'unique';
export type ItemKind = 'component' | 'complete' | 'emblem' | 'radiant' | 'artifact';

async function json<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return (await res.json()) as T;
}

/** `.tex` path of the game files → PNG URL on CommunityDragon. */
const texUrl = (path: string) => `${CDRAGON}/game/${path.toLowerCase().replace(/\.(tex|dds)$/, '.png')}`;

async function icon(path: string | null, kind: keyof typeof SIZES, id: string): Promise<string | null> {
  if (!path || path === 'None' || path.startsWith('{')) return null;
  const file = `${slugify(id)}.webp`;
  const out = join(OUT_IMG, kind, file);
  if (!existsSync(out)) {
    const cached = join(CACHE, kind, `${slugify(id)}.png`);
    if (!existsSync(cached)) {
      const res = await fetch(texUrl(path));
      if (!res.ok) {
        console.warn(`  icon missing (${res.status}): ${id} ${path}`);
        return null;
      }
      mkdirSync(dirname(cached), { recursive: true });
      writeFileSync(cached, Buffer.from(await res.arrayBuffer()));
    }
    mkdirSync(dirname(out), { recursive: true });
    await sharp(cached).resize({ width: SIZES[kind], height: SIZES[kind], fit: 'cover', withoutEnlargement: true }).webp({ quality: 82 }).toFile(out);
  }
  return `${IMG_URL}/${kind}/${file}`;
}

const [fr, en] = await Promise.all([json<CdFile>(`${CDRAGON}/cdragon/tft/fr_fr.json`), json<CdFile>(`${CDRAGON}/cdragon/tft/en_us.json`)]);
const version = (await json<{ version: string }>(`${CDRAGON}/content-metadata.json`).catch(() => ({ version: '' }))).version;
const setOf = (f: CdFile) => {
  const s = f.setData.find((d) => d.mutator === MUTATOR);
  if (!s) throw new Error(`${MUTATOR} not found in CommunityDragon (available: ${f.setData.map((d) => d.mutator).join(', ')})`);
  return s;
};
const sets: Record<Lang, ReturnType<typeof setOf>> = { fr: setOf(fr), en: setOf(en) };
const itemsById: Record<Lang, Map<string, CdItem>> = { fr: new Map(fr.items.map((i) => [i.apiName, i])), en: new Map(en.items.map((i) => [i.apiName, i])) };
const S = sets.en;

// ---------- champions ----------
// Playable units have traits and cost 1 to 5 (jungle monsters, anvils and chests have none).
const playable = S.champions.filter((c) => c.traits.length > 0 && c.cost >= 1 && c.cost <= 5);
const byName = new Map(playable.map((c) => [c.name, c]));
/** `Lux (Fae)` is a form of `Lux`: hidden from the lists, counted with it in the statistics. */
const variantOf = (c: CdChampion): string | undefined => {
  const m = /^(.+) \((.+)\)$/.exec(c.name);
  const base = m ? byName.get(m[1]!) : undefined;
  return base && base.apiName !== c.apiName ? base.apiName : undefined;
};

// ---------- traits ----------
const traits = S.traits.map((t) => {
  const seen = new Set<number>();
  const breakpoints = t.effects
    .filter((e) => typeof e.minUnits === 'number' && e.minUnits > 0)
    .sort((a, b) => a.minUnits! - b.minUnits!)
    .filter((e) => (seen.has(e.minUnits!) ? false : (seen.add(e.minUnits!), true)))
    .map((e) => ({ min: e.minUnits!, style: STYLE[e.style] ?? 'bronze' }));
  return { t, breakpoints };
});
// Champions list their traits by display name (English here): map them to the trait API names.
const traitIdByName = new Map(S.traits.map((t) => [t.name, t.apiName]));
const championTraits = (c: CdChampion) => c.traits.map((name) => traitIdByName.get(name)).filter((id): id is string => !!id);
const usedTraits = new Set(playable.flatMap(championTraits));

// ---------- items ----------
const setItems = S.items.map((id) => itemsById.en.get(id)).filter((i): i is CdItem => !!i);
const recipes = setItems.filter((i) => i.composition.length === 2);
const componentIds = new Set(recipes.flatMap((i) => i.composition));
const traitByName = new Map(traits.map(({ t }) => [t.name.toLowerCase(), t.apiName]));
const norm = (s: string) => s.toLowerCase().replace(/^(da|tft)\d*_/, '').replace(/18|_/g, '');
function emblemTrait(i: CdItem): string | undefined {
  if (!/Emblem/i.test(i.apiName) || /Phantom|Augment/i.test(i.apiName)) return undefined;
  const byItemName = traitByName.get(i.name.replace(/ Emblem$/i, '').toLowerCase());
  if (byItemName) return byItemName;
  const suffix = norm(i.apiName.replace(/.*Emblem/i, ''));
  return traits.find(({ t }) => norm(t.apiName) === suffix)?.t.apiName;
}
function kindOf(i: CdItem): ItemKind | null {
  if (componentIds.has(i.apiName) && i.composition.length === 0) return 'component';
  if (emblemTrait(i)) return 'emblem';
  if (/Radiant$/.test(i.apiName)) return 'radiant';
  if (/_Artifact_/i.test(i.apiName)) return 'artifact';
  if (i.composition.length === 2 && i.composition.every((c) => componentIds.has(c))) return 'complete';
  return null;
}
/** Same item under two spellings (`Tacticians Crown` / `Tactician's Crown`, `Tear Of The Goddess` / `of the`). */
const sameName = (a: string, b: string) => a.toLowerCase().replace(/[^a-z0-9]/g, '') === b.toLowerCase().replace(/[^a-z0-9]/g, '');
const nameKey = (i: CdItem) => i.name.toLowerCase().replace(/[^a-z0-9]/g, '');
const keptItems: Array<{ item: CdItem; kind: ItemKind }> = [];
const seenItem = new Set<string>();
for (const item of setItems) {
  const kind = kindOf(item);
  if (!kind) continue;
  // The set lists older copies of the classic items (`TFT_Item_*`); keep the set's own (`DA_*` in Set 18) and record the
  // copies as aliases so the match data finds them whichever id it uses.
  const key = `${kind}|${kind === 'emblem' ? emblemTrait(item) : nameKey(item)}`;
  if (seenItem.has(key)) continue;
  const preferred = setItems.find((o) => o !== item && kindOf(o) === kind && (kind === 'emblem' ? emblemTrait(o) === emblemTrait(item) : sameName(o.name, item.name)) && !o.apiName.startsWith('TFT'));
  const chosen = item.apiName.startsWith('TFT') && preferred ? preferred : item;
  seenItem.add(key);
  keptItems.push({ item: chosen, kind });
}
const aliasesOf = (kept: CdItem, kind: ItemKind) =>
  setItems.filter((o) => o.apiName !== kept.apiName && kindOf(o) === kind && (kind === 'emblem' ? emblemTrait(o) === emblemTrait(kept) : sameName(o.name, kept.name))).map((o) => o.apiName);

// ---------- short ids (team builder links): unique, stable across patches ----------
function shortIds(ids: string[]): Map<string, string> {
  const out = new Map<string, string>();
  const used = new Set<string>();
  for (const id of ids) {
    let salt = '';
    let s = shortId(id);
    while (used.has(s)) s = shortId(id, (salt += '#'));
    used.add(s);
    out.set(id, s);
  }
  return out;
}
const championShort = shortIds(playable.map((c) => c.apiName).sort());
const itemShort = shortIds(keptItems.map((k) => k.item.apiName).sort());

// ---------- icons ----------
console.log(`${MUTATOR}: ${playable.length} champions, ${traits.length} traits, ${keptItems.length} items. Icons…`);
const champIcons = new Map<string, string | null>();
for (const c of playable) champIcons.set(c.apiName, await icon(c.tileIcon ?? c.squareIcon, 'champions', c.apiName));
const traitIcons = new Map<string, string | null>();
for (const { t } of traits) if (usedTraits.has(t.apiName)) traitIcons.set(t.apiName, await icon(t.icon, 'traits', t.apiName));
const itemIcons = new Map<string, string | null>();
for (const { item } of keptItems) itemIcons.set(item.apiName, await icon(item.icon, 'items', item.apiName));

// ---------- output ----------
const usedSlugs = new Set<string>();
const uniqueSlug = (name: string) => {
  let slug = slugify(name);
  while (usedSlugs.has(slug)) slug += '-2';
  usedSlugs.add(slug);
  return slug;
};
const championSlug = new Map(playable.map((c) => [c.apiName, variantOf(c) ? slugify(c.name) : uniqueSlug(c.name)]));
usedSlugs.clear();
const itemSlug = new Map(keptItems.map(({ item }) => [item.apiName, uniqueSlug(item.name)]));
const round = (n: number | null, d = 2) => (n === null ? null : Math.round(n * 10 ** d) / 10 ** d);

for (const lang of ['fr', 'en'] as const) {
  const set = sets[lang];
  const champ = new Map(set.champions.map((c) => [c.apiName, c]));
  const trait = new Map(set.traits.map((t) => [t.apiName, t]));
  const data = {
    set: SET,
    mutator: MUTATOR,
    version,
    generatedAt: new Date().toISOString(),
    champions: playable.map((base) => {
      const c = champ.get(base.apiName) ?? base;
      return {
        id: base.apiName,
        short: championShort.get(base.apiName)!,
        slug: championSlug.get(base.apiName)!,
        name: c.name,
        cost: base.cost,
        traits: championTraits(base),
        ...(variantOf(base) ? { variantOf: variantOf(base) } : {}),
        icon: champIcons.get(base.apiName) ?? null,
        ability: {
          name: c.ability.name,
          desc: cleanDescription(c.ability.desc, c.ability.variables ?? [], lang),
          /** Values per star level are only given for a few champions: the others show bracketed labels. */
          hasValues: (c.ability.variables ?? []).length > 0,
        },
        stats: {
          hp: round(base.stats.hp, 0),
          damage: round(base.stats.damage, 0),
          armor: round(base.stats.armor, 0),
          magicResist: round(base.stats.magicResist, 0),
          attackSpeed: round(base.stats.attackSpeed),
          range: base.stats.range,
          mana: base.stats.mana,
          initialMana: base.stats.initialMana,
        },
      };
    }),
    traits: traits
      .filter(({ t }) => usedTraits.has(t.apiName))
      .map(({ t, breakpoints }) => ({
        id: t.apiName,
        name: trait.get(t.apiName)?.name ?? t.name,
        icon: traitIcons.get(t.apiName) ?? null,
        breakpoints,
      })),
    items: keptItems.map(({ item, kind }) => {
      const local = itemsById[lang].get(item.apiName) ?? item;
      const aliases = aliasesOf(item, kind);
      return {
        id: item.apiName,
        short: itemShort.get(item.apiName)!,
        slug: itemSlug.get(item.apiName)!,
        name: local.name,
        kind,
        icon: itemIcons.get(item.apiName) ?? null,
        ...(kind === 'complete' || kind === 'emblem' ? (item.composition.length === 2 ? { recipe: item.composition } : {}) : {}),
        ...(kind === 'emblem' ? { trait: emblemTrait(item) } : {}),
        ...(aliases.length ? { aliases } : {}),
      };
    }),
  };
  // Recipes may use components kept under another id (alias): point them to the kept one.
  const keptId = new Map<string, string>();
  for (const i of data.items) for (const a of [i.id, ...(i.aliases ?? [])]) keptId.set(a, i.id);
  for (const i of data.items) if ('recipe' in i && i.recipe) i.recipe = i.recipe.map((r) => keptId.get(r) ?? r);
  const missing = data.items.flatMap((i) => ('recipe' in i && i.recipe ? i.recipe.filter((r) => !keptId.has(r)) : []));
  if (missing.length) throw new Error(`Recipe components missing: ${[...new Set(missing)].join(', ')}`);

  mkdirSync(OUT_DATA, { recursive: true });
  writeFileSync(join(OUT_DATA, `${lang}.json`), JSON.stringify(data));
  const count = (k: ItemKind) => data.items.filter((i) => i.kind === k).length;
  console.log(
    `${lang}: ${data.champions.length} champions (${data.champions.filter((c) => !('variantOf' in c)).length} without forms), ${data.traits.length} traits, ` +
      `items: ${count('complete')} complete, ${count('emblem')} emblems, ${count('component')} components, ${count('radiant')} radiant, ${count('artifact')} artifacts`
  );
}

// Current set, read by the site and the statistics tools.
writeFileSync(join(ROOT, 'public/data/tft/static/current.json'), JSON.stringify({ set: SET, mutator: MUTATOR, version }) + '\n');
console.log(`Done. Data: ${OUT_DATA}`);
