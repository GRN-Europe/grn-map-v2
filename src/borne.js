// Mode borne : écran d'accueil (diaporama) et retours automatiques après inactivité.
//
// Le mode borne est actif sur l'adresse simple (choix de GRN Europe).
// Pour l'utiliser comme un site normal, sans diaporama ni retour automatique,
// ajouter ?presentation=0 à l'adresse.
//
// La borne est toujours dans l'un de ces trois états :
//   "carte"  → sans toucher pendant « inactivité » secondes, on passe au diaporama de veille ;
//   "5fish"  → sans toucher pendant « retour 5fish » secondes, on revient à la carte ;
//   "veille" → le diaporama tourne ; un toucher ramène à la carte.
// Pendant les 10 dernières secondes, la fenêtre « Je suis toujours là » s'affiche.

import { texte, quandLaLangueChange } from './traductions.js';

// true sauf si l'adresse contient ?presentation=0
export const MODE_BORNE = new URLSearchParams(window.location.search).get('presentation') !== '0';

// Nombre de secondes pendant lesquelles « Je suis toujours là » est affiché
const DUREE_AVERTISSEMENT = 10;

export function creerBorne({ reglages, quandInactifSurCarte, quandInactifSur5fish }) {
  const avertissement = document.getElementById('toujours-la');
  const secondesAvertissement = document.getElementById('toujours-la-secondes');
  const compte5fish = document.getElementById('compte-a-rebours');

  let etat = 'carte';
  let secondesRestantes = 0;
  let minuterie = null;

  // Durée à attendre dans l'état actuel (0 = pas de retour automatique)
  function delaiActuel() {
    if (!MODE_BORNE) return 0;
    const { inactivite, retour5fish } = reglages();
    if (etat === 'carte') return inactivite;
    if (etat === '5fish') return retour5fish;
    return 0; // en veille, on attend simplement un toucher
  }

  // Change d'état (appelé quand on ouvre 5fish, revient à la carte, passe en veille…)
  function changerEtat(nouvelEtat) {
    etat = nouvelEtat;
    relancer();
  }

  // Remet le compte à rebours à zéro (à chaque toucher)
  function relancer() {
    clearInterval(minuterie);
    minuterie = null;
    avertissement.hidden = true;
    secondesRestantes = delaiActuel();
    if (secondesRestantes > 0) {
      minuterie = setInterval(chaqueSeconde, 1000);
    }
    afficher();
  }

  function chaqueSeconde() {
    secondesRestantes -= 1;
    if (secondesRestantes <= 0) {
      clearInterval(minuterie);
      minuterie = null;
      avertissement.hidden = true;
      if (etat === 'carte') quandInactifSurCarte();
      else if (etat === '5fish') quandInactifSur5fish();
      return;
    }
    avertissement.hidden = secondesRestantes > DUREE_AVERTISSEMENT;
    afficher();
  }

  // Met à jour les textes : « Retour à la carte dans 2:59 » (barre 5fish) et la fenêtre d'avertissement
  function afficher() {
    if (etat === '5fish' && minuterie) {
      const minutes = Math.floor(secondesRestantes / 60);
      const secondes = String(secondesRestantes % 60).padStart(2, '0');
      compte5fish.textContent = texte('retourDans', { temps: `${minutes}:${secondes}` });
    } else {
      compte5fish.textContent = '';
    }
    const cle = etat === '5fish' ? 'retourDansSecondes' : 'veilleDansSecondes';
    secondesAvertissement.textContent = texte(cle, { n: secondesRestantes });
  }

  // Tout toucher sur l'écran compte comme une activité (sauf en veille, qui gère son propre toucher).
  // Note : les touchers faits DANS la page 5fish ne sont pas visibles par l'application.
  document.addEventListener('pointerdown', () => {
    if (etat !== 'veille') relancer();
  }, true);
  // Taper au clavier (recherche, réglages) compte aussi comme une activité
  document.addEventListener('keydown', () => {
    if (etat !== 'veille') relancer();
  }, true);
  document.getElementById('bouton-toujours-la').addEventListener('click', relancer);
  quandLaLangueChange(afficher);

  return { changerEtat, relancer };
}
