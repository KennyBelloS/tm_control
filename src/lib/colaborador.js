/**
 * Datos del TABLERO INTEGRADO DEL COLABORADOR: reúne lo que varios módulos saben de una persona
 * (boncheo, ranking, devoluciones, asignación a formadora y turno en vivo) y lo deja listo para dibujar.
 * Cada fuente que falle o no exista se omite: el tablero siempre se arma con lo que haya.
 */
import { supabase } from './supabaseClient';
import { getHistorico, getRankingRango, getConfig, getActual, listarPersonasModulo } from './db';
import { cargarDatosDevoluciones, emparejarConDevoluciones } from './devoluciones';
import { estadoPeriodo, resumenPeriodo, asistioEl, diasEnRango, primerDiaMes, popcount } from './devolucionesCalculos';
import * as K from './colaboradorCalculos';

export async function listarColaboradores() {
  const todas = await listarPersonasModulo();
  return todas.filter(p => p.activo !== false).map(p => ({ id: p.id, nombre: p.nombre, mesa: p.mesa ?? null, rol: p.rol || null, activo: p.activo !== false }));
}

/** Asignación más reciente de la persona (formadora y línea) y quiénes más tenía esa formadora ese día. */
async function asignacionReciente(persona, hasta) {
  const { data, error } = await supabase.from('asignaciones_diarias').select('fecha, formadora_id, linea_id, formadoras(nombre), lineas(nombre)')
    .eq('colaborador_id', persona.id).lte('fecha', hasta).order('fecha', { ascending: false }).limit(1);
  if (error || !data?.length) return null;
  const a = data[0];
  const consulta = campos => supabase.from('asignaciones_diarias').select(`colaborador_id, personas(${campos})`).eq('fecha', a.fecha).eq('formadora_id', a.formadora_id);
  let r = await consulta('nombre, mesa');
  if (r.error) r = await consulta('nombre');                                // aún sin la columna "mesa" en Personas
  const equipo = (r.data || []).map(x => ({ id: x.colaborador_id, nombre: x.personas?.nombre || '', mesa: x.personas?.mesa ?? null }));
  return { fecha: a.fecha, formadoraId: a.formadora_id, formadora: a.formadoras?.nombre || null, linea: a.lineas?.nombre || null, equipo };
}

/** Lo de devoluciones de la persona: día por día, asistencia, y los promedios de referencia (general y de su equipo). */
function devolucionesDe(persona, datosDev, P, equipo) {
  if (!datosDev?.dias?.length) return null;
  const devPersonas = [...datosDev.personas.values()];
  const mapa = emparejarConDevoluciones([{ id: persona.id, nombre: persona.nombre, mesa: persona.mesa }, ...(equipo || [])], devPersonas);
  const yo = mapa.get(persona.id);
  const ultima = datosDev.meta?.ultima_fecha_registro || null;
  // referencia GENERAL: devoluciones por día trabajado de toda la finca en el período
  const estado = estadoPeriodo(datosDev, P);
  const refGeneral = resumenPeriodo(estado).porDiaTrabajado;
  // referencia del EQUIPO
  let refEquipo = null;
  if (equipo?.length) {
    let devol = 0, dias = 0; const vistos = new Set();
    for (const m of equipo) { const d = mapa.get(m.id); if (!d || vistos.has(d.id)) continue; vistos.add(d.id); const e = estado.get(d.id); if (e) { devol += e.devol; dias += e.diasTrab; } }
    refEquipo = dias > 0 ? devol / dias : null;
  }
  if (!yo) return { persona: null, ultima, refGeneral, refEquipo };
  const filas = datosDev.dias.filter(d => d.id === yo.id);
  const dias = new Map(filas.map(d => [d.fecha, { total: d.total, razones: d.razones }]));
  const mascaras = new Map(datosDev.asistencia.filter(a => a.id === yo.id).map(a => [a.mes, a.dias]));
  return { persona: yo, ultima, refGeneral, refEquipo, dias, asistio: f => asistioEl(mascaras.get(primerDiaMes(f)) ?? 0, f), razonesNombre: Object.fromEntries((datosDev.meta?.razones || []).map(r => [r.k, r.n])) };
}

/**
 * Arma TODO el tablero de una persona para un período.
 * @param persona { id, nombre, mesa }   @param ref fecha de referencia aaaa-mm-dd   @param tipo 'semana' | 'mes' | '30' | '90'
 */
export async function cargarTableroColaborador({ persona, ref, tipo = 'mes', pesos = K.PESOS_DEFECTO }) {
  const cfg = await getConfig();
  const metaHora = cfg.metaHora || 470;
  const P = K.periodoColaborador(tipo, ref), Pprev = K.periodoPrevio(P);

  const [filas, ranking, datosDev, asignacion, actual] = await Promise.all([
    getHistorico({ desde: Pprev.desde, hasta: P.hasta, colaboradorId: persona.id }),
    getRankingRango(P.desde, P.hasta).catch(() => null),
    cargarDatosDevoluciones().catch(() => null),
    asignacionReciente(persona, ref).catch(() => null),
    getActual({}).catch(() => [])
  ]);

  const enP = filas.filter(f => f.fecha >= P.desde && f.fecha <= P.hasta), enPrev = filas.filter(f => f.fecha >= Pprev.desde && f.fecha <= Pprev.hasta);
  const dev = devolucionesDe(persona, datosDev, P, asignacion?.equipo);
  const devPrev = devolucionesDe(persona, datosDev, Pprev, asignacion?.equipo);
  const devUsable = dev?.persona ? dev : null, devPrevUsable = devPrev?.persona ? devPrev : null;

  const dias = K.armarDias({ boncheo: K.agruparBoncheoPorDia(enP), periodo: P, metaHora, dev: devUsable });
  const diasPrev = K.armarDias({ boncheo: K.agruparBoncheoPorDia(enPrev), periodo: Pprev, metaHora, dev: devPrevUsable });
  const resumen = K.resumenColaborador(dias, metaHora), previo = K.resumenColaborador(diasPrev, metaHora);

  // ranking (puesto del período) y promedios de comparación
  const lista = ranking?.lista || [];
  const idx = lista.findIndex(x => x.colaborador_id === persona.id);
  const rank = idx >= 0 ? { puesto: idx + 1, total: lista.length } : null;
  const promEquipo = (() => {
    if (!asignacion?.equipo?.length) return null;
    const ids = new Set(asignacion.equipo.map(m => m.id));
    const v = lista.filter(x => ids.has(x.colaborador_id)).map(x => x.promedioRend);
    return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
  })();
  const comparativa = {
    rendimiento: { persona: resumen.promedioRend || null, equipo: promEquipo, general: ranking?.rendimientoPromedioGeneral || null },
    devolPorDia: { persona: resumen.devolPorDia, equipo: dev?.refEquipo ?? null, general: dev?.refGeneral ?? null }
  };

  const calidad = K.calidadScore(resumen.devolPorDia, dev?.refGeneral);
  const indice = K.indiceIntegral({ pct: resumen.diasTrabajados ? resumen.pct : null, calidad, constancia: resumen.constancia }, pesos);
  const miTurno = (actual || []).filter(r => r.colaborador_id === persona.id);
  const turno = miTurno.length ? (() => {
    const minutos = miTurno.reduce((s, r) => s + (r.tiempo_trabajado_min || 0), 0), tallos = miTurno.reduce((s, r) => s + (r.total_tallos || 0), 0);
    return { fecha: miTurno[0].fecha, tallos, bloques: miTurno.length, rend: minutos > 0 ? Math.round(tallos / (minutos / 60)) : 0, hasta: miTurno.map(r => r.hora_fin).sort().pop() };
  })() : null;

  return {
    persona, metaHora, ref, periodo: P, previo: Pprev, dias, resumen, resumenPrevio: previo, ranking: rank, comparativa,
    asignacion: asignacion ? { formadora: asignacion.formadora, linea: asignacion.linea, fecha: asignacion.fecha, equipo: asignacion.equipo.length } : null,
    devolucion: { enModulo: !!devUsable, ultima: dev?.ultima ?? null, codigoDev: dev?.persona?.codigo ?? null, razonesNombre: dev?.razonesNombre || {} },
    calidad, indice, turno,
    componentes: { pct: resumen.diasTrabajados ? resumen.pct : null, calidad, constancia: resumen.constancia },      // para recalcular el índice si cambian los pesos, sin volver a cargar
    lecturas: K.lecturas({ resumen, metaHora, ranking: rank, previo: previo.diasTrabajados ? previo : null, refDev: dev?.refGeneral, razonesNombre: dev?.razonesNombre })
  };
}

/** Las 5 personas con mejor rendimiento del período (para sugerir a quién mirar cuando no hay nadie elegido). */
export async function sugeridosColaborador(desde, hasta) {
  const r = await getRankingRango(desde, hasta).catch(() => null);
  return (r?.lista || []).slice(0, 5).map(x => ({ id: x.colaborador_id, nombre: x.colaborador, rend: x.promedioRend }));
}
