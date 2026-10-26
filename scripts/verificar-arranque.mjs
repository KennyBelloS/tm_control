#!/usr/bin/env node
/**
 * Comprueba que el ARRANQUE de la app no arrastra librerías pesadas (Excel, PDF, gráficos): esas se cargan solo cuando una pantalla las necesita.
 * Sigue los imports estáticos desde src/main.jsx (los import() dinámicos no cuentan). Se ejecuta con: npm run verificar-arranque
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const src = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');
const PESADAS = ['xlsx', 'exceljs', 'jspdf', 'html2canvas', 'apexcharts', 'react-apexcharts', 'pdfjs-dist'];
const resolver = (desde, spec) => { if (!spec.startsWith('.')) return null; const b = path.resolve(path.dirname(desde), spec); for (const e of ['', '.js', '.jsx', '/index.js', '/index.jsx']) if (fs.existsSync(b + e) && fs.statSync(b + e).isFile()) return b + e; return null; };
const importa = f => { const t = fs.readFileSync(f, 'utf8'), out = []; for (const m of t.matchAll(/^\s*(?:import|export)\s[^;]*?from\s+['"]([^'"]+)['"]/gm)) out.push(m[1]); for (const m of t.matchAll(/^import\s+['"]([^'"]+)['"]/gm)) out.push(m[1]); return out; };
const visto = new Map([[path.join(src, 'main.jsx'), null]]), cola = [path.join(src, 'main.jsx')], faltas = [];
while (cola.length) {
  const f = cola.shift();
  for (const s of importa(f)) {
    if (PESADAS.some(p => s === p || s.startsWith(p + '/'))) { const c = [f]; let p = visto.get(f); while (p) { c.push(p); p = visto.get(p); } faltas.push(`${s} ← ${c.reverse().map(x => path.relative(src, x)).join(' → ')}`); }
    const r = resolver(f, s); if (r && !visto.has(r)) { visto.set(r, f); cola.push(r); }
  }
}
console.log('Arranque: ' + (faltas.length ? `${faltas.length} cadena(s) con librerías pesadas` : 'ligero (sin librerías pesadas)'));
for (const x of faltas) console.log('  ✗ ' + x);
if (!faltas.length) console.log(`✓ ${visto.size} archivos en el arranque y ninguno trae Excel, PDF ni gráficos.`);
process.exit(faltas.length ? 1 : 0);
