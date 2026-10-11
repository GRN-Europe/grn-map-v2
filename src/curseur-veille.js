// Animation de l'écran d'accueil : sur la mini-carte, une main (index tendu) se promène
// d'un pays à l'autre et « clique » (une onde s'élargit et le pays s'éclaire).
// À côté de la mini-carte, une bulle « L'Évangile dans ta langue ici ! » (dans index.html).
// But : donner envie de toucher l'écran.
//
// La main est dessinée DANS le dessin de la mini-carte (SVG) : elle suit donc exactement
// la carte, quelle que soit la taille de l'écran.

// Pays visités, dans l'ordre (codes à 2 lettres) : un tour du monde
const ETAPES = ['FR', 'CD', 'BR', 'IN', 'US', 'NG', 'CN', 'MX', 'ET', 'ID', 'DE', 'PE'];

const DUREE_TRAJET = 1600; // millisecondes pour aller d'un pays au suivant
const DUREE_ARRET = 1800;  // millisecondes passées sur un pays (avec le « clic »)

// Forme d'une main avec l'index tendu, comme le curseur « main » d'un ordinateur.
// Le bout de l'index est en 0,0 : c'est là que se fait le « clic ».
const MAIN = 'M-6 6 Q-6 0 0 0 Q6 0 6 6 L6 30 Q6 26 11 26 Q16 26 16 31 L16 33 Q16 29 21 29 '
  + 'Q26 29 26 34 L26 36 Q26 32 31 32 Q36 32 36 37 L36 56 Q36 70 22 70 L6 70 Q-4 70 -9 60 '
  + 'L-18 44 Q-21 38 -16 36 Q-12 34 -9 39 L-6 44 Z';
// Petits traits entre les doigts repliés
const DOIGTS = 'M16 33 L16 43 M26 36 L26 45';

export function creerCurseurVeille({ svg, positions }) {
  const ns = 'http://www.w3.org/2000/svg';
  const curseur = document.createElementNS(ns, 'g');
  curseur.setAttribute('class', 'curseur-veille');
  curseur.innerHTML = `<circle class="curseur-onde" r="6"></circle>
    <path class="curseur-main" d="${MAIN}"></path>
    <path class="curseur-doigts" d="${DOIGTS}"></path>`;
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
