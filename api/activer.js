// Adresse /api/activer : active un appareil avec un code d'accès fourni par GRN Europe.
//
// Reçoit : { code: 'PHAR-7K2M', appareil: '<identifiant tiré au hasard par l'appareil>' }
// Le code doit exister, être actif, et ne pas être déjà utilisé sur un AUTRE appareil.
// Renvoie : { jeton, nom } — le jeton est gardé par l'appareil et vérifié chaque jour.

import { randomUUID } from 'node:crypto';
import { commande, lireFiche, repondre, lireCorps, normaliserCode } from './_base.js';

export default async function activer(req, res) {
  if (req.method !== 'POST') return repondre(res, 405, { erreur: 'methode' });

  const { code, appareil } = await lireCorps(req);
  const cle = `code:${normaliserCode(code)}`;
  const fiche = await lireFiche(cle);

  if (!fiche) return repondre(res, 404, { erreur: 'inconnu' });
  if (fiche.actif !== '1') return repondre(res, 403, { erreur: 'desactive' });
  if (!appareil) return repondre(res, 400, { erreur: 'appareil' });

  // Déjà utilisé sur un autre appareil : refusé (GRN peut « libérer » le code)
  if (fiche.appareil && fiche.appareil !== appareil) {
    return repondre(res, 409, { erreur: 'deja-utilise' });
  }

  // Même appareil qui se réactive (données effacées puis même identifiant) : on garde son jeton
  const jeton = fiche.appareil === appareil && fiche.jeton ? fiche.jeton : randomUUID();
  const maintenant = new Date().toISOString();

  await commande('HSET', cle,
    'appareil', appareil,
    'jeton', jeton,
    'activeLe', fiche.activeLe || maintenant,
    'vuLe', maintenant);
  await commande('SET', `jeton:${jeton}`, normaliserCode(code));

  return repondre(res, 200, { jeton, nom: fiche.nom });
}
