import { EVENTOS } from './eventosApp';
/** NOTIFICACIONES — infraestructura: consulta los hechos a la base de datos. Las reglas están en notificaciones.js. */
import { supabase } from './supabaseClient';
import { getAlertasBajoRendimiento, getConfig, getAlmacenamientoUsadoMB, getUltimaFechaHistorico } from './db';
import { listarParesDia, idsDeClasificadores } from './clasificadores';
import { ultimoEventoDe, fechaMasAntigua } from './respaldoBDDatos';
import { estadoSemestral } from './respaldoBD';
import { leerAjustesEfectos } from './efectos';
import { fiestaDelDia } from './fiestas';
import { novedadesPendientes } from './novedades';

/** Junta los hechos que cada rol necesita (cada fuente que falle se omite: la campana siempre funciona con lo que haya). */
export async function reunirHechos({ rol, puedeEditar, hoy, hora }) {
  const admin = rol === 'administrador', vacio = () => null;
  const [bajoRendimiento, almacenamiento, devoluciones, respaldo, clasificadores, historico] = await Promise.all([
    getAlertasBajoRendimiento({ dias: 7, minimoDiasSeguidos: 3 }).catch(() => []),
    admin ? (async () => { const cfg = await getConfig(), usoMB = await getAlmacenamientoUsadoMB(), limiteMB = cfg.almacenamientoLimiteMB || 500; return { pct: Math.round((usoMB / limiteMB) * 1000) / 10, usoMB, limiteMB }; })().catch(vacio) : null,
    puedeEditar ? (async () => { const { data } = await supabase.from('devoluciones_meta').select('ultima_fecha_registro').eq('id', 1).maybeSingle(); return data?.ultima_fecha_registro ? { ultimaFecha: String(data.ultima_fecha_registro).slice(0, 10) } : null; })().catch(vacio) : null,
    admin ? (async () => { const [mensual, antigua, depu] = await Promise.all([ultimoEventoDe(['backup_mensual']), fechaMasAntigua(), ultimoEventoDe(['depuracion_semestral'])]); return { ultimoMensual: mensual?.fecha || null, ultimoNombre: mensual?.detalle?.nombre || null, semestral: estadoSemestral({ hoy, fechaMasAntigua: antigua, ultimaDepuracion: depu?.fecha || null }) }; })().catch(vacio) : null,
    puedeEditar ? (async () => { const [hoyPares, previos] = await Promise.all([listarParesDia(hoy), idsDeClasificadores(new Date(Date.now() - 120 * 864e5).toISOString().slice(0, 10))]); return hoyPares.disponible ? { existen: previos.size > 0 || hoyPares.pares.length > 0, asignadosHoy: hoyPares.pares.length } : null; })().catch(vacio) : null,
    puedeEditar ? getUltimaFechaHistorico().then(f => (f ? { ultimaFecha: String(f).slice(0, 10) } : null)).catch(() => null) : null
  ]);
  // Avisos importantes de los últimos 3 días (los escribe el servidor al cargar turno, clasificación o histórico; si falta el SQL, simplemente no hay)
  let eventosApp = [];
  try { const { data } = await supabase.from('eventos_app').select('clave, tipo, titulo, detalle, ruta, creado_en').gte('creado_en', new Date(Date.now() - 72 * 3600e3).toISOString()).order('creado_en', { ascending: false }).limit(15); eventosApp = (data || []).map(e => ({ ...e, icono: EVENTOS.find(x => x.id === e.tipo)?.icono })); } catch { eventosApp = []; }
  // Invitación festiva: solo si el ambiente festivo está apagado y todavía no se ofreció esta festividad este año
  let fiesta = null;
  try { const f = !leerAjustesEfectos().activo && fiestaDelDia(hoy); if (f) { const clave = `tm_fiesta_inv_${f.id}_${hoy.slice(0, 4)}`; if (!localStorage.getItem(clave)) fiesta = { id: f.id, nombre: f.nombre, emoji: f.emoji, clave }; } } catch { /* sin almacenamiento */ }
  return { hoy, hora, rol, puedeEditar, eventosApp, bajoRendimiento: bajoRendimiento || [], almacenamiento, devoluciones, respaldo, clasificadores, fiesta, historico, novedades: novedadesPendientes() };
}
