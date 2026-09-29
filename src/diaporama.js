// Images du diaporama de veille.
// - Diaporama d'origine : les images du dossier public/diaporama/ (issues de la présentation GRN).
// - Diaporama d'une église : un PDF chargé dans les réglages ; chaque page devient une image.

import { lireDiaporamaPdf, enregistrerDiaporamaPdf, effacerDiaporamaPdf } from './stockage.js';

// Images d'origine (dans public/diaporama/). Pour les changer : remplacer ces fichiers,
// en format paysage 16/9 (1920 × 1080 conseillé).
const IMAGES_D_ORIGINE = [1, 2, 3, 4, 5, 6].map((n) => `/diaporama/diapo-${n}.jpg`);

// Largeur des images fabriquées à partir d'un PDF (en pixels)
const LARGEUR_IMAGE_PDF = 1920;

// Renvoie les images à afficher et une description pour les réglages :
// { adresses: [...], pdf: null | { nom, date, nombre } }
export async function imagesDuDiaporama() {
  const pdf = await lireDiaporamaPdf();
  if (pdf && pdf.images.length > 0) {
    return {
      adresses: pdf.images.map((image) => URL.createObjectURL(image)),
      pdf: { nom: pdf.nom, date: pdf.date, nombre: pdf.images.length },
    };
  }
  return { adresses: IMAGES_D_ORIGINE, pdf: null };
}

export function nombreImagesDOrigine() {
  return IMAGES_D_ORIGINE.length;
}

// Transforme un fichier PDF en images et les enregistre sur l'appareil
export async function chargerPdf(fichier) {
  // pdf.js est gros : on ne le télécharge que lorsqu'on charge un PDF
  const pdfjs = await import('pdfjs-dist');
  const { default: adresseTravailleur } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = adresseTravailleur;

  const document = await pdfjs.getDocument({ data: await fichier.arrayBuffer() }).promise;
  const images = [];

  for (let numero = 1; numero <= document.numPages; numero += 1) {
    const page = await document.getPage(numero);
    // Échelle choisie pour obtenir une image de 1920 pixels de large
    const echelle = LARGEUR_IMAGE_PDF / page.getViewport({ scale: 1 }).width;
    const vue = page.getViewport({ scale: echelle });

    const toile = window.document.createElement('canvas');
    toile.width = Math.round(vue.width);
    toile.height = Math.round(vue.height);
    await page.render({ canvas: toile, viewport: vue }).promise;

    images.push(await new Promise((resoudre) => toile.toBlob(resoudre, 'image/jpeg', 0.85)));
  }

  await enregistrerDiaporamaPdf({ nom: fichier.name, date: new Date().toISOString(), images });
  return images.length;
}

// Revient au diaporama d'origine
export function revenirAuDiaporamaDOrigine() {
  return effacerDiaporamaPdf();
}
