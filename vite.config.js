import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({ include: ['buffer', 'process'] }),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: true, type: 'module' },
      includeAssets: ['icons/favicon-16.png', 'icons/favicon-32.png', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Torremolinos · TMControl',
        short_name: 'TMControl',
        description: 'Sistema de gestión de producción y rendimientos — Falcon Farms Torremolinos.',
        theme_color: '#166534',
        background_color: '#F5F4EF',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/rest/v1') || url.pathname.startsWith('/auth/v1'),
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    open: true
  },
  optimizeDeps: {
    include: ['exceljs/dist/exceljs.min.js']
  }
})
