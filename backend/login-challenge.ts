import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
interface LoginChallenge { userId: string; nonce: string; expiresAt: number; }
export function createLoginChallenge(userId: string, secret: string, now=Date.now()) {
  const data:LoginChallenge = {userId,nonce:randomBytes(24).toString('hex'),expiresAt:now+600000};
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
  return `${payload}.${createHmac('sha256',secret).update(payload).digest('base64url')}`;
}
export function readLoginChallenge(value: string | undefined, secret: string, now=Date.now()): LoginChallenge | null {
  if (!value || value.length>1000) return null;
  const [payload,signature,extra] = value.split('.');
  if (!payload || !signature || extra) return null;
  const expected=createHmac('sha256',secret).update(payload).digest();
  const actual=Buffer.from(signature,'base64url');
  if (actual.length!==expected.length || !timingSafeEqual(actual,expected)) return null;
  try {
    const data=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));
    return typeof data.userId==='string' && /^[a-f0-9]{48}$/.test(data.nonce) && Number.isFinite(data.expiresAt) && data.expiresAt>now ? data : null;
  } catch { return null; }
}
