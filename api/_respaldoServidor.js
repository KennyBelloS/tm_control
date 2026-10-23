/** COPIA MENSUAL DESDE EL SERVIDOR: no depende de que un administrador abra la app. Mismo formato .tmbackup que genera y lee la app. */
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { TABLAS } from '../src/lib/respaldoGlobal.js';
import { armarBackup, archivoBackup, retenerUltimos, debeRespaldoMensual } from '../src/lib/respaldoBD.js';

async function leerTabla(cliente, tabla) {
  const out = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await cliente.from(tabla).select('*').range(d, d + 999);
    if (error) { if (['42P01', 'PGRST205'].includes(error.code) || /does not exist|schema cache|Could not find/i.test(error.message || '')) return []; throw new Error(`${tabla}: ${error.message}`); }
    out.push(...(data || [])); if (!data || data.length < 1000) break;
  }
  return out;
}

export async function crearBackupServidor(cliente, hoy) {
  const filas = {}, hashes = {};
  for (const t of TABLAS) { filas[t.tabla] = await leerTabla(cliente, t.tabla); hashes[t.tabla] = createHash('sha256').update(JSON.stringify(filas[t.tabla])).digest('hex'); }
  const objeto = armarBackup({ filas, hashes, origen: 'mensual' });
  const gz = gzipSync(JSON.stringify(objeto)), nombre = archivoBackup(objeto.rango, hoy);
  const sub = await cliente.storage.from('respaldos').upload(`auto/${nombre}`, gz, { contentType: 'application/gzip', upsert: true });
  if (sub.error) throw new Error(`No se pudo guardar la copia en el almacenamiento: ${sub.error.message}`);
  const ev = await cliente.from('respaldo_eventos').insert({ usuario_nombre: 'Automático (servidor)', accion: 'backup_mensual', detalle: { nombre: nombre.replace(/\.tmbackup$/, ''), filas: objeto.resumen.total, bytes: gz.length, desde: objeto.rango.primero, hasta: objeto.rango.ultimo, origen: 'servidor' } });
  if (ev.error) throw new Error(ev.error.message);
  const lista = await cliente.storage.from('respaldos').list('auto', { limit: 100 });
  if (!lista.error) { const sobran = retenerUltimos((lista.data || []).map(x => ({ nombre: x.name, fecha: x.updated_at || x.created_at || '' })), 12); if (sobran.length) await cliente.storage.from('respaldos').remove(sobran.map(n => `auto/${n}`)); }
  return { nombre: nombre.replace(/\.tmbackup$/, ''), total: objeto.resumen.total, bytes: gz.length };
}

/** Fecha de hoy en Colombia (UTC−5 todo el año). */
export const hoyColombia = (ahora = new Date()) => new Date(ahora.getTime() - 5 * 3600e3).toISOString().slice(0, 10);

/** La copia del mes: solo si todavía no hay una de este mes. `respaldo` y `ahora` se pueden inyectar para probarlo. */
export async function respaldoMensual(cliente, { ahora = new Date(), respaldo = crearBackupServidor } = {}) {
  const hoy = hoyColombia(ahora);
  const { data } = await cliente.from('respaldo_eventos').select('fecha').eq('accion', 'backup_mensual').order('fecha', { ascending: false }).limit(1);
  if (!debeRespaldoMensual({ hoy, ultimoAutomatico: data?.[0]?.fecha || null })) return { hecho: false };
  return { hecho: true, ...(await respaldo(cliente, hoy)) };
}
