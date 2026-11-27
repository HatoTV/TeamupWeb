// Cloudflare Worker of teamupp.eu. Existing static files are served by Workers static assets (free, unlimited,
// the Worker does not run). This script only runs for (free plan: 100,000 invocations per day):
//   - /api/*: Twitch live status and the matchup update e-mail (wrangler.jsonc run_worker_first);
//   - videos: static assets ignore Range headers, which Safari needs to play a video (run_worker_first);
//   - requests matching no static file (not_found_handling "none"): stats JSON missing from the Git subset are
//     read from the public R2 bucket (binding STATS); pages that are not prerendered get the client-side shell.

import { handleSendEmail } from './send-email.js';
import { handleTwitchLive } from './twitch-live.js';
import { serveRange } from './range.js';
// Written by tools/cloudflare-assets.mjs (npm run build:cloudflare): byte size of each video.
import assetSizes from './asset-sizes.json';

/** URL prefix → key prefix in the R2 statistics bucket. */
const R2_PREFIXES = [
  ['/data/lol/builds/', 'builds/'],
  ['/data/tft/stats/', 'tft/stats/'],
];
const VIDEO_PREFIXES = ['/assets/lolVideos/', '/assets/rlVideos/'];
/** Client-side rendered shell (`/index.csr` serves index.csr.html, html_handling drops the extension). */
const SHELL_PATH = '/index.csr';

async function serveStats(request, env, key) {
  const object = await env.STATS.get(key);
  if (!object) return new Response('Not found', { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('ETag', object.httpEtag);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('Cache-Control', 'public, max-age=300');
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(request.method === 'HEAD' ? null : object.body, { headers });
}

/** R2 key of a stats URL, or null (other path, or a path that tries to leave its prefix). */
function statsKey(pathname) {
  for (const [prefix, keyPrefix] of R2_PREFIXES) {
    if (!pathname.startsWith(prefix)) continue;
    const parts = pathname.slice(prefix.length).split('/');
    return parts.some((part) => part === '' || part === '.' || part === '..') ? null : keyPrefix + parts.join('/');
  }
  return null;
}

/** A page address (no file extension) asked by a browser navigation or an HTML request. */
function isPageRequest(request, pathname) {
  const accept = request.headers.get('Accept') || '';
  const navigate = request.headers.get('Sec-Fetch-Mode') === 'navigate';
  return (navigate || accept.includes('text/html')) && !/\.[a-z0-9]+$/i.test(pathname);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;

    if (pathname === '/api/twitch-live') return handleTwitchLive(request, env, ctx);
    if (pathname === '/api/send-email') return handleSendEmail(request, env);
    if (pathname.startsWith('/api/')) return Response.json({ error: 'Not found' }, { status: 404 });

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
    }

    if (VIDEO_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
      const asset = await env.ASSETS.fetch(new Request(url, { headers: request.headers }));
      return serveRange(request, asset, assetSizes[pathname]);
    }

    const key = statsKey(pathname);
    if (key) return serveStats(request, env, key);

    if (isPageRequest(request, pathname)) {
      const shell = await env.ASSETS.fetch(new URL(SHELL_PATH, url));
      return new Response(request.method === 'HEAD' ? null : shell.body, { status: 200, headers: shell.headers });
    }
    return new Response('Not found', { status: 404 });
  },
};
