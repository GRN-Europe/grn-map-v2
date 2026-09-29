// Met à jour la copie des données 5fish en lisant le site public fivefish.org
// (collecte autorisée par GRN — voir README, « Données 5fish »).
//
// Utilisation (dans le dossier du projet) :  node scripts/mettre-a-jour-5fish.mjs
// Durée : environ 4 minutes (une pause d'une seconde entre chaque page, pour ne pas
// surcharger le serveur de 5fish).
// Résultat : src/donnees/5fish.json, puis envoyer la modification avec GitHub Desktop.
//
// Ce que le script lit :
// 1. les 5 pages de régions (https://fivefish.org/africa, …) → la liste des pays ;
// 2. la page de chaque pays (https://fivefish.org/fr?r=Europe&country=France) → ses langues.
//    Chaque langue y est une ligne de tableau marquée « ind_lang » (langue native du pays)
//    ou « non_ind_lang » (autre langue parlée dans le pays : la diaspora).

import { writeFileSync } from 'node:fs';

const SITE = 'https://fivefish.org';
const REGIONS = ['africa', 'americas', 'asia', 'europe', 'oceania'];
const DESTINATION = new URL('../src/donnees/5fish.json', import.meta.url);
const PAUSE = 1000; // millisecondes entre deux pages

// Seuils de sécurité : si le site a changé et que le script lit trop peu de choses,
// on n'écrase pas les données existantes
const PAYS_MINIMUM = 200;
const LANGUES_MINIMUM = 5000;

const attendre = (ms) => new Promise((resoudre) => setTimeout(resoudre, ms));

// Télécharge une page (3 essais en cas de problème de réseau)
async function lirePage(adresse) {
  for (let essai = 1; essai <= 3; essai += 1) {
    try {
      const reponse = await fetch(adresse, { headers: { 'User-Agent': 'GRN-map-v2 (GRN Europe)' } });
      if (reponse.ok) return await reponse.text();
      console.warn(`  ${adresse} → erreur ${reponse.status} (essai ${essai})`);
    } catch (erreur) {
      console.warn(`  ${adresse} → ${erreur.message} (essai ${essai})`);
    }
    await attendre(PAUSE * 3);
  }
  throw new Error(`Page illisible après 3 essais : ${adresse}`);
}

// Remplace les caractères codés du HTML (&amp; → &, &#39; → ', …)
function decoder(texte) {
  return texte
    .replace(/&#(\d+);/g, (tout, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (tout, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .trim();
}

// --- 1. Liste des pays, région par région ----------------------------------

const pays = []; // { code: 'FR', nom: 'France', adresse: '…' }
for (const region of REGIONS) {
  console.log(`Région ${region}…`);
  const html = await lirePage(`${SITE}/${region}`);
  // Liens de la forme href="/fr?r=Europe&amp;country=France"
  for (const [, code, parametres] of html.matchAll(/href="\/([a-z]{2})\?(r=[^"]*)"/g)) {
    if (pays.some((p) => p.code === code.toUpperCase())) continue; // chaque lien apparaît deux fois
    const infos = new URLSearchParams(decoder(parametres));
    pays.push({
      code: code.toUpperCase(),
      nom: infos.get('country'),
      adresse: `${SITE}/${code}?${new URLSearchParams({ r: infos.get('r'), country: infos.get('country') })}`,
    });
  }
  await attendre(PAUSE);
}
console.log(`${pays.length} pays trouvés.`);

// --- 2. Langues de chaque pays ----------------------------------------------

const langues = {};
const resultatPays = {};

for (const [numero, unPays] of pays.entries()) {
  const html = await lirePage(unPays.adresse);
  const natives = [];
  const diaspora = [];

  // Chaque ligne de langue commence par <tr class="ind_lang"> ou <tr class="non_ind_lang">
  const lignes = html.split(/<tr class="/).slice(1);
  for (const ligne of lignes) {
    const native = ligne.startsWith('ind_lang"');
    if (!native && !ligne.startsWith('non_ind_lang"')) continue;

    // Lien de la langue : /fr/3163?language=Corsican ; son nom est le texte du lien
    const trouve = ligne.match(/<a class="middleLink" href="(\/[a-z]{2}\/(\d+)\?language=[^"]*)">([^<]+)<\/a>/);
    if (!trouve) continue;
    const [, chemin, id, nom] = trouve;

    // Modèle de lien commun à tous les pays (voir lienFivefish dans src/pays.js)
    const modele = `${SITE}${decoder(chemin)}`.replace(`/${unPays.code.toLowerCase()}/`, '/{pays}/');
    langues[id] ??= { nom: { en: decoder(nom) }, lien: modele };

    const liste = native ? natives : diaspora;
    if (!natives.includes(id) && !diaspora.includes(id)) liste.push(id);
  }

  // Ordre alphabétique des noms, comme sur 5fish et en v1
  const parNom = (a, b) => langues[a].nom.en.localeCompare(langues[b].nom.en);
  resultatPays[unPays.code] = { langues: natives.sort(parNom), diaspora: diaspora.sort(parNom) };

  console.log(`[${numero + 1}/${pays.length}] ${unPays.nom} : ${natives.length} natives, ${diaspora.length} autres`);
  await attendre(PAUSE);
}

// --- 3. Vérification puis enregistrement -------------------------------------

const nombrePays = Object.keys(resultatPays).length;
const nombreLangues = Object.keys(langues).length;
if (nombrePays < PAYS_MINIMUM || nombreLangues < LANGUES_MINIMUM) {
  console.error(`ARRÊT : seulement ${nombrePays} pays et ${nombreLangues} langues lus.`);
  console.error('Le site 5fish a peut-être changé. Les données existantes n’ont PAS été modifiées.');
  process.exit(1);
}

writeFileSync(DESTINATION, JSON.stringify({
  source: 'fivefish.org',
  miseAJour: new Date().toISOString().slice(0, 10),
  langues,
  pays: resultatPays,
}));

const couples = Object.values(resultatPays).reduce((n, p) => n + p.langues.length + p.diaspora.length, 0);
console.log(`Terminé : ${nombrePays} pays, ${nombreLangues} langues, ${couples} couples langue-pays.`);
console.log('Prochaine étape : envoyer la modification avec GitHub Desktop.');
