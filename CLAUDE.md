# Consignes pour Claude Code — GRN map v2

- Répondre et commenter le code en français.
- Garder le code simple : JavaScript sans framework, un fichier par zone de l'application.
- Borne tactile : grandes zones à toucher (≥ 52 px), jamais d'action au survol, pas de zoom de la page.
- Tout ce qui s'affiche doit fonctionner hors ligne (pas de ressources chargées depuis internet),
  sauf la page 5fish ouverte avec « Ouvrir ici ».
- Tout texte visible passe par `texte("cle")` (src/traductions.js) ; les textes sont dans
  src/langues/ (un fichier par langue, l'anglais sert de secours).
- Les liens 5fish pointent vers https://fivefish.org (5fish.mobi y redirige).
- Lancer : `npm run dev` (Node.js est dans /usr/local/bin).

## Décisions déjà prises

- Code d'accès : GRNERD par défaut et toujours valable comme code de secours de GRN Europe ;
  chaque église peut définir le sien (empreinte enregistrée, incluse dans le lien de configuration).
- Le lien de configuration contient les réglages simples, pas les images du PDF.
- Diaporama d'origine : public/diaporama/diapo-1…6.jpg (export de la présentation GRN) ;
  la diapositive 5 dit « 6593 languages » (à corriger dans la présentation si besoin).
- Mode borne actif sur l'adresse simple (choix de GRN Europe) : l'application démarre sur
  l'écran d'accueil (diaporama). ?presentation=0 désactive le mode borne (site normal).
- Publication : GitHub GRN-Europe/grn-map-v2 (public), Vercel équipe GRN-Europe (Hobby),
  https://grn-map-v2.vercel.app. Git en ligne de commande n'est pas installé : les envois se font
  avec GitHub Desktop.
- Recherche (loupe, comme en v1) : pays (nom dans la langue de la borne ou en anglais) et langues ;
  un pays ouvre son panneau, une langue ouvre directement son QR code.
- Bandeau d'accueil : bande blanche de 76 px en haut (bordure orange), logo à gauche de la phrase ;
  la carte, le panneau d'un pays et l'écran de veille se placent dessous. « Valeurs par défaut »
  ne touche ni au code de l'église ni au bandeau.

- « Ouvrir ici » : la page 5fish s'affiche dans un cadre (iframe) sous une barre sombre avec
  le bouton orange « ↩ Retour à la carte », le nom « Langue (Pays) » et
  « Retour à la carte dans m:ss ». Délai par défaut : 3 minutes, réglable.
- Pendant les 10 dernières secondes : fenêtre « Je suis toujours là » ; la toucher relance le délai.
- Les drapeaux de tous les pays apparaissent dès le premier zoom (comme en v1), en 20 × 14 px
  comme en v1 (32 × 24 puis 26 × 18 rendaient la carte brouillon) ; onglet Amériques cadré comme en v1.
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
- Couleurs de la v1 : mer bleu nuit #0c1a2b, pays orange brûlé #c4561a, onglet actif orange #ff6a13.
