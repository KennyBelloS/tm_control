/**
 * COPIA DE SEGURIDAD DE LA BASE DE DATOS — infraestructura: lee las tablas, comprime, calcula huellas, sube a Storage, restaura y depura.
 * Las reglas (formato, validación, calendarios) están en respaldoBD.js.
 */
import { supabase } from './supabaseClient';
import { TABLAS } from './respaldoGlobal';
import { leerTodo, vaciarDatosOperativos } from './respaldoGlobalDatos';
import { armarBackup, validarBackup, fragmentos, tablasRestaurables, archivoBackup, rutaAutomatico, retenerUltimos, TABLAS_CON_FECHA } from './respaldoBD';

const BUCKET = 'respaldos';
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
/** Huella SHA-256 de las filas de una tabla. */
export const huella = async filas => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(filas))));

async function comprimir(texto) {
  if (typeof CompressionStream === 'undefined') return new Blob([texto], { type: 'application/json' });
  return new Response(new Blob([texto]).stream().pipeThrough(new CompressionStream('gzip'))).blob();
}
async function descomprimir(blob) {
  const cab = new Uint8Array(await blob.slice(0, 2).arrayBuffer());
  if (cab[0] === 0x1f && cab[1] === 0x8b && typeof DecompressionStream !== 'undefined') return new Response(blob.stream().pipeThrough(new DecompressionStream('gzip'))).text();
  return blob.text();
}
export function descargarBlob(blob, nombre) {
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Lee todas las tablas (o usa una lectura ya hecha) y arma la copia comprimida. */
export async function crearBackupBD({ origen = 'manual', alAvanzar, lectura } = {}) {
  const l = lectura || await leerTodo(alAvanzar);
  const hashes = {};
  for (const t of TABLAS) hashes[t.tabla] = await huella(l.datos[t.tabla] || []);
  const objeto = armarBackup({ filas: l.datos, hashes, origen });
  const blob = await comprimir(JSON.stringify(objeto));
  const hoy = new Date().toISOString().slice(0, 10);
  return { blob, objeto, nombre: archivoBackup(objeto.rango, hoy), total: objeto.resumen.total, bytes: blob.size, lectura: l };
}

/** Lee un archivo .tmbackup, recalcula las huellas y lo valida. Nunca escribe nada en la base. */
export async function leerArchivoBackup(archivo) {
  let objeto;
  try { objeto = JSON.parse(await descomprimir(archivo)); }
  catch { return { objeto: null, validacion: { ok: false, errores: ['El archivo no se pudo leer: no es una copia de seguridad de TMControl o está dañado.'], avisos: [], tablas: [], total: 0 } }; }
  const hashes = {};
  for (const [t, v] of Object.entries(objeto?.tablas || {})) if (Array.isArray(v?.filas)) hashes[t] = await huella(v.filas);
  return { objeto, validacion: validarBackup(objeto, hashes) };
}

export async function registrarEvento(accion, detalle = {}) {
  const { error } = await supabase.rpc('registrar_respaldo', { p_accion: accion, p_detalle: detalle });
  if (error) throw error;
}
/** El último evento (fecha) de alguna de esas acciones, o null. */
export async function ultimoEventoDe(acciones) {
  const { data, error } = await supabase.from('respaldo_eventos').select('fecha, accion, usuario_nombre, detalle').in('accion', acciones).order('fecha', { ascending: false }).limit(1);
  return error || !data?.length ? null : data[0];
}

/**
 * Restaura una copia. modo 'combinar': agrega lo que falta y NO pisa ni borra nada. 'reemplazar': primero vacía los datos operativos
 * (los maestros —personas, líneas, formadoras…— se combinan siempre). Los usuarios nunca se restauran.
 */
export async function restaurarBackup(objeto, { modo = 'combinar', alAvanzar = () => {} } = {}) {
  const orden = tablasRestaurables().filter(t => objeto.tablas[t]);
  if (modo === 'reemplazar') { alAvanzar('vaciando', 0); await vaciarDatosOperativos(); }
  const resumen = {};
  for (const t of orden) {
    const filas = objeto.tablas[t].filas; let n = 0;
    alAvanzar(t, 0);
    for (const f of fragmentos(filas)) {
      const { data, error } = await supabase.rpc('restaurar_tabla', { p_tabla: t, p_filas: f });
      if (error) throw new Error(`${t}: ${error.message}`);
      n += Number(data || 0); alAvanzar(t, n);
    }
    resumen[t] = { enCopia: filas.length, restauradas: n };
  }
  await supabase.rpc('restablecer_secuencias');
  await registrarEvento('backup_importado', { modo, copia_creada: objeto.creado, filas: Object.values(resumen).reduce((s, x) => s + x.restauradas, 0) }).catch(() => {});
  return resumen;
}

// ---------------- Copias automáticas (Storage) ----------------
export async function subirBackupAutomatico(blob, archivo) {
  const { error } = await supabase.storage.from(BUCKET).upload(rutaAutomatico(archivo), blob, { upsert: true, contentType: 'application/gzip' });
  if (error) throw error;
}
export async function listarBackupsAutomaticos() {
  const { data, error } = await supabase.storage.from(BUCKET).list('auto', { limit: 100, sortBy: { column: 'name', order: 'desc' } });
  if (error) return { ok: false, mensaje: error.message || 'No se pudo leer el almacenamiento.', copias: [] };
  return { ok: true, copias: (data || []).filter(x => /\.tmbackup$/.test(x.name)).map(x => ({ nombre: x.name, bytes: x.metadata?.size ?? null, fecha: x.updated_at || x.created_at || null })).sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))) };
}
export async function descargarBackupAutomatico(nombre) {
  const { data, error } = await supabase.storage.from(BUCKET).download(`auto/${nombre}`);
  if (error) throw error;
  return data;
}
export async function borrarBackupsAutomaticos(nombres) {
  if (!nombres.length) return;
  const { error } = await supabase.storage.from(BUCKET).remove(nombres.map(n => `auto/${n}`));
  if (error) throw error;
}
/** La copia mensual: crea, sube, registra y deja solo las últimas 12. */
export async function ejecutarBackupMensual({ hoy, alAvanzar } = {}) {
  const r = await crearBackupBD({ origen: 'mensual', alAvanzar });
  await subirBackupAutomatico(r.blob, r.nombre);
  await registrarEvento('backup_mensual', { nombre: r.nombre.replace(/\.tmbackup$/, ''), filas: r.total, bytes: r.bytes, ruta: rutaAutomatico(r.nombre), desde: r.objeto.rango?.primero, hasta: r.objeto.rango?.ultimo });
  const lista = await listarBackupsAutomaticos();
  if (lista.ok) await borrarBackupsAutomaticos(retenerUltimos(lista.copias, 12)).catch(() => {});
  return { total: r.total, bytes: r.bytes, nombre: r.nombre.replace(/\.tmbackup$/, '') };
}

// ---------------- Depuración semestral ----------------
/** La fecha más antigua que hay en las tablas principales (aaaa-mm-dd) o null. */
export async function fechaMasAntigua() {
  const fechas = await Promise.all(['rendimiento_historico', 'devoluciones_dia', 'clasificacion_historico', 'asignaciones_diarias'].map(async t => {
    const { data, error } = await supabase.from(t).select('fecha').order('fecha', { ascending: true }).limit(1);
    return error || !data?.length ? null : String(data[0].fecha).slice(0, 10);
  }));
  const v = fechas.filter(Boolean).sort(); return v[0] || null;
}
/** Cuántas filas hay anteriores al corte, por tabla (para mostrarlo ANTES de confirmar). */
export async function contarAnteriores(corte) {
  const out = {};
  await Promise.all([...TABLAS_CON_FECHA.map(async t => { const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true }).lt('fecha', corte); out[t] = error ? 0 : (count ?? 0); }),
    (async () => { const { count, error } = await supabase.from('devoluciones_asistencia').select('*', { count: 'exact', head: true }).lt('mes', `${corte.slice(0, 7)}-01`); out.devoluciones_asistencia = error ? 0 : (count ?? 0); })()]);
  return out;
}
export async function depurarAnteriores(corte) {
  const { data, error } = await supabase.rpc('depurar_datos_anteriores', { p_corte: corte, p_confirmacion: 'DEPURAR_DATOS_ANTIGUOS' });
  if (error) throw error;
  return data;
}
