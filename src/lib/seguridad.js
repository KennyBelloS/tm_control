/**
 * Utilidades de seguridad del navegador. Regla de oro: TODO lo que viene de un archivo o de un campo de texto
 * es "no confiable" hasta que se valide y se limpie.
 */

/* ---------- Texto ---------- */

/** Quita caracteres de control (incluye saltos raros y NUL), junta espacios y recorta al largo máximo. */
export function limpiarTexto(valor, max = 120) {
  return String(valor ?? '')
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202E\u2060-\u206F\uFEFF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/** Escapa un texto para meterlo dentro de HTML construido a mano (innerHTML). */
export function escaparHtml(valor) {
  return String(valor ?? '').replace(/[&<>"'`=\/]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;', '=': '&#61;', '/': '&#47;' }[c]));
}

/**
 * Para CSV/hojas que se vuelvan a abrir en Excel: un texto que empieza con = + - @ (o tab/enter) se interpreta como
 * fórmula. Se antepone una comilla para que se quede como texto.
 */
export function sanearCeldaExcel(valor) {
  if (typeof valor !== 'string') return valor;
  return /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor;
}

/* ---------- Archivos subidos ---------- */

export const LIMITE_ARCHIVO_MB = 8;
export const LIMITE_FILAS = 20000;
const EXTENSIONES_EXCEL = ['.xls', '.xlsx'];

/**
 * Valida un archivo ANTES de leerlo: que exista, que no sea enorme, que la extensión sea de Excel y que su contenido
 * (los primeros bytes) sea de verdad un Excel. Un archivo con otro nombre pero distinto contenido se rechaza.
 * Lanza un Error con un mensaje claro para el usuario.
 */
export async function validarArchivoExcel(file, { maxMB = LIMITE_ARCHIVO_MB } = {}) {
  if (!file) throw new Error('No se eligió ningún archivo.');
  const nombre = String(file.name || '').toLowerCase();
  if (!EXTENSIONES_EXCEL.some(e => nombre.endsWith(e))) throw new Error('El archivo debe ser un Excel (.xls o .xlsx).');
  if (file.size === 0) throw new Error('El archivo está vacío.');
  if (file.size > maxMB * 1024 * 1024) throw new Error(`El archivo pesa demasiado (máximo ${maxMB} MB).`);
  const cabeza = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const esXlsx = cabeza[0] === 0x50 && cabeza[1] === 0x4B && cabeza[2] === 0x03 && cabeza[3] === 0x04;             // "PK" (zip)
  const esXls = cabeza[0] === 0xD0 && cabeza[1] === 0xCF && cabeza[2] === 0x11 && cabeza[3] === 0xE0;              // OLE2
  if (!esXlsx && !esXls) throw new Error('El contenido del archivo no corresponde a un Excel válido.');
}

/** Opciones SEGURAS para leer un Excel con SheetJS: sin fórmulas ni HTML, y con tope de filas (evita archivos hechos para colgar el navegador). */
export const OPCIONES_LECTURA_EXCEL = Object.freeze({
  type: 'array', cellDates: false, raw: true,
  cellFormula: false, cellHTML: false, cellStyles: false, cellNF: false, bookVBA: false, sheetRows: LIMITE_FILAS + 50
});

/* ---------- Identificadores y datos ---------- */

export const esUuid = v => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v || ''));
export const esCorreo = v => /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/.test(String(v || '')) && String(v).length <= 254;
export const esUsuarioValido = v => /^[a-z0-9._-]{3,30}$/.test(String(v || ''));
/** Contraseña: 8 a 72 caracteres (72 es el máximo que usa bcrypt). */
export const esPasswordValida = v => typeof v === 'string' && v.length >= 8 && v.length <= 72;
