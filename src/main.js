// Point de départ de l'application : relie la carte, les panneaux, le mode borne et les réglages.

import 'flag-icons/css/flag-icons.min.css';
import './styles.css';
// Copie des données 5fish (voir README : « Mettre à jour les données 5fish »)
import donnees from './donnees/5fish.json';
import { creerCarte, REGIONS } from './carte.js';
import { changerLangue, quandLaLangueChange, traduireLaPage } from './traductions.js';
import { creerPanneauPays } from './panneau-pays.js';
import { creerEcoute } from './ecoute.js';
import { creerBorne, MODE_BORNE } from './borne.js';
import { creerVeille } from './veille.js';
import { creerEcranReglages } from './reglages.js';
import { creerBandeau } from './bandeau.js';
import { creerRecherche } from './recherche.js';
import { creerPleinEcran } from './plein-ecran.js';
import { creerActivation } from './activation.js';
import { lireReglages, appliquerConfigurationDeLAdresse } from './stockage.js';

// Empêche le zoom de la page entière (pincement Safari/iPad, double toucher)
document.addEventListener('gesturestart', (e) => e.preventDefault());

// --- Réglages de la borne (enregistrés sur l'appareil) -------------------

// Un lien de configuration (…?config=…) ouvert sur la borne enregistre ses réglages
appliquerConfigurationDeLAdresse();
let reglages = lireReglages();

// --- Carte ---------------------------------------------------------------

const carte = creerCarte({
  svgElement: document.getElementById('carte'),
  coucheDrapeaux: document.getElementById('couche-drapeaux'),
  donnees,
  quandPaysTouche: (code) => ouvrirPays(code),
  quandMerTouchee: () => fermerPays(), // toucher la mer ferme le panneau du pays
});

quandLaLangueChange(() => carte.traduire());

// --- Onglets des régions -------------------------------------------------

const conteneurOnglets = document.getElementById('onglets');

Object.keys(REGIONS).forEach((nomRegion) => {
  const onglet = document.createElement('button');
  onglet.type = 'button';
  onglet.className = 'onglet';
  onglet.dataset.region = nomRegion;
  onglet.dataset.texte = nomRegion; // le texte est traduit par traduireLaPage()
  onglet.addEventListener('click', () => choisirRegion(nomRegion));
  conteneurOnglets.appendChild(onglet);
});

function choisirRegion(nomRegion) {
  conteneurOnglets.querySelectorAll('.onglet').forEach((onglet) => {
    onglet.classList.toggle('actif', onglet.dataset.region === nomRegion);
  });
  carte.allerA(nomRegion);
}

// --- Bandeau d'accueil de l'église -----------------------------------------

const bandeau = creerBandeau({
  // Le bandeau prend de la place en haut : la carte se redessine dans l'espace restant
  quandHauteurChange: () => carte.redimensionner(),
});

// --- Mode borne : inactivité, « Je suis toujours là », veille -------------

const borne = creerBorne({
  reglages: () => reglages,
  quandInactifSurCarte: () => passerEnVeille(),
  quandInactifSur5fish: () => ecoute.retourALaCarte(),
});

const veille = creerVeille({
  quandReveil: () => borne.changerEtat('carte'),
});

// --- Mises à jour de l'application sur une borne allumée en permanence ------
// L'application enregistrée sur l'appareil (hors ligne) ne prend une nouvelle version
// qu'au rechargement. Sur une borne, personne ne recharge : on vérifie donc s'il existe
// une nouvelle version toutes les heures et, quand elle est prête, on recharge la page
// au moment du passage en veille (jamais pendant qu'un visiteur utilise la borne).
let nouvelleVersionPrete = false;

if ('serviceWorker' in navigator) {
  // Lors de la toute première visite, il n'y a pas encore de version enregistrée :
  // son installation n'est pas une « nouvelle version », inutile de recharger
  let versionDejaEnregistree = Boolean(navigator.serviceWorker.controller);

  navigator.serviceWorker.ready.then((enregistrement) => {
    setInterval(() => enregistrement.update().catch(() => {}), 60 * 60 * 1000);
  });
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!versionDejaEnregistree) {
      versionDejaEnregistree = true;
      return;
    }
    nouvelleVersionPrete = true;
    if (veille.estVisible()) window.location.reload(); // déjà en veille : on recharge tout de suite
  });
}

// Ferme tout, recentre la carte sur le monde et lance le diaporama
function passerEnVeille() {
  if (nouvelleVersionPrete) {
    window.location.reload(); // l'application redémarre sur l'écran d'accueil, à jour
    return;
  }
  ecranReglages.fermer();
  recherche.fermer();
  ecoute.toutFermer();
  fermerPays();
  choisirRegion('monde');
  veille.montrer(reglages.dureeImage);
  borne.changerEtat('veille');
}

// --- Panneau d'un pays et écoute (QR code, « Ouvrir ici ») ----------------

function fermerPays() {
  panneauPays.fermer();
  carte.selectionnerPays(null);
  document.body.classList.remove('pays-ouvert');
}

const ecoute = creerEcoute({
  quand5fishOuvert: () => borne.changerEtat('5fish'),
  quandRetourCarte: () => {
    fermerPays();
    borne.changerEtat('carte');
  },
});

const panneauPays = creerPanneauPays({
  donnees,
  quandLangueChoisie: (choix) => ecoute.ouvrirQr(choix),
  quandFerme: fermerPays,
});

function ouvrirPays(code) {
  carte.selectionnerPays(code);
  panneauPays.ouvrir(code);
  document.body.classList.add('pays-ouvert'); // décale les commandes vers la gauche
}

// --- Écran des réglages (roue ⚙) -----------------------------------------

const ecranReglages = creerEcranReglages({
  donnees,
  quandEnregistre: (nouveaux) => {
    reglages = nouveaux;
    changerLangue(reglages.langue);
    bandeau.afficher(reglages);
    borne.relancer();
  },
  quandDiaporamaChange: () => veille.chargerImages(),
});

document.getElementById('bouton-reglages').addEventListener('click', () => ecranReglages.ouvrir());

// --- Boutons + et − ------------------------------------------------------

document.getElementById('zoom-plus').addEventListener('click', () => carte.zoomer(1.6));
document.getElementById('zoom-moins').addEventListener('click', () => carte.zoomer(1 / 1.6));

// --- Plein écran (sur la carte et sur l'écran de veille) -----------------

// En mode borne : code demandé pour sortir, retour automatique au plein écran (plein-ecran.js)
const pleinEcran = creerPleinEcran();

document.getElementById('bouton-plein-ecran').addEventListener('click', () => pleinEcran.basculer());
document.getElementById('veille-plein-ecran').addEventListener('click', () => pleinEcran.basculer());

// --- Recherche (loupe) ---------------------------------------------------

const recherche = creerRecherche({
  donnees,
  quandPaysChoisi: (code) => ouvrirPays(code),
  quandLangueChoisie: (choix) => ecoute.ouvrirQr(choix),
});

document.getElementById('bouton-recherche').addEventListener('click', () => recherche.ouvrir());

// --- Démarrage -----------------------------------------------------------

traduireLaPage();
changerLangue(reglages.langue);

// Code d'accès : tant que l'appareil n'est pas activé, l'écran « Code d'accès » cache la carte
creerActivation();

bandeau.afficher(reglages);
choisirRegion('monde');
borne.changerEtat('carte');

// En mode borne, l'application démarre sur l'écran d'accueil (diaporama),
// une fois la liste des images chargée
veille.chargerImages().then(() => {
  if (MODE_BORNE) passerEnVeille();
});
