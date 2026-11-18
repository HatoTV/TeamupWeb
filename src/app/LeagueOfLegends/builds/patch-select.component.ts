import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Lang } from '../../core/site.config';
import { PatchOption, formatInt } from './build-utils';
import { ListboxSelect } from './listbox-select';

/** Patch dropdown (current patch and the previous one), with the games of each so the visitor sees which one is reliable. */
@Component({
  selector: 'app-patch-select',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './patch-select.component.html',
  styleUrls: ['./rank-select.component.scss', './patch-select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatchSelectComponent extends ListboxSelect<string> {
  readonly patches = input.required<readonly PatchOption[]>();
  readonly value = input.required<string>();
  readonly lang = input<Lang>('fr');
  readonly valueChange = output<string>();

  protected readonly ordered = computed(() => this.patches().map((o) => o.patch));

  protected games(n: number): string {
    return formatInt(n, this.lang());
  }

  protected emit(patch: string): void {
    this.valueChange.emit(patch);
  }
}
