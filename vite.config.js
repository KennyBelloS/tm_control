import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

// El service worker se genera en una carpeta temporal. Si en la carpeta temporal del sistema (en Windows:
// C:\Users\<usuario>\AppData\Local\Temp) hay un package.json ajeno o dañado, la compilación falla con
// "Unable to write the service worker file ... JSON". Por eso se usa una carpeta temporal DENTRO del proyecto.
const carpetaTemporal = path.resolve(process.cwd(), 'node_modules', '.cache', 'tm-temp')
mkdirSync(carpetaTemporal, { recursive: true })
process.env.TEMP = process.env.TMP = process.env.TMPDIR = carpetaTemporal
const { VitePWA } = await import('vite-plugin-pwa')   // se carga DESPUÉS de fijar la carpeta temporal

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    nodePolyfills({ include: ['buffer', 'process'] }),
    VitePWA({
      disable: mode === 'sinpwa',          // npm run build:sin-pwa → compila sin la parte de la app instalada (solo para diagnosticar)
      registerType: 'prompt',            // la actualización la aplica src/lib/actualizacionApp.js (sin que la persona recargue ni reinstale)
      injectRegister: false,
      devOptions: { enabled: false },       // en desarrollo (npm run dev) NO se genera service worker: no hace falta y daba error en algunos equipos Windows
      includeAssets: ['icons/favicon-16.png', 'icons/favicon-32.png', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Torremolinos · TMControl',
        short_name: 'TMControl',
        description: 'Sistema de gestión de producción y rendimientos — Falcon Farms Torremolinos.',
        theme_color: '#166534',
        background_color: '#0B3D22',        // el fondo de la pantalla de arranque en Android: verde de la marca (antes era blanco)
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
        globIgnores: ['splash/**'],         // las pantallas de arranque de iPhone no se descargan con la app
        sourcemap: false,                    // sin mapa de código del service worker (no hace falta en producción)
        cleanupOutdatedCaches: true,
        clientsClaim: true,                  // la versión instalada controla la pantalla desde el primer momento
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
}))
