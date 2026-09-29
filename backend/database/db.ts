import mysql from 'mysql2/promise';
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
        email                       VARCHAR(255) UNIQUE NOT NULL,
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
        contact_number              VARCHAR(50),
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
        full_name                       VARCHAR(255) NOT NULL,
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

    // Seed default data only if the users table is empty
    const [rows] = await conn.query<mysql.RowDataPacket[]>('SELECT COUNT(*) as cnt FROM users');
    if (rows[0].cnt === 0) {
      console.log('🌱 Seeding BJMP database with initial records...');
      await seedDatabase(conn);
      console.log('✅ Database seeded successfully.');
    }
  } finally {
    conn.release();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Seed default BJMP data
// ─────────────────────────────────────────────────────────────────────────────
async function seedDatabase(conn: mysql.PoolConnection) {
  // Minimal fresh-install records. The legacy detailed seed below is retained
  // only as historical reference and is intentionally not executed.
  await conn.query(`INSERT INTO jail_facilities VALUES
    ('imus-city-jail-male','BJMP Imus City Jail - Male Dormitory','Region IV-A','Imus City, Cavite','Cavite Civic Center, Imus City, Cavite','(046) 472-3671','Tuesday to Sunday','8:00 AM - 4:00 PM','Monday to Friday: 8:00 AM - 4:00 PM',40)`);
  await conn.query(`INSERT INTO users
    (email,password,role,admin_title,badge_number,first_name,middle_name,last_name,registered_at)
    VALUES
    ('tongtongornamental@gmail.com','AdminAcc@123','ADMIN','System Administrator','BJMP-ADM-001','Maria','S.','Reyes',NOW()),
    ('mharijie@gmail.com','WorkerAcc@123','WORKER','PDL Records Worker','BJMP-WRK-001','Jose','D.','Santos',NOW()),
    ('harijiem@gmail.com','VisitorTest@123','VISITOR',NULL,NULL,'Ana','M.','Cruz',NOW())`);
  return;
  // Facilities
  await conn.query(`
    INSERT IGNORE INTO jail_facilities VALUES
    ('imus-city-jail-male',
     'BJMP Imus City Jail - Male Dormitory',
     'Region IV-A (CALABARZON)', 'Imus City, Cavite',
     'Brgy. Malagasang 1-G, Imus City, Cavite 4103 (Near City Government Center)',
     '(046) 471-2854 / +63 917 839 2044',
     'Tuesday to Sunday (Closed Mondays for Maintenance & Sanitation)',
     'Morning: 8:00 AM - 11:30 AM | Afternoon: 1:00 PM - 4:00 PM',
     'Monday to Friday: 8:00 AM - 4:00 PM (Admin & Records Section, Gate 1)', 40),
    ('imus-city-jail-female',
     'BJMP Imus City Jail - Female Dormitory',
     'Region IV-A (CALABARZON)', 'Imus City, Cavite',
     'Brgy. Malagasang 1-G, Imus City, Cavite 4103',
     '(046) 471-2855 / +63 917 839 2045',
     'Wednesday, Friday, Saturday, Sunday',
     'Morning: 8:30 AM - 11:30 AM | Afternoon: 1:00 PM - 3:30 PM',
     'Monday to Friday: 8:00 AM - 4:00 PM (Female Dorm Records Unit)', 30)
  `);

  // Users
  await conn.query(`
    INSERT IGNORE INTO users
      (id, email, password, role, admin_title, badge_number, first_name, middle_name, last_name,
       suffix, date_of_birth, gender, contact_number, address_street, address_municipality,
       marital_status, zip_code, valid_id_type, valid_id_photo_url, face_photo_url,
       account_status, biometric_reference_number, preferred_jail_facility_id,
       email_verified_at, biometric_scanned_at, biometrics_officer_name, registered_at)
    VALUES
    ('user-admin-01','admin@bjmp.gov.ph','password123','ADMIN',
     'Jail Warden & Command Administrator','BJMP-OFF-40192',
     'JCInsp. Renato','Villanueva','Bautista','','1978-08-14','Male',
     '(046) 471-2854','BJMP Imus Executive Command, Brgy. Malagasang 1-G','Imus City, Cavite',
     'Married','4103','Philippine National ID (PhilSys)',
     'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
     'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
     'ACTIVATED','BJMP-EXEC-0001','imus-city-jail-male',
     '2026-01-01 08:00:00','2026-01-01 08:00:00','BJMP National Headquarters Command','2026-01-01 08:00:00'),

    ('user-admin-02','ramburat077@gmail.com','Password123','ADMIN',
     'BJMP Executive Officer & System Administrator','BJMP-SYS-077',
     'Admin Executive','M.','Ramburat','','1985-06-25','Male',
     '+63 917 839 2044','Executive Quarters, Brgy. Malagasang 1-G','Imus City, Cavite',
     'Married','4103','Philippine Passport (DFA)',
     'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
     'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80',
     'ACTIVATED','BJMP-EXEC-0077','imus-city-jail-male',
     '2026-01-01 08:00:00','2026-01-01 08:00:00','BJMP National Headquarters Command','2026-01-01 08:00:00'),

    ('user-guard-01','guard.santos@bjmp.gov.ph','password123','GUARD',
     'Gate 1 Sentinel Officer','BJMP-GRD-0192',
     'JO2 Ramon','Cruz','Santos','','1990-03-15','Male',
     '+63 917 888 1234','Gate 1 Officers Station, Brgy. Malagasang 1-G','Imus City, Cavite',
     'Married','4103','Philippine National ID (PhilSys)',
     'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
     'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
     'ACTIVATED','BJMP-EXEC-0192','imus-city-jail-male',
     '2026-01-01 08:00:00','2026-01-01 08:00:00','BJMP National Headquarters Command','2026-01-01 08:00:00'),

    ('user-activated-01','maria.santos@gmail.com','password123','VISITOR',
     NULL,NULL,'Maria Corazon','Alvarez','Santos','','1989-05-14','Female',
     '+63 917 555 4321','#42 Aguinaldo Highway, Brgy. Malagasang 1-G','Imus City, Cavite',
     'Married','4103','Philippine National ID (PhilSys)',
     'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80',
     'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
     'ACTIVATED','BJMP-BIO-IMUS-9921','imus-city-jail-male',
     '2026-09-02 10:14:00','2026-09-03 14:22:15','JO2 R. BAUTISTA (BJMP Imus Records Desk)','2026-09-02 09:40:00'),

    ('user-biometrics-pending-02','roberto.reyes@yahoo.com','password123','VISITOR',
     NULL,NULL,'Roberto','Gomez','Reyes','Jr.','1995-11-20','Male',
     '+63 920 889 1234','Block 5 Lot 18, Bucandala Subd., Brgy. Bucandala III','Imus City, Cavite',
     'Single','4103','Driver''s License (LTO)',
     'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80',
     'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
     'PENDING_BIOMETRICS','BJMP-BIO-IMUS-7841','imus-city-jail-male',
     '2026-09-07 16:30:00',NULL,NULL,'2026-09-07 16:15:00'),

    ('user-email-pending-03','elena.mercado@outlook.com','password123','VISITOR',
     NULL,NULL,'Elena','Soriano','Mercado','','1992-03-08','Female',
     '+63 918 334 9901','Unit 304, Anabu Green Estates, Brgy. Anabu II-D','Imus City, Cavite',
     'Single','4103','UMID (Unified Multi-Purpose ID)',
     'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80',
     'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
     'PENDING_EMAIL','BJMP-BIO-IMUS-4432','imus-city-jail-female',
     NULL,NULL,NULL,'2026-09-12 11:20:00')
  `);

  // PDLs
  await conn.query(`
    INSERT IGNORE INTO pdls
      (id, pdl_number, file_number, bjmp_id_number, last_name, first_name, middle_name,
       suffix, full_name, aliases, date_of_birth, age_at_admission, place_of_birth,
       sex, civil_status, citizenship, religion, tribal_affiliation, present_address,
       provincial_address, highest_educational_attainment, course, occupation, skills,
       gang_group_affiliation, height, weight, built, complexion, eyes, hair, blood_type,
       mannerism, dialects_spoken, bertillion_marks, emergency_contact_person,
       emergency_contact_relation, emergency_contact_address, emergency_contact_phone,
       date_committed, jail_facility_id, cell_dormitory, status,
       primary_offense, court_branch, presiding_judge, case_status)
    VALUES
    ('pdl-001','PDL-2024-00192','FN-2024-0192','BJMP-R4A-ICJ-00192',
     'Dela Cruz','Juan','Santos','Jr.','Juan Santos Dela Cruz Jr.','Johnny / "Totoy Bato"',
     '1992-04-15',32,'Imus City, Cavite','Male','Married','Filipino','Roman Catholic','Tagalog',
     'Blk 12 Lot 4, Villa Celina, Brgy. Malagasang 1-G, Imus City, Cavite',
     'Brgy. San Miguel, Hagonoy, Bulacan','High School Graduate','General Academic',
     'Tricycle Driver / Welder','Metal Arc Welding, Driving, Carpentry','None (Non-Affiliated)',
     '5''6" (167 cm)','64 kg (141 lbs)','Medium / Muscular','Brown (Kayumanggi)','Brown','Wavy Black',
     'O+','Blinks rapidly when nervous','Tagalog, Basic English',
     'Dragon tattoo on left shoulder; 3cm surgical scar on right appendectomy site',
     'Maria Corazon Santos Dela Cruz','Spouse','Malagasang 1-G, Imus City, Cavite','+63 917 555 4321',
     '2024-02-14','imus-city-jail-male','Brigada Malagasang - Selda 4','In Custody',
     'Violation of Sec. 11, Art. II, Republic Act 9165 (Comprehensive Dangerous Drugs Act of 2002)',
     'RTC Branch 20, Imus City, Cavite','Hon. Amy Ana L. De Villa-Rosales','Under Trial'),

    ('pdl-002','PDL-2023-01844','FN-2023-0184','BJMP-R4A-ICJ-01844',
     'Reyes','Danilo','Mendoza','','Danilo Mendoza Reyes','Danny / "Commander"',
     '1987-09-22',36,'Dasmariñas City, Cavite','Male','Married','Filipino','Iglesia Ni Cristo','Tagalog',
     'Phase 3, Golden City, Brgy. Anabu II-F, Imus City, Cavite',
     'Brgy. San Jose, Antipolo, Rizal','College Graduate','BS Criminology',
     'Former Security Guard Supervisor','Security protocols, CCTV monitoring, First Aid',
     'None (Non-Affiliated)','5''9" (175 cm)','78 kg (172 lbs)','Heavy / Stocky','Fair','Black',
     'Short Military Cut','A+','Stands strictly in attention posture','Tagalog, English, Ilocano',
     'Cross tattoo on chest; Mole under right eyelid','Lorna Santos Reyes','Spouse',
     'Anabu II-F, Imus City, Cavite','+63 918 200 4110',
     '2023-11-08','imus-city-jail-male','Brigada 1 - Main Dorm','In Custody',
     'Homicide under Article 249 of the Revised Penal Code',
     'RTC Branch 21, Imus City, Cavite','Hon. Francisco P. Sibal','Under Trial'),

    ('pdl-006','PDL-2024-05521','FN-2024-0552','BJMP-R4A-ICJ-05521',
     'Castillo','Jennifer','Alcantara','','Jennifer Alcantara Castillo','Jenny / "Jen"',
     '1993-03-27',31,'Kawit, Cavite','Female','Single','Filipino','Roman Catholic','Tagalog',
     'Brgy. Toclong 1-C, Imus City, Cavite','Brgy. Binakayan, Kawit, Cavite',
     'High School Graduate','Secondary Education','Market Stall Assistant',
     'Cooking, Sales, Handicrafts','None (Non-Affiliated)','5''3" (160 cm)','52 kg (114 lbs)',
     'Medium','Fair','Dark Brown','Shoulder-length Black','O+','None','Tagalog, English',
     'Rose flower tattoo on right ankle; Linear scar on left index finger',
     'Rosalina Alcantara Castillo','Mother','Toclong 1-C, Imus City, Cavite','+63 922 411 9081',
     '2024-08-05','imus-city-jail-female','Female Brigada 2 - Dorm B','In Custody',
     'Qualified Theft under Art. 310 in rel. to Art. 308 of Revised Penal Code',
     'MTCC Branch 1, Imus City, Cavite','Hon. Roberto C. Ramos','Under Trial')
  `);

  // Appointment (today's date)
  const today = new Date().toISOString().split('T')[0];
  await conn.query(`
    INSERT IGNORE INTO appointments VALUES
    ('appt-001','BJMP-IMUS-2026-88190','user-activated-01',
     'Maria Corazon Santos Dela Cruz','+63 917 555 4321',
     'pdl-001','Juan Santos Dela Cruz Jr.','PDL-2024-00192',
     'imus-city-jail-male','BJMP Imus City Jail - Male Dormitory',
     'Brigada Malagasang - Selda 4','Contact Visit','Spouse',
     ?, 'Morning Batch (09:00 AM - 11:30 AM)',
     '2 transparent plastic containers: Chicken adobo with boiled eggs and steamed white rice.',
     'Approved','2026-09-18 00:00:00','BJMP-IMUS-PASS-001-QR-SECURE')
  `, [today]);

  // Security Incidents
  await conn.query(`
    INSERT IGNORE INTO security_incidents VALUES
    ('inc-01','2026-09-17 09:15 AM','Rodrigo B. Perez','BJMP Imus Male Dormitory',
     'Contraband Interception',
     'Attempted to bring 2 canned sardines with sharp metal pull-tabs inside paabot bag.',
     'Item confiscated; visitor warned and admitted with clear containers only.',
     'JO1 G. Santos (Gate 1 Inspection)'),
    ('inc-02','2026-09-16 01:45 PM','Carmen V. Ramos','BJMP Imus Male Dormitory',
     'Dress Code Non-Compliance',
     'Visitor arrived wearing a bright yellow t-shirt (violates BJMP anti-inmate uniform confusion rule).',
     'Advised to rent a plain white visitor t-shirt from DILG-BJMP cooperative booth.',
     'JO2 R. Bautista (Gate 1 Sentinel)')
  `);

  // Announcements
  await conn.query(`
    INSERT IGNORE INTO announcements VALUES
    ('ann-01',
     'Gate 1 Biometric Verification Policy in Effect',
     'All first-time visitors must present their original valid government ID and undergo digital fingerprint scanning at the Gate 1 Records Section before gate admittance.',
     'info','JCInsp. Renato Bautista (Jail Warden)','2026-09-01 08:00:00',1),
    ('ann-02',
     'Strict Paabot Food Container Protocol',
     'Food items must be placed strictly in clear, transparent reusable plastic containers. Canned goods with pull-tabs and glass containers are strictly prohibited.',
     'warning','JO2 R. Bautista (Security Sentinel)','2026-09-10 09:00:00',1)
  `);
}

// ─────────────────────────────────────────────────────────────────────────────
// Row mapper helpers
// ─────────────────────────────────────────────────────────────────────────────
function mapUserRow(r: any) {
  return {
    id: String(r.id),
    email: r.email,

    role: r.role,
    adminTitle: r.admin_title,
    badgeNumber: r.badge_number,
    firstName: r.first_name,
    middleName: r.middle_name,
    lastName: r.last_name,
    suffix: r.suffix,
    dateOfBirth: r.date_of_birth,
    gender: r.gender,
    contactNumber: r.contact_number,
    address: {
      houseUnitStreet: r.address_street,
      municipality: r.address_municipality,
      maritalStatus: r.marital_status,
      zipCode: r.zip_code,
    },
    maritalStatus: r.marital_status,
    validIdType: r.valid_id_type,
    validIdPhotoUrl: r.valid_id_photo_url,
    facePhotoUrl: r.face_photo_url,
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
  const [rows] = await pool.query<mysql.RowDataPacket[]>('SELECT * FROM users ORDER BY registered_at DESC');
  return rows.map(mapUserRow);
}

export async function getUserById(id: string) {
  const [rows] = await pool.query<mysql.RowDataPacket[]>('SELECT * FROM users WHERE id = ?', [id]);
  return rows[0] ? mapUserRow(rows[0]) : null;
}

export async function getUserByEmail(email: string) {
  const [rows] = await pool.query<mysql.RowDataPacket[]>('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [email]);
  if (!rows[0]) return null;
  return { ...mapUserRow(rows[0]), passwordHash: rows[0].password };
}

export async function createUser(u: any) {
  if (!/^[^\s@]+@gmail\.com$/i.test(String(u.email || '').trim())) {
    throw new Error('Registration requires a valid @gmail.com email address.');
  }
  if (!u.passwordHash || !String(u.passwordHash).startsWith('scrypt:')) {
    throw new Error('A server-generated password hash is required.');
  }
  if (!u.passwordHash || !String(u.passwordHash).startsWith('scrypt:')) {
    throw new Error('A server-generated password hash is required.');
  }
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const [result] = await pool.query<mysql.ResultSetHeader>(`
    INSERT INTO users
      (email, password, role, admin_title, badge_number, first_name, middle_name, last_name, suffix,
       date_of_birth, gender, contact_number, address_street, address_municipality, marital_status, zip_code,
       valid_id_type, valid_id_photo_url, face_photo_url, account_status, biometric_reference_number,
       preferred_jail_facility_id, email_verified_at, biometric_scanned_at, biometrics_officer_name, registered_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      String(u.email).trim().toLowerCase(), u.passwordHash,
      u.role || 'VISITOR', u.adminTitle || null, u.badgeNumber || null,
      u.firstName, u.middleName || null, u.lastName, u.suffix || null,
      u.dateOfBirth || null, u.gender || null, u.contactNumber || null,
      u.address?.houseUnitStreet || null, u.address?.municipality || null,
      u.address?.maritalStatus || null, u.address?.zipCode || '4103',
      u.validIdType || null, u.validIdPhotoUrl || null, u.facePhotoUrl || null,
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
    fullName: row.full_name,
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
    ORDER BY p.last_name ASC`);
  return rows.map((row) => mapPdlRow(row, parseRecordData(row.profile_data)));
}

export async function createPdl(pdl: any) {
  const id = pdl.id || `pdl-${Date.now()}`;
  await pool.query(`
    INSERT INTO pdls
      (id, pdl_number, file_number, bjmp_id_number, last_name, first_name, middle_name, suffix, full_name,
       aliases, date_of_birth, age_at_admission, place_of_birth, sex, civil_status, citizenship, religion,
       tribal_affiliation, present_address, provincial_address, highest_educational_attainment, course,
       occupation, skills, gang_group_affiliation, height, weight, built, complexion, eyes, hair, blood_type,
       mannerism, dialects_spoken, bertillion_marks, emergency_contact_person, emergency_contact_relation,
       emergency_contact_address, emergency_contact_phone, date_committed, jail_facility_id, cell_dormitory,
       status, primary_offense, court_branch, presiding_judge, case_status)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON DUPLICATE KEY UPDATE
      pdl_number=VALUES(pdl_number), file_number=VALUES(file_number), bjmp_id_number=VALUES(bjmp_id_number),
      last_name=VALUES(last_name), first_name=VALUES(first_name), middle_name=VALUES(middle_name), suffix=VALUES(suffix),
      full_name=VALUES(full_name), aliases=VALUES(aliases), date_of_birth=VALUES(date_of_birth),
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
      pdl.fullName || `${pdl.firstName} ${pdl.lastName}`,
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
    [`record-profile-${id}`, id, JSON.stringify(pdl), pdl.preparedBy || null, now, now]);
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
    [id, record.pdlId, record.recordType, record.status || 'DRAFT', JSON.stringify(record.formData || {}),
      record.preparedBy || null, record.approvedBy || null, now, now]);
  return (await getPdlFormRecords(record.pdlId)).find((item) => item.id === id) || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Appointment functions
// ─────────────────────────────────────────────────────────────────────────────
export async function getAllAppointments() {
  const [rows] = await pool.query<mysql.RowDataPacket[]>('SELECT * FROM appointments ORDER BY visit_date DESC');
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
    relationshipToPdl: r.relationship_to_pdl,
    visitDate: r.visit_date,
    timeSlot: r.time_slot,
    paaботItemsDescription: r.paabot_items_description,
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
      a.visitDate, a.timeSlot, a.paaботItemsDescription || null,
      a.status || 'Approved', a.createdAt || now,
      a.qrToken || `BJMP-QR-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    ]
  );
  const [rows] = await pool.query<mysql.RowDataPacket[]>('SELECT * FROM appointments WHERE id=?', [id]);
  return rows[0];
}

export async function updateAppointmentStatus(id: string, status: string) {
  await pool.query('UPDATE appointments SET status=? WHERE id=?', [status, id]);
  const [rows] = await pool.query<mysql.RowDataPacket[]>('SELECT * FROM appointments WHERE id=?', [id]);
  return rows[0] || null;
}

export async function deleteAppointment(id: string) {
  await pool.query('DELETE FROM appointments WHERE id=?', [id]);
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
      SELECT a.*, u.gender, u.address_street, u.contact_number
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
  const [rows] = await pool.query<mysql.RowDataPacket[]>('SELECT * FROM security_incidents ORDER BY timestamp DESC');
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
  const [rows] = await pool.query<mysql.RowDataPacket[]>('SELECT * FROM announcements WHERE is_active=1 ORDER BY created_at DESC');
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

/** Deletes only the named local demo database content, then creates three test accounts. */
export async function resetDemoData() {
  const databaseName = process.env.DB_NAME || 'bjmp_visitation';
  if (databaseName !== 'bjmp_visitation') throw new Error(`Refusing to reset ${databaseName}; only bjmp_visitation is allowed.`);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const table of ['visitor_log_entries', 'pdl_form_records', 'gate_logs', 'appointments', 'security_incidents', 'announcements', 'pdls', 'users', 'jail_facilities']) await conn.query(`DELETE FROM ${table}`);
    await conn.query('ALTER TABLE users MODIFY id INT NOT NULL AUTO_INCREMENT');
    await conn.query('ALTER TABLE users AUTO_INCREMENT = 1');
    await conn.query("INSERT INTO jail_facilities VALUES ('imus-city-jail-male','BJMP Imus City Jail - Male Dormitory','Region IV-A','Imus City, Cavite','Cavite Civic Center, Imus City, Cavite','(046) 472-3671','Tuesday to Sunday','8:00 AM - 4:00 PM','Monday to Friday: 8:00 AM - 4:00 PM',40)");
    await conn.query("INSERT INTO users (email,password,role,admin_title,badge_number,first_name,middle_name,last_name,suffix,date_of_birth,gender,contact_number,address_street,address_municipality,marital_status,zip_code,valid_id_type,account_status,biometric_reference_number,preferred_jail_facility_id,email_verified_at,biometric_scanned_at,biometrics_officer_name,registered_at) VALUES ('tongtongornamental@gmail.com','AdminAcc@123','ADMIN','System Administrator','BJMP-ADM-001','Maria','S.','Reyes','','1985-01-15','Female','09170000001','BJMP Imus Records Office','Imus City, Cavite','Married','4103','Philippine National ID','ACTIVATED','BJMP-ADMIN-001','imus-city-jail-male',NOW(),NOW(),'System setup',NOW()),('mharijie@gmail.com','WorkerAcc@123','WORKER','PDL Records Worker','BJMP-WRK-001','Jose','D.','Santos','','1991-06-20','Male','09170000002','BJMP Imus Records Office','Imus City, Cavite','Single','4103','Philippine National ID','ACTIVATED','BJMP-WORKER-001','imus-city-jail-male',NOW(),NOW(),'System setup',NOW()),('harijiem@gmail.com','VisitorTest@123','VISITOR',NULL,NULL,'Ana','M.','Cruz','','1995-04-10','Female','09170000003','Imus City, Cavite','Imus City, Cavite','Single','4103','Philippine National ID','ACTIVATED','BJMP-VISITOR-001','imus-city-jail-male',NOW(),NOW(),'System setup',NOW())");
    await conn.commit();
  } catch (error) { await conn.rollback(); throw error; } finally { conn.release(); }
  const samplePdl = await createPdl({ id: 'sample-pdl-001', pdlNumber: 'PDL-DEMO-001', fileNumber: 'FN-DEMO-001', bjmpIdNumber: 'BJMP-R4A-DEMO-001', firstName: 'Juan', middleName: 'Dela', lastName: 'Cruz', fullName: 'Juan Dela Cruz', aliases: 'Juan', dateOfBirth: '1994-02-12', ageAtAdmission: 31, placeOfBirth: 'Imus City, Cavite', sex: 'Male', civilStatus: 'Single', citizenship: 'Filipino', religion: 'Roman Catholic', tribalAffiliation: 'Tagalog', presentAddress: 'Imus City, Cavite', provincialAddress: 'Imus City, Cavite', highestEducationalAttainment: 'High School', occupation: 'Laborer', height: '170 cm', weight: '65 kg', built: 'Medium', complexion: 'Brown', eyes: 'Brown', hair: 'Black', bloodType: 'O+', dialectsSpoken: 'Tagalog', bertillionMarks: 'None recorded', dateCommitted: '2026-09-01', jailFacilityId: 'imus-city-jail-male', cellDormitory: 'Brigada 1 - Main Dorm', status: 'In Custody', primaryOffense: 'Demo record - replace before use', courtBranch: 'RTC Imus', presidingJudge: 'For assignment', caseStatus: 'Under Trial', allowedVisitorRelationship: ['Spouse', 'Parent', 'Child', 'Sibling', 'Legal Counsel'], bodyMarks: [], preparedBy: '2' });
  for (const recordType of ['JAIL_BOOKING_REPORT', 'PALM_FINGERPRINT_RECORD', 'PDL_RECORD', 'PDL_PROPERTY_RECEIPT', 'MANIFESTO_NG_DETENIDO', 'CERTIFICATE_OF_DETENTION', 'CERTIFICATE_OF_DISCHARGE', 'COMMITMENT_REGISTER', 'RELEASE_REGISTER']) await savePdlFormRecord({ pdlId: samplePdl!.id, recordType, status: 'DRAFT', preparedBy: '2', formData: { pdlId: samplePdl!.id, createdFor: recordType } });
  await pool.query("INSERT INTO appointments (id,appointment_reference,user_id,visitor_name,visitor_contact,pdl_id,pdl_name,pdl_number,jail_facility_id,jail_facility_name,cell_dormitory,visit_type,relationship_to_pdl,visit_date,time_slot,paabot_items_description,status,created_at,qr_token) VALUES ('sample-appointment-001','BJMP-DEMO-001','3','Ana M. Cruz','09170000003','sample-pdl-001','Juan Dela Cruz','PDL-DEMO-001','imus-city-jail-male','BJMP Imus City Jail - Male Dormitory','Brigada 1 - Main Dorm','Regular Visit','Sibling',CURDATE(),'09:00 AM - 10:00 AM','None','Approved',NOW(),'BJMP-DEMO-001')");
  return getDatabaseStatus();
}

export async function getStats() {
  const today = new Date().toISOString().split('T')[0];
  const [[pdls]]      = await pool.query<mysql.RowDataPacket[]>('SELECT COUNT(*) as cnt FROM pdls WHERE status="In Custody"') as any;
  const [[scheduled]] = await pool.query<mysql.RowDataPacket[]>('SELECT COUNT(*) as cnt FROM appointments WHERE visit_date=? AND status="Approved"', [today]) as any;
  const [[admitted]]  = await pool.query<mysql.RowDataPacket[]>('SELECT COUNT(*) as cnt FROM gate_logs WHERE DATE(timestamp)=? AND action="ADMITTED"', [today]) as any;
  const [[pending]]   = await pool.query<mysql.RowDataPacket[]>('SELECT COUNT(*) as cnt FROM users WHERE account_status="PENDING_BIOMETRICS"') as any;
  return {
    totalPdls:         pdls.cnt,
    scheduledToday:    scheduled.cnt,
    admittedToday:     admitted.cnt,
    pendingBiometrics: pending.cnt,
  };
}
