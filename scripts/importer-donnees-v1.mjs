// Importe les données 5fish de la v1 (grn-map.vercel.app) et les convertit au format de la v2.
//
// Utilisation (dans le dossier du projet) :  node scripts/importer-donnees-v1.mjs
// Résultat : src/donnees/5fish.json
//
// La v1 garde une copie des pages publiques de fivefish.org dans data/fivefish.json :
// pour chaque pays, ses langues avec leur nom, le lien de leur page 5fish et l'indication
// « indigenous » (langue native du pays ; sinon, langue de la diaspora).
// Solution de départ : le script de mise à jour depuis fivefish.org la remplacera.

import { writeFileSync } from 'node:fs';

const SOURCE = 'https://grn-map.vercel.app/data/fivefish.json';
const DESTINATION = new URL('../src/donnees/5fish.json', import.meta.url);

console.log(`Téléchargement de ${SOURCE}…`);
const reponse = await fetch(SOURCE);
if (!reponse.ok) throw new Error(`Téléchargement impossible (${reponse.status})`);
const v1 = await reponse.json();

// Les liens 5fish ont la forme https://fivefish.org/<pays>/<numéro de langue>?language=<nom>
// (par ex. /fr/23 = le français en France, /dz/23 = le français en Algérie).
// Identifiant d'une langue : son numéro (« 23 »).
function identifiant(lien) {
  return new URL(lien).pathname.split('/').pop();
}

// Modèle de lien commun à tous les pays : le code du pays est remplacé par « {pays} »
// (l'application y remet le bon pays, voir lienFivefish dans src/pays.js)
function modeleDeLien(lien, codePays) {
  return lien.replace(`fivefish.org/${codePays.toLowerCase()}/`, 'fivefish.org/{pays}/');
}

const langues = {};
const pays = {};

for (const infos of Object.values(v1.countries)) {
  const natives = [];
  const diaspora = [];

  for (const langue of infos.languages) {
    const id = identifiant(langue.url);
    // 5fish ne donne les noms qu'en anglais : ils s'affichent donc en anglais (comme en v1)
    langues[id] ??= { nom: { en: langue.name }, lien: modeleDeLien(langue.url, infos.iso2) };
    (langue.indigenous ? natives : diaspora).push(id);
  }

  // Ordre alphabétique des noms, comme en v1
  const parNom = (a, b) => langues[a].nom.en.localeCompare(langues[b].nom.en);
  pays[infos.iso2] = { langues: natives.sort(parNom), diaspora: diaspora.sort(parNom) };
}

const resultat = {
  source: 'v1 (copie de fivefish.org)',
  miseAJour: new Date().toISOString().slice(0, 10),
  langues,
  pays,
};

writeFileSync(DESTINATION, JSON.stringify(resultat));

const couples = Object.values(pays).reduce((n, p) => n + p.langues.length + p.diaspora.length, 0);
console.log(`Terminé : ${Object.keys(pays).length} pays, ${Object.keys(langues).length} langues, ${couples} couples langue-pays.`);
