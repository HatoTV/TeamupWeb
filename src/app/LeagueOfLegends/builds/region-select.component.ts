import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ListboxSelect } from './listbox-select';

/** Short name and flag of each Riot platform; other platforms show their id and the globe. */
const REGIONS: Readonly<Record<string, { label: string; icon: string }>> = {
  EUW1: { label: 'EUW', icon: 'euw' },
  KR: { label: 'KR', icon: 'kr' },
  NA1: { label: 'NA', icon: 'na' },
};

/** Region filter dropdown with flags (`all` = every region). */
@Component({
  selector: 'app-region-select',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './region-select.component.html',
  styleUrl: './rank-select.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegionSelectComponent extends ListboxSelect<string> {
  readonly regions = input.required<readonly string[]>();
  readonly value = input.required<string>();
  readonly valueChange = output<string>();

  protected readonly ordered = computed(() => this.regions());

  protected icon(region: string): string {
    return `assets/img/regions/${REGIONS[region]?.icon ?? 'all'}.svg`;
  }

  /** Display name; `null` for `all` (translated in the template). */
  protected label(region: string): string | null {
    return region === 'all' ? null : (REGIONS[region]?.label ?? region);
  }

  protected emit(region: string): void {
    this.valueChange.emit(region);
  }
}
