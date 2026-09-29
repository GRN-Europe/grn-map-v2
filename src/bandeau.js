// Bandeau d'accueil de l'église (nouveauté de la v2).
//
// Un bandeau en haut de l'écran affiche le logo de l'église hôte et une phrase d'accueil,
// par exemple : « L'Église du Phare vous accueille avec l'Évangile dans votre langue de cœur ! »
// - Il se règle dans les réglages ⚙ (afficher/masquer, logo, phrase dans chaque langue).
// - Il reste visible sur la carte et pendant le diaporama de veille.
// - Il est désactivé par défaut : sans lui, l'écran d'accueil est exactement celui de la v1.

import { langue, quandLaLangueChange } from './traductions.js';

// Taille maximale du logo une fois préparé (en pixels) : assez pour un écran de borne,
// assez petit pour tenir dans le lien de configuration
const LOGO_HAUTEUR_MAX = 160;
const LOGO_LARGEUR_MAX = 480;

export function creerBandeau({ quandHauteurChange }) {
  const element = document.getElementById('bandeau');
  const logo = document.getElementById('bandeau-logo');
  const phrase = document.getElementById('bandeau-phrase');

  let reglagesActuels = null;
  let etaitVisible = false;

  // Affiche ou cache le bandeau selon les réglages
  function afficher(reglages) {
    reglagesActuels = reglages;
    const texte = phraseDansLaLangue(reglages.bandeauPhrases, langue());
    const visible = Boolean(reglages.bandeauActif && (reglages.bandeauLogo || texte));

    element.hidden = !visible;
    logo.hidden = !reglages.bandeauLogo;
    if (reglages.bandeauLogo) logo.src = reglages.bandeauLogo;
    phrase.textContent = texte;

    // La classe "avec-bandeau" descend la carte et le diaporama sous le bandeau (voir styles.css)
    document.body.classList.toggle('avec-bandeau', visible);
    if (visible !== etaitVisible) {
      etaitVisible = visible;
      quandHauteurChange(); // la carte doit se redessiner dans sa nouvelle hauteur
    }
  }

  // La phrase suit la langue de l'interface
  quandLaLangueChange(() => {
    if (reglagesActuels) afficher(reglagesActuels);
  });

  return { afficher };
}

// Phrase dans la langue demandée ; sinon en anglais ; sinon la première phrase remplie
export function phraseDansLaLangue(phrases = {}, code) {
  const remplies = Object.values(phrases).filter((p) => p && p.trim());
  return (phrases[code] || phrases.en || remplies[0] || '').trim();
}

// Prépare un logo choisi dans les réglages (PNG, JPG ou SVG) :
// 1. les marges vides autour du dessin sont rognées (beaucoup de logos en ont de grandes,
//    ce qui les rendrait minuscules dans le bandeau) ;
// 2. il est réduit et converti en PNG, puis renvoyé sous forme de texte (« data URL »)
//    pour être enregistré sur l'appareil et inclus dans le lien de configuration.
export function preparerLogo(fichier) {
  return new Promise((resoudre, rejeter) => {
    const adresse = URL.createObjectURL(fichier);
    const image = new Image();
    image.onload = () => {
      // Certains SVG n'indiquent pas leur taille : on prend alors une taille par défaut
      const largeur = image.naturalWidth || 300;
      const hauteur = image.naturalHeight || 100;

      // Dessin à taille raisonnable (au plus 1200 px de large) pour chercher les marges
      const echelleTravail = Math.min(1, 1200 / largeur);
      const travail = document.createElement('canvas');
      travail.width = Math.round(largeur * echelleTravail);
      travail.height = Math.round(hauteur * echelleTravail);
      const contexte = travail.getContext('2d', { willReadFrequently: true });
      contexte.drawImage(image, 0, 0, travail.width, travail.height);
      URL.revokeObjectURL(adresse);

      const cadre = cadreDuDessin(contexte, travail.width, travail.height);

      // Réduction finale à la taille du bandeau
      const echelle = Math.min(1, LOGO_HAUTEUR_MAX / cadre.hauteur, LOGO_LARGEUR_MAX / cadre.largeur);
      const toile = document.createElement('canvas');
      toile.width = Math.max(1, Math.round(cadre.largeur * echelle));
      toile.height = Math.max(1, Math.round(cadre.hauteur * echelle));
      toile.getContext('2d').drawImage(
        travail, cadre.x, cadre.y, cadre.largeur, cadre.hauteur, 0, 0, toile.width, toile.height,
      );
      resoudre(toile.toDataURL('image/png'));
    };
    image.onerror = () => {
      URL.revokeObjectURL(adresse);
      rejeter(new Error('Image illisible'));
    };
    image.src = adresse;
  });
}

// Trouve le rectangle qui contient le dessin, en ignorant les marges du fond.
// Le fond est la couleur du coin en haut à gauche (souvent blanc ou transparent).
function cadreDuDessin(contexte, largeur, hauteur) {
  const pixels = contexte.getImageData(0, 0, largeur, hauteur).data;
  const [fondR, fondG, fondB, fondA] = pixels;
  const TOLERANCE = 40; // écart de couleur au-delà duquel un pixel fait partie du dessin

  let gauche = largeur;
  let droite = -1;
  let haut = hauteur;
  let bas = -1;

  for (let y = 0; y < hauteur; y += 1) {
    for (let x = 0; x < largeur; x += 1) {
      const i = (y * largeur + x) * 4;
      const alpha = pixels[i + 3];
      const different = fondA < 16
        ? alpha > 16 // fond transparent : tout pixel visible compte
        : alpha > 16 && (Math.abs(pixels[i] - fondR) + Math.abs(pixels[i + 1] - fondG)
          + Math.abs(pixels[i + 2] - fondB)) > TOLERANCE;
      if (different) {
        if (x < gauche) gauche = x;
        if (x > droite) droite = x;
        if (y < haut) haut = y;
        if (y > bas) bas = y;
      }
    }
  }

  // Image vide ou d'une seule couleur : on garde tout
  if (droite < 0) return { x: 0, y: 0, largeur, hauteur };

  // Petite marge de respiration autour du dessin (2 % de sa taille)
  const marge = Math.round(Math.max(droite - gauche, bas - haut) * 0.02);
  const x = Math.max(0, gauche - marge);
  const y = Math.max(0, haut - marge);
  return {
    x,
    y,
    largeur: Math.min(largeur, droite + marge + 1) - x,
    hauteur: Math.min(hauteur, bas + marge + 1) - y,
  };
}
