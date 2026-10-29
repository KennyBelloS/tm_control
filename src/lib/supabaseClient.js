import { createClient } from '@supabase/supabase-js';
import { hayConexion, confirmarFalloRed, alCambiarConexion } from './conexion';
import { mensajeAmigable } from './mensajesError';
import { claveCache, guardarCache, leerCache } from './cacheDatos';
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!url || !anonKey) {
  console.warn('[Supabase] Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en tu archivo .env. ' + 'Copia .env.example a .env y coloca las credenciales de tu proyecto "tm-control". ' + 'Revisa el manual (MANUAL.md) sección «Instalación y mantenimiento».');
}
/**
 * Todas las llamadas a la base pasan por aquí. Reglas (pensadas para el celular, donde "hay señal" no siempre es "hay datos"):
 *   · NINGUNA consulta se queda colgada: las lecturas esperan 10 s, guardar 30 s. Pasado el límite se usa lo último guardado.
 *   · Lecturas: primero la red; si falla (o sin internet) se muestra al instante la copia guardada (cacheDatos.js, que distingue
 *     "una fila" de "lista"). Sin internet ni se intenta la red cuando hay copia: no hay esperas.
 *   · Un fallo de red se confirma antes de declarar "sin conexión"; el error NUNCA llega con tecnicismos (mensajesError.js).
 */
const TIEMPO = { lectura: 8000, sinInternet: 3000, escritura: 30000, otra: 15000, sospecha: 2000 };
const enVuelo = new Map();                       // consultas (GET) idénticas que están en camino: se hace UNA y todas reciben su copia
const sintetica = (status, codigo, texto) => new Response(JSON.stringify({ code: codigo, message: mensajeAmigable({ code: codigo, message: texto }).texto, details: null, hint: null }), { status, headers: { 'Content-Type': 'application/json', 'x-tm-sintetica': '1' } });
const avisarError = d => { try { window.dispatchEvent(new CustomEvent('tm-error-datos', { detail: d })); } catch { /* sin ventana */ } };

/** El error de la base llega con un mensaje claro y SIN tecnicismos; el texto original queda en `details` (solo para el registro del administrador). */
async function amigarRespuesta(r, u) {
  if (r.ok || r.headers.get('x-tm-sintetica')) return r;
  let cuerpo = null; try { cuerpo = await r.clone().json(); } catch { /* no era JSON */ }
  const m = mensajeAmigable(cuerpo && typeof cuerpo === 'object' ? { ...cuerpo, code: cuerpo.code } : String(r.status), { status: r.status });
  if (m.clase === 'claro') return r;
  if (m.tecnica && !/\/rpc\/registrar_/.test(u)) avisarError({ texto: m.tecnico, ref: m.ref, clase: m.clase, status: r.status, ruta: u.replace(/^https?:\/\/[^/]+/, '').split('?')[0] });
  return new Response(JSON.stringify({ code: cuerpo?.code ?? String(r.status), message: m.texto, details: m.tecnico || null, hint: null, ref: m.ref }), { status: r.status, headers: { 'Content-Type': 'application/json' } });
}
async function pedir(input, init, ms) {
  const c = new AbortController(); let vencio = false;
  const t = setTimeout(() => { vencio = true; c.abort(); }, ms);
  const esLectura = !init?.method || ['GET', 'HEAD'].includes(String(init.method).toUpperCase());
  // Si una lectura tarda más de 2 s se empieza a comprobar la conexión YA; y apenas se confirma que no hay datos, las lecturas que esperaban se cortan al instante.
  const sospecha = esLectura ? setTimeout(() => confirmarFalloRed(true), TIEMPO.sospecha) : null;
  const dejarDeOir = esLectura ? alCambiarConexion(v => { if (!v) { vencio = true; c.abort(); } }) : () => {};
  if (init?.signal) { if (init.signal.aborted) c.abort(); else init.signal.addEventListener('abort', () => c.abort(), { once: true }); }
  const u = typeof input === 'string' ? input : input?.url || '';
  const metodo = String(init?.method || (typeof input !== 'string' && input?.method) || 'GET').toUpperCase();
  const compartible = metodo === 'GET' && !init?.signal && typeof input === 'string';
  const clave = compartible ? `${u}|${new Headers(init?.headers).get('authorization') || ''}|${new Headers(init?.headers).get('accept') || ''}|${new Headers(init?.headers).get('prefer') || ''}` : null;
  try {
    if (clave && enVuelo.has(clave)) return (await enVuelo.get(clave)).clone();
    const p = fetch(input, { ...init, signal: c.signal });
    if (clave) { enVuelo.set(clave, p); const quitar = () => { if (enVuelo.get(clave) === p) enVuelo.delete(clave); }; p.then(quitar, quitar); }
    const r = await p; return clave ? r.clone() : r;
  } catch (e) { if (vencio) { const x = new Error('tm_timeout'); x.timeout = true; throw x; } throw e; }
  finally { clearTimeout(t); clearTimeout(sospecha); dejarDeOir(); }
}
async function fetchRed(input, init) {
  const u = typeof input === 'string' ? input : input?.url || '';
  const metodo = String(init?.method || (typeof input !== 'string' && input?.method) || 'GET').toUpperCase();
  const lectura = metodo === 'GET' || metodo === 'HEAD', esAuth = u.includes('/auth/v1/'), esDatos = u.includes('/rest/v1/');
  if (!esDatos && !esAuth) return fetch(input, init);
  if (!lectura && !esAuth && !hayConexion()) return sintetica(503, 'TM_SIN_RED', 'tm_sin_red');          // sin internet no se intenta guardar: se avisa claro
  if (esDatos && metodo === 'GET') {
    const clave = claveCache(u, init);
    if (!hayConexion()) { const c = await leerCache(clave); if (c) return c; }                           // sin internet: al instante, sin esperar
    try {
      const r = await pedir(input, init, hayConexion() ? TIEMPO.lectura : TIEMPO.sinInternet);
      if (r.ok) { guardarCache(clave, r); return r; }
      return await amigarRespuesta(r, u);
    } catch (e) {
      if (e?.name === 'AbortError' && !e.timeout) throw e;                                               // la canceló quien la pidió
      confirmarFalloRed();
      const c = await leerCache(clave); if (c) return c;
      return e.timeout ? sintetica(504, 'TM_TIMEOUT', 'tm_timeout') : sintetica(503, 'TM_SIN_CACHE', 'tm_sin_cache');
    }
  }
  try {
    const r = await pedir(input, init, esAuth ? TIEMPO.otra : lectura ? TIEMPO.lectura : TIEMPO.escritura);
    return esDatos ? await amigarRespuesta(r, u) : r;
  } catch (e) {
    if (e?.name === 'AbortError' && !e.timeout) throw e;
    confirmarFalloRed();
    if (esAuth) throw e;                                                                                  // la sesión la maneja supabase-js (reintenta sola)
    return e.timeout ? sintetica(504, 'TM_TIMEOUT', 'tm_timeout') : sintetica(503, 'TM_SIN_RED', 'tm_sin_red');
  }
}
// Las copias de la versión anterior se guardaban solo por dirección (mezclaban "una fila" y "lista"): se borran una vez.
try { if (typeof localStorage !== 'undefined' && !localStorage.getItem('tm_cache_v2')) { localStorage.setItem('tm_cache_v2', '1'); caches?.delete?.('datos-api'); } } catch { /* sin almacenamiento */ }
export const supabase = createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder', { global: { fetch: fetchRed }, auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
export const supabaseConfigurado = Boolean(url && anonKey);
