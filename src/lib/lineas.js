import { supabase } from './supabaseClient';

export async function listarLineas() {
  const { data, error } = await supabase.from('lineas').select('id, nombre, supervisor, activa').order('nombre');
  if (error) throw error;
  return data || [];
}

export async function crearLinea(nombre, supervisor) {
  const { error } = await supabase.from('lineas').insert({ nombre, supervisor: supervisor || null });
  if (error) {
    if (error.code === '23505') throw new Error(`Ya existe una línea llamada "${nombre}".`);
    throw error;
  }
}

export async function actualizarLinea(id, cambios) {
  const permitido = (({ nombre, supervisor }) => ({ nombre, supervisor }))(cambios);
  Object.keys(permitido).forEach(k => permitido[k] === undefined && delete permitido[k]);
  const { error } = await supabase.from('lineas').update(permitido).eq('id', id);
  if (error) throw error;
}

export async function cambiarActivaLinea(id, activa) {
  const { error } = await supabase.from('lineas').update({ activa }).eq('id', id);
  if (error) throw error;
}

export async function listarFormadoras() {
  const { data, error } = await supabase.from('formadoras').select('id, nombre, activa').order('nombre');
  if (error) throw error;
  return data || [];
}

export async function crearFormadora(nombre) {
  const { error } = await supabase.from('formadoras').insert({ nombre });
  if (error) {
    if (error.code === '23505') throw new Error(`Ya existe una formadora llamada "${nombre}".`);
    throw error;
  }
}

export async function cambiarActivaFormadora(id, activa) {
  const { error } = await supabase.from('formadoras').update({ activa }).eq('id', id);
  if (error) throw error;
}

/** Asignaciones de un día específico (por defecto hoy), con nombre de persona, formadora y línea ya incluidos. */
export async function getAsignacionesDia(fecha) {
  const { data, error } = await supabase
    .from('asignaciones_diarias')
    .select('id, fecha, colaborador_id, personas(nombre), linea_id, lineas(nombre), formadora_id, formadoras(nombre)')
    .eq('fecha', fecha);
  if (error) throw error;
  return (data || []).map(a => ({
    id: a.id,
    fecha: a.fecha,
    colaborador_id: a.colaborador_id,
    colaborador: a.personas?.nombre || `Código ${a.colaborador_id}`,
    linea_id: a.linea_id,
    linea: a.lineas?.nombre || '—',
    formadora_id: a.formadora_id,
    formadora: a.formadoras?.nombre || '—'
  }));
}

/** Asigna (o reasigna) una persona a una formadora + línea para un día específico. */
export async function asignarPersona({ fecha, colaboradorId, lineaId, formadoraId }) {
  const { error } = await supabase.from('asignaciones_diarias').upsert({
    fecha,
    colaborador_id: colaboradorId,
    linea_id: lineaId,
    formadora_id: formadoraId
  }, { onConflict: 'fecha,colaborador_id' });
  if (error) throw error;
}

export async function quitarAsignacion(id) {
  const { error } = await supabase.from('asignaciones_diarias').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Junta las asignaciones de un rango de fechas con el rendimiento real de
 * esas personas ese mismo día (Histórico), para saber tallos y rendimiento
 * por Línea. Se usa en Reportes y en el resumen de Líneas.
 */
export async function getRendimientoPorLinea(fechaInicio, fechaFin) {
  const { data: asignaciones, error: e1 } = await supabase
    .from('asignaciones_diarias')
    .select('fecha, colaborador_id, linea_id, lineas(nombre, supervisor), formadora_id, formadoras(nombre)')
    .gte('fecha', fechaInicio)
    .lte('fecha', fechaFin);
  if (e1) throw e1;
  if (!asignaciones || asignaciones.length === 0) return [];

  const { data: historico, error: e2 } = await supabase
    .from('rendimiento_historico')
    .select('fecha, colaborador_id, total_tallos, tiempo_trabajado_min, tiempo_no_productivo_min')
    .gte('fecha', fechaInicio)
    .lte('fecha', fechaFin);
  if (e2) throw e2;

  const mapaRend = new Map((historico || []).map(h => [`${h.fecha}_${h.colaborador_id}`, h]));

  const porLinea = new Map();
  for (const a of asignaciones) {
    const key = a.linea_id;
    if (!porLinea.has(key)) {
      porLinea.set(key, {
        linea_id: a.linea_id,
        linea: a.lineas?.nombre || '—',
        supervisor: a.lineas?.supervisor || null,
        operarios: new Set(),
        totalTallos: 0,
        sumaRend: 0,
        bloques: 0
      });
    }
    const acc = porLinea.get(key);
    acc.operarios.add(a.colaborador_id);
    const rend = mapaRend.get(`${a.fecha}_${a.colaborador_id}`);
    if (rend) {
      acc.totalTallos += rend.total_tallos || 0;
      if (rend.tiempo_trabajado_min) {
        const realMin = Math.max(0, rend.tiempo_trabajado_min - (rend.tiempo_no_productivo_min || 0));
        const realHoras = realMin / 60;
        if (realHoras > 0) {
          acc.sumaRend += rend.total_tallos / realHoras;
          acc.bloques++;
        }
      }
    }
  }
  return [...porLinea.values()].map(l => ({
    linea_id: l.linea_id,
    linea: l.linea,
    supervisor: l.supervisor,
    operarios: l.operarios.size,
    totalTallos: l.totalTallos,
    rendimientoPromedio: l.bloques > 0 ? Math.round(l.sumaRend / l.bloques) : 0
  })).sort((a, b) => b.rendimientoPromedio - a.rendimientoPromedio);
}

/**
 * Igual que getRendimientoPorLinea pero agrupado por FORMADORA — cuántas
 * personas tiene, tallos totales y rendimiento promedio de su gente ese
 * rango de fechas. Se usa en Reportes y en el Tablero de Formadoras.
 */
export async function getRendimientoPorFormadora(fechaInicio, fechaFin) {
  const { data: asignaciones, error: e1 } = await supabase
    .from('asignaciones_diarias')
    .select('fecha, colaborador_id, formadora_id, formadoras(nombre), linea_id, lineas(nombre)')
    .gte('fecha', fechaInicio)
    .lte('fecha', fechaFin);
  if (e1) throw e1;
  if (!asignaciones || asignaciones.length === 0) return [];

  const { data: historico, error: e2 } = await supabase
    .from('rendimiento_historico')
    .select('fecha, colaborador_id, total_tallos, tiempo_trabajado_min, tiempo_no_productivo_min')
    .gte('fecha', fechaInicio)
    .lte('fecha', fechaFin);
  if (e2) throw e2;

  const mapaRend = new Map((historico || []).map(h => [`${h.fecha}_${h.colaborador_id}`, h]));

  const porFormadora = new Map();
  for (const a of asignaciones) {
    const key = a.formadora_id;
    if (!porFormadora.has(key)) {
      porFormadora.set(key, {
        formadora_id: a.formadora_id,
        formadora: a.formadoras?.nombre || '—',
        lineas: new Set(),
        operarios: new Set(),
        totalTallos: 0,
        sumaRend: 0,
        bloques: 0
      });
    }
    const acc = porFormadora.get(key);
    acc.operarios.add(a.colaborador_id);
    if (a.lineas?.nombre) acc.lineas.add(a.lineas.nombre);
    const rend = mapaRend.get(`${a.fecha}_${a.colaborador_id}`);
    if (rend) {
      acc.totalTallos += rend.total_tallos || 0;
      if (rend.tiempo_trabajado_min) {
        const realMin = Math.max(0, rend.tiempo_trabajado_min - (rend.tiempo_no_productivo_min || 0));
        const realHoras = realMin / 60;
        if (realHoras > 0) {
          acc.sumaRend += rend.total_tallos / realHoras;
          acc.bloques++;
        }
      }
    }
  }
  return [...porFormadora.values()].map(f => ({
    formadora_id: f.formadora_id,
    formadora: f.formadora,
    lineas: [...f.lineas].join(', ') || '—',
    operarios: f.operarios.size,
    totalTallos: f.totalTallos,
    rendimientoPromedio: f.bloques > 0 ? Math.round(f.sumaRend / f.bloques) : 0
  })).sort((a, b) => b.rendimientoPromedio - a.rendimientoPromedio);
}

/**
 * El Tablero Integrado de Formadoras: una fila por formadora/día en el
 * rango, con el rendimiento promedio calculado en vivo (no se guarda) y
 * los campos manuales que sí están guardados (meta, resultado, devoluciones).
 */
export async function getTableroFormadoras(fechaInicio, fechaFin) {
  const { data: asignaciones, error: e1 } = await supabase
    .from('asignaciones_diarias')
    .select('fecha, colaborador_id, formadora_id, formadoras(nombre)')
    .gte('fecha', fechaInicio)
    .lte('fecha', fechaFin);
  if (e1) throw e1;

  const { data: historico, error: e2 } = await supabase
    .from('rendimiento_historico')
    .select('fecha, colaborador_id, total_tallos, tiempo_trabajado_min, tiempo_no_productivo_min')
    .gte('fecha', fechaInicio)
    .lte('fecha', fechaFin);
  if (e2) throw e2;

  const { data: manual, error: e3 } = await supabase
    .from('tablero_formadoras')
    .select('id, fecha, formadora_id, semana, meta_clasificacion, resultado_clasificacion, devoluciones')
    .gte('fecha', fechaInicio)
    .lte('fecha', fechaFin);
  if (e3) throw e3;

  const mapaRend = new Map((historico || []).map(h => [`${h.fecha}_${h.colaborador_id}`, h]));
  const mapaManual = new Map((manual || []).map(m => [`${m.fecha}_${m.formadora_id}`, m]));

  const porFilaDia = new Map();
  for (const a of asignaciones || []) {
    const key = `${a.fecha}_${a.formadora_id}`;
    if (!porFilaDia.has(key)) {
      porFilaDia.set(key, {
        fecha: a.fecha,
        formadora_id: a.formadora_id,
        formadora: a.formadoras?.nombre || '—',
        sumaRend: 0,
        bloques: 0
      });
    }
    const acc = porFilaDia.get(key);
    const rend = mapaRend.get(`${a.fecha}_${a.colaborador_id}`);
    if (rend?.tiempo_trabajado_min) {
      const realMin = Math.max(0, rend.tiempo_trabajado_min - (rend.tiempo_no_productivo_min || 0));
      const realHoras = realMin / 60;
      if (realHoras > 0) {
        acc.sumaRend += rend.total_tallos / realHoras;
        acc.bloques++;
      }
    }
  }

  return [...porFilaDia.values()].map(f => {
    const m = mapaManual.get(`${f.fecha}_${f.formadora_id}`);
    return {
      fecha: f.fecha,
      formadora_id: f.formadora_id,
      formadora: f.formadora,
      rendimientoPromedio: f.bloques > 0 ? Math.round(f.sumaRend / f.bloques) : 0,
      semana: m?.semana || '',
      metaClasificacion: m?.meta_clasificacion ?? '',
      resultadoClasificacion: m?.resultado_clasificacion ?? '',
      devoluciones: m?.devoluciones ?? ''
    };
  }).sort((a, b) => a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : a.formadora.localeCompare(b.formadora));
}

/** Guarda los campos manuales de una fila del Tablero (fecha + formadora). */
export async function guardarFilaTablero(fecha, formadoraId, campos) {
  const { error } = await supabase.from('tablero_formadoras').upsert({
    fecha,
    formadora_id: formadoraId,
    semana: campos.semana || null,
    meta_clasificacion: campos.metaClasificacion === '' ? null : Number(campos.metaClasificacion),
    resultado_clasificacion: campos.resultadoClasificacion === '' ? null : Number(campos.resultadoClasificacion),
    devoluciones: campos.devoluciones === '' ? null : Number(campos.devoluciones)
  }, { onConflict: 'fecha,formadora_id' });
  if (error) throw error;
}
