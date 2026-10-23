/**
 * FESTIVOS DE COLOMBIA — regla pura (sin base de datos ni pantalla).
 * Fijos: 1 ene, 1 may, 20 jul, 7 ago, 8 dic, 25 dic.
 * Trasladados al lunes siguiente (Ley Emiliani): 6 ene, 19 mar, 29 jun, 15 ago, 12 oct, 1 nov, 11 nov.
 * Según la Pascua: Jueves y Viernes Santo (no se trasladan); Ascensión, Corpus Christi y Sagrado Corazón (al lunes).
 *
 * Cómo lo usa la app: un día SIN rendimiento ni asistencia de nadie no se trabajó. Domingos y festivos tampoco se trabajan,
 * pero si hay reporte ese día solo cuenta para las personas que aparecen en él (a las demás no se les descuenta).
 */
const pad = n => String(n).padStart(2, '0');
const aIso = d => d.toISOString().slice(0, 10);
const utc = iso => new Date(`${iso}T12:00:00Z`);
const sumar = (iso, n) => { const d = utc(iso); d.setUTCDate(d.getUTCDate() + n); return aIso(d); };
const diaSemana = iso => utc(iso).getUTCDay();                                   // 0 = domingo … 6 = sábado
const alLunes = iso => sumar(iso, (8 - diaSemana(iso)) % 7);                      // si ya es lunes se queda; si no, el lunes siguiente

/** Domingo de Pascua (algoritmo de Meeus/Jones/Butcher). */
export function pascua(anio) {
  const a = anio % 19, b = Math.floor(anio / 100), c = anio % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return `${anio}-${pad(mes)}-${pad(dia)}`;
}

const cache = new Map();
/** Los festivos de un año: Map('aaaa-mm-dd' → nombre). */
export function festivosColombia(anio) {
  if (cache.has(anio)) return cache.get(anio);
  const f = new Map(), P = pascua(anio), y = anio;
  const fijo = (m, d, n) => f.set(`${y}-${pad(m)}-${pad(d)}`, n);
  const movil = (m, d, n) => f.set(alLunes(`${y}-${pad(m)}-${pad(d)}`), n);
  fijo(1, 1, 'Año Nuevo'); movil(1, 6, 'Reyes Magos'); movil(3, 19, 'San José');
  f.set(sumar(P, -3), 'Jueves Santo'); f.set(sumar(P, -2), 'Viernes Santo');
  fijo(5, 1, 'Día del Trabajo'); f.set(alLunes(sumar(P, 39)), 'Ascensión del Señor'); f.set(alLunes(sumar(P, 60)), 'Corpus Christi'); f.set(alLunes(sumar(P, 68)), 'Sagrado Corazón');
  movil(6, 29, 'San Pedro y San Pablo'); fijo(7, 20, 'Día de la Independencia'); fijo(8, 7, 'Batalla de Boyacá'); movil(8, 15, 'Asunción de la Virgen');
  movil(10, 12, 'Día de la Raza'); movil(11, 1, 'Todos los Santos'); movil(11, 11, 'Independencia de Cartagena'); fijo(12, 8, 'Inmaculada Concepción'); fijo(12, 25, 'Navidad');
  cache.set(anio, f); return f;
}
export const nombreFestivo = iso => festivosColombia(Number(String(iso).slice(0, 4))).get(iso) || null;
export const esDomingo = iso => diaSemana(iso) === 0;
/** 'festivo' (con su nombre aparte), 'domingo' u 'ordinario'. Un festivo que cae en domingo cuenta como festivo. */
export const tipoDia = iso => (nombreFestivo(iso) ? 'festivo' : esDomingo(iso) ? 'domingo' : 'ordinario');
export const esDiaEspecial = iso => tipoDia(iso) !== 'ordinario';
