/**
 * ACTUALIZACIÓN AUTOMÁTICA DE LA APP INSTALADA.
 * Antes la app instalada solo se actualizaba al cerrarla y volver a abrirla. Ahora:
 *   · busca una versión nueva cada 3 minutos, al volver a primer plano y al recuperar la conexión;
 *   · cuando la encuentra avisa "Actualizando…" y se recarga sola (la persona no hace nada);
 *   · NUNCA se actualiza en medio de algo importante: si hay una carga de Excel o un guardado en curso, espera a que termine.
 * Las tareas largas se marcan con iniciarTarea() (devuelve la función que la libera).
 */
import { registerSW } from 'virtual:pwa-register';

let tareas = 0;
export function iniciarTarea() {
  tareas++;
  let liberada = false;
  return () => { if (!liberada) { liberada = true; tareas = Math.max(0, tareas - 1); } };
}
export const hayTareasEnCurso = () => tareas > 0;

/** Un aviso propio (no depende de React): se ve también en la pantalla de inicio de sesión. */
function mostrarAviso(texto) {
  if (typeof document === 'undefined' || document.getElementById('tm-actualizando')) return;
  const d = document.createElement('div');
  d.id = 'tm-actualizando'; d.setAttribute('role', 'status'); d.setAttribute('aria-live', 'polite');
  d.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:calc(22px + env(safe-area-inset-bottom,0px));z-index:2147483000;display:flex;align-items:center;gap:10px;padding:12px 18px;border-radius:14px;background:#0B3D22;color:#fff;font:600 14px/1.3 Inter,system-ui,sans-serif;box-shadow:0 14px 34px -10px rgba(0,0,0,.55);max-width:calc(100vw - 28px)';
  d.innerHTML = '<span style="width:16px;height:16px;border:2.5px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;display:inline-block;animation:tm-giro .8s linear infinite"></span><span></span>';
  d.lastChild.textContent = texto;
  const st = document.createElement('style'); st.textContent = '@keyframes tm-giro{to{transform:rotate(360deg)}}'; d.appendChild(st);
  document.body.appendChild(d);
}

export function iniciarActualizacionAutomatica() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  if (import.meta.env && import.meta.env.DEV) return;                          // en desarrollo no hay service worker
  let actualizar = null, pendiente = false;
  const aplicar = () => {
    if (hayTareasEnCurso()) { setTimeout(aplicar, 5000); return; }              // espera a que termine la carga o el guardado
    mostrarAviso('Hay una versión nueva. Actualizando…');
    setTimeout(() => {
      actualizar && actualizar(true);                                           // true = activar la nueva versión y recargar
      setTimeout(() => window.location.reload(), 2500);                         // seguro: si la pantalla no estaba "controlada" por el service worker, igual se recarga
    }, 1800);
  };
  const anunciar = () => { if (!pendiente) { pendiente = true; aplicar(); } };
  actualizar = registerSW({
    immediate: true,
    onNeedRefresh: anunciar,                                                    // caso normal: la versión nueva queda "en espera"
    onRegisteredSW(_url, reg) {
      if (!reg) return;
      // Segundo detector: una versión nueva que se instala (o se activa sola) cuando ya había otra. La primera instalación NO cuenta.
      reg.addEventListener('updatefound', () => {
        const nuevo = reg.installing;
        if (!nuevo || !reg.active) return;
        nuevo.addEventListener('statechange', () => { if (nuevo.state === 'installed' || nuevo.state === 'activated') anunciar(); });
      });
      const buscar = () => { if (navigator.onLine) reg.update().catch(() => {}); };
      setInterval(buscar, 3 * 60 * 1000);
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') buscar(); });
      window.addEventListener('online', buscar);
    }
  });
}

/** Ejecuta una tarea larga (carga, guardado) protegiéndola de las actualizaciones automáticas. */
export async function conTarea(fn) {
  const liberar = iniciarTarea();
  try { return await fn(); } finally { liberar(); }
}
