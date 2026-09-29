// Plein écran de la borne.
//
// En mode borne :
// 1. sortir du plein écran avec le bouton ⛶ demande le code d'accès (GRNERD ou celui de l'église) ;
// 2. si quelqu'un sort du plein écran autrement (touche Échap, geste du système…),
//    le plein écran revient au toucher suivant.
//
// LIMITE : un site web ne peut pas empêcher totalement la sortie du plein écran
// (les navigateurs l'interdisent par sécurité). Pour un vrai verrouillage, utiliser le mode
// kiosque de l'appareil : Accès guidé (iPad), Accès attribué (Windows), etc.

import { lireReglages, codeValide } from './stockage.js';
import { MODE_BORNE } from './borne.js';

export function creerPleinEcran() {
  const fenetre = document.getElementById('fenetre-code-sortie');
  const formulaire = document.getElementById('formulaire-code-sortie');
  const champ = document.getElementById('champ-code-sortie');
  const erreur = document.getElementById('erreur-code-sortie');

  // true quand le responsable a quitté le plein écran avec le code :
  // le plein écran ne revient alors plus tout seul (jusqu'au prochain appui sur ⛶)
  let sortieAutorisee = false;

  // Les anciennes versions de Safari (iPad) utilisent des noms préfixés « webkit »
  const estEnPleinEcran = () => Boolean(document.fullscreenElement || document.webkitFullscreenElement);

  function entrer() {
    const page = document.documentElement;
    const demander = page.requestFullscreen ?? page.webkitRequestFullscreen;
    if (!demander) return; // appareil sans plein écran : on ne fait rien
    try {
      demander.call(page)?.catch?.(() => {}); // refus éventuel du navigateur : sans importance
    } catch {
      // idem
    }
  }

  function sortir() {
    const quitter = document.exitFullscreen ?? document.webkitExitFullscreen;
    quitter?.call(document);
  }

  // Bouton ⛶ (sur la carte et sur l'écran d'accueil)
  function basculer() {
    if (!estEnPleinEcran()) {
      sortieAutorisee = false;
      entrer();
    } else if (MODE_BORNE) {
      demanderLeCode();
    } else {
      sortir();
    }
  }

  // --- Fenêtre du code pour sortir du plein écran --------------------------

  function demanderLeCode() {
    champ.value = '';
    erreur.hidden = true;
    fenetre.hidden = false;
    champ.focus();
  }

  formulaire.addEventListener('submit', (evenement) => {
    evenement.preventDefault();
    if (codeValide(champ.value, lireReglages())) {
      fenetre.hidden = true;
      sortieAutorisee = true;
      sortir();
    } else {
      erreur.hidden = false;
      champ.select();
    }
  });

  document.getElementById('code-sortie-annuler').addEventListener('click', () => {
    fenetre.hidden = true;
  });

  // --- Retour automatique au plein écran (mode borne) -----------------------
  // Le navigateur n'autorise le plein écran qu'en réponse à un geste : on attend donc
  // le prochain toucher sur l'écran.
  if (MODE_BORNE) {
    document.addEventListener('click', () => {
      if (!sortieAutorisee && !estEnPleinEcran()) entrer();
    }, true);
  }

  return { basculer };
}
