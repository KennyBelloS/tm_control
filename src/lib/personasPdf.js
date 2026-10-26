/**
 * PERSONAS POR PDF — parte PURA: convierte las líneas de texto de un PDF "Activos Boncheo" (Mesa · Nombre · Emp.Cod · Rol · Empleados)
 * en personas. El PDF es la impresión de la página web: trae encabezado y pie en cada hoja ("1 de 3 23/10/2026, 7:32 a. m.") que se ignoran,
 * y los nombres sin segundo nombre o apellido traen "{}", que se quita. Solo se usan la mesa (código), el Emp.Cod, el nombre y el rol.
 */
const NOMBRE = "[A-Za-zÁÉÍÓÚÜÑáéíóúüñ{}'.\\- ]+?";
// mesa (1 a 4 dígitos, no pegada a otro número) · nombre (solo letras) · Emp.Cod · rol (una palabra) · cantidad de empleados
const FILA = new RegExp(`(?:^|[^\\d])(\\d{1,4})\\s+(${NOMBRE})\\s+(\\d{2,7})\\s+([A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)\\s+(\\d{1,3})\\s*$`);

/**
 * Piezas de texto del PDF ({ str, x, y }) → renglones: las que quedan a la misma altura (±3 puntos) forman un renglón, de izquierda a derecha.
 * Así la primera fila de cada hoja nunca se pega con el pie de la hoja anterior.
 */
export function agruparLineas(items) {
  const lista = items.filter(i => String(i.str).trim()).sort((a, b) => b.y - a.y || a.x - b.x), renglones = [];
  for (const it of lista) {
    const r = renglones.find(x => Math.abs(x.y - it.y) <= 3);
    if (r) r.items.push(it); else renglones.push({ y: it.y, items: [it] });
  }
  return renglones.sort((a, b) => b.y - a.y).map(r => r.items.sort((a, b) => a.x - b.x).map(i => String(i.str).trim()).join(' ').replace(/\s+/g, ' ').trim());
}

export const limpiarNombrePdf = t => String(t).replace(/\{\}/g, ' ').replace(/\s+/g, ' ').trim();

/** Una línea → { mesa, id, nombre, rol } o null si no es una fila de persona. */
export function leerFila(linea) {
  const m = FILA.exec(String(linea).replace(/\u00a0/g, ' ').trim());
  if (!m) return null;
  const nombre = limpiarNombrePdf(m[2]);
  if (!nombre || /^a\.?\s*m\.?$|^p\.?\s*m\.?$/i.test(nombre)) return null;      // el pie de página ("a. m.") no es un nombre
  return { mesa: Number(m[1]), id: Number(m[3]), nombre, rol: m[4] };
}

/**
 * Líneas → { personas, ignoradas, repetidas }.
 * La mesa se guarda como un solo número: si el mismo Emp.Cod sale con dos mesas, se queda con la primera. Lo que no trae Emp.Cod y mesa se ignora sin avisar.
 */
export function parsearPersonasPdf(lineas) {
  const porId = new Map(); let ignoradas = 0, repetidas = 0;
  for (const l of lineas) {
    const f = leerFila(l);
    if (!f) { if (/\d{2,7}\s+[A-Za-z]+\s+\d+\s*$/.test(String(l))) ignoradas++; continue; }
    if (!Number.isInteger(f.id) || f.id <= 0 || !(f.mesa > 0)) { ignoradas++; continue; }
    const previa = porId.get(f.id);
    if (!previa) porId.set(f.id, { id: f.id, nombre: f.nombre, rol: f.rol, mesas: [f.mesa] });
    else { repetidas++; if (!previa.mesas.includes(f.mesa)) previa.mesas.push(f.mesa); }
  }
  const personas = [...porId.values()].map(p => ({ id: p.id, nombre: p.nombre, rol: p.rol, mesa: p.mesas[0] }));
  return { personas, ignoradas, repetidas };
}

/** Qué pasaría al guardar: las personas que ya existen solo cambian su mesa; las que no existen se crean. */
export function planGuardado(personas, idsExistentes, mesasActuales = new Map()) {
  const ex = new Set(idsExistentes), nuevas = [], actualizar = [], iguales = [];
  for (const p of personas) {
    if (!ex.has(p.id)) nuevas.push(p);
    else if (Number(mesasActuales.get(p.id)) === Number(p.mesa)) iguales.push(p);
    else actualizar.push(p);
  }
  return { nuevas, actualizar, iguales };
}
