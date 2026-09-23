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

export interface PDL {
  id: string;
  pdlNumber: string;
  fullName: string;
  jailFacilityId: string;
  cellDormitory: string;
  status: 'In Custody' | 'On Trial';
  allowedVisitorRelationship: string[];
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
