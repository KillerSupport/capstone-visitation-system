import QRCode from 'qrcode';
import { UserProfile, VisitationAppointment, PermanentQRData } from '../types';

/**
 * Builds the dynamic permanent payload stored in the visitor's QR code.
 * Whenever an appointment is booked or changed, the data resolved by this QR updates.
 */
export function buildPermanentQRPayload(
  user: UserProfile,
  appointments: VisitationAppointment[],
  currentDateStr?: string
): PermanentQRData {
  const targetDate = currentDateStr || new Date().toISOString().split('T')[0];
  // Find if there is an active appointment for target date
  const todayAppt = appointments.find(
    (a) => a.userId === user.id && a.visitDate === targetDate && a.status !== 'Cancelled'
  );

  // Or get the closest upcoming approved appointment
  const nextAppt = todayAppt || appointments
    .filter((a) => a.userId === user.id && a.status !== 'Cancelled' && a.visitDate >= targetDate)
    .sort((a, b) => a.visitDate.localeCompare(b.visitDate))[0];

  return {
    system: 'BJMP_IMUS_VISIT_SYSTEM',
    version: '2.0',
    visitorId: user.id,
    biometricReferenceNumber: user.biometricReferenceNumber,
    fullName: `${user.firstName} ${user.middleName ? `${user.middleName} ` : ''}${user.lastName} ${user.suffix}`.trim(),
    validIdType: user.validIdType,
    designatedFacility: 'BJMP Imus City Jail - Region IV-A',
    accountStatus: user.accountStatus,
    updatedAt: new Date().toISOString(),
    currentAppointment: todayAppt
      ? {
          appointmentReference: todayAppt.appointmentReference,
          visitDate: todayAppt.visitDate,
          timeSlot: todayAppt.timeSlot,
          visitType: todayAppt.visitType,
          pdlName: todayAppt.pdlName,
          pdlNumber: todayAppt.pdlNumber,
          cellDormitory: todayAppt.cellDormitory,
          paabotSummary: todayAppt.paabotItemsDescription,
        }
      : nextAppt
      ? {
          appointmentReference: nextAppt.appointmentReference,
          visitDate: nextAppt.visitDate,
          timeSlot: nextAppt.timeSlot,
          visitType: nextAppt.visitType,
          pdlName: nextAppt.pdlName,
          pdlNumber: nextAppt.pdlNumber,
          cellDormitory: nextAppt.cellDormitory,
          paabotSummary: nextAppt.paabotItemsDescription,
        }
      : null,
  };
}

/**
 * Generates a high-resolution QR code data URL (PNG)
 */
export async function generateQRCodeDataUrl(textData: string): Promise<string> {
  try {
    return await QRCode.toDataURL(textData, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 380,
      color: {
        dark: '#020617', // Slate 950 deep navy
        light: '#FFFFFF',
      },
    });
  } catch (err) {
    console.error('Failed to generate QR Code:', err);
    return '';
  }
}
