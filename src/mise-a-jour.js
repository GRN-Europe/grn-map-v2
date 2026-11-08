// Section « Mise à jour » des réglages de la borne :
// - la date de la version installée (« Version du 7 novembre 2026 ») ;
// - le bouton « Mettre à jour » : il demande à internet la date de la dernière version publiée
//   (/version.json), et si elle est plus récente, télécharge la nouvelle version dans la
//   mémoire hors ligne (service worker) puis recharge la carte.
// La date change toute seule à chaque publication (voir DATE_VERSION dans vite.config.js).
// Le fonctionnement hors ligne ne change pas : sans internet, la carte reste celle installée.

import { texte, langue } from './traductions.js';

/* global __DATE_VERSION__ */
const VERSION_INSTALLEE = __DATE_VERSION__;
const DELAI_RESEAU = 15000;       // ms : au-delà, on considère qu'il n'y a pas de connexion
const DELAI_TELECHARGEMENT = 180000; // ms : téléchargement de la nouvelle version (images comprises)

class PasDeConnexion extends Error {}

// Date de la dernière version publiée, lue sur internet (jamais dans la mémoire hors ligne)
async function versionPubliee() {
  const arret = new AbortController();
  const minuterie = setTimeout(() => arret.abort(), DELAI_RESEAU);
  try {
    const reponse = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store', signal: arret.signal });
    if (!reponse.ok) throw new PasDeConnexion();
    return (await reponse.json()).version;
  } catch {
    throw new PasDeConnexion();
  } finally {
    clearTimeout(minuterie);
  }
}

// Attend que la nouvelle version soit téléchargée et mise en place dans la mémoire hors ligne
function attendreInstallation(travailleur) {
  return new Promise((resoudre, rejeter) => {
    const minuterie = setTimeout(() => rejeter(new PasDeConnexion()), DELAI_TELECHARGEMENT);
    const verifier = () => {
      if (travailleur.state === 'activated') {
        clearTimeout(minuterie);
        resoudre();
      } else if (travailleur.state === 'redundant') { // téléchargement interrompu
        clearTimeout(minuterie);
        rejeter(new PasDeConnexion());
      }
    };
    travailleur.addEventListener('statechange', verifier);
    travailleur.postMessage({ type: 'SKIP_WAITING' }); // au cas où elle attendrait son tour
    verifier();
  });
}

export function creerMiseAJour() {
  const zoneVersion = document.getElementById('version-installee');
  const bouton = document.getElementById('bouton-mettre-a-jour');
  const message = document.getElementById('message-maj');

  function afficherMessage(cle, classe = '') {
    message.textContent = cle ? texte(cle) : '';
    message.className = `message message-maj ${classe}`;
  }

  // « Version du 7 novembre 2026 », dans la langue de la borne
  function afficherVersion() {
    const date = new Date(VERSION_INSTALLEE).toLocaleDateString(langue(), {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    zoneVersion.textContent = texte('majVersion', { date });
  }

  async function mettreAJour() {
    bouton.disabled = true;
    afficherMessage('majVerification', 'attente');
    try {
      if (navigator.onLine === false) throw new PasDeConnexion();
      const publiee = await versionPubliee();

      // Dates ISO (2026-11-07T14:32:05.000Z) : l'ordre alphabétique est l'ordre chronologique
      if (!publiee || publiee <= VERSION_INSTALLEE) {
        afficherMessage('majAJour');
        bouton.disabled = false;
        return;
      }

      afficherMessage('majTelechargement', 'attente');
      const enregistrement = await navigator.serviceWorker?.getRegistration();
      if (enregistrement) {
        try {
          await enregistrement.update();
        } catch {
          throw new PasDeConnexion();
        }
        const nouvelle = enregistrement.installing ?? enregistrement.waiting;
        // Sans nouvelle version en cours, elle a déjà été téléchargée en arrière-plan
        // (vérification automatique toutes les heures) : il suffit de recharger.
        if (nouvelle) await attendreInstallation(nouvelle);
      }

      afficherMessage('majEffectuee');
      setTimeout(() => window.location.reload(), 1500); // laisse le temps de lire le message
    } catch {
      afficherMessage('majHorsLigne', 'erreur-maj');
      bouton.disabled = false;
    }
  }

  bouton.addEventListener('click', mettreAJour);

  // À chaque ouverture des réglages : date à jour, ancien message effacé
  function preparer() {
    afficherVersion();
    afficherMessage('');
    bouton.disabled = false;
  }

  return { preparer, afficherVersion };
}
