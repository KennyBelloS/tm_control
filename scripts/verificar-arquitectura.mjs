#!/usr/bin/env node
/**
 * VERIFICA LA REGLA DE DEPENDENCIA (Arquitectura Limpia, R. C. Martin) — sin complicar nada, solo lo esencial:
 *   El código de adentro (reglas del negocio) no puede conocer al de afuera (pantallas, base de datos, navegador, Excel).
 *
 *   Regla 1 (obligatoria): los módulos PUROS de src/lib no importan React, la base de datos, Excel/PDF ni pantallas,
 *                           no usan document/window/localStorage/navigator, y solo dependen de otros módulos puros.
 *   Regla 2 (obligatoria): nada de src/lib importa de components/ ni de pages/ (la lógica no depende de la pantalla).
 *   Regla 3 (obligatoria): ningún archivo de texto del proyecto tiene marcas de conflicto de Git (<<<<<<<, =======, >>>>>>>).
 *   Aviso   (informativo): pantallas que consultan la base de datos directamente (deuda conocida; se corrige al tocar cada una).
 *
 * Uso:  npm run verificar-arquitectura        (falla si se rompe la regla 1 o 2)
 *       npm run verificar-arquitectura -- --estricto   (además falla con los avisos)
 * Al crear una regla nueva y pura: agrégala a PUROS y a su prueba.
 */
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), SRC = path.join(RAIZ, 'src');
export const PUROS = ['buscarColaborador', 'calculos', 'colaboradorCalculos', 'devolucionesAnalisis', 'devolucionesCalculos', 'clasificadorCalculos', 'resumenGeneral', 'resumenImagen', 'espacioProyeccion', 'notificaciones', 'respaldoBD', 'devolucionesImagen', 'devolucionesPresentacion', 'festivosColombia', 'fiestas', 'hitos', 'carruselVentana', 'avatares', 'seguridadSistema', 'actividadUsuarios', 'evolucionHoras', 'aprendeDetalle', 'nuevo', 'resumenAlcance', 'resumenEjecutivo', 'horario', 'personasPdf', 'aprende', 'recorrido', 'manualMarkdown', 'imagenBase', 'imagenRanking', 'personasUtil', 'respaldoGlobal', 'seguridad'];
const PROHIBIDO_IMPORT = /^(react|react-dom|react-router-dom|exceljs.*|jspdf.*|xlsx|html2canvas|apexcharts|@supabase\/.*)$/;
const GLOBALES = /\b(document|window|localStorage|sessionStorage|navigator)\s*[.\[]/;
const sinComentarios = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1').replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g, m => (m.startsWith('`') ? '``' : "''"));
const imports = s => [...s.matchAll(/(?:^|\n)\s*(?:import|export)\s[^;'"]*?from\s*['"]([^'"]+)['"]|(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g)].map(m => m[1] || m[2]);
const listar = (dir, ext) => fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? listar(path.join(dir, e.name), ext) : ext.test(e.name) ? [path.join(dir, e.name)] : [])) : [];

export function verificar() {
  const errores = [], avisos = [];
  for (const nombre of PUROS) {
    const f = path.join(SRC, 'lib', nombre + '.js'); if (!fs.existsSync(f)) { errores.push(`${nombre}.js figura como puro pero no existe`); continue; }
    const crudo = fs.readFileSync(f, 'utf8'), s = sinComentarios(crudo);
    for (const imp of imports(crudo)) {
      if (PROHIBIDO_IMPORT.test(imp)) errores.push(`lib/${nombre}.js importa "${imp}" (una regla pura no puede depender de eso)`);
      else if (imp.startsWith('.')) { const base = path.basename(imp).replace(/\.js$/, ''); if (/components|pages/.test(imp)) errores.push(`lib/${nombre}.js importa de la pantalla "${imp}"`); else if (!PUROS.includes(base)) errores.push(`lib/${nombre}.js importa "${imp}", que no es un módulo puro`); }
    }
    const g = s.match(GLOBALES); if (g) errores.push(`lib/${nombre}.js usa "${g[1]}" (el navegador es infraestructura, no va en una regla pura)`);
  }
  // Regla 3: marcas de conflicto de Git en cualquier archivo de texto (rompen la compilación y suelen pasar desapercibidas)
  const TEXTO = /\.(jsx?|mjs|cjs|css|html|json|sql|md|txt|webmanifest)$/i, SALTAR = /(^|[\\/])(node_modules|dist|dev-dist|\.git)([\\/]|$)/;
  for (const f of listar(RAIZ, TEXTO)) {
    if (SALTAR.test(path.relative(RAIZ, f)) || /package-lock\.json$/.test(f)) continue;
    const md = /\.md$/i.test(f);
    fs.readFileSync(f, 'utf8').split(/\r?\n/).forEach((l, i) => { if (/^(<<<<<<<|>>>>>>>) /.test(l) || (!md && /^=======$/.test(l))) errores.push(`${path.relative(RAIZ, f).replace(/\\/g, '/')}:${i + 1} tiene una marca de conflicto de Git ("${l.slice(0, 20)}"): resuélvela antes de continuar`); });
  }
  for (const f of listar(path.join(SRC, 'lib'), /\.jsx?$/)) for (const imp of imports(fs.readFileSync(f, 'utf8'))) if (/^\.\.\/(components|pages)\b/.test(imp)) errores.push(`lib/${path.basename(f)} importa de ${imp}: la lógica no puede depender de la pantalla`);
  for (const f of listar(path.join(SRC, 'pages'), /\.jsx$/).concat(listar(path.join(SRC, 'components'), /\.jsx$/))) if (imports(fs.readFileSync(f, 'utf8')).some(i => /supabaseClient$/.test(i))) avisos.push(path.relative(SRC, f).replace(/\\/g, '/'));
  return { errores, avisos };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { errores, avisos } = verificar(), estricto = process.argv.includes('--estricto');
  console.log(`Regla de dependencia: ${PUROS.length} módulos puros revisados.`);
  if (errores.length) { console.log('\n✗ SE ROMPE LA REGLA:'); errores.forEach(e => console.log('  · ' + e)); }
  else console.log('✓ Ningún módulo puro depende de la base de datos, la pantalla ni el navegador.');
  if (avisos.length) { console.log(`\nAviso (deuda conocida): ${avisos.length} pantalla(s) consultan la base de datos directamente:`); avisos.forEach(a => console.log('  · ' + a)); console.log('  → Al tocar cada una, mueve la consulta a un módulo de src/lib (adaptador) y que la pantalla solo lo use.'); }
  process.exit(errores.length || (estricto && avisos.length) ? 1 : 0);
}
