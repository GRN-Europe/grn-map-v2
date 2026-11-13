// Version d'essai (branche « essais » publiée par Vercel à une adresse à part, voir vite.config.js).
// - Une étiquette rayée en bas de l'écran rappelle qu'on n'est pas sur la version des bornes.
// - L'écran « Code d'accès » est sauté : les codes des Églises (un appareil par code) ne sont
//   jamais utilisés par un appareil d'essai.

import { texte, quandLaLangueChange } from './traductions.js';

/* global __VERSION_ESSAI__ */
export const VERSION_ESSAI = __VERSION_ESSAI__;

export function afficherEtiquetteEssai() {
  if (!VERSION_ESSAI) return;
  const etiquette = document.createElement('div');
  etiquette.className = 'etiquette-essai';
  etiquette.setAttribute('role', 'status');
  const ecrire = () => { etiquette.textContent = texte('versionEssai'); };
  ecrire();
  quandLaLangueChange(ecrire);
  document.body.appendChild(etiquette);
}
