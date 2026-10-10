/** Pantalla completa del navegador (con respaldo para Safari/Edge antiguos). Debe llamarse desde un clic. */
export const enPantallaCompleta = () => !!(document.fullscreenElement || document.webkitFullscreenElement);

export function entrarPantallaCompleta() {
  if (enPantallaCompleta()) return;
  const el = document.documentElement;
  const pedir = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
  if (!pedir) return;
  try { const r = pedir.call(el); if (r && r.catch) r.catch(() => {}); } catch { /* el navegador no lo permitió */ }
}

export function salirPantallaCompleta() {
  if (!enPantallaCompleta()) return;
  const salir = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
  if (!salir) return;
  try { const r = salir.call(document); if (r && r.catch) r.catch(() => {}); } catch { /* ya salió */ }
}
