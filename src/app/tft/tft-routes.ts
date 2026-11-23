import { UrlMatchResult, UrlSegment } from '@angular/router';

/**
 * `:lang/tft/{page}` and `:lang/tft/{page}/:slug` with one route, so the page is reused when the selection changes
 * (champions, items). Exposes `lang` and `slug`.
 */
export function tftPageMatcher(page: string) {
  return (segments: UrlSegment[]): UrlMatchResult | null => {
    const [lang, tft, p, slug, ...rest] = segments;
    if (!lang || tft?.path !== 'tft' || p?.path !== page || rest.length) return null;
    if (slug && !/^[a-z0-9-]+$/.test(slug.path)) return null;
    return { consumed: segments, posParams: slug ? { lang, slug } : { lang } };
  };
}
