import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { BuildFilter, EXACT_FILTERS } from '../../core/data/build-data.service';
import { ListboxSelect } from './listbox-select';

/** Rank filter dropdown with emblems. */
@Component({
  selector: 'app-rank-select',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './rank-select.component.html',
  styleUrl: './rank-select.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RankSelectComponent extends ListboxSelect<BuildFilter> {
  readonly filters = input.required<readonly BuildFilter[]>();
  readonly value = input.required<BuildFilter>();
  readonly valueChange = output<BuildFilter>();

  protected readonly plus = computed(() => this.filters().filter((f) => !EXACT_FILTERS.includes(f)));
  protected readonly exact = computed(() => this.filters().filter((f) => EXACT_FILTERS.includes(f)));
  protected readonly ordered = computed(() => [...this.plus(), ...this.exact()]);

  protected emblem(filter: BuildFilter): string {
    return `assets/img/ranks/${filter.replace('_plus', '')}.webp`;
  }

  protected emit(filter: BuildFilter): void {
    this.valueChange.emit(filter);
  }
}
