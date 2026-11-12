import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Champion } from '../../../core/data/champion-data.service';
import { RouteContextService } from '../../../core/route-context.service';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { CommunityTip, CommunityTipsFile, CommunityTipsService, formatSourceDate, sideTips } from './community-tips.service';

/** Consensus indicator: 5 dots. */
const DOTS = [1, 2, 3, 4, 5];

/**
 * "Community tips": TeamUpp synthesis of player guides and discussions for the pair, seen from
 * the selected champion. One list, most cited first (8 tips at most).
 */
@Component({
  selector: 'app-community-tips',
  standalone: true,
  imports: [TranslateModule, IconComponent],
  templateUrl: './community-tips.component.html',
  styleUrl: './community-tips.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityTipsComponent {
  private readonly ctx = inject(RouteContextService);
  private readonly service = inject(CommunityTipsService);

  readonly me = input.required<Champion>();
  readonly vs = input.required<Champion>();
  readonly reverse = output<void>();

  protected readonly dots = DOTS;

  /** undefined while loading, null when the pair has no file. */
  protected readonly file = signal<CommunityTipsFile | null | undefined>(undefined);

  protected readonly lang = computed<'fr' | 'en'>(() => (this.ctx.lang() === 'fr' ? 'fr' : 'en'));

  /** Tips of the selected champion's perspective, in display order ([] when that side has too few). */
  protected readonly tips = computed<CommunityTip[]>(() => sideTips(this.file(), this.me().ddragonId, this.lang()));
  /** Only the other side is filled: say so and offer to reverse the selection. */
  protected readonly onlyOtherSide = computed(
    () => !this.tips().length && sideTips(this.file(), this.vs().ddragonId, this.lang()).length > 0
  );
  protected readonly needsRecheck = computed(() => this.file()?.status === 'needsRecheck');
  protected readonly sources = computed(() =>
    (this.file()?.sources ?? []).map((s) => ({ ...s, date: formatSourceDate(s.consultedAt, this.lang()) }))
  );

  constructor() {
    effect(() => {
      const a = this.me().ddragonId;
      const b = this.vs().ddragonId;
      untracked(() => {
        this.file.set(undefined);
        if (!a || !b) return this.file.set(null);
        void this.service.load(a, b).then((file) => {
          // Ignore late answers for a previous selection.
          if (this.me().ddragonId === a && this.vs().ddragonId === b) this.file.set(file);
        });
      });
    });
  }

  protected filled(tip: CommunityTip): number {
    return Math.min(tip.sources, DOTS.length);
  }
}
