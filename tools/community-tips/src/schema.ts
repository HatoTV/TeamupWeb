import { z } from 'zod';

/** Maximum number of tips per perspective (one list, all categories). */
export const MAX_TIPS_PER_PERSPECTIVE = 8;
/** Maximum length of one tip, in words. */
export const MAX_TIP_WORDS = 30;
export const CATEGORIES = ['lane', 'mechanics', 'macro'] as const;
export type Category = (typeof CATEGORIES)[number];
export const categorySchema = z.enum(CATEGORIES);

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const championId = z.string().regex(/^[A-Za-z]+$/);

export const tipSchema = z.strictObject({
  text: z.string().trim().min(1),
  /** Number of pages actually read that give this idea. */
  sources: z.number().int().min(1),
  /** The mechanic behind the tip was checked against Data Dragon. */
  verifiedByGameData: z.boolean(),
  /** Not displayed: sets the consensus threshold and breaks ties (lane, then mechanics, then macro). */
  category: categorySchema,
});

const tipListSchema = z.array(tipSchema).max(MAX_TIPS_PER_PERSPECTIVE);
const perspectiveSchema = z.strictObject({ fr: tipListSchema, en: tipListSchema });

export const sourceSchema = z.strictObject({
  title: z.string().trim().min(1),
  site: z.string().trim().min(1),
  url: z.url({ protocol: /^https?$/ }),
  consultedAt: isoDate,
  /** Video sources: channel, upload date and the passages used (m:ss or h:mm:ss). */
  channel: z.string().trim().min(1).optional(),
  publishedAt: isoDate.optional(),
  timestamps: z.array(z.string().regex(/^(\d+:)?\d{1,2}:\d{2}$/)).min(1).optional(),
});

export const statusSchema = z.enum(['ok', 'insufficientSources', 'needsRecheck']);

/** One file per champion pair: `{A}__{B}.json`, Data Dragon ids in alphabetical order. */
export const communityTipsSchema = z
  .strictObject({
    pair: z.tuple([championId, championId]),
    researchedAt: isoDate,
    gameVersion: z.string().regex(/^\d+\.\d+$/),
    /** Fingerprint of the passive and the 4 spells (names, descriptions, cooldowns) when researched. */
    abilityHash: z.record(championId, z.string().regex(/^[0-9a-f]{64}$/)),
    status: statusSchema,
    perspectives: z.record(championId, perspectiveSchema),
    sources: z.array(sourceSchema),
  })
  .superRefine((file, ctx) => {
    const [a, b] = file.pair;
    if (!(a < b)) ctx.addIssue({ code: 'custom', path: ['pair'], message: 'pair must be two distinct ids in alphabetical order' });
    for (const key of ['abilityHash', 'perspectives'] as const) {
      const ids = Object.keys(file[key]).sort();
      if (ids.join() !== [a, b].join()) ctx.addIssue({ code: 'custom', path: [key], message: `${key} must have exactly the keys ${a}, ${b}` });
    }
  });

export type CommunityTips = z.infer<typeof communityTipsSchema>;
export type Tip = z.infer<typeof tipSchema>;

/** Site index: which pairs have a file, and their status. */
export const indexSchema = z.strictObject({
  updatedAt: isoDate,
  pairs: z.record(z.string().regex(/^[A-Za-z]+__[A-Za-z]+$/), statusSchema),
});

/** Private research notes kept next to the tools (never published). */
export const notesSchema = z.looseObject({
  searches: z.number().int().min(0).optional(),
  pagesRead: z.number().int().min(0).optional(),
  sourceSentences: z.array(z.string()).default([]),
});

export const pairKey = (a: string, b: string): string => [a, b].sort().join('__');

/** Display order: sources read (desc), then verified in game data first, then lane, mechanics, macro. */
export function compareTips(a: Tip, b: Tip): number {
  return (
    b.sources - a.sources ||
    Number(b.verifiedByGameData) - Number(a.verifiedByGameData) ||
    CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category)
  );
}
