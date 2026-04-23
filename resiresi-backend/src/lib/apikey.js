import crypto from 'crypto';

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateApiKey(env = 'live') {
  const chars = Array.from({ length: 6 }, () =>
    CHARSET[Math.floor(Math.random() * CHARSET.length)]
  ).join('');
  const prefix = `rsrsi_${env}_${chars}`;
  const secret = crypto.randomBytes(32).toString('base64url');
  const fullKey = `${prefix}.${secret}`;
  const secretHash = crypto.createHash('sha256').update(fullKey).digest('hex');
  return { prefix, fullKey, secretHash };
}

export function hashKey(fullKey) {
  return crypto.createHash('sha256').update(fullKey).digest('hex');
}

export function timingSafeCompare(a, b) {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function parsePrefix(fullKey) {
  const dot = fullKey.indexOf('.');
  if (dot === -1) return null;
  return fullKey.slice(0, dot);
}
