import QRCode from 'qrcode';
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
