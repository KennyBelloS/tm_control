/**
 * COPIA DE SEGURIDAD DE LA BASE DE DATOS (.tmbackup) — reglas puras: formato, validación, orden de restauración y calendarios
 * (copia mensual y depuración semestral). Sin base de datos ni navegador: lo que lee, comprime y sube está en respaldoBDDatos.js.
 *
 * Formato: un JSON comprimido (gzip) con { formato:'tmbackup', version, creado, origen, tablas:{ tabla:{ filas:[…], sha256 } }, resumen }.
 * Cada tabla trae la huella SHA-256 de sus filas: si el archivo se daña o se modifica, la importación lo detecta y no restaura nada.
 */
import { TABLAS } from './respaldoGlobal.js';

export const FORMATO = 'tmbackup', VERSION = 1;
const MAESTRAS = ['configuracion', 'personas', 'lineas', 'formadoras', 'devoluciones_personas', 'devoluciones_meta', 'devoluciones_ajustes'];   // primero: otras tablas dependen de ellas
/** Las tablas que una copia puede restaurar (los usuarios, "perfiles", NUNCA se restauran), en el orden en que deben entrar. */
export const tablasRestaurables = () => {
  const todas = TABLAS.map(t => t.tabla).filter(t => t !== 'perfiles');
  return [...MAESTRAS.filter(t => todas.includes(t)), ...todas.filter(t => !MAESTRAS.includes(t))];
};
/** Tablas con columna "fecha" que la depuración semestral recorta (devoluciones_asistencia se recorta por mes aparte). */
export const TABLAS_CON_FECHA = ['rendimiento_historico', 'historico_bloques', 'rendimiento_actual', 'metas_diarias', 'descansos_diarios', 'clasificacion_cargas', 'clasificacion_hora', 'clasificacion_historico', 'devoluciones_dia', 'asignaciones_diarias', 'asignaciones_clasificador', 'tablero_formadoras', 'lineas_dia', 'formadora_linea'];

/** La fecha del primer y del último registro de la información (en las tablas con fecha). */
export function rangoDeFechas(filas) {
  let primero = null, ultimo = null;
  for (const t of TABLAS_CON_FECHA) for (const r of filas[t] || []) { const f = String(r.fecha || '').slice(0, 10); if (!f) continue; if (!primero || f < primero) primero = f; if (!ultimo || f > ultimo) ultimo = f; }
  return { primero, ultimo };
}
const dmy = iso => `${Number(iso.slice(8, 10))}-${Number(iso.slice(5, 7))}-${iso.slice(2, 4)}`;
/** "Backup TMControl 12-10-26_6-2-27": de la fecha del primer registro a la del último (sin ceros a la izquierda; las barras no valen en un nombre de archivo). */
export function nombreBackup({ primero, ultimo }, hoy) {
  if (!primero || !ultimo) return `Backup TMControl ${hoy ? dmy(hoy) : 'sin datos'}`;
  return primero === ultimo ? `Backup TMControl ${dmy(primero)}` : `Backup TMControl ${dmy(primero)}_${dmy(ultimo)}`;
}
export const archivoBackup = (rango, hoy) => `${nombreBackup(rango, hoy)}.tmbackup`;

export function armarBackup({ filas, hashes, creado = new Date().toISOString(), origen = 'manual', app = 'TMControl' }) {
  const tablas = {}, porTabla = {}; let total = 0;
  for (const t of TABLAS.map(x => x.tabla)) { const f = filas[t] || []; tablas[t] = { filas: f, sha256: hashes[t] }; porTabla[t] = f.length; total += f.length; }
  return { formato: FORMATO, version: VERSION, creado, origen, app, rango: rangoDeFechas(filas), tablas, resumen: { total, porTabla } };
}

/** ¿El archivo es una copia válida y está íntegra? hashes = huellas recalculadas al leerlo { tabla: sha256 }. */
export function validarBackup(obj, hashes = {}) {
  const errores = [], avisos = [], tablas = [];
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return { ok: false, errores: ['El archivo no es una copia de seguridad de TMControl.'], avisos, tablas, total: 0 };
  if (obj.formato !== FORMATO) errores.push('El archivo no es una copia de seguridad de TMControl (.tmbackup).');
  if (typeof obj.version !== 'number' || obj.version > VERSION) errores.push(`La copia es de una versión más nueva (${obj.version}) que esta app entiende (${VERSION}). Actualiza la app.`);
  if (!obj.tablas || typeof obj.tablas !== 'object') errores.push('La copia no trae tablas.');
  let total = 0;
  if (!errores.length) {
    const conocidas = new Set(tablasRestaurables());
    for (const [nombre, t] of Object.entries(obj.tablas)) {
      if (!conocidas.has(nombre) && nombre !== 'perfiles') { avisos.push(`La tabla "${nombre}" no se conoce y se ignora.`); continue; }
      if (!Array.isArray(t?.filas)) { errores.push(`La tabla "${nombre}" está dañada (sin filas).`); continue; }
      const declaradas = obj.resumen?.porTabla?.[nombre];
      if (declaradas !== undefined && declaradas !== t.filas.length) errores.push(`La tabla "${nombre}" no coincide con lo que declara la copia (${t.filas.length} filas, debía tener ${declaradas}).`);
      const integra = hashes[nombre] === undefined ? false : hashes[nombre] === t.sha256;
      if (!integra) errores.push(`La tabla "${nombre}" fue modificada o está dañada (la huella no coincide).`);
      tablas.push({ tabla: nombre, filas: t.filas.length, integra, restaurable: nombre !== 'perfiles' });
      total += t.filas.length;
    }
    for (const t of tablasRestaurables()) if (!(t in obj.tablas)) avisos.push(`La copia no trae la tabla "${t}".`);
  }
  return { ok: errores.length === 0, errores, avisos, tablas, total };
}

export const fragmentos = (lista, n = 1500) => { const out = []; for (let i = 0; i < lista.length; i += n) out.push(lista.slice(i, i + n)); return out; };

// ---------------- Calendarios ----------------
const iso = d => d.toISOString().slice(0, 10);
const utc = s => new Date(`${s}T12:00:00Z`);
/** Fecha de corte de la depuración semestral: el primer día del mes de hace 6 meses. Lo anterior a esa fecha es lo que se puede eliminar. */
export function corteSemestral(hoy) { const d = utc(hoy); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - 6); return iso(d); }
export const mesesEntre = (a, b) => (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + (Number(b.slice(5, 7)) - Number(a.slice(5, 7)));
/**
 * ¿Hay información para depurar? Se puede si existe algo anterior al corte. "toca" = además pasaron 6 meses desde la última depuración (o nunca se hizo).
 */
export function estadoSemestral({ hoy, fechaMasAntigua, ultimaDepuracion }) {
  const corte = corteSemestral(hoy);
  const hayAntigua = !!fechaMasAntigua && fechaMasAntigua < corte;
  const toca = hayAntigua && (!ultimaDepuracion || mesesEntre(ultimaDepuracion.slice(0, 10), hoy) >= 6);
  return { corte, disponible: hayAntigua, toca, mesesDeDatos: fechaMasAntigua ? mesesEntre(fechaMasAntigua, hoy) : 0 };
}
/** Copia automática mensual: toca si todavía no hay una de este mes. */
export const debeRespaldoMensual = ({ hoy, ultimoAutomatico }) => !ultimoAutomatico || String(ultimoAutomatico).slice(0, 7) < hoy.slice(0, 7);
export const rutaAutomatico = archivo => `auto/${archivo}`;
/** De la lista de copias automáticas ({ nombre, fecha } con la fecha en que se guardaron), los nombres que sobran para conservar solo las últimas n. Solo toca archivos .tmbackup. */
export function retenerUltimos(copias, n = 12) { const o = copias.filter(c => /\.tmbackup$/.test(c.nombre)).sort((a, b) => String(a.fecha).localeCompare(String(b.fecha))); return o.slice(0, Math.max(0, o.length - n)).map(c => c.nombre); }
export const nombreArchivoBD = (f = new Date()) => { const p = x => String(x).padStart(2, '0'); return `torremolinos_BD_${f.getFullYear()}-${p(f.getMonth() + 1)}-${p(f.getDate())}_${p(f.getHours())}${p(f.getMinutes())}.tmbackup`; };
export const formatoTamano = b => (b >= 1048576 ? `${(b / 1048576).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
