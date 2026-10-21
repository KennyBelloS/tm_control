/**
 * RESPALDO GLOBAL — INFRAESTRUCTURA: aquí sí se habla con la base de datos. Las reglas (qué tablas, qué se borra, qué frase)
 * viven en respaldoGlobal.js y no saben nada de Supabase.
 */
import { supabase } from './supabaseClient';
import { TABLAS } from './respaldoGlobal';

const PAGINA = 1000;
const ausente = e => ['42P01', 'PGRST205'].includes(e?.code) || /does not exist|schema cache|Could not find/i.test(e?.message || '');

/** Cuántas filas tiene cada tabla ahora mismo. Una tabla que aún no existe cuenta 0. */
export async function contarTablas() {
  const out = {};
  await Promise.all(TABLAS.map(async t => {
    const { count, error } = await supabase.from(t.tabla).select('*', { count: 'exact', head: true });
    out[t.tabla] = error ? 0 : (count ?? 0);
  }));
  return out;
}

/** Lee una tabla COMPLETA, de a 1000 filas (el límite de Supabase), con orden estable cuando se puede. */
export async function leerTabla(tabla, orden = [], alAvanzar = () => {}) {
  const filas = [];
  const armar = ord => { let q = supabase.from(tabla).select('*'); for (const c of ord) q = q.order(c, { ascending: true }); return q; };
  let ord = orden;
  for (let desde = 0; ; desde += PAGINA) {
    let { data, error } = await armar(ord).range(desde, desde + PAGINA - 1);
    if (error && ord.length && !ausente(error)) { ord = []; ({ data, error } = await armar(ord).range(desde, desde + PAGINA - 1)); }   // la columna de orden no existe: sin orden
    if (error) { if (ausente(error)) return { filas: [], ausente: true }; throw error; }
    filas.push(...data); alAvanzar(filas.length);
    if (data.length < PAGINA) break;
  }
  return { filas, ausente: false };
}

/** Lee TODAS las tablas del respaldo. alAvanzar(tabla, estado, filas) permite mostrar el avance. */
export async function leerTodo(alAvanzar = () => {}) {
  const datos = {}, filas = {}, ausentes = [];
  for (const t of TABLAS) {
    alAvanzar(t.tabla, 'leyendo', 0);
    const r = await leerTabla(t.tabla, t.orden, n => alAvanzar(t.tabla, 'leyendo', n));
    datos[t.tabla] = r.filas; filas[t.tabla] = r.filas.length; if (r.ausente) ausentes.push(t.tabla);
    alAvanzar(t.tabla, 'listo', r.filas.length);
  }
  return { datos, filas, ausentes };
}

/** Elimina los datos operativos (solo administrador; la base exige la confirmación literal). */
export async function vaciarDatosOperativos() {
  const { data, error } = await supabase.rpc('vaciar_datos_operativos', { p_confirmacion: 'VACIAR_DATOS_OPERATIVOS' });
  if (error) throw error;
  return data;
}

/** Los últimos respaldos/vaciados registrados (quién y cuándo). Vacío si la tabla aún no existe. */
export async function ultimosEventosRespaldo(n = 5) {
  const { data, error } = await supabase.from('respaldo_eventos').select('fecha, usuario_nombre, accion, detalle').order('fecha', { ascending: false }).limit(n);
  return error ? [] : (data || []);
}
