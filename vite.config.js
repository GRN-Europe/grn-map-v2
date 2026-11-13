// Configuration de Vite (l'outil qui prépare le site pour la publication).
//
// Le module « PWA » rend l'application :
// - installable (icône sur l'écran d'accueil, ouverture en plein écran comme une application) ;
// - utilisable hors ligne : après une première visite, la carte, les langues, les QR codes,
//   le bandeau et le diaporama fonctionnent sans internet. Seules l'écoute sur le téléphone
//   du visiteur et « Ouvrir ici » (page 5fish) ont besoin d'internet.
// À chaque nouvelle publication, la borne récupère automatiquement la nouvelle version
// dès qu'elle a de nouveau internet.

import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Sur l'ordinateur (npm run dev), les adresses /api/… (codes d'accès) sont servies par les
// mêmes fichiers que sur Vercel (dossier api/), avec une base de données en mémoire.
const apiLocale = {
  name: 'api-locale',
  configureServer(serveur) {
    serveur.middlewares.use(async (req, res, suite) => {
      const nom = req.url.match(/^\/api\/([a-z]+)(\?|$)/)?.[1];
      if (!nom) return suite();
      try {
        const module = await import(pathToFileURL(resolve('api', `${nom}.js`)).href);
        await module.default(req, res);
      } catch (erreur) {
        res.statusCode = 500;
        res.end(String(erreur));
      }
    });
  },
};

// Date de cette version de l'application : elle change automatiquement à chaque publication
// (Vercel refait « npm run build » à chaque envoi sur GitHub). Elle est :
// - écrite dans le code (__DATE_VERSION__) : c'est la « version installée » des réglages ;
// - publiée dans /version.json, jamais gardé hors ligne : le bouton « Mettre à jour » le lit
//   sur internet pour savoir s'il existe une version plus récente.
const DATE_VERSION = new Date().toISOString();

// Version d'essai : Vercel publie chaque branche autre que « main » (par ex. « essais ») à une
// adresse à part (« Preview »), avec VERCEL_ENV = 'preview'. Les bornes, elles, sont sur
// map.grneu.org (branche « main ») et ne voient jamais la version d'essai : une adresse web
// différente a sa propre mémoire hors ligne et son propre bouton « Mettre à jour ».
const VERSION_ESSAI = process.env.VERCEL_ENV === 'preview';

const fichierVersion = {
  name: 'fichier-version',
  // Pendant « npm run dev »
  configureServer(serveur) {
    serveur.middlewares.use('/version.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify({ version: DATE_VERSION }));
    });
  },
  // Dans la version publiée (dossier dist/)
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version: DATE_VERSION }) });
  },
};

export default defineConfig({
  define: {
    __DATE_VERSION__: JSON.stringify(DATE_VERSION),
    __VERSION_ESSAI__: JSON.stringify(VERSION_ESSAI),
  },
  // Deux pages : la carte (index.html) et l'administration des codes (admin.html)
  build: {
    rollupOptions: {
      input: { carte: resolve('index.html'), admin: resolve('admin.html') },
    },
  },
  plugins: [
    apiLocale,
    fichierVersion,
    VitePWA({
      registerType: 'autoUpdate', // met à jour l'application sans rien demander
      includeAssets: ['icones/apple-touch-icon.png'],
      manifest: {
        name: 'GRN map',
        short_name: 'GRN map',
        description: 'Carte des langues de Global Recordings Network : l’Évangile dans votre langue de cœur.',
        lang: 'fr',
        start_url: '/',
        display: 'fullscreen',      // plein écran, sans barre du navigateur
        background_color: '#0c1a2b',
        theme_color: '#0c1a2b',
        icons: [
          { src: '/icones/icone-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icones/icone-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icones/icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Fichiers gardés sur l'appareil pour fonctionner hors ligne :
        // code, styles, drapeaux (svg), images du diaporama (jpg), icônes (png)
        globPatterns: ['**/*.{js,mjs,css,html,svg,jpg,png,json}'],
        // … sauf version.json, qui doit toujours venir d'internet (bouton « Mettre à jour »)
        globIgnores: ['version.json'],
        // Certains fichiers dépassent la limite par défaut (2 Mo), comme le lecteur de PDF
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Toute adresse de l'application (par ex. …/?config=…) s'ouvre aussi hors ligne
        navigateFallback: '/index.html',
        // … sauf l'administration et les adresses du serveur, qui ne sont pas la carte
        navigateFallbackDenylist: [/^\/admin/, /^\/api\//],
      },
    }),
  ],
});
