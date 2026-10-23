#!/usr/bin/env node
/**
 * Comprueba que el MANUAL.md está al día con la app (se ejecuta con: npm run verificar-manual):
 *   1. Tiene las tres zonas (USO, TECNICO, NOVEDADES).
 *   2. Cada módulo del menú lateral aparece en la tabla "Módulos incluidos" y tiene su sección en "Cómo se usa cada módulo".
 *   3. La versión de package.json tiene su entrada en el Historial de cambios (y es la más reciente).
 *   4. Cada comando de package.json está en la tabla de comandos útiles.
 *   5. El recorrido animado (src/lib/recorrido.js): un paso por cada módulo del menú, textos cortos y un dibujo para cada paso.
 *   6. El manual interactivo (src/lib/aprende.js): una lección por cada módulo, con su simulador (o cartas) y su reto bien armado.
 * Falla (código 1) si falta algo: así no se publica una función sin explicarla.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extraerBloque, parsear, versiones, normalizar } from '../src/lib/manualMarkdown.js';
import { PASOS, VISUALES, revisarRecorrido } from '../src/lib/recorrido.js';
import { LECCIONES, revisarLecciones } from '../src/lib/aprende.js';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const leer = f => fs.readFileSync(path.join(raiz, f), 'utf8');

export function revisar({ manual, sidebar, pkg, pasos = PASOS, visuales = '', lecciones = LECCIONES }) {
  const errores = [];
  for (const z of ['USO', 'TECNICO', 'NOVEDADES']) if (!extraerBloque(manual, z)) errores.push(`Falta la zona <!-- ${z}:INICIO --> … <!-- ${z}:FIN --> en el manual.`);
  const uso = extraerBloque(manual, 'USO'), bloques = parsear(uso);
  const tabla = bloques.find(b => b.tipo === 'tabla' && /^m[oó]dulo$/i.test(b.cabecera[0] || ''));
  const enTabla = new Set((tabla?.filas || []).map(f => normalizar(f[0].replace(/\*\*/g, '')).trim()));
  const titulos = new Set(bloques.filter(b => b.tipo === 'h' && b.nivel === 3).map(b => normalizar(b.texto)));
  const etiquetas = [...sidebar.matchAll(/label:\s*'([^']+)'/g)].map(m => m[1]);
  if (!etiquetas.length) errores.push('No se pudieron leer los módulos del menú (src/components/Sidebar.jsx).');
  for (const e of etiquetas) {
    const n = normalizar(e);
    if (!enTabla.has(n) && !(e === 'TIC' && enTabla.has('tic'))) errores.push(`El módulo "${e}" del menú no está en la tabla "Módulos incluidos" del manual.`);
    const tieneSeccion = [...titulos].some(t => t.includes(n)) || (e === 'TIC' && [...titulos].some(t => t.startsWith('tic')));
    if (!tieneSeccion) errores.push(`El módulo "${e}" no tiene su sección en "Cómo se usa cada módulo" (un título ### que lo mencione).`);
  }
  // El recorrido animado: cada módulo del menú con su paso, textos cortos y un dibujo para cada paso.
  const claves = [...sidebar.matchAll(/key:\s*'([^']+)'/g)].map(m => m[1]);
  errores.push(...revisarRecorrido(claves, pasos));
  errores.push(...revisarLecciones(claves, lecciones, pasos));
  if (visuales) { const m = /export const VISUAL = \{([^}]*)\}/.exec(visuales); const hay = new Set((m?.[1] || '').split(',').map(x => x.split(':')[0].trim()).filter(Boolean)); for (const v of VISUALES) if (!hay.has(v)) errores.push(`Falta el dibujo "${v}" en src/components/recorrido/Visuales.jsx.`); }
  const vs = versiones(manual);
  if (!vs.length) errores.push('El Historial de cambios no tiene ninguna entrada "### Versión X.Y.Z — dd/mm/aaaa · título".');
  else if (vs[0].version !== pkg.version) errores.push(`La versión de package.json es ${pkg.version} pero la entrada más reciente del Historial es ${vs[0].version}. Agrega arriba "### Versión ${pkg.version} — …" y describe lo nuevo.`);
  const tecnico = extraerBloque(manual, 'TECNICO');
  for (const c of Object.keys(pkg.scripts || {})) if (!tecnico.includes('`npm run ' + c + '`') && !['dev', 'preview', 'build'].includes(c)) errores.push(`El comando "npm run ${c}" no está en la tabla "Comandos útiles" del manual.`);
  return errores;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const errores = revisar({ manual: leer('MANUAL.md'), sidebar: leer('src/components/Sidebar.jsx'), pkg: JSON.parse(leer('package.json')), visuales: leer('src/components/recorrido/Visuales.jsx') });
  console.log('Manual: ' + (errores.length ? `${errores.length} problema(s)` : 'al día con la app'));
  for (const e of errores) console.log('  ✗ ' + e);
  if (!errores.length) console.log('✓ Cada módulo del menú tiene su explicación, su paso en el recorrido y su lección interactiva; la versión y los comandos están en MANUAL.md.');
  process.exit(errores.length ? 1 : 0);
}
