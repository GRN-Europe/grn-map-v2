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

export default defineConfig({
  // Deux pages : la carte (index.html) et l'administration des codes (admin.html)
  build: {
    rollupOptions: {
      input: { carte: resolve('index.html'), admin: resolve('admin.html') },
    },
  },
  plugins: [
    apiLocale,
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
