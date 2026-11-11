import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { ageOn, validateCompanions, withinVisitWindow } from '../backend/validation.ts';
import { normalizePhilippineMobileNumber, normalizeEmail } from '../backend/identity.ts';
import { geographicOptions, validateAddress, zipSuggestions } from '../backend/geography.ts';

dotenv.config({ quiet: true });

const database = `bjmp_feature_test_${Date.now()}_${randomBytes(3).toString('hex')}`;
const adminPassword = `TestOnly!${randomBytes(12).toString('hex')}`;
let root: mysql.Connection | undefined;
let db: any;
let owned = false;

before(async () => {
  root = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  });
  assert.match(database, /^bjmp_feature_test_\d+_[a-f0-9]{6}$/);
  await root.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4`);
  owned = true;
  Object.assign(process.env, {
    DB_NAME: database,
    NODE_ENV: 'test',
    INITIAL_ADMIN_EMAIL: 'feature-admin@example.invalid',
    INITIAL_ADMIN_PASSWORD: adminPassword,
    INITIAL_WORKER_PASSWORD: '',
  });
  db = await import('../backend/database/db.ts');
  await db.initDatabase();
});

after(async () => {
  if (db?.pool) await db.pool.end();
  if (owned && root) {
    assert.match(database, /^bjmp_feature_test_\d+_[a-f0-9]{6}$/);
    await root.query(`DROP DATABASE \`${database}\``);
  }
  await root?.end();
});

test('age, leap-day, Philippine mobile, email, visit-window, and companion rules', () => {
  assert.equal(ageOn('2004-02-29', '2026-02-28'), 21);
  assert.equal(ageOn('2004-02-29', '2026-03-01'), 22);
  assert.equal(ageOn('2006-02-30', '2026-10-19'), null);
  assert.equal(ageOn('2027-01-01', '2026-10-19'), null);
  for (const value of ['09123456789', '+639123456789']) assert.equal(normalizePhilippineMobileNumber(value), '+639123456789');
  for (const value of ['+6309123456789', '+63912345678', '+6391234567890', '09abc456789']) assert.equal(normalizePhilippineMobileNumber(value), null);
  assert.equal(normalizeEmail(' TEST@Example.COM '), 'test@example.com');
  assert.equal(withinVisitWindow('2026-10-19', 'Morning Batch (09:00 AM - 11:30 AM)', new Date('2026-10-19T01:00:00Z')), true);
  assert.equal(withinVisitWindow('2026-10-19', 'Morning Batch (09:00 AM - 11:30 AM)', new Date('2026-10-19T04:00:00Z')), false);
  assert.equal(validateCompanions([]).length, 0);
  assert.throws(() => validateCompanions([{ fullName: 'Child', dateOfBirth: '2010-01-01', relationshipToPdl: 'Sibling' }]));
  assert.throws(() => validateCompanions([{ fullName: 'Adult', dateOfBirth: '1980-01-01', relationshipToPdl: 'Friend' }]));
});

test('nationwide address options include all regions and validate dependent locations', () => {
  assert.equal(geographicOptions('regions').length, 18);
  assert.equal(geographicOptions('provinces', '1300000000').length, 0);
  const ncrCities = geographicOptions('cities', '1300000000');
  assert.ok(ncrCities.length >= 17);
  for (const region of geographicOptions('regions')) {
    const provinces = geographicOptions('provinces', region.code);
    const cities = provinces.flatMap((province: any) => geographicOptions('cities', province.code))
      .concat(geographicOptions('cities', region.code));
    assert.ok(cities.length > 0, region.name);
    assert.ok(cities.some((city: any) => geographicOptions('barangays', city.code).length > 0), region.name);
  }
  const region = geographicOptions('regions').find((item: any) => item.code === '0400000000');
  const province = geographicOptions('provinces', region.code).find((item: any) => item.name === 'Cavite');
  const city = geographicOptions('cities', province.code).find((item: any) => item.name === 'City of Imus');
  const barangay = geographicOptions('barangays', city.code)[0];
  const imus = validateAddress({ regionCode: region.code, provinceCode: province.code, cityCode: city.code, barangayCode: barangay.code, houseNumber: '17', streetName: 'Test Street', zipCode: '4103' });
  assert.ok(imus.completeAddress.includes('City of Imus'));
  assert.ok(zipSuggestions(city.code).some((item: any) => item.code === '4103'));
  assert.throws(() => validateAddress({ ...imus, barangayCode: 'not-a-real-barangay' }));
  assert.ok(geographicOptions('barangays', '1380600000').length > 800);
});

test('demo PDL preparation keeps exactly three unique PDLs with seven approved visitors each', async () => {
  const skeletons = [
    { id: 'pdl-0f0c5e0f-4156-49eb-8053-f491b96e4555', firstName: 'Marc Lhester', lastName: 'Odullo' },
    { id: 'fictional-requested-pdl-002', firstName: 'John Paul Zapata', lastName: 'Yap' },
    { id: 'fictional-requested-pdl-003', firstName: 'Patrick Joseph', lastName: 'Ibanez' },
  ];
  for (const pdl of skeletons) {
    await db.createPdl({ ...pdl, sex: 'Male', emergencyContactPhone: '+639000000001', status: 'In Custody' });
  }

  const [visitor] = await db.pool.query<any>(`INSERT INTO visitor_records
    (visitor_code,full_name,gender,address,age,contact_number,status,created_by)
    VALUES('VIS-BAC-000003','Legacy Sample Visitor','Female','Synthetic test address',35,'+639111111111','ACTIVE',1)`);
  await db.pool.query('INSERT INTO visitor_qr_identities(visitor_record_id,qr_token) VALUES(?,?)', [visitor.insertId, randomBytes(32).toString('hex')]);
  await db.pool.query(`INSERT INTO pdl_visitor_assignments(visitor_record_id,pdl_id,relationship,status,approved_by)
    VALUES(?,?,'Relative','APPROVED',1)`, [visitor.insertId, skeletons[0].id]);

  const { prepareThreePdlDemo } = await import('../scripts/prepare-three-pdl-demo.ts');
  const firstRun = await prepareThreePdlDemo();
  const secondRun = await prepareThreePdlDemo();
  const pdls = await db.getAllPdls();
  assert.equal(firstRun.pdls.length, 3);
  assert.equal(secondRun.pdls.length, 3);
  assert.equal(pdls.length, 3);
  assert.deepEqual(pdls.map((pdl: any) => pdl.pdlNumber).sort(), ['PDL-000001', 'PDL-000002', 'PDL-000003']);
  assert.equal(new Set(pdls.map((pdl: any) => pdl.id)).size, 3);
  for (const pdl of pdls) {
    const [[count]] = await db.pool.query<any[]>(`SELECT COUNT(*) AS count FROM pdl_visitor_assignments
      WHERE pdl_id=? AND status='APPROVED'`, [pdl.id]);
    assert.equal(Number(count.count), 7, `${pdl.firstName} ${pdl.lastName} should have seven approved visitor slots filled`);
    assert.ok(String(pdl.presentAddress).includes('Cavite'));
  }
  const [[sequence]] = await db.pool.query<any[]>('SELECT last_number FROM pdl_number_sequence WHERE id=1');
  assert.equal(Number(sequence.last_number), 3);
  assert.equal(secondRun.nextPdlNumber, 'PDL-000004');
  const [[dupes]] = await db.pool.query<any[]>(`SELECT COUNT(*) AS count FROM (
    SELECT LOWER(TRIM(full_name)) AS normalized FROM visitor_records GROUP BY LOWER(TRIM(full_name)) HAVING COUNT(*)>1
  ) names`);
  assert.equal(Number(dupes.count), 0);
});
