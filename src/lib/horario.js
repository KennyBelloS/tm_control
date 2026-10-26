/**
 * HORARIO — parte PURA: de qué hora a qué hora son los rendimientos que se están viendo (ej. "6:00 a. m. – 11:00 p. m.").
 * Sale de las horas reales de los datos; si no traen, de la jornada configurada (por defecto 6:00 – 23:00).
 */
const aMin = h => { const m = /^(\d{1,2}):(\d{2})/.exec(String(h ?? '')); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
export function textoHora(h) {
  const m = aMin(h); if (m === null) return '';
  const hh = Math.floor(m / 60) % 24, mm = m % 60, suf = hh >= 12 ? 'p. m.' : 'a. m.', h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${suf}`;
}
/** filas con hora_inicio/hora_fin (cualquiera puede faltar) + la jornada por defecto → { inicio, fin, texto, origen }. */
export function rangoHoras(filas = [], jornada = {}) {
  let ini = null, fin = null;
  for (const f of filas) { const a = aMin(f.hora_inicio), b = aMin(f.hora_fin); if (a !== null && (ini === null || a < ini)) ini = a; if (b !== null && (fin === null || b > fin)) fin = b; }
  const datos = ini !== null && fin !== null && fin > ini;
  const fmt = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const inicio = datos ? fmt(ini) : (jornada.horaInicioDefault || '06:00').slice(0, 5), horaFin = datos ? fmt(fin) : (jornada.horaFinDefault || '23:00').slice(0, 5);
  return { inicio, fin: horaFin, texto: `${textoHora(inicio)} – ${textoHora(horaFin)}`, origen: datos ? 'datos' : 'jornada' };
}
