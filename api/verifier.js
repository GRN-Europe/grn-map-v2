// Adresse /api/verifier : « signe de vie » d'un appareil activé (au démarrage puis une fois par jour).
//
// Reçoit : { jeton }
// Renvoie : { valide: true } si le code est toujours actif et attaché à ce jeton ;
//           { valide: false } s'il a été désactivé ou libéré par GRN (l'appareil redemande un code).
// Enregistre aussi la date de dernière visite : GRN voit ainsi quelles églises utilisent la carte.

import { commande, lireFiche, repondre, lireCorps } from './_base.js';

export default async function verifier(req, res) {
  if (req.method !== 'POST') return repondre(res, 405, { erreur: 'methode' });

  const { jeton } = await lireCorps(req);
  if (!jeton) return repondre(res, 200, { valide: false });

  const code = await commande('GET', `jeton:${jeton}`);
  const fiche = code ? await lireFiche(`code:${code}`) : null;

  const valide = Boolean(fiche && fiche.actif === '1' && fiche.jeton === jeton);
  if (valide) await commande('HSET', `code:${code}`, 'vuLe', new Date().toISOString());

  return repondre(res, 200, { valide });
}
