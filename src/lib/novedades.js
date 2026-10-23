/** NOVEDADES — infraestructura: la versión más reciente del historial del MANUAL.md y si esta persona ya la vio en este equipo. */
import manual from '../../MANUAL.md?raw';
import { versiones } from './manualMarkdown';
import { refrescarNotificaciones } from './useNotificaciones';

export const CLAVE_NOVEDADES = 'tm_novedades_visto';
export const novedadActual = () => versiones(manual)[0] || null;
/** La versión nueva que todavía no se ha visto (o null). */
export function novedadesPendientes() {
  const v = novedadActual(); if (!v) return null;
  try { if (localStorage.getItem(CLAVE_NOVEDADES) === v.version) return null; } catch { /* sin almacenamiento */ }
  return v;
}
export function marcarNovedadesVistas() {
  const v = novedadActual(); if (!v) return;
  try { localStorage.setItem(CLAVE_NOVEDADES, v.version); } catch { /* sin almacenamiento */ }
  refrescarNotificaciones();
}
