/**
 * CONEXIÓN — infraestructura: ¿hay internet de verdad? Reglas para NO marcar "sin conexión" cuando sí hay:
 *   · Solo se declara sin conexión si el navegador lo dice (navigator.onLine === false) o si fallan DOS verificaciones seguidas
 *     después de un error de red real. Un error del servidor (500), una respuesta lenta o un 401 NO cuentan.
 *   · Mientras hay internet no se hace ningún sondeo (cero consumo y cero lag).
 *   · Sin conexión se verifica cada 6 segundos y, al volver, se avisa para refrescar los datos.
 */
import { useEffect, useState } from 'react';

const BASE = import.meta.env.VITE_SUPABASE_URL;
let enLinea = typeof navigator === 'undefined' ? true : navigator.onLine !== false;
const oyentes = new Set();
let comprobando = null, temporizador = null;
export const hayConexion = () => enLinea;

function poner(v) {
  if (v === enLinea) return;
  enLinea = v; oyentes.forEach(f => f(v));
  if (v) { clearInterval(temporizador); temporizador = null; window.dispatchEvent(new Event('tm-conexion-restablecida')); }
  else if (!temporizador) temporizador = setInterval(() => { verificar().then(ok => { if (ok) poner(true); }); }, 6000);
}
/** ¿Se llega al servidor? Cualquier respuesta (aunque sea un error HTTP) cuenta como "sí": lo único que no cuenta es no poder conectar. */
export async function verificar(ms = 5000) {
  const c = new AbortController(), t = setTimeout(() => c.abort(), ms);
  try { await fetch(`${BASE || ''}/auth/v1/health`, { method: 'GET', mode: 'no-cors', cache: 'no-store', signal: c.signal }); return true; } catch { return false; } finally { clearTimeout(t); }
}
/** Un fetch falló por la red: se confirma con dos verificaciones antes de declarar "sin conexión". */
export function confirmarFalloRed() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) { poner(false); return Promise.resolve(); }
  comprobando ||= (async () => {
    if (await verificar()) return;
    await new Promise(r => setTimeout(r, 1500));
    if (!(await verificar())) poner(false);
  })().finally(() => { comprobando = null; });
  return comprobando;
}
if (typeof window !== 'undefined') {
  window.addEventListener('offline', () => poner(false));
  window.addEventListener('online', async () => { for (let i = 0; i < 3; i++) { if (await verificar()) { poner(true); return; } await new Promise(r => setTimeout(r, 1200)); } });
  if (!enLinea) poner(false);                                    // la app abrió sin internet
}
export function useConexion() {
  const [v, setV] = useState(enLinea);
  useEffect(() => { oyentes.add(setV); setV(enLinea); return () => oyentes.delete(setV); }, []);
  return v;
}
