/**
 * La presentación (televisores) NO se cierra sola por ninguna razón propia de la app. Aquí se recuerda si hay una presentación en pantalla:
 *   · mientras está abierta, nada reinicia la pantalla (por ejemplo, al volver el internet);
 *   · si la página se recarga (una actualización de la app), la presentación se retoma sola (en la misma pestaña, hasta 12 h);
 *   · solo se olvida cuando la persona la cierra a propósito (Esc o el botón de salir).
 */
import { presentacionVigente } from './presentacionVigencia.js';

const CLAVE = 'tm_presentando';
let enPantalla = false;
export const presentandoAhora = () => enPantalla;
const guardar = v => { try { if (v) sessionStorage.setItem(CLAVE, String(Date.now())); else sessionStorage.removeItem(CLAVE); } catch { /* sin almacenamiento */ } };
/** Se llama al abrir (true) y, SOLO cuando la persona la cierra a propósito, al salir (false). */
export function marcarPresentacion(activa) { enPantalla = !!activa; guardar(activa); }
/** Al desmontarse por cualquier otra causa: ya no está en pantalla, pero se recuerda para retomarla. */
export const presentacionSinPantalla = () => { enPantalla = false; };
export const latido = () => { if (enPantalla) guardar(true); };
export function debeRetomarPresentacion() { try { return presentacionVigente(Number(sessionStorage.getItem(CLAVE)), Date.now()); } catch { return false; } }
