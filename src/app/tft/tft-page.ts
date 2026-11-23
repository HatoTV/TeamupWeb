import { Directive, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { formatInt, formatRate, type PatchOption } from '../LeagueOfLegends/builds/build-utils';
import { RouteContextService } from '../core/route-context.service';
import { Lang } from '../core/site.config';
import { TftQueue, TftRankFilter, TftStatsFile, TftStatsMeta, TftTier } from './logic/tft-types';
import { DEFAULT_RANK, TFT_RANKS, TftCatalog, TftDataService, defaultTftPatch, isTftQueue, isTftRank, resolveTftPatch } from './tft-data.service';

/** Average placement with two decimals: 4.123 → « 4,12 » (fr) / « 4.12 » (en). */
export function formatPlacement(value: number, lang: Lang): string {
  const n = value.toFixed(2);
  return lang === 'fr' ? n.replace('.', ',') : n;
}

/** Signed placement gap: −0.53 → « −0,53 », 0.2 → « +0,20 ». */
export function formatGap(value: number, lang: Lang): string {
  const n = Math.abs(value).toFixed(2);
  return `${value < 0 ? '−' : value > 0 ? '+' : ''}${lang === 'fr' ? n.replace('.', ',') : n}`;
}

/** Colour class of an average placement (lower is better). */
export function placementTone(avg: number): 'good' | 'neutral' | 'bad' {
  return avg <= 4.2 ? 'good' : avg >= 4.6 ? 'bad' : 'neutral';
}

export const TIER_ORDER: readonly TftTier[] = ['S', 'A', 'B', 'C'];

/**
 * Shared state of the TFT statistics pages: rank (`?rank=`), queue (`?queue=`) and patch (`?patch=`) in the URL, static
 * data in the page language, statistics file of the selection.
 */
@Directive()
export abstract class TftStatsPage {
  protected readonly ctx = inject(RouteContextService);
  protected readonly data = inject(TftDataService);
  protected readonly route = inject(ActivatedRoute);
  protected readonly router = inject(Router);

  protected readonly ranks = TFT_RANKS;
  protected readonly query = toSignal(this.route.queryParamMap);
  protected readonly rank = computed<TftRankFilter>(() => {
    const r = this.query()?.get('rank');
    return isTftRank(r) ? r : DEFAULT_RANK;
  });
  protected readonly queue = computed<TftQueue>(() => {
    const q = this.query()?.get('queue');
    return isTftQueue(q) ? q : 'ranked';
  });
  private readonly patchParam = computed(() => this.query()?.get('patch') ?? null);

  protected readonly meta = signal<TftStatsMeta | null | undefined>(undefined);
  protected readonly catalog = signal<TftCatalog | null>(null);
  protected readonly stats = signal<TftStatsFile | null>(null);
  protected readonly loading = signal(true);

  protected readonly patch = computed(() => resolveTftPatch(this.meta(), this.patchParam()));
  protected readonly patchOptions = computed<PatchOption[]>(() => {
    const meta = this.meta();
    if (!meta) return [];
    const fallback = defaultTftPatch(meta);
    return meta.patches.slice(0, 2).map((p) => ({
      patch: p.patch,
      kind: p.patch === meta.latest ? 'current' : 'previous',
      games: p.matches[`${this.queue()}|${this.rank()}`] ?? 0,
      fewData: p.patch === meta.latest && fallback !== meta.latest,
    }));
  });
  protected readonly sample = computed(() => !!this.meta()?.sample);
  protected readonly set = computed(() => this.catalog()?.data.set ?? this.meta()?.set ?? null);

  protected readonly fmtInt = (v: number) => formatInt(v, this.ctx.lang());
  protected readonly fmtRate = (v: number) => formatRate(v, this.ctx.lang());
  protected readonly fmtPlace = (v: number) => formatPlacement(v, this.ctx.lang());
  protected readonly fmtGap = (v: number) => formatGap(v, this.ctx.lang());
  protected readonly tone = placementTone;

  constructor() {
    effect(() => {
      const lang = this.ctx.lang();
      untracked(() => void this.data.catalog(lang).then((c) => this.catalog.set(c)));
    });
    void this.data.meta().then((m) => this.meta.set(m));
    effect(() => {
      const patch = this.patch();
      const queue = this.queue();
      const rank = this.rank();
      const meta = this.meta();
      untracked(() => void this.loadStats(meta, patch, queue, rank));
    });
  }

  private seq = 0;
  private async loadStats(meta: TftStatsMeta | null | undefined, patch: string | null, queue: TftQueue, rank: TftRankFilter): Promise<void> {
    if (meta === undefined) return;
    const seq = ++this.seq;
    this.loading.set(true);
    const file = patch ? await this.data.stats(patch, queue, rank) : null;
    if (seq !== this.seq) return;
    this.stats.set(file);
    this.loading.set(false);
  }

  /** Updates query parameters (defaults removed from the URL), without a new history entry. */
  protected setQuery(params: Params): void {
    const clean: Params = {};
    for (const [k, v] of Object.entries(params)) {
      const isDefault = (k === 'rank' && v === DEFAULT_RANK) || (k === 'queue' && v === 'ranked') || (k === 'patch' && v === defaultTftPatch(this.meta())) || v === '' || v === undefined;
      clean[k] = isDefault ? null : v;
    }
    void this.router.navigate([], { relativeTo: this.route, queryParams: clean, queryParamsHandling: 'merge', replaceUrl: true });
  }

  protected champIcon(id: string): string | null {
    return this.catalog()?.champion(id)?.icon ?? null;
  }
  protected champName(id: string): string {
    return this.catalog()?.champion(id)?.name ?? id;
  }
  protected champCost(id: string): number {
    return this.catalog()?.champion(id)?.cost ?? 1;
  }
  protected itemName(id: string): string {
    return this.catalog()?.item(id)?.name ?? id;
  }
  protected itemIcon(id: string): string | null {
    return this.catalog()?.item(id)?.icon ?? null;
  }
  protected traitName(id: string): string {
    return this.catalog()?.trait(id)?.name ?? id;
  }
}
