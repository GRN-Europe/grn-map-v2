# Consignes pour Claude Code — GRN map v2

- Répondre et commenter le code en français.
- Garder le code simple : JavaScript sans framework, un fichier par zone de l'application.
- Borne tactile : grandes zones à toucher (≥ 52 px), jamais d'action au survol, pas de zoom de la page.
- Tout ce qui s'affiche doit fonctionner hors ligne (pas de ressources chargées depuis internet),
  sauf la page 5fish ouverte avec « Ouvrir ici ».
- Tout texte visible passe par `texte("cle")` (src/traductions.js) ; les textes sont dans
  src/langues/ (un fichier par langue, l'anglais sert de secours).
- Les liens 5fish pointent vers https://fivefish.org (5fish.mobi y redirige).
- Données : src/donnees/5fish.json (228 pays, 7 113 langues), lien par langue avec « {pays} » à remplacer
  par le code du pays (lienFivefish dans src/pays.js). Pas d'API : pages publiques de fivefish.org,
  collecte autorisée par GRN (directeur Europe).
- Lancer : `npm run dev` (Node.js est dans /usr/local/bin).

## Décisions déjà prises

- Codes d'accès à la carte (demande de GRN Europe) : obligatoires pour tous (bornes et visiteurs),
  un code par église ou personne, valable sur un seul appareil ; création et suivi sur /admin.html
  (FR / EN, exception à la règle des 7 langues : page interne). Serveur : dossier api/, base Redis
  Upstash dans Vercel, mot de passe ADMIN_MOT_DE_PASSE (variable d'environnement Vercel).
- Code des réglages de la borne : GRNMAP par défaut et toujours valable comme code de secours de GRN Europe ;
  chaque église peut définir le sien (empreinte enregistrée, incluse dans le lien de configuration).
- Le lien de configuration contient les réglages simples, pas les images du PDF.
- Diaporama d'origine : public/diaporama/diapo-1…6.jpg (export de la présentation GRN) ;
  la diapositive 5 dit « 6593 languages » (à corriger dans la présentation si besoin).
- Mode borne actif sur l'adresse simple (choix de GRN Europe) : l'application démarre sur
  l'écran d'accueil (diaporama). ?presentation=0 désactive le mode borne (site normal).
- Publication : GitHub GRN-Europe/grn-map-v2 (public), Vercel équipe GRN-Europe (Hobby),
  adresse officielle https://map.grneu.org (CNAME map chez Hostinger vers Vercel ; ancienne adresse
  https://grn-map-v2.vercel.app). Git en ligne de commande n'est pas installé : les envois se font
  avec GitHub Desktop.
- Plein écran (mode borne) : le bouton ⛶ demande le code pour en sortir ; après une sortie par Échap
  ou geste, le plein écran revient au toucher suivant. Un site ne peut pas bloquer totalement la sortie :
  pour un vrai verrouillage, mode kiosque de l'appareil (Accès guidé iPad, Accès attribué Windows).
- Mises à jour : la borne vérifie toutes les heures s'il existe une nouvelle version et recharge
  la page au passage en veille (jamais pendant qu'un visiteur l'utilise).
- Toucher la mer (hors des pays) ferme le panneau du pays sélectionné (demande de GRN Europe).
- Recherche (loupe, comme en v1) : pays (nom dans la langue de la borne ou en anglais) et langues ;
  un pays ouvre son panneau, une langue ouvre directement son QR code.
- Bandeau d'accueil : bande blanche de 120 px en haut (agrandie à la demande de GRN Europe) (bordure orange), logo à gauche de la phrase ;
  la carte, le panneau d'un pays et l'écran de veille se placent dessous. « Valeurs par défaut »
  ne touche ni au code de l'église ni au bandeau.

- Ordre d'empilement (fin de styles.css) : carte / panneau / veille < bandeau < écran 5fish < fenêtres
  < « Code d'accès » (le bandeau recouvrait la barre « Retour à la carte »). QR codes inertes au toucher.
- « Ouvrir ici » : la page 5fish s'affiche dans un cadre (iframe) sous une barre sombre avec
  le bouton orange « ↩ Retour à la carte », le nom « Langue (Pays) » et
  « Retour à la carte dans m:ss ». Délai par défaut : 3 minutes, réglable.
  5fish s'y ouvre dans la langue de la borne (paramètre ?ui=fr|en|de|es|it|pt|nl) ; le QR code
  n'impose pas de langue (5fish suit alors la langue du téléphone du visiteur).
- Vidéos de 5fish (film JÉSUS, YouTube…) : elles ouvrent d'autres sites, bloqués dans le cadre
  de la borne (volontairement : le visiteur ne doit pas quitter la borne). Dans la barre sombre,
  « 📱 Vidéos : continuez sur votre téléphone » + petit QR code de la page de la langue (solution A).
- Pendant les 10 dernières secondes : fenêtre « Je suis toujours là » ; la toucher relance le délai.
- Les drapeaux de tous les pays apparaissent dès le premier zoom (comme en v1), en 20 × 14 px
  comme en v1 (32 × 24 puis 26 × 18 rendaient la carte brouillon) ; onglet Amériques cadré comme en v1.
- Écran d'accueil (demande de GRN Europe) : bulle « L'Évangile dans ta langue ici ! » posée sur le bord
  de la mini-carte (texte veilleBulle, 7 langues) et main animée (index tendu) qui va de pays en pays
  en « cliquant » (onde + pays éclairé) — src/curseur-veille.js.
- Diaporama de veille : chaque image reste 20 secondes par défaut (valeur de la v1), réglable.
- Écran de veille de la v1 : fond en dégradé bleu nuit (plus clair en haut au centre) ; deux
  cartes arrondies côte à côte de même taille — à gauche une carte du monde miniature
  (orange sur bleu nuit), à droite l'image du diaporama (le texte est dans l'image) ;
  logo GRN blanc centré dessous ; bouton plein écran en bas à droite.
- Carte (comme la v1) : plein écran ; en haut à gauche boutons + / − et « GRN map · + de 6 700
  langues » (sans le nombre de pays) ; au centre pastille blanche avec les onglets et la loupe
  de recherche ; en bas à gauche logo GRN ; en bas à droite plein écran et roue ⚙ des réglages.
- La langue de la borne est choisie par l'église dans les réglages (liste déroulante, pas sur
  la carte). Langues : fr, en, de, es, it, pt (portugais d'Europe), nl. Les traductions de, es,
  it, pt, nl ont été préparées par Claude et doivent être relues par des locuteurs natifs.
  Tout nouveau texte doit être ajouté dans les 7 fichiers de src/langues/. Phrase d'accueil de l'église : une case par
  langue, anglais par défaut si vide.
- Réglages de la v1 (étape 5), fenêtre blanche « Réglages de la borne » / « Ces réglages sont
  enregistrés sur cet appareil. » (en v2, la liste déroulante des langues remplace FR | EN) :
  1. d'abord « Code d'accès » + boutons « Valider » (orange) et « Fermer » ;
  2. puis : « Durée de chaque image du diaporama (secondes) » = 20 ;
     « Retour au diaporama après inactivité (secondes) » = 240 ;
     « Retour à la carte depuis le site GRN (secondes) » = 180 (v1 : 240, 3 min demandé pour la v2),
     aide « 0 = pas de retour automatique. Actif en mode borne uniquement. » ;
     « Images du diaporama » : « PDF « nom.pdf », 6 images, chargé le jj/mm/aaaa. »,
     « Une page du PDF = une image. Format paysage 16/9 conseillé. »,
     boutons « Charger un PDF » et « Diaporama d'origine » ;
     boutons « Enregistrer » (orange), « Copier le lien de configuration »,
     « Valeurs par défaut », « Fermer ».
  Le bandeau d'accueil de l'église (étape 6) s'ajoutera dans cette même fenêtre.
- Textes : police du système et tailles de la v1 (onglets 17 px, noms de langues 17 px demi-gras #333,
  nom du pays 28 px) — section « alignées sur la v1 » à la fin de styles.css.
- Couleurs de la v1 : mer bleu nuit #0c1a2b, pays orange brûlé #c4561a, onglet actif orange #ff6a13.
- Panneau d'un pays (rapidité sur tablette modeste, la Chine a 341 langues) : les 30 premières
  langues s'affichent tout de suite (nom seul), la suite par lots de 80 en rendant la main ;
  chaque petit QR code n'est calculé que lorsqu'il arrive à l'écran (IntersectionObserver),
  sa place de 64 × 64 px est réservée (carré pâle) ; QR codes gardés en mémoire (src/qr.js).
  Mesure (CPU ralenti ×6) : ouverture de la Chine 1,7 s → ~120 ms. Ne pas revenir à un calcul
  de tous les QR codes à l'ouverture.
- Outre-mer : world-atlas dessine la Guyane, la Guadeloupe, la Martinique, La Réunion et Mayotte
  dans la France. carte.js (separerLOutreMer) range ces morceaux dans des tracés à part (GF, GP, MQ,
  RE, YT), sans changer une seule coordonnée : chacun a son nom, son drapeau et ses langues 5fish.
  La mini-carte de l'écran de veille n'est pas concernée.
- Réglages, section « Mise à jour » (src/mise-a-jour.js) : « Version du … » = date de la publication
  (__DATE_VERSION__, fixée par vite.config.js à chaque « npm run build », donc à chaque envoi sur
  GitHub). Le bouton « Mettre à jour » lit /version.json sur internet (exclu de la mémoire hors ligne),
  et si la version publiée est plus récente : enregistrement.update() du service worker, attente de
  son activation, message « Mise à jour effectuée », rechargement. Sinon « La map est à jour » ;
  sans réseau « Pas de connexion internet… ». Le hors-ligne ne change pas.
- Carte sans fin (demande de GRN Europe) : en glissant à droite, les Amériques reviennent après l'Asie.
  carte.js : les vrais tracés sont dans <g id="pays-original"> (jamais modifiés), replacé sous le
  milieu de l'écran (tourActuel) ; des copies <use> à ±1 et ±2 tours du monde, affichées seulement
  si visibles (une copie se redessine à chaque mise en valeur). Toucher une copie : geoContains
  retrouve le pays. Les drapeaux vont sur l'exemplaire le plus proche du milieu de l'écran.
  Glissement horizontal sans limite (translateExtent ±Infinity).
- Toucher un pays (carte, drapeau ou recherche) : carte.montrerAGaucheDuPanneau(code) le fait glisser
  au milieu de la partie visible, à gauche du panneau des langues, sans changer le zoom.
- Version d'essai : branche « essais » (GitHub Desktop), publiée par Vercel en « Preview » à une adresse
  à part (…-git-essais-….vercel.app) ; « main » = map.grneu.org = les bornes. Une adresse différente a sa
  propre mémoire hors ligne : les bornes ne voient jamais l'essai. Sur l'essai (VERCEL_ENV=preview,
  __VERSION_ESSAI__, src/essai.js) : étiquette jaune « Version d'essai : pas pour les bornes », pas d'écran
  « Code d'accès » (les codes des Églises ne sont jamais consommés), réglages « Version d'essai du … ».
  Avant de déposer des fichiers chez Samuel, lui faire vérifier la branche active dans GitHub Desktop.
  Passer un essai en officiel : sur main, Branch > Merge into current branch… > essais, puis Push origin.
- Fluidité sur tablette modeste (Acer, 2026-11-13) : pendant un geste ou une animation, la carte n'est
  pas redessinée ; carte.js déplace/agrandit l'image déjà dessinée en CSS (svg et couche des drapeaux,
  will-change: transform) et redessine net à l'événement « end » de d3-zoom. Les gestes sont écoutés
  sur un cadre div (.cadre-carte) ; le svg fait 3 écrans de large (viewBox -largeur…2×largeur).
  Les drapeaux sont placés et chargés dès le démarrage (visibility: hidden) : les ~250 SVG de
  flag-icons préparés au premier zoom bloquaient la tablette > 1 s. Drapeaux hors écran : hidden.
  Largeur du panneau mesurée une fois par taille d'écran (pas au toucher).
- Toucher d'un pays (2026-11-13) : le pays choisi est dessiné dans un calque à part (g.selection,
  copie des tracés, pointer-events: none) au lieu d'une classe sur le tracé : changer une classe sur
  #pays-original forçait le navigateur à recopier toutes les copies <use> du monde. Le panneau ne lit
  ni n'écrit scrollTop à la première ouverture (mise en page forcée) ; les lignes de la liste ont
  content-visibility: auto (Chine : 341 langues mises en page seulement à l'écran).
- Logo GRN Europe en bas à gauche (2026-11-13) : simple image, plus de lien vers grneu.org
  (un toucher sur une borne ne doit pas faire sortir de la map).
