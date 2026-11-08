import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/rondo/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'Rondo',
        short_name: 'Rondo',
        description: 'Routinen Schritt für Schritt',
        lang: 'de',
        id: '/rondo/',
        start_url: '/rondo/',
        scope: '/rondo/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#14141c',
        background_color: '#14141c',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,webmanifest}'],
        navigateFallback: '/rondo/index.html',
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
  },
});
