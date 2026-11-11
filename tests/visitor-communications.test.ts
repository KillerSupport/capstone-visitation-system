import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { geographicOptions, validateAddress } from '../backend/geography.ts';

dotenv.config({ quiet: true });

const database = `bjmp_account_mail_test_${Date.now()}_${randomBytes(3).toString('hex')}`;
const adminPassword = `AdminOnly!${randomBytes(12).toString('hex')}`;
const workerPassword = `WorkerOnly!${randomBytes(12).toString('hex')}`;
const workerEmail = 'sample-worker@example.invalid';
const workerPhone = '+639177111222';
const messages: string[] = [];
let root: mysql.Connection | undefined;
let db: any;
let backend: any;
let smtp: net.Server | undefined;
let owned = false;
let base = '';
let workerId = '';

class Browser {
  private cookies = new Map<string, string>();
  async request(path: string, body?: any, method = body ? 'POST' : 'GET') {
    const response = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', Cookie: [...this.cookies].map(([key, value]) => `${key}=${value}`).join('; ') },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(10000),
    });
    for (const cookie of response.headers.getSetCookie()) {
      const [pair] = cookie.split(';');
      const index = pair.indexOf('=');
      const key = pair.slice(0, index), value = pair.slice(index + 1);
      if (/Max-Age=0(?:;|$)/.test(cookie)) this.cookies.delete(key);
      else this.cookies.set(key, value);
    }
    return { status: response.status, body: await response.json() };
  }
}

const admin = new Browser();
const worker = new Browser();

function address() {
  const region = geographicOptions('regions').find((item: any) => item.code === '0400000000');
  const province = geographicOptions('provinces', region.code).find((item: any) => item.name === 'Cavite');
  const city = geographicOptions('cities', province.code).find((item: any) => item.name === 'City of Imus');
  const barangay = geographicOptions('barangays', city.code)[0];
  return validateAddress({ regionCode: region.code, provinceCode: province.code, cityCode: city.code,
    barangayCode: barangay.code, houseNumber: '17', streetName: 'Synthetic Test Street', zipCode: '4103' });
}

function decodedMail(raw: string) {
  const [headers, ...bodyParts] = raw.split('\n\n');
  const body = bodyParts.join('\n\n');
  if (/Content-Transfer-Encoding: base64/i.test(headers)) return Buffer.from(body.replace(/\s/g, ''), 'base64').toString('utf8');
  return body.replace(/=\n/g, '').replace(/=([A-F0-9]{2})/g, (_match, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function codeAt(index: number) {
  const text = decodedMail(messages[index] || '');
  const match = text.match(/code is (\d{6})/i);
  assert.ok(match, 'the local SMTP capture should contain a six-digit email code');
  return match[1];
}

before(async () => {
  root = await mysql.createConnection({ host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '' });
  assert.match(database, /^bjmp_account_mail_test_\d+_[a-f0-9]{6}$/);
  await root.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4`);
  owned = true;

  smtp = net.createServer(socket => {
    let input = '', data = false, content = '';
    socket.setEncoding('utf8');
    socket.write('220 localhost test SMTP\r\n');
    socket.on('data', chunk => {
      input += chunk;
      let position: number;
      while ((position = input.indexOf('\r\n')) >= 0) {
        const line = input.slice(0, position);
        input = input.slice(position + 2);
        if (data) {
          if (line === '.') { messages.push(content); content = ''; data = false; socket.write('250 queued for local test\r\n'); }
          else content += `${line}\n`;
          continue;
        }
        if (/^EHLO|^HELO/i.test(line)) socket.write('250-localhost\r\n250 AUTH PLAIN\r\n');
        else if (/^AUTH/i.test(line)) socket.write('235 authenticated\r\n');
        else if (/^DATA/i.test(line)) { data = true; socket.write('354 End with a dot\r\n'); }
        else if (/^QUIT/i.test(line)) socket.end('221 bye\r\n');
        else socket.write('250 OK\r\n');
      }
    });
  });
  smtp.listen(0, '127.0.0.1');
  await once(smtp, 'listening');

  Object.assign(process.env, {
    DB_NAME: database,
    NODE_ENV: 'test',
    PORT: '0',
    SESSION_SECRET: randomBytes(32).toString('hex'),
    INITIAL_ADMIN_EMAIL: 'mail-test-admin@example.invalid',
    INITIAL_ADMIN_PASSWORD: adminPassword,
    INITIAL_WORKER_PASSWORD: '',
    SMTP_HOST: '127.0.0.1',
    SMTP_PORT: String((smtp.address() as net.AddressInfo).port),
    SMTP_SECURE: 'false',
    SMTP_USER: 'test@example.invalid',
    SMTP_PASS: 'test-only',
    SMTP_FROM: 'test@example.invalid',
    SMS_PROVIDER: 'mock',
  });
  backend = await import('../backend/index.ts');
  db = await import('../backend/database/db.ts');
  if (!backend.server.listening) await once(backend.server, 'listening');
  backend.app.set('trust proxy', 'loopback');
  base = `http://127.0.0.1:${(backend.server.address() as net.AddressInfo).port}/api`;

  const auth = await import('../backend/auth.ts');
  const created = await db.createUser({
    role: 'WORKER', firstName: 'Sample', middleName: 'Test', lastName: 'Worker', suffix: '',
    dateOfBirth: '1990-01-15', gender: 'Male', email: workerEmail, mobileNumber: workerPhone,
    address: address(), passwordHash: await auth.hashPass(workerPassword), accountStatus: 'ACTIVATED', emailVerifiedAt: new Date(),
  });
  workerId = created.id;
  await db.pool.query('UPDATE users SET phone_verified_at=NOW() WHERE id=?', [workerId]);
});

after(async () => {
  if (backend?.server?.listening) await new Promise<void>(resolve => backend.server.close(() => resolve()));
  if (db?.pool) await db.pool.end();
  if (smtp?.listening) await new Promise<void>(resolve => smtp!.close(() => resolve()));
  if (owned && root) {
    assert.match(database, /^bjmp_account_mail_test_\d+_[a-f0-9]{6}$/);
    await root.query(`DROP DATABASE \`${database}\``);
  }
  await root?.end();
});

test('public visitor account creation stays disabled; visitors are entered by staff', async () => {
  const response = await new Browser().request('/auth/register', {
    firstName: 'Unregistered', lastName: 'Visitor', email: 'public-signup@example.invalid', password: 'Visitor!Password123',
  });
  assert.equal(response.status, 410);
  assert.match(response.body.error, /registered by authorized personnel/i);
  const [rows] = await db.pool.query('SELECT id FROM users WHERE email=?', ['public-signup@example.invalid']);
  assert.equal(rows.length, 0);
});

test('worker profile edits skip OTP, alert administrators, and email the decision note after approval', async () => {
  assert.equal((await admin.request('/auth/login', { identifier: 'mail-test-admin@example.invalid', password: adminPassword })).status, 200);
  assert.equal((await worker.request('/auth/login', { identifier: workerEmail, password: workerPassword })).status, 200);
  const current = (await worker.request('/auth/me')).body.user;
  const mailCount = messages.length;
  const submitted = await worker.request('/account-changes/profile', { ...current, firstName: 'Updated' });
  assert.equal(submitted.status, 200, JSON.stringify(submitted.body));
  assert.equal(submitted.body.awaitingApproval, true);
  assert.equal(submitted.body.adminNotified, true);
  assert.equal(messages.length, mailCount + 1, 'only the administrator notification is sent when a worker edits a profile');
  const adminMail = decodedMail(messages.at(-1)!);
  assert.match(adminMail, /Sample Worker/);
  assert.match(adminMail, /First name/);
  assert.doesNotMatch(adminMail, /verification code is \d{6}/i);
  assert.equal((await admin.request('/account-changes/admin/requests/count')).body.count, 1);

  const requests = await admin.request('/account-changes/admin/requests');
  assert.equal(requests.status, 200);
  assert.equal(requests.body.length, 1);
  assert.equal(requests.body[0].workerName, 'Sample Test Worker');
  assert.equal((await admin.request(`/account-changes/admin/requests/${requests.body[0].id}/review`, {
    decision: 'APPROVE', reason: 'The requested profile information was reviewed and confirmed.',
  })).status, 200);
  assert.equal(messages.length, mailCount + 2);
  assert.match(decodedMail(messages.at(-1)!), /The requested profile information was reviewed and confirmed\./);
  assert.equal((await admin.request('/account-changes/admin/requests/count')).body.count, 0);
  assert.equal((await worker.request('/auth/me')).status, 401, 'approval invalidates the worker session');
  assert.equal((await worker.request('/auth/login', { identifier: workerEmail, password: workerPassword })).status, 200);
  assert.equal((await worker.request('/auth/me')).body.user.firstName, 'Updated');
});

test('forgot password accepts email or associated phone, sends only email, allows immediate resend, and holds worker reset for approval', async () => {
  const before = messages.length;
  const byPhone = await worker.request('/auth/forgot-password', { identifier: workerPhone });
  const absent = await new Browser().request('/auth/forgot-password', { identifier: '+639170000001' });
  assert.deepEqual(byPhone.body, absent.body, 'public recovery responses do not reveal whether an account exists');
  assert.equal(messages.length, before + 1);
  assert.match(messages.at(-1)!, new RegExp(workerEmail));
  assert.equal(messages.at(-1)!.match(/To:/i)?.[0], 'To:');
  const oldCode = codeAt(before);

  const byEmail = await worker.request('/auth/forgot-password', { identifier: workerEmail });
  assert.deepEqual(byEmail.body, byPhone.body);
  assert.equal(messages.length, before + 2, 'resend is available immediately');
  const newCode = codeAt(before + 1);
  const [codes] = await db.pool.query<any[]>(`SELECT id,created_at,expires_at,used_at FROM auth_otps
    WHERE user_id=? AND purpose='PASSWORD_RESET' ORDER BY id DESC LIMIT 2`, [workerId]);
  assert.equal(codes.length, 2);
  assert.ok(codes[1].used_at, 'resending invalidates the earlier code');
  const [[expiry]] = await db.pool.query<any[]>(`SELECT TIMESTAMPDIFF(SECOND,created_at,expires_at) AS seconds
    FROM auth_otps WHERE id=?`, [codes[0].id]);
  assert.ok(Number(expiry.seconds) >= 299 && Number(expiry.seconds) <= 301, 'a recovery code is valid for five minutes');

  assert.equal((await worker.request('/auth/verify-reset', { identifier: workerPhone, code: oldCode })).status, 400);
  const verified = await worker.request('/auth/verify-reset', { identifier: workerEmail, code: newCode });
  assert.equal(verified.status, 200, JSON.stringify(verified.body));
  const reset = await worker.request('/auth/reset-password', {
    identifier: workerPhone, token: verified.body.token,
    password: 'Recovered!Password123', confirmPassword: 'Recovered!Password123',
  });
  assert.equal(reset.status, 200, JSON.stringify(reset.body));
  assert.equal(reset.body.awaitingApproval, true);
  assert.match(decodedMail(messages.at(-1)!), /password recovery request/i);
  assert.match(decodedMail(messages.at(-1)!), /Updated Worker/);
  assert.equal((await worker.request('/auth/login', { identifier: workerEmail, password: workerPassword })).status, 200,
    'the old password remains active until the administrator approves');
  assert.equal((await worker.request('/auth/login', { identifier: workerEmail, password: 'Recovered!Password123' })).status, 401);

  const pending = await admin.request('/account-changes/admin/requests');
  assert.equal(pending.status, 200);
  assert.equal(pending.body.length, 1);
  assert.equal(pending.body[0].source, 'PASSWORD_RECOVERY');
  const decision = await admin.request(`/account-changes/admin/requests/${pending.body[0].id}/review`, {
    decision: 'APPROVE', reason: 'Identity and recovery request were confirmed.',
  });
  assert.equal(decision.status, 200, JSON.stringify(decision.body));
  assert.match(decodedMail(messages.at(-1)!), /Identity and recovery request were confirmed\./);
  assert.equal((await worker.request('/auth/login', { identifier: workerEmail, password: 'Recovered!Password123' })).status, 200);
});
