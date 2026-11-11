import nodemailer from 'nodemailer';

const RECIPIENT = 'hatovod@gmail.com';

/** Closed list of request types accepted from the matchup update form. */
const REQUEST_TYPES = {
  no_data: 'No Datas',
  wrong_data: 'False/Incomplete Datas',
};

const MAX_CHAMPION_LENGTH = 40;
const MAX_MESSAGE_LENGTH = 1000;
const CHAMPION_PATTERN = /^[\p{L}][\p{L} .'&-]*$/u;
const GENERIC_ERROR = { error: 'Request could not be processed' };

function allowedOrigins() {
  const origins = new Set(['https://teamupp.app', 'https://www.teamupp.app']);
  // Vercel system environment variables (deployment, branch and production URLs, without protocol).
  for (const key of ['VERCEL_URL', 'VERCEL_BRANCH_URL', 'VERCEL_PROJECT_PRODUCTION_URL']) {
    const host = process.env[key];
    if (host) origins.add(`https://${host}`);
  }
  return origins;
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
    message: type === 'wrong_data' ? message.trim() : '',
  };
}

export default async function handler(req, res) {
  const origin = req.headers.origin;
  const originAllowed = typeof origin === 'string' && allowedOrigins().has(origin);

  res.setHeader('Vary', 'Origin');
  res.setHeader('Cache-Control', 'no-store');
  if (originAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  if (req.method === 'OPTIONS') {
    return res.status(originAllowed ? 204 : 403).end();
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json(GENERIC_ERROR);
  }
  if (!originAllowed) {
    return res.status(403).json(GENERIC_ERROR);
  }
  const contentType = String(req.headers['content-type'] || '').toLowerCase();
  if (!contentType.startsWith('application/json')) {
    return res.status(415).json(GENERIC_ERROR);
  }

  // Honeypot: real users never fill this hidden field. Pretend success to bots.
  if (req.body && typeof req.body === 'object' && req.body.website) {
    return res.status(200).json({ ok: true });
  }

  const payload = parseBody(req.body);
  if (!payload) {
    return res.status(400).json(GENERIC_ERROR);
  }

  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!user || !pass) {
    console.error('send-email: missing mail credentials');
    return res.status(500).json(GENERIC_ERROR);
  }

  try {
    const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
    const subject = `${payload.champion1} vs ${payload.champion2} : ${REQUEST_TYPES[payload.type]}`;
    const text = [
      `Type: ${REQUEST_TYPES[payload.type]}`,
      `Champion: ${payload.champion1}`,
      `Enemy: ${payload.champion2}`,
      '',
      payload.message || '(no message)',
    ].join('\n');
    await transporter.sendMail({ from: user, to: RECIPIENT, subject, text });
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('send-email:', error instanceof Error ? error.message : error);
    return res.status(500).json(GENERIC_ERROR);
  }
}
