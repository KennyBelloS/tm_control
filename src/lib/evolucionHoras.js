/**
 * EVOLUCIÓN POR HORA — parte PURA: a partir de los bloques horarios del Turno Actual de una persona, evalúa cómo MEJORÓ o EMPEORÓ
 * hora por hora (contra la hora anterior), cuál fue su mejor y su peor hora y hacia dónde va el día.
 *   bloque = { hora_inicio, hora_fin, total_tallos, tiempo_trabajado_min, rend_tallos }
 */
import { calcularPorcentajeMeta, clasificarEstado } from './calculos.js';
import { textoHora } from './horario.js';

export const UMBRAL_CAMBIO = 5;           // % contra la hora anterior para decir "mejoró" o "empeoró"
export const UMBRAL_TENDENCIA = 2;        // % del promedio que sube o baja cada hora para hablar de tendencia
const aMin = h => { const m = /^(\d{1,2}):(\d{2})/.exec(String(h ?? '')); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
const fmt = n => Math.round(n).toLocaleString('es-CO');

/** El rendimiento de un bloque, en tallos por hora real (si no hay minutos, se usa el que trae el reporte). */
export function rendDeBloque(b) {
  const min = Number(b.tiempo_trabajado_min) || 0, t = Number(b.total_tallos) || 0;
  return min > 0 ? (t / min) * 60 : Number(b.rend_tallos) || 0;
}
/** Une los bloques del reporte actual con los guardados antes (por si un reporte nuevo trae menos horas): el actual manda. */
export function fusionarHoras(actuales = [], guardadas = []) {
  const k = r => `${r.fecha}|${r.colaborador_id}|${String(r.hora_inicio).slice(0, 5)}`, m = new Map();
  for (const r of guardadas) m.set(k(r), r);
  for (const r of actuales) m.set(k(r), r);
  return [...m.values()];
}

export function evaluarEvolucion(bloques = [], metaHora = 470) {
  const grupos = new Map();
  for (const b of bloques) {
    const i = aMin(b.hora_inicio); if (i === null) continue;
    const g = grupos.get(i) || { i, f: aMin(b.hora_fin) ?? i + 60, tallos: 0, min: 0, suelto: 0, n: 0 };
    g.tallos += Number(b.total_tallos) || 0; g.min += Number(b.tiempo_trabajado_min) || 0; g.suelto += Number(b.rend_tallos) || 0; g.n++; grupos.set(i, g);
  }
  const hh = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const horas = [...grupos.values()].sort((a, b) => a.i - b.i).map(g => {
    const rend = g.min > 0 ? (g.tallos / g.min) * 60 : g.suelto / Math.max(1, g.n), pct = calcularPorcentajeMeta(rend, metaHora), est = clasificarEstado(pct);
    return { inicio: hh(g.i), fin: hh(g.f), etiqueta: `${textoHora(hh(g.i))} – ${textoHora(hh(g.f))}`, corta: textoHora(hh(g.i)).replace(':00', ''), tallos: g.tallos, minutos: g.min, rend, pctMeta: pct, estado: est.label, css: est.css };
  });
  horas.forEach((h, i) => {
    const p = horas[i - 1];
    h.cambio = p && p.rend > 0 ? ((h.rend - p.rend) / p.rend) * 100 : null;
    h.veredicto = i === 0 ? 'inicio' : h.cambio === null ? 'igual' : h.cambio >= UMBRAL_CAMBIO ? 'mejoro' : h.cambio <= -UMBRAL_CAMBIO ? 'empeoro' : 'igual';
  });
  const tallos = horas.reduce((s, h) => s + h.tallos, 0), min = horas.reduce((s, h) => s + h.minutos, 0), promedio = min > 0 ? (tallos / min) * 60 : (horas.reduce((s, h) => s + h.rend, 0) / Math.max(1, horas.length));
  const solidas = horas.filter(h => h.minutos >= 20 || h.minutos === 0), base = solidas.length ? solidas : horas;
  const mejor = base.length ? base.reduce((m, h) => (h.rend > m.rend ? h : m)) : null, peor = base.length > 1 ? base.reduce((m, h) => (h.rend < m.rend ? h : m)) : null;
  // tendencia: pendiente de la recta (mínimos cuadrados) de rendimiento por hora
  let pendiente = 0, tendencia = 'pocas';
  if (horas.length >= 3) {
    const n = horas.length, xs = horas.map((_, i) => i), my = horas.reduce((s, h) => s + h.rend, 0) / n, mx = (n - 1) / 2;
    const num = xs.reduce((s, x, i) => s + (x - mx) * (horas[i].rend - my), 0), den = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
    pendiente = den ? num / den : 0; const rel = promedio > 0 ? (pendiente / promedio) * 100 : 0;
    tendencia = rel >= UMBRAL_TENDENCIA ? 'sube' : rel <= -UMBRAL_TENDENCIA ? 'baja' : 'estable';
  }
  const mejoras = horas.filter(h => h.veredicto === 'mejoro').length, empeoras = horas.filter(h => h.veredicto === 'empeoro').length;
  let racha = { tipo: null, horas: 0 };
  for (let i = horas.length - 1; i > 0; i--) { const v = horas[i].veredicto; if (v !== 'mejoro' && v !== 'empeoro') break; if (!racha.tipo) racha = { tipo: v, horas: 1 }; else if (racha.tipo === v) racha.horas++; else break; }
  const ult = horas.at(-1), vsPromedio = ult && promedio > 0 ? ((ult.rend - promedio) / promedio) * 100 : null;
  const texto = [];
  if (!horas.length) texto.push('Todavía no hay horas registradas para esta persona.');
  else if (horas.length === 1) texto.push(`Solo hay una hora registrada (${horas[0].etiqueta}): rindió ${fmt(horas[0].rend)} tallos por hora.`);
  else {
    texto.push(`En ${horas.length} horas rindió ${fmt(promedio)} tallos por hora en promedio${mejor && peor ? `: su mejor hora fue ${mejor.etiqueta} (${fmt(mejor.rend)}) y la más baja ${peor.etiqueta} (${fmt(peor.rend)})` : ''}.`);
    texto.push(tendencia === 'sube' ? `La tendencia del día es a mejorar: gana unos ${fmt(Math.abs(pendiente))} tallos por hora cada hora.` : tendencia === 'baja' ? `La tendencia del día es a bajar: pierde unos ${fmt(Math.abs(pendiente))} tallos por hora cada hora.` : tendencia === 'estable' ? 'Se mantiene estable durante el día.' : 'Con tres horas o más se puede ver la tendencia del día.');
    texto.push(`Frente a la hora anterior mejoró ${mejoras} ${mejoras === 1 ? 'vez' : 'veces'} y empeoró ${empeoras}.${racha.horas >= 2 ? ` Lleva ${racha.horas} horas seguidas ${racha.tipo === 'mejoro' ? 'mejorando' : 'empeorando'}.` : ''}`);
  }
  return { horas, promedio, tallos, mejor, peor, tendencia, pendiente, mejoras, empeoras, racha, ultimaVsPromedio: vsPromedio, texto };
}

/** Todas las personas del Turno Actual, evaluadas. Orden: primero a quienes más conviene mirar (los que empeoran). */
export function evaluarTodos(filas = [], metaHora = 470) {
  const por = new Map();
  for (const r of filas) { const g = por.get(r.colaborador_id) || { id: r.colaborador_id, nombre: r.personas?.nombre || r.colaborador || `ID ${r.colaborador_id}`, mesa: r.mesa ?? null, bloques: [] }; if (r.mesa != null && g.mesa == null) g.mesa = r.mesa; g.bloques.push(r); por.set(r.colaborador_id, g); }
  const peso = { baja: 0, estable: 1, pocas: 2, sube: 3 };
  return [...por.values()].map(g => ({ id: g.id, nombre: g.nombre, mesa: g.mesa, ...evaluarEvolucion(g.bloques, metaHora) })).sort((a, b) => peso[a.tendencia] - peso[b.tendencia] || a.nombre.localeCompare(b.nombre, 'es'));
}
export const resumenGrupo = lista => ({ sube: lista.filter(x => x.tendencia === 'sube').length, baja: lista.filter(x => x.tendencia === 'baja').length, estable: lista.filter(x => x.tendencia === 'estable').length, pocas: lista.filter(x => x.tendencia === 'pocas').length });
