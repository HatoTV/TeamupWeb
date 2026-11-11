import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Champion } from '../../../core/data/champion-data.service';
import { normalizeForSearch } from '../../../core/slug';
import { IconComponent } from '../icon/icon.component';

export interface ChampionOption {
  champion: Champion;
  icon: string;
}

let nextId = 0;

/**
 * Champion picker as an ARIA 1.2 combobox: type to filter, ↑/↓/Home/End to move,
 * Enter to choose, Escape to restore the current selection.
 */
@Component({
  selector: 'app-champion-combobox',
  standalone: true,
  imports: [TranslateModule, IconComponent],
  templateUrl: './champion-combobox.component.html',
  styleUrl: './champion-combobox.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': '"combo combo--" + side()' },
})
export class ChampionComboboxComponent {
  readonly options = input.required<ChampionOption[]>();
  readonly selected = input<ChampionOption | null>(null);
  /** Visible label (already translated). */
  readonly label = input.required<string>();
  readonly placeholder = input('');
  readonly side = input<'ally' | 'enemy'>('ally');
  readonly selectedChange = output<Champion>();

  protected readonly uid = `champion-combo-${nextId++}`;
  protected readonly query = signal('');
  protected readonly open = signal(false);
  protected readonly active = signal(0);

  private readonly inputRef = viewChild.required<ElementRef<HTMLInputElement>>('field');
  private readonly listRef = viewChild<ElementRef<HTMLElement>>('list');

  protected readonly filtered = computed(() => {
    const q = normalizeForSearch(this.query());
    const all = this.options();
    if (!q) return all;
    const starts: ChampionOption[] = [];
    const contains: ChampionOption[] = [];
    for (const option of all) {
      const names = [option.champion.name, ...(option.champion.aliases ?? [])].map(normalizeForSearch);
      if (names.some((n) => n.startsWith(q))) starts.push(option);
      else if (names.some((n) => n.includes(q))) contains.push(option);
    }
    return [...starts, ...contains];
  });

  protected readonly activeId = computed(() => {
    const option = this.filtered()[this.active()];
    return this.open() && option ? `${this.uid}-${option.champion.slug}` : null;
  });

  constructor() {
    // Reflect the external selection in the field.
    effect(() => {
      const selected = this.selected();
      untracked(() => this.query.set(selected?.champion.name ?? ''));
    });
  }

  protected onFocus(event: FocusEvent): void {
    (event.target as HTMLInputElement).select();
  }

  protected onInput(value: string): void {
    this.query.set(value);
    this.active.set(0);
    this.open.set(true);
  }

  protected toggle(): void {
    if (this.open()) {
      this.close();
    } else {
      this.query.set('');
      this.active.set(0);
      this.open.set(true);
      this.inputRef().nativeElement.focus();
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    const count = this.filtered().length;
    const move = (index: number) => {
      event.preventDefault();
      if (!this.open()) {
        this.open.set(true);
      }
      if (count) {
        this.active.set((index + count) % count);
        this.scrollActiveIntoView();
      }
    };
    switch (event.key) {
      case 'ArrowDown':
        if (event.altKey) {
          event.preventDefault();
          this.open.set(true);
        } else move(this.open() ? this.active() + 1 : this.active());
        break;
      case 'ArrowUp':
        move(this.active() - 1);
        break;
      case 'Home':
        if (this.open()) move(0);
        break;
      case 'End':
        if (this.open()) move(count - 1);
        break;
      case 'Enter': {
        const option = this.filtered()[this.active()];
        if (this.open() && option) {
          event.preventDefault();
          this.choose(option);
        }
        break;
      }
      case 'Escape':
        if (this.open()) {
          event.preventDefault();
          this.close();
        }
        break;
      case 'Tab':
        this.close();
        break;
    }
  }

  protected choose(option: ChampionOption): void {
    this.query.set(option.champion.name);
    this.open.set(false);
    this.selectedChange.emit(option.champion);
  }

  /** Closes the list and restores the current selection's name. */
  protected close(): void {
    this.open.set(false);
    this.query.set(this.selected()?.champion.name ?? '');
  }

  private scrollActiveIntoView(): void {
    queueMicrotask(() => {
      const id = this.activeId();
      if (id) this.listRef()?.nativeElement.querySelector(`#${CSS.escape(id)}`)?.scrollIntoView({ block: 'nearest' });
    });
  }
}
