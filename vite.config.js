import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
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
        // Installed app opens straight into the product, not the marketing site
        start_url: '/login',
        scope: '/',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache only the app shell (JS/CSS/HTML/fonts) — images are runtime-cached
        // instead so installing the app doesn't download every marketing photo.
        globPatterns: ['**/*.{js,css,html,woff2}', 'pwa-*.png', 'favicon.png'],
        navigateFallback: '/index.html',
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
