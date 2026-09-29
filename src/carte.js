// La carte du monde tactile : dessin des pays, zoom, onglets des régions et drapeaux.
//
// Principe :
// - les contours des pays viennent de world-atlas (Natural Earth, domaine public),
//   inclus dans l'application pour fonctionner sans internet ;
// - d3-geo transforme ces contours en dessin SVG (projection Mercator) ;
// - d3-zoom gère le pincement à deux doigts, le double toucher et le glissement ;
// - les drapeaux sont des boutons HTML posés au-dessus de la carte ; ils apparaissent
//   dès le premier zoom et gardent toujours la même taille à l'écran.

import { geoMercator, geoPath, geoArea, geoCentroid } from 'd3-geo';
import { zoom, zoomIdentity } from 'd3-zoom';
import { select } from 'd3-selection';
import 'd3-transition'; // permet les zooms animés (.transition())
import { feature } from 'topojson-client';
import monde from 'world-atlas/countries-50m.json';
import { codeDuPays, nomDuPays } from './pays.js';
import { langue } from './traductions.js';

// Régions des onglets : [[longitude ouest, latitude sud], [longitude est, latitude nord]]
// "monde" vaut null : on revient à la vue complète.
export const REGIONS = {
  monde: null,
  europe: [[-13, 35], [42, 66]],
  afrique: [[-20, -36], [52, 38]],
  asie: [[26, -11], [150, 56]],
  // Amériques : cadrées comme en v1, du nord des États-Unis au sud du Brésil
  // (le Grand Nord canadien et la Patagonie restent accessibles en faisant glisser la carte)
  ameriques: [[-125, -45], [-35, 55]],
  oceanie: [[110, -48], [180, 0]],
};

// Niveau de zoom à partir duquel les drapeaux s'affichent (1 = carte entière).
// Comme en v1, ils apparaissent dès le premier zoom (y compris avec les onglets).
const ZOOM_DRAPEAUX = 1.05;

// Zoom maximum autorisé
const ZOOM_MAX = 40;

// Durée des zooms animés (en millisecondes)
const DUREE_ANIMATION = 750;

// Liste des pays de la carte (sans l'Antarctique, inutile ici)
const PAYS = feature(monde, monde.objects.countries).features
  .filter((entite) => entite.properties.name !== 'Antarctica')
  .map((entite) => ({ entite, code: codeDuPays(entite) }));

// Codes à 2 lettres de tous les pays de la carte (utilisés par la recherche)
export const CODES_PAYS = PAYS.map((p) => p.code).filter(Boolean);

export function creerCarte({ svgElement, coucheDrapeaux, donnees, quandPaysTouche, quandMerTouchee }) {
  const svg = select(svgElement);
  const projection = geoMercator();
  const chemin = geoPath(projection);

  // Groupe qui contient tous les pays : c'est lui qu'on agrandit quand on zoome
  const groupePays = svg.append('g').attr('class', 'pays');

  // Un <path> par pays
  const formes = groupePays.selectAll('path')
    .data(PAYS)
    .join('path')
    .attr('class', (p) => {
      if (!p.code) return 'sans-code'; // territoire sans code : pas touchable
      return donnees.pays[p.code] ? 'avec-langues' : '';
    })
    .on('click', (evenement, p) => {
      if (p.code) quandPaysTouche(p.code);
    });

  // Un bouton-drapeau par pays (la classe "fi fi-xx" vient de la bibliothèque flag-icons)
  const drapeaux = PAYS.filter((p) => p.code).map((p) => {
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'drapeau';
    bouton.innerHTML = `<span class="fi fi-${p.code.toLowerCase()}"></span>`;
    bouton.addEventListener('click', () => quandPaysTouche(p.code));
    coucheDrapeaux.appendChild(bouton);
    // Point d'ancrage du drapeau : centre de la plus grande partie du pays
    // (pour la France, la métropole plutôt que la moyenne avec la Guyane)
    return { ...p, bouton, centre: centreDeLaPlusGrandePartie(p.entite), position: [0, 0] };
  });

  // Gestion du zoom et du déplacement au doigt
  const comportementZoom = zoom()
    .scaleExtent([1, ZOOM_MAX])
    .clickDistance(12) // un toucher qui bouge un peu compte encore comme un toucher
    .on('zoom', (evenement) => {
      groupePays.attr('transform', evenement.transform);
      placerDrapeaux(evenement.transform);
    });
  svg.call(comportementZoom);

  // Toucher la mer (le fond de la carte, hors des pays) : par exemple pour fermer le panneau
  // d'un pays. Après un glissement de la carte, d3-zoom annule ce « clic » : seul un toucher
  // bref compte.
  svg.on('click', (evenement) => {
    if (evenement.target === svgElement) quandMerTouchee();
  });

  let largeur = 0;
  let hauteur = 0;
  let regionActuelle = 'monde';

  // Calcule la taille de la carte pour remplir la zone disponible
  function ajusterTaille() {
    largeur = svgElement.clientWidth;
    hauteur = svgElement.clientHeight;
    svg.attr('viewBox', `0 0 ${largeur} ${hauteur}`);

    const toutLeMonde = { type: 'FeatureCollection', features: PAYS.map((p) => p.entite) };

    // D'abord, on fait tenir le monde entier dans l'écran
    projection.fitSize([largeur, hauteur], toutLeMonde);

    // Sur un écran en paysage, il reste des bandes vides à gauche et à droite :
    // comme en v1, on agrandit alors la carte pour remplir toute la largeur,
    // quitte à couper un peu le haut et le bas (on peut y glisser au doigt).
    const [[gauche], [droite]] = chemin.bounds(toutLeMonde);
    if (droite - gauche < largeur) {
      projection.fitWidth(largeur, toutLeMonde);
      const [[, haut], [, bas]] = chemin.bounds(toutLeMonde);
      const [tx, ty] = projection.translate();
      projection.translate([tx, ty - (bas - haut - hauteur) / 2]); // centre verticalement
    }

    formes.attr('d', (p) => chemin(p.entite));
    drapeaux.forEach((d) => { d.position = projection(d.centre); });

    // Limites du glissement : la carte entière, et au minimum l'écran
    const [[x0, y0], [x1, y1]] = chemin.bounds(toutLeMonde);
    comportementZoom.translateExtent([
      [Math.min(0, x0), Math.min(0, y0)],
      [Math.max(largeur, x1), Math.max(hauteur, y1)],
    ]);
    allerA(regionActuelle, false);
  }

  // Place les drapeaux selon le zoom actuel, et les cache si on n'a pas encore zoomé
  function placerDrapeaux(transformation) {
    const visibles = transformation.k >= ZOOM_DRAPEAUX;
    coucheDrapeaux.classList.toggle('visible', visibles);
    if (!visibles) return;
    drapeaux.forEach((d) => {
      const [x, y] = transformation.apply(d.position);
      d.bouton.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    });
  }

  // Zoome sur une région des onglets ("monde", "europe", etc.)
  function allerA(nomRegion, animer = true) {
    regionActuelle = nomRegion;
    const cadre = REGIONS[nomRegion];
    let transformation = zoomIdentity;

    if (cadre) {
      // Coins de la région en pixels : [ouest, nord] en haut à gauche, [est, sud] en bas à droite
      const [x0, y0] = projection([cadre[0][0], cadre[1][1]]);
      const [x1, y1] = projection([cadre[1][0], cadre[0][1]]);
      const echelle = Math.min(largeur / (x1 - x0), hauteur / (y1 - y0));
      transformation = zoomIdentity
        .translate(largeur / 2, hauteur / 2)
        .scale(echelle)
        .translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
    }

    if (animer) {
      svg.transition().duration(DUREE_ANIMATION).call(comportementZoom.transform, transformation);
    } else {
      svg.call(comportementZoom.transform, transformation);
    }
  }

  // Met un pays en valeur (orange clair, contour blanc), ou aucun si code = null.
  // Tous les morceaux du pays sont éclairés (pour la France : aussi la Guyane, etc.).
  function selectionnerPays(code) {
    formes.classed('selectionne', (p) => code !== null && p.code === code);
    formes.filter('.selectionne').raise(); // passe devant ses voisins pour que le contour se voie
  }

  // Boutons + et − : zoome ou dézoome autour du centre de l'écran
  function zoomer(facteur) {
    svg.transition().duration(300).call(comportementZoom.scaleBy, facteur);
  }

  // Met à jour le nom des pays (utilisé par les lecteurs d'écran) quand la langue change
  function traduire() {
    formes.attr('aria-label', (p) => (p.code ? nomDuPays(p.code, langue()) : null));
    drapeaux.forEach((d) => d.bouton.setAttribute('aria-label', nomDuPays(d.code, langue())));
  }

  // Redessine la carte quand la fenêtre change de taille (rotation de tablette, etc.)
  let minuterie;
  window.addEventListener('resize', () => {
    clearTimeout(minuterie);
    minuterie = setTimeout(ajusterTaille, 200);
  });

  ajusterTaille();
  traduire();

  // « redimensionner » : à appeler quand la zone de la carte change de taille
  // sans que la fenêtre change (par exemple quand le bandeau d'accueil apparaît)
  return { allerA, zoomer, selectionnerPays, traduire, redimensionner: ajusterTaille };
}

// Pour un pays en plusieurs morceaux (îles, territoires d'outre-mer),
// renvoie le centre du plus grand morceau.
function centreDeLaPlusGrandePartie(entite) {
  if (entite.geometry.type !== 'MultiPolygon') return geoCentroid(entite);
  const morceaux = entite.geometry.coordinates.map((coordonnees) => ({
    type: 'Polygon',
    coordinates: coordonnees,
  }));
  const plusGrand = morceaux.reduce((a, b) => (geoArea(b) > geoArea(a) ? b : a));
  return geoCentroid(plusGrand);
}
