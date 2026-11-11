import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs';
import { Mechanic, RlMechanicsService } from '../../core/data/rl-mechanics.service';
import { RouteContextService } from '../../core/route-context.service';
import { SeoService } from '../../core/seo.service';
import { LinesPipe } from '../../LeagueOfLegends/guide-shared/guide-text';
import { SafeHtmlPipe } from '../../safe-html.pipe';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { MeterComponent } from '../../shared/ui/meter.component';

/** Three other mechanics, closest in difficulty first, then most useful. */
export function suggestions(all: Mechanic[], current: Mechanic, count = 3): Mechanic[] {
  return all
    .filter((m) => m.slug !== current.slug)
    .sort(
      (a, b) =>
        Math.abs(a.difficulty - current.difficulty) - Math.abs(b.difficulty - current.difficulty) ||
        b.utility - a.utility ||
        a.name.localeCompare(b.name)
    )
    .slice(0, count);
}

@Component({
  selector: 'app-mecanic',
  standalone: true,
  imports: [TranslateModule, RouterLink, SafeHtmlPipe, LinesPipe, IconComponent, MeterComponent],
  templateUrl: './mecanic.component.html',
  styleUrl: './mecanic.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MecanicComponent {
  protected readonly ctx = inject(RouteContextService);
  private readonly data = inject(RlMechanicsService);
  private readonly translate = inject(TranslateService);
  private readonly seo = inject(SeoService);

  private readonly slug = toSignal(inject(ActivatedRoute).paramMap.pipe(map((p) => p.get('slug') ?? '')), {
    initialValue: '',
  });

  protected readonly loaded = computed(() => this.data.list() !== null);
  protected readonly mechanic = computed(() => this.data.list()?.find((m) => m.slug === this.slug()) ?? null);
  protected readonly next = computed(() => {
    const current = this.mechanic();
    return current ? suggestions(this.data.list() ?? [], current) : [];
  });

  protected readonly slow = signal(false);
  protected readonly loop = signal(true);
  private readonly video = viewChild<ElementRef<HTMLVideoElement>>('video');

  constructor() {
    void this.data.load().catch(() => undefined);

    // Playback rate follows the "× 0,5" toggle (also after the source changes).
    effect(() => {
      const el = this.video()?.nativeElement;
      if (el) el.playbackRate = this.slow() ? 0.5 : 1;
    });

    effect(() => {
      const m = this.mechanic();
      this.ctx.lang();
      if (!m) return;
      untracked(() => {
        this.slow.set(false);
        const name = m.subname ? `${m.name} ${m.subname}` : m.name;
        this.translate
          .get(['GAMES.RL', 'RLPAGE.META_DETAIL'], { name, difficulty: m.difficulty, utility: m.utility })
          .subscribe((t) =>
            this.seo.setPage({
              title: `${name} · ${t['GAMES.RL']}`,
              description: t['RLPAGE.META_DETAIL'],
              image: `/${m.thumbnail}`,
            })
          );
      });
    });
  }

  protected onRateReset(): void {
    // Browsers reset playbackRate when a new source loads.
    const el = this.video()?.nativeElement;
    if (el) el.playbackRate = this.slow() ? 0.5 : 1;
  }
}
