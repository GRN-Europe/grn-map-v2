// Code d'accès à la carte (un code par église ou par personne, valable sur UN appareil).
//
// - À la première ouverture, l'écran « Code d'accès » cache la carte. Le code (fourni par
//   GRN Europe, page admin.html) est envoyé au serveur avec l'identifiant de l'appareil.
// - Une fois activé, l'appareil garde un « jeton » et la carte fonctionne, même hors ligne.
// - Au démarrage puis une fois par jour, s'il a internet, l'appareil fait un « signe de vie » :
//   GRN voit ainsi quelles églises utilisent la carte. Si GRN a désactivé ou libéré le code,
//   l'écran « Code d'accès » revient.
// LIMITE : ce n'est pas un coffre-fort (le site est public) ; c'est un accès simple et un suivi.

import { texte } from './traductions.js';

const CLE_ACCES = 'grn-map-acces';       // { jeton, nom } une fois l'appareil activé
const CLE_APPAREIL = 'grn-map-appareil'; // identifiant tiré au hasard, propre à cet appareil
const UN_JOUR = 24 * 60 * 60 * 1000;

function lire(cle) {
  try { return JSON.parse(localStorage.getItem(cle)); } catch { return null; }
}

function ecrire(cle, valeur) {
  try {
    if (valeur === null) localStorage.removeItem(cle);
    else localStorage.setItem(cle, JSON.stringify(valeur));
  } catch {
    // stockage impossible (navigation privée) : l'accès ne sera pas mémorisé
  }
}

// Identifiant de cet appareil (créé une seule fois)
function identifiantAppareil() {
  let id = lire(CLE_APPAREIL);
  if (!id) {
    id = crypto.randomUUID();
    ecrire(CLE_APPAREIL, id);
  }
  return id;
}

export function creerActivation() {
  const ecran = document.getElementById('ecran-activation');
  const formulaire = document.getElementById('formulaire-activation');
  const champ = document.getElementById('champ-activation');
  const message = document.getElementById('message-activation');
  const bouton = formulaire.querySelector('button[type="submit"]');

  function montrer() {
    ecran.hidden = false;
    message.textContent = '';
  }

  function cacher() {
    ecran.hidden = true;
  }

  // Signe de vie : si le serveur répond que le code n'est plus valable, on redemande un code.
  // Sans internet (ou serveur injoignable), on ne change rien : la carte reste utilisable.
  async function verifierEnLigne() {
    const acces = lire(CLE_ACCES);
    if (!acces) return;
    try {
      const reponse = await fetch('/api/verifier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jeton: acces.jeton }),
      });
      if (!reponse.ok) return;
      const { valide } = await reponse.json();
      if (valide === false) {
        ecrire(CLE_ACCES, null);
        montrer();
      }
    } catch {
      // hors ligne : on réessaiera plus tard
    }
  }

  formulaire.addEventListener('submit', async (evenement) => {
    evenement.preventDefault();
    bouton.disabled = true;
    message.textContent = texte('activationEnCours');
    try {
      const reponse = await fetch('/api/activer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: champ.value, appareil: identifiantAppareil() }),
      });
      const resultat = await reponse.json().catch(() => ({}));
      if (reponse.ok) {
        ecrire(CLE_ACCES, { jeton: resultat.jeton, nom: resultat.nom });
        champ.value = '';
        cacher();
      } else {
        // Message selon la raison du refus
        const cles = { inconnu: 'activationInconnu', 'deja-utilise': 'activationDejaUtilise', desactive: 'activationDesactive' };
        message.textContent = texte(cles[resultat.erreur] ?? 'activationInconnu');
      }
    } catch {
      message.textContent = texte('activationHorsLigne');
    }
    bouton.disabled = false;
  });

  // Démarrage : carte si l'appareil est déjà activé, sinon écran du code
  if (lire(CLE_ACCES)) cacher();
  else montrer();
  verifierEnLigne();
  setInterval(verifierEnLigne, UN_JOUR);
}
