/**
 * REGISTRO DE ACTIVIDAD — infraestructura: anota cada entrada a la app (una cada 20 min) y los errores que ven las personas (sin datos personales, con una
 * referencia corta «ref. A3F9») para que el Administrador los vea por persona en Seguridad. Nunca molesta: si algo falla aquí, se ignora en silencio.
 */
import { supabase } from './supabaseClient';
import { hayConexion } from './conexion';
import { limpiarParaRegistro, refError } from './mensajesError';

export const UMBRAL_LENTO_MS = 1500;                 // un toque que tarda más de esto en responder se anota como «lento»
const dispositivo = () => (/Mobi|Android|iPhone|iPad/i.test(typeof navigator === 'undefined' ? '' : navigator.userAgent) ? 'movil' : 'pc');
let ultimaEntrada = 0, enviados = 0; const vistos = new Map();
export async function registrarAcceso() {
  try { if (!hayConexion() || Date.now() - ultimaEntrada < 15 * 60 * 1000) return; ultimaEntrada = Date.now(); await supabase.rpc('registrar_acceso', { p_dispositivo: dispositivo() }); } catch { /* sin registro */ }
}
export async function registrarError({ texto, ref, ruta, origen }) {
  try {
    if (!hayConexion() || enviados >= 25 || !texto) return;
    const r = ref || refError(texto), t = Date.now(); if (t - (vistos.get(r) || 0) < 60_000) return;      // el mismo error no se manda dos veces en un minuto
    vistos.set(r, t); enviados++;
    await supabase.rpc('registrar_error', { p_ruta: ruta || location.pathname, p_mensaje: limpiarParaRegistro(texto), p_ref: r, p_dispositivo: dispositivo(), p_origen: origen || 'datos' });
  } catch { /* sin registro */ }
}
/** Escucha los errores de datos, de pantalla y de promesas sin atender; devuelve cómo quitarlo. */
export function instalarRegistro() {
  const alDato = e => registrarError({ ...(e.detail || {}), origen: 'datos' });
  const alFallo = e => { const m = e.error?.message || e.message; if (m && !/ResizeObserver|Script error/i.test(m)) registrarError({ texto: String(m), origen: 'pantalla' }); };
  const alRechazo = e => { const m = e.reason?.message || String(e.reason || ''); if (m && !/AbortError|tm_|NetworkError|Failed to fetch|Load failed/i.test(m)) registrarError({ texto: m, origen: 'promesa' }); };
  window.addEventListener('tm-error-datos', alDato); window.addEventListener('error', alFallo); window.addEventListener('unhandledrejection', alRechazo);
  // Si un toque o tecla tarda más de 1,5 s en MOSTRAR su respuesta (la app estaba ocupada), se anota: así el Administrador ve cómo va en los celulares reales.
  let obs = null;
  try {
    obs = new PerformanceObserver(l => { for (const e of l.getEntries()) { if (!['click', 'keydown', 'pointerup'].includes(e.name) || !(e.interactionId > 0) || e.duration < UMBRAL_LENTO_MS) continue; registrarError({ texto: `Lento: un toque tardó ${(e.duration / 1000).toFixed(1)} s en mostrar su respuesta`, ref: 'LENTO', origen: 'lento' }); } });
    obs.observe({ type: 'event', durationThreshold: UMBRAL_LENTO_MS, buffered: true });
  } catch { /* este navegador no mide las interacciones */ }
  return () => { window.removeEventListener('tm-error-datos', alDato); window.removeEventListener('error', alFallo); window.removeEventListener('unhandledrejection', alRechazo); try { obs?.disconnect(); } catch { /* nada */ } };
}
