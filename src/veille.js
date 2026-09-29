// Écran de veille (comme en v1) : fond bleu nuit en dégradé, deux cartes arrondies
// côte à côte — à gauche une carte du monde miniature, à droite le diaporama —
// et le logo GRN dessous. Un toucher n'importe où ramène à la carte.

import { geoMercator, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import monde from 'world-atlas/countries-50m.json';
import { imagesDuDiaporama } from './diaporama.js';

export function creerVeille({ quandReveil }) {
  const ecran = document.getElementById('ecran-veille');
  // Deux images superposées : on fait apparaître l'une pendant que l'autre disparaît
  const images = [...ecran.querySelectorAll('.diapo')];

  let adresses = [];
  let index = 0;
  let imageVisible = 0;
  let minuterie = null;

  dessinerMiniCarte(document.getElementById('veille-carte'));

  // Recharge la liste des images (au démarrage, et quand on change le diaporama dans les réglages)
  async function chargerImages() {
    // Libère la mémoire des anciennes images de PDF
    adresses.filter((a) => a.startsWith('blob:')).forEach((a) => URL.revokeObjectURL(a));
    const resultat = await imagesDuDiaporama();
    adresses = resultat.adresses;
    index = 0;
  }

  // Affiche l'écran de veille ; chaque image reste « dureeImage » secondes
  function montrer(dureeImage) {
    ecran.hidden = false;
    clearInterval(minuterie);
    index = 0;
    afficherImage();
    if (adresses.length > 1) {
      minuterie = setInterval(() => {
        index = (index + 1) % adresses.length;
        afficherImage();
      }, dureeImage * 1000);
    }
  }

  function cacher() {
    clearInterval(minuterie);
    minuterie = null;
    ecran.hidden = true;
  }

  // Fondu enchaîné : la nouvelle image se charge dans le calque caché, puis on inverse
  function afficherImage() {
    if (adresses.length === 0) return;
    const suivante = 1 - imageVisible;
    images[suivante].onload = () => {
      images[suivante].classList.add('visible');
      images[imageVisible].classList.remove('visible');
      imageVisible = suivante;
    };
    images[suivante].src = adresses[index];
  }

  // Un toucher sur l'écran de veille ramène à la carte (sauf sur le bouton plein écran)
  ecran.addEventListener('click', (evenement) => {
    if (evenement.target.closest('.bouton-discret')) return;
    cacher();
    quandReveil();
  });

  return { chargerImages, montrer, cacher, estVisible: () => !ecran.hidden };
}

// Dessine la carte du monde miniature (orange sur bleu nuit, sans l'Antarctique)
function dessinerMiniCarte(svgElement) {
  const largeur = 1000;
  const hauteur = 620;
  const pays = feature(monde, monde.objects.countries).features
    .filter((entite) => entite.properties.name !== 'Antarctica');
  const collection = { type: 'FeatureCollection', features: pays };
  const chemin = geoPath(geoMercator().fitExtent([[20, 20], [largeur - 20, hauteur - 20]], collection));

  svgElement.setAttribute('viewBox', `0 0 ${largeur} ${hauteur}`);
  svgElement.innerHTML = pays.map((entite) => `<path d="${chemin(entite)}"></path>`).join('');
}
