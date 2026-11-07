/**
 * PRECARGA PARA SIN INTERNET — parte PURA: la app APRENDE qué consulta cada pantalla y, al entrar, las vuelve a pedir con las fechas de HOY
 * para que queden guardadas (así, sin internet, la pantalla de hoy ya está lista). Aquí solo la matemática de las fechas y el orden;
 * lo que guarda y pide está en consultasAprendidas.js y precargaDatos.js.
 *   "…fecha=eq.2026-10-28…" visto el 29/10  →  "…fecha=eq.{D-1}…"  →  el 30/10 se pide  "…fecha=eq.2026-10-29…"
 */
const RX_FECHA = /\d{4}-\d{2}-\d{2}/g;
const aFecha = iso => new Date(`${iso}T12:00:00`);
const aISO = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const sumarDias = (iso, n) => { const d = aFecha(iso); d.setDate(d.getDate() + n); return aISO(d); };
export const diasEntre = (a, b) => Math.round((aFecha(a) - aFecha(b)) / 864e5);
export const DIAS_ATRAS = 31;                                   // se reconocen fechas de hasta 31 días atrás (un mes completo)

/** Lo que NO sirve recordar: no es lectura de la base, es una función, o lleva una hora exacta (nunca se repetiría) o es enorme. */
export function esAprendible(url) {
  const u = String(url || '');
  if (!/\/rest\/v1\/[a-z_]+/i.test(u) || /\/rpc\//.test(u) || u.length > 600) return false;
  return !/\d{2}(:|%3A)\d{2}(:|%3A)\d{2}/i.test(decodeURIComponent(u));      // …T10:30:00.000Z cambia en cada consulta
}
/** La dirección relativa (sin servidor) con las fechas cercanas a hoy convertidas en {D-n}, el primer día del mes en {M1} y el mes en {MES}. */
export function aPlantilla(url, hoy) {
  const rel = String(url).replace(/^https?:\/\/[^/]+/, '');
  const m1 = `${hoy.slice(0, 7)}-01`, mes = hoy.slice(0, 7);
  let t = rel.replace(RX_FECHA, f => { if (f === m1) return '{M1}'; const n = diasEntre(hoy, f); return n >= 0 && n <= DIAS_ATRAS ? `{D-${n}}` : f; });
  t = t.replace(new RegExp(`(mes=(?:eq|gte|lte)\\.)${mes}(?![\\d-])`, 'g'), '$1{MES}');
  return t;
}
/** Lo contrario: la dirección de hoy (o del día que se pida). */
export function resolver(plantilla, hoy) {
  return String(plantilla).replace(/\{D-(\d+)\}/g, (_, n) => sumarDias(hoy, -Number(n))).replace(/\{M1\}/g, `${hoy.slice(0, 7)}-01`).replace(/\{MES\}/g, hoy.slice(0, 7));
}
export const llaveConsulta = c => `${c.u}|${c.h?.accept || ''}|${c.h?.prefer || ''}|${c.h?.range || ''}|${c.h?.['accept-profile'] || ''}`;

/** Suma una consulta aprendida a la lista de su pantalla (sin repetir, máximo `max`; las más nuevas mandan). */
export function recordar(lista, consulta, max = 60) {
  const k = llaveConsulta(consulta), resto = (lista || []).filter(c => llaveConsulta(c) !== k);
  return [...resto, consulta].slice(-max);
}
/** Todas las consultas de todas las pantallas, sin repetir (las pantallas comparten muchas), resueltas para el día de hoy. */
export function consultasParaHoy(rutas, hoy, { maxTotal = 140 } = {}) {
  const vistas = new Set(), out = [];
  for (const ruta of Object.keys(rutas || {})) for (const c of rutas[ruta] || []) {
    const u = resolver(c.u, hoy), k = llaveConsulta({ ...c, u });
    if (vistas.has(k)) continue; vistas.add(k); out.push({ u, h: c.h || {}, ruta });
    if (out.length >= maxTotal) return out;
  }
  return out;
}
/** ¿Hay que volver a precargar? Solo si pasó el tiempo mínimo desde la última vez. */
export const tocaPrecargar = (ultimaMs, ahoraMs, minutos = 20) => !Number.isFinite(ultimaMs) || ahoraMs - ultimaMs >= minutos * 60000;
