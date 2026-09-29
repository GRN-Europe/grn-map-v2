// Gestion des langues de l'interface.
//
// Chaque langue est un fichier du dossier src/langues/ (fr.js, en.js…).
// Pour AJOUTER UNE LANGUE : copier en.js sous le nom de la nouvelle langue (par ex. de.js),
// changer code, nom et l'import des noms de pays, puis traduire les textes.
// Elle apparaît alors toute seule dans la liste des réglages.
//
// Pour AJOUTER UN TEXTE : ajouter la même clé dans chaque fichier de langue,
// puis l'utiliser avec texte("maCle") ou l'attribut data-texte="maCle" dans le HTML.
// Si une langue n'a pas encore la traduction, le texte anglais s'affiche.

import { ajouterNomsDesPays } from './pays.js';

// Charge automatiquement tous les fichiers du dossier src/langues/
const fichiers = import.meta.glob('./langues/*.js', { eager: true, import: 'default' });

// Dictionnaire des langues disponibles : { fr: {...}, en: {...}, ... }
const LANGUES = {};
Object.values(fichiers).forEach((langueInterface) => {
  LANGUES[langueInterface.code] = langueInterface;
  ajouterNomsDesPays(langueInterface.pays);
});

// Langue de secours quand un texte manque
const LANGUE_DE_SECOURS = 'en';

// Langue actuelle de l'interface
let langueActuelle = 'fr';

// Fonctions appelées quand la langue change (pour redessiner ce qui dépend de la langue)
const abonnes = [];

export function langue() {
  return langueActuelle;
}

// Liste des langues pour le menu des réglages, triée par nom : [{ code, nom }, ...]
export function languesDisponibles() {
  return Object.values(LANGUES)
    .map(({ code, nom }) => ({ code, nom }))
    .sort((a, b) => a.nom.localeCompare(b.nom));
}

// Renvoie le texte correspondant à une clé, dans la langue actuelle (ou en anglais s'il manque).
// "valeurs" remplit les parties variables : texte('languesNatives', { n: 4 }) → « 4 langues natives »
export function texte(cle, valeurs = {}) {
  const modele = LANGUES[langueActuelle].textes[cle]
    ?? LANGUES[LANGUE_DE_SECOURS].textes[cle]
    ?? cle;
  return modele.replace(/\{(\w+)\}/g, (tout, nom) => valeurs[nom] ?? tout);
}

// Change la langue, met à jour le HTML et prévient les autres modules
export function changerLangue(nouvelle) {
  if (!LANGUES[nouvelle]) return; // langue inconnue : on ne change rien
  langueActuelle = nouvelle;
  document.documentElement.lang = nouvelle;
  traduireLaPage();
  abonnes.forEach((fonction) => fonction(nouvelle));
}

// Permet à un module d'être prévenu à chaque changement de langue
export function quandLaLangueChange(fonction) {
  abonnes.push(fonction);
}

// Remplit tous les éléments HTML qui ont un attribut data-texte ou data-texte-aria
export function traduireLaPage() {
  document.querySelectorAll('[data-texte]').forEach((element) => {
    element.textContent = texte(element.dataset.texte);
  });
  document.querySelectorAll('[data-texte-aria]').forEach((element) => {
    element.setAttribute('aria-label', texte(element.dataset.texteAria));
  });
  document.querySelectorAll('[data-texte-placeholder]').forEach((element) => {
    element.placeholder = texte(element.dataset.textePlaceholder);
  });
}
