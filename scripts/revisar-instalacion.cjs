#!/usr/bin/env node
/**
 * Revisa que ningún package.json dentro de node_modules esté dañado.
 * Un archivo dañado hace fallar el build con mensajes confusos, p. ej.
 *   "Unable to write the service worker file. 'No number after minus sign in JSON ...'"
 * Uso:  npm run revisar-instalacion
 * Si lista archivos dañados:  rmdir /s /q node_modules   y luego   npm install
 */
const fs = require('fs'), p = require('path');
const raiz = p.resolve(__dirname, '..', 'node_modules'); const malos = []; let n = 0;
if (!fs.existsSync(raiz)) { console.log('No existe node_modules: ejecuta  npm install'); process.exit(1); }
(function recorrer(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = p.join(d, e.name);
    if (e.isDirectory()) recorrer(f);
    else if (e.name === 'package.json') { n++; try { JSON.parse(fs.readFileSync(f, 'utf8')); } catch (x) { malos.push(f + '  ->  ' + x.message); } }
  }
})(raiz);
console.log(n + ' package.json revisados');
if (malos.length) { console.log('\nDAÑADOS:'); malos.forEach(m => console.log('  · ' + m)); console.log('\nSolución: borra node_modules (rmdir /s /q node_modules) y ejecuta npm install'); process.exit(1); }
console.log('✓ Todos son válidos');
