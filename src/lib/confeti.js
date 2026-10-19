/** Disparadores de las celebraciones (los dibuja la capa ambiental). Si los efectos están apagados, no pasa nada. */
const efectosActivos = () => document.documentElement.dataset.efectos && document.documentElement.dataset.efectos !== 'apagado';

/** Lluvia y cañones de confeti, con los colores de la festividad vigente (o los de la marca). */
export function celebrar() { if (efectosActivos()) window.dispatchEvent(new CustomEvent('tm-celebrar')); }

/** Una pequeña ráfaga en un punto de la pantalla (por ejemplo, al tocar un botón principal). */
export function rafaga(x, y) { if (efectosActivos()) window.dispatchEvent(new CustomEvent('tm-rafaga', { detail: { x, y } })); }

/** Celebra una sola vez por clave (por día o por sesión), para no repetir la fiesta cada vez que se entra a una pantalla. */
export function celebrarUnaVez(clave, { sesion = false } = {}) {
  try {
    const alm = sesion ? sessionStorage : localStorage;
    if (alm.getItem(clave)) return false;
    alm.setItem(clave, '1');
  } catch { /* sin almacenamiento: se celebra igual */ }
  celebrar();
  return true;
}
