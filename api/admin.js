// Adresse /api/admin : gestion des codes d'accès, réservée à GRN Europe (page admin.html).
//
// Chaque demande doit contenir le mot de passe administrateur (variable d'environnement
// ADMIN_MOT_DE_PASSE, réglée dans Vercel ; jamais écrit dans le code public).
//
// Actions : { action: 'lister' }
//           { action: 'creer', nom, ville }         → crée un code
//           { action: 'liberer', code }             → le code pourra servir sur un nouvel appareil
//           { action: 'desactiver' | 'reactiver', code }

import { randomInt, timingSafeEqual } from 'node:crypto';
import { commande, lireFiche, repondre, lireCorps, normaliserCode } from './_base.js';

// Sur l'ordinateur (npm run dev) sans variable d'environnement : mot de passe d'essai
const MOT_DE_PASSE = process.env.ADMIN_MOT_DE_PASSE
  || (process.env.VERCEL ? null : 'admin-local');

// Lettres et chiffres sans ceux qu'on confond (0/O, 1/I/L)
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function motDePasseValide(propose) {
  if (!MOT_DE_PASSE || typeof propose !== 'string') return false;
  const a = Buffer.from(propose);
  const b = Buffer.from(MOT_DE_PASSE);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Nouveau code de 8 caractères, affiché en deux groupes : « PHAR-7K2M »
function nouveauCode() {
  let code = '';
  for (let i = 0; i < 8; i += 1) code += ALPHABET[randomInt(ALPHABET.length)];
  return code;
}

export const afficherCode = (code) => `${code.slice(0, 4)}-${code.slice(4)}`;

export default async function admin(req, res) {
  if (req.method !== 'POST') return repondre(res, 405, { erreur: 'methode' });

  const corps = await lireCorps(req);
  if (!motDePasseValide(corps.motDePasse)) return repondre(res, 401, { erreur: 'mot-de-passe' });

  switch (corps.action) {
    case 'lister': {
      const codes = await commande('SMEMBERS', 'codes');
      const fiches = await Promise.all(codes.map(async (code) => ({
        code: afficherCode(code),
        ...(await lireFiche(`code:${code}`)),
      })));
      // On ne renvoie pas les identifiants techniques (appareil, jeton), seulement l'état
      const liste = fiches.map(({ appareil, jeton, ...visible }) => ({ ...visible, utilise: Boolean(appareil) }));
      liste.sort((a, b) => (a.creeLe < b.creeLe ? 1 : -1)); // les plus récents en premier
      return repondre(res, 200, { codes: liste });
    }

    case 'creer': {
      const nom = String(corps.nom ?? '').trim().slice(0, 120);
      if (!nom) return repondre(res, 400, { erreur: 'nom' });
      let code;
      do { code = nouveauCode(); } while (await lireFiche(`code:${code}`)); // (collision très improbable)
      await commande('HSET', `code:${code}`,
        'nom', nom,
        'ville', String(corps.ville ?? '').trim().slice(0, 120),
        'actif', '1',
        'creeLe', new Date().toISOString());
      await commande('SADD', 'codes', code);
      return repondre(res, 200, { code: afficherCode(code) });
    }

    case 'liberer': {
      const code = normaliserCode(corps.code);
      const fiche = await lireFiche(`code:${code}`);
      if (!fiche) return repondre(res, 404, { erreur: 'inconnu' });
      if (fiche.jeton) await commande('DEL', `jeton:${fiche.jeton}`);
      await commande('HSET', `code:${code}`, 'appareil', '', 'jeton', '', 'activeLe', '');
      return repondre(res, 200, { ok: true });
    }

    case 'desactiver':
    case 'reactiver': {
      const code = normaliserCode(corps.code);
      if (!(await lireFiche(`code:${code}`))) return repondre(res, 404, { erreur: 'inconnu' });
      await commande('HSET', `code:${code}`, 'actif', corps.action === 'reactiver' ? '1' : '0');
      return repondre(res, 200, { ok: true });
    }

    default:
      return repondre(res, 400, { erreur: 'action' });
  }
}
