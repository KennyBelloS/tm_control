/** Lo que la app APRENDE: qué consulta a la base cada pantalla (solo las direcciones con las fechas como «hoy, ayer…», nunca los datos). Se usa para precargar (precargaDatos.js). */
import { aPlantilla, esAprendible, recordar } from './precarga.js';

const CLAVE = 'tm_consultas_v1';
const hoyISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
let memoria = null, pendiente = null;
const leer = () => {
  if (memoria) return memoria;
  try { memoria = JSON.parse(localStorage.getItem(CLAVE)) || {}; } catch { memoria = {}; }
  if (!memoria.rutas || typeof memoria.rutas !== 'object') memoria = { rutas: {} };
  return memoria;
};
const guardarLuego = () => { if (pendiente) return; pendiente = setTimeout(() => { pendiente = null; try { localStorage.setItem(CLAVE, JSON.stringify(memoria)); } catch { /* sin almacenamiento */ } }, 2500); };

export function registrarConsulta(u, init) {
  try {
    if (typeof location === 'undefined' || !esAprendible(u)) return;
    const ruta = location.pathname || '/'; if (/^\/(login|recuperar)/.test(ruta)) return;
    const h = new Headers(init?.headers), hh = {};
    for (const k of ['accept', 'prefer', 'range', 'accept-profile']) { const v = h.get(k); if (v) hh[k] = v; }
    const m = leer(); m.rutas[ruta] = recordar(m.rutas[ruta], { u: aPlantilla(u, hoyISO()), h: hh }); guardarLuego();
  } catch { /* aprender nunca estorba */ }
}
export const consultasGuardadas = () => leer().rutas;
export const hoyLocal = hoyISO;
export function olvidarConsultas() { memoria = null; if (pendiente) { clearTimeout(pendiente); pendiente = null; } try { localStorage.removeItem(CLAVE); localStorage.removeItem('tm_precarga_ts'); } catch { /* nada */ } }
