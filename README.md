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
| `src/donnees/exemple-5fish.json` | Données d'exemple (remplacées par les vraies données 5fish à l'étape 7) |
| `public/diaporama/` | Images du diaporama d'origine (JPEG 1920 × 1080) |
| `public/logos/grn-europe.png` | Logo GRN Europe (bleu et or, fond transparent), affiché en blanc par un filtre CSS |
| `public/icones/` | Icônes de l'application installable (dessin source : `public/icones/icone.svg`) |
| `vite.config.js` | Publication et application installable / hors ligne (PWA) |
| `sources/diaporama-original/` | Export PNG de la présentation PowerPoint (non publié) |

## Changer le diaporama d'origine

1. Dans PowerPoint : Fichier › Exporter… › PNG, toutes les diapositives, largeur 1920.
2. Convertir en JPEG dans `public/diaporama/` sous les noms `diapo-1.jpg`, `diapo-2.jpg`…
3. Si le nombre d'images change, adapter la liste `IMAGES_D_ORIGINE` dans `src/diaporama.js`.

## Format des données 5fish

```json
{
  "source": "exemple",
  "miseAJour": "2026-09-29",
  "langues": { "cat": { "nom": { "fr": "Catalan", "en": "Catalan" }, "lien": "https://fivefish.org/..." } },
  "pays":    { "AD": { "langues": ["cat", "spa"], "diaspora": ["por"] } }
}
```

Les pays sont repérés par leur code ISO à 2 lettres (FR, AD…).

## Avancement (étapes du cahier des charges)

- [x] 3. Carte avec données d'exemple
- [x] 4. Langue du cœur, diaspora, QR code, « Ouvrir ici »
- [x] 5. Mode borne : diaporama, inactivité, réglages protégés
- [x] 6. Bandeau d'accueil de l'église
- [ ] 7. Vraies données 5fish
- [ ] 8. Publication sur Vercel
