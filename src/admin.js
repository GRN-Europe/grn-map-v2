// Page d'administration des codes d'accès (admin.html), réservée à GRN Europe.
// Elle parle au serveur par l'adresse /api/admin (voir api/admin.js).
// Page interne en français et en anglais (choix FR | EN en haut à droite, mémorisé).

import './admin.css';

// --- Textes en français et en anglais -------------------------------------------------

const TEXTES = {
  fr: {
    titre: 'GRN map — Codes d’accès',
    motDePasse: 'Mot de passe administrateur',
    entrer: 'Entrer',
    motDePasseIncorrect: 'Mot de passe incorrect.',
    codesCrees: 'codes créés',
    appareilsActives: 'appareils activés',
    utilises30Jours: 'utilisés ces 30 derniers jours',
    nouveauCode: 'Nouveau code',
    eglise: 'Église ou personne',
    ville: 'Ville',
    creer: 'Créer le code',
    codeCree: 'Code créé pour {nom} : {code} — à transmettre à l’église.',
    tousLesCodes: 'Tous les codes',
    colCode: 'Code',
    colEtat: 'État',
    colActive: 'Activé le',
    colVu: 'Dernière utilisation',
    etatDesactive: 'Désactivé',
    etatActive: 'Activé',
    etatLibre: 'Pas encore utilisé',
    liberer: 'Libérer',
    desactiver: 'Désactiver',
    reactiver: 'Réactiver',
    confirmerLiberer: 'Libérer ce code ? L’appareil actuel perdra l’accès et le code pourra servir sur un autre appareil.',
    confirmerDesactiver: 'Désactiver ce code ? L’appareil perdra l’accès à sa prochaine connexion.',
  },
  en: {
    titre: 'GRN map — Access codes',
    motDePasse: 'Administrator password',
    entrer: 'Enter',
    motDePasseIncorrect: 'Incorrect password.',
    codesCrees: 'codes created',
    appareilsActives: 'devices activated',
    utilises30Jours: 'used in the last 30 days',
    nouveauCode: 'New code',
    eglise: 'Church or person',
    ville: 'City',
    creer: 'Create code',
    codeCree: 'Code created for {nom}: {code} — to be sent to the church.',
    tousLesCodes: 'All codes',
    colCode: 'Code',
    colEtat: 'Status',
    colActive: 'Activated on',
    colVu: 'Last used',
    etatDesactive: 'Deactivated',
    etatActive: 'Activated',
    etatLibre: 'Not used yet',
    liberer: 'Release',
    desactiver: 'Deactivate',
    reactiver: 'Reactivate',
    confirmerLiberer: 'Release this code? The current device will lose access and the code can be used on another device.',
    confirmerDesactiver: 'Deactivate this code? The device will lose access at its next connection.',
  },
};

// Langue : celle choisie la dernière fois, sinon celle du navigateur
let langue = (() => {
  try {
    const memorisee = localStorage.getItem('grn-map-admin-langue');
    if (memorisee) return memorisee;
  } catch { /* stockage indisponible */ }
  return navigator.language.startsWith('fr') ? 'fr' : 'en';
})();

// Texte dans la langue choisie ; {nom}, {code}… sont remplacés par les valeurs données
const t = (cle, valeurs = {}) => TEXTES[langue][cle].replace(/\{(\w+)\}/g, (tout, n) => valeurs[n] ?? tout);

function traduire() {
  document.documentElement.lang = langue;
  document.querySelectorAll('[data-t]').forEach((element) => { element.textContent = t(element.dataset.t); });
  document.querySelectorAll('[data-langue]').forEach((bouton) => {
    bouton.classList.toggle('actif', bouton.dataset.langue === langue);
  });
}

document.querySelectorAll('[data-langue]').forEach((bouton) => {
  bouton.addEventListener('click', () => {
    langue = bouton.dataset.langue;
    try { localStorage.setItem('grn-map-admin-langue', langue); } catch { /* sans importance */ }
    traduire();
    if (!document.getElementById('espace').hidden) afficherListe(); // retraduit le tableau
  });
});

// --- Échanges avec le serveur -------------------------------------------------------------

let motDePasse = '';
let derniersCodes = [];

const $ = (id) => document.getElementById(id);

// Envoie une action au serveur avec le mot de passe
async function demander(action, donnees = {}) {
  const reponse = await fetch('/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ motDePasse, action, ...donnees }),
  });
  const resultat = await reponse.json().catch(() => ({}));
  if (!reponse.ok) throw Object.assign(new Error(resultat.erreur || 'erreur'), { statut: reponse.status });
  return resultat;
}

// Date lisible (« 30/09/2026 » ou « 9/30/2026 ») ou tiret
const date = (iso) => (iso ? new Date(iso).toLocaleDateString(langue === 'fr' ? 'fr-FR' : 'en-GB') : '—');

// --- Connexion --------------------------------------------------------------------------

$('connexion').addEventListener('submit', async (evenement) => {
  evenement.preventDefault();
  motDePasse = $('mot-de-passe').value;
  try {
    await chargerListe();
    $('connexion').hidden = true;
    $('espace').hidden = false;
  } catch {
    $('erreur-connexion').hidden = false;
  }
});

// --- Liste des codes et chiffres clés ---------------------------------------------------------

async function chargerListe() {
  derniersCodes = (await demander('lister')).codes;
  afficherListe();
}

function afficherListe() {
  const codes = derniersCodes;
  const ilYa30Jours = Date.now() - 30 * 24 * 3600 * 1000;

  $('nb-codes').textContent = codes.length;
  $('nb-actives').textContent = codes.filter((c) => c.utilise).length;
  $('nb-recents').textContent = codes.filter((c) => c.vuLe && Date.parse(c.vuLe) > ilYa30Jours).length;

  const corps = $('liste');
  corps.innerHTML = '';
  for (const c of codes) {
    const etat = c.actif !== '1' ? t('etatDesactive') : c.utilise ? t('etatActive') : t('etatLibre');
    const ligne = document.createElement('tr');
    if (c.actif !== '1') ligne.className = 'desactive';
    ligne.innerHTML = `<td class="code"></td><td></td><td></td><td>${etat}</td>
      <td>${date(c.activeLe)}</td><td>${date(c.vuLe)}</td><td class="actions"></td>`;
    // Textes saisis insérés comme texte (et non comme HTML) par précaution
    ligne.children[0].textContent = c.code;
    ligne.children[1].textContent = c.nom;
    ligne.children[2].textContent = c.ville || '';

    const actions = ligne.querySelector('.actions');
    if (c.utilise) ajouterBouton(actions, 'liberer', c.code, 'confirmerLiberer');
    if (c.actif === '1') ajouterBouton(actions, 'desactiver', c.code, 'confirmerDesactiver');
    else ajouterBouton(actions, 'reactiver', c.code);
    corps.appendChild(ligne);
  }
}

function ajouterBouton(conteneur, action, code, cleConfirmation) {
  const bouton = document.createElement('button');
  bouton.type = 'button';
  bouton.textContent = t(action);
  bouton.addEventListener('click', async () => {
    if (cleConfirmation && !window.confirm(t(cleConfirmation))) return;
    await demander(action, { code });
    await chargerListe();
  });
  conteneur.appendChild(bouton);
}

// --- Création d'un code -------------------------------------------------------------------

$('creation').addEventListener('submit', async (evenement) => {
  evenement.preventDefault();
  const nom = $('nom').value;
  const { code } = await demander('creer', { nom, ville: $('ville').value });
  $('nouveau-code').hidden = false;
  $('nouveau-code').textContent = t('codeCree', { nom, code });
  $('nom').value = '';
  $('ville').value = '';
  await chargerListe();
});

traduire();
