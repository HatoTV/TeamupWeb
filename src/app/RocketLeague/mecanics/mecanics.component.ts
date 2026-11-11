import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Mechanic, RlMechanicsService } from '../../core/data/rl-mechanics.service';
import { RouteContextService } from '../../core/route-context.service';
import { SeoService } from '../../core/seo.service';
import { normalizeForSearch } from '../../core/slug';
import { SafeHtmlPipe } from '../../safe-html.pipe';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { MeterComponent } from '../../shared/ui/meter.component';

export type MechanicSort = 'utility-desc' | 'utility-asc' | 'difficulty-asc' | 'difficulty-desc' | 'name-asc' | 'name-desc';

/** Sort options; labels reuse the existing RL.MECANICS keys (arrow ↓ = highest first). */
export const SORTS: { id: MechanicSort; labelKey: string }[] = [
  { id: 'utility-desc', labelKey: 'RL.MECANICS.UTILITY_ASC' },
  { id: 'utility-asc', labelKey: 'RL.MECANICS.UTILITY_DESC' },
  { id: 'difficulty-asc', labelKey: 'RL.MECANICS.DIFFICULTY_DESC' },
  { id: 'difficulty-desc', labelKey: 'RL.MECANICS.DIFFICULTY_ASC' },
  { id: 'name-asc', labelKey: 'RL.MECANICS.NAME_ASC' },
  { id: 'name-desc', labelKey: 'RL.MECANICS.NAME_DESC' },
];

export function sortMechanics(list: Mechanic[], sort: MechanicSort): Mechanic[] {
  const byName = (a: Mechanic, b: Mechanic) => a.name.localeCompare(b.name);
  const compare: Record<MechanicSort, (a: Mechanic, b: Mechanic) => number> = {
    'utility-desc': (a, b) => b.utility - a.utility || a.difficulty - b.difficulty || byName(a, b),
    'utility-asc': (a, b) => a.utility - b.utility || byName(a, b),
    'difficulty-asc': (a, b) => a.difficulty - b.difficulty || byName(a, b),
    'difficulty-desc': (a, b) => b.difficulty - a.difficulty || byName(a, b),
    'name-asc': byName,
    'name-desc': (a, b) => byName(b, a),
  };
  return [...list].sort(compare[sort]);
}

@Component({
  selector: 'app-mecanics',
  standalone: true,
  imports: [TranslateModule, RouterLink, SafeHtmlPipe, IconComponent, MeterComponent],
  templateUrl: './mecanics.component.html',
  styleUrl: './mecanics.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MecanicsComponent {
  protected readonly ctx = inject(RouteContextService);
  private readonly data = inject(RlMechanicsService);
  private readonly translate = inject(TranslateService);
  private readonly seo = inject(SeoService);

  protected readonly levels = [1, 2, 3, 4, 5];
  protected readonly sorts = SORTS;
  protected readonly search = signal('');
  protected readonly difficulties = signal<number[]>([]);
  protected readonly utilities = signal<number[]>([]);
  protected readonly sort = signal<MechanicSort>('utility-desc');

  protected readonly visible = computed(() => {
    const q = normalizeForSearch(this.search());
    const d = this.difficulties();
    const u = this.utilities();
    const filtered = (this.data.list() ?? []).filter(
      (m) =>
        (!q || normalizeForSearch(`${m.name} ${m.subname} ${m.author}`).includes(q)) &&
        (!d.length || d.includes(m.difficulty)) &&
        (!u.length || u.includes(m.utility))
    );
    return sortMechanics(filtered, this.sort());
  });

  constructor() {
    void this.data.load().catch(() => undefined);
    effect(() => {
      this.ctx.lang();
      this.translate.get(['RLPAGE.TITLE', 'RLPAGE.TITLE_ACCENT', 'RLPAGE.META_LIST', 'GAMES.RL']).subscribe((t) =>
        this.seo.setPage({
          title: `${t['GAMES.RL']} · ${t['RLPAGE.TITLE']} ${t['RLPAGE.TITLE_ACCENT']}`,
          description: t['RLPAGE.META_LIST'],
          image: '/assets/img/site/bkgRocketLeague.webp',
        })
      );
    });
  }

  protected toggle(list: typeof this.difficulties, level: number): void {
    list.update((current) => (current.includes(level) ? current.filter((l) => l !== level) : [...current, level]));
  }

  protected setSort(value: string): void {
    this.sort.set(value as MechanicSort);
  }
}
