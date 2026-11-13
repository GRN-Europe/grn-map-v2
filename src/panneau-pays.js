// Panneau d'un pays (à droite de l'écran, comme en v1).
// Il affiche le nom du pays et ses langues, chacune avec un petit QR code.
// En bas, la case « Afficher aussi les langues diaspora » (décochée par défaut)
// ajoute les langues parlées par les communautés venues d'ailleurs.
//
// Rapidité sur une tablette modeste (la Chine a 341 langues, l'Inde plus de 800 avec la diaspora) :
// 1. les premières langues s'affichent tout de suite, avec seulement leur nom ;
// 2. les suivantes sont ajoutées par petits lots, en laissant l'écran respirer entre deux lots ;
// 3. le QR code d'une langue n'est calculé que lorsqu'il arrive à l'écran (ou juste avant).
// La place du QR code est réservée dès le départ (64 × 64 px) : rien ne bouge quand il apparaît.

import { texte, langue, quandLaLangueChange } from './traductions.js';
import { nomDuPays, lienFivefish } from './pays.js';
import { qrCodeSvgImmediat } from './qr.js';

const PREMIER_LOT = 30;   // langues affichées immédiatement (plus qu'un écran de tablette)
const LOT_SUIVANT = 80;   // langues ajoutées ensuite à chaque pause
const BUDGET_QR_MS = 8;   // temps de calcul des QR codes avant de rendre la main à l'écran

// Rend la main au navigateur (affichage, toucher) avant de continuer
function pause() {
  if (globalThis.scheduler?.yield) return globalThis.scheduler.yield();
  return new Promise((suite) => setTimeout(suite, 0));
}

export function creerPanneauPays({ donnees, quandLangueChoisie, quandFerme }) {
  const panneau = document.getElementById('panneau-pays');
  const liste = document.getElementById('pays-langues');
  const caseDiaspora = document.getElementById('afficher-diaspora');
  const zoneCaseDiaspora = document.getElementById('case-diaspora');

  let paysOuvert = null;
  let nomPays = '';
  let numeroRemplissage = 0; // identifie le dernier remplissage demandé (voir remplir)

  // --- QR codes calculés quand ils deviennent visibles -----------------------

  const qrEnAttente = []; // emplacements de QR code arrivés à l'écran, pas encore dessinés
  let calculEnCours = false;

  // Le panneau défile : on surveille les emplacements qui entrent dans sa partie visible
  // (avec une marge de 300 px pour que le QR code soit prêt avant d'apparaître)
  const observateur = new IntersectionObserver((entrees) => {
    entrees.forEach((entree) => {
      if (!entree.isIntersecting) return;
      observateur.unobserve(entree.target);
      qrEnAttente.push(entree.target);
    });
    calculerLesQr();
  }, { root: panneau, rootMargin: '300px 0px' });

  async function calculerLesQr() {
    if (calculEnCours) return;
    calculEnCours = true;
    let debut = performance.now();
    while (qrEnAttente.length > 0) {
      const emplacement = qrEnAttente.shift();
      // Emplacement retiré entre-temps (autre pays, case diaspora…) : on l'ignore
      if (!emplacement.isConnected) continue;
      emplacement.innerHTML = qrCodeSvgImmediat(emplacement.dataset.lien);
      if (performance.now() - debut > BUDGET_QR_MS) {
        await pause();
        debut = performance.now();
      }
    }
    calculEnCours = false;
  }

  // --- Ouverture et fermeture ------------------------------------------------

  // Ouvre le panneau pour un pays (code à 2 lettres, par ex. "FR")
  function ouvrir(code) {
    const dejaOuvert = !panneau.hidden;
    paysOuvert = code;
    caseDiaspora.checked = false; // chaque nouveau pays repart sans la diaspora
    remplir();
    panneau.hidden = false;
    // Remonter en haut de la liste n'est utile que si le panneau était déjà ouvert (un panneau
    // caché repart toujours du haut). L'éviter sinon : cela obligeait la tablette à recalculer
    // toute la page au moment du toucher.
    if (dejaOuvert) panneau.scrollTop = 0;
  }

  function fermer() {
    paysOuvert = null;
    numeroRemplissage++; // arrête un remplissage en cours
    observateur.disconnect();
    qrEnAttente.length = 0;
    panneau.hidden = true;
  }

  // Nom d'une langue dans la langue de la borne, sinon en anglais
  function nomDeLangue(codeLangue) {
    const noms = donnees.langues[codeLangue].nom;
    return noms[langue()] ?? noms.en;
  }

  // Lien de la langue dans CE pays (par ex. le français en France)
  function lien(codeLangue) {
    return lienFivefish(donnees.langues[codeLangue].lien, paysOuvert);
  }

  // Une ligne de la liste : le nom de la langue et l'emplacement (vide) de son QR code
  function creerLigne({ code, diaspora }) {
    const element = document.createElement('li');
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'carte-langue';
    bouton.dataset.langue = code;
    const nom = document.createElement('span');
    nom.className = 'nom-langue';
    nom.textContent = nomDeLangue(code);
    if (diaspora) {
      const mention = document.createElement('small');
      mention.textContent = texte('diaspora');
      nom.appendChild(mention);
    }
    const qr = document.createElement('span');
    qr.className = 'qr-petit';
    qr.dataset.lien = lien(code);
    bouton.append(nom, qr);
    element.appendChild(bouton);
    observateur.observe(qr);
    return element;
  }

  function ajouterLignes(lignes) {
    const morceau = document.createDocumentFragment();
    lignes.forEach((ligne) => morceau.appendChild(creerLigne(ligne)));
    liste.appendChild(morceau);
  }

  // (Re)construit le contenu du panneau
  async function remplir() {
    if (!paysOuvert) return;
    const numero = ++numeroRemplissage;
    observateur.disconnect();
    qrEnAttente.length = 0;

    const infos = donnees.pays[paysOuvert] ?? { langues: [], diaspora: [] };
    nomPays = nomDuPays(paysOuvert, langue());

    document.getElementById('pays-nom').textContent = nomPays;
    const nombre = infos.langues.length;
    document.getElementById('pays-nombre').textContent =
      nombre === 1 ? texte('uneLangueNative') : texte('languesNatives', { n: nombre });

    // La case diaspora n'apparaît que si le pays a des langues diaspora
    zoneCaseDiaspora.hidden = infos.diaspora.length === 0;

    // Langues du pays, puis (si la case est cochée) langues diaspora
    const lignes = infos.langues.map((code) => ({ code, diaspora: false }));
    if (caseDiaspora.checked) {
      infos.diaspora.forEach((code) => lignes.push({ code, diaspora: true }));
    }

    if (lignes.length === 0) {
      liste.innerHTML = `<li class="vide">${texte('aucuneLangue')}</li>`;
      return;
    }

    // 1. Premier lot tout de suite : le panneau s'affiche déjà rempli
    liste.replaceChildren();
    ajouterLignes(lignes.slice(0, PREMIER_LOT));

    // 2. La suite par lots, en rendant la main entre deux lots ;
    //    si le panneau a changé entre-temps (autre pays, case cochée…), on s'arrête
    for (let i = PREMIER_LOT; i < lignes.length; i += LOT_SUIVANT) {
      await pause();
      if (numero !== numeroRemplissage) return;
      ajouterLignes(lignes.slice(i, i + LOT_SUIVANT));
    }
  }

  // Un seul écouteur pour toute la liste : retrouve la langue touchée
  liste.addEventListener('click', (evenement) => {
    const bouton = evenement.target.closest('.carte-langue');
    if (!bouton || !paysOuvert) return;
    const code = bouton.dataset.langue;
    quandLangueChoisie({ nomLangue: nomDeLangue(code), nomPays, lien: lien(code) });
  });

  caseDiaspora.addEventListener('change', remplir);
  document.getElementById('panneau-pays-fermer').addEventListener('click', () => {
    fermer();
    quandFerme();
  });
  quandLaLangueChange(remplir);

  return { ouvrir, fermer };
}
