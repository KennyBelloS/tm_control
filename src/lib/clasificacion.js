import { supabase } from './supabaseClient';
import { armarComparacion, fechaLocalISO } from './clasificacionCalculos';
export * from './clasificacionCalculos';

function errorAmigable(error) {
  if (error?.code === '42P01' || /clasificacion_/.test(error?.message || '')) {
    return new Error('Falta correr en Supabase el SQL de Clasificación (tablas clasificacion_hora, clasificacion_cargas y clasificacion_historico).');
  }
  return error;
}

export async function getCargaDia(fecha) {
  const { data, error } = await supabase.from('clasificacion_cargas').select('*').eq('fecha', fecha).maybeSingle();
  if (error) throw errorAmigable(error);
  return data || null;
}

/**
 * Guarda el día completo. NO suma a lo anterior: el reporte siempre trae todo
 * el día hasta la hora del corte, así que se REEMPLAZA (subir dos veces el
 * mismo reporte no duplica nada). Orden seguro: primero se guarda lo nuevo y
 * después se recorta lo que sobraba de una carga anterior.
 */
export async function guardarClasificacionDia({ fecha, resumen }) {
  const filas = resumen.filas.map(f => ({ fecha, linea: f.linea, hora: f.hora, tallos: f.tallos, movimientos: f.movimientos }));
  let r = await supabase.from('clasificacion_hora').upsert(filas, { onConflict: 'fecha,linea,hora' });
  if (r.error) throw errorAmigable(r.error);

  await supabase.from('clasificacion_hora').delete().eq('fecha', fecha).gt('hora', resumen.ultimaHora);
  await supabase.from('clasificacion_hora').delete().eq('fecha', fecha).lt('hora', resumen.horaInicial);
  const listaLineas = `(${resumen.lineas.join(',')})`;
  await supabase.from('clasificacion_hora').delete().eq('fecha', fecha).not('linea', 'in', listaLineas);

  const ahora = new Date().toISOString();
  const historico = resumen.lineas.map(l => {
    const delaLinea = resumen.filas.filter(f => f.linea === l);
    return {
      fecha, linea: l, actualizado_en: ahora,
      total_tallos: delaLinea.reduce((s, f) => s + f.tallos, 0),
      movimientos: delaLinea.reduce((s, f) => s + f.movimientos, 0)
    };
  });
  r = await supabase.from('clasificacion_historico').upsert(historico, { onConflict: 'fecha,linea' });
  if (r.error) throw errorAmigable(r.error);
  await supabase.from('clasificacion_historico').delete().eq('fecha', fecha).not('linea', 'in', listaLineas);

  r = await supabase.from('clasificacion_cargas').upsert({
    fecha, corte_min: Math.min(resumen.corteMin, 1439), ultima_hora: resumen.ultimaHora,
    parcial: resumen.parcial, movimientos: resumen.movimientosIncluidos, cargado_en: ahora
  }, { onConflict: 'fecha' });
  if (r.error) throw errorAmigable(r.error);
}

/** Días que conservan el detalle hora a hora (después se borra solo; el total diario queda para siempre). */
export const DIAS_DETALLE = 4;

/**
 * Hoy (o la fecha pedida) contra un día anterior con detalle hora a hora.
 * Por defecto compara con el día anterior más reciente; con `comparar` eliges otro de los guardados.
 * También devuelve `fechasPrevias`: los días anteriores que todavía tienen detalle.
 */
export async function getComparacionClasificacion(fecha, comparar = null) {
  const { data: cargas, error } = await supabase
    .from('clasificacion_cargas').select('*').lte('fecha', fecha).order('fecha', { ascending: false }).limit(DIAS_DETALLE + 3);
  if (error) throw errorAmigable(error);
  const cargaHoy = (cargas || []).find(c => c.fecha === fecha) || null;
  const previas = (cargas || []).filter(c => c.fecha < fecha);
  const fechas = [fecha, ...previas.map(c => c.fecha)];
  const { data: filas, error: e2 } = await supabase
    .from('clasificacion_hora').select('fecha, linea, hora, tallos, movimientos').in('fecha', fechas);
  if (e2) throw errorAmigable(e2);
  const conDetalle = previas.map(c => c.fecha).filter(f => (filas || []).some(x => x.fecha === f));
  const fechaAyer = comparar && conDetalle.includes(comparar) ? comparar : (conDetalle[0] || null);
  const datos = armarComparacion({
    fechaHoy: fecha, fechaAyer, cargaHoy,
    cargaAyer: previas.find(c => c.fecha === fechaAyer) || null,
    filasHoy: (filas || []).filter(f => f.fecha === fecha),
    filasAyer: fechaAyer ? (filas || []).filter(f => f.fecha === fechaAyer) : []
  });
  return { ...datos, fechasPrevias: conDetalle };
}

export async function getUltimaFechaClasificacion() {
  const { data, error } = await supabase.from('clasificacion_cargas').select('fecha').order('fecha', { ascending: false }).limit(1).maybeSingle();
  if (error) throw errorAmigable(error);
  return data?.fecha || null;
}

/** Histórico diario permanente (se arma solo con cada carga). */
export async function getHistoricoClasificacion(desde, hasta) {
  const { data, error } = await supabase
    .from('clasificacion_historico').select('fecha, linea, total_tallos, movimientos')
    .gte('fecha', desde).lte('fecha', hasta).order('fecha', { ascending: false });
  if (error) throw errorAmigable(error);
  return data || [];
}

/**
 * El detalle hora a hora se guarda 4 días: el registro de un día se borra a las
 * 5 a.m. del cuarto día siguiente (el histórico diario NO se toca). Se ejecuta
 * sola al abrir las pantallas que usan Clasificación — no necesita proceso aparte.
 */
export async function limpiarClasificacionAntigua() {
  const corrido = new Date(Date.now() - 5 * 3600 * 1000);
  corrido.setDate(corrido.getDate() - (DIAS_DETALLE - 1));
  const limite = fechaLocalISO(corrido);
  await supabase.from('clasificacion_hora').delete().lt('fecha', limite);
}
