// Écoute d'une langue :
// 1. la fenêtre du QR code (« Scannez avec votre téléphone pour écouter », « Fermer », « Ouvrir ici ») ;
// 2. l'écran « Ouvrir ici » : la page 5fish dans un cadre, sous une barre avec
//    « ↩ Retour à la carte », le nom « Langue (Pays) » et le compte à rebours.
// Le compte à rebours et « Je suis toujours là » sont gérés par borne.js.

import { qrCodeSvg } from './qr.js';

export function creerEcoute({ quand5fishOuvert, quandRetourCarte }) {
  const fenetreQr = document.getElementById('fenetre-qr');
  const ecran5fish = document.getElementById('ecran-5fish');
  const cadre = document.getElementById('cadre-5fish');

  let langueChoisie = null; // { nomLangue, nomPays, lien }

  // --- 1. Fenêtre du QR code ---------------------------------------------

  async function ouvrirQr(choix) {
    langueChoisie = choix;
    document.getElementById('qr-langue').textContent = choix.nomLangue;
    document.getElementById('qr-pays').textContent = choix.nomPays;
    document.getElementById('qr-code').innerHTML = await qrCodeSvg(choix.lien);
    fenetreQr.hidden = false;
  }

  function fermerQr() {
    fenetreQr.hidden = true;
  }

  // --- 2. Écran 5fish ------------------------------------------------------

  function ouvrir5fish() {
    fermerQr();
    document.getElementById('titre-5fish').textContent =
      `${langueChoisie.nomLangue} (${langueChoisie.nomPays})`;
    cadre.src = langueChoisie.lien;
    ecran5fish.hidden = false;
    quand5fishOuvert();
  }

  // Ferme tout ce qui concerne l'écoute (sans prévenir : utilisé aussi par la mise en veille)
  function toutFermer() {
    fermerQr();
    if (!ecran5fish.hidden) {
      ecran5fish.hidden = true;
      cadre.src = 'about:blank'; // arrête l'audio éventuellement en cours
    }
  }

  function retourALaCarte() {
    toutFermer();
    quandRetourCarte();
  }

  document.getElementById('qr-fermer').addEventListener('click', fermerQr);
  document.getElementById('qr-ouvrir-ici').addEventListener('click', ouvrir5fish);
  document.getElementById('retour-carte').addEventListener('click', retourALaCarte);

  return { ouvrirQr, retourALaCarte, toutFermer };
}
