/**
 * ANÁLISIS DE DEVOLUCIONES POR CAUSA Y POR PERSONA. PURO: sin base de datos ni pantalla (regla de dependencia: el dominio no conoce a la infraestructura).
 *   datos.dias  [{ fecha, id, razones:{ maltrato:2 }, total, filas }]      razones  [{ k, n }]
 */
import { sumarDias, inicioSemana, finSemana, primerDiaMes, ultimoDiaMes, sumarMeses, HISTORICO } from './devolucionesCalculos.js';

const nombreDe = (razones, k) => razones.find(r => r.k === k)?.n || k.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
const ordenar = (porRazon, razones) => Object.entries(porRazon).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([k, cantidad]) => ({ k, nombre: nombreDe(razones, k), cantidad }));

/** Las N causas con más devoluciones en un rango (para todo el personal). */
export function topCausas(datos, razones, desde, hasta, n = 3) {
  const suma = {};
  for (const r of datos.dias) { if (r.fecha < desde || r.fecha > hasta) continue; for (const [k, v] of Object.entries(r.razones || {})) suma[k] = (suma[k] || 0) + v; }
  const todas = ordenar(suma, razones), total = todas.reduce((s, x) => s + x.cantidad, 0);
  return { total, filas: todas.slice(0, n).map(x => ({ ...x, pct: total > 0 ? x.cantidad / total : 0 })), otras: Math.max(0, todas.length - n) };
}

/**
 * Para CADA causa (fitosanidad, descabece…): las N personas con más devoluciones por esa causa en un rango.
 * Devuelve las causas de la que más devoluciones tiene a la que menos. Empate entre personas: primero el código menor.
 *   [{ k, nombre, total, personasConCausa, personas:[{ id, cantidad }], empatadosFuera }]
 */
export function topPersonasPorCausa(datos, razones, desde, hasta, n = 3) {
  const porCausa = new Map();
  for (const r of datos.dias) {
    if (r.fecha < desde || r.fecha > hasta) continue;
    for (const [k, v] of Object.entries(r.razones || {})) { if (!(v > 0)) continue; if (!porCausa.has(k)) porCausa.set(k, new Map()); const m = porCausa.get(k); m.set(r.id, (m.get(r.id) || 0) + v); }
  }
  const codigoDe = id => { const c = Number(datos.personas?.get?.(id)?.codigo); return Number.isFinite(c) ? c : 1e9; };
  return [...porCausa].map(([k, m]) => {
    const lista = [...m].map(([id, cantidad]) => ({ id, cantidad })).sort((a, b) => b.cantidad - a.cantidad || codigoDe(a.id) - codigoDe(b.id) || a.id - b.id);
    const corte = lista[n - 1]?.cantidad;
    return { k, nombre: nombreDe(razones, k), total: lista.reduce((s, x) => s + x.cantidad, 0), personasConCausa: lista.length, personas: lista.slice(0, n), empatadosFuera: corte == null ? 0 : lista.slice(n).filter(x => x.cantidad === corte).length };
  }).sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre));
}

/** Los defectos de UNA persona en un rango: { total, porRazon }. */
export function defectosPersonaRango(datos, idPersona, desde, hasta) {
  const porRazon = {}; let total = 0;
  for (const r of datos.dias) { if (r.id !== idPersona || r.fecha < desde || r.fecha > hasta) continue; total += r.total; for (const [k, v] of Object.entries(r.razones || {})) porRazon[k] = (porRazon[k] || 0) + v; }
  return { total, porRazon };
}

const ddmm = iso => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
export const TIPOS_COMPARACION = [['dia', 'Día vs día'], ['semana', 'Semana vs semana'], ['mes', 'Mes vs mes'], ['mes_historico', 'Mes vs histórico']];

/**
 * Los dos períodos que se comparan, a partir de la fecha elegida:
 *   día vs día (el día anterior) · semana vs semana (la anterior, domingo a sábado) · mes vs mes (el anterior) · mes vs histórico.
 */
export function periodosComparar(tipo, fecha) {
  if (tipo === 'dia') { const ayer = sumarDias(fecha, -1); return { a: { etiqueta: `Día ${ddmm(fecha)}`, desde: fecha, hasta: fecha }, b: { etiqueta: `Día ${ddmm(ayer)}`, desde: ayer, hasta: ayer } }; }
  if (tipo === 'semana') { const i = inicioSemana(fecha), f = finSemana(fecha), pi = sumarDias(i, -7), pf = sumarDias(f, -7); return { a: { etiqueta: `Semana ${ddmm(i)}–${ddmm(f)}`, desde: i, hasta: f }, b: { etiqueta: `Semana ${ddmm(pi)}–${ddmm(pf)}`, desde: pi, hasta: pf } }; }
  if (tipo === 'mes') { const i = primerDiaMes(fecha), pi = sumarMeses(i, -1), M = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']; return { a: { etiqueta: `${M[Number(i.slice(5, 7)) - 1]} ${i.slice(0, 4)}`, desde: i, hasta: ultimoDiaMes(i) }, b: { etiqueta: `${M[Number(pi.slice(5, 7)) - 1]} ${pi.slice(0, 4)}`, desde: pi, hasta: ultimoDiaMes(pi) } }; }
  const i = primerDiaMes(fecha); return { a: { etiqueta: 'Mes', desde: i, hasta: ultimoDiaMes(i) }, b: { etiqueta: 'Histórico', desde: HISTORICO.desde, hasta: HISTORICO.hasta } };
}

/** La causa principal de una persona, día por día, en un rango (solo los días con devoluciones, del más reciente al más antiguo). */
export function causaPrincipalPorDia(datos, idPersona, desde, hasta, razones) {
  return datos.dias.filter(r => r.id === idPersona && r.fecha >= desde && r.fecha <= hasta && r.total > 0)
    .map(r => { const o = ordenar(r.razones || {}, razones); return { fecha: r.fecha, total: r.total, principal: o[0] || null, otras: o.slice(1) }; })
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
}
/** La causa principal de una persona en todo un rango. */
export function causaPrincipalRango(datos, idPersona, desde, hasta, razones) { const o = ordenar(defectosPersonaRango(datos, idPersona, desde, hasta).porRazon, razones); return o[0] || null; }

/** Los mínimos de días para "menos devoluciones": lo guardado por el administrador, o los de siempre si todavía no hay nada guardado. */
export const MINIMOS_PREDETERMINADOS = Object.freeze({ semana: 5, mes: 22, historico: 25 });
export function minimosValidos(m) {
  const n = (v, d) => { const x = Math.round(Number(v)); return Number.isFinite(x) && x >= 1 && x <= 31 ? x : d; };
  return { semana: n(m?.semana, MINIMOS_PREDETERMINADOS.semana), mes: n(m?.mes, MINIMOS_PREDETERMINADOS.mes), historico: n(m?.historico, MINIMOS_PREDETERMINADOS.historico) };
}

/**
 * Serie para el gráfico de la foto: devoluciones por DÍA (si el rango es de hasta 35 días) o por MES (si es más largo).
 * Devuelve { unidad:'dia'|'mes', barras:[{ etq, valor }] }, de la fecha más antigua a la más reciente.
 */
export function serieDevoluciones(datos, desde, hasta) {
  const por = new Map();
  for (const r of datos.dias) if (r.fecha >= desde && r.fecha <= hasta) por.set(r.fecha, (por.get(r.fecha) || 0) + r.total);
  const fechas = [...por.keys()].sort();
  if (!fechas.length) return { unidad: 'dia', barras: [] };
  const dias = Math.round((new Date(`${fechas[fechas.length - 1]}T12:00:00Z`) - new Date(`${fechas[0]}T12:00:00Z`)) / 864e5) + 1;
  if (dias <= 35) return { unidad: 'dia', barras: fechas.map(f => ({ etq: `${f.slice(8)}/${f.slice(5, 7)}`, valor: por.get(f) })) };
  const meses = new Map(); for (const f of fechas) meses.set(f.slice(0, 7), (meses.get(f.slice(0, 7)) || 0) + por.get(f));
  const M = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return { unidad: 'mes', barras: [...meses].map(([m, v]) => ({ etq: `${M[Number(m.slice(5)) - 1]} ${m.slice(2, 4)}`, valor: v })) };
}
