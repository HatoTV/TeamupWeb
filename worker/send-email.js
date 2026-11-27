// Matchup update request form → e-mail to Hato, sent with the Cloudflare Email Service binding EMAIL
// (wrangler.jsonc send_email). The sender (MAIL_FROM) must be on a domain onboarded for sending in the
// Cloudflare account, and RECIPIENT must be allowed by the account (verified destination address).

const RECIPIENT = 'hatovod@gmail.com';

/** Closed list of request types accepted from the matchup update form. */
const REQUEST_TYPES = {
  no_data: 'No Datas',
  wrong_data: 'False/Incomplete Datas',
};

const MAX_CHAMPION_LENGTH = 40;
const MAX_MESSAGE_LENGTH = 1000;
const MAX_BODY_BYTES = 8 * 1024;
const CHAMPION_PATTERN = /^[\p{L}][\p{L} .'&-]*$/u;
const GENERIC_ERROR = { error: 'Request could not be processed' };

/** Best-effort per-isolate rate limit (Worker isolates do not share memory). */
const RATE_WINDOW_MS = 10 * 60_000;
const RATE_MAX = 5;
const hits = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > RATE_MAX;
}

/** Production hosts, plus the Worker's own host (workers.dev and preview URLs). */
function isAllowedOrigin(origin, requestUrl) {
  if (typeof origin !== 'string') return false;
  return (
    origin === 'https://teamupp.app' || origin === 'https://www.teamupp.app' || origin === new URL(requestUrl).origin
  );
}

function isValidChampion(value) {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= MAX_CHAMPION_LENGTH &&
    CHAMPION_PATTERN.test(value.trim())
  );
}

/** Returns a normalised payload, or null when the body is invalid. */
function parseBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const { type, champion1, champion2, message = '' } = body;
  if (!Object.hasOwn(REQUEST_TYPES, type)) return null;
  if (!isValidChampion(champion1) || !isValidChampion(champion2)) return null;
  if (typeof message !== 'string' || message.length > MAX_MESSAGE_LENGTH) return null;
  return {
    type,
    champion1: champion1.trim(),
    champion2: champion2.trim(),
    message: message.trim(),
  };
}

export async function handleSendEmail(request, env) {
  const origin = request.headers.get('Origin');
  const originAllowed = isAllowedOrigin(origin, request.url);

  const headers = new Headers({ Vary: 'Origin', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  if (originAllowed) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Methods', 'POST');
    headers.set('Access-Control-Allow-Headers', 'Content-Type');
  }
  const reply = (body, status) => Response.json(body, { status, headers });

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: originAllowed ? 204 : 403, headers });
  }
  if (request.method !== 'POST') {
    headers.set('Allow', 'POST');
    return reply(GENERIC_ERROR, 405);
  }
  if (!originAllowed) return reply(GENERIC_ERROR, 403);
  const contentType = (request.headers.get('Content-Type') || '').toLowerCase();
  if (!contentType.startsWith('application/json')) return reply(GENERIC_ERROR, 415);

  let body;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return reply(GENERIC_ERROR, 413);
    body = JSON.parse(raw);
  } catch {
    return reply(GENERIC_ERROR, 400);
  }

  // Honeypot: real users never fill this hidden field. Pretend success to bots.
  if (body && typeof body === 'object' && body.website) return reply({ ok: true }, 200);

  const payload = parseBody(body);
  if (!payload) return reply(GENERIC_ERROR, 400);
  if (isRateLimited(request.headers.get('CF-Connecting-IP') || 'unknown')) {
    headers.set('Retry-After', String(RATE_WINDOW_MS / 1000));
    return reply(GENERIC_ERROR, 429);
  }

  if (!env.EMAIL || !env.MAIL_FROM) {
    console.error('send-email: missing EMAIL binding or MAIL_FROM');
    return reply(GENERIC_ERROR, 500);
  }

  try {
    await env.EMAIL.send({
      from: { email: env.MAIL_FROM, name: 'TeamUpp' },
      to: RECIPIENT,
      subject: `${payload.champion1} vs ${payload.champion2} : ${REQUEST_TYPES[payload.type]}`,
      text: [
        `Type: ${REQUEST_TYPES[payload.type]}`,
        `Champion: ${payload.champion1}`,
        `Enemy: ${payload.champion2}`,
        '',
        payload.message || '(no message)',
      ].join('\n'),
    });
    return reply({ ok: true }, 200);
  } catch (error) {
    console.error('send-email:', error instanceof Error ? error.message : error);
    return reply(GENERIC_ERROR, 500);
  }
}
