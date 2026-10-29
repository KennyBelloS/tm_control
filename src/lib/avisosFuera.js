/** Después de cada carga importante se avisa al servidor: él guarda el aviso (la campana de todos) y lo manda fuera de la app a quien el Administrador activó.
 *  Es «lo mejor posible»: si no hay internet o el servidor no está listo, la carga NO se estorba y la persona no ve ningún error. */
import { supabase } from './supabaseClient';
import { nombreFestivo } from './festivosColombia';
import { eventosTrasHistorico } from './eventosApp';
import { hayConexion } from './conexion';

export const esFestivoISO = iso => !!nombreFestivo(iso);

export async function notificarEvento(evento, { fecha, hora } = {}) {
  try {
    if (!hayConexion()) return false;
    const { data } = await supabase.auth.getSession(); const token = data?.session?.access_token; if (!token) return false;
    const r = await fetch('/api/notificar', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ evento, fecha, hora }) });
    return r.ok;
  } catch { return false; }
}
/** Avisa varios en orden: [{ evento, fecha, hora }]. No espera a que terminen (la carga ya terminó). */
export function avisarCarga(lista) { (async () => { for (const a of lista || []) await notificarEvento(a.evento, a); })().catch(() => {}); }
/** Tras cargar el histórico de estas fechas: histórico cargado y, si cierra la semana o el mes, el resumen listo. */
export const avisosDeHistorico = fechas => eventosTrasHistorico(fechas, esFestivoISO);
export const maxHora = filas => { let m = ''; for (const r of filas || []) { const h = String(r.hora_fin || '').slice(0, 5); if (h > m) m = h; } return m || undefined; };
export const horaDeMinutos = min => (Number.isFinite(min) ? `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}` : undefined);
