/**
 * RESUMEN POR ALCANCE — parte PURA: el mismo resumen ejecutivo para la finca completa, para UN PROCESO (boncheo, clasificación o calidad)
 * o para UNA PERSONA. Devuelve { r, previo, c, equipos } con la misma forma, así el documento no cambia: solo cambia lo que se muestra.
 *   alcance: { tipo:'finca' } | { tipo:'proceso', proceso:'boncheo'|'clasificacion'|'calidad' } | { tipo:'persona', colaboradorId, nombre }
 */
import { calcularResumen, comparar, periodoPrevio } from './resumenGeneral.js';
import { tipoDia } from './festivosColombia.js';

export const PROCESOS = [['boncheo', 'Boncheo'], ['clasificacion', 'Clasificación'], ['calidad', 'Calidad (devoluciones)']];
const NOMBRE_DIA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const diaDe = iso => NOMBRE_DIA[new Date(`${iso}T12:00:00Z`).getUTCDay()];
const sumarDias = (iso, n) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const nombreProceso = p => (PROCESOS.find(x => x[0] === p) || [p, p])[1];
export const etiquetaAlcance = a => (a.tipo === 'persona' ? `Persona: ${a.nombre}` : a.tipo === 'proceso' ? `Proceso: ${nombreProceso(a.proceso)}` : 'Finca completa');

const vacioDev = { total: 0, porMil: null, causas: [], diaMas: null, filtrada: false, hayDatos: false };
function cobertura(datos, p, dias) {
  const lab = []; for (let d = p.desde; d <= p.hasta; d = sumarDias(d, 1)) if (tipoDia(d) === 'ordinario') lab.push(d);
  const dist = l => new Set(l.filter(r => r.fecha >= p.desde && r.fecha <= p.hasta).map(r => r.fecha)).size;
  return { laborables: lab.length, boncheo: dias, devoluciones: dist(datos.devoluciones || []), clasificacion: dist((datos.clasificacionHora || []).filter(r => r.linea !== 99)) };
}
/** Clasificación como proceso: tallos clasificados por día y por hora, por línea. */
export function resumenClasificacion(datos, periodo) {
  const hs = (datos.clasificacionHora || []).filter(r => r.fecha >= periodo.desde && r.fecha <= periodo.hasta && r.linea !== 99);
  const dias = new Map(); for (const r of hs) { const d = dias.get(r.fecha) || { tallos: 0, f: new Set() }; d.tallos += r.tallos; d.f.add(r.hora); dias.set(r.fecha, d); }
  const porDia = [...dias].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([fecha, d]) => ({ fecha, dia: diaDe(fecha), tallos: d.tallos, rend: d.tallos / Math.max(1, d.f.size), personas: 0 }));
  const tallos = porDia.reduce((s, d) => s + d.tallos, 0), franjas = new Set(hs.map(r => `${r.fecha}|${r.hora}`)).size;
  const porLinea = new Map(); for (const r of hs) { const l = porLinea.get(r.linea) || { linea: r.linea, tallos: 0, f: new Set() }; l.tallos += r.tallos; l.f.add(`${r.fecha}|${r.hora}`); porLinea.set(r.linea, l); }
  const lineas = [...porLinea.values()].map(l => ({ linea: l.linea, nombre: datos.lineas?.get(l.linea) || `Línea ${l.linea}`, tallos: l.tallos, porHora: l.tallos / Math.max(1, l.f.size) })).sort((a, b) => b.tallos - a.tallos);
  const mejor = porDia.length ? porDia.reduce((m, d) => (d.tallos > m.tallos ? d : m)) : null, peor = porDia.length > 1 ? porDia.reduce((m, d) => (d.tallos < m.tallos ? d : m)) : null;
  return { periodo, destino: { tipo: 'proceso', proceso: 'clasificacion' }, tallos, rend: tallos / Math.max(1, franjas), diasTrabajados: porDia.length, personasPorDia: 0, metaHora: null, metaDia: 0, cumplimiento: null, cumplimientoGeneral: null, cumplenMetaPct: null, porDia, mejor, peor, destacados: [], destacadosConfiables: [], noConfiables: 0, devoluciones: vacioDev, clasificacion: tallos > 0 ? { tallos, porHora: tallos / Math.max(1, franjas), lineas } : null, horas: franjas, cobertura: cobertura(datos, periodo, porDia.length), serie: { titulo: 'Clasificación por día', unidad: 'tallos', datos: porDia.map(d => ({ fecha: d.fecha, dia: d.dia, valor: d.tallos, texto: `${Math.round(d.rend).toLocaleString('es-CO')} tallos/hora` })) } };
}
/** Calidad como proceso: devoluciones por día, causas y % de tallos sin devolución. */
export function resumenCalidad(datos, periodo) {
  const base = calcularResumen(datos, periodo), porDiaDev = new Map();
  for (const r of datos.devoluciones.filter(x => x.fecha >= periodo.desde && x.fecha <= periodo.hasta)) porDiaDev.set(r.fecha, (porDiaDev.get(r.fecha) || 0) + r.total);
  const dias = [...porDiaDev].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([fecha, v]) => ({ fecha, dia: diaDe(fecha), valor: v, texto: '' }));
  return { ...base, destino: { tipo: 'proceso', proceso: 'calidad' }, destacados: [], destacadosConfiables: [], serie: { titulo: 'Devoluciones por día', unidad: 'devoluciones', datos: dias } };
}

export function calcularAlcance(datos, periodo, alcance = { tipo: 'finca' }) {
  const prev = periodoPrevio(periodo);
  const calc = p => (alcance.tipo === 'persona' ? calcularResumen(datos, p, { tipo: 'persona', colaboradorId: alcance.colaboradorId, nombre: alcance.nombre })
    : alcance.tipo === 'proceso' && alcance.proceso === 'clasificacion' ? resumenClasificacion(datos, p)
    : alcance.tipo === 'proceso' && alcance.proceso === 'calidad' ? resumenCalidad(datos, p) : calcularResumen(datos, p));
  const r = calc(periodo), previo = calc(prev), c = comparar(r, previo);
  const conEquipos = alcance.tipo === 'finca' || (alcance.tipo === 'proceso' && alcance.proceso === 'boncheo');
  const equipos = conEquipos ? [...(datos.formadoras || [])].map(([id, nombre]) => { const d = { tipo: 'formadora', formadoraId: id, nombre }, re = calcularResumen(datos, periodo, d); return { id, nombre, r: re, c: comparar(re, calcularResumen(datos, prev, d)) }; }) : [];
  return { r, previo, c, equipos, alcance };
}
/** Las personas con producción en el período (para elegir de quién sacar el resumen), por nombre. */
export function personasDelPeriodo(datos, periodo) {
  const ids = new Set(datos.historico.filter(r => r.fecha >= periodo.desde && r.fecha <= periodo.hasta).map(r => r.colaborador_id));
  return [...ids].map(id => ({ id, nombre: datos.personas.get(id) || `ID ${id}` })).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}
