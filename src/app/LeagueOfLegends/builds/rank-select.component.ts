import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { BuildFilter, EXACT_FILTERS } from '../../core/data/build-data.service';
import { ListboxSelect } from './listbox-select';

/** Rank filter dropdown with emblems (LoL builds, TFT statistics: `labelPrefix` and `exactFilters` set the labels and groups). */
@Component({
  selector: 'app-rank-select',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './rank-select.component.html',
  styleUrl: './rank-select.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RankSelectComponent<T extends string = BuildFilter> extends ListboxSelect<T> {
  readonly filters = input.required<readonly T[]>();
  readonly value = input.required<T>();
  readonly valueChange = output<T>();
  /** Translation key prefix of the filter labels. */
  readonly labelPrefix = input('BUILDS.FILTERS.');
  /** Single-tier filters, shown in their own group. */
  readonly exactFilters = input<readonly string[]>(EXACT_FILTERS);

  protected readonly plus = computed(() => this.filters().filter((f) => !this.exactFilters().includes(f)));
  protected readonly exact = computed(() => this.filters().filter((f) => this.exactFilters().includes(f)));
  protected readonly ordered = computed(() => [...this.plus(), ...this.exact()]);

  protected emblem(filter: T): string {
    return `assets/img/ranks/${filter.replace('_plus', '')}.webp`;
  }

  protected emit(filter: T): void {
    this.valueChange.emit(filter);
  }
}
