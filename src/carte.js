// La carte du monde tactile : dessin des pays, zoom, onglets des régions et drapeaux.
//
// Principe :
// - les contours des pays viennent de world-atlas (Natural Earth, domaine public),
//   inclus dans l'application pour fonctionner sans internet ;
// - d3-geo transforme ces contours en dessin SVG (projection Mercator) ;
// - d3-zoom gère le pincement à deux doigts, le double toucher et le glissement ;
// - les drapeaux sont des boutons HTML posés au-dessus de la carte ; ils apparaissent
//   dès le premier zoom et gardent toujours la même taille à l'écran.

import { geoMercator, geoPath, geoArea, geoCentroid, geoContains } from 'd3-geo';
import { zoom, zoomIdentity, zoomTransform } from 'd3-zoom';
import { select, pointer } from 'd3-selection';
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

// Territoires d'outre-mer que la carte dessine comme une partie de la France.
// Chaque morceau de la France est rattaché à son territoire selon sa position
// [longitude, latitude] ; tout le reste (métropole, Corse, îles) reste la France.
const OUTRE_MER_DE_LA_FRANCE = [
  { code: 'GF', ouest: -55, est: -51, sud: 1, nord: 6.5 },      // Guyane
  { code: 'GP', ouest: -62, est: -60.9, sud: 15.7, nord: 16.6 }, // Guadeloupe
  { code: 'MQ', ouest: -61.3, est: -60.7, sud: 14.3, nord: 15 }, // Martinique
  { code: 'RE', ouest: 55, est: 56, sud: -21.5, nord: -20.8 },   // La Réunion
  { code: 'YT', ouest: 44.9, est: 45.4, sud: -13.1, nord: -12.5 }, // Mayotte
];

function territoireDuMorceau(polygone) {
  const [longitude, latitude] = geoCentroid({ type: 'Polygon', coordinates: polygone });
  const territoire = OUTRE_MER_DE_LA_FRANCE.find((t) =>
    longitude >= t.ouest && longitude <= t.est && latitude >= t.sud && latitude <= t.nord);
  return territoire?.code ?? 'FR';
}

// Sépare la France en France + territoires d'outre-mer, pour que chacun soit touchable
// à part (avec son nom et ses langues). Les coordonnées ne changent pas : chaque morceau
// garde exactement son tracé d'origine, dans le même ordre, il est juste rangé à part.
function separerLOutreMer(entite) {
  if (entite.properties.name !== 'France' || entite.geometry.type !== 'MultiPolygon') {
    return [{ entite, code: codeDuPays(entite) }];
  }
  const morceauxParCode = new Map();
  entite.geometry.coordinates.forEach((polygone) => {
    const code = territoireDuMorceau(polygone);
    if (!morceauxParCode.has(code)) morceauxParCode.set(code, []);
    morceauxParCode.get(code).push(polygone);
  });
  return [...morceauxParCode].map(([code, polygones]) => ({
    code,
    entite: {
      ...entite,
      properties: { ...entite.properties, territoire: code },
      geometry: { type: 'MultiPolygon', coordinates: polygones },
    },
  }));
}

// Liste des pays de la carte (sans l'Antarctique, inutile ici)
const PAYS = feature(monde, monde.objects.countries).features
  .filter((entite) => entite.properties.name !== 'Antarctica')
  .flatMap(separerLOutreMer);

// Codes à 2 lettres de tous les pays de la carte (utilisés par la recherche)
export const CODES_PAYS = PAYS.map((p) => p.code).filter(Boolean);

export function creerCarte({ svgElement, coucheDrapeaux, donnees, quandPaysTouche, quandMerTouchee }) {
  const svg = select(svgElement);

  // Fluidité sur les tablettes modestes : pendant un geste (glisser, zoomer) ou une animation,
  // on ne redessine pas la carte à chaque image. On déplace et on agrandit l'image déjà dessinée
  // (transformation CSS, faite par la carte graphique), puis on redessine la carte nette une seule
  // fois à la fin du geste. Pour cela :
  // - les gestes sont écoutés sur un cadre (div) qui contient la carte et les drapeaux ;
  // - la carte (svg) est trois fois plus large et plus haute que l'écran (un écran de plus de chaque côté),
  //   pour qu'en glissant ou en dézoomant on voie déjà la suite de la carte et pas un bord vide.
  const cadreElement = document.createElement('div');
  cadreElement.className = 'cadre-carte';
  svgElement.parentNode.insertBefore(cadreElement, svgElement);
  cadreElement.append(svgElement, coucheDrapeaux);
  const zoneGestes = select(cadreElement);
  const projection = geoMercator();
  const chemin = geoPath(projection);

  // Carte « sans fin » : en glissant vers la droite, on retrouve les Amériques après l'Asie,
  // comme sur un globe. Le groupe des pays (les vrais tracés, jamais modifiés) est affiché
  // plusieurs fois côte à côte : l'original, toujours placé là où l'on regarde, et des copies
  // (<use>, simples reflets de l'original) à sa gauche et à sa droite.
  // Le groupe « zoom » est celui qu'on agrandit et déplace quand on zoome ou glisse.
  const groupeZoom = svg.append('g').attr('class', 'zoom-carte');
  const groupePays = groupeZoom.append('g').attr('class', 'pays').attr('id', 'pays-original');
  const DECALAGES_COPIES = [-2, -1, 1, 2]; // en « tours du monde » par rapport à l'original
  const copies = groupeZoom.selectAll('use')
    .data(DECALAGES_COPIES)
    .join('use')
    .attr('class', 'pays-copie'); // le lien vers l'original est posé quand la copie est visible
  // Calque de mise en valeur du pays choisi, au-dessus de tout (voir selectionnerPays)
  const calqueSelection = groupeZoom.append('g').attr('class', 'selection');
  let paysSelectionne = null;
  let largeurMonde = 0;  // largeur d'un tour du monde, en pixels (zoom 1)
  let tourActuel = 0;    // n° du tour du monde où se trouve l'original (0 = position de départ)

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
  let transformationDessinee = null; // zoom de la carte telle qu'elle est dessinée (null = jamais)

  // Redessine la carte nette pour un zoom donné (tracés, copies, drapeaux)
  function dessiner(transformation) {
    transformationDessinee = transformation;
    groupeZoom.attr('transform', transformation);
    placerOriginal(transformation);
    placerDrapeaux(transformation);
    svgElement.style.transform = '';
    coucheDrapeaux.style.transform = '';
    coucheDrapeaux.style.opacity = '';
  }

  // Pendant un geste : on déplace et agrandit l'image déjà dessinée, sans la redessiner
  // Si l'image déjà dessinée ne couvre plus l'écran (en dézoomant, elle rétrécit), on la
  // redessine tout de suite à la bonne taille, sans attendre la fin du geste.
  let dernierDessinPendantGeste = 0;
  function deplacerLImage(transformation) {
    const t0 = transformationDessinee;
    const echelle = transformation.k / t0.k;
    const dx = transformation.x - t0.x * echelle;
    const dy = transformation.y - t0.y * echelle;
    // L'image dessinée va de -1 à +2 écrans dans les deux sens (voir ajusterTaille)
    const couvreLEcran = dx - echelle * largeur <= 0 && dx + 2 * echelle * largeur >= largeur
      && dy - echelle * hauteur <= 0 && dy + 2 * echelle * hauteur >= hauteur;
    const maintenant = performance.now();
    if (!couvreLEcran && maintenant - dernierDessinPendantGeste > 120) {
      dernierDessinPendantGeste = maintenant;
      dessiner(transformation);
      return;
    }
    const css = `translate(${dx}px, ${dy}px) scale(${echelle})`;
    svgElement.style.transform = css;
    coucheDrapeaux.style.transform = css;
    // Les drapeaux ne doivent pas grossir avec la carte : cachés le temps d'un zoom
    coucheDrapeaux.style.opacity = Math.abs(echelle - 1) > 0.001 ? '0' : '';
  }

  const comportementZoom = zoom()
    .scaleExtent([1, ZOOM_MAX])
    .clickDistance(12) // un toucher qui bouge un peu compte encore comme un toucher
    // (d3-zoom annonce toujours « start », puis les « zoom », puis « end », même sans animation)
    .on('zoom', (evenement) => {
      if (transformationDessinee) deplacerLImage(evenement.transform);
      else dessiner(evenement.transform); // tout premier affichage
    })
    .on('end', (evenement) => {
      dessiner(evenement.transform); // fin du geste ou de l'animation : carte nette
    });
  zoneGestes.call(comportementZoom);


  // Toucher la mer (le fond de la carte, hors des pays) : par exemple pour fermer le panneau
  // d'un pays. Après un glissement de la carte, d3-zoom annule ce « clic » : seul un toucher
  // bref compte.
  svg.on('click', (evenement) => {
    if (evenement.target === svgElement) quandMerTouchee();
  });

  // Toucher une copie : on retrouve le point touché sur la carte d'origine,
  // puis le pays qui contient ce point (ou la mer)
  copies.on('click', (evenement, n) => {
    const [x, y] = pointer(evenement, groupeZoom.node());
    const xOriginal = x - (tourActuel + n) * largeurMonde;
    let [longitude, latitude] = projection.invert([xOriginal, y]);
    longitude = ((((longitude + 180) % 360) + 360) % 360) - 180;
    const touche = PAYS.find((p) => p.code && geoContains(p.entite, [longitude, latitude]));
    if (touche) quandPaysTouche(touche.code);
    else quandMerTouchee();
  });

  // Tour du monde le plus proche d'un point x de l'écran, pour un point x0 de la carte d'origine
  function tourLePlusProche(transformation, x0, xEcran) {
    return Math.round((xEcran - transformation.applyX(x0)) / (largeurMonde * transformation.k));
  }

  // Place l'original sous le milieu de l'écran, et les copies de part et d'autre
  function placerOriginal(transformation) {
    if (!largeurMonde) return;
    const centreCarte = projection.translate()[0];
    const tour = tourLePlusProche(transformation, centreCarte, largeur / 2);
    if (tour !== tourActuel || !groupePays.attr('transform')) {
      tourActuel = tour;
      groupePays.attr('transform', `translate(${tour * largeurMonde},0)`);
      copies.attr('x', (n) => n * largeurMonde);
    }
    // Seules les copies visibles à l'écran sont affichées : une copie coûte cher à
    // redessiner (par exemple quand un pays est mis en valeur)
    copies.each(function afficherSiVisible(n) {
      const gauche = transformation.applyX(centreCarte + (tourActuel + n - 0.5) * largeurMonde);
      const droite = transformation.applyX(centreCarte + (tourActuel + n + 0.5) * largeurMonde);
      const visible = droite > -largeur && gauche < 2 * largeur; // la carte fait 3 écrans de large
      if (visible !== (this.getAttribute('href') !== null)) {
        if (visible) this.setAttribute('href', '#pays-original');
        else this.removeAttribute('href');
      }
    });
  }

  // Largeur du panneau d'un pays (variable CSS --largeur-panneau-pays, par ex. 400 px).
  // Mesurée une fois par taille d'écran (dans ajusterTaille) : la mesurer au moment du toucher
  // forçait la tablette à recalculer toute la page.
  let largeurPanneauMesuree = 0;
  const largeurPanneau = () => largeurPanneauMesuree;
  function mesurerLargeurPanneau() {
    const essai = document.createElement('div');
    essai.style.cssText = 'position:absolute;visibility:hidden;width:var(--largeur-panneau-pays)';
    document.body.appendChild(essai);
    const resultat = essai.getBoundingClientRect().width;
    essai.remove();
    return resultat;
  }

  let largeur = 0;
  let hauteur = 0;
  let regionActuelle = 'monde';

  // Calcule la taille de la carte pour remplir la zone disponible
  function ajusterTaille() {
    largeur = cadreElement.clientWidth;
    hauteur = cadreElement.clientHeight;
    largeurPanneauMesuree = mesurerLargeurPanneau();
    // La carte déborde d'un écran à gauche et à droite (voir plus haut) : mêmes coordonnées,
    // de -largeur à 2 × largeur
    // … et d'un écran en haut et en bas, pour qu'en dézoomant on voie déjà les pays autour
    svg.attr('viewBox', `${-largeur} ${-hauteur} ${3 * largeur} ${3 * hauteur}`);
    svgElement.style.transformOrigin = `${largeur}px ${hauteur}px`; // le coin de l'écran, dans la carte

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

    // Largeur d'un tour du monde (projection de Mercator : 2π × l'échelle)
    largeurMonde = 2 * Math.PI * projection.scale();
    groupePays.attr('transform', null); // l'original et les copies seront replacés par placerOriginal

    // Limites du glissement : sans limite à gauche ni à droite (la carte fait le tour du monde) ;
    // en haut et en bas, la carte entière, et au minimum l'écran.
    const [[, y0], [, y1]] = chemin.bounds(toutLeMonde);
    comportementZoom.translateExtent([
      [-Infinity, Math.min(0, y0)],
      [Infinity, Math.max(hauteur, y1)],
    ]);
    allerA(regionActuelle, false);
    if (paysSelectionne) selectionnerPays(paysSelectionne); // tracés recalculés : calque aussi
  }

  // Place les drapeaux selon le zoom actuel, et les cache si on n'a pas encore zoomé
  function placerDrapeaux(transformation) {
    // Avant le premier zoom, les drapeaux sont invisibles mais déjà placés et chargés : les ~250
    // petites images SVG sont ainsi préparées dès le démarrage, et non au premier zoom (ce qui
    // bloquait une tablette modeste plus d'une seconde).
    coucheDrapeaux.classList.toggle('visible', transformation.k >= ZOOM_DRAPEAUX);
    drapeaux.forEach((d) => {
      // Le drapeau va sur l'exemplaire du pays le plus proche du milieu de l'écran
      const tour = tourLePlusProche(transformation, d.position[0], largeur / 2);
      const [x, y] = transformation.apply([d.position[0] + tour * largeurMonde, d.position[1]]);
      // Seuls les drapeaux à l'écran (ou juste à côté) sont affichés : moins de travail pour la tablette
      const aLEcran = x > -largeur && x < 2 * largeur && y > -hauteur && y < 2 * hauteur;
      d.bouton.hidden = !aLEcran;
      if (aLEcran) d.bouton.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
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

    // On reste dans le tour du monde actuel (pas de long voyage vers la position de départ)
    if (largeurMonde) transformation = transformation.translate(-tourActuel * largeurMonde, 0);

    if (animer) {
      zoneGestes.transition().duration(DUREE_ANIMATION).call(comportementZoom.transform, transformation);
    } else {
      zoneGestes.call(comportementZoom.transform, transformation);
    }
  }

  // Met un pays en valeur (orange clair, contour blanc), ou aucun si code = null.
  // Tous les morceaux du pays sont éclairés (pour la France : aussi la Guyane, etc.).
  // Les tracés d'origine ne sont pas touchés : on dessine par-dessus une copie exacte du tracé
  // du pays (même attribut « d »), en orange clair avec un contour blanc. Modifier les tracés
  // d'origine obligeait la tablette à refaire toutes les copies de la carte (carte sans fin).
  // Le calque est posé sur l'exemplaire du pays qui sera amené au milieu de l'écran,
  // et sur ses voisins de gauche et de droite.
  function selectionnerPays(code) {
    paysSelectionne = code;
    calqueSelection.selectAll('*').remove();
    const pays = drapeaux.find((d) => d.code === code);
    if (!pays || !largeurMonde) return;
    const traces = formes.filter((p) => p.code === code).nodes().map((n) => n.getAttribute('d'));
    const transformation = zoomTransform(cadreElement);
    const tour = tourLePlusProche(transformation, pays.position[0], (largeur - largeurPanneau()) / 2);
    [tour - 1, tour, tour + 1].forEach((t) => {
      const groupe = calqueSelection.append('g').attr('transform', `translate(${t * largeurMonde},0)`);
      traces.forEach((d) => groupe.append('path').attr('d', d));
    });
  }

  // Quand on touche un pays, la carte glisse pour l'amener au milieu de la partie visible,
  // à gauche du panneau des langues (sur l'exemplaire du pays le plus proche). Le zoom ne change pas.
  function montrerAGaucheDuPanneau(code) {
    const pays = drapeaux.find((d) => d.code === code);
    if (!pays) return;
    const transformation = zoomTransform(cadreElement);
    const centreVisible = [(largeur - largeurPanneau()) / 2, hauteur / 2];
    const tour = tourLePlusProche(transformation, pays.position[0], centreVisible[0]);
    const [x, y] = transformation.apply([pays.position[0] + tour * largeurMonde, pays.position[1]]);
    // (en haut et en bas, la carte ne dépasse pas ses bords : le pays s'en approche au mieux)
    zoneGestes.transition().duration(DUREE_ANIMATION).call(
      comportementZoom.translateBy,
      (centreVisible[0] - x) / transformation.k,
      (centreVisible[1] - y) / transformation.k,
    );
  }

  // Boutons + et − : zoome ou dézoome autour du centre de l'écran
  function zoomer(facteur) {
    zoneGestes.transition().duration(300).call(comportementZoom.scaleBy, facteur);
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
  return {
    allerA, zoomer, selectionnerPays, montrerAGaucheDuPanneau, traduire, redimensionner: ajusterTaille,
  };
}

// Pour un pays en plusieurs morceaux (îles, territoires d'outre-mer),
// renvoie le centre du plus grand morceau.
export function centreDeLaPlusGrandePartie(entite) {
  if (entite.geometry.type !== 'MultiPolygon') return geoCentroid(entite);
  const morceaux = entite.geometry.coordinates.map((coordonnees) => ({
    type: 'Polygon',
    coordinates: coordonnees,
  }));
  const plusGrand = morceaux.reduce((a, b) => (geoArea(b) > geoArea(a) ? b : a));
  return geoCentroid(plusGrand);
}
