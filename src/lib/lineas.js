import { supabase } from './supabaseClient';
import { getHistorico, getActual, getConfig, getDescansosDiariosRango } from './db';
import { agregarTurnoActualPorPersona } from './calculos';
import { getComparacionClasificacion, getHistoricoClasificacion } from './clasificacion';

export async function listarLineas() {
  let { data, error } = await supabase.from('lineas').select('id, nombre, supervisor, activa, meta_hora').order('nombre');
  if (error) {
    // Si todavía no se corrió el SQL de Clasificación (columna meta_hora), la app sigue funcionando.
    ({ data, error } = await supabase.from('lineas').select('id, nombre, supervisor, activa').order('nombre'));
    if (error) throw error;
  }
  return data || [];
}

/** "Línea 3" → 3. Así la "Mesa" del reporte de clasificación se asocia con su línea. */
export function numeroDeLinea(nombre) {
  const m = String(nombre || '').match(/\d+/);
  return m ? Number(m[0]) : null;
}

export async function crearLinea(nombre, supervisor) {
  const { error } = await supabase.from('lineas').insert({ nombre, supervisor: supervisor || null });
  if (error) {
    if (error.code === '23505') throw new Error(`Ya existe una línea llamada "${nombre}".`);
    throw error;
  }
}

export async function actualizarLinea(id, cambios) {
  const permitido = (({ nombre, supervisor, meta_hora }) => ({ nombre, supervisor, meta_hora }))(cambios);
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
  const consulta = campos => supabase
    .from('asignaciones_diarias')
    .select(`id, fecha, colaborador_id, personas(${campos}), linea_id, lineas(nombre), formadora_id, formadoras(nombre)`)
    .eq('fecha', fecha);
  let { data, error } = await consulta('nombre, mesa');
  if (error) ({ data, error } = await consulta('nombre')); // aún sin la columna "mesa"
  if (error) throw error;
  return (data || []).map(a => ({
    id: a.id,
    fecha: a.fecha,
    colaborador_id: a.colaborador_id,
    mesa: a.personas?.mesa ?? null,
    colaborador: a.personas?.nombre || `Emp.Cod ${a.colaborador_id}`,
    linea_id: a.linea_id,
    linea: a.lineas?.nombre || '—',
    formadora_id: a.formadora_id,
    formadora: a.formadoras?.nombre || '—'
  }));
}

/** "2026-10-08" → "2026-10" */
export const mesDe = fecha => String(fecha).slice(0, 7);
export function mesAnterior(mes) {
  const [y, m] = mes.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Meta de tallos por hora de cada línea PARA UN MES. Cada mes empieza de cero (se reinicia):
 * hay que definirla de nuevo, y los meses anteriores quedan guardados tal como estaban.
 * Devuelve null si todavía no se corrió el SQL (en ese caso se usa la meta fija anterior).
 */
export async function getMetasMes(mes) {
  const { data, error } = await supabase.from('metas_linea_mes').select('linea_id, meta_hora').eq('mes', mes);
  if (error) return null;
  return new Map((data || []).map(r => [r.linea_id, r.meta_hora]));
}
export async function guardarMetaMes(mes, lineaId, meta) {
  if (meta == null) {
    const { error } = await supabase.from('metas_linea_mes').delete().eq('mes', mes).eq('linea_id', lineaId);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from('metas_linea_mes').upsert({ mes, linea_id: lineaId, meta_hora: meta }, { onConflict: 'mes,linea_id' });
  if (error) {
    if (error.code === '42P01') throw new Error('Falta correr en Supabase el SQL de metas por mes.');
    throw error;
  }
}

/** Formadora a cargo de cada línea en una fecha (se elige a mano; manda sobre "quién tiene más gente"). */
export async function getFormadoraLinea(fecha) {
  const { data, error } = await supabase.from('formadora_linea').select('linea_id, formadora_id, formadoras(nombre)').eq('fecha', fecha);
  if (error) return new Map();
  return new Map((data || []).map(r => [r.linea_id, { formadora_id: r.formadora_id, nombre: r.formadoras?.nombre || null }]));
}
export async function setFormadoraLinea(fecha, lineaId, formadoraId) {
  if (!formadoraId) {
    const { error } = await supabase.from('formadora_linea').delete().eq('fecha', fecha).eq('linea_id', lineaId);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from('formadora_linea').upsert({ fecha, linea_id: lineaId, formadora_id: formadoraId }, { onConflict: 'fecha,linea_id' });
  if (error) {
    if (error.code === '42P01') throw new Error('Falta correr en Supabase el SQL de "formadora por línea".');
    throw error;
  }
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
    .select('fecha, colaborador_id, formadora_id, formadoras(nombre), linea_id, lineas(nombre)')
    .gte('fecha', fechaInicio)
    .lte('fecha', fechaFin);
  if (e1) throw e1;

  // Misma fuente que la pantalla de Rendimientos: así el número del tablero
  // siempre coincide con el que ves allá (incluye los descuentos de cada día).
  const historico = await getHistorico({ desde: fechaInicio, hasta: fechaFin });

  const { data: manual, error: e3 } = await supabase
    .from('tablero_formadoras')
    .select('id, fecha, formadora_id, semana, meta_clasificacion, resultado_clasificacion, devoluciones')
    .gte('fecha', fechaInicio)
    .lte('fecha', fechaFin);
  if (e3) throw e3;

  // Totales de clasificación por línea y día (si ya se corrió el SQL y hay cargas)
  const { data: clasif } = await supabase
    .from('clasificacion_historico').select('fecha, linea, total_tallos')
    .gte('fecha', fechaInicio).lte('fecha', fechaFin);
  const totalClasif = new Map((clasif || []).map(c => [`${c.fecha}|${c.linea}`, c.total_tallos]));

  const mapaRend = new Map((historico || []).map(h => [`${h.fecha}_${h.colaborador_id}`, h]));
  const { data: aMano } = await supabase.from('formadora_linea').select('fecha, linea_id, formadora_id').gte('fecha', fechaInicio).lte('fecha', fechaFin);
  const mapaManual = new Map((manual || []).map(m => [`${m.fecha}_${m.formadora_id}`, m]));

  // La "dueña" de una línea ese día = la formadora con más personas en ella
  const personasPorLineaFormadora = new Map();
  for (const a of asignaciones || []) {
    const k = `${a.fecha}|${a.linea_id}|${a.formadora_id}`;
    personasPorLineaFormadora.set(k, (personasPorLineaFormadora.get(k) || 0) + 1);
  }
  const duena = new Map();
  for (const [k, n] of personasPorLineaFormadora) {
    const [fecha, lineaId, formadoraId] = k.split('|');
    const kl = `${fecha}|${lineaId}`;
    if (!duena.has(kl) || n > duena.get(kl).n) duena.set(kl, { formadoraId: Number(formadoraId), n });
  }

  for (const e of aMano || []) duena.set(`${e.fecha}|${e.linea_id}`, { formadoraId: e.formadora_id, n: Infinity });

  const porFilaDia = new Map();
  for (const a of asignaciones || []) {
    const key = `${a.fecha}_${a.formadora_id}`;
    if (!porFilaDia.has(key)) {
      porFilaDia.set(key, {
        fecha: a.fecha, formadora_id: a.formadora_id, formadora: a.formadoras?.nombre || '—',
        lineas: new Map(), sumaRend: 0, bloques: 0
      });
    }
    const acc = porFilaDia.get(key);
    if (a.lineas?.nombre) acc.lineas.set(a.linea_id, { nombre: a.lineas.nombre, n: (acc.lineas.get(a.linea_id)?.n || 0) + 1 });
    const rend = mapaRend.get(`${a.fecha}_${a.colaborador_id}`);
    if (rend && rend.rendimiento > 0 && rend.tiempo_real_horas > 0) {
      acc.sumaRend += rend.rendimiento;
      acc.bloques++;
    }
  }

  // Nombre y número de cada línea (también las que se asignaron a mano y aún no tienen gente cargada)
  const lineasLista = await listarLineas();
  const nombrePorId = new Map(lineasLista.map(l => [l.id, l.nombre]));

  return [...porFilaDia.values()].map(f => {
    const m = mapaManual.get(`${f.fecha}_${f.formadora_id}`);
    const lineasOrdenadas = [...f.lineas.entries()].sort((x, y) => y[1].n - x[1].n);
    // Todas las líneas que lleva esa formadora ese día: la que se le asignó a mano, o donde tiene más gente
    const quePosee = [...duena.entries()]
      .filter(([k, v]) => k.startsWith(`${f.fecha}|`) && v.formadoraId === f.formadora_id)
      .map(([k]) => Number(k.split('|')[1]));
    let resultadoAuto = 0, hayAuto = false;
    for (const lineaId of quePosee) {
      const num = numeroDeLinea(nombrePorId.get(lineaId));
      if (num != null && totalClasif.has(`${f.fecha}|${num}`)) { resultadoAuto += totalClasif.get(`${f.fecha}|${num}`); hayAuto = true; }
    }
    const nombres = lineasOrdenadas.map(([, i]) => i.nombre);
    for (const lineaId of quePosee) { const n = nombrePorId.get(lineaId); if (n && !nombres.includes(n)) nombres.push(n); }
    return {
      fecha: f.fecha,
      formadora_id: f.formadora_id,
      formadora: f.formadora,
      lineas: nombres.join(', ') || '—',
      rendimientoPromedio: f.bloques > 0 ? Math.round(f.sumaRend / f.bloques) : 0,
      semana: m?.semana || '',
      metaClasificacion: m?.meta_clasificacion ?? '',
      resultadoClasificacion: m?.resultado_clasificacion ?? '',
      resultadoAuto: hayAuto ? resultadoAuto : null,
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


/**
 * Para cada número de línea (la "Mesa" del reporte): su nombre, su meta de
 * tallos/hora y la formadora que tiene más gente en esa línea ese día.
 * Si ese día no hay asignaciones, usa la última fecha que sí tenga.
 */
export async function getContextoLineas(fecha) {
  const lineas = await listarLineas();
  const porNumero = new Map();
  for (const l of lineas) {
    const n = numeroDeLinea(l.nombre);
    if (n != null && !porNumero.has(n)) porNumero.set(n, l);
  }
  let { data: asig } = await supabase.from('asignaciones_diarias').select('fecha, linea_id, formadoras(nombre)').eq('fecha', fecha);
  if (!asig || asig.length === 0) {
    const { data: ult } = await supabase.from('asignaciones_diarias').select('fecha').lte('fecha', fecha).order('fecha', { ascending: false }).limit(1);
    if (ult && ult.length) {
      ({ data: asig } = await supabase.from('asignaciones_diarias').select('fecha, linea_id, formadoras(nombre)').eq('fecha', ult[0].fecha));
    }
  }
  const fechaAsignacion = asig && asig.length ? asig[0].fecha : fecha;
  const cuentas = new Map();
  for (const a of asig || []) {
    const nombre = a.formadoras?.nombre;
    if (!nombre) continue;
    if (!cuentas.has(a.linea_id)) cuentas.set(a.linea_id, new Map());
    cuentas.get(a.linea_id).set(nombre, (cuentas.get(a.linea_id).get(nombre) || 0) + 1);
  }
  const [metasMes, explicitas] = await Promise.all([getMetasMes(mesDe(fecha)), getFormadoraLinea(fechaAsignacion)]);
  const etiquetas = {};
  for (const [n, l] of porNumero) {
    const c = cuentas.get(l.id);
    const porMayoria = c ? [...c.entries()].sort((x, y) => y[1] - x[1])[0][0] : null;
    etiquetas[n] = {
      nombre: l.nombre,
      // la meta es del MES de la fecha (se reinicia cada mes); sin el SQL se usa la meta fija anterior
      meta_hora: metasMes ? (metasMes.get(l.id) ?? null) : (l.meta_hora ?? null),
      formadora: explicitas.get(l.id)?.nombre || porMayoria,
      fechaAsignacion
    };
  }
  return etiquetas;
}

/** Tallos de CLASIFICACIÓN por línea: hora a hora si hay detalle, o el total del día si ya solo queda el histórico. */
async function clasificacionPorLinea(fecha) {
  try {
    const cmp = await getComparacionClasificacion(fecha);
    if (!cmp.vacio && cmp.cargaHoy) return { origen: 'hora', cmp, porLinea: new Map(cmp.porLinea.map(l => [l.linea, l])) };
  } catch { /* sin tablas todavía o sin carga ese día */ }
  try {
    const h = await getHistoricoClasificacion(fecha, fecha);
    if (h.length) return { origen: 'dia', cmp: null, porLinea: new Map(h.map(r => [r.linea, { linea: r.linea, totalHoy: r.total_tallos, celdas: null }])) };
  } catch { /* igual */ }
  return null;
}

/**
 * Qué líneas (por número) corresponden a cada formadora. Si la línea se le asignó a una formadora
 * a mano, esa manda; si no, es dueña la que tiene más gente en ella ese día.
 */
function lineasPorGrupo(asignaciones, explicitas = new Map(), numeroPorLineaId = new Map()) {
  const cuenta = new Map(), numero = new Map();
  for (const a of asignaciones) {
    if (!cuenta.has(a.linea_id)) cuenta.set(a.linea_id, new Map());
    const c = cuenta.get(a.linea_id);
    c.set(a.formadora_id, (c.get(a.formadora_id) || 0) + 1);
    numero.set(a.linea_id, numeroDeLinea(a.lineas?.nombre));
  }
  const porFormadora = new Map(), porLinea = new Map();
  const poner = (formadoraId, num) => {
    if (!porFormadora.has(formadoraId)) porFormadora.set(formadoraId, []);
    if (!porFormadora.get(formadoraId).includes(num)) porFormadora.get(formadoraId).push(num);
  };
  for (const [lineaId, formadoras] of cuenta) {
    const num = numero.get(lineaId);
    if (num == null) continue;
    const explicita = explicitas.get(lineaId)?.formadora_id;
    const duena = explicita ?? [...formadoras.entries()].sort((x, y) => y[1] - x[1])[0][0];
    poner(duena, num);
    porLinea.set(lineaId, [num]);
  }
  for (const [lineaId, e] of explicitas) {
    const num = numeroPorLineaId.get(lineaId) ?? numero.get(lineaId);
    if (num == null) continue;
    poner(e.formadora_id, num);
    if (!porLinea.has(lineaId)) porLinea.set(lineaId, [num]);
  }
  return { porFormadora, porLinea };
}

/**
 * Agrega a cada grupo los tallos de clasificación de SU línea (datos reales): lo que lleva en total
 * y su ÚLTIMA hora contra la misma hora de ayer. La hora en curso se muestra sin veredicto.
 */
function conClasificacion(grupos, lineasDeGrupo, clasif) {
  return grupos.map(g => {
    const nums = lineasDeGrupo.get(g.id) || [];
    const usadas = clasif ? nums.filter(n => clasif.porLinea.has(n)) : [];
    if (usadas.length === 0) return { ...g, clasif: { disponible: false, lineas: nums } };
    const tallos = usadas.reduce((s, n) => s + clasif.porLinea.get(n).totalHoy, 0);
    let ultima = null;
    if (clasif.origen === 'hora') {
      const { cmp } = clasif;
      let idx = -1;
      cmp.horas.forEach((h, i) => { if (h <= cmp.ultimaHoy) idx = i; });
      if (idx >= 0) {
        const hoy = usadas.reduce((s, n) => s + clasif.porLinea.get(n).celdas[idx].hoy, 0);
        const ayer = usadas.reduce((s, n) => s + clasif.porLinea.get(n).celdas[idx].ayer, 0);
        const enCurso = cmp.parcial && cmp.horas[idx] === cmp.ultimaHoy;
        const hayAyer = !!cmp.fechaAyer;
        ultima = {
          hora: cmp.horas[idx], tallos: hoy, ayer, enCurso, hayAyer,
          diferencia: enCurso || !hayAyer ? null : hoy - ayer,
          estado: enCurso ? 'curso' : !hayAyer ? 'neutro' : hoy > ayer ? 'mejor' : hoy < ayer ? 'peor' : 'igual'
        };
      }
    }
    return { ...g, clasif: { disponible: true, origen: clasif.origen, lineas: usadas, tallos, ultima, hayAyer: !!clasif.cmp?.fechaAyer } };
  });
}

const redondear1 = n => Math.round(n * 10) / 10;

/**
 * Arma los grupos (por formadora o por línea) con su equipo en ranking.
 * El promedio se saca de los valores EXACTOS de cada persona y se redondea una
 * sola vez al final (antes se promediaban números ya redondeados).
 */
function armarGrupos({ asignaciones, rendPorPersona, bloquesPorPersona, metaHora, claveId, claveNombre }) {
  const grupos = new Map();
  for (const a of asignaciones) {
    const r = rendPorPersona.get(a.colaborador_id);
    if (!r || !(r.rendimiento > 0)) continue;
    const id = a[claveId];
    if (!grupos.has(id)) grupos.set(id, { id, nombre: claveNombre(a), operarios: [], totalTallos: 0, horas: new Map() });
    const g = grupos.get(id);
    g.operarios.push({
      id: a.colaborador_id, nombre: a.personas?.nombre || `Código ${a.colaborador_id}`,
      tallos: r.total_tallos || 0, rendExacto: r.rendimiento,
      rend: Math.round(r.rendimiento), pct: Math.round((r.rendimiento / metaHora) * 10000) / 100
    });
    g.totalTallos += r.total_tallos || 0;
    for (const b of (bloquesPorPersona?.get(a.colaborador_id) || [])) {
      const h = g.horas.get(b.hora) || { hora: b.hora, tallos: 0, horasTrabajo: 0, personas: new Set() };
      h.tallos += b.tallos; h.horasTrabajo += b.horas; h.personas.add(a.colaborador_id);
      g.horas.set(b.hora, h);
    }
  }
  return [...grupos.values()].map(g => ({
    id: g.id, nombre: g.nombre, totalTallos: g.totalTallos,
    operarios: g.operarios.sort((x, y) => y.rendExacto - x.rendExacto),
    rendPromedio: redondear1(g.operarios.reduce((s, o) => s + o.rendExacto, 0) / g.operarios.length),
    horas: [...g.horas.values()].sort((x, y) => x.hora - y.hora).map(h => ({
      hora: h.hora, tallos: h.tallos, operarios: h.personas.size,
      rend: h.horasTrabajo > 0 ? Math.round(h.tallos / h.horasTrabajo) : 0
    }))
  })).sort((x, y) => y.rendPromedio - x.rendPromedio);
}

/**
 * POR DÍA — viene del Histórico: el último día que tenga asignaciones Y
 * histórico cargado, con los mismos números que ves en Rendimientos.
 */
export async function getDetalleRendimientoAsignaciones(metaHora = 470, fechaPedida = null) {
  const d0 = new Date();
  d0.setDate(d0.getDate() - 30);
  const desde = `${d0.getFullYear()}-${String(d0.getMonth() + 1).padStart(2, '0')}-${String(d0.getDate()).padStart(2, '0')}`;
  const { data: asig, error } = await supabase
    .from('asignaciones_diarias')
    .select('fecha, colaborador_id, linea_id, lineas(nombre), formadora_id, formadoras(nombre), personas(nombre)')
    .gte('fecha', desde).order('fecha', { ascending: false });
  if (error) throw error;
  if (!asig || asig.length === 0) return null;

  const fechas = [...new Set(asig.map(a => a.fecha))];
  const { data: conHistorico } = await supabase.from('rendimiento_historico').select('fecha').in('fecha', fechas);
  const fechasConHistorico = new Set((conHistorico || []).map(r => r.fecha));
  const fecha = fechaPedida && fechas.includes(fechaPedida) ? fechaPedida : fechas.find(f => fechasConHistorico.has(f));
  const fechasDisponibles = fechas.filter(f => fechasConHistorico.has(f));
  if (!fecha || !fechasConHistorico.has(fecha)) return { modo: 'historico', fecha: fechas[0], sinHistorico: true, fechasDisponibles, porFormadora: [], porLinea: [] };

  const filas = await getHistorico({ fecha });
  const rendPorPersona = new Map(filas.map(r => [r.colaborador_id, r]));
  const delDia = asig.filter(x => x.fecha === fecha);
  const base = { asignaciones: delDia, rendPorPersona, bloquesPorPersona: null, metaHora };
  const [clasif, explicitas, lineasLista] = await Promise.all([clasificacionPorLinea(fecha), getFormadoraLinea(fecha), listarLineas()]);
  const lg = lineasPorGrupo(delDia, explicitas, new Map(lineasLista.map(l => [l.id, numeroDeLinea(l.nombre)])));
  return {
    modo: 'historico', fecha, fechaAsignacion: fecha, sinHistorico: false, fechasDisponibles,
    porFormadora: conClasificacion(armarGrupos({ ...base, claveId: 'formadora_id', claveNombre: a => a.formadoras?.nombre || '—' }), lg.porFormadora, clasif),
    porLinea: conClasificacion(armarGrupos({ ...base, claveId: 'linea_id', claveNombre: a => a.lineas?.nombre || '—' }), lg.porLinea, clasif)
  };
}

/**
 * POR HORAS — viene del Turno Actual (hora a hora): rendimiento de cada
 * formadora/línea en el turno de hoy, y su detalle hora por hora.
 */
export async function getDetalleRendimientoTurnoActual(metaHora = 470) {
  const { data: ult } = await supabase.from('rendimiento_actual').select('fecha').order('fecha', { ascending: false }).limit(1);
  const fecha = ult?.[0]?.fecha;
  if (!fecha) return null;
  const traer = f => supabase
    .from('asignaciones_diarias')
    .select('colaborador_id, linea_id, lineas(nombre), formadora_id, formadoras(nombre), personas(nombre)')
    .eq('fecha', f);
  let fechaAsignacion = fecha;
  let { data: asig, error } = await traer(fecha);
  if (error) throw error;
  if (!asig || asig.length === 0) {
    // Si todavía no se asignó el día del turno, se usa la asignación anterior más reciente (la pantalla lo avisa)
    const { data: previa } = await supabase.from('asignaciones_diarias').select('fecha').lte('fecha', fecha).order('fecha', { ascending: false }).limit(1);
    if (previa && previa.length) {
      fechaAsignacion = previa[0].fecha;
      ({ data: asig, error } = await traer(fechaAsignacion));
      if (error) throw error;
    }
  }
  if (!asig || asig.length === 0) return { modo: 'turno', fecha, sinAsignaciones: true, porFormadora: [], porLinea: [] };

  const filas = await getActual({ fecha });
  const cfg = await getConfig();
  const descansos = cfg.descansosActivosActual ? cfg.descansosActual : [];
  const porFecha = await getDescansosDiariosRango([fecha], 'actual');
  // Misma cuenta que el Turno Actual del Dashboard: el tiempo de un bloque se cuenta UNA vez aunque tenga varias mesas
  const personas = agregarTurnoActualPorPersona(filas, descansos, porFecha);
  const rendPorPersona = new Map(personas.map(p => [p.colaborador_id, p]));

  const bloques = new Map();
  for (const r of filas) {
    const k = `${r.colaborador_id}|${r.hora_inicio}|${r.hora_fin}`;
    if (!bloques.has(k)) bloques.set(k, { colab: r.colaborador_id, hora: parseInt(String(r.hora_inicio).slice(0, 2), 10), tallos: 0, horas: r.tiempo_real_horas || 0 });
    bloques.get(k).tallos += r.total_tallos || 0;
  }
  const bloquesPorPersona = new Map();
  for (const b of bloques.values()) {
    if (!bloquesPorPersona.has(b.colab)) bloquesPorPersona.set(b.colab, []);
    bloquesPorPersona.get(b.colab).push(b);
  }

  const base = { asignaciones: asig, rendPorPersona, bloquesPorPersona, metaHora };
  const [clasif, explicitas, lineasLista] = await Promise.all([clasificacionPorLinea(fecha), getFormadoraLinea(fechaAsignacion), listarLineas()]);
  const lg = lineasPorGrupo(asig, explicitas, new Map(lineasLista.map(l => [l.id, numeroDeLinea(l.nombre)])));
  return {
    modo: 'turno', fecha, fechaAsignacion, sinAsignaciones: false,
    porFormadora: conClasificacion(armarGrupos({ ...base, claveId: 'formadora_id', claveNombre: a => a.formadoras?.nombre || '—' }), lg.porFormadora, clasif),
    porLinea: conClasificacion(armarGrupos({ ...base, claveId: 'linea_id', claveNombre: a => a.lineas?.nombre || '—' }), lg.porLinea, clasif)
  };
}
