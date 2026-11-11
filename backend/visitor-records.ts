import { Router } from 'express';
import { randomBytes, randomUUID } from 'node:crypto';
import { pool } from './database/db.js';
import { admin, requireDuty } from './auth.js';
import { normalizeEmail, normalizePhilippineMobileNumber } from './identity.js';
import { manilaDate } from './validation.js';

export const visitorRecordsRouter = Router();
const adminOnly = admin;
const gateStaff = requireDuty('GATE');
const visitorSelect = `SELECT id,visitor_code,full_name,gender,address,address_data,age,contact_number,contact_email,status,is_archived,created_at,updated_at
  FROM visitor_records`;
const clean = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max);
const parseAddressData = (value: unknown) => {
  if (value && typeof value === 'object') return value;
  try { return value ? JSON.parse(String(value)) : null; } catch { return null; }
};
const mapVisitor = (row: any) => ({ ...row, addressDetails: parseAddressData(row.address_data) });
const sqlDateTime = (value: unknown) => {
  if (!value) return null;
  const date = new Date(String(value));
  if (!Number.isFinite(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')} ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}:00`;
};
const makeVisitorCode = () => `VIS-BAC-${randomBytes(5).toString('hex').toUpperCase()}`;
const nowRestrictionSql = `status='ACTIVE' AND effective_at<=NOW() AND (expires_at IS NULL OR expires_at>NOW())`;

async function audit(conn: any, actor: any, action: string, targetType: string, targetId: string | number | null, details: any) {
  await conn.query(`INSERT INTO audit_logs(actor_user_id,actor_role,action,target_type,target_id,result,details,ip_address)
    VALUES(?,?,?,?,?,'SUCCESS',?,?)`, [actor.id, actor.role, action, targetType, targetId == null ? null : String(targetId), JSON.stringify(details || {}), actor.ip || null]);
}

function personFields(body: any) {
  const fullName = clean(body.fullName, 255);
  const gender = clean(body.gender, 30);
  const addressDetails = body.addressDetails && typeof body.addressDetails === 'object' && !Array.isArray(body.addressDetails) ? body.addressDetails : null;
  const address = clean(body.address || addressDetails?.completeAddress, 2000);
  const age = body.age === '' || body.age == null ? null : Number(body.age);
  const contactNumber = normalizePhilippineMobileNumber(clean(body.contactNumber, 50));
  const rawEmail = clean(body.contactEmail, 255);
  const contactEmail = rawEmail ? normalizeEmail(rawEmail) : null;
  if (!fullName) throw new Error('Enter the visitor name shown on the registration form.');
  if (!gender) throw new Error('Enter the visitor gender.');
  if (!address) throw new Error('Enter the visitor address.');
  if (!Number.isInteger(age) || age < 0 || age > 125) throw new Error('Enter a valid visitor age.');
  if (!contactNumber) throw new Error('Enter a Philippine mobile number using +63 followed by 10 digits starting with 9.');
  if (rawEmail && !contactEmail) throw new Error('Enter a valid visitor email address.');
  return { fullName, gender, address, addressDetails, age, contactNumber, contactEmail };
}

function signatureValue(value: unknown) {
  const signature = clean(value, 800_000);
  if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(signature)) throw new Error('Capture the visitor signature before checking in.');
  return signature;
}

async function hasFacilityRestriction(conn: any, visitorId: string | number) {
  const [rows] = await conn.query(`SELECT id,reason,expires_at FROM visitor_restrictions WHERE visitor_record_id=? AND scope='FACILITY' AND ${nowRestrictionSql} ORDER BY created_at DESC LIMIT 1`, [visitorId]);
  return rows[0] || null;
}

async function hasPdlRestriction(conn: any, visitorId: string | number, pdlId: string) {
  const [rows] = await conn.query(`SELECT id,reason,expires_at FROM visitor_restrictions WHERE visitor_record_id=? AND scope='PDL' AND pdl_id=? AND ${nowRestrictionSql} ORDER BY created_at DESC LIMIT 1`, [visitorId, pdlId]);
  return rows[0] || null;
}

async function ensureQrIdentity(conn: any, visitorId: string | number) {
  const [[existing]] = await conn.query('SELECT qr_token FROM visitor_qr_identities WHERE visitor_record_id=?', [visitorId]);
  if (existing) return String(existing.qr_token);
  const token = randomBytes(32).toString('hex');
  await conn.query('INSERT INTO visitor_qr_identities(visitor_record_id,qr_token) VALUES(?,?)', [visitorId, token]);
  return token;
}

visitorRecordsRouter.get('/admin/visitors', adminOnly, async (req, res) => {
  const q = clean(req.query.q, 100);
  const like = `%${q}%`;
  const [rows] = await pool.query<any[]>(`SELECT id,visitor_code,contact_number,contact_email
    FROM visitor_records WHERE (?='' OR visitor_code LIKE ? OR contact_email LIKE ? OR contact_number LIKE ?)
    ORDER BY id DESC LIMIT 500`, [q, like, like, like]);
  res.json(rows);
});

visitorRecordsRouter.get('/admin/visitors/restriction-options', adminOnly, async (req, res) => {
  const q = clean(req.query.q, 100), like = `%${q}%`;
  const [rows] = await pool.query<any[]>(`SELECT v.id,v.visitor_code,v.full_name,v.contact_number,v.contact_email,v.status,
      EXISTS(SELECT 1 FROM pdl_visitation_logs l WHERE l.visitor_record_id=v.id) AS has_pdl_visit,
      EXISTS(SELECT 1 FROM guest_visitation_logs l WHERE l.visitor_record_id=v.id) AS has_guest_visit
    FROM visitor_records v
    WHERE v.is_archived=0
      AND (EXISTS(SELECT 1 FROM pdl_visitation_logs l WHERE l.visitor_record_id=v.id)
        OR EXISTS(SELECT 1 FROM guest_visitation_logs l WHERE l.visitor_record_id=v.id))
      AND (?='' OR v.visitor_code LIKE ? OR v.full_name LIKE ? OR v.contact_email LIKE ? OR v.contact_number LIKE ?
        OR EXISTS(SELECT 1 FROM pdl_visitation_logs l WHERE l.visitor_record_id=v.id AND l.visitor_name LIKE ?)
        OR EXISTS(SELECT 1 FROM guest_visitation_logs l WHERE l.visitor_record_id=v.id AND l.visitor_name LIKE ?)
        OR EXISTS(SELECT 1 FROM pdl_visitor_assignments a JOIN pdls p ON p.id=a.pdl_id
          WHERE a.visitor_record_id=v.id AND a.status='APPROVED' AND (p.pdl_number LIKE ? OR CONCAT_WS(' ',p.first_name,p.middle_name,p.last_name,p.suffix) LIKE ?))
        OR EXISTS(SELECT 1 FROM pdl_visitation_logs l LEFT JOIN pdls p ON p.id=l.pdl_id
          WHERE l.visitor_record_id=v.id AND (l.pdl_name LIKE ? OR p.pdl_number LIKE ? OR CONCAT_WS(' ',p.first_name,p.middle_name,p.last_name,p.suffix) LIKE ?)))
    ORDER BY GREATEST(COALESCE((SELECT MAX(l.time_in) FROM pdl_visitation_logs l WHERE l.visitor_record_id=v.id),'1000-01-01 00:00:00'),
      COALESCE((SELECT MAX(l.time_in) FROM guest_visitation_logs l WHERE l.visitor_record_id=v.id),'1000-01-01 00:00:00')) DESC,v.full_name
    LIMIT 100`, [q, ...Array(11).fill(like)]);
  res.json(rows);
});

visitorRecordsRouter.get('/admin/visitors/:id', adminOnly, async (req, res) => {
  const [rows] = await pool.query<any[]>(`${visitorSelect} WHERE id=?`, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Visitor record not found.' });
  const [assignments] = await pool.query<any[]>(`SELECT a.id,a.pdl_id,a.relationship,a.status,a.approved_at,a.revoked_at,a.revocation_reason,
    CONCAT_WS(' ',p.first_name,p.middle_name,p.last_name,p.suffix) AS pdl_name,p.pdl_number
    FROM pdl_visitor_assignments a JOIN pdls p ON p.id=a.pdl_id WHERE a.visitor_record_id=? ORDER BY a.approved_at DESC`, [req.params.id]);
  const [restrictions] = await pool.query<any[]>(`SELECT r.*,CONCAT_WS(' ',p.first_name,p.middle_name,p.last_name,p.suffix) AS pdl_name,
    CONCAT_WS(' ',u.first_name,u.last_name) AS processed_by_name
    FROM visitor_restrictions r LEFT JOIN pdls p ON p.id=r.pdl_id LEFT JOIN users u ON u.id=r.processed_by
    WHERE r.visitor_record_id=? ORDER BY r.created_at DESC`, [req.params.id]);
  const [visits] = await pool.query<any[]>(`SELECT * FROM (
    SELECT l.id,'PDL Visitor' AS visit_type,l.visit_date,l.time_in,l.time_out,l.visitor_name,l.gender,l.address,l.age,l.contact_number,
      l.relationship_to_pdl AS relationship,l.pdl_name,l.cell_number,NULL AS purpose_of_visit
      FROM pdl_visitation_logs l WHERE l.visitor_record_id=?
    UNION ALL
    SELECT l.id,'Guest Visitor' AS visit_type,l.visit_date,l.time_in,l.time_out,l.visitor_name,l.gender,l.address,l.age,l.contact_number,
      NULL AS relationship,NULL AS pdl_name,NULL AS cell_number,l.purpose_of_visit
      FROM guest_visitation_logs l WHERE l.visitor_record_id=?
  ) history ORDER BY visit_date DESC,time_in DESC LIMIT 500`, [req.params.id, req.params.id]);
  res.json({ visitor: mapVisitor(rows[0]), assignments, restrictions, visits });
});

visitorRecordsRouter.post('/admin/visitors', adminOnly, async (req, res) => {
  let fields: ReturnType<typeof personFields>;
  try { fields = personFields(req.body); } catch (error: any) { return res.status(400).json({ error: error.message }); }
  const actor = (req as any).user;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [possible] = await conn.query<any[]>(`SELECT id,visitor_code,full_name FROM visitor_records WHERE is_archived=0 AND
      LOWER(TRIM(full_name))=LOWER(TRIM(?)) AND age=? AND LOWER(TRIM(gender))=LOWER(TRIM(?)) AND LOWER(TRIM(COALESCE(address,'')))=LOWER(TRIM(?)) LIMIT 5 FOR UPDATE`,
      [fields.fullName, fields.age, fields.gender, fields.address]);
    if (possible.length) { await conn.rollback(); return res.status(409).json({ error: 'A matching visitor record may already exist. Search by name or Visitor ID and review it before creating another.', possibleMatches: possible }); }
    const [insert] = await conn.query<any>(`INSERT INTO visitor_records(visitor_code,full_name,gender,address,address_data,age,contact_number,contact_email,status,created_by)
      VALUES(?,?,?,?,?,?,?,?,'ACTIVE',?)`, [makeVisitorCode(), fields.fullName, fields.gender, fields.address, JSON.stringify(fields.addressDetails), fields.age, fields.contactNumber, fields.contactEmail, actor.id]);
    await audit(conn, { ...actor, ip: req.ip }, 'VISITOR_REGISTERED', 'VISITOR', insert.insertId, { visitorCode: 'assigned' });
    await conn.commit();
    const [[visitor]] = await pool.query<any[]>(`${visitorSelect} WHERE id=?`, [insert.insertId]);
    res.status(201).json({ visitor: mapVisitor(visitor) });
  } catch (error: any) {
    await conn.rollback();
    res.status(error.code === 'ER_DUP_ENTRY' ? 409 : 400).json({ error: error.code === 'ER_DUP_ENTRY' ? 'A matching visitor record or Visitor ID already exists.' : error.message || 'Could not create the visitor record.' });
  } finally { conn.release(); }
});

visitorRecordsRouter.put('/admin/visitors/:id', adminOnly, async (req, res) => {
  let fields: ReturnType<typeof personFields>;
  try { fields = personFields(req.body); } catch (error: any) { return res.status(400).json({ error: error.message }); }
  const actor = (req as any).user;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query<any[]>('SELECT id,visitor_code FROM visitor_records WHERE id=? AND is_archived=0 FOR UPDATE', [req.params.id]);
    if (!rows[0]) { await conn.rollback(); return res.status(404).json({ error: 'Active visitor record not found.' }); }
    const [duplicate] = await conn.query<any[]>(`SELECT id FROM visitor_records WHERE id<>? AND is_archived=0 AND
      LOWER(TRIM(full_name))=LOWER(TRIM(?)) AND age=? AND LOWER(TRIM(gender))=LOWER(TRIM(?)) AND LOWER(TRIM(COALESCE(address,'')))=LOWER(TRIM(?)) LIMIT 1`,
      [req.params.id, fields.fullName, fields.age, fields.gender, fields.address]);
    if (duplicate.length) { await conn.rollback(); return res.status(409).json({ error: 'These details match another visitor record. Review that record before saving.' }); }
    await conn.query('UPDATE visitor_records SET full_name=?,gender=?,address=?,address_data=?,age=?,contact_number=?,contact_email=? WHERE id=?', [fields.fullName, fields.gender, fields.address, JSON.stringify(fields.addressDetails), fields.age, fields.contactNumber, fields.contactEmail, req.params.id]);
    await audit(conn, { ...actor, ip: req.ip }, 'VISITOR_UPDATED', 'VISITOR', req.params.id, { fields: ['fullName','gender','address','age','contactNumber','contactEmail'] });
    await conn.commit();
    const [[visitor]] = await pool.query<any[]>(`${visitorSelect} WHERE id=?`, [req.params.id]);
    res.json({ visitor: mapVisitor(visitor) });
  } catch (error: any) { await conn.rollback(); res.status(400).json({ error: error.message || 'Could not update the visitor record.' }); }
  finally { conn.release(); }
});

visitorRecordsRouter.post('/admin/visitors/:id/archive', adminOnly, async (req, res) => {
  const reason = clean(req.body.reason, 1000), actor = (req as any).user;
  if (!reason) return res.status(400).json({ error: 'Enter a reason for archiving this visitor record.' });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query<any[]>('SELECT id,visitor_code,full_name FROM visitor_records WHERE id=? AND is_archived=0 FOR UPDATE', [req.params.id]);
    if (!rows[0]) { await conn.rollback(); return res.status(404).json({ error: 'Active visitor record not found.' }); }
    await conn.query("UPDATE visitor_records SET status='INACTIVE',is_archived=1,archived_at=NOW(),archived_by=?,archive_reason=? WHERE id=?", [actor.id, reason, req.params.id]);
    const revokeReason = `Visitor record archived: ${reason}`;
    await conn.query(`INSERT INTO pdl_visitor_assignment_events(assignment_id,action,relationship,reason,actor_user_id)
      SELECT id,'REVOKED',relationship,?,? FROM pdl_visitor_assignments WHERE visitor_record_id=? AND status='APPROVED'`, [revokeReason,actor.id,req.params.id]);
    await conn.query("UPDATE pdl_visitor_assignments SET status='REVOKED',revoked_by=?,revoked_at=NOW(),revocation_reason=? WHERE visitor_record_id=? AND status='APPROVED'", [actor.id, revokeReason, req.params.id]);
    await audit(conn, { ...actor, ip: req.ip }, 'VISITOR_ARCHIVED', 'VISITOR', req.params.id, { reason });
    await conn.commit();
    res.json({ success: true });
  } catch (error: any) { await conn.rollback(); res.status(400).json({ error: error.message || 'Could not archive the visitor.' }); }
  finally { conn.release(); }
});

visitorRecordsRouter.post('/admin/visitors/:id/restore', adminOnly, async (req, res) => {
  const actor = (req as any).user;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query<any[]>('SELECT id FROM visitor_records WHERE id=? AND is_archived=1 FOR UPDATE', [req.params.id]);
    if (!rows[0]) { await conn.rollback(); return res.status(404).json({ error: 'Archived visitor record not found.' }); }
    await conn.query("UPDATE visitor_records SET status='ACTIVE',is_archived=0,archived_at=NULL,archived_by=NULL,archive_reason=NULL WHERE id=?", [req.params.id]);
    await audit(conn, { ...actor, ip: req.ip }, 'VISITOR_RESTORED', 'VISITOR', req.params.id, {});
    await conn.commit();
    res.json({ success: true });
  } catch (error: any) { await conn.rollback(); res.status(400).json({ error: error.message || 'Could not restore the visitor.' }); }
  finally { conn.release(); }
});

visitorRecordsRouter.post('/admin/visitors/:id/approve', adminOnly, async (req, res) => {
  const pdlId = clean(req.body.pdlId, 100), relationship = clean(req.body.relationship, 100), actor = (req as any).user;
  if (!pdlId || !relationship) return res.status(400).json({ error: 'Choose a PDL and record the visitor relationship.' });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [pdls] = await conn.query<any[]>("SELECT id FROM pdls WHERE id=? AND is_archived=0 AND status='In Custody' FOR UPDATE", [pdlId]);
    if (!pdls[0]) { await conn.rollback(); return res.status(404).json({ error: 'Active PDL record not found.' }); }
    const [visitors] = await conn.query<any[]>('SELECT id,visitor_code,status,is_archived FROM visitor_records WHERE id=? FOR UPDATE', [req.params.id]);
    const visitor = visitors[0];
    if (!visitor || visitor.is_archived || visitor.status !== 'ACTIVE') { await conn.rollback(); return res.status(404).json({ error: 'Active visitor record not found.' }); }
    if (await hasPdlRestriction(conn, visitor.id, pdlId)) { await conn.rollback(); return res.status(409).json({ error: 'An active restriction prevents approval for this PDL.' }); }
    const [existingRows] = await conn.query<any[]>('SELECT id,status FROM pdl_visitor_assignments WHERE visitor_record_id=? AND pdl_id=? FOR UPDATE', [visitor.id, pdlId]);
    const existing = existingRows[0];
    const [counts] = await conn.query<any[]>(`SELECT COUNT(*) AS count FROM pdl_visitor_assignments a JOIN visitor_records v ON v.id=a.visitor_record_id
      WHERE a.pdl_id=? AND a.status='APPROVED' AND v.status='ACTIVE' AND v.is_archived=0`, [pdlId]);
    if ((!existing || existing.status !== 'APPROVED') && Number(counts[0].count) >= 7) { await conn.rollback(); return res.status(409).json({ error: 'This PDL already has seven active approved visitors.' }); }
    let assignmentId: number;
    if (existing) {
      assignmentId = Number(existing.id);
      await conn.query("UPDATE pdl_visitor_assignments SET relationship=?,status='APPROVED',approved_by=?,approved_at=NOW(),revoked_by=NULL,revoked_at=NULL,revocation_reason=NULL WHERE id=?", [relationship, actor.id, assignmentId]);
    } else {
      const [insert] = await conn.query<any>('INSERT INTO pdl_visitor_assignments(visitor_record_id,pdl_id,relationship,status,approved_by) VALUES(?,?,?,\'APPROVED\',?)', [visitor.id,pdlId,relationship,actor.id]);
      assignmentId = Number(insert.insertId);
    }
    await conn.query('INSERT INTO pdl_visitor_assignment_events(assignment_id,action,relationship,actor_user_id) VALUES(?,?,?,?)', [assignmentId, 'APPROVED', relationship, actor.id]);
    await ensureQrIdentity(conn, visitor.id);
    await audit(conn, { ...actor, ip: req.ip }, existing?.status === 'APPROVED' ? 'PDL_VISITOR_APPROVAL_CONFIRMED' : 'PDL_VISITOR_APPROVED', 'PDL_ASSIGNMENT', assignmentId, { pdlId, relationship });
    await conn.commit();
    res.json({ success: true, assignmentId, visitorCode: visitor.visitor_code });
  } catch (error: any) { await conn.rollback(); res.status(error.code === 'ER_DUP_ENTRY' ? 409 : 400).json({ error: error.message || 'Could not approve this visitor.' }); }
  finally { conn.release(); }
});

visitorRecordsRouter.post('/admin/assignments/:id/revoke', adminOnly, async (req, res) => {
  const reason = clean(req.body.reason, 1000), actor = (req as any).user;
  if (!reason) return res.status(400).json({ error: 'Enter a reason for revoking this PDL authorization.' });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query<any[]>('SELECT id,visitor_record_id,pdl_id,status,relationship FROM pdl_visitor_assignments WHERE id=? FOR UPDATE', [req.params.id]);
    if (!rows[0]) { await conn.rollback(); return res.status(404).json({ error: 'PDL visitor authorization not found.' }); }
    if (rows[0].status !== 'APPROVED') { await conn.rollback(); return res.status(409).json({ error: 'This authorization is already revoked.' }); }
    await conn.query("UPDATE pdl_visitor_assignments SET status='REVOKED',revoked_by=?,revoked_at=NOW(),revocation_reason=? WHERE id=?", [actor.id, reason, req.params.id]);
    await conn.query('INSERT INTO pdl_visitor_assignment_events(assignment_id,action,relationship,reason,actor_user_id) VALUES(?,?,?,?,?)', [req.params.id,'REVOKED',rows[0].relationship,reason,actor.id]);
    await audit(conn, { ...actor, ip: req.ip }, 'PDL_VISITOR_REVOKED', 'PDL_ASSIGNMENT', req.params.id, { pdlId: rows[0].pdl_id, visitorId: rows[0].visitor_record_id, reason });
    await conn.commit();
    res.json({ success: true });
  } catch (error: any) { await conn.rollback(); res.status(400).json({ error: error.message || 'Could not revoke the authorization.' }); }
  finally { conn.release(); }
});

visitorRecordsRouter.get('/admin/schedules', adminOnly, async (_req, res) => {
  const [rows] = await pool.query<any[]>(`SELECT p.id AS pdl_id,p.pdl_number,
      CONCAT_WS(' ',p.first_name,p.middle_name,p.last_name,p.suffix) AS pdl_name,p.status,p.is_archived,
      s.weekday,s.version,s.updated_at,COALESCE(a.approved_count,0) AS approved_count
    FROM pdls p LEFT JOIN pdl_visitation_schedules s ON s.pdl_id=p.id
    LEFT JOIN (SELECT a.pdl_id,COUNT(*) AS approved_count FROM pdl_visitor_assignments a JOIN visitor_records v ON v.id=a.visitor_record_id
      WHERE a.status='APPROVED' AND v.status='ACTIVE' AND v.is_archived=0 GROUP BY a.pdl_id) a ON a.pdl_id=p.id
    ORDER BY p.is_archived,p.last_name,p.first_name`);
  res.json(rows);
});

visitorRecordsRouter.get('/admin/schedules/:pdlId', adminOnly, async (req, res) => {
  const [pdls] = await pool.query<any[]>(`SELECT p.id AS pdl_id,p.pdl_number,
      CONCAT_WS(' ',p.first_name,p.middle_name,p.last_name,p.suffix) AS pdl_name,p.status,p.is_archived,
      p.cell_dormitory,s.weekday,s.version,s.updated_at
    FROM pdls p LEFT JOIN pdl_visitation_schedules s ON s.pdl_id=p.id WHERE p.id=?`, [req.params.pdlId]);
  if (!pdls[0]) return res.status(404).json({ error: 'PDL record not found.' });
  const [assignments] = await pool.query<any[]>(`SELECT a.id,a.visitor_record_id,a.relationship,a.status,a.approved_at,a.revoked_at,a.revocation_reason,
      v.visitor_code,v.full_name AS visitor_name,
      EXISTS(SELECT 1 FROM visitor_restrictions r WHERE r.visitor_record_id=v.id AND r.scope='PDL' AND r.pdl_id=a.pdl_id AND ${nowRestrictionSql}) AS restricted
    FROM pdl_visitor_assignments a JOIN visitor_records v ON v.id=a.visitor_record_id WHERE a.pdl_id=?
    ORDER BY a.status='APPROVED' DESC,a.approved_at DESC`, [req.params.pdlId]);
  const [events] = await pool.query<any[]>(`SELECT e.id,e.previous_weekday,e.new_weekday,e.reason,e.changed_at,
      CONCAT_WS(' ',u.first_name,u.last_name) AS changed_by_name
    FROM visitor_pdl_schedule_events e JOIN users u ON u.id=e.changed_by WHERE e.pdl_id=? ORDER BY e.changed_at DESC LIMIT 100`, [req.params.pdlId]);
  res.json({ pdl: pdls[0], assignments, events });
});

visitorRecordsRouter.put('/admin/schedules/:pdlId', adminOnly, async (req, res) => {
  const weekday = Number(req.body.weekday), reason = clean(req.body.reason, 1000), actor = (req as any).user;
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6 || !reason) return res.status(400).json({ error: 'Choose a weekday and record why this schedule is being set or changed.' });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [pdls] = await conn.query<any[]>("SELECT id FROM pdls WHERE id=? AND is_archived=0 AND status='In Custody' FOR UPDATE", [req.params.pdlId]);
    if (!pdls[0]) { await conn.rollback(); return res.status(404).json({ error: 'Active PDL record not found.' }); }
    const [current] = await conn.query<any[]>('SELECT weekday FROM pdl_visitation_schedules WHERE pdl_id=? FOR UPDATE', [req.params.pdlId]);
    const previous = current[0]?.weekday == null ? null : Number(current[0].weekday);
    await conn.query(`INSERT INTO pdl_visitation_schedules(pdl_id,weekday,updated_by)
      VALUES(?,?,?) ON DUPLICATE KEY UPDATE weekday=VALUES(weekday),version=version+1,updated_by=VALUES(updated_by),updated_at=NOW()`, [req.params.pdlId, weekday, actor.id]);
    await conn.query('INSERT INTO visitor_pdl_schedule_events(pdl_id,previous_weekday,new_weekday,reason,changed_by) VALUES(?,?,?,?,?)', [req.params.pdlId, previous, weekday, reason, actor.id]);
    await audit(conn, { ...actor, ip: req.ip }, 'PDL_VISITATION_SCHEDULE_UPDATED', 'PDL_SCHEDULE', req.params.pdlId, { previousWeekday: previous, newWeekday: weekday, reason });
    await conn.commit();
    res.json({ success: true, weekday, previousWeekday: previous });
  } catch (error: any) { await conn.rollback(); res.status(400).json({ error: error.message || 'Could not save the PDL schedule.' }); }
  finally { conn.release(); }
});

visitorRecordsRouter.get('/admin/restrictions', adminOnly, async (req, res) => {
  const q = clean(req.query.q, 100), like = `%${q}%`;
  const from = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.from || '')) ? String(req.query.from) : '';
  const to = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.to || '')) ? String(req.query.to) : '';
  const [rows] = await pool.query<any[]>(`SELECT r.id,r.visitor_record_id,r.scope,r.pdl_id,r.reason,r.requested_by,r.request_details,
    r.effective_at,r.expires_at,r.status,r.created_at,r.removed_at,r.removal_reason,v.visitor_code,v.full_name,
    CONCAT_WS(' ',p.first_name,p.middle_name,p.last_name,p.suffix) AS pdl_name,
    CONCAT_WS(' ',u.first_name,u.last_name) AS processed_by_name,
    (r.status='ACTIVE' AND r.effective_at<=NOW() AND (r.expires_at IS NULL OR r.expires_at>NOW())) AS currently_active,
    (r.expires_at IS NOT NULL AND r.expires_at<=NOW()) AS expired
    FROM visitor_restrictions r JOIN visitor_records v ON v.id=r.visitor_record_id
    LEFT JOIN pdls p ON p.id=r.pdl_id LEFT JOIN users u ON u.id=r.processed_by
    WHERE (?='' OR v.visitor_code LIKE ? OR v.full_name LIKE ? OR p.pdl_number LIKE ? OR p.first_name LIKE ? OR p.last_name LIKE ? OR r.reason LIKE ?)
      AND (?='' OR DATE(r.created_at)>=?) AND (?='' OR DATE(r.created_at)<=?)
    ORDER BY r.created_at DESC LIMIT 1000`, [q,like,like,like,like,like,like,from,from,to,to]);
  res.json(rows);
});

visitorRecordsRouter.post('/admin/restrictions', adminOnly, async (req, res) => {
  const actor = (req as any).user;
  const visitorId = clean(req.body.visitorId, 30), scope = clean(req.body.scope, 20);
  const pdlId = scope === 'PDL' ? clean(req.body.pdlId, 100) : null;
  const reason = clean(req.body.reason, 120), requestedBy = clean(req.body.requestedBy, 255) || null;
  const details = clean(req.body.details, 4000) || null;
  const effectiveAt = req.body.effectiveAt ? sqlDateTime(req.body.effectiveAt) : new Date();
  const expiresAt = req.body.expiresAt ? sqlDateTime(req.body.expiresAt) : null;
  if (!visitorId || !['PDL','FACILITY'].includes(scope) || (scope === 'PDL' && !pdlId) || !reason) return res.status(400).json({ error: 'Choose a visitor, restriction scope, and reason. PDL-specific restrictions require a PDL.' });
  if (req.body.effectiveAt && !sqlDateTime(req.body.effectiveAt)) return res.status(400).json({ error: 'Enter a valid effective date.' });
  if (req.body.expiresAt && !expiresAt) return res.status(400).json({ error: 'Enter a valid expiration date.' });
  if (expiresAt && new Date(expiresAt).getTime() <= new Date(effectiveAt as any).getTime()) return res.status(400).json({ error: 'The expiration must be later than the effective date.' });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [visitors] = await conn.query<any[]>('SELECT id,visitor_code,full_name FROM visitor_records WHERE id=? FOR UPDATE', [visitorId]);
    if (!visitors[0]) { await conn.rollback(); return res.status(404).json({ error: 'Visitor record not found.' }); }
    if (pdlId) {
      const [pdls] = await conn.query<any[]>('SELECT id FROM pdls WHERE id=? AND is_archived=0 FOR UPDATE', [pdlId]);
      if (!pdls[0]) { await conn.rollback(); return res.status(404).json({ error: 'PDL record not found.' }); }
    }
    const [active] = await conn.query<any[]>(`SELECT id FROM visitor_restrictions WHERE visitor_record_id=? AND scope=?
      AND (pdl_id <=> ?) AND ${nowRestrictionSql} LIMIT 1 FOR UPDATE`, [visitorId,scope,pdlId]);
    if (active.length) { await conn.rollback(); return res.status(409).json({ error: 'An active restriction already exists for this scope.' }); }
    const [insert] = await conn.query<any>(`INSERT INTO visitor_restrictions(visitor_record_id,scope,pdl_id,reason,requested_by,request_details,effective_at,expires_at,status,processed_by)
      VALUES(?,?,?,?,?,?,?,?,'ACTIVE',?)`, [visitorId,scope,pdlId,reason,requestedBy,details,effectiveAt,expiresAt,actor.id]);
    await audit(conn, { ...actor, ip: req.ip }, 'VISITOR_RESTRICTION_CREATED', 'VISITOR_RESTRICTION', insert.insertId, { visitorId, scope, pdlId, reason, requestedBy, effectiveAt, expiresAt });
    await conn.commit();
    res.status(201).json({ success: true, restrictionId: insert.insertId });
  } catch (error: any) { await conn.rollback(); res.status(400).json({ error: error.message || 'Could not create the restriction.' }); }
  finally { conn.release(); }
});

visitorRecordsRouter.post('/admin/restrictions/:id/remove', adminOnly, async (req, res) => {
  const reason = clean(req.body.reason, 1000), actor = (req as any).user;
  if (!reason) return res.status(400).json({ error: 'Record why this restriction is being removed.' });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query<any[]>('SELECT id,visitor_record_id,scope,pdl_id,status FROM visitor_restrictions WHERE id=? FOR UPDATE', [req.params.id]);
    if (!rows[0]) { await conn.rollback(); return res.status(404).json({ error: 'Restriction not found.' }); }
    if (rows[0].status !== 'ACTIVE') { await conn.rollback(); return res.status(409).json({ error: 'This restriction is no longer active.' }); }
    await conn.query("UPDATE visitor_restrictions SET status='REMOVED',removed_by=?,removed_at=NOW(),removal_reason=? WHERE id=?", [actor.id,reason,req.params.id]);
    await audit(conn, { ...actor, ip: req.ip }, 'VISITOR_RESTRICTION_REMOVED', 'VISITOR_RESTRICTION', req.params.id, { visitorId: rows[0].visitor_record_id, scope: rows[0].scope, pdlId: rows[0].pdl_id, reason });
    await conn.commit();
    res.json({ success: true });
  } catch (error: any) { await conn.rollback(); res.status(400).json({ error: error.message || 'Could not remove the restriction.' }); }
  finally { conn.release(); }
});

visitorRecordsRouter.get('/admin/reports', adminOnly, async (req, res) => {
  const from = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.from || '')) ? String(req.query.from) : manilaDate();
  const to = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.to || '')) ? String(req.query.to) : from;
  const [[registered]] = await pool.query<any[]>('SELECT COUNT(*) AS total FROM visitor_records WHERE is_archived=0');
  const [[approvedPdlVisitors]] = await pool.query<any[]>(`SELECT COUNT(DISTINCT a.visitor_record_id) AS total FROM pdl_visitor_assignments a
    JOIN visitor_records v ON v.id=a.visitor_record_id WHERE a.status='APPROVED' AND v.status='ACTIVE' AND v.is_archived=0
    AND NOT EXISTS(SELECT 1 FROM visitor_restrictions r WHERE r.visitor_record_id=v.id AND r.scope='PDL' AND r.pdl_id=a.pdl_id AND ${nowRestrictionSql})`);
  const [[pdl]] = await pool.query<any[]>(`SELECT COUNT(DISTINCT a.visitor_record_id) AS visitors,COUNT(l.id) AS total,
    SUM(l.time_out IS NOT NULL) AS completed,SUM(l.time_out IS NULL) AS on_site
    FROM pdl_visitation_logs l JOIN pdl_visitor_assignments a ON a.visitor_record_id=l.visitor_record_id AND a.pdl_id=l.pdl_id
    WHERE l.visit_date BETWEEN ? AND ?`, [from,to]);
  const [[guest]] = await pool.query<any[]>('SELECT COUNT(DISTINCT visitor_record_id) AS visitors,COUNT(*) AS total,SUM(time_out IS NOT NULL) AS completed,SUM(time_out IS NULL) AS on_site FROM guest_visitation_logs WHERE visit_date BETWEEN ? AND ?', [from,to]);
  const [[restrictions]] = await pool.query<any[]>(`SELECT SUM(${nowRestrictionSql}) AS total,
    SUM(scope='PDL' AND ${nowRestrictionSql}) AS pdl_specific,
    SUM(scope='FACILITY' AND ${nowRestrictionSql}) AS facility_wide,
    SUM(expires_at IS NOT NULL AND ${nowRestrictionSql}) AS temporary,
    SUM(expires_at IS NULL AND ${nowRestrictionSql}) AS indefinite,
    SUM(expires_at IS NOT NULL AND expires_at<=NOW()) AS expired,
    SUM(status='REMOVED') AS reinstated
    FROM visitor_restrictions`);
  const [daily] = await pool.query<any[]>(`SELECT visit_date,
    SUM(log_type='PDL Visitor') AS pdl_visits,SUM(log_type='Guest Visitor') AS guest_visits,
    SUM(time_in IS NOT NULL) AS check_ins,SUM(time_out IS NOT NULL) AS check_outs
    FROM (SELECT visit_date,time_in,time_out,'PDL Visitor' AS log_type FROM pdl_visitation_logs
      UNION ALL SELECT visit_date,time_in,time_out,'Guest Visitor' AS log_type FROM guest_visitation_logs) visits
    WHERE visit_date BETWEEN ? AND ? GROUP BY visit_date ORDER BY visit_date`, [from,to]);
  res.json({ period: { from, to }, registeredVisitors: Number(registered.total), approvedPdlVisitors: Number(approvedPdlVisitors.total), pdl, guest, restrictions, daily });
});

visitorRecordsRouter.get('/admin/visit-logs', adminOnly, async (req, res) => {
  const from = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.from || '')) ? String(req.query.from) : '1000-01-01';
  const to = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.to || '')) ? String(req.query.to) : '9999-12-31';
  const q = clean(req.query.q,100), like = `%${q}%`;
  const [rows] = await pool.query<any[]>(`SELECT * FROM (
    SELECT l.id,'PDL Visitor' AS visit_type,l.visit_date,l.time_in,l.time_out,l.visitor_name,v.visitor_code,l.gender,l.address,l.age,l.contact_number,
      l.relationship_to_pdl AS relationship,l.pdl_name,l.cell_number,NULL AS purpose_of_visit,l.checked_in_by,l.checked_out_by
      FROM pdl_visitation_logs l JOIN visitor_records v ON v.id=l.visitor_record_id
    UNION ALL
    SELECT l.id,'Guest Visitor' AS visit_type,l.visit_date,l.time_in,l.time_out,l.visitor_name,v.visitor_code,l.gender,l.address,l.age,l.contact_number,
      NULL AS relationship,NULL AS pdl_name,NULL AS cell_number,l.purpose_of_visit,l.checked_in_by,l.checked_out_by
      FROM guest_visitation_logs l JOIN visitor_records v ON v.id=l.visitor_record_id
  ) visits WHERE visit_date BETWEEN ? AND ? AND (?='' OR visitor_name LIKE ? OR visitor_code LIKE ? OR contact_number LIKE ? OR pdl_name LIKE ? OR purpose_of_visit LIKE ?)
  ORDER BY visit_date DESC,time_in DESC LIMIT 5000`, [from,to,q,like,like,like,like,like]);
  res.json(rows);
});

visitorRecordsRouter.get('/admin/visitors/:id/qr', adminOnly, async (req, res) => {
  const [rows] = await pool.query<any[]>(`SELECT v.id,v.visitor_code,v.full_name,v.gender,v.address,v.age,q.qr_token
    FROM visitor_records v JOIN visitor_qr_identities q ON q.visitor_record_id=v.id WHERE v.id=?`, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'This visitor has not received an approved PDL QR identity.' });
  res.setHeader('Cache-Control','private, no-store');
  res.json(rows[0]);
});

visitorRecordsRouter.get('/worker/search', gateStaff, async (req, res) => {
  const q = clean(req.query.q, 100);
  if (q.length < 2) return res.json([]);
  const like = `%${q}%`;
  const [rows] = await pool.query<any[]>(`SELECT v.id,v.visitor_code,v.full_name,v.gender,v.address,v.address_data,v.age,v.contact_number,v.contact_email,v.status,v.is_archived,v.created_at,v.updated_at,
      (q.visitor_record_id IS NOT NULL) AS has_qr_identity
    FROM visitor_records v LEFT JOIN visitor_qr_identities q ON q.visitor_record_id=v.id
    WHERE v.is_archived=0 AND v.status='ACTIVE' AND (v.visitor_code LIKE ? OR v.full_name LIKE ? OR q.qr_token=?)
    ORDER BY v.full_name LIMIT 50`, [like,like,q]);
  const result = [];
  for (const visitor of rows) {
    const [assignments] = await pool.query<any[]>(`SELECT a.id,a.pdl_id,a.relationship,a.status,
      CONCAT_WS(' ',p.first_name,p.middle_name,p.last_name,p.suffix) AS pdl_name,p.pdl_number,p.cell_dormitory,s.weekday
      FROM pdl_visitor_assignments a JOIN pdls p ON p.id=a.pdl_id LEFT JOIN pdl_visitation_schedules s ON s.pdl_id=p.id
      WHERE a.visitor_record_id=? ORDER BY a.approved_at DESC`, [visitor.id]);
    const facilityRestriction = await hasFacilityRestriction(pool, visitor.id);
    const withFlags = [];
    for (const assignment of assignments) {
      const restriction = await hasPdlRestriction(pool, visitor.id, String(assignment.pdl_id));
      withFlags.push({ ...assignment, restricted: Boolean(restriction), restrictionReason: restriction?.reason || null });
    }
    result.push({ ...mapVisitor(visitor), facilityRestricted: Boolean(facilityRestriction), assignments: withFlags });
  }
  res.json(result);
});

visitorRecordsRouter.get('/worker/today', gateStaff, async (_req, res) => {
  const date = manilaDate();
  const weekday = new Date(`${date}T12:00:00+08:00`).getDay();
  const [rows] = await pool.query<any[]>(`SELECT a.id,a.visitor_record_id,a.pdl_id,a.relationship,v.visitor_code,v.full_name AS visitor_name,
      v.gender,v.age,v.contact_number,CONCAT_WS(' ',p.first_name,p.middle_name,p.last_name,p.suffix) AS pdl_name,
      p.pdl_number,p.cell_dormitory,s.weekday
    FROM pdl_visitor_assignments a JOIN visitor_records v ON v.id=a.visitor_record_id
    JOIN pdls p ON p.id=a.pdl_id JOIN pdl_visitation_schedules s ON s.pdl_id=p.id
    WHERE a.status='APPROVED' AND v.status='ACTIVE' AND v.is_archived=0 AND p.status='In Custody' AND p.is_archived=0 AND s.weekday=?
    ORDER BY p.last_name,p.first_name,v.full_name`, [weekday]);
  const visits = [];
  for (const row of rows) {
    const facilityRestriction = await hasFacilityRestriction(pool, row.visitor_record_id);
    const pdlRestriction = await hasPdlRestriction(pool, row.visitor_record_id, String(row.pdl_id));
    visits.push({ ...row, facilityRestricted: Boolean(facilityRestriction), restricted: Boolean(pdlRestriction), restrictionReason: pdlRestriction?.reason || facilityRestriction?.reason || null });
  }
  res.json({ date, weekday, visits });
});

visitorRecordsRouter.get('/worker/recent', gateStaff, async (req, res) => {
  const q = clean(req.query.q, 100), like = `%${q}%`;
  const [rows] = await pool.query<any[]>(`SELECT * FROM (
    SELECT l.id,'PDL Visitor' AS visit_type,l.visit_date,l.time_in,l.time_out,l.visitor_name,v.visitor_code,l.contact_number,l.pdl_name,
      l.relationship_to_pdl AS relationship,l.cell_number,NULL AS purpose_of_visit,
      CONCAT_WS(' ',u.first_name,u.last_name) AS checked_in_by_name,CONCAT_WS(' ',o.first_name,o.last_name) AS checked_out_by_name
      FROM pdl_visitation_logs l JOIN visitor_records v ON v.id=l.visitor_record_id JOIN users u ON u.id=l.checked_in_by LEFT JOIN users o ON o.id=l.checked_out_by
    UNION ALL
    SELECT l.id,'Guest Visitor' AS visit_type,l.visit_date,l.time_in,l.time_out,l.visitor_name,v.visitor_code,l.contact_number,NULL AS pdl_name,
      NULL AS relationship,NULL AS cell_number,l.purpose_of_visit,
      CONCAT_WS(' ',u.first_name,u.last_name) AS checked_in_by_name,CONCAT_WS(' ',o.first_name,o.last_name) AS checked_out_by_name
      FROM guest_visitation_logs l JOIN visitor_records v ON v.id=l.visitor_record_id JOIN users u ON u.id=l.checked_in_by LEFT JOIN users o ON o.id=l.checked_out_by
  ) recent WHERE ?='' OR visitor_name LIKE ? OR visitor_code LIKE ? OR contact_number LIKE ? OR pdl_name LIKE ? OR purpose_of_visit LIKE ? OR DATE_FORMAT(visit_date,'%Y-%m-%d') LIKE ?
  ORDER BY time_in DESC LIMIT 500`, [q,like,like,like,like,like,like]);
  res.json(rows);
});

visitorRecordsRouter.get('/worker/visitors/:id/qr', gateStaff, async (req, res) => {
  const [rows] = await pool.query<any[]>(`SELECT v.id,v.visitor_code,v.full_name,v.gender,v.address,v.age,q.qr_token
    FROM visitor_records v JOIN visitor_qr_identities q ON q.visitor_record_id=v.id WHERE v.id=? AND v.is_archived=0 AND v.status='ACTIVE'`, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'No active PDL visitor QR identity was found.' });
  res.setHeader('Cache-Control','private, no-store');
  res.json(rows[0]);
});

visitorRecordsRouter.get('/worker/verify/:visitorId/:pdlId', gateStaff, async (req, res) => {
  const [visitors] = await pool.query<any[]>(`${visitorSelect} WHERE id=? AND is_archived=0 AND status='ACTIVE'`, [req.params.visitorId]);
  if (!visitors[0]) return res.status(404).json({ error: 'UNREGISTERED: No active visitor record was found.' });
  const visitor = visitors[0], pdlId = clean(req.params.pdlId,100);
  const [assignments] = await pool.query<any[]>(`SELECT a.id,a.pdl_id,a.relationship,a.status,
    CONCAT_WS(' ',p.first_name,p.middle_name,p.last_name,p.suffix) AS pdl_name,p.pdl_number,p.status AS pdl_status,
    p.is_archived AS pdl_archived,p.cell_dormitory,s.weekday
    FROM pdl_visitor_assignments a JOIN pdls p ON p.id=a.pdl_id LEFT JOIN pdl_visitation_schedules s ON s.pdl_id=p.id
    WHERE a.visitor_record_id=? AND a.pdl_id=?`, [visitor.id,pdlId]);
  const assignment = assignments[0];
  if (!assignment || assignment.status !== 'APPROVED') return res.json({ allowed: false, code: 'UNAUTHORIZED', message: 'UNAUTHORIZED: No active approval for this PDL.', visitor, pdl: assignment || { id:pdlId } });
  const facilityRestriction = await hasFacilityRestriction(pool,visitor.id);
  if (facilityRestriction) return res.json({ allowed:false,code:'FACILITY_RESTRICTION',message:'FACILITY-WIDE RESTRICTION: Entry is not permitted.',visitor,pdl:assignment,restriction:facilityRestriction });
  const pdlRestriction = await hasPdlRestriction(pool,visitor.id,pdlId);
  if (pdlRestriction) {
    const [other] = await pool.query<any[]>(`SELECT a.pdl_id,CONCAT_WS(' ',p.first_name,p.middle_name,p.last_name,p.suffix) AS pdl_name
      FROM pdl_visitor_assignments a JOIN pdls p ON p.id=a.pdl_id WHERE a.visitor_record_id=? AND a.status='APPROVED' AND a.pdl_id<>?`, [visitor.id,pdlId]);
    return res.json({ allowed:false,code:'PDL_RESTRICTION',message:`RESTRICTED: This visitor is prohibited from visiting ${assignment.pdl_name}.`,otherApprovedPdls:other,visitor,pdl:assignment,restriction:pdlRestriction });
  }
  if (assignment.pdl_archived || assignment.pdl_status !== 'In Custody') return res.json({ allowed:false,code:'PDL_INACTIVE',message:'This PDL is not currently available for visits.',visitor,pdl:assignment });
  const date = manilaDate();
  const weekday = new Date(`${date}T12:00:00+08:00`).getDay();
  if (assignment.weekday == null || Number(assignment.weekday) !== weekday) return res.json({ allowed:false,code:'WRONG_DAY',message:`INCORRECT VISITATION DAY: This PDL is not scheduled for visitors today. Assigned day: ${assignment.weekday == null ? 'not set' : ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][assignment.weekday]}.`,visitor,pdl:assignment });
  res.json({ allowed:true,code:'APPROVED',message:'APPROVED: Visitor is authorized to visit this PDL.',visitor,pdl:assignment });
});

visitorRecordsRouter.get('/worker/active', gateStaff, async (_req, res) => {
  const [rows] = await pool.query<any[]>(`SELECT * FROM (
    SELECT l.id,'PDL Visitor' AS visit_type,l.visit_date,l.time_in,l.visitor_name,l.visitor_record_id,v.visitor_code,v.contact_number,l.pdl_name,l.cell_number,
      l.relationship_to_pdl AS relationship,NULL AS purpose_of_visit
      FROM pdl_visitation_logs l JOIN visitor_records v ON v.id=l.visitor_record_id WHERE l.time_out IS NULL
    UNION ALL
    SELECT l.id,'Guest Visitor' AS visit_type,l.visit_date,l.time_in,l.visitor_name,l.visitor_record_id,v.visitor_code,v.contact_number,NULL AS pdl_name,
      NULL AS cell_number,NULL AS relationship,l.purpose_of_visit
      FROM guest_visitation_logs l JOIN visitor_records v ON v.id=l.visitor_record_id WHERE l.time_out IS NULL
  ) active ORDER BY time_in`, []);
  res.json(rows);
});

visitorRecordsRouter.post('/worker/pdl-checkins', gateStaff, async (req, res) => {
  let signature: string;
  try { signature = signatureValue(req.body.signatureData); } catch (error: any) { return res.status(400).json({ error: error.message }); }
  const visitorId = clean(req.body.visitorId,30), pdlId = clean(req.body.pdlId,100), actor=(req as any).user;
  if (!visitorId || !pdlId) return res.status(400).json({ error:'Select a visitor and PDL.' });
  const conn=await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [visitors]=await conn.query<any[]>('SELECT * FROM visitor_records WHERE id=? AND is_archived=0 AND status=\'ACTIVE\' FOR UPDATE',[visitorId]);
    const visitor=visitors[0];
    if(!visitor){await conn.rollback();return res.status(404).json({error:'UNREGISTERED: No active visitor record was found.'});}
    const facilityRestriction=await hasFacilityRestriction(conn,visitor.id);
    if(facilityRestriction){await conn.rollback();return res.status(403).json({error:'FACILITY-WIDE RESTRICTION: Entry is not permitted.'});}
    const [assignments]=await conn.query<any[]>(`SELECT a.id,a.relationship,a.status,p.status AS pdl_status,p.is_archived AS pdl_archived,
      p.cell_dormitory,CONCAT_WS(' ',p.first_name,p.middle_name,p.last_name,p.suffix) AS pdl_name,s.weekday
      FROM pdl_visitor_assignments a JOIN pdls p ON p.id=a.pdl_id LEFT JOIN pdl_visitation_schedules s ON s.pdl_id=p.id
      WHERE a.visitor_record_id=? AND a.pdl_id=? FOR UPDATE`,[visitor.id,pdlId]);
    const assignment=assignments[0];
    if(!assignment||assignment.status!=='APPROVED') {await conn.rollback();return res.status(403).json({error:'UNAUTHORIZED: No active approval for this PDL.'});}
    if(await hasPdlRestriction(conn,visitor.id,pdlId)){await conn.rollback();return res.status(403).json({error:`RESTRICTED: This visitor is prohibited from visiting ${assignment.pdl_name}.`});}
    if(assignment.pdl_archived||assignment.pdl_status!=='In Custody'){await conn.rollback();return res.status(403).json({error:'This PDL is not currently available for visits.'});}
    if(assignment.weekday==null||Number(assignment.weekday)!==new Date(`${manilaDate()}T12:00:00+08:00`).getDay()){await conn.rollback();return res.status(403).json({error:'INCORRECT VISITATION DAY: The PDL visitation day does not match today.'});}
    if(visitor.age==null||!visitor.gender||!visitor.address||!visitor.contact_number){await conn.rollback();return res.status(409).json({error:'Complete the required PDL Visitor form details before check-in.'});}
    const [active]=await conn.query<any[]>(`SELECT id FROM pdl_visitation_logs WHERE visitor_record_id=? AND time_out IS NULL
      UNION ALL SELECT id FROM guest_visitation_logs WHERE visitor_record_id=? AND time_out IS NULL LIMIT 1`,[visitor.id,visitor.id]);
    if(active.length){await conn.rollback();return res.status(409).json({error:'This visitor already has an active check-in.'});}
    const id=randomUUID();
    await conn.query(`INSERT INTO pdl_visitation_logs(id,visitor_record_id,visit_date,time_in,visitor_name,gender,address,age,contact_number,signature_data,
      checked_in_by,pdl_id,pdl_name,cell_number,relationship_to_pdl) VALUES(?,?,?,NOW(),?,?,?,?,?,?,?, ?,?,?,?)`,[
        id,visitor.id,manilaDate(),visitor.full_name,visitor.gender,visitor.address,visitor.age,visitor.contact_number,signature,actor.id,pdlId,assignment.pdl_name,assignment.cell_dormitory,assignment.relationship]);
    await audit(conn,{...actor,ip:req.ip},'PDL_VISITOR_CHECKED_IN','PDL_VISIT',id,{visitorId,visitorCode:visitor.visitor_code,pdlId});
    await conn.commit();
    req.app.emit('visitor-logs-updated');
    res.status(201).json({success:true,id,visitType:'PDL Visitor',timeIn:new Date().toISOString()});
  }catch(error:any){await conn.rollback();res.status(400).json({error:error.message||'Could not check in the PDL visitor.'})}finally{conn.release()}
});

visitorRecordsRouter.post('/worker/guest-checkins', gateStaff, async (req, res) => {
  let fields: ReturnType<typeof personFields>, signature: string;
  try { fields = personFields(req.body); signature = signatureValue(req.body.signatureData); }
  catch (error:any) { return res.status(400).json({error:error.message}); }
  const purpose=clean(req.body.purposeOfVisit,255), visitorId=clean(req.body.visitorId,30), actor=(req as any).user;
  if(!purpose)return res.status(400).json({error:'Enter the purpose of visit shown on the Jail Visitor form.'});
  const conn=await pool.getConnection();
  try{
    await conn.beginTransaction();
    let visitor:any;
    if(visitorId){
      const [visitors]=await conn.query<any[]>('SELECT * FROM visitor_records WHERE id=? AND is_archived=0 AND status=\'ACTIVE\' FOR UPDATE',[visitorId]);
      visitor=visitors[0];
      if(!visitor){await conn.rollback();return res.status(404).json({error:'Active visitor record not found.'});}
    }else{
      const [possible]=await conn.query<any[]>(`SELECT id,visitor_code FROM visitor_records WHERE is_archived=0 AND
        LOWER(TRIM(full_name))=LOWER(TRIM(?)) AND age=? AND LOWER(TRIM(gender))=LOWER(TRIM(?)) AND LOWER(TRIM(COALESCE(address,'')))=LOWER(TRIM(?)) LIMIT 1 FOR UPDATE`,[fields.fullName,fields.age,fields.gender,fields.address]);
      if(possible.length){await conn.rollback();return res.status(409).json({error:'This visitor may already be registered. Search by name or Visitor ID and select the existing record.',possibleMatch:possible[0]});}
      const [insert]=await conn.query<any>(`INSERT INTO visitor_records(visitor_code,full_name,gender,address,address_data,age,contact_number,status,created_by)
        VALUES(?,?,?,?,?,?,?,'ACTIVE',?)`,[makeVisitorCode(),fields.fullName,fields.gender,fields.address,JSON.stringify(fields.addressDetails),fields.age,fields.contactNumber,actor.id]);
      const [[created]]=await conn.query<any[]>('SELECT * FROM visitor_records WHERE id=? FOR UPDATE',[insert.insertId]);
      visitor=created;
      await audit(conn,{...actor,ip:req.ip},'GUEST_VISITOR_REGISTERED','VISITOR',visitor.id,{visitorCode:'assigned'});
    }
    const facilityRestriction=await hasFacilityRestriction(conn,visitor.id);
    if(facilityRestriction){await conn.rollback();return res.status(403).json({error:'FACILITY-WIDE RESTRICTION: Entry is not permitted.'});}
    const [active]=await conn.query<any[]>(`SELECT id FROM pdl_visitation_logs WHERE visitor_record_id=? AND time_out IS NULL
      UNION ALL SELECT id FROM guest_visitation_logs WHERE visitor_record_id=? AND time_out IS NULL LIMIT 1`,[visitor.id,visitor.id]);
    if(active.length){await conn.rollback();return res.status(409).json({error:'This visitor already has an active check-in.'});}
    const id=randomUUID();
    await conn.query(`INSERT INTO guest_visitation_logs(id,visitor_record_id,visit_date,time_in,visitor_name,gender,address,age,contact_number,
      signature_data,checked_in_by,purpose_of_visit) VALUES(?,?,?,NOW(),?,?,?,?,?,?,?,?)`,[id,visitor.id,manilaDate(),visitor.full_name,visitor.gender,visitor.address,visitor.age,visitor.contact_number,signature,actor.id,purpose]);
    await audit(conn,{...actor,ip:req.ip},'GUEST_VISITOR_CHECKED_IN','GUEST_VISIT',id,{visitorId:visitor.id,visitorCode:visitor.visitor_code,purpose});
    await conn.commit();
    req.app.emit('visitor-logs-updated');
    res.status(201).json({success:true,id,visitorCode:visitor.visitor_code,visitType:'Guest Visitor',timeIn:new Date().toISOString()});
  }catch(error:any){await conn.rollback();res.status(400).json({error:error.message||'Could not check in the Guest Visitor.'})}finally{conn.release()}
});

visitorRecordsRouter.post('/worker/visits/:type/:id/checkout', gateStaff, async (req,res) => {
  const type=String(req.params.type).toUpperCase(), actor=(req as any).user;
  if(!['PDL','GUEST'].includes(type))return res.status(400).json({error:'Choose a valid visit type.'});
  const table=type==='PDL'?'pdl_visitation_logs':'guest_visitation_logs';
  const conn=await pool.getConnection();
  try{
    await conn.beginTransaction();
    const [rows]=await conn.query<any[]>(`SELECT id,visitor_record_id,time_out FROM ${table} WHERE id=? FOR UPDATE`,[req.params.id]);
    if(!rows[0]){await conn.rollback();return res.status(404).json({error:'Active visit record not found.'});}
    if(rows[0].time_out){await conn.rollback();return res.status(409).json({error:'This visit is already checked out.'});}
    await conn.query(`UPDATE ${table} SET time_out=NOW(),checked_out_by=? WHERE id=?`,[actor.id,req.params.id]);
    await audit(conn,{...actor,ip:req.ip},type==='PDL'?'PDL_VISITOR_CHECKED_OUT':'GUEST_VISITOR_CHECKED_OUT',type==='PDL'?'PDL_VISIT':'GUEST_VISIT',req.params.id,{visitorId:rows[0].visitor_record_id});
    await conn.commit();
    req.app.emit('visitor-logs-updated');
    res.json({success:true});
  }catch(error:any){await conn.rollback();res.status(400).json({error:error.message||'Could not record check-out.'})}finally{conn.release()}
});
