import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { ChampionDataService, ChampionMatchups } from '../../core/data/champion-data.service';
import { injectPageSeo } from '../../core/seo.service';
import { ChampionOption } from '../../shared/ui/champion-combobox/champion-combobox.component';
import { MatchupsDuelComponent } from './matchups-duel.component';
import { MatchupsEmptyComponent } from './matchups-empty.component';
import { MatchupsOneComponent } from './matchups-one.component';
import { injectMatchupNavigation, legacySelection } from './matchups-url';

const SEO_IMAGE = '/assets/img/site/matchup_bkg.webp';

export { rankId, splitTips } from './matchups-data';

type Mode = 'loading' | 'empty' | 'me' | 'vs' | 'duel';

/** Matchups page: picks the state (none / one / two champions) from the URL and loads the data. */
@Component({
  selector: 'app-matchups',
  standalone: true,
  imports: [MatchupsEmptyComponent, MatchupsOneComponent, MatchupsDuelComponent],
  template: `
    @switch (mode()) {
      @case ('empty') {
        <app-matchups-empty [options]="options()" />
      }
      @case ('me') {
        <app-matchups-one side="me" [owner]="me()!" [data]="meData()" [options]="options()" />
      }
      @case ('vs') {
        <app-matchups-one side="vs" [owner]="vs()!" [data]="vsData()" [options]="options()" />
      }
      @case ('duel') {
        <app-matchups-duel [me]="me()!" [vs]="vs()!" [meData]="meData()" [vsData]="vsData()" [options]="options()" />
      }
      @default {
        <div class="matchups-loading" aria-busy="true"></div>
      }
    }
  `,
  styles: [':host { display: block; } .matchups-loading { min-height: 520px; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatchupsComponent {
  private readonly data = inject(ChampionDataService);
  private readonly route = inject(ActivatedRoute);
  private readonly navigate = injectMatchupNavigation();

  private readonly params = toSignal(this.route.paramMap);
  private readonly query = toSignal(this.route.queryParamMap);

  protected readonly options = computed<ChampionOption[]>(() =>
    (this.data.index()?.champions ?? []).map((champion) => ({ champion, icon: this.data.iconUrl(champion) }))
  );
  protected readonly me = computed(() => this.optionFor(this.params()?.get('me')));
  protected readonly vs = computed(() => this.optionFor(this.params()?.get('vs')));

  /** Matchup files of the selected champions (undefined while loading, null when missing). */
  protected readonly meData = signal<ChampionMatchups | null | undefined>(undefined);
  protected readonly vsData = signal<ChampionMatchups | null | undefined>(undefined);

  protected readonly mode = computed<Mode>(() => {
    const wantsSelection = !!(this.params()?.get('me') || this.params()?.get('vs'));
    if (wantsSelection && !this.data.index()) return 'loading';
    const me = this.me();
    const vs = this.vs();
    if (me && vs) return 'duel';
    if (me) return 'me';
    if (vs) return 'vs';
    return 'empty';
  });

  constructor() {
    injectPageSeo(() => {
      const a = this.me()?.champion.name;
      const b = this.vs()?.champion.name;
      if (a && b) return { titleKey: 'SEO.MATCHUP_TITLE', descriptionKey: 'SEO.MATCHUP_DESC', params: { a, b }, image: SEO_IMAGE };
      if (a) return { titleKey: 'SEO.MATCHUPS_ME_TITLE', descriptionKey: 'SEO.MATCHUPS_ME_DESC', params: { a }, image: SEO_IMAGE };
      if (b) return { titleKey: 'SEO.MATCHUPS_VS_TITLE', descriptionKey: 'SEO.MATCHUPS_VS_DESC', params: { b }, image: SEO_IMAGE };
      return { titleKey: 'SEO.MATCHUPS_TITLE', descriptionKey: 'SEO.MATCHUPS_DESC', image: SEO_IMAGE };
    });
    void this.data.loadIndex().catch(() => undefined);

    // Old links (`?champion=janna&enemy=blitzcrank`, `?me=&vs=`) → path URLs.
    effect(() => {
      const query = this.query();
      const legacy = query ? legacySelection(query) : null;
      if (legacy) untracked(() => this.navigate(legacy, { replaceUrl: true }));
    });
    // Unknown champion in the URL: drop it once the index is known.
    effect(() => {
      const params = this.params();
      if (!this.data.index() || !params) return;
      const me = params.get('me');
      const vs = params.get('vs');
      if ((me && !this.me()) || (vs && !this.vs())) {
        untracked(() => this.navigate({ me: this.me()?.champion.slug ?? null, vs: this.vs()?.champion.slug ?? null }, { replaceUrl: true }));
      }
    });

    effect(() => {
      const slug = this.me()?.champion.slug;
      untracked(() => this.load(slug, this.meData, 'me'));
    });
    effect(() => {
      const slug = this.vs()?.champion.slug;
      untracked(() => this.load(slug, this.vsData, 'vs'));
    });
  }

  private optionFor(slug: string | null | undefined): ChampionOption | null {
    if (!slug) return null;
    return this.options().find((o) => o.champion.slug === slug) ?? null;
  }

  private load(slug: string | undefined, target: typeof this.meData, side: 'me' | 'vs'): void {
    target.set(undefined);
    if (!slug) return;
    void this.data.loadMatchups(slug).then((data) => {
      // Ignore late answers for a previous selection.
      if ((side === 'me' ? this.me() : this.vs())?.champion.slug === slug) target.set(data);
    });
  }
}
