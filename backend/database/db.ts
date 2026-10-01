import { normalizePhilippineMobileNumber } from '../identity.js';
import mysql from 'mysql2/promise';
import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';
import 'dotenv/config';

// ─────────────────────────────────────────────────────────────────────────────
// MySQL connection pool (uses your XAMPP settings from .env)
// ─────────────────────────────────────────────────────────────────────────────
export const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'bjmp_visitation',
  waitForConnections: true,
  connectionLimit: 10,
  multipleStatements: true,
});

// ─────────────────────────────────────────────────────────────────────────────
// Create database + tables if they don't exist yet
// ─────────────────────────────────────────────────────────────────────────────
export async function initDatabase() {
  // First connect WITHOUT a database to create it if needed
  const root = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     Number(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  await root.execute(
    `CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'bjmp_visitation'}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await root.end();

  // Now create all tables
  const conn = await pool.getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS jail_facilities (
        id                   VARCHAR(100) PRIMARY KEY,
        name                 VARCHAR(200) NOT NULL,
        region               VARCHAR(100) NOT NULL,
        municipality         VARCHAR(100) NOT NULL,
        address              TEXT NOT NULL,
        contact_number       VARCHAR(100) NOT NULL,
        visiting_days        TEXT NOT NULL,
        visiting_hours       TEXT NOT NULL,
        biometric_desk_hours TEXT NOT NULL,
        capacity_per_slot    INT NOT NULL DEFAULT 40
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS users (
        id                          INT AUTO_INCREMENT PRIMARY KEY,
        email                       VARCHAR(255) NULL,
        mobile_number               VARCHAR(30) NULL,
        password                    VARCHAR(255) NOT NULL,
        role                        VARCHAR(50)  NOT NULL DEFAULT 'VISITOR',
        admin_title                 VARCHAR(200),
        badge_number                VARCHAR(100),
        first_name                  VARCHAR(100) NOT NULL,
        middle_name                 VARCHAR(100),
        last_name                   VARCHAR(100) NOT NULL,
        suffix                      VARCHAR(20),
        date_of_birth               DATE,
        gender                      VARCHAR(20),
        address_street              TEXT,
        address_municipality        VARCHAR(200),
        marital_status              VARCHAR(50),
        zip_code                    VARCHAR(10),
        valid_id_type               VARCHAR(100),
        valid_id_photo_url          TEXT,
        face_photo_url              TEXT,
        account_status              VARCHAR(50) NOT NULL DEFAULT 'PENDING_EMAIL',
        biometric_reference_number  VARCHAR(100),
        preferred_jail_facility_id  VARCHAR(100),
        email_verified_at           DATETIME,
        biometric_scanned_at        DATETIME,
        biometrics_officer_name     VARCHAR(200),
        registered_at               DATETIME NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS pdls (
        id                              VARCHAR(100) PRIMARY KEY,
        pdl_number                      VARCHAR(100) UNIQUE NOT NULL,
        file_number                     VARCHAR(100),
        bjmp_id_number                  VARCHAR(100),
        last_name                       VARCHAR(100) NOT NULL,
        first_name                      VARCHAR(100) NOT NULL,
        middle_name                     VARCHAR(100),
        suffix                          VARCHAR(20),
        aliases                         TEXT,
        date_of_birth                   DATE,
        age_at_admission                INT,
        place_of_birth                  VARCHAR(200),
        sex                             VARCHAR(20) NOT NULL,
        civil_status                    VARCHAR(50),
        citizenship                     VARCHAR(100) DEFAULT 'Filipino',
        religion                        VARCHAR(100),
        tribal_affiliation              VARCHAR(100),
        present_address                 TEXT,
        provincial_address              TEXT,
        highest_educational_attainment  VARCHAR(100),
        course                          VARCHAR(100),
        occupation                      VARCHAR(200),
        skills                          TEXT,
        gang_group_affiliation          VARCHAR(200),
        height                          VARCHAR(50),
        weight                          VARCHAR(50),
        built                           VARCHAR(50),
        complexion                      VARCHAR(50),
        eyes                            VARCHAR(50),
        hair                            VARCHAR(100),
        blood_type                      VARCHAR(10),
        mannerism                       TEXT,
        dialects_spoken                 VARCHAR(200),
        bertillion_marks                TEXT,
        emergency_contact_person        VARCHAR(200),
        emergency_contact_relation      VARCHAR(100),
        emergency_contact_address       TEXT,
        emergency_contact_phone         VARCHAR(50),
        date_committed                  DATE,
        jail_facility_id                VARCHAR(100) NOT NULL,
        cell_dormitory                  VARCHAR(200) NOT NULL,
        status                          VARCHAR(50) NOT NULL DEFAULT 'In Custody',
        primary_offense                 TEXT,
        court_branch                    VARCHAR(200),
        presiding_judge                 VARCHAR(200),
        case_status                     VARCHAR(100)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS appointments (
        id                        VARCHAR(100) PRIMARY KEY,
        appointment_reference     VARCHAR(100) UNIQUE NOT NULL,
        user_id                   VARCHAR(100) NOT NULL,
        visitor_name              VARCHAR(255) NOT NULL,
        visitor_contact           VARCHAR(50)  NOT NULL,
        pdl_id                    VARCHAR(100) NOT NULL,
        pdl_name                  VARCHAR(255) NOT NULL,
        pdl_number                VARCHAR(100) NOT NULL,
        jail_facility_id          VARCHAR(100) NOT NULL,
        jail_facility_name        VARCHAR(200) NOT NULL,
        cell_dormitory            VARCHAR(200) NOT NULL,
        visit_type                VARCHAR(100) NOT NULL,
        relationship_to_pdl       VARCHAR(100) NOT NULL,
        visit_date                DATE         NOT NULL,
        time_slot                 VARCHAR(100) NOT NULL,
        paabot_items_description  TEXT,
        status                    VARCHAR(50)  NOT NULL DEFAULT 'Approved',
        created_at                DATETIME     NOT NULL,
        qr_token                  VARCHAR(255) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS gate_logs (
        id              VARCHAR(100) PRIMARY KEY,
        appointment_id  VARCHAR(100),
        user_id         VARCHAR(100) NOT NULL,
        visitor_name    VARCHAR(255) NOT NULL,
        pdl_name        VARCHAR(255) NOT NULL,
        facility_id     VARCHAR(100) NOT NULL,
        guard_officer   VARCHAR(200) NOT NULL,
        action          VARCHAR(50)  NOT NULL,
        timestamp       DATETIME     NOT NULL,
        notes           TEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS security_incidents (
        id                VARCHAR(100) PRIMARY KEY,
        timestamp         VARCHAR(50)  NOT NULL,
        visitor_name      VARCHAR(255) NOT NULL,
        facility          VARCHAR(200) NOT NULL,
        incident_type     VARCHAR(100) NOT NULL,
        description       TEXT         NOT NULL,
        action_taken      TEXT         NOT NULL,
        reporting_officer VARCHAR(200) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS announcements (
        id         VARCHAR(100) PRIMARY KEY,
        title      VARCHAR(255) NOT NULL,
        content    TEXT         NOT NULL,
        level      VARCHAR(20)  NOT NULL DEFAULT 'info',
        posted_by  VARCHAR(200) NOT NULL,
        created_at DATETIME     NOT NULL,
        is_active  TINYINT(1)   NOT NULL DEFAULT 1
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      /* Every paper PDL form is saved as a named, structured digital record.
         LONGTEXT keeps this compatible with common XAMPP MySQL versions. */
      CREATE TABLE IF NOT EXISTS pdl_form_records (
        id            VARCHAR(100) PRIMARY KEY,
        pdl_id        VARCHAR(100) NOT NULL,
        record_type   VARCHAR(100) NOT NULL,
        status        VARCHAR(50)  NOT NULL DEFAULT 'DRAFT',
        form_data     LONGTEXT     NOT NULL,
        prepared_by   VARCHAR(100),
        approved_by   VARCHAR(100),
        created_at    DATETIME     NOT NULL,
        updated_at    DATETIME     NOT NULL,
        UNIQUE KEY unique_pdl_record_type (pdl_id, record_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      /* The two visitor paper logs are generated from a permanent entry log. */
      CREATE TABLE IF NOT EXISTS visitor_log_entries (
        id              VARCHAR(100) PRIMARY KEY,
        log_type        VARCHAR(50)  NOT NULL,
        appointment_id  VARCHAR(100),
        gate_log_id     VARCHAR(100),
        visitor_id      VARCHAR(100),
        pdl_id          VARCHAR(100),
        visit_date      DATE         NOT NULL,
        time_in         DATETIME,
        time_out        DATETIME,
        visitor_name    VARCHAR(255) NOT NULL,
        gender          VARCHAR(20),
        address         TEXT,
        age             INT,
        contact_number  VARCHAR(50),
        relationship_to_pdl VARCHAR(100),
        purpose_of_visit VARCHAR(255),
        cell_number     VARCHAR(100),
        created_at      DATETIME     NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Preserve existing accounts while upgrading older installations.
    const [userCols] = await conn.query<mysql.RowDataPacket[]>("SHOW COLUMNS FROM users");
    const cols = new Set(userCols.map((col: any) => col.Field));
    if (!cols.has('mobile_number')) await conn.query('ALTER TABLE users ADD COLUMN mobile_number VARCHAR(30) NULL AFTER email');
    await conn.query('ALTER TABLE users MODIFY email VARCHAR(255) NULL');
    const extraCols = new Set(cols);
    if (!extraCols.has('phone_verified_at')) await conn.query('ALTER TABLE users ADD COLUMN phone_verified_at DATETIME NULL AFTER email_verified_at');
    if (!extraCols.has('last_login_at')) await conn.query('ALTER TABLE users ADD COLUMN last_login_at DATETIME NULL AFTER phone_verified_at');

    // Merge the legacy contact_number into the canonical mobile_number without losing or
    // silently changing any values. Abort before writes if records conflict or are not PH mobile numbers.
    if (cols.has('contact_number')) {
      const [legacyUsers] = await conn.query<mysql.RowDataPacket[]>('SELECT id,mobile_number,contact_number FROM users');
      const canonicalByUser = new Map<number,string>();
      const ownerByPhone = new Map<string,number>();
      for (const row of legacyUsers) {
        const mobileRaw=String(row.mobile_number||'').trim(), contactRaw=String(row.contact_number||'').trim();
        const mobile=mobileRaw?normalizePhilippineMobileNumber(mobileRaw):null;
        const contact=contactRaw?normalizePhilippineMobileNumber(contactRaw):null;
        if ((mobileRaw&&!mobile)||(contactRaw&&!contact)) throw new Error('Cannot remove users.contact_number safely: a stored account contact is not a valid Philippine mobile number. Reconcile that account first.');
        if (mobile&&contact&&mobile!==contact) throw new Error('Cannot remove users.contact_number safely: an account has conflicting mobile and contact values. Reconcile that account first.');
        const phone=mobile||contact;
        if(phone){const existing=ownerByPhone.get(phone);if(existing&&existing!==Number(row.id))throw new Error('Cannot merge legacy account contacts: duplicate normalized Philippine mobile numbers exist. Reconcile duplicates first.');ownerByPhone.set(phone,Number(row.id));canonicalByUser.set(Number(row.id),phone);}
      }
      for (const [id,phone] of canonicalByUser) await conn.query('UPDATE users SET mobile_number=? WHERE id=?',[phone,id]);
      await conn.query('ALTER TABLE users DROP COLUMN contact_number');
    }

    const [phoneRows] = await conn.query<mysql.RowDataPacket[]>('SELECT id,mobile_number FROM users WHERE mobile_number IS NOT NULL');
    const normalizedPhones=new Map<string,number>();
    const normalizedRows: {id:number;phone:string}[]=[];
    for (const row of phoneRows) { const normalized=normalizePhilippineMobileNumber(String(row.mobile_number)); if (!normalized) continue; const existing=normalizedPhones.get(normalized); if (existing && existing!==Number(row.id)) throw new Error('Duplicate Philippine mobile numbers in existing users. Resolve duplicate accounts before starting the server.'); normalizedPhones.set(normalized,Number(row.id)); if (normalized!==row.mobile_number) normalizedRows.push({id:Number(row.id),phone:normalized}); }
    for (const row of normalizedRows) await conn.query('UPDATE users SET mobile_number=? WHERE id=?',[row.phone,row.id]);
    const [idx] = await conn.query<mysql.RowDataPacket[]>("SHOW INDEX FROM users");
    if (!idx.some((i: any) => i.Column_name === 'email' && i.Non_unique === 0)) await conn.query('CREATE UNIQUE INDEX uq_users_email ON users(email)');
    if (!idx.some((i: any) => i.Column_name === 'mobile_number' && i.Non_unique === 0)) await conn.query('CREATE UNIQUE INDEX uq_users_mobile ON users(mobile_number)');

    const [pdlCols] = await conn.query<mysql.RowDataPacket[]>("SHOW COLUMNS FROM pdls");
    const hasPdlFullName=pdlCols.some((col:any)=>col.Field==='full_name');
    const [pdlRows] = await conn.query<mysql.RowDataPacket[]>(`SELECT p.*, r.id AS profile_record_id, r.form_data AS profile_data FROM pdls p LEFT JOIN pdl_form_records r ON r.pdl_id=p.id AND r.record_type='PDL_PROFILE'`);
    for (const row of pdlRows) {
      const parts=[row.first_name,row.middle_name,row.last_name,row.suffix].map((x:any)=>String(x||'').trim()).filter(Boolean);
      const derived=parts.join(' ').replace(/\s+/g,' ').trim();
      if(hasPdlFullName&&(!derived||derived.toLowerCase()!==String(row.full_name||'').replace(/\s+/g,' ').trim().toLowerCase())) throw new Error('Cannot remove pdls.full_name safely: at least one display name differs from its name parts. Reconcile that PDL first.');
      if(!row.profile_record_id||!row.profile_data)continue;
      const profile=parseRecordData(row.profile_data);
      // The current mapper prefers PDL_PROFILE dates over the duplicate columns, so
      // migrate those displayed values into the canonical columns before trimming JSON.
      const dateValue=(value:any)=>{const d=String(value||'').slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(d))return null;const parsed=new Date(`${d}T00:00:00Z`);return Number.isNaN(parsed.getTime())||parsed.toISOString().slice(0,10)!==d?null:d};
      const profileDob=dateValue(profile.dateOfBirth), profileCommitted=dateValue(profile.dateCommitted);
      const storedDob=dateOnly(row.date_of_birth)||null, storedCommitted=dateOnly(row.date_committed)||null;
      const nextDob=profileDob||storedDob, nextCommitted=profileCommitted||storedCommitted;
      if(nextDob!==storedDob||nextCommitted!==storedCommitted){await conn.query('UPDATE pdls SET date_of_birth=?,date_committed=? WHERE id=?',[nextDob,nextCommitted,row.id]);row.date_of_birth=nextDob;row.date_committed=nextCommitted;}
      const extras=removeDuplicatePdlProfileFields(profile,row);
      await conn.query('UPDATE pdl_form_records SET form_data=? WHERE id=?',[JSON.stringify(extras),row.profile_record_id]);
    }
    if(hasPdlFullName)await conn.query('ALTER TABLE pdls DROP COLUMN full_name');

    await conn.query(`CREATE TABLE IF NOT EXISTS auth_sessions (token_hash CHAR(64) PRIMARY KEY, user_id INT NOT NULL, expires_at DATETIME NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX idx_session_user(user_id), FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await conn.query(`CREATE TABLE IF NOT EXISTS auth_otps (id BIGINT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, purpose VARCHAR(30) NOT NULL, code_hash CHAR(64) NOT NULL, expires_at DATETIME NOT NULL, attempts INT NOT NULL DEFAULT 0, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX idx_otp_lookup(user_id,purpose,created_at), FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await conn.query(`CREATE TABLE IF NOT EXISTS kyc_submissions (
      id BIGINT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, id_type VARCHAR(100) NOT NULL,
      id_number_encrypted TEXT NOT NULL, id_number_hash CHAR(64) NOT NULL, id_number_last4 CHAR(4) NOT NULL, full_name VARCHAR(255) NOT NULL,
      date_of_birth DATE NULL, address TEXT NULL, status VARCHAR(30) NOT NULL DEFAULT 'PENDING_REVIEW',
      automated_check JSON NULL, submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      reviewed_at DATETIME NULL, reviewer_id INT NULL, rejection_reason TEXT NULL,
      INDEX idx_kyc_status_submitted(status, submitted_at), INDEX idx_kyc_user(user_id, submitted_at),
      INDEX idx_kyc_id_hash(id_number_hash), FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await conn.query(`CREATE TABLE IF NOT EXISTS kyc_documents (
      id BIGINT AUTO_INCREMENT PRIMARY KEY, submission_id BIGINT NOT NULL, side VARCHAR(10) NOT NULL,
      mime_type VARCHAR(40) NOT NULL, sha256 CHAR(64) NOT NULL, image_data LONGBLOB NOT NULL,
      UNIQUE KEY uq_kyc_document_side(submission_id, side),
      FOREIGN KEY(submission_id) REFERENCES kyc_submissions(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await conn.query(`CREATE TABLE IF NOT EXISTS audit_logs (
      id BIGINT AUTO_INCREMENT PRIMARY KEY, actor_user_id INT NULL, actor_role VARCHAR(30) NOT NULL,
      action VARCHAR(80) NOT NULL, target_type VARCHAR(40) NOT NULL, target_id VARCHAR(100) NULL,
      result VARCHAR(30) NOT NULL, details JSON NULL, ip_address VARCHAR(45) NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_audit_created(created_at), INDEX idx_audit_target(target_type,target_id),
      FOREIGN KEY(actor_user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    const archiveTables = ['users','pdls','appointments','announcements','security_incidents'] as const;
    for (const table of archiveTables) {
      const [columns] = await conn.query<mysql.RowDataPacket[]>(`SHOW COLUMNS FROM \`${table}\``);
      const names = new Set(columns.map((column:any) => column.Field));
      if (!names.has('is_archived')) await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN is_archived TINYINT(1) NOT NULL DEFAULT 0`);
      if (!names.has('archived_at')) await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN archived_at DATETIME NULL`);
      if (!names.has('archived_by')) await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN archived_by INT NULL`);
      if (!names.has('archive_reason')) await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN archive_reason TEXT NULL`);
    }
    const [auditColumns] = await conn.query<mysql.RowDataPacket[]>('SHOW COLUMNS FROM audit_logs');
    if (!auditColumns.some((column:any) => column.Field === 'ip_address')) await conn.query('ALTER TABLE audit_logs ADD COLUMN ip_address VARCHAR(45) NULL AFTER details');
    await conn.query(`CREATE TABLE IF NOT EXISTS record_archive_events (
      id BIGINT AUTO_INCREMENT PRIMARY KEY, record_type VARCHAR(40) NOT NULL, record_id VARCHAR(100) NOT NULL,
      action VARCHAR(20) NOT NULL, record_label VARCHAR(255) NOT NULL, original_created_at DATETIME NULL,
      previous_status VARCHAR(50) NULL, reason TEXT NULL, actor_user_id INT NULL, performed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_archive_record(record_type,record_id,performed_at), INDEX idx_archive_action(action,performed_at),
      FOREIGN KEY(actor_user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    const [kycCols] = await conn.query<mysql.RowDataPacket[]>('SHOW COLUMNS FROM kyc_submissions');
    if (!kycCols.some((col:any)=>col.Field==='id_number_last4')) await conn.query("ALTER TABLE kyc_submissions ADD COLUMN id_number_last4 CHAR(4) NOT NULL DEFAULT '****' AFTER id_number_hash");

    // Seed default data only if the users table is empty
    const [rows] = await conn.query<mysql.RowDataPacket[]>('SELECT COUNT(*) as cnt FROM users');
    if (rows[0].cnt === 0) {
      console.log('🌱 Seeding BJMP database with initial records...');
      await seedDatabase(conn);
      console.log('✅ Database seeded successfully.');
    }

    await conn.query(`UPDATE jail_facilities SET region='Region IV-A (CALABARZON)', address='Imus City, Cavite', contact_number='Check BJMP ODBS for current contact details', visiting_days='Confirm current days in BJMP ODBS', visiting_hours='Check official system for available dates and time slots', biometric_desk_hours='Confirm biometric desk hours with the facility before traveling' WHERE id IN ('imus-city-jail-male','imus-city-jail-female')`);
  } finally {
    conn.release();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Seed default BJMP data
// ─────────────────────────────────────────────────────────────────────────────
async function seedDatabase(conn: mysql.PoolConnection) {
  const adminPassword=process.env.INITIAL_ADMIN_PASSWORD;
  if(!adminPassword||adminPassword.length<12) throw new Error('Set INITIAL_ADMIN_PASSWORD (12+ characters) before initializing an empty database.');
  if(process.env.INITIAL_WORKER_PASSWORD&&process.env.INITIAL_WORKER_PASSWORD.length<12) throw new Error('INITIAL_WORKER_PASSWORD must contain at least 12 characters.');
  await conn.query(`INSERT INTO jail_facilities VALUES
    ('imus-city-jail-male','BJMP Imus City Jail - Male Dormitory','Region IV-A (CALABARZON)','Imus City, Cavite','Imus City, Cavite','Check BJMP ODBS for current contact details','Confirm current days in BJMP ODBS','Check official system for available dates and time slots','Confirm biometric desk hours with the facility before traveling',40)`);
  const adminHash=await hashSeedPassword(adminPassword);
  const rows:string[][]=[
    [process.env.INITIAL_ADMIN_EMAIL||'admin@bjmp.gov.ph',adminHash,'ADMIN','System Administrator','BJMP-ADM-001','Maria','S.','Reyes']
  ];
  if(process.env.INITIAL_WORKER_PASSWORD){
    if(process.env.INITIAL_WORKER_PASSWORD.length<12) throw new Error('INITIAL_WORKER_PASSWORD must contain at least 12 characters.');
    rows.push([process.env.INITIAL_WORKER_EMAIL||'worker@bjmp.gov.ph',await hashSeedPassword(process.env.INITIAL_WORKER_PASSWORD),'WORKER','Visitation Worker','BJMP-WRK-001','Jose','D.','Santos']);
  }
  for(const row of rows) await conn.query('INSERT INTO users(email,password,role,admin_title,badge_number,first_name,middle_name,last_name,account_status,email_verified_at,registered_at) VALUES(?,?,?,?,?,?,?,?,?,?,NOW())',[row[0],row[1],row[2],row[3],row[4],row[5],row[6],row[7],'ACTIVATED',new Date()]);
}
const seedScrypt=promisify(scryptCallback);
async function hashSeedPassword(password:string){const salt=randomBytes(16),key=await seedScrypt(password,salt,64) as Buffer;return `scrypt:${salt.toString('hex')}:${key.toString('hex')}`}

// ─────────────────────────────────────────────────────────────────────────────
// Row mapper helpers
// ─────────────────────────────────────────────────────────────────────────────
function mapUserRow(r: any) {
  return {
    id: String(r.id),
    email: r.email || "",
    mobileNumber: r.mobile_number || "",

    role: r.role,
    adminTitle: r.admin_title,
    badgeNumber: r.badge_number,
    firstName: r.first_name,
    middleName: r.middle_name,
    lastName: r.last_name,
    suffix: r.suffix,
    dateOfBirth: r.date_of_birth,
    gender: r.gender,
    address: {
      houseUnitStreet: r.address_street,
      municipality: r.address_municipality,
      maritalStatus: r.marital_status,
      zipCode: r.zip_code,
    },
    maritalStatus: r.marital_status,
    validIdType: r.valid_id_type,
    emailVerified: !!r.email_verified_at,
    phoneVerified: !!r.phone_verified_at,
    lastLoginAt: r.last_login_at,
    accountStatus: r.account_status,
    biometricReferenceNumber: r.biometric_reference_number,
    preferredJailFacilityId: r.preferred_jail_facility_id,
    emailVerifiedAt: r.email_verified_at,
    biometricScannedAt: r.biometric_scanned_at,
    biometricsOfficerName: r.biometrics_officer_name,
    registeredAt: r.registered_at,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// User functions
// ─────────────────────────────────────────────────────────────────────────────
export async function getAllUsers() {
  const [rows] = await pool.query<mysql.RowDataPacket[]>('SELECT * FROM users WHERE is_archived=0 ORDER BY registered_at DESC');
  return rows.map(mapUserRow);
}

export async function getUserById(id: string) {
  const [rows] = await pool.query<mysql.RowDataPacket[]>('SELECT * FROM users WHERE id = ? AND is_archived=0', [id]);
  return rows[0] ? mapUserRow(rows[0]) : null;
}

export async function getUserByEmail(email: string) {
  const [rows] = await pool.query<mysql.RowDataPacket[]>('SELECT * FROM users WHERE LOWER(email) = LOWER(?) AND is_archived=0', [email]);
  if (!rows[0]) return null;
  return { ...mapUserRow(rows[0]), passwordHash: rows[0].password };
}

export async function getUserByLogin(login: string, type: 'email' | 'phone' = 'email') {
  const [rows] = type === 'phone'
    ? await pool.query<mysql.RowDataPacket[]>('SELECT * FROM users WHERE mobile_number=? AND is_archived=0 LIMIT 1', [login])
    : await pool.query<mysql.RowDataPacket[]>('SELECT * FROM users WHERE LOWER(email)=LOWER(?) AND is_archived=0 LIMIT 1', [login]);
  return rows[0] ? { ...mapUserRow(rows[0]), passwordHash: rows[0].password } : null;
}
export async function recordLastLogin(userId: string) { await pool.query('UPDATE users SET last_login_at=NOW() WHERE id=?', [userId]); }

export async function hashLegacyPasswords(hash: (password: string) => Promise<string>) {
  const [rows] = await pool.query<mysql.RowDataPacket[]>('SELECT id,password FROM users');
  for (const row of rows) if (!String(row.password).startsWith('scrypt:')) await pool.query('UPDATE users SET password=? WHERE id=?', [await hash(String(row.password)), row.id]);
}
export async function createSession(tokenHash: string, userId: string, expires: Date) { await pool.query('INSERT INTO auth_sessions(token_hash,user_id,expires_at) VALUES(?,?,?)', [tokenHash,userId,expires]); }
export async function getSessionUser(tokenHash: string) { const [rows] = await pool.query<mysql.RowDataPacket[]>('SELECT u.* FROM auth_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>NOW() AND u.is_archived=0', [tokenHash]); return rows[0] ? mapUserRow(rows[0]) : null; }
export async function deleteSession(tokenHash: string) { await pool.query('DELETE FROM auth_sessions WHERE token_hash=?',[tokenHash]); }
export async function saveOtp(userId: string, purpose: string, hash: string, expires: Date) {
 const [recent] = await pool.query<mysql.RowDataPacket[]>('SELECT COUNT(*) AS n, MAX(created_at) AS last_sent FROM auth_otps WHERE user_id=? AND purpose=? AND created_at>DATE_SUB(NOW(), INTERVAL 15 MINUTE)', [userId,purpose]);
 if (Number(recent[0]?.n || 0) >= 3 || (recent[0]?.last_sent && Date.now()-new Date(recent[0].last_sent).getTime()<60000)) throw new Error('Verification request rate limit reached.');
 await pool.query('INSERT INTO auth_otps(user_id,purpose,code_hash,expires_at) VALUES(?,?,?,?)',[userId,purpose,hash,expires]);
}
export async function checkOtp(userId: string, purpose: string, hash: string) {
 const [rows] = await pool.query<mysql.RowDataPacket[]>('SELECT * FROM auth_otps WHERE user_id=? AND purpose=? ORDER BY id DESC LIMIT 1',[userId,purpose]);
 const row=rows[0]; if(!row) return 'INVALID'; if(new Date(row.expires_at).getTime()<Date.now()) return 'EXPIRED'; if(row.attempts>=5) return 'LOCKED';
 if(row.code_hash!==hash){ await pool.query('UPDATE auth_otps SET attempts=attempts+1 WHERE id=?',[row.id]); return 'INVALID'; }
 await pool.query('DELETE FROM auth_otps WHERE id=?',[row.id]); return 'OK';
}
export async function markEmailVerified(userId: string) {
 const u=await getUserById(userId);
 if(u?.email) await pool.query('UPDATE users SET email_verified_at=COALESCE(email_verified_at,NOW()) WHERE id=?',[userId]);
 else await pool.query('UPDATE users SET phone_verified_at=COALESCE(phone_verified_at,NOW()) WHERE id=?',[userId]);
 return getUserById(userId);
}

export async function createUser(u: any) {
  if (!u.email && !u.mobileNumber) throw new Error('Email or mobile number is required.');
  if (!u.passwordHash || !String(u.passwordHash).startsWith('scrypt:')) {
    throw new Error('A server-generated password hash is required.');
  }
  if (!u.passwordHash || !String(u.passwordHash).startsWith('scrypt:')) {
    throw new Error('A server-generated password hash is required.');
  }
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const [result] = await pool.query<mysql.ResultSetHeader>(`
    INSERT INTO users
      (email, mobile_number, password, role, admin_title, badge_number, first_name, middle_name, last_name, suffix,
       date_of_birth, gender, address_street, address_municipality, marital_status, zip_code,
       valid_id_type, valid_id_photo_url, face_photo_url, account_status, biometric_reference_number,
       preferred_jail_facility_id, email_verified_at, biometric_scanned_at, biometrics_officer_name, registered_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      (u.email ? String(u.email).trim().toLowerCase() : null), u.mobileNumber || null, u.passwordHash,
      u.role || 'VISITOR', u.adminTitle || null, u.badgeNumber || null,
      u.firstName, u.middleName || null, u.lastName, u.suffix || null,
      u.dateOfBirth || null, u.gender || null,
      u.address?.houseUnitStreet || null, u.address?.municipality || null,
      u.address?.maritalStatus || null, u.address?.zipCode || '4103',
      u.validIdType || null, null, null,
      u.accountStatus || 'PENDING_EMAIL',
      u.biometricReferenceNumber || `BJMP-BIO-IMUS-${Math.floor(1000 + Math.random() * 9000)}`,
      u.preferredJailFacilityId || 'imus-city-jail-male',
      u.emailVerifiedAt || null, u.biometricScannedAt || null, u.biometricsOfficerName || null,
      u.registeredAt || now,
    ]
  );
  return getUserById(String(result.insertId));
}

export async function updateUserStatus(userId: string, status: string, officerName?: string) {
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  if (status === 'ACTIVATED') {
    await pool.query(
      `UPDATE users SET account_status=?, biometric_scanned_at=COALESCE(biometric_scanned_at,?), biometrics_officer_name=? WHERE id=?`,
      [status, now, officerName || 'JO2 R. BAUTISTA (BJMP Imus Records Desk)', userId]
    );
  } else if (status === 'PENDING_BIOMETRICS') {
    await pool.query(
      `UPDATE users SET account_status=?, email_verified_at=COALESCE(email_verified_at,?) WHERE id=?`,
      [status, now, userId]
    );
  } else {
    await pool.query(`UPDATE users SET account_status=? WHERE id=?`, [status, userId]);
  }
  return getUserById(userId);
}

// ─────────────────────────────────────────────────────────────────────────────
// PDL functions
// ─────────────────────────────────────────────────────────────────────────────

const pdlColumnKeys = new Set([
  'id','pdlNumber','fileNumber','bjmpIdNumber','lastName','firstName','middleName','suffix','fullName','aliases',
  'dateOfBirth','ageAtAdmission','placeOfBirth','sex','civilStatus','citizenship','religion','tribalAffiliation',
  'presentAddress','provincialAddress','highestEducationalAttainment','course','occupation','skills','gangGroupAffiliation',
  'height','weight','built','complexion','eyes','hair','bloodType','mannerism','dialectsSpoken','bertillionMarks',
  'emergencyContactPerson','emergencyContactRelation','emergencyContactAddress','emergencyContactPhone','dateCommitted',
  'jailFacilityId','cellDormitory','status','primaryOffense','courtBranch','presidingJudge','caseStatus',
]);
function pdlProfileExtras(profile:Record<string,any>){return Object.fromEntries(Object.entries(profile).filter(([key])=>!pdlColumnKeys.has(key)))}
function removeDuplicatePdlProfileFields(profile:Record<string,any>,row:any){
  const jsonToColumn:Record<string,string>={id:'id',pdlNumber:'pdl_number',fileNumber:'file_number',bjmpIdNumber:'bjmp_id_number',lastName:'last_name',firstName:'first_name',middleName:'middle_name',suffix:'suffix',fullName:'full_name',aliases:'aliases',dateOfBirth:'date_of_birth',ageAtAdmission:'age_at_admission',placeOfBirth:'place_of_birth',sex:'sex',civilStatus:'civil_status',citizenship:'citizenship',religion:'religion',tribalAffiliation:'tribal_affiliation',presentAddress:'present_address',provincialAddress:'provincial_address',highestEducationalAttainment:'highest_educational_attainment',course:'course',occupation:'occupation',skills:'skills',gangGroupAffiliation:'gang_group_affiliation',height:'height',weight:'weight',built:'built',complexion:'complexion',eyes:'eyes',hair:'hair',bloodType:'blood_type',mannerism:'mannerism',dialectsSpoken:'dialects_spoken',bertillionMarks:'bertillion_marks',emergencyContactPerson:'emergency_contact_person',emergencyContactRelation:'emergency_contact_relation',emergencyContactAddress:'emergency_contact_address',emergencyContactPhone:'emergency_contact_phone',dateCommitted:'date_committed',jailFacilityId:'jail_facility_id',cellDormitory:'cell_dormitory',status:'status',primaryOffense:'primary_offense',courtBranch:'court_branch',presidingJudge:'presiding_judge',caseStatus:'case_status'};
  const extras={...profile};
  for(const [key,column] of Object.entries(jsonToColumn)){
    if(!(key in extras))continue;
    let a=extras[key],b=column==='full_name'?(row.full_name??[row.first_name,row.middle_name,row.last_name,row.suffix].map((x:any)=>String(x||'').trim()).filter(Boolean).join(' ')):row[column];
    if(a instanceof Date)a=a.toISOString().slice(0,10);if(b instanceof Date)b=b.toISOString().slice(0,10);
    const norm=(x:any,key:string)=>{if(x===null||x===undefined||x==='')return null;const text=String(x).trim().replace(/\s+/g,' ');return ['dateOfBirth','dateCommitted'].includes(key)?text.slice(0,10):text.toLowerCase()};
    if(norm(a,key)===null||norm(a,key)===norm(b,key))delete extras[key];
  }
  return extras;
}

function mapPdlRow(row: any, profile: Record<string, any> = {}) {
  return {
    ...profile,
    id: row.id,
    pdlNumber: row.pdl_number,
    fileNumber: row.file_number,
    bjmpIdNumber: row.bjmp_id_number,
    lastName: row.last_name,
    firstName: row.first_name,
    middleName: row.middle_name || '',
    suffix: row.suffix || '',
    fullName: [row.first_name,row.middle_name,row.last_name,row.suffix].map((x:any)=>String(x||'').trim()).filter(Boolean).join(' '),
    aliases: row.aliases || '',
    dateOfBirth: profile.dateOfBirth || dateOnly(row.date_of_birth),
    ageAtAdmission: row.age_at_admission,
    placeOfBirth: row.place_of_birth || '',
    sex: row.sex,
    civilStatus: row.civil_status,
    citizenship: row.citizenship,
    religion: row.religion,
    tribalAffiliation: row.tribal_affiliation,
    presentAddress: row.present_address || '',
    provincialAddress: row.provincial_address || '',
    highestEducationalAttainment: row.highest_educational_attainment || '',
    course: row.course || '', occupation: row.occupation || '', skills: row.skills || '',
    gangGroupAffiliation: row.gang_group_affiliation || '', height: row.height || '', weight: row.weight || '',
    built: row.built || '', complexion: row.complexion || '', eyes: row.eyes || '', hair: row.hair || '',
    bloodType: row.blood_type || '', mannerism: row.mannerism || '', dialectsSpoken: row.dialects_spoken || '',
    bertillionMarks: row.bertillion_marks || '', emergencyContactPerson: row.emergency_contact_person || '',
    emergencyContactRelation: row.emergency_contact_relation || '', emergencyContactAddress: row.emergency_contact_address || '',
    emergencyContactPhone: row.emergency_contact_phone || '',
    dateCommitted: profile.dateCommitted || dateOnly(row.date_committed),
    jailFacilityId: row.jail_facility_id, cellDormitory: row.cell_dormitory, status: row.status,
    primaryOffense: row.primary_offense || '', courtBranch: row.court_branch || '',
    presidingJudge: row.presiding_judge || '', caseStatus: row.case_status || '',
    allowedVisitorRelationship: profile.allowedVisitorRelationship || ['Spouse', 'Parent', 'Child', 'Sibling', 'Legal Counsel'],
    bodyMarks: profile.bodyMarks || [],
  };
}

function parseRecordData(value: any): Record<string, any> {
  try { return value ? JSON.parse(value) : {}; } catch { return {}; }
}

function dateOnly(value: any): string | undefined {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

export async function getAllPdls() {
  const [rows] = await pool.query<mysql.RowDataPacket[]>(`
    SELECT p.*, r.form_data AS profile_data
    FROM pdls p
    LEFT JOIN pdl_form_records r ON r.pdl_id = p.id AND r.record_type = 'PDL_PROFILE'
    WHERE p.is_archived=0 ORDER BY p.last_name ASC`);
  return rows.map((row) => mapPdlRow(row, parseRecordData(row.profile_data)));
}

export async function createPdl(pdl: any) {
  const id = pdl.id || `pdl-${Date.now()}`;
  await pool.query(`
    INSERT INTO pdls
      (id, pdl_number, file_number, bjmp_id_number, last_name, first_name, middle_name, suffix,
       aliases, date_of_birth, age_at_admission, place_of_birth, sex, civil_status, citizenship, religion,
       tribal_affiliation, present_address, provincial_address, highest_educational_attainment, course,
       occupation, skills, gang_group_affiliation, height, weight, built, complexion, eyes, hair, blood_type,
       mannerism, dialects_spoken, bertillion_marks, emergency_contact_person, emergency_contact_relation,
       emergency_contact_address, emergency_contact_phone, date_committed, jail_facility_id, cell_dormitory,
       status, primary_offense, court_branch, presiding_judge, case_status)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON DUPLICATE KEY UPDATE
      pdl_number=VALUES(pdl_number), file_number=VALUES(file_number), bjmp_id_number=VALUES(bjmp_id_number),
      last_name=VALUES(last_name), first_name=VALUES(first_name), middle_name=VALUES(middle_name), suffix=VALUES(suffix),
      aliases=VALUES(aliases), date_of_birth=VALUES(date_of_birth),
      age_at_admission=VALUES(age_at_admission), place_of_birth=VALUES(place_of_birth), sex=VALUES(sex),
      civil_status=VALUES(civil_status), citizenship=VALUES(citizenship), religion=VALUES(religion),
      tribal_affiliation=VALUES(tribal_affiliation), present_address=VALUES(present_address), provincial_address=VALUES(provincial_address),
      highest_educational_attainment=VALUES(highest_educational_attainment), course=VALUES(course), occupation=VALUES(occupation),
      skills=VALUES(skills), gang_group_affiliation=VALUES(gang_group_affiliation), height=VALUES(height), weight=VALUES(weight),
      built=VALUES(built), complexion=VALUES(complexion), eyes=VALUES(eyes), hair=VALUES(hair), blood_type=VALUES(blood_type),
      mannerism=VALUES(mannerism), dialects_spoken=VALUES(dialects_spoken), bertillion_marks=VALUES(bertillion_marks),
      emergency_contact_person=VALUES(emergency_contact_person), emergency_contact_relation=VALUES(emergency_contact_relation),
      emergency_contact_address=VALUES(emergency_contact_address), emergency_contact_phone=VALUES(emergency_contact_phone),
      date_committed=VALUES(date_committed), jail_facility_id=VALUES(jail_facility_id), cell_dormitory=VALUES(cell_dormitory),
      status=VALUES(status), primary_offense=VALUES(primary_offense), court_branch=VALUES(court_branch),
      presiding_judge=VALUES(presiding_judge), case_status=VALUES(case_status)`,
    [
      id, pdl.pdlNumber || pdl.pdl_number,
      pdl.fileNumber || `FN-${Date.now().toString().slice(-4)}`,
      pdl.bjmpIdNumber || `BJMP-R4A-ICJ-${Math.floor(10000 + Math.random() * 90000)}`,
      pdl.lastName || pdl.last_name, pdl.firstName || pdl.first_name,
      pdl.middleName || '', pdl.suffix || '',
      pdl.aliases || 'None', pdl.dateOfBirth || null, pdl.ageAtAdmission || 30,
      pdl.placeOfBirth || 'Imus City, Cavite', pdl.sex || 'Male',
      pdl.civilStatus || 'Single', pdl.citizenship || 'Filipino',
      pdl.religion || 'Roman Catholic', pdl.tribalAffiliation || 'Tagalog',
      pdl.presentAddress || 'Imus City, Cavite', pdl.provincialAddress || '',
      pdl.highestEducationalAttainment || 'High School', pdl.course || '',
      pdl.occupation || '', pdl.skills || '', pdl.gangGroupAffiliation || 'None',
      pdl.height || '', pdl.weight || '', pdl.built || '', pdl.complexion || '',
      pdl.eyes || '', pdl.hair || '', pdl.bloodType || '',
      pdl.mannerism || 'None', pdl.dialectsSpoken || 'Tagalog',
      pdl.bertillionMarks || 'None', pdl.emergencyContactPerson || '',
      pdl.emergencyContactRelation || '', pdl.emergencyContactAddress || '',
      pdl.emergencyContactPhone || '', pdl.dateCommitted || null,
      pdl.jailFacilityId || 'imus-city-jail-male',
      pdl.cellDormitory || 'Brigada 1 - Main Dorm', pdl.status || 'In Custody',
      pdl.primaryOffense || '', pdl.courtBranch || '', pdl.presidingJudge || '',
      pdl.caseStatus || 'Under Trial',
    ]
  );
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  await pool.query(`
    INSERT INTO pdl_form_records (id, pdl_id, record_type, status, form_data, prepared_by, created_at, updated_at)
    VALUES (?, ?, 'PDL_PROFILE', 'ACTIVE', ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE form_data=VALUES(form_data), prepared_by=VALUES(prepared_by), updated_at=VALUES(updated_at)`,
    [`record-profile-${id}`, id, JSON.stringify(pdlProfileExtras(pdl)), pdl.preparedBy || null, now, now]);
  const allPdls = await getAllPdls();
  return allPdls.find((item) => item.id === id) || null;
}

export async function getPdlFormRecords(pdlId?: string) {
  const where = pdlId ? 'WHERE pdl_id=?' : '';
  const [rows] = await pool.query<mysql.RowDataPacket[]>(`SELECT * FROM pdl_form_records ${where} ORDER BY updated_at DESC`, pdlId ? [pdlId] : []);
  return rows.map((row) => ({
    id: row.id, pdlId: row.pdl_id, recordType: row.record_type, status: row.status,
    formData: parseRecordData(row.form_data), preparedBy: row.prepared_by, approvedBy: row.approved_by,
    createdAt: row.created_at, updatedAt: row.updated_at,
  }));
}

export async function savePdlFormRecord(record: any) {
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const id = record.id || `record-${record.pdlId}-${record.recordType}`;
  await pool.query(`
    INSERT INTO pdl_form_records (id, pdl_id, record_type, status, form_data, prepared_by, approved_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE status=VALUES(status), form_data=VALUES(form_data), prepared_by=VALUES(prepared_by), approved_by=VALUES(approved_by), updated_at=VALUES(updated_at)`,
    [id, record.pdlId, record.recordType, record.status || 'DRAFT', JSON.stringify(record.recordType === 'PDL_PROFILE' ? pdlProfileExtras(record.formData || {}) : record.formData || {}),
      record.preparedBy || null, record.approvedBy || null, now, now]);
  return (await getPdlFormRecords(record.pdlId)).find((item) => item.id === id) || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Appointment functions
// ─────────────────────────────────────────────────────────────────────────────
export async function getAllAppointments() {
  const [rows] = await pool.query<mysql.RowDataPacket[]>('SELECT * FROM appointments WHERE is_archived=0 ORDER BY visit_date DESC');
  return rows.map((r: any) => ({
    id: r.id,
    appointmentReference: r.appointment_reference,
    userId: r.user_id,
    visitorName: r.visitor_name,
    visitorContact: r.visitor_contact,
    pdlId: r.pdl_id,
    pdlName: r.pdl_name,
    pdlNumber: r.pdl_number,
    jailFacilityId: r.jail_facility_id,
    jailFacilityName: r.jail_facility_name,
    cellDormitory: r.cell_dormitory,
    visitType: r.visit_type,
    relationshipToPDL: r.relationship_to_pdl,
    visitDate: dateOnly(r.visit_date) || String(r.visit_date),
    timeSlot: r.time_slot,
    paabotItemsDescription: r.paabot_items_description,
    status: r.status,
    createdAt: r.created_at,
    qrToken: r.qr_token,
  }));
}

export async function createAppointment(a: any) {
  const id = a.id || `appt-${Date.now()}`;
  const ref = a.appointmentReference || `BJMP-IMUS-${Date.now()}`;
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  await pool.query(`
    INSERT INTO appointments
      (id, appointment_reference, user_id, visitor_name, visitor_contact, pdl_id, pdl_name, pdl_number,
       jail_facility_id, jail_facility_name, cell_dormitory, visit_type, relationship_to_pdl,
       visit_date, time_slot, paabot_items_description, status, created_at, qr_token)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id, ref, a.userId, a.visitorName, a.visitorContact, a.pdlId, a.pdlName, a.pdlNumber,
      a.jailFacilityId, a.jailFacilityName, a.cellDormitory, a.visitType, a.relationshipToPdl,
      a.visitDate, a.timeSlot, a.paabotItemsDescription || null,
      a.status || 'Approved', a.createdAt || now,
      a.qrToken || `BJMP-QR-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    ]
  );
  return (await getAllAppointments()).find((appointment) => appointment.id === id) || null;
}

export async function updateAppointmentStatus(id: string, status: string) {
  await pool.query('UPDATE appointments SET status=? WHERE id=? AND is_archived=0', [status, id]);
  return (await getAllAppointments()).find((appointment) => appointment.id === id) || null;
}

export async function archiveAppointment(id: string, adminId: string, reason: string) {
  await pool.query('UPDATE appointments SET is_archived=1,archived_at=NOW(),archived_by=?,archive_reason=? WHERE id=? AND is_archived=0', [adminId,reason,id]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Gate Log functions
// ─────────────────────────────────────────────────────────────────────────────
export async function logGateScan(data: {
  appointmentId?: string;
  userId: string;
  visitorName: string;
  pdlName: string;
  facilityId: string;
  guardOfficer: string;
  action: string;
  notes?: string;
}) {
  const id = `gate-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  await pool.query(`
    INSERT INTO gate_logs (id, appointment_id, user_id, visitor_name, pdl_name, facility_id, guard_officer, action, timestamp, notes)
    VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [id, data.appointmentId || null, data.userId, data.visitorName, data.pdlName,
     data.facilityId, data.guardOfficer, data.action, now, data.notes || null]
  );
  // Keep a printable PDL visitor log in sync with the gate workflow.
  if (data.appointmentId && data.action === 'ADMITTED') {
    const [rows] = await pool.query<mysql.RowDataPacket[]>(`
      SELECT a.*, u.gender, u.address_street, u.mobile_number AS contact_number
      FROM appointments a LEFT JOIN users u ON u.id = a.user_id WHERE a.id=?`, [data.appointmentId]);
    const appointment = rows[0];
    if (appointment) {
      await pool.query(`INSERT INTO visitor_log_entries
        (id, log_type, appointment_id, gate_log_id, visitor_id, pdl_id, visit_date, time_in, visitor_name, gender, address, contact_number, relationship_to_pdl, purpose_of_visit, cell_number, created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [`visitor-log-${id}`, 'PDL_VISITOR', data.appointmentId, id, data.userId, appointment.pdl_id,
          appointment.visit_date, now, data.visitorName, appointment.gender || null, appointment.address_street || null,
          appointment.contact_number || null, appointment.relationship_to_pdl, appointment.visit_type, appointment.cell_dormitory, now]);
    }
  } else if (data.appointmentId && data.action === 'EXITED') {
    await pool.query(`UPDATE visitor_log_entries SET time_out=? WHERE appointment_id=? AND time_out IS NULL`, [now, data.appointmentId]);
  }
  const [rows] = await pool.query<mysql.RowDataPacket[]>('SELECT * FROM gate_logs WHERE id=?', [id]);
  return rows[0];
}

export async function getGateLogs() {
  const [rows] = await pool.query<mysql.RowDataPacket[]>('SELECT * FROM gate_logs ORDER BY timestamp DESC LIMIT 100');
  return rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// Security Incidents
// ─────────────────────────────────────────────────────────────────────────────
export async function getIncidents() {
  const [rows] = await pool.query<mysql.RowDataPacket[]>('SELECT * FROM security_incidents WHERE is_archived=0 ORDER BY timestamp DESC');
  return rows;
}

export async function createIncident(data: any) {
  const id = `inc-${Date.now()}`;
  await pool.query(`
    INSERT INTO security_incidents (id, timestamp, visitor_name, facility, incident_type, description, action_taken, reporting_officer)
    VALUES (?,?,?,?,?,?,?,?)`,
    [id, data.timestamp || new Date().toLocaleString('en-PH'),
     data.visitorName, data.facility, data.incidentType,
     data.description, data.actionTaken, data.reportingOfficer]
  );
  const [rows] = await pool.query<mysql.RowDataPacket[]>('SELECT * FROM security_incidents WHERE id=?', [id]);
  return rows[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// Announcements
// ─────────────────────────────────────────────────────────────────────────────
export async function getAnnouncements() {
  const [rows] = await pool.query<mysql.RowDataPacket[]>('SELECT * FROM announcements WHERE is_active=1 AND is_archived=0 ORDER BY created_at DESC');
  return rows;
}

export async function createAnnouncement(data: any) {
  const id = `ann-${Date.now()}`;
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  await pool.query(`
    INSERT INTO announcements (id, title, content, level, posted_by, created_at, is_active)
    VALUES (?,?,?,?,?,?,1)`,
    [id, data.title, data.content, data.level || 'info', data.postedBy, data.createdAt || now]
  );
  const [rows] = await pool.query<mysql.RowDataPacket[]>('SELECT * FROM announcements WHERE id=?', [id]);
  return rows[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard Stats
// ─────────────────────────────────────────────────────────────────────────────
export async function getDatabaseStatus() {
  const [[users]] = await pool.query<mysql.RowDataPacket[]>('SELECT COUNT(*) AS count FROM users');
  const [[pdls]] = await pool.query<mysql.RowDataPacket[]>('SELECT COUNT(*) AS count FROM pdls');
  const [[appointments]] = await pool.query<mysql.RowDataPacket[]>('SELECT COUNT(*) AS count FROM appointments');
  const [[forms]] = await pool.query<mysql.RowDataPacket[]>('SELECT COUNT(*) AS count FROM pdl_form_records');
  return { database: process.env.DB_NAME || 'bjmp_visitation', users: users.count, pdls: pdls.count, appointments: appointments.count, pdlFormRecords: forms.count };
}

/** Explicit local reset utility; the command is never run automatically. */
export async function resetDemoData() {
  const databaseName = process.env.DB_NAME || 'bjmp_visitation';
  if (databaseName !== 'bjmp_visitation') throw new Error(`Refusing to reset ${databaseName}; only bjmp_visitation is allowed.`);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const table of ['record_archive_events','visitor_log_entries','pdl_form_records','gate_logs','appointments','security_incidents','announcements','kyc_documents','kyc_submissions','auth_otps','auth_sessions','audit_logs','pdls','users','jail_facilities']) await conn.query(`DELETE FROM ${table}`);
    await seedDatabase(conn);
    await conn.commit();
  } catch (error) { await conn.rollback(); throw error; } finally { conn.release(); }
  return getDatabaseStatus();
}

export async function getStats() {
  const today = new Date().toISOString().split('T')[0];
  const [[pdls]]      = await pool.query<mysql.RowDataPacket[]>('SELECT COUNT(*) as cnt FROM pdls WHERE is_archived=0 AND status="In Custody"') as any;
  const [[scheduled]] = await pool.query<mysql.RowDataPacket[]>('SELECT COUNT(*) as cnt FROM appointments WHERE is_archived=0 AND visit_date=? AND status="Approved"', [today]) as any;
  const [[admitted]]  = await pool.query<mysql.RowDataPacket[]>('SELECT COUNT(*) as cnt FROM gate_logs WHERE DATE(timestamp)=? AND action="ADMITTED"', [today]) as any;
  const [[pending]]   = await pool.query<mysql.RowDataPacket[]>('SELECT COUNT(*) as cnt FROM users WHERE is_archived=0 AND account_status="PENDING_BIOMETRICS"') as any;
  return {
    totalPdls:         pdls.cnt,
    scheduledToday:    scheduled.cnt,
    admittedToday:     admitted.cnt,
    pendingBiometrics: pending.cnt,
  };
}
