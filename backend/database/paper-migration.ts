import type {PoolConnection} from 'mysql2/promise';
import {randomBytes} from 'node:crypto';

export async function migratePaperRequirements(conn:PoolConnection){
  for(const [table,column,type] of [
    ['users','permanent_qr_token','CHAR(64) NULL'],
    ['users','officer_duties','TEXT NULL'],
    ['appointments','schedule_version','INT NOT NULL DEFAULT 0'],
    ['appointments','selection_mode',"VARCHAR(20) NOT NULL DEFAULT 'LEGACY'"],
  ]){
    const [columns]=await conn.query<any[]>(`SHOW COLUMNS FROM \`${table}\``);
    if(!columns.some(c=>c.Field===column))await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${type}`);
  }
  const [users]=await conn.query<any[]>("SELECT id FROM users WHERE permanent_qr_token IS NULL AND role='VISITOR'");
  for(const user of users)await conn.query('UPDATE users SET permanent_qr_token=? WHERE id=? AND permanent_qr_token IS NULL',[randomBytes(32).toString('hex'),user.id]);
  const [indexes]=await conn.query<any[]>('SHOW INDEX FROM users');
  if(!indexes.some(i=>i.Key_name==='uq_permanent_qr'))await conn.query('ALTER TABLE users ADD UNIQUE KEY uq_permanent_qr(permanent_qr_token)');
  await conn.query(`CREATE TABLE IF NOT EXISTS visitation_policy (
    id TINYINT PRIMARY KEY, visitor_limit INT NOT NULL DEFAULT 7
  ) ENGINE=InnoDB`);
  await conn.query('INSERT IGNORE INTO visitation_policy(id,visitor_limit) VALUES(1,7)');
  await conn.query(`CREATE TABLE IF NOT EXISTS pdl_visitation_schedules (
    pdl_id VARCHAR(100) PRIMARY KEY, weekday TINYINT NOT NULL, version INT NOT NULL DEFAULT 1,
    updated_by INT NOT NULL, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(pdl_id) REFERENCES pdls(id), FOREIGN KEY(updated_by) REFERENCES users(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await conn.query(`CREATE TABLE IF NOT EXISTS pdl_visitor_links (
    id BIGINT AUTO_INCREMENT PRIMARY KEY, pdl_id VARCHAR(100) NOT NULL, user_id INT NOT NULL,
    relationship VARCHAR(80) NOT NULL, is_active TINYINT NOT NULL DEFAULT 1,
    approved_by INT NOT NULL, approved_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    archived_by INT NULL, archived_at DATETIME NULL, archive_reason VARCHAR(1000) NULL,
    UNIQUE KEY uq_pdl_visitor(pdl_id,user_id), INDEX idx_link_user(user_id,is_active),
    FOREIGN KEY(pdl_id) REFERENCES pdls(id), FOREIGN KEY(user_id) REFERENCES users(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await conn.query(`CREATE TABLE IF NOT EXISTS pdl_schedule_notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY, event_key VARCHAR(100) NOT NULL, user_id INT NOT NULL,
    pdl_id VARCHAR(100) NOT NULL, channel VARCHAR(10) NOT NULL, destination VARCHAR(255) NOT NULL,
    message TEXT NOT NULL, status VARCHAR(30) NOT NULL DEFAULT 'PENDING', attempts INT NOT NULL DEFAULT 0,
    provider_id VARCHAR(255) NULL, last_error VARCHAR(255) NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_schedule_event(event_key,user_id,channel),
    FOREIGN KEY(user_id) REFERENCES users(id), FOREIGN KEY(pdl_id) REFERENCES pdls(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  const [noticeColumns] = await conn.query<any[]>('SHOW COLUMNS FROM pdl_schedule_notifications');
  if (!noticeColumns.some(column => column.Field === 'appointment_id')) {
    await conn.query('ALTER TABLE pdl_schedule_notifications ADD COLUMN appointment_id VARCHAR(100) NULL, ADD INDEX idx_schedule_notice_appointment(appointment_id,status)');
  }
  await conn.query("UPDATE appointment_notifications SET status='CANCELLED',updated_at=NOW() WHERE status IN ('PENDING','NOT_CONFIGURED')");
  await conn.query("INSERT IGNORE INTO feature_migrations(version) VALUES('20261027_paper_approved_lists_and_days')");
}
