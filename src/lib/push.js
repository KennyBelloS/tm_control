/** AVISOS FUERA DE LA APP (en el celular, aunque la app esté cerrada) — infraestructura del navegador. El Administrador decide a quién le llegan (Usuarios);
 *  aquí cada persona, además, tiene que ACEPTAR en su aparato. En iPhone solo funciona con la app instalada en la pantalla de inicio. */
import { supabase } from './supabaseClient';
import { eventosValidos } from './eventosApp';

const CLAVE_PUBLICA = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
const aBytes = b64 => { const p = '='.repeat((4 - (b64.length % 4)) % 4), s = atob((b64 + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(s, c => c.charCodeAt(0)); };
const aB64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export const pushSoportado = () => typeof navigator !== 'undefined' && 'serviceWorker' in navigator && typeof window !== 'undefined' && 'PushManager' in window && 'Notification' in window;
export const iosSinInstalar = () => typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent || '') && !(navigator.standalone || (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches));
export const servidorConPush = () => Boolean(CLAVE_PUBLICA);

/** Qué avisos fuera de la app le activó el Administrador a esta cuenta (si falta el SQL o no hay red, ninguno). */
export async function misAvisosFuera() {
  try { const { data, error } = await supabase.rpc('mis_avisos_fuera'); return error ? [] : eventosValidos(data); } catch { return []; }
}
/** → { soportado, iosSinInstalar, configurado, permiso: 'default'|'granted'|'denied', activo } */
export async function estadoPush() {
  const base = { soportado: pushSoportado(), iosSinInstalar: iosSinInstalar(), configurado: servidorConPush(), permiso: typeof Notification !== 'undefined' ? Notification.permission : 'denied', activo: false };
  if (!base.soportado) return base;
  const leer = (async () => { const reg = await navigator.serviceWorker.getRegistration(); const sub = reg ? await reg.pushManager.getSubscription() : null; return { ...base, activo: Boolean(sub) && base.permiso === 'granted' }; })();
  try { return await Promise.race([leer, new Promise(ok => setTimeout(() => ok(base), 3000))]); } catch { return base; }     // el navegador a veces tarda: a los 3 s se sigue con lo que se sabe
}
export async function activarPush() {
  if (!pushSoportado()) throw new Error('Este navegador no permite avisos fuera de la app.');
  if (!CLAVE_PUBLICA) throw new Error('Los avisos fuera de la app todavía no están configurados en el servidor.');
  const permiso = await Notification.requestPermission();
  if (permiso !== 'granted') throw new Error('No diste permiso para mostrar avisos. Puedes activarlo en los ajustes del celular.');
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: aBytes(CLAVE_PUBLICA) });
  const j = sub.toJSON(), p256dh = j.keys?.p256dh || aB64(sub.getKey('p256dh')), auth = j.keys?.auth || aB64(sub.getKey('auth'));
  const { error } = await supabase.rpc('guardar_suscripcion_push', { p_endpoint: sub.endpoint, p_p256dh: p256dh, p_auth: auth, p_dispositivo: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'movil' : 'pc' });
  if (error) { try { await sub.unsubscribe(); } catch { /* nada */ } throw new Error(error.message); }
}
export async function desactivarPush() {
  try { const reg = await navigator.serviceWorker.getRegistration(); const sub = reg ? await reg.pushManager.getSubscription() : null; if (sub) { await supabase.rpc('borrar_suscripcion_push', { p_endpoint: sub.endpoint }); await sub.unsubscribe(); } } catch { /* nada */ }
}
