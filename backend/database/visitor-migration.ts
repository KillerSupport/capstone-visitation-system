import type { PoolConnection } from 'mysql2/promise';

/** Additive visitor-record schema. Legacy account rows are retained as disabled
 * references so older audit and visitation records keep their original links. */
export async function migrateVisitorRecords(conn: PoolConnection) {
  await conn.query(`CREATE TABLE IF NOT EXISTS visitor_records (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    visitor_code VARCHAR(40) NOT NULL UNIQUE,
    legacy_user_id INT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    gender VARCHAR(30) NULL,
    address TEXT NULL,
    address_data LONGTEXT NULL,
    age SMALLINT UNSIGNED NULL,
    contact_number VARCHAR(50) NULL,
    contact_email VARCHAR(255) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    is_archived TINYINT(1) NOT NULL DEFAULT 0,
    archived_at DATETIME NULL,
    archived_by INT NULL,
    archive_reason TEXT NULL,
    created_by INT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_visitor_name(full_name), INDEX idx_visitor_status(status,is_archived),
    FOREIGN KEY (legacy_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (archived_by) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  const [visitorColumns] = await conn.query<any[]>('SHOW COLUMNS FROM visitor_records');
  if (!visitorColumns.some((column: any) => column.Field === 'address_data')) {
    await conn.query('ALTER TABLE visitor_records ADD COLUMN address_data LONGTEXT NULL AFTER address');
  }

  await conn.query(`CREATE TABLE IF NOT EXISTS visitor_qr_identities (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    visitor_record_id BIGINT NOT NULL UNIQUE,
    qr_token CHAR(64) NOT NULL UNIQUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (visitor_record_id) REFERENCES visitor_records(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await conn.query(`CREATE TABLE IF NOT EXISTS pdl_visitor_assignments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    visitor_record_id BIGINT NOT NULL,
    pdl_id VARCHAR(100) NOT NULL,
    relationship VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'APPROVED',
    approved_by INT NOT NULL,
    approved_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_by INT NULL,
    revoked_at DATETIME NULL,
    revocation_reason TEXT NULL,
    source_link_id BIGINT NULL UNIQUE,
    INDEX idx_assignment_visitor(visitor_record_id,status),
    INDEX idx_assignment_pdl(pdl_id,status),
    UNIQUE KEY uq_visitor_pdl_assignment(visitor_record_id,pdl_id),
    FOREIGN KEY (visitor_record_id) REFERENCES visitor_records(id),
    FOREIGN KEY (pdl_id) REFERENCES pdls(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    FOREIGN KEY (revoked_by) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await conn.query(`CREATE TABLE IF NOT EXISTS pdl_visitor_assignment_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    assignment_id BIGINT NOT NULL,
    action VARCHAR(20) NOT NULL,
    relationship VARCHAR(100) NULL,
    reason TEXT NULL,
    actor_user_id INT NULL,
    occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_assignment_event(assignment_id,occurred_at),
    FOREIGN KEY (assignment_id) REFERENCES pdl_visitor_assignments(id),
    FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await conn.query(`CREATE TABLE IF NOT EXISTS visitor_restrictions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    visitor_record_id BIGINT NOT NULL,
    scope VARCHAR(20) NOT NULL,
    pdl_id VARCHAR(100) NULL,
    reason VARCHAR(120) NOT NULL,
    requested_by VARCHAR(255) NULL,
    request_details TEXT NULL,
    effective_at DATETIME NOT NULL,
    expires_at DATETIME NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    processed_by INT NOT NULL,
    removed_by INT NULL,
    removed_at DATETIME NULL,
    removal_reason TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_restriction_scope(visitor_record_id,scope,pdl_id,status,effective_at,expires_at),
    INDEX idx_restriction_expiry(status,expires_at),
    FOREIGN KEY (visitor_record_id) REFERENCES visitor_records(id),
    FOREIGN KEY (pdl_id) REFERENCES pdls(id),
    FOREIGN KEY (processed_by) REFERENCES users(id),
    FOREIGN KEY (removed_by) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await conn.query(`CREATE TABLE IF NOT EXISTS visitor_pdl_schedule_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    pdl_id VARCHAR(100) NOT NULL,
    previous_weekday TINYINT NULL,
    new_weekday TINYINT NOT NULL,
    reason TEXT NOT NULL,
    changed_by INT NOT NULL,
    changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_pdl_schedule_event(pdl_id,changed_at),
    FOREIGN KEY (pdl_id) REFERENCES pdls(id),
    FOREIGN KEY (changed_by) REFERENCES users(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  const visitColumns = `
    id VARCHAR(40) PRIMARY KEY,
    visitor_record_id BIGINT NOT NULL,
    visit_date DATE NOT NULL,
    time_in DATETIME NOT NULL,
    time_out DATETIME NULL,
    visitor_name VARCHAR(255) NOT NULL,
    gender VARCHAR(30) NULL,
    address TEXT NULL,
    age SMALLINT UNSIGNED NULL,
    contact_number VARCHAR(50) NULL,
    signature_data LONGTEXT NULL,
    checked_in_by INT NOT NULL,
    checked_out_by INT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_visit_date(visit_date,time_in),
    INDEX idx_visit_active(visitor_record_id,time_out),
    FOREIGN KEY (visitor_record_id) REFERENCES visitor_records(id),
    FOREIGN KEY (checked_in_by) REFERENCES users(id),
    FOREIGN KEY (checked_out_by) REFERENCES users(id) ON DELETE SET NULL`;
  await conn.query(`CREATE TABLE IF NOT EXISTS pdl_visitation_logs (
    ${visitColumns},
    pdl_id VARCHAR(100) NOT NULL,
    pdl_name VARCHAR(255) NOT NULL,
    cell_number VARCHAR(100) NULL,
    relationship_to_pdl VARCHAR(100) NOT NULL,
    INDEX idx_pdl_visit(pdl_id,visit_date),
    FOREIGN KEY (pdl_id) REFERENCES pdls(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await conn.query(`CREATE TABLE IF NOT EXISTS guest_visitation_logs (
    ${visitColumns},
    purpose_of_visit VARCHAR(255) NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await conn.beginTransaction();
  try {
    const [applied] = await conn.query<any[]>("SELECT version FROM feature_migrations WHERE version='20261105_record_visitors_and_restrictions' FOR UPDATE");
    if (applied.length) {
      await conn.commit();
      return;
    }

    const [overLimit] = await conn.query<any[]>(`SELECT pdl_id,COUNT(*) AS total FROM pdl_visitor_links
      WHERE is_active=1 GROUP BY pdl_id HAVING COUNT(*)>7`);
    if (overLimit.length) throw new Error('A legacy PDL visitor list exceeds seven active links. Reconcile the list before migrating visitor approvals.');

    const [legacyVisitors] = await conn.query<any[]>(`SELECT id,first_name,middle_name,last_name,suffix,date_of_birth,gender,
      address_data,address_street,address_municipality,zip_code,mobile_number,email,permanent_qr_token,registered_at
      FROM users WHERE role='VISITOR' ORDER BY id FOR UPDATE`);
    for (const user of legacyVisitors) {
      const fullName = [user.first_name,user.middle_name,user.last_name,user.suffix].filter(Boolean).join(' ').trim();
      let address = user.address_street || '';
      try {
        const data = user.address_data ? JSON.parse(user.address_data) : null;
        address = data?.completeAddress || [data?.houseUnitStreet,data?.barangay,data?.municipality,data?.province,data?.region,data?.zipCode].filter(Boolean).join(', ') || address;
      } catch { /* Retain the legacy address value. */ }
      const [insert] = await conn.query<any[]>(`INSERT IGNORE INTO visitor_records
        (visitor_code,legacy_user_id,full_name,gender,address,address_data,age,contact_number,contact_email,status,is_archived,created_at)
        VALUES(?,?,?,?,?,?,IF(? IS NULL,NULL,TIMESTAMPDIFF(YEAR,?,CURDATE())),?,?, 'ACTIVE',0,COALESCE(?,NOW()))`, [
          `VIS-BAC-${String(user.id).padStart(6,'0')}`, user.id, fullName || `Legacy visitor ${user.id}`, user.gender || null,
          address || null, user.address_data || null, user.date_of_birth, user.date_of_birth, user.mobile_number || null, user.email || null, user.registered_at || null,
        ]);
      const [[record]] = await conn.query<any[]>(`SELECT id FROM visitor_records WHERE legacy_user_id=?`,[user.id]);
      const [links] = await conn.query<any[]>(`SELECT id,pdl_id,relationship,is_active,approved_by,approved_at,archived_by,archived_at,archive_reason
        FROM pdl_visitor_links WHERE user_id=? ORDER BY id`,[user.id]);
      for (const link of links) {
        const [assignmentInsert] = await conn.query<any>(`INSERT IGNORE INTO pdl_visitor_assignments
          (visitor_record_id,pdl_id,relationship,status,approved_by,approved_at,revoked_by,revoked_at,revocation_reason,source_link_id)
          VALUES(?,?,?,?,?,?,?,?,?,?)`,[record.id,link.pdl_id,link.relationship,link.is_active?'APPROVED':'REVOKED',link.approved_by,
          link.approved_at,link.is_active?null:link.archived_by,link.is_active?null:link.archived_at,link.is_active?null:link.archive_reason,link.id]);
        const [[assignment]] = await conn.query<any[]>(`SELECT id FROM pdl_visitor_assignments WHERE visitor_record_id=? AND pdl_id=?`,[record.id,link.pdl_id]);
        if (assignmentInsert.affectedRows) await conn.query(`INSERT INTO pdl_visitor_assignment_events(assignment_id,action,relationship,reason,actor_user_id,occurred_at)
          VALUES(?,?,?,?,?,?)`,[assignment.id,link.is_active?'APPROVED':'REVOKED',link.relationship,link.archive_reason||null,link.approved_by,link.approved_at]);
        if (link.is_active && user.permanent_qr_token) await conn.query(`INSERT IGNORE INTO visitor_qr_identities(visitor_record_id,qr_token) VALUES(?,?)`,[record.id,user.permanent_qr_token]);
      }
      // Keep the legacy account row and its credentials/contact data intact for
      // historical references. Visitor authentication is disabled in the API.
    }
    await conn.query("UPDATE visitor_restrictions SET status='EXPIRED' WHERE status='ACTIVE' AND expires_at IS NOT NULL AND expires_at<=NOW()");
    await conn.query("INSERT INTO feature_migrations(version) VALUES('20261105_record_visitors_and_restrictions')");
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  }
}
