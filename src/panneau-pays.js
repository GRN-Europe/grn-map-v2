// Panneau d'un pays (à droite de l'écran, comme en v1).
// Il affiche le nom du pays et ses langues, chacune avec un petit QR code.
// En bas, la case « Afficher aussi les langues diaspora » (décochée par défaut)
// ajoute les langues parlées par les communautés venues d'ailleurs.

import { texte, langue, quandLaLangueChange } from './traductions.js';
import { nomDuPays, lienFivefish } from './pays.js';
import { qrCodeSvg } from './qr.js';

export function creerPanneauPays({ donnees, quandLangueChoisie, quandFerme }) {
  const panneau = document.getElementById('panneau-pays');
  const liste = document.getElementById('pays-langues');
  const caseDiaspora = document.getElementById('afficher-diaspora');
  const zoneCaseDiaspora = document.getElementById('case-diaspora');

  let paysOuvert = null;
  let numeroRemplissage = 0; // identifie le dernier remplissage demandé (voir remplir)

  // Ouvre le panneau pour un pays (code à 2 lettres, par ex. "FR")
  function ouvrir(code) {
    paysOuvert = code;
    caseDiaspora.checked = false; // chaque nouveau pays repart sans la diaspora
    remplir();
    panneau.hidden = false;
    liste.scrollTop = 0;
    panneau.scrollTop = 0;
  }

  function fermer() {
    paysOuvert = null;
    panneau.hidden = true;
  }

  // Nom d'une langue dans la langue de la borne, sinon en anglais
  function nomDeLangue(codeLangue) {
    const noms = donnees.langues[codeLangue].nom;
    return noms[langue()] ?? noms.en;
  }

  // (Re)construit le contenu du panneau
  async function remplir() {
    if (!paysOuvert) return;
    const infos = donnees.pays[paysOuvert] ?? { langues: [], diaspora: [] };
    const nomPays = nomDuPays(paysOuvert, langue());

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

    const numero = ++numeroRemplissage;
    if (lignes.length === 0) {
      liste.innerHTML = `<li class="vide">${texte('aucuneLangue')}</li>`;
      return;
    }

    // Les QR codes se calculent en parallèle ; si le panneau a changé entre-temps
    // (autre pays, case cochée…), on abandonne ce remplissage devenu inutile.
    // Lien de la langue dans CE pays (par ex. le français en France)
    const lien = (code) => lienFivefish(donnees.langues[code].lien, paysOuvert);
    const qrCodes = await Promise.all(lignes.map(({ code }) => qrCodeSvg(lien(code))));
    if (numero !== numeroRemplissage) return;

    const elements = lignes.map(({ code, diaspora }, i) => {
      const element = document.createElement('li');
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'carte-langue';
      bouton.innerHTML = `
        <span class="nom-langue">
          ${nomDeLangue(code)}
          ${diaspora ? `<small>${texte('diaspora')}</small>` : ''}
        </span>
        <span class="qr-petit">${qrCodes[i]}</span>`;
      bouton.addEventListener('click', () => {
        quandLangueChoisie({ nomLangue: nomDeLangue(code), nomPays, lien: lien(code) });
      });
      element.appendChild(bouton);
      return element;
    });
    liste.replaceChildren(...elements);
  }

  caseDiaspora.addEventListener('change', remplir);
  document.getElementById('panneau-pays-fermer').addEventListener('click', () => {
    fermer();
    quandFerme();
  });
  quandLaLangueChange(remplir);

  return { ouvrir, fermer };
}
