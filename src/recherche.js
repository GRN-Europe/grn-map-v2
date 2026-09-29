// Recherche (loupe dans la barre des onglets, comme en v1).
// Le visiteur tape le nom d'une langue ou d'un pays :
// - toucher un pays ouvre son panneau de langues ;
// - toucher une langue ouvre directement son QR code.
// La recherche ignore les majuscules et les accents (« eglise » trouve « Église »),
// et cherche les noms de pays dans la langue de la borne ET en anglais.

import { texte, langue } from './traductions.js';
import { nomDuPays, lienFivefish } from './pays.js';
import { CODES_PAYS } from './carte.js';

// Nombre maximum de résultats affichés
const RESULTATS_MAX = 30;

// Enlève accents et majuscules : « Église » → « eglise »
function simplifier(mot) {
  return mot.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function creerRecherche({ donnees, quandPaysChoisi, quandLangueChoisie }) {
  const fenetre = document.getElementById('fenetre-recherche');
  const champ = document.getElementById('champ-recherche');
  const liste = document.getElementById('resultats-recherche');

  // Pour chaque langue, les pays où elle est parlée : d'abord ceux où elle est native,
  // puis ceux de la diaspora (le premier pays sert pour le QR code)
  const paysNatifs = {};
  const paysDiaspora = {};
  Object.entries(donnees.pays).forEach(([codePays, infos]) => {
    infos.langues.forEach((codeLangue) => (paysNatifs[codeLangue] ??= []).push(codePays));
    infos.diaspora.forEach((codeLangue) => (paysDiaspora[codeLangue] ??= []).push(codePays));
  });
  const paysDeLaLangue = {};
  Object.keys(donnees.langues).forEach((codeLangue) => {
    const liste = [...(paysNatifs[codeLangue] ?? []), ...(paysDiaspora[codeLangue] ?? [])];
    if (liste.length > 0) paysDeLaLangue[codeLangue] = liste;
  });

  function nomDeLangue(codeLangue) {
    const noms = donnees.langues[codeLangue].nom;
    return noms[langue()] ?? noms.en;
  }

  function ouvrir() {
    champ.value = '';
    afficherResultats();
    fenetre.hidden = false;
    champ.focus(); // fait apparaître le clavier sur une tablette ou une borne tactile
  }

  function fermer() {
    fenetre.hidden = true;
    champ.blur();
  }

  // Cherche les pays et les langues qui contiennent le texte tapé
  function chercher(recherche) {
    const cherche = simplifier(recherche);
    if (cherche.length < 2) return [];

    // Score : 0 si le nom commence par le texte tapé (affiché en premier), 1 sinon
    const score = (nom) => (simplifier(nom).startsWith(cherche) ? 0 : 1);
    const correspond = (nom) => simplifier(nom).includes(cherche);

    // Pays de la carte + territoires présents dans les données mais sans forme sur la carte
    // (Réunion, Guadeloupe, Martinique, Guyane, Mayotte… dessinés avec la France)
    const tousLesPays = [...new Set([...CODES_PAYS, ...Object.keys(donnees.pays)])];
    const pays = tousLesPays
      .map((code) => ({ code, nom: nomDuPays(code, langue()), nomAnglais: nomDuPays(code, 'en') }))
      .filter(({ nom, nomAnglais }) => correspond(nom) || correspond(nomAnglais))
      .map((p) => ({ type: 'pays', ...p, score: Math.min(score(p.nom), score(p.nomAnglais)) }));

    const langues = Object.keys(donnees.langues)
      .filter((code) => paysDeLaLangue[code]) // seulement les langues rattachées à un pays
      .map((code) => ({ code, nom: nomDeLangue(code), nomAnglais: donnees.langues[code].nom.en ?? '' }))
      .filter(({ nom, nomAnglais }) => correspond(nom) || correspond(nomAnglais))
      .map((l) => ({ type: 'langue', ...l, score: Math.min(score(l.nom), score(l.nomAnglais)) }));

    return [...pays, ...langues]
      .sort((a, b) => a.score - b.score || a.nom.localeCompare(b.nom))
      .slice(0, RESULTATS_MAX);
  }

  function afficherResultats() {
    const resultats = chercher(champ.value);
    liste.innerHTML = '';

    if (champ.value.trim().length >= 2 && resultats.length === 0) {
      liste.innerHTML = `<li class="vide">${texte('aucunResultat')}</li>`;
      return;
    }

    resultats.forEach((resultat) => {
      const element = document.createElement('li');
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'resultat';

      if (resultat.type === 'pays') {
        bouton.innerHTML = `
          <span class="fi fi-${resultat.code.toLowerCase()} resultat-icone"></span>
          <span class="resultat-texte">
            <strong></strong>
            <small>${texte('resultatPays')}</small>
          </span>`;
        bouton.addEventListener('click', () => {
          fermer();
          quandPaysChoisi(resultat.code);
        });
      } else {
        // Une langue : on indique les pays où elle est parlée
        const pays = paysDeLaLangue[resultat.code];
        const nomsPays = pays.slice(0, 3).map((code) => nomDuPays(code, langue())).join(', ')
          + (pays.length > 3 ? '…' : '');
        bouton.innerHTML = `
          <span class="resultat-icone icone-langue" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 5h16v11H9l-5 4z" stroke-linejoin="round"/>
            </svg>
          </span>
          <span class="resultat-texte">
            <strong></strong>
            <small></small>
          </span>`;
        bouton.querySelector('small').textContent = `${texte('resultatLangue')} · ${nomsPays}`;
        bouton.addEventListener('click', () => {
          fermer();
          quandLangueChoisie({
            nomLangue: resultat.nom,
            nomPays: nomDuPays(pays[0], langue()),
            lien: lienFivefish(donnees.langues[resultat.code].lien, pays[0]),
          });
        });
      }

      // Nom inséré comme texte (et non comme HTML) par précaution
      bouton.querySelector('strong').textContent = resultat.nom;
      element.appendChild(bouton);
      liste.appendChild(element);
    });
  }

  champ.addEventListener('input', afficherResultats);
  document.getElementById('recherche-fermer').addEventListener('click', fermer);
  // Toucher à côté de la fenêtre la ferme aussi
  fenetre.addEventListener('click', (evenement) => {
    if (evenement.target === fenetre) fermer();
  });

  return { ouvrir, fermer };
}
