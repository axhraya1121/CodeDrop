import QRCode from 'qrcode';

/**
 * Generates a 100% standard-compliant SVG QR Code string for phone scanning.
 */
export async function generateQRCodeSVG(text: string, size: number = 220): Promise<string> {
  try {
    const svg = await QRCode.toString(text, {
      type: 'svg',
      width: size,
      margin: 1,
      color: {
        dark: '#00685f',
        light: '#ffffff',
      },
    });
    return svg;
  } catch (err) {
    console.error('QR Code generation error:', err);
    return '';
  }
}
