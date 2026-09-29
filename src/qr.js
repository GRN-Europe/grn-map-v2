// Fabrique un QR code en SVG à partir d'une adresse web.
// Le QR code est calculé sur la borne elle-même : il fonctionne sans internet.

import QRCode from 'qrcode';

// Renvoie le code SVG (texte) du QR code, à insérer avec innerHTML
export function qrCodeSvg(adresse) {
  return QRCode.toString(adresse, {
    type: 'svg',
    margin: 0,               // pas de marge blanche autour : la mise en page s'en charge
    errorCorrectionLevel: 'M',
  });
}
