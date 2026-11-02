import QRCode from 'qrcode';
import { UserProfile, VisitationAppointment } from '../types';

/** The QR is an opaque, persistent visitor identifier; admission is always checked online. */
export function buildPermanentQRPayload(user:UserProfile,_appointments:VisitationAppointment[]=[],_currentDateStr?:string):string {
  if(!user.permanentQrToken)throw new Error('Your visitor QR identifier is not available. Reload your account or contact the records desk.');
  return user.permanentQrToken;
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
