export type AccountStatus = 
  | 'PENDING_EMAIL'        // Registration done, waiting for email confirmation
  | 'PENDING_BIOMETRICS'   // Email confirmed, must go to jail for in-person biometric scan
  | 'ACTIVATED'            // Biometric scanned at jail facility, fully activated
  | 'SUSPENDED';

export type Gender = 'Male' | 'Female' | 'Other' | 'Prefer not to say';

export type MaritalStatus = 
  | 'Single'
  | 'Married'
  | 'Widowed'
  | 'Separated'
  | 'Divorced';

export type ValidIdType = 
  | 'Philippine National ID (PhilSys)'
  | "Driver's License (LTO)"
  | 'Philippine Passport (DFA)'
  | 'UMID (Unified Multi-Purpose ID)'
  | 'Postal ID (Digitized)'
  | 'Social Security System (SSS) ID'
  | "Voter's ID / Comelec Certification"
  | 'PRC Professional Identification Card'
  | 'Senior Citizen ID'
  | 'PhilHealth Identification Card';

export type VisitType = 'Contact Visit' | 'Non-Contact (Glass Barrier)' | 'E-Dalaw (Online Video Call)';

export type UserRole = 'ADMIN' | 'WORKER' | 'GUARD' | 'VISITOR';

/** GUARD is retained for the existing database account; WORKER is the general staff role. */
export const isStaffRole = (role?: UserRole) => role === 'ADMIN' || role === 'WORKER' || role === 'GUARD';

export interface UserAddress {
  houseUnitStreet: string;
  municipality: string;
  maritalStatus: MaritalStatus;
  zipCode: string;
}

export interface UserProfile {
  id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  dateOfBirth: string;
  gender: Gender;
  contactNumber: string;
  email: string;
  password?: string;
  role?: UserRole;
  adminTitle?: string;
  badgeNumber?: string;
  address: UserAddress;
  validIdType: ValidIdType;
  idPhotoUrl: string;
  facePhotoUrl: string;
  accountStatus: AccountStatus;
  emailVerifiedAt?: string;
  biometricReferenceNumber: string;
  preferredJailFacilityId: string;
  biometricScannedAt?: string;
  biometricsOfficerName?: string;
  registeredAt: string;
}

export interface JailFacility {
  id: string;
  name: string;
  region: string;
  municipality: string;
  address: string;
  contactNumber: string;
  visitingDays: string;
  visitingHours: string;
  biometricDeskHours: string;
  capacityPerSlot: number;
}

export interface PDLCase {
  caseNumber: string;
  offense: string;
  counts?: number;
  dateCrimeCommitted?: string;
  courtBranch: string;
  presidingJudge?: string;
  caseStatus: string;
}

export interface PDLPreviousRecord {
  caseNumber: string;
  offense: string;
  court: string;
  sentence: string;
  dateArrested: string;
  dateReleased: string;
  modeOfRelease: string;
}

export interface PDLPropertyItem {
  unit: string;
  description: string;
}

export interface PDLPropertyReceipt {
  receiptNumber: string;
  date: string;
  items: PDLPropertyItem[];
  receivingOfficer: string;
  designation: string;
  witnessName?: string;
}

export interface PDLDocumentChecklist {
  mitimus?: boolean;
  judgementCourtOrder?: boolean;
  nonPendingCertificate?: boolean;
  commitmentInformation?: boolean;
  computationOfGcta?: boolean;
  certificateOfDetention?: boolean;
  certificateOfAppealNonAppeal?: boolean;
  healthCertificates?: boolean;
  ddeResult?: boolean;
}

export interface PDLHearingStage {
  arraignment?: boolean;
  preTrial?: boolean;
  trial?: boolean;
  prosecutionEvidence?: boolean;
  defenseEvidence?: boolean;
  decision?: boolean;
}

export interface PDLSentenceGcta {
  minimum?: string;
  maximum?: string;
  expirationWithoutGctaMin?: string;
  expirationWithoutGctaMax?: string;
  expirationWithGctaMin?: string;
  expirationWithGctaMax?: string;
}

export type BodyMarkView = 'FRONT' | 'BACK';
export type BodyMarkKind = 'Tattoo' | 'Scar' | 'Birthmark' | 'Other';

export interface PDLBodyMark {
  id: string;
  view: BodyMarkView;
  x: number;
  y: number;
  kind: BodyMarkKind;
  description: string;
}

export interface PDL {
  id: string;
  pdlNumber: string; // e.g., PDL-2025-00192 / Prisoner's No.
  fileNumber?: string; // e.g., FN-2025-042
  bjmpIdNumber?: string; // e.g., BJMP-ID-2025-8841

  // Name & Identity
  lastName?: string;
  firstName?: string;
  middleName?: string;
  suffix?: string;
  fullName: string;
  aliases?: string; // Nickname / Alias
  mugshotUrl?: string;

  // Personal Demographics
  dateOfBirth?: string;
  ageAtAdmission?: number;
  placeOfBirth?: string;
  sex?: 'Male' | 'Female';
  civilStatus?: MaritalStatus;
  citizenship?: string;
  religion?: string;
  tribalAffiliation?: string;

  // Addresses
  presentAddress?: string;
  provincialAddress?: string;

  // Education & Socio-Economic
  highestEducationalAttainment?: string;
  course?: string;
  occupation?: string;
  skills?: string;
  gangGroupAffiliation?: string; // Sigue-Sigue Sputnik, Batang City Jail, Bahala Na Gang, None

  // Physical & Bertillion / Medical
  height?: string; // e.g., 5'7" or 170 cm
  weight?: string; // e.g., 65 kg or 143 lbs
  built?: string; // Medium, Slim, Heavy, Muscular
  complexion?: string; // Fair, Brown/Kayumanggi, Dark
  eyes?: string; // Brown, Black
  hair?: string; // Black, Wavy
  bloodType?: string; // O+, A+, B+, AB+
  mannerism?: string;
  dialectsSpoken?: string; // Tagalog, English, Ilocano, Cebuano
  bertillionMarks?: string; // Scars, Tattoos, Amputations, Marks
  bodyMarks?: PDLBodyMark[]; // Clicked locations on the digital body chart

  // Family & Emergency
  spouseName?: string;
  fatherName?: string;
  fatherAddress?: string;
  motherName?: string;
  motherAddress?: string;
  numberOfChildren?: number;
  childrenNames?: string[];
  emergencyContactPerson?: string;
  emergencyContactAddress?: string;
  emergencyContactRelation?: string;
  emergencyContactPhone?: string;

  // Arrest & Intake
  dateCommitted?: string; // Date committed to BJMP
  timeAndDateOfArrest?: string;
  placeOfArrest?: string;
  arrestingOfficer?: string;
  timeDateOfDetentionLea?: string;
  receivingOfficer?: string;
  searchedBy?: string;

  // Institutional Assignment
  jailFacilityId: string;
  cellDormitory: string; // Brigada 3 - Cell Dorm B
  status: 'In Custody' | 'On Trial' | 'Sentenced' | 'Transferred' | 'Released';
  allowedVisitorRelationship: string[];

  // Legal & Court Case Details
  primaryOffense?: string;
  criminalCaseNumbers?: string[];
  cases?: PDLCase[];
  dateCrimeCommitted?: string;
  courtBranch?: string; // e.g. RTC Branch 20, Imus City
  presidingJudge?: string; // e.g. Hon. Amy A. Alabastro
  caseStatus?: string; // Under Trial, Arraignment, Pre-Trial, Promulgated
  hearingStage?: PDLHearingStage;
  sentence?: PDLSentenceGcta;
  previousCriminalRecords?: PDLPreviousRecord[];

  // Documents & GCTA (R.A. 10592)
  ra10592ManifestationSigned?: boolean;
  documentsChecklist?: PDLDocumentChecklist;

  // Property Receipt / Deposit
  propertyReceipt?: PDLPropertyReceipt;
}

export interface VisitationAppointment {
  id: string;
  appointmentReference: string;
  userId: string;
  visitorName: string;
  visitorContact: string;
  pdlId: string;
  pdlName: string;
  pdlNumber: string;
  jailFacilityId: string;
  jailFacilityName: string;
  cellDormitory: string;
  visitType: VisitType;
  relationshipToPDL: string;
  visitDate: string;
  timeSlot: string;
  paabotItemsDescription?: string;
  status: 'Pending Review' | 'Approved' | 'Completed' | 'Cancelled';
  createdAt: string;
  qrToken: string;
}

export interface PermanentQRData {
  system: 'BJMP_IMUS_VISIT_SYSTEM';
  version: '2.0';
  visitorId: string;
  biometricReferenceNumber: string;
  fullName: string;
  validIdType: string;
  designatedFacility: string;
  accountStatus: AccountStatus;
  updatedAt: string;
  currentAppointment?: {
    appointmentReference: string;
    visitDate: string;
    timeSlot: string;
    visitType: VisitType;
    pdlName: string;
    pdlNumber: string;
    cellDormitory: string;
    paabotSummary?: string;
  } | null;
}

export interface GuardScanResult {
  hasAppointmentToday: boolean;
  appointment?: VisitationAppointment;
  visitor: UserProfile;
  otherAppointments: VisitationAppointment[];
  scanDate: string;
  scanTime: string;
}
