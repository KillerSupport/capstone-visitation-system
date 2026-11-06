import type {PoolConnection} from 'mysql2/promise';
import {normalizeEmail,normalizePhilippineMobileNumber} from '../identity.js';
// Additive and repeatable. Existing identities are checked before normalization.
export async function migrateFeatures(conn:PoolConnection){
 const [users]=await conn.query<any[]>('SELECT id,email,mobile_number FROM users');
 const emails=new Map<string,number>(),phones=new Map<string,number>();
 for(const u of users){
  for(const [raw,normalize,owners,label] of [[u.email,normalizeEmail,emails,'email'],[u.mobile_number,normalizePhilippineMobileNumber,phones,'mobile']] as const){
   if(!raw)continue;const value=normalize(raw);if(!value)throw Error(`Account ${u.id} has an invalid ${label}. Reconcile it before migration; no accounts were merged.`);
   if(owners.has(value)&&owners.get(value)!==u.id)throw Error(`Accounts ${owners.get(value)} and ${u.id} have duplicate normalized ${label}. Reconcile manually; no accounts were deleted.`);owners.set(value,u.id);
  }
 }
 for(const u of users)await conn.query('UPDATE users SET email=?,mobile_number=? WHERE id=?',[u.email?normalizeEmail(u.email):null,u.mobile_number?normalizePhilippineMobileNumber(u.mobile_number):null,u.id]);
  for(const [table,column,definition] of [['users','address_data','LONGTEXT NULL'],['pdls','demo_batch','VARCHAR(60) NULL'],['appointments','companions','LONGTEXT NULL'],['appointments','checked_in_at','DATETIME NULL']] ){
  const [cols]=await conn.query<any[]>(`SHOW COLUMNS FROM \`${table}\``);if(!cols.some(x=>x.Field===column))await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
 }
 await conn.query(`CREATE TABLE IF NOT EXISTS account_change_requests (
  user_id INT PRIMARY KEY, payload LONGTEXT NOT NULL, proofs LONGTEXT NOT NULL,
  expires_at DATETIME NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
 await conn.query(`CREATE TABLE IF NOT EXISTS profile_change_requests (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  request_type VARCHAR(20) NOT NULL,
  payload LONGTEXT NULL,
  new_password_hash VARCHAR(255) NULL,
  proofs LONGTEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'VERIFYING',
  requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  verified_at DATETIME NULL,
  reviewed_by INT NULL,
  reviewed_at DATETIME NULL,
  review_reason TEXT NULL,
  applied_at DATETIME NULL,
  admin_notified_at DATETIME NULL,
  notification_error TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_profile_change_user_status(user_id,status,requested_at),
  INDEX idx_profile_change_queue(status,requested_at),
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(reviewed_by) REFERENCES users(id) ON DELETE SET NULL
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
 // Prior admitted visits must remain used after upgrading the entrance workflow.
 await conn.query("UPDATE appointments a JOIN (SELECT appointment_id,MIN(timestamp) AS entered_at FROM gate_logs WHERE action='ADMITTED' AND appointment_id IS NOT NULL GROUP BY appointment_id) g ON g.appointment_id=a.id SET a.checked_in_at=COALESCE(a.checked_in_at,g.entered_at)");
 await conn.query(`CREATE TABLE IF NOT EXISTS gate_verification_sessions (
  token_hash CHAR(64) PRIMARY KEY, staff_id INT NOT NULL, visitor_id INT NOT NULL,
  appointment_id VARCHAR(100) NOT NULL, expires_at DATETIME NOT NULL, qr_verified_at DATETIME NULL,
  consumed_at DATETIME NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_gate_expiry(expires_at), FOREIGN KEY(staff_id) REFERENCES users(id),
  FOREIGN KEY(visitor_id) REFERENCES users(id), FOREIGN KEY(appointment_id) REFERENCES appointments(id)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
 await conn.query(`CREATE TABLE IF NOT EXISTS feature_migrations (version VARCHAR(100) PRIMARY KEY, applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
 await conn.query("INSERT IGNORE INTO feature_migrations(version) VALUES('20261019_visitor_security_and_scheduling')");
}

/** Preserve access already granted before secondary-contact verification was introduced.
 * This never marks a contact verified and never applies to new registrations. */
export async function migrateLegacyContactAccess(conn:PoolConnection){
 const [columns]=await conn.query<any[]>('SHOW COLUMNS FROM users');
 if(!columns.some(x=>x.Field==='contact_access_policy'))await conn.query("ALTER TABLE users ADD COLUMN contact_access_policy VARCHAR(30) NOT NULL DEFAULT 'ALL_REGISTERED'");
 await conn.beginTransaction();
 try{
  const [applied]=await conn.query<any[]>("SELECT version FROM feature_migrations WHERE version='20261019_legacy_verified_access' FOR UPDATE");
  if(!applied.length){
   const [users]=await conn.query<any[]>("SELECT id FROM users WHERE account_status IN ('ACTIVE','ACTIVATED') AND is_archived=0 AND ((email IS NOT NULL AND email<>'' AND email_verified_at IS NOT NULL) OR (mobile_number IS NOT NULL AND mobile_number<>'' AND phone_verified_at IS NOT NULL)) FOR UPDATE");
   for(const user of users){
    await conn.query("UPDATE users SET contact_access_policy='LEGACY_VERIFIED' WHERE id=?",[user.id]);
    await conn.query("INSERT INTO audit_logs(actor_role,action,target_type,target_id,result,details) VALUES('SYSTEM','LEGACY_ACCESS_PRESERVED','USER',?,'SUCCESS',?)",[String(user.id),JSON.stringify({reason:'Preserved an existing active account with a previously verified contact; secondary contacts remain unverified.'})]);
   }
   await conn.query("INSERT INTO feature_migrations(version) VALUES('20261019_legacy_verified_access')");
  }
  await conn.commit();
 }catch(error){await conn.rollback();throw error}
}
