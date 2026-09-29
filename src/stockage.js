// Enregistrement des réglages de la borne SUR L'APPAREIL (comme en v1).
//
// - Les réglages simples (durées, langue, code…) vont dans le localStorage du navigateur.
// - Les images d'un PDF chargé sont trop lourdes pour le localStorage : elles vont dans
//   IndexedDB, une petite base de données intégrée au navigateur.
// - Le « lien de configuration » contient les réglages simples et le bandeau (logo compris),
//   mais pas les images du PDF, pour préparer une borne à l'avance : il suffit d'ouvrir ce lien
//   sur la borne.

const CLE_REGLAGES = 'grn-map-reglages';

// Code d'accès par défaut, qui reste toujours valable comme code de secours de GRN Europe.
// ATTENTION : ce code est lisible par quiconque regarde le code de l'application.
// Il empêche un visiteur de modifier la borne, ce n'est pas une vraie sécurité.
export const CODE_DE_SECOURS = 'GRNERD';

// Valeurs par défaut (reprises de la v1, sauf le retour depuis 5fish : 3 min au lieu de 4)
export const REGLAGES_PAR_DEFAUT = {
  langue: 'fr',
  dureeImage: 20,          // secondes par image du diaporama
  inactivite: 240,         // secondes sans toucher avant le retour au diaporama
  retour5fish: 180,        // secondes avant le retour à la carte depuis 5fish (0 = jamais)
  empreinteCode: null,     // empreinte du code de l'église (null = seulement le code de secours)
  // Bandeau d'accueil de l'église (désactivé par défaut = écran de la v1)
  bandeauActif: false,
  bandeauLogo: null,       // logo réduit en PNG (« data URL »), ou null
  bandeauPhrases: {},      // phrase d'accueil par langue : { fr: '…', en: '…' }
};

// Lit les réglages enregistrés (ou les valeurs par défaut)
export function lireReglages() {
  try {
    const enregistres = JSON.parse(localStorage.getItem(CLE_REGLAGES)) ?? {};
    return { ...REGLAGES_PAR_DEFAUT, ...enregistres };
  } catch {
    return { ...REGLAGES_PAR_DEFAUT };
  }
}

export function enregistrerReglages(reglages) {
  try {
    localStorage.setItem(CLE_REGLAGES, JSON.stringify(reglages));
  } catch {
    // Stockage impossible (navigation privée…) : les réglages restent valables jusqu'au rechargement
  }
}

// --- Code d'accès --------------------------------------------------------

// Transforme un code en « empreinte » pour ne pas l'enregistrer en clair.
// Majuscules/minuscules et espaces autour sont ignorés (plus simple sur un clavier tactile).
export function empreinteDuCode(code) {
  const texte = code.trim().toUpperCase();
  let empreinte = 5381;
  for (const caractere of texte) {
    empreinte = ((empreinte * 33) ^ caractere.charCodeAt(0)) >>> 0;
  }
  return empreinte.toString(36);
}

// Vérifie un code : celui de l'église s'il existe, et toujours le code de secours
export function codeValide(code, reglages) {
  const empreinte = empreinteDuCode(code);
  return empreinte === empreinteDuCode(CODE_DE_SECOURS) || empreinte === reglages.empreinteCode;
}

// --- Lien de configuration -------------------------------------------------

// Fabrique le lien : adresse de la borne en mode présentation + réglages encodés
export function lienDeConfiguration(reglages) {
  const json = JSON.stringify(reglages);
  const encode = btoa(String.fromCharCode(...new TextEncoder().encode(json)));
  const adresse = new URL(window.location.href);
  adresse.search = '';
  adresse.hash = '';
  adresse.searchParams.set('presentation', '1');
  adresse.searchParams.set('config', encode);
  return adresse.toString();
}

// Si l'adresse contient ?config=…, enregistre ces réglages puis retire ce paramètre
// de la barre d'adresse. Renvoie true si une configuration a été appliquée.
export function appliquerConfigurationDeLAdresse() {
  const adresse = new URL(window.location.href);
  const encode = adresse.searchParams.get('config');
  if (!encode) return false;
  try {
    const octets = Uint8Array.from(atob(encode), (c) => c.charCodeAt(0));
    const recus = JSON.parse(new TextDecoder().decode(octets));
    // On ne garde que les réglages connus
    const reglages = lireReglages();
    Object.keys(REGLAGES_PAR_DEFAUT).forEach((cle) => {
      if (cle in recus) reglages[cle] = recus[cle];
    });
    enregistrerReglages(reglages);
  } catch {
    return false; // lien abîmé : on l'ignore
  }
  adresse.searchParams.delete('config');
  history.replaceState(null, '', adresse);
  return true;
}

// --- Images du diaporama (IndexedDB) --------------------------------------

// Ouvre (ou crée) la petite base de données de la borne
function ouvrirBase() {
  return new Promise((resoudre, rejeter) => {
    const demande = indexedDB.open('grn-map', 1);
    demande.onupgradeneeded = () => demande.result.createObjectStore('diaporama');
    demande.onsuccess = () => resoudre(demande.result);
    demande.onerror = () => rejeter(demande.error);
  });
}

// Exécute une opération sur la table « diaporama »
async function operation(mode, action) {
  const base = await ouvrirBase();
  return new Promise((resoudre, rejeter) => {
    const table = base.transaction('diaporama', mode).objectStore('diaporama');
    const demande = action(table);
    demande.onsuccess = () => resoudre(demande.result);
    demande.onerror = () => rejeter(demande.error);
  });
}

// Enregistre le diaporama chargé depuis un PDF : { nom, date, images: [Blob, …] }
export function enregistrerDiaporamaPdf(diaporama) {
  return operation('readwrite', (table) => table.put(diaporama, 'pdf'));
}

// Lit le diaporama PDF enregistré, ou null s'il n'y en a pas
export async function lireDiaporamaPdf() {
  try {
    return (await operation('readonly', (table) => table.get('pdf'))) ?? null;
  } catch {
    return null;
  }
}

// Supprime le diaporama PDF : la borne revient au diaporama d'origine
export function effacerDiaporamaPdf() {
  return operation('readwrite', (table) => table.delete('pdf'));
}
