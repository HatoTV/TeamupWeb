import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Champion } from '../../../core/data/champion-data.service';
import { RouteContextService } from '../../../core/route-context.service';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { CommunityTip, CommunityTipsFile, CommunityTipsService, VsTipsFile, formatSourceDate, sideTips, vsTips } from './community-tips.service';

/** Consensus indicator: 5 dots. */
const DOTS = [1, 2, 3, 4, 5];

/**
 * "Community tips": TeamUpp synthesis of player guides and discussions for the pair, seen from
 * the selected champion. One list, most cited first (8 tips at most).
 * When the selected side has too few tips, the « how to play against {opponent} » file replaces it;
 * when it has its own, that file stays one click away. `mode="vs"` shows the file alone (Builds counters tab).
 */
@Component({
  selector: 'app-community-tips',
  standalone: true,
  imports: [NgTemplateOutlet, TranslateModule, IconComponent],
  templateUrl: './community-tips.component.html',
  styleUrl: './community-tips.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityTipsComponent {
  private readonly ctx = inject(RouteContextService);
  private readonly service = inject(CommunityTipsService);

  readonly me = input<Champion | null>(null);
  readonly vs = input.required<Champion>();
  /** `pair`: matchup tips (needs `me`); `vs`: only the « how to play against {vs} » file, hidden when there is none. */
  readonly mode = input<'pair' | 'vs'>('pair');
  readonly reverse = output<void>();

  protected readonly dots = DOTS;

  /** undefined while loading, null when the pair has no file. */
  protected readonly file = signal<CommunityTipsFile | null | undefined>(undefined);
  /** « How to play against » file of the opponent: undefined while loading, null when there is none. */
  protected readonly vsFile = signal<VsTipsFile | null | undefined>(undefined);

  protected readonly lang = computed<'fr' | 'en'>(() => (this.ctx.lang() === 'fr' ? 'fr' : 'en'));

  /** Tips of the selected champion's perspective, in display order ([] when that side has too few). */
  protected readonly tips = computed<CommunityTip[]>(() => sideTips(this.file(), this.me()?.ddragonId, this.lang()));
  /** Tips against the opponent whatever the champion played. */
  protected readonly general = computed<CommunityTip[]>(() => vsTips(this.vsFile(), this.lang()));
  /** The general file replaces the pair tips (too few for the selected side, or `mode="vs"`). */
  protected readonly showGeneral = computed(() => (this.mode() === 'vs' || !this.tips().length) && this.general().length > 0);
  /** Only the other side is filled: say so and offer to reverse the selection. */
  protected readonly onlyOtherSide = computed(
    () => !this.tips().length && sideTips(this.file(), this.vs().ddragonId, this.lang()).length > 0
  );
  protected readonly loading = computed(() => (this.mode() === 'pair' && this.file() === undefined) || this.vsFile() === undefined);
  protected readonly needsRecheck = computed(() => (this.showGeneral() ? this.vsFile() : this.file())?.status === 'needsRecheck');
  protected readonly sources = computed(() => this.dated(this.file()?.sources ?? []));
  protected readonly generalSources = computed(() => this.dated(this.vsFile()?.sources ?? []));

  constructor() {
    effect(() => {
      const a = this.me()?.ddragonId;
      const b = this.vs().ddragonId;
      const pair = this.mode() === 'pair';
      untracked(() => {
        this.file.set(undefined);
        this.vsFile.set(undefined);
        // Ignore late answers for a previous selection.
        const current = () => this.me()?.ddragonId === a && this.vs().ddragonId === b;
        if (!pair || !a || !b) this.file.set(null);
        else void this.service.load(a, b).then((file) => current() && this.file.set(file));
        if (!b) this.vsFile.set(null);
        else void this.service.loadVs(b).then((file) => current() && this.vsFile.set(file));
      });
    });
  }

  private dated(sources: CommunityTipsFile['sources']) {
    return sources.map((s) => ({ ...s, date: formatSourceDate(s.consultedAt, this.lang()) }));
  }

  protected filled(tip: CommunityTip): number {
    return Math.min(tip.sources, DOTS.length);
  }
}
