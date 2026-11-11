import { inject } from '@angular/core';
import { Router, UrlMatchResult, UrlSegment } from '@angular/router';
import { RouteContextService } from '../../core/route-context.service';

/**
 * Matchup URLs (path based so that every state is shareable and can be prerendered):
 *   /:lang/lol/matchups                 nothing selected
 *   /:lang/lol/matchups/:me             my champion only
 *   /:lang/lol/matchups/vs/:vs          enemy only
 *   /:lang/lol/matchups/:me/vs/:vs      full matchup
 */
export interface MatchupSelection {
  me: string | null;
  vs: string | null;
}

const SLUG = /^[a-z0-9-]+$/;
const isSlug = (s: string | undefined): s is string => !!s && s !== 'vs' && SLUG.test(s);

/** Router matcher for `:lang/lol/matchups[/…]`; exposes `lang`, `me` and `vs` params. */
export function matchupsMatcher(segments: UrlSegment[]): UrlMatchResult | null {
  const [lang, lol, page, ...rest] = segments;
  if (!lang || lol?.path !== 'lol' || page?.path !== 'matchups') return null;
  const params: Record<string, UrlSegment> = { lang };
  const paths = rest.map((s) => s.path);
  if (paths.length === 0) {
    // nothing selected
  } else if (paths.length === 1 && isSlug(paths[0])) {
    params['me'] = rest[0];
  } else if (paths.length === 2 && paths[0] === 'vs' && isSlug(paths[1])) {
    params['vs'] = rest[1];
  } else if (paths.length === 3 && isSlug(paths[0]) && paths[1] === 'vs' && isSlug(paths[2])) {
    params['me'] = rest[0];
    params['vs'] = rest[2];
  } else {
    return null;
  }
  return { consumed: segments, posParams: params };
}

/** Path (without language) for a selection. */
export function matchupPath({ me, vs }: MatchupSelection): string {
  if (me && vs) return `/lol/matchups/${me}/vs/${vs}`;
  if (me) return `/lol/matchups/${me}`;
  if (vs) return `/lol/matchups/vs/${vs}`;
  return '/lol/matchups';
}

/** Legacy query strings (`?champion=&enemy=`, `?me=&vs=`) → selection, or null when absent. */
export function legacySelection(query: { get(name: string): string | null }): MatchupSelection | null {
  const me = query.get('me') ?? query.get('champion');
  const vs = query.get('vs') ?? query.get('enemy');
  if (!me && !vs) return null;
  const clean = (s: string | null) => (s && isSlug(s.toLowerCase()) ? s.toLowerCase() : null);
  return { me: clean(me), vs: clean(vs) };
}

/** Navigates to a selection (keeps the current language). Must be called in an injection context. */
export function injectMatchupNavigation(): (selection: MatchupSelection, options?: { replaceUrl?: boolean }) => void {
  const router = inject(Router);
  const ctx = inject(RouteContextService);
  return (selection, options) => void router.navigateByUrl(ctx.link(matchupPath(selection)), options);
}
