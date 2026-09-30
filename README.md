# GRN map v2

Borne tactile web de Global Recordings Network (GRN Europe) : le visiteur touche
son pays sur la carte, choisit sa langue du cœur et repart avec l'Évangile en audio
sur son téléphone (5fish).

## Lancer le projet sur son ordinateur

1. Installer Node.js (version LTS) depuis https://nodejs.org
2. Dans ce dossier, installer les outils (une seule fois) : `npm install`
3. Démarrer : `npm run dev`, puis ouvrir http://localhost:5173
   - le mode borne (écran d'accueil, retours automatiques) est actif sur l'adresse simple ;
     pour un site normal sans diaporama : http://localhost:5173/?presentation=0

Site publié : https://grn-map-v2.vercel.app (déploiement automatique à chaque envoi sur GitHub).

## Réglages de la borne

- Roue ⚙ en bas à droite, protégée par un code d'accès.
- Code par défaut : **GRNERD**. Chaque église peut choisir son propre code dans les réglages ;
  GRNERD reste toujours valable comme code de secours de GRN Europe.
- Les réglages sont enregistrés sur l'appareil. « Copier le lien de configuration » donne un
  lien qui, ouvert sur une autre borne, lui applique les mêmes réglages, bandeau et logo compris
  (mais sans les images du PDF).
- Bandeau d'accueil de l'église : désactivé par défaut ; logo (PNG, JPG ou SVG, marges vides
  rognées automatiquement) et phrase d'accueil dans chaque langue de la borne.
  Logo d'exemple pour les tests : `public/exemples/logo-eglise-du-phare.svg`.

## Codes d'accès (un par église ou personne, valable sur un seul appareil)

- Toute personne qui ouvre la carte (borne ou visiteur) doit d'abord entrer un code d'accès.
- Les codes se créent sur **/admin.html** (mot de passe administrateur, page en français et en anglais) :
  nombre de codes, d'appareils activés, d'appareils utilisés ces 30 derniers jours ;
  boutons Libérer (changement d'appareil), Désactiver, Réactiver.
- Chaque appareil activé envoie un « signe de vie » au démarrage puis une fois par jour.
- Configuration dans Vercel : une base Redis (menu Storage, Upstash) et la variable
  d'environnement `ADMIN_MOT_DE_PASSE`. En local (`npm run dev`) : base en mémoire,
  mot de passe `admin-local`.
- Limite : ce n'est pas un coffre-fort (le site est public) ; c'est un accès simple et un suivi.

## Organisation des fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Page unique : carte, panneaux, écran 5fish, écran de veille, réglages |
| `src/main.js` | Démarrage : relie la carte, les panneaux, le mode borne et les réglages |
| `src/carte.js` | Carte du monde : dessin, zoom, régions des onglets, drapeaux, pays sélectionné |
| `src/panneau-pays.js` | Panneau d'un pays (à droite) : langues avec petit QR code, case diaspora |
| `src/ecoute.js` | Fenêtre du QR code et écran « Ouvrir ici » (page 5fish dans un cadre) |
| `src/qr.js` | Fabrique les QR codes (hors ligne) |
| `src/recherche.js` | Recherche (loupe) : langues et pays, sans tenir compte des accents |
| `src/borne.js` | Mode borne (actif par défaut, `?presentation=0` pour le désactiver) : inactivité, « Je suis toujours là », retours automatiques |
| `src/activation.js` | Écran « Code d'accès » et signe de vie quotidien |
| `admin.html`, `src/admin.js`, `src/admin.css` | Page d'administration des codes (FR / EN) |
| `api/` | Partie serveur (Vercel) : `activer`, `verifier`, `admin`, et `_base.js` (base de données) |
| `src/plein-ecran.js` | Plein écran : code demandé pour en sortir, retour automatique (mode borne) |
| `src/veille.js` | Écran de veille : mini-carte, diaporama en fondu, logo |
| `src/diaporama.js` | Images du diaporama : d'origine ou issues d'un PDF chargé |
| `src/reglages.js` | Écran « Réglages de la borne » |
| `src/bandeau.js` | Bandeau d'accueil de l'église : affichage, phrase selon la langue, préparation du logo (marges rognées) |
| `src/stockage.js` | Enregistrement sur l'appareil, code d'accès, lien de configuration |
| `src/pays.js` | Codes et noms des pays |
| `src/traductions.js` | Gestion des langues de l'interface |
| `src/langues/` | Un fichier par langue (fr, en, de, es, it, pt, nl). Traductions de, es, it, pt, nl à faire relire par des locuteurs natifs. Pour ajouter une langue : copier en.js, changer code, nom et l'import des pays, traduire |
| `src/styles.css` | Apparence (couleurs en haut du fichier) |
| `src/donnees/5fish.json` | Copie des données 5fish (228 pays, 7 113 langues) — voir ci-dessous |
| `scripts/mettre-a-jour-5fish.mjs` | Met à jour `5fish.json` en lisant le site fivefish.org |
| `scripts/importer-donnees-v1.mjs` | Solution de secours : recrée `5fish.json` à partir des données de la v1 |
| `public/diaporama/` | Images du diaporama d'origine (JPEG 1920 × 1080) |
| `public/logos/grn-europe.png` | Logo GRN Europe (bleu et or, fond transparent), affiché en blanc par un filtre CSS |
| `public/icones/` | Icônes de l'application installable (dessin source : `public/icones/icone.svg`) |
| `vite.config.js` | Publication et application installable / hors ligne (PWA) |
| `sources/diaporama-original/` | Export PNG de la présentation PowerPoint (non publié) |

## Changer le diaporama d'origine

1. Dans PowerPoint : Fichier › Exporter… › PNG, toutes les diapositives, largeur 1920.
2. Convertir en JPEG dans `public/diaporama/` sous les noms `diapo-1.jpg`, `diapo-2.jpg`…
3. Si le nombre d'images change, adapter la liste `IMAGES_D_ORIGINE` dans `src/diaporama.js`.

## Données 5fish

La carte lit une copie des données de 5fish (`src/donnees/5fish.json`), pour fonctionner même
sans internet. Aucune API ni code d'accès n'est nécessaire : les données viennent des pages
publiques de fivefish.org (accord de GRN).

**Mettre à jour les données** (environ 4 minutes, à faire de temps en temps) :

```
node scripts/mettre-a-jour-5fish.mjs
```

Le script lit les 5 pages de régions puis la page de chaque pays sur fivefish.org, avec une
pause d'une seconde entre chaque page. Si le site 5fish a changé et que le script lit trop peu de
pays ou de langues, il s'arrête sans rien modifier. Ensuite, envoyer la modification avec GitHub
Desktop. La date de mise à jour s'affiche dans les réglages de la borne.

(Solution de secours : `node scripts/importer-donnees-v1.mjs` reprend la copie des données de la v1.)

Format du fichier :

```json
{
  "source": "fivefish.org",
  "miseAJour": "2026-09-29",
  "langues": { "23": { "nom": { "en": "French" }, "lien": "https://fivefish.org/{pays}/23?language=French" } },
  "pays":    { "FR": { "langues": ["23", "…"], "diaspora": ["…"] } }
}
```

- Les pays sont repérés par leur code ISO à 2 lettres (FR, AD…).
- `langues` d'un pays = langues natives ; `diaspora` = autres langues parlées dans le pays.
- Le lien d'une langue dépend du pays : `{pays}` est remplacé par le code du pays en minuscules
  (`/fr/23` = le français en France, `/dz/23` = le français en Algérie).
- 5fish ne donne les noms de langues qu'en anglais : ils s'affichent en anglais (comme en v1).

## Avancement (étapes du cahier des charges)

- [x] 3. Carte
- [x] 4. Langue du cœur, diaspora, QR code, « Ouvrir ici »
- [x] 5. Mode borne : diaporama, inactivité, réglages protégés
- [x] 6. Bandeau d'accueil de l'église
- [x] 7. Vraies données 5fish, avec script de mise à jour depuis fivefish.org
- [x] 8. Publication sur Vercel
