import { ImgFallbackPipe, SrcsetPipe } from '../../core/images/image-utils';
import { NgOptimizedImage } from '@angular/common';
import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Champion, ChampionDataService, ROLES, Role } from '../../core/data/champion-data.service';
import { RouteContextService } from '../../core/route-context.service';
import { normalizeForSearch } from '../../core/slug';
import { IconComponent } from '../../shared/ui/icon/icon.component';

/** Picker difficulty buckets (existing LOL.PICKER.DIFFICULTIES keys), mapped from the 1–5 data scale. */
export type DifficultyBucket = 'easy' | 'average' | 'hard' | '*';

export const BUCKETS: { id: DifficultyBucket; levels: number[]; color: number }[] = [
  { id: 'easy', levels: [1, 2], color: 2 },
  { id: 'average', levels: [3], color: 3 },
  { id: 'hard', levels: [4], color: 4 },
  { id: '*', levels: [5], color: 5 },
];

export function bucketOf(difficulty: number | null): (typeof BUCKETS)[number] | null {
  return BUCKETS.find((b) => difficulty !== null && b.levels.includes(difficulty)) ?? null;
}

interface PickerCard {
  champion: Champion;
  icon: string;
  bucket: (typeof BUCKETS)[number] | null;
}

@Component({
  selector: 'app-picker',
  standalone: true,
  imports: [SrcsetPipe, ImgFallbackPipe, NgOptimizedImage, TranslateModule, RouterLink, IconComponent],
  templateUrl: './picker.component.html',
  styleUrl: './picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PickerComponent {
  protected readonly ctx = inject(RouteContextService);
  protected readonly data = inject(ChampionDataService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly roles = ROLES;
  protected readonly buckets = BUCKETS;

  protected readonly search = signal('');
  protected readonly role = signal<Role | null>(null);
  protected readonly bucket = signal<DifficultyBucket | null>(null);

  private readonly cards = computed<PickerCard[]>(() =>
    (this.data.index()?.champions ?? []).map((champion) => ({
      champion,
      icon: this.data.iconUrl(champion),
      bucket: bucketOf(champion.difficulty),
    }))
  );

  protected readonly filtered = computed(() => {
    const q = normalizeForSearch(this.search());
    const role = this.role();
    const bucket = this.bucket();
    return this.cards().filter(
      ({ champion, bucket: b }) =>
        (!q || [champion.name, ...(champion.aliases ?? [])].some((n) => normalizeForSearch(n).includes(q))) &&
        (!role || champion.roles.includes(role)) &&
        (!bucket || b?.id === bucket)
    );
  });

  // Random draw
  protected readonly draw = signal<PickerCard | null>(null);
  protected readonly rolling = signal(false);
  protected readonly drawEmpty = signal(false);
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    void this.data.loadIndex().catch(() => undefined);
    inject(DestroyRef).onDestroy(() => this.stopTimer());
  }

  protected toggleRole(role: Role): void {
    this.role.update((current) => (current === role ? null : role));
  }

  protected setBucket(value: string): void {
    this.bucket.set(value ? (value as DifficultyBucket) : null);
  }

  /** Random champion within the filters, with a short slowing "roll" unless reduced motion is requested. */
  protected roll(): void {
    const pool = this.filtered();
    this.stopTimer();
    this.drawEmpty.set(pool.length === 0);
    if (!pool.length) {
      this.draw.set(null);
      return;
    }
    const pick = () => pool[Math.floor(Math.random() * pool.length)];
    const reduceMotion = this.isBrowser && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!this.isBrowser || reduceMotion || pool.length === 1) {
      this.draw.set(pick());
      return;
    }
    this.rolling.set(true);
    let interval = 50;
    let elapsed = 0;
    const step = () => {
      this.draw.set(pick());
      interval = Math.min(interval * 1.1, 200);
      elapsed += interval;
      if (elapsed < 1600) {
        this.timer = setTimeout(step, interval);
      } else {
        this.rolling.set(false);
        this.timer = null;
      }
    };
    step();
  }

  private stopTimer(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.rolling.set(false);
  }
}
