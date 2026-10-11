// Animation de l'écran d'accueil : sur la mini-carte, une flèche de souris se promène
// d'un pays à l'autre et « clique » (une onde s'élargit et le pays s'éclaire).
// À côté de la mini-carte, une bulle « L'Évangile dans ta langue ici ! » (dans index.html).
// But : donner envie de toucher l'écran.
//
// La flèche est dessinée DANS le dessin de la mini-carte (SVG) : elle suit donc exactement
// la carte, quelle que soit la taille de l'écran.

// Pays visités, dans l'ordre (codes à 2 lettres) : un tour du monde
const ETAPES = ['FR', 'CD', 'BR', 'IN', 'US', 'NG', 'CN', 'MX', 'ET', 'ID', 'DE', 'PE'];

const DUREE_TRAJET = 1600; // millisecondes pour aller d'un pays au suivant
const DUREE_ARRET = 1800;  // millisecondes passées sur un pays (avec le « clic »)

// Forme d'une flèche de souris classique (pointe en 0,0)
const FLECHE = 'M0 0 L0 83 L22 64 L36 96 L51 90 L36 59 L65 59 Z';

export function creerCurseurVeille({ svg, positions }) {
  const ns = 'http://www.w3.org/2000/svg';
  const curseur = document.createElementNS(ns, 'g');
  curseur.setAttribute('class', 'curseur-veille');
  curseur.innerHTML = `<circle class="curseur-onde" r="6"></circle>
    <path class="curseur-fleche" d="${FLECHE}"></path>`;
  svg.appendChild(curseur);

  // Seulement les pays présents sur la mini-carte
  const etapes = ETAPES.filter((code) => positions[code]);
  let numero = 0;
  let minuterie = null;
  let enMarche = false;

  // Va au pays suivant, puis « clique » dessus
  function etapeSuivante() {
    if (!enMarche) return;
    const code = etapes[numero % etapes.length];
    numero += 1;
    const [x, y] = positions[code];
    curseur.style.transform = `translate(${x}px, ${y}px)`;

    minuterie = setTimeout(() => {
      if (!enMarche) return;
      // Le « clic » : l'onde s'élargit et le pays s'éclaire
      curseur.classList.remove('clic');
      void curseur.getBBox(); // relance l'animation CSS de l'onde
      curseur.classList.add('clic');
      const pays = svg.querySelectorAll(`path[data-code="${code}"]`);
      pays.forEach((p) => p.classList.add('pays-vise'));
      minuterie = setTimeout(() => {
        pays.forEach((p) => p.classList.remove('pays-vise'));
        etapeSuivante();
      }, DUREE_ARRET);
    }, DUREE_TRAJET);
  }

  function demarrer() {
    if (enMarche || etapes.length === 0) return;
    enMarche = true;
    etapeSuivante();
  }

  function arreter() {
    enMarche = false;
    clearTimeout(minuterie);
    svg.querySelectorAll('.pays-vise').forEach((p) => p.classList.remove('pays-vise'));
  }

  return { demarrer, arreter };
}
