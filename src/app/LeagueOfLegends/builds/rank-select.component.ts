import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, HostListener, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { BuildFilter, EXACT_FILTERS } from '../../core/data/build-data.service';

let nextId = 0;

/** Rank filter dropdown with emblems: a button and an ARIA listbox (native options cannot show images). */
@Component({
  selector: 'app-rank-select',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './rank-select.component.html',
  styleUrl: './rank-select.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RankSelectComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly filters = input.required<readonly BuildFilter[]>();
  readonly value = input.required<BuildFilter>();
  readonly valueChange = output<BuildFilter>();

  protected readonly id = `rank-select-${nextId++}`;
  protected readonly open = signal(false);
  protected readonly plus = computed(() => this.filters().filter((f) => !EXACT_FILTERS.includes(f)));
  protected readonly exact = computed(() => this.filters().filter((f) => EXACT_FILTERS.includes(f)));
  private readonly ordered = computed(() => [...this.plus(), ...this.exact()]);
  private readonly button = viewChild<ElementRef<HTMLButtonElement>>('button');
  private readonly list = viewChild<ElementRef<HTMLElement>>('list');

  protected emblem(filter: BuildFilter): string {
    return `assets/img/ranks/${filter.replace('_plus', '')}.webp`;
  }

  protected select(filter: BuildFilter): void {
    this.close(true);
    if (filter !== this.value()) this.valueChange.emit(filter);
  }

  protected toggle(): void {
    if (this.open()) this.close(true);
    else this.openList();
  }

  private openList(): void {
    this.open.set(true);
    // Render the list now, then focus the selected option.
    this.cdr.detectChanges();
    this.focusOption(Math.max(0, this.ordered().indexOf(this.value())));
  }

  private close(focusButton: boolean): void {
    if (!this.open()) return;
    this.open.set(false);
    if (focusButton) this.button()?.nativeElement.focus();
  }

  private options(): HTMLElement[] {
    return Array.from(this.list()?.nativeElement.querySelectorAll<HTMLElement>('[role="option"]') ?? []);
  }

  private focusOption(index: number): void {
    const options = this.options();
    options[(index + options.length) % options.length]?.focus();
  }

  protected onButtonKey(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.openList();
    }
  }

  protected onListKey(event: KeyboardEvent): void {
    const options = this.options();
    const current = options.indexOf(document.activeElement as HTMLElement);
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.focusOption(current + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusOption(current - 1);
        break;
      case 'Home':
        event.preventDefault();
        this.focusOption(0);
        break;
      case 'End':
        event.preventDefault();
        this.focusOption(options.length - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (current >= 0) this.select(this.ordered()[current]!);
        break;
      case 'Escape':
        event.preventDefault();
        this.close(true);
        break;
      case 'Tab':
        this.close(false);
        break;
    }
  }

  /** Click outside closes the list. */
  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.close(false);
  }
}
