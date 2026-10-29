/**
 * AVISOS IMPORTANTES — parte PURA: cuáles son, cuándo se generan tras cada carga y cómo se redactan.
 * Lo que pasa con ellos fuera de aquí: la campana los muestra a TODOS; el aviso «fuera de la app» (en la pantalla del celular, aunque la app esté cerrada)
 * le llega solo a quien el Administrador haya activado, para cada tipo de aviso.
 */
import { textoHora } from './horario.js';

export const EVENTOS = [
  { id: 'turno', nombre: 'Turno hora a hora cargado', descripcion: 'Cuando se sube el rendimiento del Turno Actual', icono: 'fa-bolt', ruta: '/rendimientos' },
  { id: 'clasificacion', nombre: 'Clasificación cargada', descripcion: 'Cuando se sube la clasificación del día', icono: 'fa-boxes-stacked', ruta: '/clasificacion' },
  { id: 'historico', nombre: 'Histórico cargado', descripcion: 'Cuando se carga el histórico de un día', icono: 'fa-calendar-days', ruta: '/rendimientos' },
  { id: 'resumen_semanal', nombre: 'Resumen semanal listo', descripcion: 'Cuando ya está el último día laboral de la semana', icono: 'fa-file-lines', ruta: '/resumenes' },
  { id: 'resumen_mensual', nombre: 'Resumen mensual listo', descripcion: 'Cuando ya está el último día laboral del mes', icono: 'fa-file-lines', ruta: '/resumenes' }
];
export const IDS_EVENTOS = EVENTOS.map(e => e.id);
export const esEvento = id => IDS_EVENTOS.includes(String(id));
/** Deja solo tipos de aviso válidos y sin repetir (para lo que llega del exterior). */
export const eventosValidos = lista => [...new Set((Array.isArray(lista) ? lista : []).map(String).filter(esEvento))];

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const aFecha = iso => new Date(`${String(iso).slice(0, 10)}T12:00:00`);
const aISO = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
/** ¿Es una fecha ISO que existe de verdad? (2026-13-99 tiene la forma pero no existe) */
export const fechaValida = iso => { const x = String(iso ?? '').slice(0, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(x)) return false; const d = new Date(`${x}T12:00:00`); return !Number.isNaN(d.getTime()) && aISO(d) === x; };
const dia = iso => Number(String(iso).slice(8, 10));
const mesDe = iso => MESES[Number(String(iso).slice(5, 7)) - 1];
export const fechaCorta = iso => `${dia(iso)} de ${mesDe(iso)}`;

/** El lunes de la semana de una fecha (la semana va de lunes a domingo). */
export function lunesDe(iso) { const d = aFecha(iso); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return aISO(d); }
/** Último día laboral de la semana: de sábado hacia atrás, el primero que no sea festivo (el domingo no cuenta: solo trabajan quienes se citan). */
export function ultimoLaboralSemana(iso, esFestivo = () => false) {
  const l = aFecha(lunesDe(iso));
  for (let k = 5; k >= 0; k--) { const d = new Date(l); d.setDate(l.getDate() + k); if (!esFestivo(aISO(d))) return aISO(d); }
  return null;
}
/** Último día laboral del mes: el último que no sea domingo ni festivo. */
export function ultimoLaboralMes(iso, esFestivo = () => false) {
  const base = aFecha(iso), d = new Date(base.getFullYear(), base.getMonth() + 1, 0, 12);
  while (d.getDay() === 0 || esFestivo(aISO(d))) d.setDate(d.getDate() - 1);
  return aISO(d);
}

/**
 * Al cargar el histórico de una o varias fechas: avisa que el histórico está cargado y, si entre ellas está el último día laboral
 * de la semana o del mes, que el resumen semanal o mensual ya está completo. → [{ evento, fecha }]
 */
export function eventosTrasHistorico(fechas, esFestivo = () => false) {
  const f = [...new Set((Array.isArray(fechas) ? fechas : []).map(x => String(x).slice(0, 10)).filter(fechaValida))].sort();
  if (!f.length) return [];
  const out = [{ evento: 'historico', fecha: f.at(-1) }], vistos = new Set();
  for (const x of f) {
    if (ultimoLaboralSemana(x, esFestivo) === x && !vistos.has(`s${lunesDe(x)}`)) { vistos.add(`s${lunesDe(x)}`); out.push({ evento: 'resumen_semanal', fecha: x }); }
    if (ultimoLaboralMes(x, esFestivo) === x && !vistos.has(`m${x.slice(0, 7)}`)) { vistos.add(`m${x.slice(0, 7)}`); out.push({ evento: 'resumen_mensual', fecha: x }); }
  }
  return out;
}

const limpiar = (t, max = 120) => String(t ?? '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
/** El aviso ya redactado: { evento, clave, titulo, cuerpo, ruta, icono }. La `clave` evita avisar dos veces lo mismo. */
export function armarAviso(evento, { fecha, hora } = {}) {
  const e = EVENTOS.find(x => x.id === evento); if (!e) return null;
  const f = fechaValida(fecha) ? String(fecha).slice(0, 10) : null, h = /^\d{1,2}:\d{2}/.test(String(hora || '')) ? String(hora).slice(0, 5) : null;
  let titulo, cuerpo, clave;
  if (evento === 'turno') { titulo = 'Turno actual cargado'; cuerpo = h ? `Ya está el rendimiento hora a hora hasta las ${textoHora(h)}.` : 'Ya está el rendimiento hora a hora.'; clave = `turno:${f || ''}:${h || ''}`; }
  else if (evento === 'clasificacion') { titulo = 'Clasificación cargada'; cuerpo = f ? `Ya está la clasificación del ${fechaCorta(f)}${h ? ` hasta las ${textoHora(h)}` : ''}.` : 'Ya está la clasificación.'; clave = `clasificacion:${f || ''}:${h || ''}`; }
  else if (evento === 'historico') { titulo = 'Histórico cargado'; cuerpo = f ? `Ya está el histórico del ${fechaCorta(f)}.` : 'Ya está el histórico.'; clave = `historico:${f || ''}`; }
  else if (evento === 'resumen_semanal') { const l = f ? lunesDe(f) : null; titulo = 'Resumen semanal listo'; cuerpo = f ? `La semana del ${dia(l)} al ${dia(f)} de ${mesDe(f)} ya tiene todos sus datos.` : 'La semana ya tiene todos sus datos.'; clave = `resumen_semanal:${l || ''}`; }
  else { titulo = 'Resumen mensual listo'; cuerpo = f ? `${mesDe(f)[0].toUpperCase()}${mesDe(f).slice(1)} de ${f.slice(0, 4)} ya tiene todos sus datos.` : 'El mes ya tiene todos sus datos.'; clave = `resumen_mensual:${f ? f.slice(0, 7) : ''}`; }
  return { evento, clave: limpiar(clave, 60), titulo: limpiar(titulo, 60), cuerpo: limpiar(cuerpo, 140), ruta: e.ruta, icono: e.icono, fecha: f };
}
