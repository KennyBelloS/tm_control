/** NOVEDADES — infraestructura: la versión más reciente del historial del MANUAL.md y si esta persona ya la vio en este equipo. */
import manual from '../../MANUAL.md?raw';
import { versiones } from './manualMarkdown';
import { refrescarNotificaciones } from './useNotificaciones';

import { novedades as leerNovedades } from './manualMarkdown';
import { esNueva, vigente, isoDeFecha } from './nuevo';
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

const ENTRADAS = leerNovedades(manual);
const hoyLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
/** ¿La función es nueva hoy (según la fecha de su versión en el Historial)? */
export const esNuevaFuncion = id => esNueva(id, ENTRADAS, hoyLocal());
/** ¿Las novedades de la versión actual siguen siendo "de estos días"? (la tarjeta del inicio se retira sola) */
export const novedadesRecientes = () => vigente(isoDeFecha(ENTRADAS[0]?.fecha), hoyLocal());
