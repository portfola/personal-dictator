import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Don't let the SPA navigation fallback swallow API navigations
        // (e.g. /api/auth/login and the /api/auth/callback redirect) —
        // those must reach the backend, not be served index.html.
        navigateFallbackDenylist: [/^\/api\//],
      },
      manifest: {
        name: 'Personal Dictator',
        short_name: 'Dictator',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  server: {
    proxy: { '/api': 'http://localhost:8000' },
  },
})
