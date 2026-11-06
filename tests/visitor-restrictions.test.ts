import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { once } from 'node:events';

dotenv.config({ quiet: true });

const database = `bjmp_visitor_restriction_test_${Date.now()}_${randomBytes(3).toString('hex')}`;
const adminPassword = `TestOnly!2026_${randomBytes(8).toString('hex')}`;
const workerPassword = `WorkerOnly!2026_${randomBytes(8).toString('hex')}`;
const signatureData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a+j8AAAAASUVORK5CYII=';
let root: mysql.Connection | undefined;
let db: any;
let backend: any;
let owned = false;
let base = '';

class Browser {
  private cookies = new Map<string, string>();
  async request(path: string, body?: any, method = body ? 'POST' : 'GET') {
    const response = await fetch(base + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Cookie: [...this.cookies].map(([key, value]) => `${key}=${value}`).join('; '),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(10000),
    });
    for (const cookie of response.headers.getSetCookie()) {
      const [pair] = cookie.split(';');
      const i = pair.indexOf('=');
      const key = pair.slice(0, i), value = pair.slice(i + 1);
      if (/Max-Age=0(?:;|$)/.test(cookie)) this.cookies.delete(key);
      else this.cookies.set(key, value);
    }
    return { status: response.status, body: await response.json() };
  }
}

const admin = new Browser();
const worker = new Browser();
let pdlA = '', pdlB = '', todayWeekday = 0;
const visitors = new Map<string, { id: string; code: string; qr: string }>();

before(async () => {
  assert.match(database, /^bjmp_visitor_restriction_test_\d+_[a-f0-9]{6}$/);
  root = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  });
  await root.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4`);
  owned = true;

  Object.assign(process.env, {
    DB_NAME: database,
    NODE_ENV: 'test',
    PORT: '0',
    SESSION_SECRET: randomBytes(32).toString('hex'),
    INITIAL_ADMIN_EMAIL: 'restriction-admin@example.invalid',
    INITIAL_ADMIN_PASSWORD: adminPassword,
    INITIAL_WORKER_EMAIL: 'restriction-worker@example.invalid',
    INITIAL_WORKER_PASSWORD: workerPassword,
    SMS_PROVIDER: 'mock',
  });

  backend = await import('../backend/index.ts');
  db = await import('../backend/database/db.ts');
  assert.equal(process.env.DB_NAME, database, 'application must retain the isolated test database name');
  const [[dbName]] = await db.pool.query('SELECT DATABASE() AS name');
  assert.equal(dbName.name, database, 'application pool must use the isolated test database');
  if (!backend.server.listening) await once(backend.server, 'listening');
  base = `http://127.0.0.1:${(backend.server.address() as any).port}/api`;

  const adminLogin = await admin.request('/auth/login', { identifier: process.env.INITIAL_ADMIN_EMAIL, password: adminPassword });
  assert.equal(adminLogin.status, 200, JSON.stringify(adminLogin.body));
  const workerLogin = await worker.request('/auth/login', { identifier: process.env.INITIAL_WORKER_EMAIL, password: workerPassword });
  assert.equal(workerLogin.status, 200, JSON.stringify(workerLogin.body));

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  todayWeekday = new Date(`${today}T12:00:00+08:00`).getDay();
  pdlA = 'restriction-test-pdl-a';
  pdlB = 'restriction-test-pdl-b';
  for (const [id, number, first, last, cell] of [
    [pdlA, 'RT-PDL-A', 'Test', 'Alpha', 'Cell A'],
    [pdlB, 'RT-PDL-B', 'Test', 'Beta', 'Cell B'],
  ]) {
    await db.pool.query(`INSERT INTO pdls(id,pdl_number,first_name,last_name,sex,jail_facility_id,cell_dormitory,status)
      VALUES(?,?,?,?,?,'imus-city-jail-male',?,'In Custody')`, [id, number, first, last, 'Male', cell]);
    const scheduled = await admin.request(`/visitor-records/admin/schedules/${id}`, { weekday: todayWeekday, reason: 'Synthetic restriction test schedule' }, 'PUT');
    assert.equal(scheduled.status, 200, JSON.stringify(scheduled.body));
  }

  for (const name of ['Multi PDL Visitor', 'Single PDL Visitor', 'Facility Visitor', 'Temporary Visitor', 'Reinstated Visitor']) {
    const created = await admin.request('/visitor-records/admin/visitors', {
      fullName: name,
      gender: 'Female',
      address: 'Synthetic test address',
      age: 32,
      contactNumber: '09123456789',
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const visitor = created.body.visitor;
    visitors.set(name, { id: String(visitor.id), code: visitor.visitor_code, qr: '' });
    const approvalPdls = name === 'Multi PDL Visitor' ? [pdlA, pdlB] : [pdlA];
    for (const pdlId of approvalPdls) {
      const approved = await admin.request(`/visitor-records/admin/visitors/${visitor.id}/approve`, { pdlId, relationship: 'Relative' });
      assert.equal(approved.status, 200, JSON.stringify(approved.body));
    }
    const qr = await admin.request(`/visitor-records/admin/visitors/${visitor.id}/qr`);
    assert.equal(qr.status, 200, JSON.stringify(qr.body));
    visitors.get(name)!.qr = qr.body.qr_token;
  }
});

after(async () => {
  if (backend?.server?.listening) await new Promise<void>((resolve) => backend.server.close(() => resolve()));
  if (db?.pool) await db.pool.end();
  if (owned && root) {
    assert.match(database, /^bjmp_visitor_restriction_test_\d+_[a-f0-9]{6}$/);
    await root.query(`DROP DATABASE \`${database}\``);
  }
  await root?.end();
});

async function restrict(visitorName: string, scope: 'PDL' | 'FACILITY', pdlId?: string, expiresAt?: string) {
  const visitor = visitors.get(visitorName)!;
  return admin.request('/visitor-records/admin/restrictions', {
    visitorId: visitor.id,
    scope,
    pdlId,
    reason: 'Synthetic restriction test reason',
    requestedBy: 'PDL request recorded by administrator',
    details: 'Synthetic test only.',
    effectiveAt: new Date(Date.now() - 60000).toISOString(),
    expiresAt,
  });
}

async function verify(visitorName: string, pdlId: string) {
  return worker.request(`/visitor-records/worker/verify/${visitors.get(visitorName)!.id}/${pdlId}`);
}

async function guestCheckIn(visitorName: string) {
  const visitor = visitors.get(visitorName)!;
  return worker.request('/visitor-records/worker/guest-checkins', {
    visitorId: visitor.id,
    fullName: visitorName,
    gender: 'Female',
    address: 'Synthetic test address',
    age: 32,
    contactNumber: '09123456789',
    purposeOfVisit: 'Authorized facility business for test purposes',
    signatureData,
  });
}

async function pdlCheckIn(visitorName: string, pdlId: string) {
  return worker.request('/visitor-records/worker/pdl-checkins', {
    visitorId: visitors.get(visitorName)!.id,
    pdlId,
    signatureData,
  });
}

async function checkOut(type: 'PDL' | 'GUEST', id: string) {
  const result = await worker.request(`/visitor-records/worker/visits/${type}/${id}/checkout`, {}, 'POST');
  assert.equal(result.status, 200, JSON.stringify(result.body));
}

test('PDL-specific, facility-wide, temporary, and removed restrictions follow scope and preserve visitor identity', async () => {
  const multi = visitors.get('Multi PDL Visitor')!;
  const pdlBan = await restrict('Multi PDL Visitor', 'PDL', pdlA);
  assert.equal(pdlBan.status, 201, JSON.stringify(pdlBan.body));
  assert.equal((await worker.request('/visitor-records/admin/restrictions', { visitorId: multi.id, scope: 'PDL', pdlId: pdlA, reason: 'Worker must not manage restrictions' })).status, 403);

  const deniedA = await verify('Multi PDL Visitor', pdlA);
  assert.equal(deniedA.body.code, 'PDL_RESTRICTION');
  assert.equal(deniedA.body.otherApprovedPdls.some((p: any) => p.pdl_id === pdlB), true);
  assert.equal((await pdlCheckIn('Multi PDL Visitor', pdlA)).status, 403, 'direct PDL check-in must enforce the restriction');

  const allowedB = await verify('Multi PDL Visitor', pdlB);
  assert.equal(allowedB.body.allowed, true);
  const pdlVisit = await pdlCheckIn('Multi PDL Visitor', pdlB);
  assert.equal(pdlVisit.status, 201, JSON.stringify(pdlVisit.body));
  await checkOut('PDL', pdlVisit.body.id);
  const guestVisit = await guestCheckIn('Multi PDL Visitor');
  assert.equal(guestVisit.status, 201, JSON.stringify(guestVisit.body));
  await checkOut('GUEST', guestVisit.body.id);
  assert.equal((await admin.request(`/visitor-records/admin/visitors/${multi.id}/qr`)).body.qr_token, multi.qr);

  const single = await restrict('Single PDL Visitor', 'PDL', pdlA);
  assert.equal(single.status, 201, JSON.stringify(single.body));
  assert.equal((await verify('Single PDL Visitor', pdlA)).body.code, 'PDL_RESTRICTION');
  assert.equal((await verify('Single PDL Visitor', pdlB)).body.code, 'UNAUTHORIZED');
  const singleGuest = await guestCheckIn('Single PDL Visitor');
  assert.equal(singleGuest.status, 201, JSON.stringify(singleGuest.body));
  await checkOut('GUEST', singleGuest.body.id);

  const facility = await restrict('Facility Visitor', 'FACILITY');
  assert.equal(facility.status, 201, JSON.stringify(facility.body));
  assert.equal((await verify('Facility Visitor', pdlA)).body.code, 'FACILITY_RESTRICTION');
  assert.equal((await pdlCheckIn('Facility Visitor', pdlA)).status, 403);
  assert.equal((await guestCheckIn('Facility Visitor')).status, 403);

  const tempUntil = new Date(Date.now() + 60000).toISOString();
  const temporary = await restrict('Temporary Visitor', 'PDL', pdlA, tempUntil);
  assert.equal(temporary.status, 201, JSON.stringify(temporary.body));
  assert.equal((await verify('Temporary Visitor', pdlA)).body.code, 'PDL_RESTRICTION');
  await db.pool.query('UPDATE visitor_restrictions SET expires_at=DATE_SUB(NOW(),INTERVAL 1 SECOND) WHERE id=?', [temporary.body.restrictionId]);
  assert.equal((await verify('Temporary Visitor', pdlA)).body.allowed, true);
  const listed = await admin.request('/visitor-records/admin/restrictions?q=Temporary%20Visitor');
  assert.equal(listed.body.some((row: any) => Number(row.id) === temporary.body.restrictionId && row.expired), true);

  const reinstated = visitors.get('Reinstated Visitor')!;
  const removable = await restrict('Reinstated Visitor', 'PDL', pdlA);
  assert.equal(removable.status, 201, JSON.stringify(removable.body));
  assert.equal((await verify('Reinstated Visitor', pdlA)).body.allowed, false);
  const removed = await admin.request(`/visitor-records/admin/restrictions/${removable.body.restrictionId}/remove`, { reason: 'Administrator reinstated visitor authorization.' });
  assert.equal(removed.status, 200, JSON.stringify(removed.body));
  assert.equal((await verify('Reinstated Visitor', pdlA)).body.allowed, true);
  assert.equal((await admin.request(`/visitor-records/admin/visitors/${reinstated.id}/qr`)).body.qr_token, reinstated.qr);
  const history = await admin.request(`/visitor-records/admin/visitors/${reinstated.id}`);
  assert.equal(history.body.restrictions.some((row: any) => Number(row.id) === removable.body.restrictionId && row.status === 'REMOVED'), true);
  const assignments = await db.pool.query('SELECT pdl_id,status FROM pdl_visitor_assignments WHERE visitor_record_id=? ORDER BY pdl_id', [multi.id]);
  assert.deepEqual(assignments[0].map((row: any) => row.status), ['APPROVED', 'APPROVED']);
});
