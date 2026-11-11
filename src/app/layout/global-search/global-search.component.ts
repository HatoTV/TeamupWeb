import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { RouteContextService } from '../../core/route-context.service';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { SearchEntry, SearchIndexService } from './search-index.service';

let nextId = 0;

/**
 * Global search as an ARIA 1.2 combobox (input + listbox), fully keyboard operable:
 * ↑/↓ move, Enter opens, Escape closes then clears, "/" focuses the top bar instance.
 */
@Component({
  selector: 'app-global-search',
  standalone: true,
  imports: [TranslateModule, IconComponent],
  templateUrl: './global-search.component.html',
  styleUrl: './global-search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': '"search search--" + variant()',
    '(document:keydown)': 'onDocumentKeydown($event)',
  },
})
export class GlobalSearchComponent {
  /** `bar`: compact top bar field · `hero`: large field on the home hero · `panel`: mobile overlay. */
  readonly variant = input<'bar' | 'hero' | 'panel'>('bar');
  /** Enables the "/" keyboard shortcut (only one instance should have it). */
  readonly shortcut = input(false);
  readonly navigated = output<void>();

  private readonly index = inject(SearchIndexService);
  private readonly router = inject(Router);
  private readonly ctx = inject(RouteContextService);
  private readonly inputRef = viewChild.required<ElementRef<HTMLInputElement>>('field');

  protected readonly uid = `search-${nextId++}`;
  protected readonly query = signal('');
  protected readonly open = signal(false);
  protected readonly active = signal(-1);

  protected readonly groups = computed(() => {
    this.ctx.lang(); // re-translate guide labels when the language changes
    return this.index.search(this.query());
  });
  protected readonly flat = computed(() => this.groups().flatMap((g) => g.entries));
  protected readonly expanded = computed(() => this.open() && this.query().trim().length > 0);
  protected readonly activeId = computed(() => {
    const entry = this.flat()[this.active()];
    return entry && this.expanded() ? this.optionId(entry) : null;
  });

  focus(): void {
    this.inputRef().nativeElement.focus();
  }

  protected optionId(entry: SearchEntry): string {
    return `${this.uid}-${entry.id}`;
  }

  protected indexOf(entry: SearchEntry): number {
    return this.flat().indexOf(entry);
  }

  protected onFocus(): void {
    void this.index.load();
    this.open.set(true);
  }

  protected onInput(value: string): void {
    this.query.set(value);
    this.open.set(true);
    this.active.set(-1);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const count = this.flat().length;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.open.set(true);
        if (count) this.active.set((this.active() + 1) % count);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.open.set(true);
        if (count) this.active.set((this.active() - 1 + count) % count);
        break;
      case 'Enter': {
        const entry = this.flat()[Math.max(this.active(), 0)];
        if (entry && this.expanded()) {
          event.preventDefault();
          this.select(entry);
        }
        break;
      }
      case 'Escape':
        if (this.expanded()) {
          event.preventDefault();
          this.close();
        } else if (this.query()) {
          event.preventDefault();
          this.query.set('');
        }
        break;
      case 'Tab':
        this.close();
        break;
    }
  }

  protected onDocumentKeydown(event: KeyboardEvent): void {
    if (!this.shortcut() || event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target as HTMLElement | null;
    if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
    event.preventDefault();
    this.focus();
  }

  protected close(): void {
    this.open.set(false);
    this.active.set(-1);
  }

  protected select(entry: SearchEntry): void {
    void this.router.navigate([this.ctx.link(entry.path)], {
      fragment: entry.fragment,
      queryParams: entry.queryParams,
    });
    this.query.set('');
    this.close();
    this.inputRef().nativeElement.blur();
    this.navigated.emit();
  }
}
