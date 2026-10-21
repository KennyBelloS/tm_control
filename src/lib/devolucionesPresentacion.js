/**
 * DEVOLUCIONES EN PRESENTAR. Lógica pura (sin pantalla ni base de datos) para poder probarla.
 *
 * Cuándo se muestra cada vista (según el día de HOY):
 *   · DÍA    siempre: el ÚLTIMO día que tiene devoluciones registradas.
 *   · SEMANA los LUNES y MARTES de cada semana: la semana anterior completa (domingo a sábado, como en el módulo).
 *   · MES    los primeros 5 días de cada mes: el mes anterior completo.
 * Las personas con MÁS devoluciones salen solo con su CÓDIGO; las de MENOS devoluciones, con su NOMBRE.
 */
import { minimosValidos } from './devolucionesAnalisis.js';
import { sumarDias, inicioSemana, finSemana, diaSemana, primerDiaMes, ultimoDiaMes, sumarMeses, estadoPeriodo, rankingPeriodo } from './devolucionesCalculos.js';

export const MINIMOS_DEFECTO = Object.freeze({ dia: 1, semana: 5, mes: 22 });       // días trabajados mínimos para entrar en "menos devoluciones"
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const ddmm = iso => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** Las vistas que tocan HOY (aaaa-mm-dd), dado el último día con devoluciones registradas. */
export function periodosParaPresentar(hoy, ultima) {
  const out = [];
  if (ultima) out.push({ id: 'dev-dia', tipo: 'dia', desde: ultima, hasta: ultima, nombre: 'Devoluciones del día', titulo: 'Devoluciones del día', rango: `${DIAS[diaSemana(ultima)]} ${ddmm(ultima)}/${ultima.slice(0, 4)}`, nota: 'Último día con devoluciones registradas' });
  const dow = diaSemana(hoy);
  if (dow === 1 || dow === 2) {                                                       // lunes o martes
    const fin = sumarDias(inicioSemana(hoy), -1), ini = inicioSemana(fin);
    out.push({ id: 'dev-semana', tipo: 'semana', desde: ini, hasta: fin, nombre: 'Devoluciones de la semana', titulo: 'Devoluciones de la semana', rango: `Semana del ${ddmm(ini)} al ${ddmm(fin)}`, nota: 'Semana anterior (domingo a sábado)' });
  }
  if (Number(hoy.slice(8, 10)) <= 5) {                                                // primeros 5 días del mes
    const ini = sumarMeses(primerDiaMes(hoy), -1), fin = ultimoDiaMes(ini);
    out.push({ id: 'dev-mes', tipo: 'mes', desde: ini, hasta: fin, nombre: 'Devoluciones del mes', titulo: 'Devoluciones del mes', rango: `${MESES[Number(ini.slice(5, 7)) - 1].replace(/^./, c => c.toUpperCase())} ${ini.slice(0, 4)}`, nota: 'Mes anterior completo' });
  }
  return out;
}

/** El ranking de una vista. Devuelve null si ese período no tiene datos (entonces la vista no se muestra). */
export function armarVistaDev(datos, periodo, minimos = MINIMOS_DEFECTO) {
  const estado = estadoPeriodo(datos, { desde: periodo.desde, hasta: periodo.hasta });
  const hay = [...estado.values()].some(e => e.devol > 0 || e.diasTrab > 0);
  if (!hay) return null;
  const r = rankingPeriodo(estado, datos.personas, minimos[periodo.tipo] ?? 1, 5);
  const total = [...estado.values()].reduce((s, e) => s + e.devol, 0);
  return {
    ...periodo, total, personasConDevoluciones: r.personasConDevoluciones, elegibles: r.elegibles, empatadosFuera: r.empatadosFuera, quintoDevol: r.quintoDevol, minDias: r.minDias,
    // MÁS: solo el código (nunca el nombre). MENOS: nombre y código.
    mas: r.mas.map(e => ({ id: e.id, codigo: e.codigo, devol: e.devol, diasTrab: e.diasTrab })),
    menos: r.menos.map(e => ({ id: e.id, codigo: e.codigo, nombre: e.nombre, devol: e.devol, diasTrab: e.diasTrab }))
  };
}

/** Todas las vistas de devoluciones que tocan hoy y tienen datos. */
export function vistasDevolucionesHoy(datos, hoy, minimos = MINIMOS_DEFECTO) {
  if (!datos?.dias?.length) return [];
  const ultima = datos.meta?.ultima_fecha_registro || datos.dias.reduce((m, d) => (d.fecha > m ? d.fecha : m), '');
  return periodosParaPresentar(hoy, ultima).map(p => armarVistaDev(datos, p, minimos)).filter(Boolean);
}

/** Los mínimos de días: los que guardó el administrador en el módulo de Devoluciones (iguales para todos); el del día es siempre 1. */
export function minimosDeDatos(datos) {
  const m = minimosValidos(datos?.ajustes);
  return { dia: 1, semana: m.semana, mes: m.mes };
}
