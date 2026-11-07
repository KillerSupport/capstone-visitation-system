import { Router, type Request, type Response } from 'express';
import { createHmac, randomBytes, randomInt } from 'node:crypto';
import rateLimit from 'express-rate-limit';
import { admin, auth, hashPass, verifyPassword } from './auth.js';
import { pool } from './database/db.js';
import { normalizeEmail, normalizePhilippineMobileNumber } from './identity.js';
import { deliverMessage, maskContact, type Contact } from './messaging.js';
import { strongPassword, validatePerson } from './validation.js';
import { validateAddress } from './geography.js';

export const accountChangesRouter = Router();
const accountChangeLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many profile verification requests. Please wait 15 minutes before trying again.' },
});
const secret = process.env.SESSION_SECRET || randomBytes(32).toString('hex');
const digest = (requestId: string, destination: string, code: string) =>
  createHmac('sha256', secret).update(`${requestId}:${destination}:${code}`).digest('hex');
const clean = (value: unknown, max = 255) => String(value ?? '').trim().slice(0, max);
const objectValue = (value: unknown) => {
  try { return typeof value === 'string' ? JSON.parse(value || '{}') : value || {}; }
  catch { return {}; }
};

function requireVerifiedEmail(user: any) {
  if (!user.email || !user.emailVerified) {
    throw new Error('Your account needs a verified email address before profile or password changes can be requested. Contact an administrator to update your account email.');
  }
  return { channel: 'email', destination: String(user.email) } satisfies Contact;
}

function profileContacts(user: any, payload: any): Contact[] {
  const contacts: Contact[] = [requireVerifiedEmail(user)];
  if (payload.email && payload.email !== user.email) contacts.push({ channel: 'email', destination: payload.email });
  if (payload.mobileNumber && payload.mobileNumber !== user.mobileNumber) contacts.push({ channel: 'sms', destination: payload.mobileNumber });
  return contacts;
}

async function prepareRequest(
  req: Request,
  res: Response,
  input: { requestType: 'PROFILE' | 'PASSWORD'; payload?: any; passwordHash?: string; contacts: Contact[] },
) {
  const user = (req as any).user;
  const connection = await pool.getConnection();
  let requestId: number | null = null;
  const requestToken = randomBytes(24).toString('hex');
  const proofs = input.contacts.map(contact => ({
    ...contact,
    hash: digest(requestToken, contact.destination, String(randomInt(100000, 1000000))),
    verified: false,
    attempts: 0,
  }));
  // Keep the actual one-time codes separate from the hashes persisted in MySQL.
  const codes = input.contacts.map(() => String(randomInt(100000, 1000000)));
  for (let i = 0; i < proofs.length; i++) proofs[i].hash = digest(requestToken, proofs[i].destination, codes[i]);

  try {
    await connection.beginTransaction();
    const [userRows] = await connection.query<any[]>('SELECT id,role,email,email_verified_at,mobile_number,phone_verified_at FROM users WHERE id=? AND is_archived=0 FOR UPDATE', [user.id]);
    const current = userRows[0];
    if (!current) { await connection.rollback(); return res.status(401).json({ error: 'Your account is unavailable. Sign in again.' }); }
    if (!['ADMIN', 'SUPER_ADMIN', 'WORKER'].includes(current.role)) { await connection.rollback(); return res.status(403).json({ error: 'Only administrator and worker profiles can be changed here.' }); }

    const [active] = await connection.query<any[]>(`SELECT id,status FROM profile_change_requests
      WHERE user_id=? AND status IN ('VERIFYING','PENDING_APPROVAL') ORDER BY id DESC FOR UPDATE`, [current.id]);
    if (active.some((row: any) => row.status === 'PENDING_APPROVAL')) {
      await connection.rollback();
      return res.status(409).json({ error: 'Your verified profile request is waiting for administrator review.' });
    }
    if (active.length) await connection.query("UPDATE profile_change_requests SET status='SUPERSEDED' WHERE id=?", [active[0].id]);

    const [recent] = await connection.query<any[]>(`SELECT COUNT(*) AS total FROM profile_change_requests
      WHERE user_id=? AND requested_at>DATE_SUB(NOW(),INTERVAL 15 MINUTE)`, [current.id]);
    if (Number(recent[0]?.total || 0) >= 10) {
      await connection.rollback();
      return res.status(429).json({ error: 'Too many profile verification requests. Please wait 15 minutes before trying again.' });
    }
    const [columns] = await connection.query<any[]>('SELECT email,email_verified_at,mobile_number,phone_verified_at FROM users WHERE id=? FOR UPDATE', [current.id]);
    const row = columns[0];
    if (!row.email || !row.email_verified_at) {
      await connection.rollback();
      return res.status(409).json({ error: 'Your account needs a verified email address before profile or password changes can be requested. Contact an administrator to update your account email.' });
    }
    if (input.requestType === 'PROFILE') {
      const email = input.payload.email;
      const phone = input.payload.mobileNumber;
      const [duplicates] = await connection.query<any[]>(`SELECT id FROM users WHERE id<>? AND is_archived=0
        AND ((? IS NOT NULL AND LOWER(email)=?) OR (? IS NOT NULL AND mobile_number=?)) LIMIT 1`,
      [current.id, email, email, phone, phone]);
      if (duplicates.length) {
        await connection.rollback();
        return res.status(409).json({ error: 'That email or mobile number is already connected to another account.' });
      }
    }
    const [insert] = await connection.query<any>(`INSERT INTO profile_change_requests
      (user_id,request_type,payload,new_password_hash,proofs,expires_at,status)
      VALUES(?,?,?,?,?,DATE_ADD(NOW(),INTERVAL 10 MINUTE),'VERIFYING')`,
    [current.id, input.requestType, JSON.stringify({ ...(input.payload || {}), requestToken }), input.passwordHash || null,
      JSON.stringify(proofs.map(({ channel, destination, hash, verified, attempts }) => ({ channel, destination, hash, verified, attempts })))]);
    requestId = Number(insert.insertId);
    await connection.commit();
  } catch (error: any) {
    await connection.rollback();
    return res.status(error.code === 'ER_DUP_ENTRY' ? 409 : 500).json({ error: error.code === 'ER_DUP_ENTRY' ? 'A profile change request is already active.' : 'Could not start profile verification.' });
  } finally { connection.release(); }

  try {
    for (let i = 0; i < input.contacts.length; i++) {
      await deliverMessage(input.contacts[i], 'BJMP account change verification',
        `Your BJMP account change verification code is ${codes[i]}. It expires in 10 minutes. Do not share this code.`);
    }
  } catch (error: any) {
    await pool.query("UPDATE profile_change_requests SET status='DELIVERY_FAILED',notification_error=? WHERE id=?", [String(error?.message || 'Email delivery failed.').slice(0, 500), requestId]);
    return res.status(503).json({ error: error?.message || 'Could not send the email verification code.' });
  }

  const [latest] = await pool.query<any[]>('SELECT id FROM profile_change_requests WHERE id=?', [requestId]);
  if (!latest.length) return res.status(500).json({ error: 'The verification request could not be saved.' });
  return res.json({ success: true, contact: maskContact(input.contacts[0]), remaining: input.contacts.length, requestType: input.requestType });
}

function profilePayload(body: any, user: any) {
  validatePerson(body, false);
  const email = body.email ? normalizeEmail(body.email) : null;
  const mobileNumber = body.mobileNumber ? normalizePhilippineMobileNumber(body.mobileNumber) : null;
  if (!email) throw new Error('Enter a valid email address. A profile must keep an email address.');
  if (body.mobileNumber && !mobileNumber) throw new Error('Enter a valid Philippine mobile number.');
  const address = JSON.stringify(body.address) === JSON.stringify(user.address) ? user.address : validateAddress(body.address);
  return {
    firstName: clean(body.firstName, 100),
    middleName: clean(body.middleName, 100),
    lastName: clean(body.lastName, 100),
    suffix: clean(body.suffix, 20),
    dateOfBirth: String(body.dateOfBirth || '').slice(0, 10),
    email,
    mobileNumber,
    address,
  };
}

async function prepareWorkerProfileRequest(req: Request, res: Response, payload: any) {
  const actor = (req as any).user;
  const connection = await pool.getConnection();
  let requestId = 0;
  let workerName = '';
  let workerCode = '';
  let changedFields: string[] = [];
  try {
    await connection.beginTransaction();
    const [users] = await connection.query<any[]>(`SELECT id,role,first_name,middle_name,last_name,suffix,date_of_birth,email,
      email_verified_at,mobile_number,address_data FROM users WHERE id=? AND is_archived=0 FOR UPDATE`, [actor.id]);
    const current = users[0];
    if (!current || current.role !== 'WORKER') {
      await connection.rollback();
      return res.status(403).json({ error: 'This direct approval flow is for worker profile changes.' });
    }

    const [active] = await connection.query<any[]>(`SELECT id,status FROM profile_change_requests
      WHERE user_id=? AND status IN ('VERIFYING','PENDING_APPROVAL') ORDER BY id DESC FOR UPDATE`, [current.id]);
    if (active.some((row: any) => row.status === 'PENDING_APPROVAL')) {
      await connection.rollback();
      return res.status(409).json({ error: 'Your profile request is already waiting for administrator review.' });
    }
    if (active.length) {
      await connection.query("UPDATE profile_change_requests SET status='SUPERSEDED',new_password_hash=NULL WHERE user_id=? AND status IN ('VERIFYING','PENDING_APPROVAL')", [current.id]);
    }

    const [recent] = await connection.query<any[]>(`SELECT COUNT(*) AS total FROM profile_change_requests
      WHERE user_id=? AND requested_at>DATE_SUB(NOW(),INTERVAL 15 MINUTE)`, [current.id]);
    if (Number(recent[0]?.total || 0) >= 10) {
      await connection.rollback();
      return res.status(429).json({ error: 'Too many profile change requests. Please wait 15 minutes before trying again.' });
    }

    const [duplicates] = await connection.query<any[]>(`SELECT id FROM users WHERE id<>? AND is_archived=0
      AND ((? IS NOT NULL AND LOWER(email)=LOWER(?)) OR (? IS NOT NULL AND mobile_number=?)) LIMIT 1`,
    [current.id, payload.email, payload.email, payload.mobileNumber, payload.mobileNumber]);
    if (duplicates.length) {
      await connection.rollback();
      return res.status(409).json({ error: 'That email or mobile number is already connected to another account.' });
    }

    const same = (a: unknown, b: unknown) => JSON.stringify(a ?? '') === JSON.stringify(b ?? '');
    const existingAddress = objectValue(current.address_data);
    changedFields = ([
      ['First name', current.first_name, payload.firstName], ['Middle name', current.middle_name || '', payload.middleName || ''],
      ['Last name', current.last_name, payload.lastName], ['Suffix', current.suffix || '', payload.suffix || ''],
      ['Date of birth', String(current.date_of_birth || '').slice(0, 10), payload.dateOfBirth],
      ['Email', current.email || '', payload.email || ''], ['Mobile number', current.mobile_number || '', payload.mobileNumber || ''],
      ['Residential address', existingAddress, payload.address],
    ] as [string, unknown, unknown][]).filter(([, before, after]) => !same(before, after)).map(([field]) => field);
    if (!changedFields.length) {
      await connection.rollback();
      return res.status(400).json({ error: 'No profile changes were made.' });
    }

    const [insert] = await connection.query<any>(`INSERT INTO profile_change_requests
      (user_id,request_type,payload,new_password_hash,proofs,expires_at,status)
      VALUES(?,'PROFILE',?,NULL,'[]',DATE_ADD(NOW(),INTERVAL 30 DAY),'PENDING_APPROVAL')`,
    [current.id, JSON.stringify(payload)]);
    requestId = Number(insert.insertId);
    workerName = [current.first_name, current.last_name].filter(Boolean).join(' ');
    workerCode = `WRK-${String(current.id).padStart(6, '0')}`;
    await connection.query('INSERT INTO audit_logs(actor_user_id,actor_role,action,target_type,target_id,result,details,ip_address) VALUES(?,?,?,?,?,\'SUCCESS\',?,?)',
      [current.id, current.role, 'WORKER_PROFILE_CHANGE_REQUESTED', 'PROFILE_CHANGE_REQUEST', String(requestId), JSON.stringify({ changedFields }), req.ip]);
    await connection.commit();
  } catch (error: any) {
    await connection.rollback();
    return res.status(error.code === 'ER_DUP_ENTRY' ? 409 : 500).json({ error: error.code === 'ER_DUP_ENTRY' ? 'A profile change request is already active.' : 'Could not submit your profile changes.' });
  } finally { connection.release(); }

  req.app.emit('profile-change-requests-updated');
  let adminNotified = false;
  let notificationError = '';
  try {
    const [admins] = await pool.query<any[]>(`SELECT email FROM users WHERE role IN ('ADMIN','SUPER_ADMIN')
      AND email_verified_at IS NOT NULL AND is_archived=0 AND email IS NOT NULL`);
    const deliveries = await Promise.allSettled(admins.map((adminUser: any) => deliverMessage(
      { channel: 'email', destination: adminUser.email },
      'BJMP worker profile change approval requested',
      `Account: ${workerName} (${workerCode})\nRequest: Profile change\nChanged fields: ${changedFields.join(', ')}\nReview request #${requestId} in Administrator Dashboard > Staff > Profile Change Requests.`,
    )));
    adminNotified = deliveries.some(delivery => delivery.status === 'fulfilled');
    const failure = deliveries.find(delivery => delivery.status === 'rejected') as PromiseRejectedResult | undefined;
    notificationError = failure ? String(failure.reason?.message || 'Administrator email could not be sent.').slice(0, 500) : adminNotified ? '' : 'No verified administrator email was available.';
  } catch (error: any) { notificationError = String(error?.message || 'Administrator email could not be sent.').slice(0, 500); }
  try {
    await pool.query('UPDATE profile_change_requests SET admin_notified_at=?,notification_error=? WHERE id=?', [adminNotified ? new Date() : null, notificationError || null, requestId]);
  } catch { /* The review request remains saved even if notification metadata cannot be updated. */ }

  return res.json({ success: true, awaitingApproval: true, adminNotified, message: adminNotified
    ? 'Your profile changes were sent to the administrator for approval. They will take effect after approval.'
    : 'Your profile changes were saved for administrator approval, but the administrator email could not be delivered. Contact an administrator directly.' });
}

async function updateProfile(connection: any, user: any, payload: any) {
  const [duplicates] = await connection.query(`SELECT id FROM users WHERE id<>? AND is_archived=0
    AND ((? IS NOT NULL AND LOWER(email)=?) OR (? IS NOT NULL AND mobile_number=?)) LIMIT 1 FOR UPDATE`,
  [user.id, payload.email, payload.email, payload.mobileNumber, payload.mobileNumber]);
  if (duplicates.length) throw Object.assign(new Error('That email or mobile number is already connected to another account.'), { code: 'ER_DUP_ENTRY' });
  const emailChanged = payload.email !== user.email;
  const phoneChanged = payload.mobileNumber !== user.mobile_number;
  await connection.query(`UPDATE users SET first_name=?,middle_name=?,last_name=?,suffix=?,date_of_birth=?,email=?,mobile_number=?,
    address_data=?,address_street=?,address_municipality=?,zip_code=?,email_verified_at=?,phone_verified_at=? WHERE id=?`, [
    payload.firstName, payload.middleName || null, payload.lastName, payload.suffix || null, payload.dateOfBirth,
    payload.email, payload.mobileNumber, JSON.stringify(payload.address), payload.address.houseUnitStreet || null,
    payload.address.municipality || null, payload.address.zipCode || null,
    emailChanged ? new Date() : user.email_verified_at,
    payload.mobileNumber ? (phoneChanged ? new Date() : user.phone_verified_at) : null,
    user.id,
  ]);
}

accountChangesRouter.post('/profile', accountChangeLimit, auth, async (req, res) => {
  try {
    const user = (req as any).user;
    const payload = profilePayload(req.body, user);
    requireVerifiedEmail(user);
    if (user.role === 'WORKER') return await prepareWorkerProfileRequest(req, res, payload);
    return await prepareRequest(req, res, { requestType: 'PROFILE', payload, contacts: profileContacts(user, payload) });
  } catch (error: any) { return res.status(400).json({ error: error.message || 'Could not request profile changes.' }); }
});

accountChangesRouter.post('/password', accountChangeLimit, auth, async (req, res) => {
  try {
    const user = (req as any).user;
    const contact = requireVerifiedEmail(user);
    if (!strongPassword(String(req.body.password || '')) || req.body.password !== req.body.confirmPassword) {
      return res.status(400).json({ error: 'Choose matching strong passwords (8–128 characters, uppercase, lowercase, number and symbol).' });
    }
    const [rows] = await pool.query<any[]>('SELECT password FROM users WHERE id=? AND is_archived=0', [user.id]);
    if (!rows[0] || !await verifyPassword(String(req.body.currentPassword || ''), rows[0].password)) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }
    return await prepareRequest(req, res, { requestType: 'PASSWORD', passwordHash: await hashPass(String(req.body.password)), contacts: [contact] });
  } catch (error: any) { return res.status(400).json({ error: error.message || 'Could not request a password change.' }); }
});

accountChangesRouter.post('/password/recovery', accountChangeLimit, auth, async (req, res) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'WORKER') return res.status(403).json({ error: 'This signed-in recovery option is for worker accounts.' });
    const contact = requireVerifiedEmail(user);
    const password = String(req.body.password || '');
    if (!strongPassword(password) || password !== req.body.confirmPassword) {
      return res.status(400).json({ error: 'Choose matching strong passwords (8–128 characters, uppercase, lowercase, number and symbol).' });
    }
    return await prepareRequest(req, res, {
      requestType: 'PASSWORD',
      payload: { source: 'PASSWORD_RECOVERY' },
      passwordHash: await hashPass(password),
      contacts: [contact],
    });
  } catch (error: any) { return res.status(400).json({ error: error.message || 'Could not request password recovery.' }); }
});

accountChangesRouter.post('/verify', accountChangeLimit, auth, async (req, res) => {
  const user = (req as any).user;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query<any[]>(`SELECT * FROM profile_change_requests
      WHERE user_id=? AND status='VERIFYING' ORDER BY id DESC LIMIT 1 FOR UPDATE`, [user.id]);
    const request = rows[0];
    if (!request || new Date(request.expires_at).getTime() <= Date.now()) {
      if (request) await connection.query("UPDATE profile_change_requests SET status='EXPIRED' WHERE id=?", [request.id]);
      await connection.commit();
      return res.status(400).json({ error: 'The verification request expired. Start again to get a new code.' });
    }
    const payload = objectValue(request.payload);
    const proofs = objectValue(request.proofs) as any[];
    const next = proofs.find((proof: any) => !proof.verified);
    if (!next || Number(next.attempts) >= 5) {
      await connection.query("UPDATE profile_change_requests SET status='FAILED' WHERE id=?", [request.id]);
      await connection.commit();
      return res.status(429).json({ error: 'Too many incorrect codes. Start a new verification request.' });
    }
    const code = String(req.body.code || '');
    if (next.hash !== digest(payload.requestToken, next.destination, code)) {
      next.attempts = Number(next.attempts || 0) + 1;
      await connection.query('UPDATE profile_change_requests SET proofs=? WHERE id=?', [JSON.stringify(proofs), request.id]);
      await connection.commit();
      return res.status(400).json({ error: 'Invalid verification code.' });
    }
    next.verified = true;
    const remaining = proofs.find((proof: any) => !proof.verified);
    if (remaining) {
      await connection.query('UPDATE profile_change_requests SET proofs=? WHERE id=?', [JSON.stringify(proofs), request.id]);
      await connection.commit();
      return res.json({ success: true, complete: false, contact: maskContact(remaining) });
    }

    const [users] = await connection.query<any[]>('SELECT * FROM users WHERE id=? AND is_archived=0 FOR UPDATE', [user.id]);
    const current = users[0];
    if (!current) { await connection.rollback(); return res.status(401).json({ error: 'Your account is unavailable.' }); }
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(current.role);
    if (!isAdmin) {
      await connection.query(`UPDATE profile_change_requests SET proofs=?,status='PENDING_APPROVAL',verified_at=NOW() WHERE id=?`, [JSON.stringify(proofs), request.id]);
      await connection.commit();
      req.app.emit('profile-change-requests-updated');
      const [admins] = await pool.query<any[]>(`SELECT id,email FROM users WHERE role IN ('ADMIN','SUPER_ADMIN') AND email_verified_at IS NOT NULL AND is_archived=0 AND email IS NOT NULL`);
      let adminNotified = false;
      const staffName = [current.first_name, current.last_name].filter(Boolean).join(' ');
      const workerCode = `WRK-${String(current.id).padStart(6, '0')}`;
      const subject = 'BJMP worker account change approval requested';
      const isPasswordRecovery = request.request_type === 'PASSWORD' && payload.source === 'PASSWORD_RECOVERY';
      const changedFields = request.request_type === 'PASSWORD' ? [isPasswordRecovery ? 'Password recovery' : 'Password'] : [
        ['First name', current.first_name, payload.firstName], ['Middle name', current.middle_name, payload.middleName],
        ['Last name', current.last_name, payload.lastName], ['Suffix', current.suffix, payload.suffix],
        ['Date of birth', String(current.date_of_birth || '').slice(0, 10), payload.dateOfBirth],
        ['Email', current.email, payload.email], ['Mobile number', current.mobile_number, payload.mobileNumber],
        ['Residential address', objectValue(current.address_data), payload.address],
      ].filter(([, before, after]: any[]) => JSON.stringify(before || '') !== JSON.stringify(after || '')).map(([field]: any[]) => field);
      const message = `Account: ${staffName} (${workerCode})\nRequest: ${isPasswordRecovery ? 'Forgot password recovery' : request.request_type === 'PASSWORD' ? 'Password change' : 'Profile change'}\nChanged fields: ${changedFields.join(', ') || 'No profile fields detected'}\nReview exact details in Administrator Dashboard > Staff > Profile Change Requests.`;
      const deliveries = await Promise.allSettled(admins.map((adminUser: any) => deliverMessage({ channel: 'email', destination: adminUser.email }, subject, message)));
      adminNotified = deliveries.some(delivery => delivery.status === 'fulfilled');
      const failure = deliveries.find(delivery => delivery.status === 'rejected') as PromiseRejectedResult | undefined;
      await pool.query('UPDATE profile_change_requests SET admin_notified_at=?,notification_error=? WHERE id=?', [adminNotified ? new Date() : null, failure ? String(failure.reason?.message || 'Administrator email could not be sent.').slice(0, 500) : (adminNotified ? null : 'No verified administrator email was available.'), request.id]);
      return res.json({ success: true, complete: true, awaitingApproval: true, adminNotified, message: adminNotified ? 'Email verified. Your changes are waiting for administrator approval, and the administrator was notified by email.' : 'Email verified. Your changes are waiting for administrator approval, but the administrator email could not be delivered. Contact an administrator directly.' });
    }

    if (request.request_type === 'PASSWORD') {
      if (!request.new_password_hash) throw new Error('The requested password change is incomplete.');
      await connection.query('UPDATE users SET password=? WHERE id=?', [request.new_password_hash, current.id]);
    } else {
      await updateProfile(connection, current, payload);
    }
    await connection.query("UPDATE profile_change_requests SET proofs=?,status='APPLIED',verified_at=NOW(),applied_at=NOW() WHERE id=?", [JSON.stringify(proofs), request.id]);
    await connection.query('DELETE FROM account_change_requests WHERE user_id=?', [current.id]);
    await connection.query('DELETE FROM auth_sessions WHERE user_id=?', [current.id]);
    await connection.query('UPDATE auth_otps SET used_at=NOW() WHERE user_id=? AND purpose IN (\'PASSWORD_RESET\',\'RESET_GRANT\',\'LOGIN\')', [current.id]);
    await connection.query('INSERT INTO audit_logs(actor_user_id,actor_role,action,target_type,target_id,result,details,ip_address) VALUES(?,?,?,?,?,\'SUCCESS\',?,?)', [current.id,current.role,request.request_type === 'PASSWORD' ? 'PASSWORD_CHANGED' : 'PROFILE_CHANGED','USER',String(current.id),JSON.stringify({requestId:request.id,fields:request.request_type === 'PASSWORD' ? ['password'] : ['name','birthdate','email','mobile','address']}),req.ip]);
    await connection.commit();
    req.app.emit('sessions-invalidated', String(current.id));
    res.json({ success: true, complete: true, message: 'Email verified and changes saved. Sign in again.' });
  } catch (error: any) {
    await connection.rollback();
    res.status(error.code === 'ER_DUP_ENTRY' ? 409 : 500).json({ error: error.code === 'ER_DUP_ENTRY' ? 'That email or mobile number is already connected to another account.' : error.message || 'Could not apply the verified changes.' });
  } finally { connection.release(); }
});

accountChangesRouter.get('/admin/requests/count', auth, admin, async (_req, res) => {
  const [rows] = await pool.query<any[]>(`SELECT COUNT(*) AS count FROM profile_change_requests r
    JOIN users u ON u.id=r.user_id WHERE r.status='PENDING_APPROVAL' AND u.role='WORKER' AND u.is_archived=0`);
  res.json({ count: Number(rows[0]?.count || 0) });
});

accountChangesRouter.get('/admin/requests', auth, admin, async (_req, res) => {
  const [rows] = await pool.query<any[]>(`SELECT r.id,r.user_id,r.request_type,r.payload,r.requested_at,r.verified_at,
    u.first_name,u.middle_name,u.last_name,u.email,u.mobile_number,u.address_data,u.address_street,u.address_municipality,u.zip_code
    FROM profile_change_requests r JOIN users u ON u.id=r.user_id
    WHERE r.status='PENDING_APPROVAL' AND u.role='WORKER' AND u.is_archived=0 ORDER BY r.requested_at`);
  res.json(rows.map((row: any) => {
    const requested = objectValue(row.payload);
    delete requested.requestToken;
    return ({
    id: row.id,
    userId: row.user_id,
    requestType: row.request_type,
    source: row.request_type === 'PASSWORD' && requested.source === 'PASSWORD_RECOVERY' ? 'PASSWORD_RECOVERY' : 'ACCOUNT_CHANGE',
    requestedAt: row.requested_at,
    workerName: [row.first_name,row.middle_name,row.last_name].filter(Boolean).join(' '),
    current: { firstName: row.first_name, middleName: row.middle_name || '', lastName: row.last_name, email: row.email, mobileNumber: row.mobile_number, address: objectValue(row.address_data) },
    requested: row.request_type === 'PROFILE' ? requested : null,
  });
  }));
});

accountChangesRouter.post('/admin/requests/:id/review', auth, admin, async (req, res) => {
  const decision = String(req.body.decision || '').toUpperCase();
  const reason = clean(req.body.reason, 1000);
  const actor = (req as any).user;
  if (!['APPROVE','REJECT'].includes(decision)) return res.status(400).json({ error: 'Choose approve or reject.' });
  if (!reason) return res.status(400).json({ error: 'Enter the administrator’s decision note so the worker can be told why the request was approved or rejected.' });
  const connection = await pool.getConnection();
  let workerEmail = '';
  let workerId = '';
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query<any[]>('SELECT * FROM profile_change_requests WHERE id=? FOR UPDATE', [req.params.id]);
    const request = rows[0];
    if (!request) { await connection.rollback(); return res.status(404).json({ error: 'Profile change request not found.' }); }
    if (request.status !== 'PENDING_APPROVAL') { await connection.rollback(); return res.status(409).json({ error: 'This request is no longer waiting for review.' }); }
    const [users] = await connection.query<any[]>("SELECT * FROM users WHERE id=? AND role='WORKER' AND is_archived=0 FOR UPDATE", [request.user_id]);
    const worker = users[0];
    if (!worker) { await connection.rollback(); return res.status(404).json({ error: 'The worker account is no longer active.' }); }
    const payload = objectValue(request.payload);
    if (decision === 'APPROVE') {
      if (request.request_type === 'PASSWORD') {
        if (!request.new_password_hash) { await connection.rollback(); return res.status(409).json({ error: 'The password request is incomplete.' }); }
        await connection.query('UPDATE users SET password=? WHERE id=?', [request.new_password_hash, worker.id]);
      } else if (request.request_type === 'PROFILE') {
        await updateProfile(connection, worker, payload);
      } else { await connection.rollback(); return res.status(409).json({ error: 'Unsupported profile change request.' }); }
      await connection.query('DELETE FROM auth_sessions WHERE user_id=?', [worker.id]);
      await connection.query("UPDATE profile_change_requests SET status='APPROVED',reviewed_by=?,reviewed_at=NOW(),review_reason=?,applied_at=NOW() WHERE id=?", [actor.id, reason || null, request.id]);
    } else {
      await connection.query("UPDATE profile_change_requests SET status='REJECTED',reviewed_by=?,reviewed_at=NOW(),review_reason=? WHERE id=?", [actor.id, reason, request.id]);
    }
    await connection.query('INSERT INTO audit_logs(actor_user_id,actor_role,action,target_type,target_id,result,details,ip_address) VALUES(?,?,?,?,?,\'SUCCESS\',?,?)', [actor.id,actor.role,`WORKER_PROFILE_CHANGE_${decision}`,'PROFILE_CHANGE_REQUEST',String(request.id),JSON.stringify({workerId:worker.id,requestType:request.request_type,reason:reason||null}),req.ip]);
    await connection.commit();
    req.app.emit('profile-change-requests-updated');
    workerId = String(worker.id);
    workerEmail = request.request_type === 'PROFILE' && decision === 'APPROVE' ? String(payload.email || worker.email) : String(worker.email || '');
    if (decision === 'APPROVE') req.app.emit('sessions-invalidated', workerId);
    let emailSent = false;
    if (workerEmail) {
      try {
        await deliverMessage({ channel: 'email', destination: workerEmail }, `BJMP account change ${decision.toLowerCase()}`,
          decision === 'APPROVE' ? `Your administrator approved your verified account change. Administrator note: ${reason}. ${request.request_type === 'PASSWORD' ? 'Use the new password you submitted to sign in.' : 'Sign in again to use the updated account.'}` : `Your account change request was not approved. Administrator note: ${reason}`);
        emailSent = true;
      } catch { /* The decision remains recorded even if the mail provider is unavailable. */ }
    }
    res.json({ success: true, decision, emailSent });
  } catch (error: any) {
    await connection.rollback();
    res.status(error.code === 'ER_DUP_ENTRY' ? 409 : 400).json({ error: error.message || 'Could not review this request.' });
  } finally { connection.release(); }
});
