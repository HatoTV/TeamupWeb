import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ActiveSectionService } from '../../../core/active-section.service';
import { DISCORD_URL } from '../../../core/site.config';
import { IconComponent } from '../icon/icon.component';

export interface GuideChapter {
  /** Anchor id of the chapter heading (also listed in the TOC). */
  id: string;
  title: string;
}

export interface TocEntry {
  id: string;
  label: string;
  level: 1 | 2;
  /** Optional number shown before the label ("01"). */
  marker?: string;
}

export interface GuideNavLink {
  label: string;
  /** Absolute router link. */
  link: string;
  fragment?: string;
}

/**
 * Long-form guide layout: chapter tabs, 760 px reading column, sticky "on this page"
 * table of contents with scroll spy and reading progress, previous / next navigation.
 */
@Component({
  selector: 'app-guide-layout',
  standalone: true,
  imports: [RouterLink, TranslateModule, IconComponent],
  templateUrl: './guide-layout.component.html',
  styleUrl: './guide-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(mouseover)': 'placeTermTip($event)', '(focusin)': 'placeTermTip($event)' },
})
export class GuideLayoutComponent {
  readonly chapters = input<GuideChapter[]>([]);
  readonly toc = input<TocEntry[]>([]);
  readonly prev = input<GuideNavLink | null>(null);
  readonly next = input<GuideNavLink | null>(null);
  /** Side of the sticky table of contents on wide screens. */
  readonly tocPosition = input<'start' | 'end'>('end');
  /** Hides the "question about this guide" Discord card. */
  readonly showAsk = input(true);

  protected readonly discordUrl = DISCORD_URL;
  protected readonly activeId = signal<string | null>(null);
  protected readonly progress = signal(0);

  /**
   * Keeps a glossary tooltip (.term__tip, see SafeHtmlPipe) inside the reading column: shifted sideways when the
   * word sits near an edge, flipped above the word when it would go past the bottom of the screen.
   * Small screens pin the tooltip above the tab bar in CSS, so nothing to do there.
   */
  protected placeTermTip(event: Event): void {
    const term = (event.target as Element | null)?.closest?.('.term');
    const tip = term?.querySelector<HTMLElement>('.term__tip');
    if (!term || !tip || window.matchMedia('(max-width: 767px)').matches) return;
    tip.style.removeProperty('--tip-shift');
    tip.classList.remove('term__tip--above');
    requestAnimationFrame(() => {
      const box = tip.getBoundingClientRect();
      if (!box.width) return;
      const column = (term.closest('.guide__article') ?? document.body).getBoundingClientRect();
      const left = Math.max(column.left, 8);
      const right = Math.min(column.right, window.innerWidth - 8);
      const shift = box.left < left ? left - box.left : box.right > right ? right - box.right : 0;
      if (shift) tip.style.setProperty('--tip-shift', `${Math.round(shift)}px`);
      if (box.bottom > window.innerHeight - 8) tip.classList.add('term__tip--above');
    });
  }

  protected readonly activeChapter = computed(() => {
    const order = this.toc().map((e) => e.id);
    const activeIndex = order.indexOf(this.activeId() ?? '');
    let current: string | null = this.chapters()[0]?.id ?? null;
    for (const chapter of this.chapters()) {
      const index = order.indexOf(chapter.id);
      if (index !== -1 && index <= activeIndex) current = chapter.id;
    }
    return current;
  });

  private readonly article = viewChild.required<ElementRef<HTMLElement>>('article');
  private readonly activeSection = inject(ActiveSectionService);
  private readonly zone = inject(NgZone);
  private ids: string[] = [];
  /** A section becomes active once its heading passes under the sticky top bar. */
  private static readonly ACTIVATION_OFFSET = 120;

  constructor() {
    const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
    const destroyRef = inject(DestroyRef);

    effect(() => {
      const ids = this.toc().map((entry) => entry.id);
      if (isBrowser) untracked(() => requestAnimationFrame(() => this.observe(ids)));
    });

    effect(() => {
      // The sidebar highlights chapters (its entries), not sub-sections.
      const id = this.chapters().length ? this.activeChapter() : this.activeId();
      untracked(() => this.activeSection.id.set(id));
    });

    if (isBrowser) {
      const onScroll = () => requestAnimationFrame(() => this.updateProgress());
      this.zone.runOutsideAngular(() => window.addEventListener('scroll', onScroll, { passive: true }));
      destroyRef.onDestroy(() => {
        window.removeEventListener('scroll', onScroll);
        this.activeSection.id.set(null);
      });
    }
  }

  private observe(ids: string[]): void {
    this.ids = ids;
    this.updateProgress();
  }

  private updateProgress(): void {
    const rect = this.article().nativeElement.getBoundingClientRect();
    const scrollable = rect.height - window.innerHeight;
    const value = scrollable > 0 ? Math.min(1, Math.max(0, -rect.top / scrollable)) : 1;
    const percent = Math.round(value * 100);

    let active: string | null = this.ids[0] ?? null;
    for (const id of this.ids) {
      const el = document.getElementById(id);
      if (el && el.getBoundingClientRect().top <= GuideLayoutComponent.ACTIVATION_OFFSET) active = id;
    }

    if (percent !== this.progress() || active !== this.activeId()) {
      this.zone.run(() => {
        this.progress.set(percent);
        this.activeId.set(active);
      });
    }
  }
}
