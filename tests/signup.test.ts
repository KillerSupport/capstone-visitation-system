import test from 'node:test';
import assert from 'node:assert/strict';
import { ageOn, manilaDate, strongPassword, validatePerson } from '../backend/validation.ts';
import { geographicOptions, zipSuggestions } from '../backend/geography.ts';
import { birthdateCutoff } from '../frontend/src/components/Common/IdentityFields.tsx';

test('signup accepts the 18th birthday and older users, and rejects the day before turning 18', () => {
  const today = manilaDate(), [year, month, day] = today.split('-').map(Number);
  const birthday = birthdateCutoff(18, today);
  const notYet18 = new Date(Date.UTC(year - 18, month - 1, day + 1)).toISOString().slice(0, 10);
  const person = { firstName: 'Test', lastName: 'Visitor', dateOfBirth: birthday };
  assert.equal(ageOn(birthday, today), 18);
  assert.doesNotThrow(() => validatePerson(person));
  assert.doesNotThrow(() => validatePerson({ ...person, dateOfBirth: birthdateCutoff(19, today) }));
  assert.throws(() => validatePerson({ ...person, dateOfBirth: notYet18 }), /at least 18/);
  assert.throws(() => validatePerson({ ...person, dateOfBirth: '2099-01-01' }), /valid birthdate/);
  assert.throws(() => validatePerson({ ...person, dateOfBirth: '2008-02-30' }), /valid birthdate/);
});

test('the date picker cutoff follows calendar birthdays, including leap days', () => {
  assert.equal(birthdateCutoff(18, '2026-10-28'), '2008-10-28');
  assert.equal(birthdateCutoff(18, '2024-02-29'), '2006-02-28');
  assert.equal(birthdateCutoff(18, '2026-02-28'), '2008-02-28');
  assert.equal(birthdateCutoff(18, '2026-03-01'), '2008-03-01');
});

test('passwords require eight characters, uppercase, lowercase, a digit and a symbol', () => {
  assert.equal(strongPassword('Abcdef1!'), true);
  for (const password of ['Abcd1!x', 'abcdef1!', 'ABCDEF1!', 'Abcdefg!', 'Abcdef12', 'Abcdef1 ', 'A1!' + 'a'.repeat(126)]) {
    assert.equal(strongPassword(password), false, password);
  }
  assert.equal(strongPassword('A1!' + 'a'.repeat(125)), true);
});

test('ZIP lookup resolves a single city ZIP and exact barangays in cities with multiple ZIPs', () => {
  const imus = geographicOptions('cities', '0402100000').find((x: any) => x.name === 'City of Imus');
  assert.deepEqual(zipSuggestions(imus.code), [{ code: '4103', area: 'Imus' }]);
  const imusBarangay = geographicOptions('barangays', imus.code)[0];
  assert.deepEqual(zipSuggestions(imus.code, imusBarangay.code), zipSuggestions(imus.code));

  const makati = geographicOptions('cities', '1300000000').find((x: any) => x.name === 'City of Makati');
  const belAir = geographicOptions('barangays', makati.code).find((x: any) => x.name === 'Bel-Air');
  assert.ok(zipSuggestions(makati.code).length > 1);
  assert.deepEqual(zipSuggestions(makati.code, belAir.code).map((x: any) => x.code), ['1209']);

  const quezon = geographicOptions('cities', '1300000000').find((x: any) => x.name === 'Quezon City');
  const sauyo = geographicOptions('barangays', quezon.code).find((x: any) => x.name === 'Sauyo');
  assert.deepEqual(zipSuggestions(quezon.code, sauyo.code).map((x: any) => x.code), ['1116']);
  assert.deepEqual(zipSuggestions(makati.code, imusBarangay.code), zipSuggestions(makati.code));
  assert.deepEqual(zipSuggestions('invalid-city'), []);
});
