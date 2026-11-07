// Fabrique un QR code en SVG à partir d'une adresse web.
// Le QR code est calculé sur la borne elle-même : il fonctionne sans internet.

import QRCode from 'qrcode';

// Les QR codes déjà calculés sont gardés en mémoire : rouvrir un pays (ou la fenêtre
// d'une langue) ne refait pas le calcul. Au-delà de MAX_EN_MEMOIRE, on oublie les plus anciens.
const MAX_EN_MEMOIRE = 2000;
const dejaCalcules = new Map();

// Renvoie le code SVG (texte) du QR code, à insérer avec innerHTML
export function qrCodeSvgImmediat(adresse) {
  let svg = dejaCalcules.get(adresse);
  if (svg === undefined) {
    QRCode.toString(adresse, {
      type: 'svg',
      margin: 0,               // pas de marge blanche autour : la mise en page s'en charge
      errorCorrectionLevel: 'M',
    }, (erreur, resultat) => {
      if (erreur) throw erreur;
      svg = resultat;
    });
    if (dejaCalcules.size >= MAX_EN_MEMOIRE) {
      dejaCalcules.delete(dejaCalcules.keys().next().value);
    }
    dejaCalcules.set(adresse, svg);
  }
  return svg;
}

// Même chose, sous forme de promesse (utilisé par la fenêtre du QR code et l'écran 5fish)
export async function qrCodeSvg(adresse) {
  return qrCodeSvgImmediat(adresse);
}
