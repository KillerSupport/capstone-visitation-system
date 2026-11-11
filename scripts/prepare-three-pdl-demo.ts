import { randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { initDatabase, pool } from '../backend/database/db.js';

const batch = 'FICTIONAL-PDL-NAME-SAMPLES-20-V1';
const basePdlId = 'pdl-0f0c5e0f-4156-49eb-8053-f491b96e4555';
const retainedPdls = [
  { id: basePdlId, number: 'PDL-000001', name: 'Marc Lhester Odullo' },
  { id: 'fictional-requested-pdl-002', number: 'PDL-000002', name: 'John Paul Zapata Yap' },
  { id: 'fictional-requested-pdl-003', number: 'PDL-000003', name: 'Patrick Joseph Ibanez' },
];

const locations = {
  imus: { regionCode: '0400000000', region: 'Region IV-A (CALABARZON)', provinceCode: '0402100000', province: 'Cavite', cityCode: '0402109000', municipality: 'City of Imus', barangayCode: '0402109015', barangay: 'Malagasang II-A', zipCode: '4103' },
  bacoor: { regionCode: '0400000000', region: 'Region IV-A (CALABARZON)', provinceCode: '0402100000', province: 'Cavite', cityCode: '0402103000', municipality: 'City of Bacoor', barangayCode: '0402103014', barangay: 'Molino I', zipCode: '4102' },
  dasmarinas: { regionCode: '0400000000', region: 'Region IV-A (CALABARZON)', provinceCode: '0402100000', province: 'Cavite', cityCode: '0402106000', municipality: 'City of Dasmariñas', barangayCode: '0402106056', barangay: 'Paliparan III', zipCode: '4114' },
  lucena: { regionCode: '0400000000', region: 'Region IV-A (CALABARZON)', provinceCode: '0431299999', province: 'City of Lucena (Independent City)', cityCode: '0431200000', municipality: 'City of Lucena', barangayCode: '0431200002', barangay: 'Barangay 1', zipCode: '4301' },
  baguio: { regionCode: '1400000000', region: 'Cordillera Administrative Region (CAR)', provinceCode: '1430399999', province: 'City of Baguio (Independent City)', cityCode: '1430300000', municipality: 'City of Baguio', barangayCode: '1430300001', barangay: 'Apugan-Loakan', zipCode: '2600' },
  davao: { regionCode: '1100000000', region: 'Region XI (Davao Region)', provinceCode: '1130799999', province: 'City of Davao (Independent City)', cityCode: '1130700000', municipality: 'City of Davao', barangayCode: '1130700001', barangay: 'Acacia', zipCode: '8000' },
};

function address(place: keyof typeof locations, houseNumber: string, streetName: string, subdivision = 'Phase 1') {
  const location = locations[place];
  const values = [houseNumber, streetName, subdivision, location.barangay, location.municipality, location.province, location.region, location.zipCode];
  return {
    houseNumber, streetName, subdivision, ...location,
    houseUnitStreet: [houseNumber, streetName, subdivision, location.barangay].filter(Boolean).join(', '),
    completeAddress: values.filter(Boolean).join(', '), maritalStatus: 'Single',
  };
}

const imusPdlAddress = (id: string) => address('imus', `Block ${id} Lot ${id}`, 'Mahogany Street', 'Phase 1');

const pdlFamily = [
  {
    id: basePdlId, number: 'PDL-000001', civilStatus: 'Married', present: imusPdlAddress('1'), provincial: address('dasmarinas', 'Block 10 Lot 1', 'Sampaguita Street'),
    father: 'Danilo Villarama', fatherAddress: address('baguio', 'House 1', 'Loakan Road', 'Apugan'),
    mother: 'Rosalinda Flores Villarama', motherAddress: address('lucena', 'House 2', 'Quezon Avenue', 'Barangay 1'),
    spouse: 'Clarissa Manalo Villarama', children: ['Christian Villarama (7 y/o)', 'Chloe Villarama (3 y/o)'],
    siblings: ['Rafael Villarama', 'Miguel Villarama', 'Maricel Villarama'], emergency: 'Clarissa Manalo Villarama', relation: 'Spouse', phone: '+639000000001',
  },
  {
    id: 'fictional-requested-pdl-002', number: 'PDL-000002', civilStatus: 'Married', present: imusPdlAddress('2'), provincial: address('imus', 'Block 11 Lot 2', 'Rose Street', 'Phase 2'),
    father: 'Nestor Yap', fatherAddress: address('baguio', 'House 3', 'Loakan Road', 'Apugan'),
    mother: 'Cecilia Yap', motherAddress: address('lucena', 'House 4', 'Quezon Avenue', 'Barangay 1'),
    spouse: 'Aileen Yap', children: ['Nico Yap (20 y/o)', 'Bianca Yap (18 y/o)'],
    siblings: ['Pedro Yap', 'Mariel Yap'], emergency: 'Aileen Yap', relation: 'Spouse', phone: '+639000000002',
  },
  {
    id: 'fictional-requested-pdl-003', number: 'PDL-000003', civilStatus: 'Married', present: address('bacoor', 'Block 12 Lot 3', 'Molave Street'), provincial: address('dasmarinas', 'Block 12 Lot 3', 'Sampaguita Street'),
    father: 'Danilo Ibanez', fatherAddress: address('davao', 'House 5', 'Acacia Street', 'Acacia'),
    mother: 'Marites Ibanez', motherAddress: address('baguio', 'House 6', 'Loakan Road', 'Apugan'),
    spouse: 'Maribel Ibanez', children: ['Joaquin Ibanez (22 y/o)', 'Enzo Ibanez (19 y/o)'],
    siblings: ['Ramon Ibanez', 'Celine Ibanez'], emergency: 'Maribel Ibanez', relation: 'Spouse', phone: '+639000000003',
  },
];

const visitorSeeds = [
  { pdlId: basePdlId, code: 'VIS-BAC-DEMO-MARC-02', name: 'Danilo Villarama', gender: 'Male', age: 65, relationship: 'Parent', place: 'baguio', role: 'father' },
  { pdlId: basePdlId, code: 'VIS-BAC-DEMO-MARC-03', name: 'Rosalinda Flores Villarama', gender: 'Female', age: 63, relationship: 'Parent', place: 'lucena', role: 'mother' },
  { pdlId: basePdlId, code: 'VIS-BAC-DEMO-MARC-04', name: 'Clarissa Manalo Villarama', gender: 'Female', age: 31, relationship: 'Spouse', place: 'imus', role: 'spouse' },
  { pdlId: basePdlId, code: 'VIS-BAC-DEMO-MARC-05', name: 'Rafael Villarama', gender: 'Male', age: 27, relationship: 'Sibling', place: 'bacoor', role: 'sibling' },
  { pdlId: basePdlId, code: 'VIS-BAC-DEMO-MARC-06', name: 'Miguel Villarama', gender: 'Male', age: 25, relationship: 'Sibling', place: 'dasmarinas', role: 'sibling' },
  { pdlId: basePdlId, code: 'VIS-BAC-DEMO-MARC-07', name: 'Maricel Villarama', gender: 'Female', age: 24, relationship: 'Sibling', place: 'lucena', role: 'sibling' },

  { pdlId: 'fictional-requested-pdl-002', code: 'VIS-BAC-DEMO-JOHN-01', name: 'Nestor Yap', gender: 'Male', age: 69, relationship: 'Parent', place: 'baguio', role: 'father' },
  { pdlId: 'fictional-requested-pdl-002', code: 'VIS-BAC-DEMO-JOHN-02', name: 'Cecilia Yap', gender: 'Female', age: 66, relationship: 'Parent', place: 'lucena', role: 'mother' },
  { pdlId: 'fictional-requested-pdl-002', code: 'VIS-BAC-DEMO-JOHN-03', name: 'Aileen Yap', gender: 'Female', age: 44, relationship: 'Spouse', place: 'imus', role: 'spouse' },
  { pdlId: 'fictional-requested-pdl-002', code: 'VIS-BAC-DEMO-JOHN-04', name: 'Nico Yap', gender: 'Male', age: 20, relationship: 'Child', place: 'imus', role: 'child' },
  { pdlId: 'fictional-requested-pdl-002', code: 'VIS-BAC-DEMO-JOHN-05', name: 'Bianca Yap', gender: 'Female', age: 18, relationship: 'Child', place: 'bacoor', role: 'child' },
  { pdlId: 'fictional-requested-pdl-002', code: 'VIS-BAC-DEMO-JOHN-06', name: 'Pedro Yap', gender: 'Male', age: 42, relationship: 'Sibling', place: 'lucena', role: 'sibling' },
  { pdlId: 'fictional-requested-pdl-002', code: 'VIS-BAC-DEMO-JOHN-07', name: 'Mariel Yap', gender: 'Female', age: 38, relationship: 'Sibling', place: 'dasmarinas', role: 'sibling' },

  { pdlId: 'fictional-requested-pdl-003', code: 'VIS-BAC-DEMO-PATRICK-01', name: 'Danilo Ibanez', gender: 'Male', age: 70, relationship: 'Parent', place: 'davao', role: 'father' },
  { pdlId: 'fictional-requested-pdl-003', code: 'VIS-BAC-DEMO-PATRICK-02', name: 'Marites Ibanez', gender: 'Female', age: 67, relationship: 'Parent', place: 'baguio', role: 'mother' },
  { pdlId: 'fictional-requested-pdl-003', code: 'VIS-BAC-DEMO-PATRICK-03', name: 'Maribel Ibanez', gender: 'Female', age: 43, relationship: 'Spouse', place: 'bacoor', role: 'spouse' },
  { pdlId: 'fictional-requested-pdl-003', code: 'VIS-BAC-DEMO-PATRICK-04', name: 'Joaquin Ibanez', gender: 'Male', age: 22, relationship: 'Child', place: 'imus', role: 'child' },
  { pdlId: 'fictional-requested-pdl-003', code: 'VIS-BAC-DEMO-PATRICK-05', name: 'Enzo Ibanez', gender: 'Male', age: 19, relationship: 'Child', place: 'dasmarinas', role: 'child' },
  { pdlId: 'fictional-requested-pdl-003', code: 'VIS-BAC-DEMO-PATRICK-06', name: 'Ramon Ibanez', gender: 'Male', age: 45, relationship: 'Sibling', place: 'lucena', role: 'sibling' },
  { pdlId: 'fictional-requested-pdl-003', code: 'VIS-BAC-DEMO-PATRICK-07', name: 'Celine Ibanez', gender: 'Female', age: 40, relationship: 'Sibling', place: 'bacoor', role: 'sibling' },
];

const legacyVisitorCode = 'VIS-BAC-000003';

async function pdlReferences(conn: any, table: string, column: string, id: string) {
  const [[row]] = await conn.query<any[]>(`SELECT COUNT(*) AS count FROM \`${table}\` WHERE \`${column}\`=?`, [id]);
  return Number(row.count || 0);
}

async function audit(conn: any, actorId: number, action: string, targetType: string, targetId: string | number, details: unknown) {
  await conn.query(`INSERT INTO audit_logs(actor_user_id,actor_role,action,target_type,target_id,result,details,ip_address)
    VALUES(?,'ADMIN',?,?,?,'SUCCESS',?,NULL)`, [actorId, action, targetType, String(targetId), JSON.stringify(details)]);
}

export async function prepareThreePdlDemo() {
  await initDatabase();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [users] = await conn.query<any[]>("SELECT id FROM users WHERE id=1 AND role='ADMIN' AND is_archived=0 FOR UPDATE");
    if (!users[0]) throw new Error('The local admin account (user ID 1) was not found; no sample changes were made.');
    const adminId = Number(users[0].id);
    const [allPdls] = await conn.query<any[]>('SELECT id,pdl_number,first_name,middle_name,last_name,demo_batch,is_archived,status FROM pdls FOR UPDATE');
    const targetIds = new Set(retainedPdls.map(p => p.id));
    for (const wanted of retainedPdls) {
      const row = allPdls.find(p => p.id === wanted.id);
      if (!row) throw new Error(`Required sample PDL ${wanted.name} was not found; no sample changes were made.`);
      const existingName = [row.first_name,row.middle_name,row.last_name].filter(Boolean).join(' ');
      if (existingName.trim().toLowerCase() !== wanted.name.toLowerCase()) throw new Error(`The record ID for ${wanted.name} no longer matches; no sample changes were made.`);
    }
    const unrelated = allPdls.filter(p => !targetIds.has(p.id) && p.demo_batch !== batch);
    if (unrelated.length) throw new Error(`Found ${unrelated.length} unrelated PDL record(s); refusing to remove or renumber them.`);
    const removeIds = allPdls.filter(p => p.demo_batch === batch && !targetIds.has(p.id)).map(p => String(p.id));
    const protectedTables = [
      ['pdl_schedule_notifications','pdl_id'], ['pdl_visitation_logs','pdl_id'], ['pdl_visitation_schedules','pdl_id'],
      ['pdl_visitor_assignments','pdl_id'], ['pdl_visitor_links','pdl_id'], ['visitor_pdl_schedule_events','pdl_id'], ['visitor_restrictions','pdl_id'],
    ];
    for (const id of removeIds) {
      for (const [table,column] of protectedTables) {
        const count = await pdlReferences(conn, table, column, id);
        if (count) throw new Error(`Sample PDL ${id} has linked ${table} data; refusing to delete it.`);
      }
    }

    const [admins] = await conn.query<any[]>("SELECT id FROM jail_facilities WHERE id IN ('imus-city-jail-male','imus-city-jail-female')");
    if (admins.length !== 2) throw new Error('Both Imus facilities must exist before preparing sample records.');

    if (removeIds.length) {
      const marks = removeIds.map(() => '?').join(',');
      await conn.query(`DELETE FROM pdl_form_records WHERE pdl_id IN (${marks})`, removeIds);
      await conn.query(`DELETE FROM pdls WHERE id IN (${marks}) AND demo_batch=?`, [...removeIds,batch]);
    }

    const [numberConflicts] = await conn.query<any[]>(`SELECT id FROM pdls WHERE pdl_number='PDL-000001' AND id<>?`, [basePdlId]);
    if (numberConflicts.length) throw new Error('PDL-000001 is in use by another record; numbering was not changed.');

    for (const family of pdlFamily) {
      const [records] = await conn.query<any[]>(`SELECT id,form_data FROM pdl_form_records WHERE pdl_id=? AND record_type='PDL_PROFILE' FOR UPDATE`, [family.id]);
      if (!records[0]) throw new Error(`The structured profile for ${retainedPdls.find(p => p.id === family.id)?.name} was not found.`);
      const profile = JSON.parse(records[0].form_data || '{}');
      const pdlAddress = family.present.completeAddress;
      const provincial = family.provincial.completeAddress;
      const alias = family.id === basePdlId ? 'Dodong' : '';
      Object.assign(profile, {
        aliases: alias,
        presentAddress: pdlAddress, presentAddressDetails: family.present,
        provincialAddress: provincial, provincialAddressDetails: family.provincial,
        fatherName: family.father, fatherAddress: family.fatherAddress.completeAddress, fatherAddressDetails: family.fatherAddress,
        motherName: family.mother, motherAddress: family.motherAddress.completeAddress, motherAddressDetails: family.motherAddress,
        spouseName: family.spouse, numberOfChildren: family.children.length, childrenNames: family.children,
        siblingsNames: family.siblings,
        emergencyContactPerson: family.emergency, emergencyContactRelation: family.relation,
        emergencyContactAddress: pdlAddress, emergencyContactAddressDetails: family.present,
        emergencyContactPhone: family.phone,
        allowedVisitorRelationship: ['Spouse','Parent','Child','Sibling','Legal Counsel', ...(family.id === basePdlId ? ['Relative'] : [])],
        primaryOffense: 'Not provided',
        courtBranch: 'Not assigned', presidingJudge: 'Not assigned',
        caseStatus: 'Pending case details',
        criminalCaseNumbers: [],
        cases: [],
      });
      await conn.query(`UPDATE pdl_form_records SET form_data=?,updated_at=NOW() WHERE id=?`, [JSON.stringify(profile), records[0].id]);
      await conn.query(`UPDATE pdls SET pdl_number=?,aliases=?,civil_status=?,present_address=?,provincial_address=?,
        emergency_contact_person=?,emergency_contact_relation=?,emergency_contact_address=?,emergency_contact_phone=?,
        primary_offense=?,court_branch=?,presiding_judge=?,case_status=?,status='In Custody',is_archived=0 WHERE id=?`, [
        family.number, alias, family.civilStatus, pdlAddress, provincial, family.emergency, family.relation, pdlAddress, family.phone,
        'Not provided', 'Not assigned', 'Not assigned', 'Pending case details', family.id,
      ]);
    }

    for (let i = 0; i < visitorSeeds.length; i++) {
      const seed = visitorSeeds[i];
      const place = seed.place as keyof typeof locations;
      const visitAddress = address(place, `Block ${i + 1} Lot ${1 + (i % 7)}`, ['Mahogany Street','Sampaguita Street','Molave Street','Rose Street'][i % 4]);
      const phone = `+639${String(100000000 + i).padStart(9,'0')}`;
      const [existingVisitorRows] = await conn.query<any[]>('SELECT id,full_name,status,is_archived FROM visitor_records WHERE visitor_code=? FOR UPDATE', [seed.code]);
      let visitorId: number;
      if (existingVisitorRows[0]) {
        const saved = existingVisitorRows[0];
        if (saved.full_name !== seed.name || saved.status !== 'ACTIVE' || saved.is_archived) throw new Error(`Visitor code ${seed.code} is already used by another record.`);
        visitorId = Number(saved.id);
      } else {
        const [dupes] = await conn.query<any[]>('SELECT id,visitor_code FROM visitor_records WHERE LOWER(TRIM(full_name))=LOWER(TRIM(?)) LIMIT 1 FOR UPDATE', [seed.name]);
        if (dupes.length) throw new Error(`Visitor name ${seed.name} already exists under another ID; no duplicate was created.`);
        const [insert] = await conn.query<any>(`INSERT INTO visitor_records(visitor_code,full_name,gender,address,address_data,age,contact_number,status,created_by)
          VALUES(?,?,?,?,?,?,?,'ACTIVE',?)`, [seed.code,seed.name,seed.gender,visitAddress.completeAddress,JSON.stringify(visitAddress),seed.age,phone,adminId]);
        visitorId = Number(insert.insertId);
        await conn.query('INSERT INTO visitor_qr_identities(visitor_record_id,qr_token) VALUES(?,?)', [visitorId,randomBytes(32).toString('hex')]);
        await audit(conn,adminId,'VISITOR_REGISTERED','VISITOR',visitorId,{demo:true,visitorCode:seed.code});
      }
      await conn.query(`UPDATE visitor_records SET gender=?,address=?,address_data=?,age=?,contact_number=? WHERE id=?`, [seed.gender,visitAddress.completeAddress,JSON.stringify(visitAddress),seed.age,phone,visitorId]);
      const [existingAssignments] = await conn.query<any[]>('SELECT id,status,relationship FROM pdl_visitor_assignments WHERE visitor_record_id=? AND pdl_id=? FOR UPDATE', [visitorId,seed.pdlId]);
      let assignmentId: number;
      if (existingAssignments[0]) {
        if (existingAssignments[0].status !== 'APPROVED' || existingAssignments[0].relationship !== seed.relationship) throw new Error(`The existing approval for ${seed.name} does not match this sample list.`);
        assignmentId = Number(existingAssignments[0].id);
      } else {
        const [[count]] = await conn.query<any[]>('SELECT COUNT(*) AS count FROM pdl_visitor_assignments a JOIN visitor_records v ON v.id=a.visitor_record_id WHERE a.pdl_id=? AND a.status=\'APPROVED\' AND v.status=\'ACTIVE\' AND v.is_archived=0', [seed.pdlId]);
        if (Number(count.count) >= 7) throw new Error(`This PDL already has seven active approved visitors; cannot add ${seed.name}.`);
        const [insert] = await conn.query<any>(`INSERT INTO pdl_visitor_assignments(visitor_record_id,pdl_id,relationship,status,approved_by)
          VALUES(?,?,?,'APPROVED',?)`, [visitorId,seed.pdlId,seed.relationship,adminId]);
        assignmentId = Number(insert.insertId);
        await conn.query(`INSERT INTO pdl_visitor_assignment_events(assignment_id,action,relationship,reason,actor_user_id)
          VALUES(?,'APPROVED',?,?,?)`, [assignmentId,seed.relationship,'Approved by administrator.',adminId]);
        await audit(conn,adminId,'PDL_VISITOR_APPROVED','PDL_ASSIGNMENT',insert.insertId,{demo:true,pdlId:seed.pdlId,visitorId,relationship:seed.relationship});
      }
      await conn.query(`UPDATE pdl_visitor_assignment_events SET reason=? WHERE assignment_id=? AND action='APPROVED'`, ['Approved by administrator.',assignmentId]);
    }

    const [legacyVisitor] = await conn.query<any[]>('SELECT id FROM visitor_records WHERE visitor_code=?', [legacyVisitorCode]);
    if (!legacyVisitor[0]) throw new Error('The existing approved visitor for Marc Lhester Odullo was not found.');
    const [[legacyAssignmentCount]] = await conn.query<any[]>(`SELECT COUNT(*) AS count FROM pdl_visitor_assignments WHERE pdl_id=? AND status='APPROVED'`, [basePdlId]);
    if (Number(legacyAssignmentCount.count) !== 7) throw new Error('Marc Lhester Odullo must have exactly seven approved visitors.');
    for (const pdl of retainedPdls.slice(1)) {
      const [[count]] = await conn.query<any[]>(`SELECT COUNT(*) AS count FROM pdl_visitor_assignments WHERE pdl_id=? AND status='APPROVED'`, [pdl.id]);
      if (Number(count.count) !== 7) throw new Error(`${pdl.name} must have exactly seven approved visitors.`);
      await conn.query(`INSERT INTO pdl_visitation_schedules(pdl_id,weekday,version,updated_by) VALUES(?,2,1,?) ON DUPLICATE KEY UPDATE pdl_id=VALUES(pdl_id)`, [pdl.id,adminId]);
    }

    await conn.query('UPDATE pdl_number_sequence SET last_number=3 WHERE id=1');
    const [finalPdls] = await conn.query<any[]>('SELECT id,pdl_number FROM pdls ORDER BY pdl_number');
    if (finalPdls.length !== 3 || retainedPdls.some(p => !finalPdls.some(row => row.id === p.id && row.pdl_number === p.number))) {
      throw new Error('Final PDL list or numbers do not match the three-record sample set.');
    }
    await conn.commit();
    return { pdls: finalPdls, visitorsAddedOrKept: 21, approvedVisitorsPerPdl: 7, nextPdlNumber: 'PDL-000004', existingPdlAndVisitorPreserved: true };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log(await prepareThreePdlDemo()); }
  finally { await pool.end(); }
}
