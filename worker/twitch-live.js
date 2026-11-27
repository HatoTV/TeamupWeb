// Public, read-only Twitch live status for the Hato_TV channel.
// Secrets (wrangler secret put TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET) stay server-side: the browser only ever
// receives { live, title?, viewers? }.

const CHANNEL = 'Hato_TV';
const TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const STREAMS_URL = `https://api.twitch.tv/helix/streams?user_login=${CHANNEL}`;
const EXPIRY_MARGIN_MS = 60_000;
const CACHE_SECONDS = 60;

/** App access token cache (lives as long as the Worker isolate). */
let cachedToken = { value: '', expiresAt: 0 };

async function getAppAccessToken(clientId, clientSecret) {
  if (cachedToken.value && Date.now() < cachedToken.expiresAt - EXPIRY_MARGIN_MS) {
    return cachedToken.value;
  }
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
    }),
  });
  if (!response.ok) {
    throw new Error(`Twitch token request failed (${response.status})`);
  }
  const data = await response.json();
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + Number(data.expires_in || 0) * 1000,
  };
  return cachedToken.value;
}

async function fetchStream(clientId, clientSecret, retry = true) {
  const token = await getAppAccessToken(clientId, clientSecret);
  const response = await fetch(STREAMS_URL, {
    headers: { 'Client-Id': clientId, Authorization: `Bearer ${token}` },
  });
  if (response.status === 401 && retry) {
    cachedToken = { value: '', expiresAt: 0 };
    return fetchStream(clientId, clientSecret, false);
  }
  if (!response.ok) {
    throw new Error(`Twitch streams request failed (${response.status})`);
  }
  const { data } = await response.json();
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
}

function json(body, status, cacheControl) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': cacheControl, 'X-Content-Type-Options': 'nosniff' },
  });
}

export async function handleTwitchLive(request, env, ctx) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return Response.json({ error: 'Method not allowed' }, { status: 405, headers: { Allow: 'GET, HEAD' } });
  }

  // One Twitch call per minute and per data centre at most (the Cache API only works on a custom domain).
  const cache = caches.default;
  const cacheKey = new Request(new URL('/api/twitch-live', request.url), { method: 'GET' });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const clientId = env.TWITCH_CLIENT_ID;
  const clientSecret = env.TWITCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error('twitch-live: missing Twitch credentials');
    return json({ error: 'Service unavailable' }, 503, 'no-store');
  }

  try {
    const stream = await fetchStream(clientId, clientSecret);
    const body = stream
      ? { live: true, title: String(stream.title || ''), viewers: Number(stream.viewer_count || 0) }
      : { live: false };
    const response = json(body, 200, `public, max-age=${CACHE_SECONDS}`);
    ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch (error) {
    console.error('twitch-live:', error instanceof Error ? error.message : error);
    return json({ error: 'Service unavailable' }, 502, 'no-store');
  }
}
