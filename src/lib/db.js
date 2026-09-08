// db.js
// -----------------------------------------------------------------------
// Capa de acceso a datos. Todo se guarda en Supabase (proyecto "tm-control").
// No se guarda el Excel en ningún lado: solo los campos ya extraídos.
//
// rendimiento_historico: UN registro por persona por día (se suman los
//   bloques de hora al guardar). El tiempo trabajado/no productivo se
//   ingresa manualmente y con eso se calcula el rendimiento real.
// rendimiento_actual: snapshot de la última carga por hora, un registro
//   por bloque (para ver el detalle del turno en curso).
// -----------------------------------------------------------------------
import { supabase } from './supabaseClient';
import { agregarPorPersonaDia } from './excel';
import { calcularRendimientoReal, calcularRendimientoBloque, agregarTurnoActualPorPersona } from './calculos';

const SELECT_HISTORICO = 'id,fecha,colaborador_id,total_tallos,total_ramos,tiempo_trabajado_min,tiempo_no_productivo_min,semana,personas(nombre)';
const SELECT_ACTUAL = 'id,fecha,colaborador_id,hora_inicio,hora_fin,mesa,total_tallos,total_ramos,rend_tallos,rend_ramos,tiempo_trabajado_min,semana,personas(nombre)';

function aplanar(fila) {
  const { personas, ...resto } = fila;
  return { ...resto, colaborador: personas?.nombre ?? '' };
}

/** Agrega el cálculo real de rendimiento a cada fila del histórico. */
function conRendimientoReal(fila) {
  const { tiempoRealMin, tiempoRealHoras, rendimiento } = calcularRendimientoReal(
    fila.total_tallos, fila.tiempo_trabajado_min, fila.tiempo_no_productivo_min
  );
  return { ...fila, tiempo_real_min: tiempoRealMin, tiempo_real_horas: tiempoRealHoras, rendimiento };
}

// ---------------- CONFIGURACIÓN ----------------
export async function getConfig() {
  const { data, error } = await supabase.from('configuracion').select('*').eq('id', 1).single();
  if (error) throw error;
  return {
    metaHora: data.meta_hora,
    metaGlobalDia: data.meta_global_dia,
    horaInicioDefault: data.hora_inicio_default?.slice(0, 5) ?? '06:00',
    horaFinDefault: data.hora_fin_default?.slice(0, 5) ?? '23:00',
    // Descuento de almuerzo/descansos — desactivado por defecto, y si la
    // columna todavía no existe en Supabase (falta la migración), se
    // comporta igual que si estuviera desactivado, sin romper nada.
    descansosActivos: data.descansos_activos ?? false,
    descansos: Array.isArray(data.descansos) ? data.descansos : [],
  };
}

export async function setConfig(cfg) {
  const payload = {
    meta_hora: cfg.metaHora,
    meta_global_dia: cfg.metaGlobalDia,
    hora_inicio_default: cfg.horaInicioDefault,
    hora_fin_default: cfg.horaFinDefault,
  };
  if (cfg.descansosActivos !== undefined) payload.descansos_activos = cfg.descansosActivos;
  if (cfg.descansos !== undefined) payload.descansos = cfg.descansos;

  const { error } = await supabase.from('configuracion').update(payload).eq('id', 1);
  if (error) {
    if (error.message?.includes('descansos') || error.code === '42703') {
      throw new Error('Falta agregar las columnas de descansos en Supabase. Corre supabase/migracion_descansos.sql en el SQL Editor y vuelve a intentar.');
    }
    throw error;
  }
}

// ---------------- META DEL DÍA (cambia cada día, no es un valor fijo) ----------------
/**
 * Devuelve la meta de tallos para UN día específico. Si no se ha definido
 * una meta puntual para esa fecha, cae al valor "meta_global_dia" de
 * Configuración como sugerencia por defecto.
 */
export async function getMetaDia(fecha) {
  try {
    const { data, error } = await supabase.from('metas_diarias').select('meta_tallos').eq('fecha', fecha).maybeSingle();
    if (error) throw error;
    if (data) return { meta: data.meta_tallos, esPersonalizada: true, tablaLista: true };
  } catch (e) {
    // La tabla "metas_diarias" todavía no existe en este proyecto de Supabase
    // (falta correr supabase/migracion_metas_diarias.sql). Mientras tanto,
    // usamos el valor por defecto de Configuración para no romper el Dashboard.
    console.warn('metas_diarias no disponible todavía:', e.message);
    const cfg = await getConfig();
    return { meta: cfg.metaGlobalDia, esPersonalizada: false, tablaLista: false };
  }
  const cfg = await getConfig();
  return { meta: cfg.metaGlobalDia, esPersonalizada: false, tablaLista: true };
}

/** Define (o reemplaza) la meta de tallos de un día puntual — solo aplica a esa fecha. */
export async function setMetaDia(fecha, metaTallos) {
  const { error } = await supabase.from('metas_diarias').upsert({ fecha, meta_tallos: metaTallos }, { onConflict: 'fecha' });
  if (error) {
    if (error.message?.includes('metas_diarias') || error.code === 'PGRST205' || error.code === '42P01') {
      throw new Error('Falta crear la tabla "metas_diarias" en Supabase. Corre supabase/migracion_metas_diarias.sql en el SQL Editor y vuelve a intentar.');
    }
    throw error;
  }
}

// ---------------- PERSONAS (upsert automático antes de insertar rendimiento) ----------------
async function asegurarPersonas(registros) {
  const mapa = new Map();
  for (const r of registros) {
    if (!mapa.has(r.colaborador_id)) mapa.set(r.colaborador_id, r.colaborador || `ID ${r.colaborador_id}`);
  }
  const filas = [...mapa.entries()].map(([id, nombre]) => ({ id, nombre }));
  if (filas.length === 0) return;
  const { error } = await supabase.from('personas').upsert(filas, { onConflict: 'id' });
  if (error) throw error;
}

// ---------------- RENDIMIENTO HISTÓRICO (permanente, un total por día) ----------------
/**
 * Recibe los registros crudos por bloque de hora (tal como los entrega el
 * Excel), los suma por persona/día, y los guarda como UN solo total por
 * persona por día — incluyendo el tiempo trabajado, que se calcula solo
 * a partir de las horas de cada bloque (o de la hora inicio/fin manual
 * que se haya indicado al subir el archivo). Si vuelves a subir un Excel
 * para el mismo día, el total y el tiempo se recalculan con lo nuevo.
 */
export async function insertarHistorico(registrosPorBloque) {
  const cfg = await getConfig();
  const descansos = cfg.descansosActivos ? cfg.descansos : [];
  const agregados = agregarPorPersonaDia(registrosPorBloque, descansos);
  if (agregados.length === 0) return { insertados: 0 };
  await asegurarPersonas(agregados);
  const filas = agregados.map(({ colaborador, ...resto }) => resto);
  const { error, count } = await supabase
    .from('rendimiento_historico')
    .upsert(filas, { onConflict: 'fecha,colaborador_id', count: 'exact' });
  if (error) throw error;
  return { insertados: count ?? filas.length };
}

export async function getHistorico({ fecha } = {}) {
  let query = supabase.from('rendimiento_historico').select(SELECT_HISTORICO).order('fecha', { ascending: false });
  if (fecha) query = query.eq('fecha', fecha);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(aplanar).map(conRendimientoReal);
}

export async function borrarTablaHistorico() {
  const { error } = await supabase.from('rendimiento_historico').delete().neq('colaborador_id', -1);
  if (error) throw error;
}

/** Edita una fila del histórico: tiempo trabajado / no productivo (en minutos), fecha, tallos. */
export async function actualizarRegistroHistorico(id, cambios) {
  const permitido = (({ fecha, tiempo_trabajado_min, tiempo_no_productivo_min, total_tallos, total_ramos }) =>
    ({ fecha, tiempo_trabajado_min, tiempo_no_productivo_min, total_tallos, total_ramos }))(cambios);
  Object.keys(permitido).forEach(k => permitido[k] === undefined && delete permitido[k]);
  const { error } = await supabase.from('rendimiento_historico').update(permitido).eq('id', id);
  if (error) throw error;
}

export async function eliminarRegistroHistorico(id) {
  const { error } = await supabase.from('rendimiento_historico').delete().eq('id', id);
  if (error) throw error;
}

// ---------------- RENDIMIENTO ACTUAL (solo la última carga, detalle por hora) ----------------
export async function reemplazarActual(registros) {
  await asegurarPersonas(registros);
  const filas = registros.filter(r => r.hora_inicio && r.hora_fin).map(({ colaborador, ...resto }) => resto);
  const { error: errDel } = await supabase.from('rendimiento_actual').delete().neq('id', 0);
  if (errDel) throw errDel;
  if (filas.length === 0) return { insertados: 0 };
  const { error, count } = await supabase.from('rendimiento_actual').insert(filas, { count: 'exact' });
  if (error) throw error;
  return { insertados: count ?? filas.length };
}

export async function getActual({ fecha } = {}) {
  let query = supabase.from('rendimiento_actual').select(SELECT_ACTUAL).order('hora_inicio');
  if (fecha) query = query.eq('fecha', fecha);
  const { data, error } = await query;
  if (error) throw error;
  const cfg = await getConfig();
  const descansos = cfg.descansosActivos ? cfg.descansos : [];
  return (data || []).map(aplanar).map(r => {
    // rendimiento real del bloque: tallos ÷ horas del bloque, ya descontando almuerzo si aplica
    const bloque = calcularRendimientoBloque(r.total_tallos, r.hora_inicio, r.hora_fin, descansos);
    return { ...r, tiempo_trabajado_min: bloque.minutos, tiempo_real_horas: bloque.horas, rendimiento: bloque.rendimiento };
  });
}

export async function borrarTablaActual() {
  const { error } = await supabase.from('rendimiento_actual').delete().neq('id', 0);
  if (error) throw error;
}

export async function actualizarRegistroActual(id, cambios) {
  const permitido = (({ fecha, hora_inicio, hora_fin, tiempo_trabajado_min, total_tallos, total_ramos, mesa }) =>
    ({ fecha, hora_inicio, hora_fin, tiempo_trabajado_min, total_tallos, total_ramos, mesa }))(cambios);
  Object.keys(permitido).forEach(k => permitido[k] === undefined && delete permitido[k]);
  const { error } = await supabase.from('rendimiento_actual').update(permitido).eq('id', id);
  if (error) throw error;
}

export async function eliminarRegistroActual(id) {
  const { error } = await supabase.from('rendimiento_actual').delete().eq('id', id);
  if (error) throw error;
}

/** Elimina TODOS los bloques de una persona en el Turno Actual (para la vista agregada por persona). */
export async function eliminarPersonaDeActual(colaboradorId) {
  const { error } = await supabase.from('rendimiento_actual').delete().eq('colaborador_id', colaboradorId);
  if (error) throw error;
}

// ---------------- RANKING (filtrable por Histórico/día o por Turno actual/hora) ----------------
/** Ranking a partir del Histórico (un total por persona/día). */
export async function getRankingDia(fecha) {
  const filas = await getHistorico({ fecha });
  const lista = filas
    .map(r => ({
      colaborador_id: r.colaborador_id,
      colaborador: r.colaborador,
      totalTallos: r.total_tallos || 0,
      totalRamos: r.total_ramos || 0,
      tiempoMin: r.tiempo_trabajado_min || 0,
      promedioRend: r.rendimiento || 0,
      bloques: 1,
    }))
    .sort((a, b) => b.promedioRend - a.promedioRend);
  const rendimientoPromedioGeneral = lista.length > 0
    ? Math.round(lista.reduce((s, p) => s + p.promedioRend, 0) / lista.length)
    : 0;
  return { lista, rendimientoPromedioGeneral };
}

/**
 * Ranking del Histórico dentro de un RANGO de fechas (por ejemplo, un mes
 * completo). Cada persona aparece una sola vez, con el rendimiento promedio
 * de todos los días de ese rango donde tenga tiempo trabajado registrado.
 */
/** Tendencia de tallos por día (Histórico), últimos N días — para la gráfica del Dashboard. */
export async function getTendenciaHistorico(dias = 14) {
  const hoy = new Date();
  const desde = new Date(hoy); desde.setDate(desde.getDate() - dias);
  const fechaInicio = desde.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('rendimiento_historico')
    .select('fecha,total_tallos')
    .gte('fecha', fechaInicio)
    .order('fecha', { ascending: true });
  if (error) throw error;

  const mapa = new Map();
  for (const r of data || []) {
    mapa.set(r.fecha, (mapa.get(r.fecha) || 0) + (r.total_tallos || 0));
  }
  const fechas = [...mapa.keys()].sort();
  return {
    categorias: fechas.map(f => new Date(f + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })),
    valores: fechas.map(f => mapa.get(f)),
  };
}

export async function getRankingRango(fechaInicio, fechaFin) {
  const { data, error } = await supabase
    .from('rendimiento_historico')
    .select(SELECT_HISTORICO)
    .gte('fecha', fechaInicio)
    .lte('fecha', fechaFin);
  if (error) throw error;
  const filas = (data || []).map(aplanar).map(conRendimientoReal);

  const mapa = new Map();
  for (const r of filas) {
    if (!r.tiempo_trabajado_min) continue; // sin tiempo registrado, no hay rendimiento real que promediar
    const key = r.colaborador_id;
    if (!mapa.has(key)) mapa.set(key, { colaborador_id: key, colaborador: r.colaborador, totalTallos: 0, totalRamos: 0, sumaRend: 0, dias: 0 });
    const acc = mapa.get(key);
    acc.totalTallos += r.total_tallos || 0;
    acc.totalRamos += r.total_ramos || 0;
    acc.sumaRend += r.rendimiento || 0;
    acc.dias += 1;
  }
  const lista = [...mapa.values()]
    .map(a => ({ ...a, promedioRend: a.dias > 0 ? Math.round(a.sumaRend / a.dias) : 0, bloques: a.dias }))
    .sort((a, b) => b.promedioRend - a.promedioRend);

  const rendimientoPromedioGeneral = lista.length > 0
    ? Math.round(lista.reduce((s, p) => s + p.promedioRend, 0) / lista.length)
    : 0;

  return { lista, rendimientoPromedioGeneral, diasConDatos: new Set(filas.map(f => f.fecha)).size };
}

/** Ranking a partir del Turno Actual (hora a hora), un total real por persona (no promedio de bloques sueltos). */
export async function getRankingHoraAHora(fecha) {
  const filas = await getActual({ fecha });
  const cfg = await getConfig();
  const descansos = cfg.descansosActivos ? cfg.descansos : [];
  const agregado = agregarTurnoActualPorPersona(filas, descansos);
  const lista = agregado
    .map(a => ({
      colaborador_id: a.colaborador_id, colaborador: a.colaborador,
      totalTallos: a.total_tallos, totalRamos: a.total_ramos, promedioRend: a.rendimiento, bloques: 1,
    }))
    .sort((a, b) => b.promedioRend - a.promedioRend);
  const rendimientoPromedioGeneral = lista.length > 0
    ? Math.round(lista.reduce((s, p) => s + p.promedioRend, 0) / lista.length)
    : 0;
  return { lista, rendimientoPromedioGeneral };
}

/**
 * Detecta personas con rendimiento "Bajo" (por debajo del 90% de la meta)
 * durante varios días seguidos en el Histórico — para la zona de alertas.
 */
export async function getAlertasBajoRendimiento({ dias = 5, minimoDiasSeguidos = 3 } = {}) {
  const hoy = new Date();
  const fechas = [];
  for (let i = 1; i <= dias; i++) {
    const d = new Date(hoy); d.setDate(d.getDate() - i);
    fechas.push(d.toISOString().slice(0, 10));
  }
  const fechaInicio = fechas[fechas.length - 1];
  const fechaFin = fechas[0];

  const { data, error } = await supabase
    .from('rendimiento_historico')
    .select(SELECT_HISTORICO)
    .gte('fecha', fechaInicio)
    .lte('fecha', fechaFin)
    .order('fecha', { ascending: true });
  if (error) throw error;

  const filas = (data || []).map(aplanar).map(conRendimientoReal).filter(r => r.tiempo_trabajado_min);
  const metaCfg = await getConfig();

  const porPersona = new Map();
  for (const r of filas) {
    if (!porPersona.has(r.colaborador_id)) porPersona.set(r.colaborador_id, { colaborador: r.colaborador, dias: [] });
    const pct = metaCfg.metaHora > 0 ? Math.round((r.rendimiento / metaCfg.metaHora) * 10000) / 100 : 0;
    porPersona.get(r.colaborador_id).dias.push({ fecha: r.fecha, rendimiento: r.rendimiento, pct, bajo: pct < 90 });
  }

  const alertas = [];
  for (const [colaboradorId, info] of porPersona) {
    // racha de días "bajo" más reciente (contando desde el día más reciente hacia atrás)
    let racha = 0;
    for (let i = info.dias.length - 1; i >= 0; i--) {
      if (info.dias[i].bajo) racha++; else break;
    }
    if (racha >= minimoDiasSeguidos) {
      const ultimos = info.dias.slice(-racha);
      const promedioRend = Math.round(ultimos.reduce((s, d) => s + d.rendimiento, 0) / ultimos.length);
      alertas.push({ colaborador_id: colaboradorId, colaborador: info.colaborador, diasSeguidos: racha, promedioRend, ultimaFecha: info.dias[info.dias.length - 1].fecha });
    }
  }
  return alertas.sort((a, b) => b.diasSeguidos - a.diasSeguidos);
}
