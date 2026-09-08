import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    // exceljs y jspdf usan Buffer/process internamente aunque se ejecuten
    // 100% en el navegador; esto evita el error "error loading dynamically
    // imported module" al exportar Excel/PDF.
    nodePolyfills({ include: ['buffer', 'process'] }),
  ],
  server: {
    port: 5173,
    open: true
  },
  optimizeDeps: {
    include: ['exceljs/dist/exceljs.min.js']
  }
})
