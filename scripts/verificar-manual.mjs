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
import { extraerBloque, parsear, versiones, normalizar, novedades } from '../src/lib/manualMarkdown.js';
import { revisarDetalle } from '../src/lib/aprendeDetalle.js';
import { INICIO_PROYECTO } from '../src/lib/proyecto.js';
import { PASOS, VISUALES, revisarRecorrido } from '../src/lib/recorrido.js';
import { LECCIONES, revisarLecciones } from '../src/lib/aprende.js';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const leer = f => fs.readFileSync(path.join(raiz, f), 'utf8');

export function revisar({ manual, sidebar, pkg, pasos = PASOS, visuales = '', lecciones = LECCIONES, nuevoSrc = null }) {
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
  errores.push(...revisarDetalle(lecciones));
  if (visuales) { const m = /export const VISUAL = \{([^}]*)\}/.exec(visuales); const hay = new Set((m?.[1] || '').split(',').map(x => x.split(':')[0].trim()).filter(Boolean)); for (const v of VISUALES) if (!hay.has(v)) errores.push(`Falta el dibujo "${v}" en src/components/recorrido/Visuales.jsx.`); }
  const vs = versiones(manual);
  if (!vs.length) errores.push('El Historial de cambios no tiene ninguna entrada "### Versión X.Y.Z — dd/mm/aaaa · título".');
  else if (vs[0].version !== pkg.version) errores.push(`La versión de package.json es ${pkg.version} pero la entrada más reciente del Historial es ${vs[0].version}. Agrega arriba "### Versión ${pkg.version} — …" y describe lo nuevo.`);
  // El historial debe ser coherente: cada versión con su fecha y su esfuerzo, y las fechas nunca retroceden (la más nueva no puede ser anterior a la más vieja).
  const hist = novedades(manual), iso = f => { const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(f || ''); return m ? `${m[3]}-${m[2]}-${m[1]}` : null; };
  for (let i = 0; i < hist.length; i++) {
    const e = hist[i];
    if (!iso(e.fecha)) errores.push(`La versión ${e.version} del Historial no tiene fecha dd/mm/aaaa.`);
    if (!(e.esfuerzo > 0)) errores.push(`La versión ${e.version} del Historial no dice cuánto tomó: agrega «(≈ N días)» al final del título.`);
    if (i + 1 < hist.length && iso(e.fecha) && iso(hist[i + 1].fecha) && iso(e.fecha) < iso(hist[i + 1].fecha)) errores.push(`Las fechas del Historial retroceden: la versión ${e.version} (${e.fecha}) es anterior a la ${hist[i + 1].version} (${hist[i + 1].fecha}).`);
  }
  // El historial arranca con el proyecto: la primera versión cae en los primeros 10 días desde INICIO_PROYECTO (src/lib/proyecto.js).
  if (hist.length) { const pri = iso(hist.at(-1).fecha), tope = new Date(Date.parse(INICIO_PROYECTO) + 10 * 864e5).toISOString().slice(0, 10); if (pri && (pri < INICIO_PROYECTO || pri > tope)) errores.push(`La primera versión (${hist.at(-1).version}, ${hist.at(-1).fecha}) debe caer entre el inicio del proyecto (${INICIO_PROYECTO}) y 10 días después.`); }
  if (nuevoSrc !== null) {
  // Cada versión nueva debe traer su «Nuevo»: al menos una función registrada (src/lib/nuevo.js) con la versión actual, y todas con una versión que exista.
  const reg = [...nuevoSrc.matchAll(/'?([\w-]+)'?:\s*'(\d+\.\d+\.\d+)'/g)].map(m => [m[1], m[2]]);
  if (!reg.some(([, v]) => v === pkg.version)) errores.push(`Ninguna función de src/lib/nuevo.js lleva la versión ${pkg.version}: cada versión debe marcar sus funciones nuevas con «Nuevo».`);
  for (const [id, v] of reg) if (!hist.some(e => e.version === v)) errores.push(`La función «${id}» de src/lib/nuevo.js apunta a la versión ${v}, que no está en el Historial.`);
  }
  const tecnico = extraerBloque(manual, 'TECNICO');
  for (const c of Object.keys(pkg.scripts || {})) if (!tecnico.includes('`npm run ' + c + '`') && !['dev', 'preview', 'build'].includes(c)) errores.push(`El comando "npm run ${c}" no está en la tabla "Comandos útiles" del manual.`);
  return errores;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const errores = revisar({ manual: leer('MANUAL.md'), sidebar: leer('src/components/Sidebar.jsx'), pkg: JSON.parse(leer('package.json')), visuales: leer('src/components/recorrido/Visuales.jsx'), nuevoSrc: leer('src/lib/nuevo.js') });
  console.log('Manual: ' + (errores.length ? `${errores.length} problema(s)` : 'al día con la app'));
  for (const e of errores) console.log('  ✗ ' + e);
  if (!errores.length) console.log('✓ Cada módulo del menú tiene su explicación, su paso en el recorrido y su lección interactiva; la versión y los comandos están en MANUAL.md.');
  process.exit(errores.length ? 1 : 0);
}
