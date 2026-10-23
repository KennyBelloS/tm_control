/** ESTIMACIÓN DEL ESPACIO — infraestructura: mide cuánto ocupa cada tabla y a qué ritmo entran datos. Las reglas están en espacioProyeccion.js. */
import { supabase } from './supabaseClient';
import { TABLAS_CON_FECHA, corteSemestral, mesesEntre } from './respaldoBD';
import { fechaMasAntigua, contarAnteriores, listarBackupsAutomaticos } from './respaldoBDDatos';
import { proyectarEspacio, ahorroDepuracion, consejos } from './espacioProyeccion';

const VENTANA_DIAS = 60;
const restarDias = (iso, n) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); };

/** Cuánto ocupa cada tabla (null si todavía no se ejecutó la sección 31 del SQL). */
async function tamanos() {
  const { data, error } = await supabase.rpc('uso_por_tabla');
  return error || !Array.isArray(data) ? null : data.map(x => ({ tabla: x.tabla, bytes: Number(x.bytes), filas: Number(x.filas) }));
}
/** Filas nuevas por día en cada tabla con fecha, medidas en los últimos 60 días (o en los días que lleve la base, si es menos). */
async function ritmoPorTabla(hoy, antigua) {
  const dias = Math.max(1, Math.min(VENTANA_DIAS, antigua ? Math.round((new Date(`${hoy}T12:00:00Z`) - new Date(`${antigua}T12:00:00Z`)) / 864e5) + 1 : VENTANA_DIAS));
  const desde = restarDias(hoy, VENTANA_DIAS), out = {};
  await Promise.all(TABLAS_CON_FECHA.map(async t => { const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true }).gte('fecha', desde); out[t] = error ? 0 : (count ?? 0) / dias; }));
  return out;
}

/** Junta todo y devuelve { proyeccion, consejos, ahorroMB, corte }. */
export async function estimarEspacio({ hoy, usoMB, limiteMB }) {
  const [tablas, antigua, copias] = await Promise.all([tamanos(), fechaMasAntigua(), listarBackupsAutomaticos()]);
  const ritmo = tablas ? await ritmoPorTabla(hoy, antigua) : {};
  const corte = corteSemestral(hoy);
  const anteriores = tablas ? await contarAnteriores(corte) : {};
  const proyeccion = proyectarEspacio({ hoy, usoMB, limiteMB, tablas, ritmo, mesesDeDatos: antigua ? Math.max(1, mesesEntre(antigua, hoy)) : 0 });
  const ahorroMB = tablas ? ahorroDepuracion(tablas, anteriores) : 0;
  return { proyeccion, ahorroMB, corte, consejos: consejos({ p: proyeccion, ahorroMB, hayCopiaAutomatica: copias.ok && copias.copias.length > 0 }) };
}
