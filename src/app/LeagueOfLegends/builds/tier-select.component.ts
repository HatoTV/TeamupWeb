import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { TierRank } from '../../core/data/build-data.service';
import { TIER_ORDER } from '../tier-list/tier-list-utils';
import { TierTileComponent } from '../tier-list/tier-tile.component';
import { ListboxSelect } from './listbox-select';

/** Tier filter dropdown, several tiers at once; `null` is « all tiers » (empty selection). */
@Component({
  selector: 'app-tier-select',
  standalone: true,
  imports: [TranslateModule, TierTileComponent],
  templateUrl: './tier-select.component.html',
  styleUrls: ['./rank-select.component.scss', './tier-select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TierSelectComponent extends ListboxSelect<TierRank | null> {
  readonly selected = input.required<readonly TierRank[]>();
  readonly selectedChange = output<TierRank[]>();

  /** Option focused when the list opens. */
  readonly value = computed(() => this.selected()[0] ?? null);
  protected readonly ordered = computed<ReadonlyArray<TierRank | null>>(() => [null, ...TIER_ORDER]);

  protected isOn(tier: TierRank | null): boolean {
    return tier ? this.selected().includes(tier) : !this.selected().length;
  }

  /** Toggles a tier and keeps the list open; « all tiers » clears the selection. */
  protected override select(tier: TierRank | null): void {
    this.emit(tier);
  }

  protected emit(tier: TierRank | null): void {
    const current = this.selected();
    const next = !tier ? [] : current.includes(tier) ? current.filter((t) => t !== tier) : [...current, tier];
    this.selectedChange.emit(TIER_ORDER.filter((t) => next.includes(t)));
  }
}
