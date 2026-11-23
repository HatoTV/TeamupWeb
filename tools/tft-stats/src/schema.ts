import { z } from 'zod';

// Published files (see src/app/tft/logic/tft-types.ts, read by the site). Every file is validated before it is written.

const rate = z.number().min(0).max(1);
const placement = z.number().min(1).max(8);
const tier = z.enum(['S', 'A', 'B', 'C']);
const stats = { games: z.number().int().positive(), avg: placement, top4: rate, win: rate };
const compItem = z.object({ item: z.string(), share: rate, avg: placement });

export const compSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  trait: z.string(),
  carry: z.string(),
  ...stats,
  playRate: rate,
  tier,
  units: z.array(z.object({ id: z.string(), stars: z.number().int().min(1).max(3) })).min(1).max(10),
  carries: z.array(z.object({ unit: z.string(), items: z.array(compItem).max(3), alternatives: z.array(compItem).max(2) })).max(3),
  avgLevel: z.number().min(1).max(10),
  levelStyle: z.object({ kind: z.enum(['reroll', 'fast8', 'fast9', 'level']), level: z.number().int().min(1).max(10) }),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  variants: z.array(z.object({ out: z.string(), in: z.string(), level: z.number().int().min(1).max(10), games: z.number().int().positive(), avg: placement })).max(3),
});

export const statsFileSchema = z.object({
  set: z.number().int().positive(),
  patch: z.string().regex(/^\d+\.\d+$/),
  queue: z.enum(['ranked', 'double_up']),
  filter: z.enum(['platinum_plus', 'emerald_plus', 'diamond_plus', 'master_plus']),
  generatedAt: z.string(),
  matches: z.number().int().min(0),
  boards: z.number().int().min(0),
  minCompGames: z.number().int().positive(),
  sample: z.boolean().optional(),
  comps: z.array(compSchema),
  champions: z.array(
    z.object({
      id: z.string(),
      ...stats,
      playRate: rate,
      tier,
      items: z.array(z.object({ item: z.string(), ...stats, share: rate, delta: z.number(), tier })),
      trios: z.array(z.object({ items: z.array(z.string()).length(3), ...stats, tier })),
    })
  ),
  items: z.array(
    z.object({
      id: z.string(),
      ...stats,
      playRate: rate,
      tier,
      holders: z.array(z.object({ champion: z.string(), ...stats, delta: z.number(), tier })),
    })
  ),
});

export const metaSchema = z.object({
  set: z.number().int().positive(),
  latest: z.string(),
  patches: z.array(z.object({ patch: z.string(), updatedAt: z.string(), releasedAt: z.string().optional(), matches: z.record(z.string(), z.number().int().min(0)) })),
  queues: z.array(z.enum(['ranked', 'double_up'])),
  filters: z.array(z.enum(['platinum_plus', 'emerald_plus', 'diamond_plus', 'master_plus'])),
  sample: z.boolean().optional(),
});
