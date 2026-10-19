/**
 * Cálculos del TABLERO INTEGRADO DEL COLABORADOR. PURO: sin base de datos ni navegador, para poder probarlo con datos reales.
 * Junta lo que la app sabe de una persona: productividad (boncheo), calidad (devoluciones), constancia y comparación con su equipo.
 */
import { calcularRendimientoReal, calcularPorcentajeMeta, clasificarEstado } from './calculos.js';
import { sumarDias, primerDiaMes, ultimoDiaMes, inicioSemana, finSemana } from './devolucionesCalculos.js';

/* ---------------- Períodos ---------------- */
const MS = 86_400_000;
export const diasEntre = (a, b) => Math.round((Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) - Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10))) / MS) + 1;
export const listaDias = (desde, hasta) => Array.from({ length: Math.max(0, diasEntre(desde, hasta)) }, (_, i) => sumarDias(desde, i));
export const TIPOS_PERIODO = { semana: 'Semana', mes: 'Mes', '30': '30 días', '90': '90 días' };

/** El período elegido alrededor de una fecha de referencia (la semana va de domingo a sábado). */
export function periodoColaborador(tipo, ref) {
  if (tipo === 'semana') return { tipo, desde: inicioSemana(ref), hasta: finSemana(ref) };
  if (tipo === 'mes') return { tipo, desde: primerDiaMes(ref), hasta: ultimoDiaMes(ref) };
  const n = tipo === '90' ? 90 : 30;
  return { tipo, desde: sumarDias(ref, -(n - 1)), hasta: ref };
}
/** El período inmediatamente anterior, del mismo tamaño (para decir si mejoró o empeoró). */
export function periodoPrevio(P) {
  if (P.tipo === 'mes') { const fin = sumarDias(P.desde, -1); return { tipo: 'mes', desde: primerDiaMes(fin), hasta: fin }; }
  const n = diasEntre(P.desde, P.hasta);
  return { tipo: P.tipo, desde: sumarDias(P.desde, -n), hasta: sumarDias(P.desde, -1) };
}

/* ---------------- Día por día ---------------- */
/** Une las filas del historial de un mismo día (puede haber varias) y calcula el rendimiento real del día. */
export function agruparBoncheoPorDia(filas) {
  const m = new Map();
  for (const f of filas) {
    const e = m.get(f.fecha) || { tallos: 0, ramos: 0, minTrab: 0, minNoProd: 0 };
    e.tallos += f.total_tallos || 0; e.ramos += f.total_ramos || 0; e.minTrab += f.tiempo_trabajado_min || 0; e.minNoProd += f.tiempo_no_productivo_min || 0;
    m.set(f.fecha, e);
  }
  const res = new Map();
  for (const [fecha, e] of m) {
    if (!(e.minTrab > 0)) continue;                                         // sin tiempo trabajado no cuenta como día trabajado
    const r = calcularRendimientoReal(e.tallos, e.minTrab, e.minNoProd);
    res.set(fecha, { tallos: e.tallos, ramos: e.ramos, horas: r.tiempoRealHoras, rend: r.rendimiento });
  }
  return res;
}

/**
 * Todos los días del período, con lo de boncheo y lo de devoluciones.
 * dev = null (la persona no está en Devoluciones) o { dias: Map(fecha → {total, razones}), asistio: (fecha) → bool, ultima }
 * Un día de devoluciones posterior al último cargado queda en null: NO se inventa un 0.
 */
export function armarDias({ boncheo, periodo, metaHora, dev }) {
  return listaDias(periodo.desde, periodo.hasta).map(fecha => {
    const b = boncheo.get(fecha);
    const pct = b ? calcularPorcentajeMeta(b.rend, metaHora) : null;
    const cargado = !!dev && !!dev.ultima && fecha <= dev.ultima;
    return {
      fecha, trabajo: !!b, tallos: b?.tallos ?? 0, horas: b?.horas ?? 0, rend: b?.rend ?? null, pct,
      estado: b ? clasificarEstado(pct) : null,
      devol: cargado ? (dev.dias.get(fecha)?.total ?? 0) : null,
      razones: cargado ? (dev.dias.get(fecha)?.razones ?? {}) : {},
      asistioDev: cargado ? !!dev.asistio(fecha) : null
    };
  });
}

/* ---------------- Resumen del período ---------------- */
export function resumenColaborador(dias, metaHora) {
  const trabajados = dias.filter(d => d.trabajo);
  const tallos = trabajados.reduce((s, d) => s + d.tallos, 0), horas = trabajados.reduce((s, d) => s + d.horas, 0);
  const promedioRend = trabajados.length ? Math.round(trabajados.reduce((s, d) => s + d.rend, 0) / trabajados.length) : 0;   // igual que el Ranking: promedio simple de los días
  const pct = calcularPorcentajeMeta(promedioRend, metaHora);
  const cumplieron = trabajados.filter(d => d.rend >= metaHora).length;
  const ordenados = [...trabajados].sort((a, b) => b.rend - a.rend);
  // rachas contando hacia atrás desde el último día trabajado
  let rachaCumple = 0, rachaBajo = 0;
  const alReves = [...trabajados].reverse();
  for (const d of alReves) { if (d.rend >= metaHora) rachaCumple++; else break; }
  for (const d of alReves) { if (d.rend < metaHora) rachaBajo++; else break; }
  const conDev = dias.filter(d => d.devol !== null);
  const devol = conDev.reduce((s, d) => s + d.devol, 0);
  const diasAsistencia = conDev.filter(d => d.asistioDev).length;
  const razones = {};
  for (const d of conDev) for (const [k, v] of Object.entries(d.razones)) razones[k] = (razones[k] || 0) + v;
  return {
    diasTrabajados: trabajados.length, tallos, horas: Math.round(horas * 10) / 10, promedioRend, pct, estado: trabajados.length ? clasificarEstado(pct) : null,
    ponderado: horas > 0 ? Math.round(tallos / horas) : 0,
    cumplieron, constancia: trabajados.length ? Math.round((cumplieron / trabajados.length) * 100) : null,
    mejor: ordenados[0] || null, peor: ordenados[ordenados.length - 1] || null, rachaCumple, rachaBajo,
    devol, diasConDatosDev: conDev.length, diasAsistencia, razones,
    devolPorDia: diasAsistencia > 0 ? devol / diasAsistencia : null
  };
}

/* ---------------- Índice integral (propuesto) ---------------- */
export const PESOS_DEFECTO = Object.freeze({ productividad: 50, calidad: 30, constancia: 20 });
export const clamp = (v, a = 0, b = 100) => Math.min(b, Math.max(a, v));

/** Calidad 0–100: sin devoluciones = 100; igual al promedio general = 50; el doble del promedio (o más) = 0. */
export function calidadScore(devolPorDia, referencia) {
  if (devolPorDia == null) return null;
  if (devolPorDia <= 0) return 100;
  if (!(referencia > 0)) return 0;
  return Math.round(clamp(100 * (1 - devolPorDia / (2 * referencia))));
}
/**
 * Índice integral 0–100 = productividad (cumplimiento de la meta, máx. 100) + calidad + constancia (días que cumplió la meta),
 * con pesos ajustables. Si falta un componente (por ejemplo, la persona no está en Devoluciones) los pesos se reparten entre los demás.
 */
export function indiceIntegral({ pct, calidad, constancia }, pesos = PESOS_DEFECTO) {
  const partes = [
    { k: 'productividad', v: pct == null ? null : clamp(pct), peso: pesos.productividad },
    { k: 'calidad', v: calidad, peso: pesos.calidad },
    { k: 'constancia', v: constancia, peso: pesos.constancia }
  ].filter(p => p.v != null && p.peso > 0);
  const total = partes.reduce((s, p) => s + p.peso, 0);
  if (!total) return { score: null, partes: [] };
  const score = Math.round(partes.reduce((s, p) => s + p.v * p.peso, 0) / total);
  return { score, partes: partes.map(p => ({ ...p, peso: Math.round((p.peso / total) * 100) })) };
}
export function nivelIndice(score) {
  if (score == null) return { etiqueta: 'Sin datos', tono: 'neutro' };
  if (score >= 85) return { etiqueta: 'Sobresaliente', tono: 'ok' };
  if (score >= 70) return { etiqueta: 'Sólido', tono: 'ok' };
  if (score >= 50) return { etiqueta: 'En desarrollo', tono: 'aviso' };
  return { etiqueta: 'Requiere apoyo', tono: 'mal' };
}

/* ---------------- Cambio contra el período anterior ---------------- */
/** mejorSiSube: true para rendimiento (más es mejor), false para devoluciones (menos es mejor). */
export function cambio(actual, previo, mejorSiSube = true) {
  if (actual == null || previo == null || previo === 0) return null;
  const pct = ((actual - previo) / Math.abs(previo)) * 100;
  const mejora = mejorSiSube ? pct > 0 : pct < 0;
  return { pct, sube: pct > 0, tono: Math.abs(pct) < 1 ? 'neutro' : mejora ? 'ok' : 'mal' };
}

/* ---------------- Lectura automática ---------------- */
const f0 = n => Math.round(n).toLocaleString('es-CO');
const f1 = n => (Math.round(n * 10) / 10).toLocaleString('es-CO');
const fecha = iso => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const nombreRazon = (k, razones) => razones?.[k] || k.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());

/** Frases que resumen a la persona. Cada una trae un tono (ok · aviso · mal · info) y un ícono. */
export function lecturas({ resumen: r, metaHora, ranking, previo, refDev, razonesNombre }) {
  const out = [];
  if (!r.diasTrabajados) return [{ tono: 'info', icono: 'fa-circle-info', texto: 'No hay días trabajados en este período.' }];
  const tonoPct = r.pct >= 100 ? 'ok' : r.pct >= 90 ? 'aviso' : 'mal';
  out.push({ tono: tonoPct, icono: r.pct >= 100 ? 'fa-bullseye' : 'fa-arrow-trend-down', texto: `Rinde en promedio ${f0(r.promedioRend)} tallos por hora: ${f1(r.pct)}% de la meta de ${f0(metaHora)}.` });
  out.push({ tono: r.constancia >= 70 ? 'ok' : r.constancia >= 40 ? 'aviso' : 'mal', icono: 'fa-calendar-check', texto: `Cumplió la meta ${r.cumplieron} de ${r.diasTrabajados} días trabajados (${r.constancia}%).` });
  if (r.mejor && r.diasTrabajados > 1) out.push({ tono: 'info', icono: 'fa-trophy', texto: `Su mejor día fue el ${fecha(r.mejor.fecha)} con ${f0(r.mejor.rend)} t/h; el más bajo, el ${fecha(r.peor.fecha)} con ${f0(r.peor.rend)} t/h.` });
  if (r.rachaCumple >= 3) out.push({ tono: 'ok', icono: 'fa-fire', texto: `Lleva ${r.rachaCumple} días seguidos cumpliendo la meta.` });
  if (r.rachaBajo >= 3) out.push({ tono: 'mal', icono: 'fa-triangle-exclamation', texto: `Lleva ${r.rachaBajo} días seguidos por debajo de la meta: conviene hablar con ella o él.` });
  if (previo) {
    const c = cambio(r.promedioRend, previo.promedioRend, true);
    if (c && Math.abs(c.pct) >= 5) out.push({ tono: c.tono, icono: c.sube ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down', texto: `Su rendimiento ${c.sube ? 'subió' : 'bajó'} ${f1(Math.abs(c.pct))}% frente al período anterior (${f0(previo.promedioRend)} → ${f0(r.promedioRend)} t/h).` });
  }
  if (ranking?.puesto) {
    const top = ranking.puesto / ranking.total;
    out.push({ tono: top <= 0.1 ? 'ok' : top > 0.75 ? 'aviso' : 'info', icono: 'fa-ranking-star', texto: `Ocupa el puesto ${ranking.puesto} de ${ranking.total} en el ranking de rendimiento del período.` });
  }
  if (r.devolPorDia == null) {
    out.push({ tono: 'info', icono: 'fa-rotate-left', texto: 'No hay devoluciones cargadas para este período (o la persona no aparece en el módulo de Devoluciones).' });
  } else if (r.devol === 0) {
    out.push({ tono: 'ok', icono: 'fa-circle-check', texto: 'No tuvo devoluciones en el período. ¡Excelente calidad!' });
  } else {
    const [kPrincipal] = Object.entries(r.razones).sort((a, b) => b[1] - a[1])[0] || [];
    const comp = refDev > 0 ? (r.devolPorDia / refDev - 1) * 100 : null;
    const txtComp = comp == null ? '' : comp > 5 ? `, ${f0(comp)}% por encima del promedio general` : comp < -5 ? `, ${f0(Math.abs(comp))}% por debajo del promedio general` : ', cerca del promedio general';
    out.push({ tono: comp != null && comp > 20 ? 'mal' : comp != null && comp < -20 ? 'ok' : 'aviso', icono: 'fa-rotate-left', texto: `Tuvo ${f0(r.devol)} devoluciones (${f1(r.devolPorDia)} por día trabajado${txtComp}). Causa principal: ${nombreRazon(kPrincipal, razonesNombre)}.` });
  }
  return out;
}
