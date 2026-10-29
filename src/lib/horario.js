/**
 * HORARIO — parte PURA: de qué hora a qué hora son los rendimientos que se están viendo y cuánto dura (ej. "6:00 a. m. – 11:00 p. m. (17 horas)").
 * Sale de las horas reales de los datos; si no traen, de la jornada configurada (por defecto 6:00 – 23:00).
 * El HISTÓRICO de un miércoles o un sábado es media jornada: normalmente va de 6 a 12, a menos que los datos digan otra cosa (más tarde).
 */
const aMin = h => { const m = /^(\d{1,2}):(\d{2})/.exec(String(h ?? '')); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
export function textoHora(h) {
  const m = aMin(h); if (m === null) return '';
  const hh = Math.floor(m / 60) % 24, mm = m % 60, suf = hh >= 12 ? 'p. m.' : 'a. m.', h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${suf}`;
}
/** "17 horas", "1 hora", "5,5 horas". */
export function textoDuracion(min) {
  const h = min / 60;
  if (Number.isInteger(h)) return `${h} hora${h === 1 ? '' : 's'}`;
  return `${(Math.round(h * 10) / 10).toLocaleString('es-CO')} horas`;
}
const esMediaJornada = iso => { if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''))) return false; const d = new Date(`${iso}T12:00:00Z`).getUTCDay(); return d === 3 || d === 6; };   // miércoles o sábado
/**
 * filas con hora_inicio/hora_fin (cualquiera puede faltar) + la jornada por defecto + { fecha (ISO del día, si es uno solo), historico } → { inicio, fin, minutos, duracion, texto, origen }.
 */
export function rangoHoras(filas = [], jornada = {}, { fecha = null, historico = false } = {}) {
  let ini = null, fin = null;
  for (const f of filas) { const a = aMin(f.hora_inicio), b = aMin(f.hora_fin); if (a !== null && (ini === null || a < ini)) ini = a; if (b !== null && (fin === null || b > fin)) fin = b; }
  const datos = ini !== null && fin !== null && fin > ini;
  let origen = datos ? 'datos' : 'jornada', i = datos ? ini : aMin(jornada.horaInicioDefault || '06:00'), f = datos ? fin : aMin(jornada.horaFinDefault || '23:00');
  if (historico && esMediaJornada(fecha)) { i = datos ? Math.min(ini, 360) : 360; f = datos ? Math.max(fin, 720) : 720; origen = datos && fin > 720 ? 'datos' : 'media-jornada'; }    // 6 a 12, salvo que los datos lleguen más tarde
  const hh = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const minutos = Math.max(0, f - i);
  return { inicio: hh(i), fin: hh(f), minutos, duracionMin: minutos, duracion: textoDuracion(minutos), texto: `${textoHora(hh(i))} – ${textoHora(hh(f))} (${textoDuracion(minutos)})`, origen };
}
