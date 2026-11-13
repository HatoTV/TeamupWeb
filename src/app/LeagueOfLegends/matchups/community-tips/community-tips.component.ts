import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Champion } from '../../../core/data/champion-data.service';
import { RouteContextService } from '../../../core/route-context.service';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { CommunityTip, CommunityTipsFile, CommunityTipsService, VsTipsFile, sideTips, vsTips } from './community-tips.service';

/**
 * "Community tips": TeamUpp synthesis of player guides and videos, as a plain list (sources stay in the
 * data files for traceability and are not displayed). First the tips for the selected champion in this
 * matchup, then the « how to play against {opponent} » advice, valid whatever the champion played.
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

  /** undefined while loading, null when the pair has no file. */
  protected readonly file = signal<CommunityTipsFile | null | undefined>(undefined);
  /** « How to play against » file of the opponent: undefined while loading, null when there is none. */
  protected readonly vsFile = signal<VsTipsFile | null | undefined>(undefined);

  protected readonly lang = computed<'fr' | 'en'>(() => (this.ctx.lang() === 'fr' ? 'fr' : 'en'));

  /** Tips of the selected champion's perspective, in display order ([] when that side has too few). */
  protected readonly tips = computed<CommunityTip[]>(() => sideTips(this.file(), this.me().ddragonId, this.lang()));
  /** Tips against the opponent whatever the champion played. */
  protected readonly general = computed<CommunityTip[]>(() => vsTips(this.vsFile(), this.lang()));
  /** Only the other side is filled: say so and offer to reverse the selection. */
  protected readonly onlyOtherSide = computed(
    () => !this.tips().length && sideTips(this.file(), this.vs().ddragonId, this.lang()).length > 0
  );
  protected readonly loading = computed(() => this.file() === undefined || this.vsFile() === undefined);
  protected readonly needsRecheck = computed(
    () =>
      (this.tips().length > 0 && this.file()?.status === 'needsRecheck') ||
      (this.general().length > 0 && this.vsFile()?.status === 'needsRecheck')
  );

  constructor() {
    effect(() => {
      const a = this.me().ddragonId;
      const b = this.vs().ddragonId;
      untracked(() => {
        this.file.set(undefined);
        this.vsFile.set(undefined);
        // Ignore late answers for a previous selection.
        const current = () => this.me().ddragonId === a && this.vs().ddragonId === b;
        if (!a || !b) this.file.set(null);
        else void this.service.load(a, b).then((file) => current() && this.file.set(file));
        if (!b) this.vsFile.set(null);
        else void this.service.loadVs(b).then((file) => current() && this.vsFile.set(file));
      });
    });
  }
}
