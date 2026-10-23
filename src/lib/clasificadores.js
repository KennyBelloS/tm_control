/** CLASIFICADOR ↔ BONCHADOR — infraestructura (base de datos). Las reglas están en clasificadorCalculos.js. */
import { supabase } from './supabaseClient';

const sinTabla = e => ['42P01', 'PGRST205'].includes(e?.code) || /does not exist|schema cache|Could not find/i.test(e?.message || '');

/** Las asignaciones de un día. disponible=false si todavía no se ejecutó la sección 29 del SQL. */
export async function listarParesDia(fecha) {
  const { data, error } = await supabase.from('asignaciones_clasificador').select('id, fecha, clasificador_id, bonchador_id').eq('fecha', fecha);
  if (error) { if (sinTabla(error)) return { pares: [], disponible: false }; throw error; }
  return { pares: data || [], disponible: true };
}
/** Asigna (o cambia, si ya tenía uno ese día) el bonchador de un clasificador. */
export async function asignarClasificador({ fecha, clasificadorId, bonchadorId }) {
  const { error } = await supabase.from('asignaciones_clasificador').upsert({ fecha, clasificador_id: clasificadorId, bonchador_id: bonchadorId }, { onConflict: 'fecha,clasificador_id' });
  if (error) throw error;
}
export async function quitarPar(id) {
  const { error } = await supabase.from('asignaciones_clasificador').delete().eq('id', id);
  if (error) throw error;
}
/** Día por día, con quién trabajó un clasificador en un rango. [] si no hay o aún no existe la tabla. */
export async function paresDeClasificador(clasificadorId, desde, hasta) {
  const { data, error } = await supabase.from('asignaciones_clasificador').select('fecha, bonchador_id').eq('clasificador_id', clasificadorId).gte('fecha', desde).lte('fecha', hasta).order('fecha');
  return error ? [] : (data || []);
}
/** Los IDs de quienes han sido clasificadores desde una fecha (para marcarlos en el buscador del TIC). */
export async function idsDeClasificadores(desde) {
  const { data, error } = await supabase.from('asignaciones_clasificador').select('clasificador_id').gte('fecha', desde);
  return error ? new Set() : new Set((data || []).map(x => x.clasificador_id));
}
