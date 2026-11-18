import { ChangeDetectorRef, Directive, ElementRef, HostListener, Signal, inject, signal, viewChild } from '@angular/core';

let nextId = 0;

/** Dropdown with images: a button and an ARIA listbox (native options cannot show images). Shared open / keyboard logic. */
@Directive()
export abstract class ListboxSelect<T> {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly id = `listbox-select-${nextId++}`;
  protected readonly open = signal(false);
  private readonly button = viewChild<ElementRef<HTMLButtonElement>>('button');
  private readonly list = viewChild<ElementRef<HTMLElement>>('list');

  /** Current value. */
  abstract readonly value: Signal<T>;
  /** Options in display order. */
  protected abstract readonly ordered: Signal<readonly T[]>;
  protected abstract emit(value: T): void;

  protected select(value: T): void {
    this.close(true);
    if (value !== this.value()) this.emit(value);
  }

  protected toggle(): void {
    if (this.open()) this.close(true);
    else this.openList();
  }

  private openList(): void {
    this.open.set(true);
    // Render the list now, then focus the selected option.
    this.cdr.detectChanges();
    this.keepOnScreen();
    this.focusOption(Math.max(0, this.ordered().indexOf(this.value())));
    // Reveal the whole list (it may open below the fold or under the mobile tab bar).
    this.list()?.nativeElement.scrollIntoView({ block: 'nearest' });
  }

  /** A dropdown near the right edge (filters that wrap on mobile) opens shifted left so the whole list stays visible. */
  private keepOnScreen(): void {
    const list = this.list()?.nativeElement;
    if (!list) return;
    list.style.removeProperty('left');
    const margin = 16;
    const box = list.getBoundingClientRect();
    const shift = Math.min(0, window.innerWidth - margin - box.right);
    if (shift) list.style.left = `${Math.round(Math.max(shift, margin - box.left))}px`;
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
