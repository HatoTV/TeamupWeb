import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { DEFAULT_LANG, Lang, SUPPORTED_LANGS } from './site.config';

export type SiteSection = 'home' | 'lol' | 'tft' | 'rl' | 'about' | 'legal' | 'other';

export interface ParsedUrl {
  lang: Lang;
  /** Path without language prefix, query or fragment, e.g. `/lol/laning`. */
  path: string;
  fragment: string | null;
  section: SiteSection;
}

const SECTION_BY_SEGMENT: Record<string, SiteSection> = {
  home: 'home',
  lol: 'lol',
  tft: 'tft',
  rocket: 'rl',
  rl: 'rl',
  contact: 'about',
  cgu: 'legal',
  privacy: 'legal',
  'mentions-legales': 'legal',
};

export function parseUrl(url: string): ParsedUrl {
  const [beforeFragment, fragment = null] = url.split('#');
  const pathname = beforeFragment.split('?')[0];
  const segments = pathname.split('/').filter(Boolean);
  const first = segments[0] as Lang | undefined;
  const lang = first && SUPPORTED_LANGS.includes(first) ? first : DEFAULT_LANG;
  const rest = first && SUPPORTED_LANGS.includes(first) ? segments.slice(1) : segments;
  const path = '/' + rest.join('/');
  return {
    lang,
    path: path === '/' ? '/home' : path,
    fragment: fragment ? decodeURIComponent(fragment) : null,
    section: SECTION_BY_SEGMENT[rest[0] ?? 'home'] ?? 'other',
  };
}

/** Single source of truth for "where are we" (language, hub, path) derived from the router. */
@Injectable({ providedIn: 'root' })
export class RouteContextService {
  private readonly router = inject(Router);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects)
    ),
    { initialValue: this.router.url }
  );

  readonly parsed = computed(() => parseUrl(this.url()));
  readonly lang = computed(() => this.parsed().lang);
  readonly path = computed(() => this.parsed().path);
  readonly fragment = computed(() => this.parsed().fragment);
  readonly section = computed(() => this.parsed().section);
  /** Hub colour theme (`data-game`), null outside game hubs. */
  readonly game = computed(() => {
    const s = this.section();
    return s === 'lol' || s === 'tft' || s === 'rl' ? s : null;
  });

  /** Prefixes a path (e.g. `/lol/picker`) with the current language. */
  link(path: string): string {
    return `/${this.lang()}${path}`;
  }

  /** Same page in another language. */
  linkInLang(lang: Lang): string {
    return `/${lang}${this.path()}`;
  }
}
