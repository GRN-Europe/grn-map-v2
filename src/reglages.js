// Écran « Réglages de la borne » (roue ⚙ en bas à droite), comme en v1 :
// 1. d'abord le code d'accès ;
// 2. puis les réglages : langue, durées, images du diaporama, nouveau code,
//    et les boutons Enregistrer / Copier le lien de configuration / Valeurs par défaut / Fermer.
// Les réglages sont enregistrés sur l'appareil (voir stockage.js).

import { texte, langue, changerLangue, languesDisponibles, quandLaLangueChange } from './traductions.js';
import {
  lireReglages, enregistrerReglages, codeValide, empreinteDuCode,
  lienDeConfiguration, REGLAGES_PAR_DEFAUT,
} from './stockage.js';
import {
  imagesDuDiaporama, nombreImagesDOrigine, chargerPdf, revenirAuDiaporamaDOrigine,
} from './diaporama.js';
import { preparerLogo } from './bandeau.js';

// Limites des champs (en secondes)
const LIMITES = {
  dureeImage: { min: 3, max: 600 },
  inactivite: { min: 30, max: 3600 },
  retour5fish: { min: 0, max: 3600 },
};

export function creerEcranReglages({ donnees, quandEnregistre, quandDiaporamaChange }) {
  const fenetre = document.getElementById('fenetre-reglages');
  const formulaireCode = document.getElementById('reglages-code');
  const champCode = document.getElementById('champ-code');
  const erreurCode = document.getElementById('erreur-code');
  const formulaire = document.getElementById('reglages-formulaire');
  const listeLangues = document.getElementById('liste-langues');
  const message = document.getElementById('reglages-message');
  const champFichierPdf = document.getElementById('fichier-pdf');

  // Une ligne par fichier du dossier src/langues/
  languesDisponibles().forEach(({ code, nom }) => listeLangues.add(new Option(nom, code)));

  // Bandeau : une case « Phrase d'accueil » par langue de la borne
  const zonePhrases = document.getElementById('bandeau-phrases');
  languesDisponibles().forEach(({ code, nom }) => {
    const champ = document.createElement('label');
    champ.className = 'champ';
    champ.innerHTML = `<span data-texte-phrase="${code}"></span>
      <input name="phrase-${code}" type="text" maxlength="160">`;
    champ.querySelector('span').dataset.nomLangue = nom;
    zonePhrases.appendChild(champ);
  });

  // Logo choisi dans le formulaire (gardé seulement avec « Enregistrer »)
  let logoEnCours = null;

  // --- Ouverture et code d'accès --------------------------------------------

  function ouvrir() {
    formulaireCode.hidden = false;
    formulaire.hidden = true;
    erreurCode.hidden = true;
    champCode.value = '';
    fenetre.hidden = false;
    champCode.focus();
  }

  formulaireCode.addEventListener('submit', (evenement) => {
    evenement.preventDefault(); // pas de rechargement de la page
    if (codeValide(champCode.value, lireReglages())) {
      formulaireCode.hidden = true;
      remplirFormulaire(lireReglages());
      formulaire.hidden = false;
    } else {
      erreurCode.hidden = false;
      champCode.select();
    }
  });

  // Ferme sans enregistrer : on remet la langue enregistrée si on l'avait changée pour essayer
  function fermer() {
    fenetre.hidden = true;
    const langueEnregistree = lireReglages().langue;
    if (langue() !== langueEnregistree) changerLangue(langueEnregistree);
  }

  document.getElementById('reglages-code-fermer').addEventListener('click', fermer);
  document.getElementById('reglages-fermer').addEventListener('click', fermer);

  // --- Formulaire -----------------------------------------------------------

  function remplirFormulaire(reglages) {
    listeLangues.value = reglages.langue;
    Object.keys(LIMITES).forEach((cle) => {
      formulaire.elements[cle].value = reglages[cle];
    });
    formulaire.elements.nouveauCode.value = '';
    // Bandeau d'accueil
    formulaire.elements.bandeauActif.checked = reglages.bandeauActif;
    logoEnCours = reglages.bandeauLogo;
    afficherApercuLogo();
    languesDisponibles().forEach(({ code }) => {
      formulaire.elements[`phrase-${code}`].value = reglages.bandeauPhrases[code] ?? '';
    });
    afficherEtiquettesPhrases();
    message.textContent = '';
    afficherEtatDiaporama();
    afficherDateDonnees();
  }

  // Lit les champs et renvoie les réglages correspondants (valeurs ramenées dans les limites)
  function reglagesDuFormulaire() {
    const reglages = { ...lireReglages(), langue: listeLangues.value };
    Object.entries(LIMITES).forEach(([cle, { min, max }]) => {
      const valeur = Math.round(Number(formulaire.elements[cle].value));
      reglages[cle] = Number.isFinite(valeur) ? Math.min(max, Math.max(min, valeur)) : REGLAGES_PAR_DEFAUT[cle];
    });
    const nouveauCode = formulaire.elements.nouveauCode.value.trim();
    if (nouveauCode) reglages.empreinteCode = empreinteDuCode(nouveauCode);
    // Bandeau d'accueil
    reglages.bandeauActif = formulaire.elements.bandeauActif.checked;
    reglages.bandeauLogo = logoEnCours;
    reglages.bandeauPhrases = {};
    languesDisponibles().forEach(({ code }) => {
      const phrase = formulaire.elements[`phrase-${code}`].value.trim();
      if (phrase) reglages.bandeauPhrases[code] = phrase;
    });
    return reglages;
  }

  // Essayer une langue la montre tout de suite ; elle n'est gardée qu'avec « Enregistrer »
  listeLangues.addEventListener('change', () => changerLangue(listeLangues.value));

  formulaire.addEventListener('submit', (evenement) => {
    evenement.preventDefault();
    const reglages = reglagesDuFormulaire();
    enregistrerReglages(reglages);
    quandEnregistre(reglages);
    fenetre.hidden = true;
  });

  document.getElementById('reglages-defaut').addEventListener('click', () => {
    // « Valeurs par défaut » remet la langue et les durées ;
    // le code de l'église et son bandeau d'accueil sont conservés
    const actuels = reglagesDuFormulaire();
    remplirFormulaire({
      ...REGLAGES_PAR_DEFAUT,
      empreinteCode: actuels.empreinteCode,
      bandeauActif: actuels.bandeauActif,
      bandeauLogo: actuels.bandeauLogo,
      bandeauPhrases: actuels.bandeauPhrases,
    });
    changerLangue(REGLAGES_PAR_DEFAUT.langue);
    message.textContent = texte('defautsRemis');
  });

  document.getElementById('reglages-copier-lien').addEventListener('click', async () => {
    const lien = lienDeConfiguration(reglagesDuFormulaire());
    try {
      await navigator.clipboard.writeText(lien);
      message.textContent = texte('lienCopie');
    } catch {
      // Copie impossible (navigateur ancien, adresse non sécurisée) : on affiche le lien
      message.textContent = `${texte('lienACopier')} ${lien}`;
    }
  });

  // --- Images du diaporama --------------------------------------------------

  async function afficherEtatDiaporama() {
    const { pdf } = await imagesDuDiaporama();
    document.getElementById('etat-diaporama').textContent = pdf
      ? texte('diaporamaPdf', {
        nom: pdf.nom,
        n: pdf.nombre,
        date: new Date(pdf.date).toLocaleDateString(langue()),
      })
      : texte('diaporamaOrigine', { n: nombreImagesDOrigine() });
  }

  document.getElementById('bouton-charger-pdf').addEventListener('click', () => champFichierPdf.click());

  champFichierPdf.addEventListener('change', async () => {
    const fichier = champFichierPdf.files[0];
    champFichierPdf.value = ''; // permet de recharger le même fichier plus tard
    if (!fichier) return;
    message.textContent = texte('pdfEnCours');
    try {
      await chargerPdf(fichier);
      message.textContent = '';
      await quandDiaporamaChange();
    } catch {
      message.textContent = texte('pdfErreur');
    }
    afficherEtatDiaporama();
  });

  document.getElementById('bouton-diaporama-origine').addEventListener('click', async () => {
    await revenirAuDiaporamaDOrigine();
    await quandDiaporamaChange();
    afficherEtatDiaporama();
  });

  // --- Bandeau d'accueil : logo et étiquettes des phrases ---------------------

  function afficherApercuLogo() {
    const apercu = document.getElementById('apercu-logo');
    apercu.hidden = !logoEnCours;
    if (logoEnCours) apercu.src = logoEnCours;
    document.getElementById('sans-logo').hidden = Boolean(logoEnCours);
    document.getElementById('bouton-retirer-logo').hidden = !logoEnCours;
  }

  // « Phrase d'accueil (Français) », « Phrase d'accueil (English) »…
  function afficherEtiquettesPhrases() {
    zonePhrases.querySelectorAll('[data-texte-phrase]').forEach((etiquette) => {
      etiquette.textContent = texte('bandeauPhrase', { langue: etiquette.dataset.nomLangue });
    });
  }

  const champFichierLogo = document.getElementById('fichier-logo');
  document.getElementById('bouton-charger-logo').addEventListener('click', () => champFichierLogo.click());

  champFichierLogo.addEventListener('change', async () => {
    const fichier = champFichierLogo.files[0];
    champFichierLogo.value = '';
    if (!fichier) return;
    try {
      logoEnCours = await preparerLogo(fichier);
      message.textContent = '';
    } catch {
      message.textContent = texte('logoErreur');
    }
    afficherApercuLogo();
  });

  document.getElementById('bouton-retirer-logo').addEventListener('click', () => {
    logoEnCours = null;
    afficherApercuLogo();
  });

  // --- Date des données 5fish (cahier des charges) --------------------------

  function afficherDateDonnees() {
    const date = new Date(donnees.miseAJour).toLocaleDateString(langue());
    const exemple = donnees.source === 'exemple' ? ` ${texte('donneesExemple')}` : '';
    document.getElementById('date-donnees').textContent = texte('donnees5fish', { date }) + exemple;
  }

  // Retraduit les textes calculés quand on essaie une autre langue
  quandLaLangueChange(() => {
    if (formulaire.hidden) return;
    afficherEtatDiaporama();
    afficherDateDonnees();
    afficherEtiquettesPhrases();
  });

  return { ouvrir, fermer };
}
