import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// '/' for the real domain; '/app/' for Catalyst's development URL
// (build with DEPLOY_BASE=/app/ for the dev-URL package)
const BASE = process.env.DEPLOY_BASE || '/'

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // installed apps silently pick up each new deploy
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'FeaziMove — Smart Urban Mobility',
        short_name: 'FeaziMove',
        description: 'Scheduled ride-sharing that matches daily commuters with car owners/drivers along shared routes. The Feazi Way.',
        theme_color: '#1a2400',
        background_color: '#0a0a0a',
        display: 'standalone',
        orientation: 'portrait',
        // Installed app opens at the app root — the only path guaranteed to
        // exist server-side (Catalyst static hosting has no SPA fallback, so
        // deep-link start_urls like 'login' 404 on first launch, e.g. on iOS).
        start_url: '.',
        scope: BASE,
        // Relative srcs resolve against the manifest URL, so icons work at the
        // domain root and under Catalyst's /app/ path alike.
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache only the app shell (JS/CSS/HTML/fonts) — images are runtime-cached
        // instead so installing the app doesn't download every marketing photo.
        globPatterns: ['**/*.{js,css,html,woff2}', 'pwa-*.png', 'favicon.png'],
        navigateFallback: BASE + 'index.html',
        // API requests must never be answered by the SPA shell
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ request, url }) => request.destination === 'image' && !url.pathname.startsWith('/api/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'feazimove-images',
              expiration: { maxEntries: 80, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
        ],
      },
    }),
    {
      // Catalyst serves the "404" page from client-package.json for unknown
      // paths, but rejects index.html as that page — ship a copy named
      // 404.html so deep links (/app/login etc.) load the app shell instead
      // of Catalyst's "Site Not Found".
      name: 'spa-404-fallback',
      closeBundle() {
        const dist = path.resolve(__dirname, 'dist')
        fs.copyFileSync(path.join(dist, 'index.html'), path.join(dist, '404.html'))
      },
    },
  ],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Never expose sourcemaps in production
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          animations: ['framer-motion'],
        },
      },
    },
  },
})
