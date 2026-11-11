// Public, read-only Twitch live status for the Hato_TV channel.
// Secrets stay server-side: the browser only ever receives { live, title?, viewers? }.

const CHANNEL = 'Hato_TV';
const TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const STREAMS_URL = `https://api.twitch.tv/helix/streams?user_login=${CHANNEL}`;
const EXPIRY_MARGIN_MS = 60_000;

/** In-memory app access token cache (lives as long as the function instance). */
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

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error('twitch-live: missing Twitch credentials');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({ error: 'Service unavailable' });
  }

  try {
    const stream = await fetchStream(clientId, clientSecret);
    const body = stream
      ? { live: true, title: String(stream.title || ''), viewers: Number(stream.viewer_count || 0) }
      : { live: false };
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return res.status(200).json(body);
  } catch (error) {
    console.error('twitch-live:', error instanceof Error ? error.message : error);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({ error: 'Service unavailable' });
  }
}
