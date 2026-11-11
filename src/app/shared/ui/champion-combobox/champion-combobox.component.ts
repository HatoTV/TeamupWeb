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
import { DifficultyBadgeComponent } from '../difficulty-badge.component';
import { IconComponent } from '../icon/icon.component';

export interface ChampionOption {
  champion: Champion;
  icon: string;
  /** Matchup difficulty shown as a badge in the suggestions (1–5). */
  level?: number;
}

let nextId = 0;
const INLINE_LIMIT = 40;

/**
 * Champion picker as an ARIA 1.2 combobox: type to filter, ↑/↓/Home/End to move,
 * Enter to choose, Escape to restore the current selection.
 */
@Component({
  selector: 'app-champion-combobox',
  standalone: true,
  imports: [TranslateModule, IconComponent, DifficultyBadgeComponent],
  templateUrl: './champion-combobox.component.html',
  styleUrl: './champion-combobox.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': '"combo combo--" + side()', '[class.combo--inline]': 'inline()', '[class.combo--search]': 'variant() === "search"' },
})
export class ChampionComboboxComponent {
  readonly options = input.required<ChampionOption[]>();
  readonly selected = input<ChampionOption | null>(null);
  /** Visible label (already translated). */
  readonly label = input.required<string>();
  readonly placeholder = input('');
  readonly side = input<'ally' | 'enemy'>('ally');
  /** `pill`: large selected champion chip; `search`: plain 50 px search field. */
  readonly variant = input<'pill' | 'search'>('pill');
  /** Keeps the suggestion list visible in the page flow (no popup). */
  readonly inline = input(false);
  /** Visually hides the label (it stays the accessible name). */
  readonly hideLabel = input(false);
  readonly selectedChange = output<Champion>();

  protected readonly uid = `champion-combo-${nextId++}`;
  protected readonly query = signal('');
  private readonly expanded = signal(false);
  protected readonly open = computed(() => this.inline() || this.expanded());
  protected readonly active = signal(0);

  private readonly inputRef = viewChild.required<ElementRef<HTMLInputElement>>('field');
  private readonly listRef = viewChild<ElementRef<HTMLElement>>('list');

  protected readonly filtered = computed(() => {
    const q = normalizeForSearch(this.query());
    const all = this.options();
    // Inline list with nothing typed: only the first suggestions (typing searches every champion).
    if (!q) return this.inline() ? all.slice(0, INLINE_LIMIT) : all;
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

  /** Moves the keyboard focus to the search field. */
  focus(): void {
    this.inputRef().nativeElement.focus();
  }

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
    this.expanded.set(true);
  }

  protected toggle(): void {
    if (this.open()) {
      this.close();
    } else {
      this.query.set('');
      this.active.set(0);
      this.expanded.set(true);
      this.inputRef().nativeElement.focus();
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    const count = this.filtered().length;
    const move = (index: number) => {
      event.preventDefault();
      if (!this.open()) {
        this.expanded.set(true);
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
          this.expanded.set(true);
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
    this.expanded.set(false);
    this.selectedChange.emit(option.champion);
  }

  /** Closes the list and restores the current selection's name. */
  protected close(): void {
    this.expanded.set(false);
    if (this.inline()) return;
    this.query.set(this.selected()?.champion.name ?? '');
  }

  private scrollActiveIntoView(): void {
    queueMicrotask(() => {
      const id = this.activeId();
      if (id) this.listRef()?.nativeElement.querySelector(`#${CSS.escape(id)}`)?.scrollIntoView({ block: 'nearest' });
    });
  }
}
