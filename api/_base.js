// Petite base de données des codes d'accès (partie serveur, sur Vercel).
//
// En ligne : base Redis « Upstash », ajoutée dans Vercel (menu Storage). Vercel fournit alors
// automatiquement son adresse et sa clé secrète dans les variables d'environnement.
// Sur l'ordinateur (npm run dev) : une base « en mémoire », effacée à chaque redémarrage,
// pour pouvoir tester sans rien installer.
//
// (Les fichiers de /api dont le nom commence par « _ » ne sont pas des adresses du site :
// ce sont des outils partagés par les autres fichiers.)

const ADRESSE = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const CLE = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

// Base en mémoire pour les essais sur l'ordinateur
const memoire = new Map();

// Exécute une commande Redis, par ex. commande('HGETALL', 'code:ABCD-1234')
export async function commande(...arguments_) {
  if (!ADRESSE) {
    // En ligne sans base configurée : on refuse plutôt que d'utiliser une mémoire qui s'efface
    if (process.env.VERCEL) throw new Error('Base de données non configurée dans Vercel (menu Storage)');
    return commandeEnMemoire(arguments_);
  }
  const reponse = await fetch(ADRESSE, {
    method: 'POST',
    headers: { Authorization: `Bearer ${CLE}` },
    body: JSON.stringify(arguments_),
  });
  const { result, error } = await reponse.json();
  if (error) throw new Error(error);
  return result;
}

// Les quelques commandes utilisées, imitées en mémoire
function commandeEnMemoire([nom, cle, ...valeurs]) {
  switch (nom) {
    case 'HSET': {
      const fiche = memoire.get(cle) ?? {};
      for (let i = 0; i < valeurs.length; i += 2) fiche[valeurs[i]] = String(valeurs[i + 1]);
      memoire.set(cle, fiche);
      return 1;
    }
    case 'HGETALL': {
      const fiche = memoire.get(cle);
      return fiche ? Object.entries(fiche).flat() : [];
    }
    case 'SET': memoire.set(cle, String(valeurs[0])); return 'OK';
    case 'GET': return memoire.get(cle) ?? null;
    case 'DEL': return memoire.delete(cle) ? 1 : 0;
    case 'SADD': {
      const ensemble = memoire.get(cle) ?? new Set();
      valeurs.forEach((v) => ensemble.add(v));
      memoire.set(cle, ensemble);
      return 1;
    }
    case 'SMEMBERS': return [...(memoire.get(cle) ?? [])];
    default: throw new Error(`Commande non prévue en mémoire : ${nom}`);
  }
}

// Redis renvoie une fiche sous forme de liste [clé, valeur, clé, valeur…] : on la transforme en objet
export async function lireFiche(cle) {
  const liste = await commande('HGETALL', cle);
  if (!liste || liste.length === 0) return null;
  const fiche = {};
  for (let i = 0; i < liste.length; i += 2) fiche[liste[i]] = liste[i + 1];
  return fiche;
}

// Réponse JSON avec un code HTTP
export function repondre(res, statut, contenu) {
  res.statusCode = statut;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(contenu));
}

// Lit le corps JSON d'une demande (Vercel le fait déjà ; sur l'ordinateur, on le lit nous-mêmes)
export async function lireCorps(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let texte = '';
  for await (const morceau of req) texte += morceau;
  try {
    return JSON.parse(texte || '{}');
  } catch {
    return {};
  }
}

// Nettoie un code tapé : majuscules, sans espaces (« phar 7k2m » → « PHAR7K2M »)
export function normaliserCode(code) {
  return String(code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}
