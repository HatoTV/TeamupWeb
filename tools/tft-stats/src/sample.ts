// Synthetic sample games (development without a TFT API key): made-up comps built from the static set data, played
// against each other with random placements. Published with `sample: true`: the site shows « sample data ».
// Never published to production: the real collection replaces these files.
import type { TftStatic, TraitStyle } from '../../../src/app/tft/logic/tft-types.ts';
import { computeSynergies, synergyLookup } from '../../../src/app/tft/logic/synergies.ts';
import { TIERS, type Tier } from './config.ts';
import type { BoardRecord } from './extract.ts';

/** Deterministic random numbers (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const API_STYLE: Record<TraitStyle, number> = { bronze: 1, silver: 2, gold: 3, prismatic: 4, unique: 3 };

interface Archetype {
  units: string[];
  carries: Array<{ unit: string; items: string[] }>;
  strength: number;
  popularity: number;
  level: number;
  reroll: boolean;
  /** Often played instead of a unit of the main version. */
  variant: { out: string; in: string };
}

export function sampleRecords(data: TftStatic, patch: string, matches: number, seed = 18): BoardRecord[] {
  const random = rng(seed);
  const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)]!;
  const lookup = synergyLookup(data);
  const champions = data.champions.filter((c) => !c.variantOf);
  const complete = data.items.filter((i) => i.kind === 'complete' && !/Tactician/i.test(i.id)).map((i) => i.id);
  const emblems = data.items.filter((i) => i.kind === 'emblem').map((i) => i.id);
  const traits = data.traits.filter((t) => t.breakpoints.length >= 2 && champions.filter((c) => c.traits.includes(t.id)).length >= 4);

  const archetypes: Archetype[] = traits.slice(0, 14).map((trait, k) => {
    const members = champions.filter((c) => c.traits.includes(trait.id)).sort((a, b) => b.cost - a.cost);
    const target = Math.min(members.length, trait.breakpoints[1]?.min ?? 4);
    const units = members.slice(0, target).map((c) => c.id);
    const level = k % 4 === 0 ? 9 : k % 4 === 3 ? 7 : 8;
    while (units.length < level) {
      const shared = champions.filter((c) => !units.includes(c.id) && c.traits.some((t) => units.some((u) => lookup.champion(u)!.traits.includes(t))));
      units.push(pick(shared.length ? shared : champions.filter((c) => !units.includes(c.id))).id);
    }
    const ranged = units.filter((u) => (lookup.champion(u) as (typeof champions)[number]).stats.range! >= 2);
    const main = ranged[0] ?? units[0]!;
    const second = units.find((u) => u !== main && ranged.includes(u)) ?? units.find((u) => u !== main)!;
    const tank = units.find((u) => (lookup.champion(u) as (typeof champions)[number]).stats.range! <= 1 && u !== main && u !== second) ?? units[units.length - 1]!;
    const items = (n: number) => Array.from({ length: n }, () => pick(complete));
    return {
      units,
      carries: [
        { unit: main, items: items(3) },
        { unit: second, items: k % 5 === 0 ? [...items(2), pick(emblems)] : items(3) },
        { unit: tank, items: items(3) },
      ],
      strength: (random() - 0.5) * 1.4,
      popularity: 0.5 + random() * 1.5,
      level,
      reroll: k % 4 === 3,
      variant: { out: units.find((u) => u !== main && u !== second && u !== tank)!, in: pick(champions.filter((c) => !units.includes(c.id) && c.cost >= 3)).id },
    };
  });
  const totalPopularity = archetypes.reduce((s, a) => s + a.popularity, 0);
  const chooseArchetype = () => {
    let r = random() * totalPopularity;
    for (const a of archetypes) if ((r -= a.popularity) <= 0) return a;
    return archetypes[archetypes.length - 1]!;
  };
  const tierWeights: Array<[Tier, number]> = [['PLATINUM', 0.35], ['EMERALD', 0.3], ['DIAMOND', 0.2], ['MASTER', 0.1], ['GRANDMASTER', 0.03], ['CHALLENGER', 0.02]];
  const chooseTier = (): Tier => {
    let r = random();
    for (const [t, w] of tierWeights) if ((r -= w) <= 0) return t;
    return TIERS[0];
  };

  const out: BoardRecord[] = [];
  for (let m = 0; m < matches; m++) {
    const queue = random() < 0.8 ? 'ranked' : 'double_up';
    const tier = chooseTier();
    const boards = Array.from({ length: 8 }, () => {
      const a = chooseArchetype();
      const units = [...a.units];
      if (random() < 0.3) units[units.indexOf(a.variant.out)] = a.variant.in;
      else if (random() < 0.15) units[Math.floor(random() * units.length)] = pick(champions.filter((c) => !units.includes(c.id))).id;
      const level = Math.max(5, Math.min(10, a.level + (random() < 0.2 ? -1 : random() < 0.1 ? 1 : 0)));
      const placed = units.slice(0, level).map((id): [string, number, string[]] => {
        const carry = a.carries.find((c) => c.unit === id);
        const stars = a.reroll && carry === a.carries[0] ? (random() < 0.7 ? 3 : 2) : random() < 0.75 ? 2 : 1;
        const items = carry ? carry.items.map((i) => (random() < 0.75 ? i : pick(complete))) : random() < 0.3 ? [pick(complete)] : [];
        return [id, stars, items];
      });
      const synergies = computeSynergies(
        placed.map(([champion, , items]) => ({ champion, items })),
        lookup
      );
      return {
        score: a.strength + (random() + random() + random() - 1.5) * 1.6,
        record: {
          m: `SAMPLE_${patch}_${m}`,
          q: queue,
          p: patch,
          t: tier,
          pl: 0,
          lv: level,
          u: placed,
          tr: synergies.map((s) => [s.trait, s.count, s.style ? API_STYLE[s.style] : 0] as [string, number, number]),
          a: [],
        } satisfies BoardRecord,
      };
    });
    boards.sort((x, y) => y.score - x.score).forEach((b, i) => (b.record.pl = i + 1));
    for (const b of boards) out.push(b.record);
  }
  return out;
}
