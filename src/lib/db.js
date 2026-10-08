import { supabase } from './supabaseClient';
import { agregarPorPersonaDia } from './excel';
import { calcularRendimientoReal, calcularRendimientoBloque, agregarTurnoActualPorPersona, minutosEntreBloque, minutosDescansoAplicable } from './calculos';
const SELECT_HISTORICO = 'id,fecha,colaborador_id,total_tallos,total_ramos,tiempo_trabajado_min,tiempo_no_productivo_min,semana,codigos,personas(nombre)';
const SELECT_ACTUAL = 'id,fecha,colaborador_id,hora_inicio,hora_fin,mesa,total_tallos,total_ramos,rend_tallos,rend_ramos,tiempo_trabajado_min,semana,personas(nombre)';
function aplanar(fila) {
  const {
    personas,
    ...resto
  } = fila;
  return {
    ...resto,
    colaborador: personas?.nombre ?? ''
  };
}
function conRendimientoReal(fila) {
  const {
    tiempoRealMin,
    tiempoRealHoras,
    rendimiento
  } = calcularRendimientoReal(fila.total_tallos, fila.tiempo_trabajado_min, fila.tiempo_no_productivo_min);
  return {
    ...fila,
    tiempo_real_min: tiempoRealMin,
    tiempo_real_horas: tiempoRealHoras,
    rendimiento
  };
}
export async function getConfig() {
  const {
    data,
    error
  } = await supabase.from('configuracion').select('*').eq('id', 1).single();
  if (error) throw error;
  return {
    metaHora: data.meta_hora,
    metaGlobalDia: data.meta_global_dia,
    horaInicioDefault: data.hora_inicio_default?.slice(0, 5) ?? '06:00',
    horaFinDefault: data.hora_fin_default?.slice(0, 5) ?? '23:00',
    descansosActivos: data.descansos_activos ?? true,
    descansos: Array.isArray(data.descansos) ? data.descansos : [{
      horaCorte: '12:00',
      minutos: 30
    }],
    descansosActivosHistorico: data.descansos_activos_historico ?? data.descansos_activos ?? true,
    descansosHistorico: Array.isArray(data.descansos_historico) ? data.descansos_historico : (Array.isArray(data.descansos) ? data.descansos : [{
      horaCorte: '12:00',
      minutos: 30
    }]),
    descansosActivosActual: data.descansos_activos_actual ?? data.descansos_activos ?? true,
    descansosActual: Array.isArray(data.descansos_actual) ? data.descansos_actual : (Array.isArray(data.descansos) ? data.descansos : [{
      horaCorte: '12:00',
      minutos: 30
    }]),
    almacenamientoLimiteMB: data.almacenamiento_limite_mb ?? 500,
    diaFinSemana: data.dia_fin_semana ?? 6
  };
}
export async function setConfig(cfg) {
  const payload = {
    meta_hora: cfg.metaHora,
    meta_global_dia: cfg.metaGlobalDia,
    hora_inicio_default: cfg.horaInicioDefault,
    hora_fin_default: cfg.horaFinDefault
  };
  if (cfg.descansosActivos !== undefined) payload.descansos_activos = cfg.descansosActivos;
  if (cfg.descansos !== undefined) payload.descansos = cfg.descansos;
  if (cfg.descansosActivosHistorico !== undefined) payload.descansos_activos_historico = cfg.descansosActivosHistorico;
  if (cfg.descansosHistorico !== undefined) payload.descansos_historico = cfg.descansosHistorico;
  if (cfg.descansosActivosActual !== undefined) payload.descansos_activos_actual = cfg.descansosActivosActual;
  if (cfg.descansosActual !== undefined) payload.descansos_actual = cfg.descansosActual;
  if (cfg.diaFinSemana !== undefined) payload.dia_fin_semana = cfg.diaFinSemana;
  const {
    error
  } = await supabase.from('configuracion').update(payload).eq('id', 1);
  if (error) {
    if (error.message?.includes('descansos') || error.code === '42703') {
      throw new Error('Falta agregar las columnas de descansos en Supabase. Corre supabase/migracion_descansos.sql en el SQL Editor y vuelve a intentar.');
    }
    throw error;
  }
}
export async function getMetaDia(fecha) {
  try {
    const {
      data,
      error
    } = await supabase.from('metas_diarias').select('meta_tallos').eq('fecha', fecha).maybeSingle();
    if (error) throw error;
    if (data) return {
      meta: data.meta_tallos,
      esPersonalizada: true,
      tablaLista: true
    };
  } catch (e) {
    console.warn('metas_diarias no disponible todavía:', e.message);
    const cfg = await getConfig();
    return {
      meta: cfg.metaGlobalDia,
      esPersonalizada: false,
      tablaLista: false
    };
  }
  const cfg = await getConfig();
  return {
    meta: cfg.metaGlobalDia,
    esPersonalizada: false,
    tablaLista: true
  };
}
export async function setMetaDia(fecha, metaTallos) {
  const {
    error
  } = await supabase.from('metas_diarias').upsert({
    fecha,
    meta_tallos: metaTallos
  }, {
    onConflict: 'fecha'
  });
  if (error) {
    if (error.message?.includes('metas_diarias') || error.code === 'PGRST205' || error.code === '42P01') {
      throw new Error('Falta crear la tabla "metas_diarias" en Supabase. Corre supabase/migracion_metas_diarias.sql en el SQL Editor y vuelve a intentar.');
    }
    throw error;
  }
}

/**
 * Suma la meta de tallos de cada día dentro de un rango (usada en Ranking
 * para "Meta del período" — día, semana o mes). Los días sin meta puntual
 * usan el valor por defecto de Configuración.
 */
export async function getMetaTotalPeriodo(fechaInicio, fechaFin) {
  const cfg = await getConfig();
  let metasPorFecha = new Map();
  try {
    const { data, error } = await supabase
      .from('metas_diarias')
      .select('fecha, meta_tallos')
      .gte('fecha', fechaInicio)
      .lte('fecha', fechaFin);
    if (error) throw error;
    metasPorFecha = new Map((data || []).map(m => [m.fecha, m.meta_tallos]));
  } catch {
    // tabla metas_diarias aún no existe — se usa el valor por defecto para todos los días
  }

  const inicio = new Date(fechaInicio + 'T00:00:00');
  const fin = new Date(fechaFin + 'T00:00:00');
  let total = 0;
  for (let d = new Date(inicio); d <= fin; d.setDate(d.getDate() + 1)) {
    const fechaISO = d.toISOString().slice(0, 10);
    total += metasPorFecha.get(fechaISO) ?? cfg.metaGlobalDia;
  }
  return total;
}

async function asegurarPersonas(registros) {
  const mapa = new Map();
  for (const r of registros) {
    if (!mapa.has(r.colaborador_id)) mapa.set(r.colaborador_id, r.colaborador || `ID ${r.colaborador_id}`);
  }
  const filas = [...mapa.entries()].map(([id, nombre]) => ({
    id,
    nombre
  }));
  if (filas.length === 0) return;
  const {
    error
  } = await supabase.from('personas').upsert(filas, {
    onConflict: 'id'
  });
  if (error) throw error;
}

/** Lista completa de personas para el módulo Personas (con código, rol, activo). */
export async function listarPersonasModulo() {
  let { data, error } = await supabase
    .from('personas')
    .select('id, nombre, codigo_empleado, rol, activo, mesa')
    .order('nombre', { ascending: true });
  if (error) {
    // Si todavía no se corrió el SQL (columna "mesa"), todo sigue funcionando sin ella.
    ({ data, error } = await supabase
      .from('personas')
      .select('id, nombre, codigo_empleado, rol, activo')
      .order('nombre', { ascending: true }));
    if (error) throw error;
  }
  return data || [];
}

/**
 * Total de horas trabajadas (histórico completo) de cada persona — para
 * identificar a quién le conviene desactivar por poca actividad. Ojo:
 * desactivar NO borra sus registros del Histórico, así que los tallos que
 * ya procesó siguen contando en los totales semanales/mensuales de siempre.
 */
export async function getHorasTotalesPorPersona() {
  const { data, error } = await supabase
    .from('rendimiento_historico')
    .select('colaborador_id, tiempo_trabajado_min, tiempo_no_productivo_min');
  if (error) throw error;
  const mapa = new Map();
  for (const r of data || []) {
    const min = Math.max(0, (r.tiempo_trabajado_min || 0) - (r.tiempo_no_productivo_min || 0));
    mapa.set(r.colaborador_id, (mapa.get(r.colaborador_id) || 0) + min);
  }
  const resultado = new Map();
  for (const [id, min] of mapa) resultado.set(id, Math.round(min / 60 * 10) / 10);
  return resultado;
}

/** Sube (o actualiza) muchas personas de una vez desde el Excel de Activos Boncheo. */
export async function insertarPersonasDesdeExcel(personas) {
  if (!personas || personas.length === 0) return { insertados: 0 };
  let r = await supabase.from('personas').upsert(personas, { onConflict: 'id', count: 'exact' });
  if (r.error && /mesa/i.test(r.error.message || '')) {
    const sinMesa = personas.map(({ mesa, ...resto }) => resto); // aún no existe la columna "mesa"
    r = await supabase.from('personas').upsert(sinMesa, { onConflict: 'id', count: 'exact' });
  }
  if (r.error) throw r.error;
  return { insertados: r.count ?? personas.length };
}

/** Agrega una persona a mano. "id" es su Emp.Cod (el código con el que la identifica el boncheo). */
export async function agregarPersonaManual({ id, nombre, mesa, rol }) {
  const fila = { id, nombre, codigo_empleado: String(id), mesa: mesa || null, rol: rol || null, activo: true };
  let r = await supabase.from('personas').insert(fila);
  if (r.error && /mesa/i.test(r.error.message || '')) {
    const { mesa: _m, ...sinMesa } = fila;
    r = await supabase.from('personas').insert(sinMesa);
  }
  if (r.error) {
    if (r.error.code === '23505') throw new Error(`Ya existe una persona con el Emp.Cod ${id}.`);
    throw r.error;
  }
}

/** Edita nombre, mesa o rol. El Emp.Cod (id) no se cambia: es lo que la une con sus rendimientos. */
export async function actualizarPersonaModulo(id, cambios) {
  const permitido = {};
  if (cambios.nombre !== undefined) permitido.nombre = cambios.nombre;
  if (cambios.rol !== undefined) permitido.rol = cambios.rol || null;
  if (cambios.mesa !== undefined) permitido.mesa = cambios.mesa === '' || cambios.mesa == null ? null : Number(cambios.mesa);
  const { error } = await supabase.from('personas').update(permitido).eq('id', id);
  if (error) {
    if (/mesa/i.test(error.message || '')) throw new Error('Falta correr en Supabase el SQL que agrega la columna "mesa".');
    throw error;
  }
}

/** Activa/desactiva una persona (no se borra, para no romper el histórico ya guardado). */
export async function cambiarActivoPersona(id, activo) {
  const { error } = await supabase.from('personas').update({ activo }).eq('id', id);
  if (error) throw error;
}
export async function insertarHistorico(registrosPorBloque) {
  const cfg = await getConfig();
  const descansos = cfg.descansosActivosHistorico ? cfg.descansosHistorico : [];
  const fechasEnCarga = [...new Set(registrosPorBloque.map(r => r.fecha))];
  const descansosPorFecha = await getDescansosDiariosRango(fechasEnCarga, 'historico');
  const agregados = agregarPorPersonaDia(registrosPorBloque, descansos, descansosPorFecha);
  if (agregados.length === 0) return {
    insertados: 0
  };
  await asegurarPersonas(agregados);
  const filas = agregados.map(({
    colaborador,
    ...resto
  }) => resto);
  const {
    error,
    count
  } = await supabase.from('rendimiento_historico').upsert(filas, {
    onConflict: 'fecha,colaborador_id',
    count: 'exact'
  });
  if (error) throw error;

  // Guarda los bloques de hora originales (para poder recalcular el tiempo
  // trabajado en vivo si más adelante cambia la configuración de descansos).
  try {
    const fechasAfectadas = [...new Set(agregados.map(a => a.fecha))];
    const idsAfectados = [...new Set(agregados.map(a => a.colaborador_id))];
    await supabase.from('historico_bloques').delete().in('fecha', fechasAfectadas).in('colaborador_id', idsAfectados);
    const bloques = registrosPorBloque
      .filter(r => r.hora_inicio && r.hora_fin)
      .map(r => ({ fecha: r.fecha, colaborador_id: r.colaborador_id, hora_inicio: r.hora_inicio, hora_fin: r.hora_fin }));
    if (bloques.length > 0) {
      await supabase.from('historico_bloques').insert(bloques);
    }
  } catch {
    // si la tabla historico_bloques aún no existe (falta la migración), no rompe la carga del Excel
  }

  // Limpieza automática y silenciosa: 1 de cada ~20 cargas, aprovecha para
  // borrar bloques viejos que ya no necesitan recalcularse (mantiene la
  // base de datos liviana sin que el usuario tenga que hacer nada).
  if (Math.random() < 0.05) {
    limpiarBloquesAntiguos(90).catch(() => {});
  }

  return {
    insertados: count ?? filas.length
  };
}

/**
 * Fecha del registro más reciente guardado en el Histórico (no
 * necesariamente "ayer" — por ejemplo, si el domingo no se trabaja, el
 * último registro puede ser del sábado). Se usa para que la pestaña de
 * Rendimientos abra mostrando el día pendiente de revisar, no un día
 * vacío.
 */
export async function getUltimaFechaHistorico() {
  const { data, error } = await supabase
    .from('rendimiento_historico')
    .select('fecha')
    .order('fecha', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.fecha || null;
}

/**
 * Cuántos días distintos hay guardados en el Histórico en total (sin
 * filtro) — para que se vea con claridad que nada se está perdiendo,
 * aunque la vista por defecto solo muestre el último día.
 */
export async function getResumenHistoricoCompleto() {
  const { data, error } = await supabase.from('rendimiento_historico').select('fecha');
  if (error) throw error;
  const fechas = [...new Set((data || []).map(r => r.fecha))];
  return {
    totalDias: fechas.length,
    totalRegistros: (data || []).length,
    primeraFecha: fechas.sort()[0] || null,
    ultimaFecha: fechas.sort().reverse()[0] || null
  };
}

/**
 * Descuento de tiempo (almuerzo) para UN día específico, si existe. Si ese
 * día no tiene su propia fila, devuelve null y hay que usar la config
 * general (cfg.descansosActivosHistorico/Actual). "tipo" es 'historico' o 'actual'.
 */
export async function getDescansosDia(fecha, tipo) {
  try {
    const { data, error } = await supabase
      .from('descansos_diarios')
      .select('activos, descansos')
      .eq('fecha', fecha)
      .eq('tipo', tipo)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return { activos: data.activos, descansos: data.descansos || [] };
  } catch {
    return null; // si la tabla todavía no existe, se usa la config general sin romper nada
  }
}

/** Descuentos por día de un RANGO de fechas, ya como mapa "fecha_tipo" -> {activos, descansos}. */
export async function getDescansosDiariosRango(fechas, tipo) {
  if (!fechas || fechas.length === 0) return new Map();
  try {
    const { data, error } = await supabase
      .from('descansos_diarios')
      .select('fecha, activos, descansos')
      .eq('tipo', tipo)
      .in('fecha', fechas);
    if (error) throw error;
    return new Map((data || []).map(d => [d.fecha, { activos: d.activos, descansos: d.descansos || [] }]));
  } catch {
    return new Map();
  }
}

/** Guarda (o reemplaza) el descuento de un día puntual — solo afecta esa fecha. */
export async function setDescansosDia(fecha, tipo, activos, descansos) {
  const { error } = await supabase.from('descansos_diarios').upsert({
    fecha,
    tipo,
    activos,
    descansos
  }, { onConflict: 'fecha,tipo' });
  if (error) throw error;
}

/** Quita el descuento puntual de un día — vuelve a usar la config general. */
export async function quitarDescansosDia(fecha, tipo) {
  const { error } = await supabase.from('descansos_diarios').delete().eq('fecha', fecha).eq('tipo', tipo);
  if (error) throw error;
}

/**
 * Trae el horario real (hora de entrada más temprana y hora de salida más
 * tardía) que se registró para una persona en un día específico — para que
 * al editar el tiempo trabajado, el formulario ya venga con el horario que
 * de verdad se cargó ese día, no un horario genérico fijo.
 */
export async function getRangoHorarioHistorico(fecha, colaboradorId) {
  try {
    const { data, error } = await supabase
      .from('historico_bloques')
      .select('hora_inicio, hora_fin')
      .eq('fecha', fecha)
      .eq('colaborador_id', colaboradorId);
    if (error) throw error;
    if (!data || data.length === 0) return null;
    const horaInicio = data.map(b => b.hora_inicio).sort()[0];
    const horaFin = data.map(b => b.hora_fin).sort()[data.length - 1];
    return { horaInicio: horaInicio.slice(0, 5), horaFin: horaFin.slice(0, 5) };
  } catch {
    return null;
  }
}

export async function getHistorico({
  fecha,
  desde,
  hasta
} = {}) {
  let query = supabase.from('rendimiento_historico').select(SELECT_HISTORICO).order('fecha', {
    ascending: false
  });
  if (fecha) query = query.eq('fecha', fecha);
  if (desde) query = query.gte('fecha', desde);
  if (hasta) query = query.lte('fecha', hasta);
  const {
    data,
    error
  } = await query;
  if (error) throw error;
  const filas = (data || []).map(aplanar).map(conRendimientoReal);
  if (filas.length === 0) return filas;

  // Recalcula el tiempo trabajado EN VIVO con la config de descansos actual,
  // usando los bloques de hora originales guardados al subir el Excel. Si un
  // día/persona no tiene bloques guardados (ej. se editó manualmente antes de
  // esta función existir), se deja el valor que ya estaba guardado.
  try {
    const fechas = [...new Set(filas.map(f => f.fecha))];
    const { data: bloquesData, error: errorBloques } = await supabase
      .from('historico_bloques')
      .select('fecha,colaborador_id,hora_inicio,hora_fin')
      .in('fecha', fechas);
    if (errorBloques) throw errorBloques;

    if (bloquesData && bloquesData.length > 0) {
      const cfg = await getConfig();
      const descansos = cfg.descansosActivosHistorico ? cfg.descansosHistorico : [];
      const descansosPorFecha = await getDescansosDiariosRango(fechas, 'historico');
      const mapaBloques = new Map();
      for (const b of bloquesData) {
        const key = `${b.fecha}_${b.colaborador_id}`;
        if (!mapaBloques.has(key)) mapaBloques.set(key, []);
        mapaBloques.get(key).push(b);
      }
      for (const f of filas) {
        const key = `${f.fecha}_${f.colaborador_id}`;
        const bloques = mapaBloques.get(key);
        if (!bloques || bloques.length === 0) continue;
        const descansosDelDia = descansosPorFecha.has(f.fecha)
          ? (descansosPorFecha.get(f.fecha).activos ? descansosPorFecha.get(f.fecha).descansos : [])
          : descansos;
        let minutos = 0;
        for (const b of bloques) {
          const brutos = minutosEntreBloque(b.hora_inicio, b.hora_fin);
          const descuento = minutosDescansoAplicable(b.hora_inicio, b.hora_fin, descansosDelDia);
          minutos += Math.max(0, brutos - descuento);
        }
        f.tiempo_trabajado_min = minutos;
        const { tiempoRealMin, tiempoRealHoras, rendimiento } = calcularRendimientoReal(f.total_tallos, minutos, f.tiempo_no_productivo_min);
        f.tiempo_real_min = tiempoRealMin;
        f.tiempo_real_horas = tiempoRealHoras;
        f.rendimiento = rendimiento;
      }
    }
  } catch {
    // si historico_bloques todavía no existe (falta la migración), se usan los valores ya guardados sin romper nada
  }

  return filas;
}
export async function borrarTablaHistorico() {
  const {
    error
  } = await supabase.from('rendimiento_historico').delete().neq('colaborador_id', -1);
  if (error) throw error;
}
export async function actualizarRegistroHistorico(id, cambios) {
  const permitido = (({
    fecha,
    tiempo_trabajado_min,
    tiempo_no_productivo_min,
    total_tallos,
    total_ramos
  }) => ({
    fecha,
    tiempo_trabajado_min,
    tiempo_no_productivo_min,
    total_tallos,
    total_ramos
  }))(cambios);
  Object.keys(permitido).forEach(k => permitido[k] === undefined && delete permitido[k]);

  // Si se está editando manualmente el tiempo trabajado, reemplazamos el
  // bloque de hora de esa persona/día por el que acaba de escribir (si dio
  // hora inicio y fin) — así, si más adelante cambia la configuración de
  // descansos, este registro también se sigue recalculando solo. Si no dio
  // horas (edición antigua sin horario), simplemente se borran los bloques
  // para que el valor manual quede firme.
  if (permitido.tiempo_trabajado_min !== undefined) {
    try {
      const { data: filaActual } = await supabase.from('rendimiento_historico').select('fecha,colaborador_id').eq('id', id).single();
      if (filaActual) {
        await supabase.from('historico_bloques').delete().eq('fecha', filaActual.fecha).eq('colaborador_id', filaActual.colaborador_id);
        if (cambios.hora_inicio && cambios.hora_fin) {
          await supabase.from('historico_bloques').insert({
            fecha: filaActual.fecha,
            colaborador_id: filaActual.colaborador_id,
            hora_inicio: cambios.hora_inicio,
            hora_fin: cambios.hora_fin,
          });
        }
      }
    } catch { /* si historico_bloques no existe todavía, no rompe la edición */ }
  }

  const {
    error
  } = await supabase.from('rendimiento_historico').update(permitido).eq('id', id);
  if (error) throw error;
}
export async function eliminarRegistroHistorico(id) {
  const {
    error
  } = await supabase.from('rendimiento_historico').delete().eq('id', id);
  if (error) throw error;
}
export async function reemplazarActual(registros) {
  await asegurarPersonas(registros);
  const filas = registros.filter(r => r.hora_inicio && r.hora_fin).map(({
    colaborador,
    ...resto
  }) => resto);
  const {
    error: errDel
  } = await supabase.from('rendimiento_actual').delete().neq('id', 0);
  if (errDel) throw errDel;
  if (filas.length === 0) return {
    insertados: 0
  };
  const {
    error,
    count
  } = await supabase.from('rendimiento_actual').insert(filas, {
    count: 'exact'
  });
  if (error) throw error;
  return {
    insertados: count ?? filas.length
  };
}
export async function getActual({
  fecha
} = {}) {
  let query = supabase.from('rendimiento_actual').select(SELECT_ACTUAL).order('hora_inicio');
  if (fecha) query = query.eq('fecha', fecha);
  const {
    data,
    error
  } = await query;
  if (error) throw error;
  const cfg = await getConfig();
  const descansos = cfg.descansosActivosActual ? cfg.descansosActual : [];
  const fechasEnActual = [...new Set((data || []).map(r => r.fecha))];
  const descansosPorFecha = await getDescansosDiariosRango(fechasEnActual, 'actual');
  return (data || []).map(aplanar).map(r => {
    const descansosDelDia = descansosPorFecha.has(r.fecha)
      ? (descansosPorFecha.get(r.fecha).activos ? descansosPorFecha.get(r.fecha).descansos : [])
      : descansos;
    const bloque = calcularRendimientoBloque(r.total_tallos, r.hora_inicio, r.hora_fin, descansosDelDia);
    return {
      ...r,
      tiempo_trabajado_min: bloque.minutos,
      tiempo_real_horas: bloque.horas,
      rendimiento: bloque.rendimiento
    };
  });
}
export async function borrarTablaActual() {
  const {
    error
  } = await supabase.from('rendimiento_actual').delete().neq('id', 0);
  if (error) throw error;
}
export async function actualizarRegistroActual(id, cambios) {
  const permitido = (({
    fecha,
    hora_inicio,
    hora_fin,
    tiempo_trabajado_min,
    total_tallos,
    total_ramos,
    mesa
  }) => ({
    fecha,
    hora_inicio,
    hora_fin,
    tiempo_trabajado_min,
    total_tallos,
    total_ramos,
    mesa
  }))(cambios);
  Object.keys(permitido).forEach(k => permitido[k] === undefined && delete permitido[k]);
  const {
    error
  } = await supabase.from('rendimiento_actual').update(permitido).eq('id', id);
  if (error) throw error;
}
export async function eliminarRegistroActual(id) {
  const {
    error
  } = await supabase.from('rendimiento_actual').delete().eq('id', id);
  if (error) throw error;
}
export async function eliminarPersonaDeActual(colaboradorId) {
  const {
    error
  } = await supabase.from('rendimiento_actual').delete().eq('colaborador_id', colaboradorId);
  if (error) throw error;
}
export async function getRankingDia(fecha) {
  const filas = await getHistorico({
    fecha
  });
  const lista = filas.map(r => ({
    colaborador_id: r.colaborador_id,
    colaborador: r.colaborador,
    totalTallos: r.total_tallos || 0,
    totalRamos: r.total_ramos || 0,
    tiempoMin: r.tiempo_trabajado_min || 0,
    promedioRend: r.rendimiento || 0,
    bloques: 1
  })).sort((a, b) => b.promedioRend - a.promedioRend);
  const rendimientoPromedioGeneral = lista.length > 0 ? Math.round(lista.reduce((s, p) => s + p.promedioRend, 0) / lista.length) : 0;
  return {
    lista,
    rendimientoPromedioGeneral
  };
}
export async function getTendenciaHistorico() {
  const hoy = new Date();
  const desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const fechaInicio = desde.toISOString().slice(0, 10);
  const {
    data,
    error
  } = await supabase.from('rendimiento_historico').select('fecha,total_tallos').gte('fecha', fechaInicio).order('fecha', {
    ascending: true
  });
  if (error) throw error;
  const mapa = new Map();
  for (const r of data || []) {
    mapa.set(r.fecha, (mapa.get(r.fecha) || 0) + (r.total_tallos || 0));
  }
  const fechas = [...mapa.keys()].sort();
  return {
    categorias: fechas.map(f => new Date(f + 'T00:00:00').toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short'
    })),
    valores: fechas.map(f => mapa.get(f))
  };
}
export async function getRankingRango(fechaInicio, fechaFin) {
  const {
    data,
    error
  } = await supabase.from('rendimiento_historico').select(SELECT_HISTORICO).gte('fecha', fechaInicio).lte('fecha', fechaFin);
  if (error) throw error;
  const filas = (data || []).map(aplanar).map(conRendimientoReal);
  const mapa = new Map();
  for (const r of filas) {
    if (!r.tiempo_trabajado_min) continue;
    const key = r.colaborador_id;
    if (!mapa.has(key)) mapa.set(key, {
      colaborador_id: key,
      colaborador: r.colaborador,
      totalTallos: 0,
      totalRamos: 0,
      sumaRend: 0,
      dias: 0
    });
    const acc = mapa.get(key);
    acc.totalTallos += r.total_tallos || 0;
    acc.totalRamos += r.total_ramos || 0;
    acc.sumaRend += r.rendimiento || 0;
    acc.dias += 1;
  }
  const lista = [...mapa.values()].map(a => ({
    ...a,
    promedioRend: a.dias > 0 ? Math.round(a.sumaRend / a.dias) : 0,
    bloques: a.dias
  })).sort((a, b) => b.promedioRend - a.promedioRend);
  const rendimientoPromedioGeneral = lista.length > 0 ? Math.round(lista.reduce((s, p) => s + p.promedioRend, 0) / lista.length) : 0;
  return {
    lista,
    rendimientoPromedioGeneral,
    diasConDatos: new Set(filas.map(f => f.fecha)).size
  };
}
export async function getRankingHoraAHora(fecha) {
  const filas = await getActual({
    fecha
  });
  const cfg = await getConfig();
  const descansos = cfg.descansosActivosActual ? cfg.descansosActual : [];
  const descansosPorFecha = await getDescansosDiariosRango([fecha], 'actual');
  const agregado = agregarTurnoActualPorPersona(filas, descansos, descansosPorFecha);
  const lista = agregado.map(a => ({
    colaborador_id: a.colaborador_id,
    colaborador: a.colaborador,
    totalTallos: a.total_tallos,
    totalRamos: a.total_ramos,
    promedioRend: a.rendimiento,
    bloques: 1
  })).sort((a, b) => b.promedioRend - a.promedioRend);
  const rendimientoPromedioGeneral = lista.length > 0 ? Math.round(lista.reduce((s, p) => s + p.promedioRend, 0) / lista.length) : 0;
  return {
    lista,
    rendimientoPromedioGeneral
  };
}
export async function getAlertasBajoRendimiento({
  dias = 5,
  minimoDiasSeguidos = 3
} = {}) {
  const hoy = new Date();
  const fechas = [];
  for (let i = 1; i <= dias; i++) {
    const d = new Date(hoy);
    d.setDate(d.getDate() - i);
    fechas.push(d.toISOString().slice(0, 10));
  }
  const fechaInicio = fechas[fechas.length - 1];
  const fechaFin = fechas[0];
  const {
    data,
    error
  } = await supabase.from('rendimiento_historico').select(SELECT_HISTORICO).gte('fecha', fechaInicio).lte('fecha', fechaFin).order('fecha', {
    ascending: true
  });
  if (error) throw error;
  const filas = (data || []).map(aplanar).map(conRendimientoReal).filter(r => r.tiempo_trabajado_min);
  const metaCfg = await getConfig();
  const porPersona = new Map();
  for (const r of filas) {
    if (!porPersona.has(r.colaborador_id)) porPersona.set(r.colaborador_id, {
      colaborador: r.colaborador,
      dias: []
    });
    const pct = metaCfg.metaHora > 0 ? Math.round(r.rendimiento / metaCfg.metaHora * 10000) / 100 : 0;
    porPersona.get(r.colaborador_id).dias.push({
      fecha: r.fecha,
      rendimiento: r.rendimiento,
      pct,
      bajo: pct < 90
    });
  }
  const alertas = [];
  for (const [colaboradorId, info] of porPersona) {
    let racha = 0;
    for (let i = info.dias.length - 1; i >= 0; i--) {
      if (info.dias[i].bajo) racha++;else break;
    }
    if (racha >= minimoDiasSeguidos) {
      const ultimos = info.dias.slice(-racha);
      const promedioRend = Math.round(ultimos.reduce((s, d) => s + d.rendimiento, 0) / ultimos.length);
      alertas.push({
        colaborador_id: colaboradorId,
        colaborador: info.colaborador,
        diasSeguidos: racha,
        promedioRend,
        ultimaFecha: info.dias[info.dias.length - 1].fecha
      });
    }
  }
  return alertas.sort((a, b) => b.diasSeguidos - a.diasSeguidos);
}
export async function getAlmacenamientoUsadoMB() {
  const {
    data,
    error
  } = await supabase.rpc('almacenamiento_usado_mb');
  if (error) throw error;
  return Number(data) || 0;
}

/**
 * Borra los bloques de hora del Histórico más viejos que `diasRetencion`
 * días. El tiempo trabajado ya calculado se queda guardado tal cual en
 * rendimiento_historico (no se pierde nada visible) — solo se libera el
 * detalle por bloque, que ya no hace falta recalcular para días tan
 * antiguos. Esto evita que la tabla historico_bloques crezca sin control.
 */
export async function limpiarBloquesAntiguos(diasRetencion = 90) {
  const limite = new Date();
  limite.setDate(limite.getDate() - diasRetencion);
  const fechaLimite = limite.toISOString().slice(0, 10);
  try {
    const { error, count } = await supabase
      .from('historico_bloques')
      .delete({ count: 'exact' })
      .lt('fecha', fechaLimite);
    if (error) throw error;
    return count || 0;
  } catch {
    return 0; // si la tabla no existe todavía, no rompe nada
  }
}
export async function getHistoricoCompleto() {
  return getHistorico({});
}
export async function getActualCompleto() {
  return getActual({});
}
export async function getPersonasCompleto() {
  const {
    data,
    error
  } = await supabase.from('personas').select('id, nombre').order('id');
  if (error) throw error;
  return data || [];
}
export async function getMetasDiariasCompleto() {
  try {
    const {
      data,
      error
    } = await supabase.from('metas_diarias').select('fecha, meta_tallos').order('fecha', {
      ascending: false
    });
    if (error) throw error;
    return data || [];
  } catch {
    return [];
  }
}
