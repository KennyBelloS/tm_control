/**
 * PRECARGA PARA SIN INTERNET — infraestructura: un rato después de entrar (con internet y en un momento libre) vuelve a pedir las consultas que
 * cada pantalla suele hacer, con las fechas de HOY, y las deja guardadas. Así, sin internet, la pantalla de hoy ya está lista y no sale
 * «todavía no se guardó». Solo pide lo que esta persona ya usa (lo aprende), de a pocas a la vez y con tope; si algo falla, se calla.
 */
import { supabase } from './supabaseClient';
import { hayConexion } from './conexion';
import { claveCache, guardarCache, leerCache } from './cacheDatos';
import { consultasGuardadas, hoyLocal } from './consultasAprendidas';
import { consultasParaHoy, tocaPrecargar } from './precarga';

const BASE = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, ''), LLAVE = import.meta.env.VITE_SUPABASE_ANON_KEY;
const CLAVE_TS = 'tm_precarga_ts', FRESCO_MS = 15 * 60000, PRESUPUESTO_MS = 90000;
let corriendo = false;
const pausa = ms => new Promise(r => setTimeout(r, ms));
const conexionLenta = () => { const c = typeof navigator !== 'undefined' && navigator.connection; return !!c && (c.saveData || /(^|-)[23]g$/.test(c.effectiveType || '')); };

/** → { ok, saltadas, fallidas, total } o { omitido: motivo } */
export async function precalentar({ forzar = false } = {}) {
  try {
    if (corriendo) return { omitido: 'en marcha' };
    if (!hayConexion()) return { omitido: 'sin conexión' };
    if (!forzar && conexionLenta()) return { omitido: 'conexión lenta' };
    if (!forzar && !tocaPrecargar(Number(localStorage.getItem(CLAVE_TS)), Date.now())) return { omitido: 'reciente' };
    const { data } = await supabase.auth.getSession(); const token = data?.session?.access_token; if (!token) return { omitido: 'sin sesión' };
    const lista = consultasParaHoy(consultasGuardadas(), hoyLocal());
    if (!lista.length) return { omitido: 'nada aprendido' };
    corriendo = true; try { localStorage.setItem(CLAVE_TS, String(Date.now())); } catch { /* nada */ }
    let ok = 0, saltadas = 0, fallidas = 0, i = 0; const t0 = Date.now();
    const trabajador = async () => {
      while (i < lista.length && Date.now() - t0 < PRESUPUESTO_MS && hayConexion()) {
        const q = lista[i++];
        try {
          const url = BASE + q.u, init = { headers: { apikey: LLAVE, Authorization: `Bearer ${token}`, ...q.h } }, clave = claveCache(url, init);
          const previa = await leerCache(clave), ts = Number(previa?.headers.get('x-tm-guardado'));
          if (ts && Date.now() - ts < FRESCO_MS) { saltadas++; continue; }                       // ya está guardada y es reciente
          const r = await fetch(url, init);                                                       // fetch nativo: no pasa por el cliente (no se «aprende» a sí misma)
          if (r.ok) { await guardarCache(clave, r); ok++; } else fallidas++;
        } catch { fallidas++; }
        await pausa(80);
      }
    };
    await Promise.all([trabajador(), trabajador()]);
    return { ok, saltadas, fallidas, total: lista.length };
  } catch { return { omitido: 'error' }; } finally { corriendo = false; }
}
/** Se agenda un rato después de entrar, cuando el navegador está libre; y otra vez cuando vuelve el internet. */
export function agendarPrecarga() {
  const lanzar = () => (typeof requestIdleCallback === 'function' ? requestIdleCallback(() => precalentar(), { timeout: 8000 }) : precalentar());
  const t = setTimeout(lanzar, 9000), alVolver = () => setTimeout(lanzar, 2500);
  window.addEventListener('tm-conexion-restablecida', alVolver);
  return () => { clearTimeout(t); window.removeEventListener('tm-conexion-restablecida', alVolver); };
}
