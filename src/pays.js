// Outils sur les pays : code à 2 lettres (FR, AD…) et nom dans la langue de l'interface.
// La carte (world-atlas) repère les pays par un code numérique ISO (250 = France).
// La bibliothèque i18n-iso-countries fait la conversion et fournit les noms.

import pays from 'i18n-iso-countries';

// Quelques territoires de la carte n'ont pas de code numérique officiel.
// On les complète à la main quand un code à 2 lettres existe.
const CODES_MANQUANTS = {
  Kosovo: 'XK',
};

// Noms que la bibliothèque ne connaît pas (identiques dans toutes les langues)
const NOMS_MANQUANTS = {
  XK: 'Kosovo',
};

// Enregistre les noms des pays d'une langue (appelé par traductions.js pour chaque langue)
export function ajouterNomsDesPays(donneesLangue) {
  pays.registerLocale(donneesLangue);
}

// Renvoie le code à 2 lettres d'un pays de la carte, ou null s'il n'en a pas
export function codeDuPays(entiteCarte) {
  if (entiteCarte.id) {
    return pays.numericToAlpha2(entiteCarte.id) ?? null;
  }
  return CODES_MANQUANTS[entiteCarte.properties.name] ?? null;
}

// Lien de la page 5fish d'une langue DANS un pays donné.
// Les données gardent un modèle « https://fivefish.org/{pays}/23?language=French » :
// on y met le code du pays en minuscules (fr → le français en France).
export function lienFivefish(modele, codePays) {
  return modele.replace('{pays}', codePays.toLowerCase());
}

// Renvoie le nom du pays dans la langue demandée (en anglais s'il manque)
export function nomDuPays(code, langue) {
  return NOMS_MANQUANTS[code] ?? pays.getName(code, langue) ?? pays.getName(code, 'en') ?? code;
}
