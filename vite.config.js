import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { mkdirSync, existsSync, statSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

// El service worker se genera en una carpeta temporal. Si en la carpeta temporal del sistema (en Windows:
// C:\Users\<usuario>\AppData\Local\Temp) hay un package.json ajeno o dañado, la compilación falla con
// "Unable to write the service worker file ... JSON". Por eso se usa una carpeta temporal DENTRO del proyecto.
const carpetaTemporal = path.resolve(process.cwd(), 'node_modules', '.cache', 'tm-temp')
mkdirSync(carpetaTemporal, { recursive: true })
process.env.TEMP = process.env.TMP = process.env.TMPDIR = carpetaTemporal
const { VitePWA } = await import('vite-plugin-pwa')   // se carga DESPUÉS de fijar la carpeta temporal

/**
 * Las funciones de la carpeta api/ (crear usuarios, gestionar usuarios, copia automática) son funciones de Vercel: en producción
 * existen solas, pero `npm run dev` no las conoce y respondía 404. Este complemento las sirve también en desarrollo.
 * La llave de servicio (SUPABASE_SERVICE_ROLE_KEY) se lee de tu archivo .env SOLO en el servidor de desarrollo: nunca llega al navegador.
 */
function apiEnDesarrollo(mode) {
  return {
    name: 'tm-api-en-desarrollo',
    apply: 'serve',
    configureServer(server) {
      for (const [k, v] of Object.entries(loadEnv(mode, process.cwd(), ''))) if (process.env[k] === undefined) process.env[k] = v
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) return next()
        const nombre = req.url.slice(5).split('?')[0].replace(/[^a-z0-9-]/gi, '')
        const enviar = (codigo, obj) => { res.statusCode = codigo; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(obj)) }
        if (!nombre || nombre.startsWith('_') || !existsSync(path.resolve(process.cwd(), 'api', `${nombre}.js`))) return enviar(404, { error: `No existe el servicio /api/${nombre}.` })
        const trozos = []; for await (const t of req) trozos.push(t)
        const crudo = Buffer.concat(trozos).toString('utf8')
        try { req.body = crudo ? JSON.parse(crudo) : {} } catch { req.body = {} }
        res.status = c => { res.statusCode = c; return res }                                    // lo mismo que ofrece Vercel
        res.json = o => { if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(o)); return res }
        try {
          const archivo = path.resolve(process.cwd(), 'api', `${nombre}.js`)          // con el cargador normal de Node (no el de Vite, que cambia `process` y vacía las variables del .env)
          const modulo = await import(`${pathToFileURL(archivo).href}?v=${statSync(archivo).mtimeMs}`); await modulo.default(req, res)
        }
        catch (e) { console.error(`/api/${nombre}:`, e); if (!res.writableEnded) enviar(500, { error: 'Error del servicio en desarrollo. Mira la ventana donde corre npm run dev.' }) }
      })
    }
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [
    apiEnDesarrollo(mode),
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
        globIgnores: ['splash/**', '**/pdf.worker*'],   // las pantallas de arranque de iPhone y el lector de PDF (1,4 MB) no se descargan con la app
        sourcemap: false,                    // sin mapa de código del service worker (no hace falta en producción)
        cleanupOutdatedCaches: true,
        clientsClaim: true,                  // la versión instalada controla la pantalla desde el primer momento
        navigateFallback: '/index.html',
        runtimeCaching: [
          {                                      // guardar cambios y la sesión: nunca desde el caché
            urlPattern: ({ url }) => url.pathname.startsWith('/rest/v1') || url.pathname.startsWith('/auth/v1'),
            handler: 'NetworkOnly',
          },
          {                                      // el lector de PDF se guarda la primera vez que se usa
            urlPattern: ({ url }) => /pdf\.worker/.test(url.pathname),
            handler: 'CacheFirst',
            options: { cacheName: 'lector-pdf', expiration: { maxEntries: 2 } },
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
