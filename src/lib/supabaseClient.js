import { createClient } from '@supabase/supabase-js';
import { hayConexion, confirmarFalloRed } from './conexion';
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!url || !anonKey) {
  console.warn('[Supabase] Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en tu archivo .env. ' + 'Copia .env.example a .env y coloca las credenciales de tu proyecto "tm-control". ' + 'Revisa el manual (MANUAL.md) sección "Conectar Supabase".');
}
/** Todas las llamadas a la base pasan por aquí: sin internet no se intenta guardar (avisa claro) y un fallo de red se confirma antes de declarar "sin conexión". */
const enVuelo = new Map();                       // consultas (GET) idénticas que están en camino: se hace UNA y todas reciben su copia
async function fetchRed(input, init) {
  const u = typeof input === 'string' ? input : input?.url || '';
  const metodo = String(init?.method || (typeof input !== 'string' && input?.method) || 'GET').toUpperCase();
  if (!hayConexion() && metodo !== 'GET' && metodo !== 'HEAD' && !u.includes('/auth/v1/')) {
    const e = new Error('no se pudo guardar. Revisa tu internet e inténtalo de nuevo.'); e.name = 'Sin conexión'; throw e;
  }
  const compartible = metodo === 'GET' && !init?.signal && typeof input === 'string';
  const clave = compartible ? `${u}|${new Headers(init?.headers).get('authorization') || ''}|${new Headers(init?.headers).get('accept') || ''}` : null;
  if (clave && enVuelo.has(clave)) return (await enVuelo.get(clave)).clone();
  const p = fetch(input, init);
  if (clave) { enVuelo.set(clave, p); const quitar = () => { if (enVuelo.get(clave) === p) enVuelo.delete(clave); }; p.then(quitar, quitar); }
  try { const r = await p; return clave ? r.clone() : r; }
  catch (e) { if (e?.name !== 'AbortError') confirmarFalloRed(); throw e; }
}
export const supabase = createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder', { global: { fetch: fetchRed } });
export const supabaseConfigurado = Boolean(url && anonKey);
