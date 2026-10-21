/**
 * HITOS DE LA META DEL DÍA y APERTURA DE LA FLOR. Lógica pura (sin pantalla) para poder probarla.
 * Un hito se celebra UNA sola vez por día y por pantalla: al cruzar 25, 50, 75 y 100 % de la meta.
 */
export const HITOS = [25, 50, 75, 100];
export const PETALOS = 12;

/** El mayor hito ya alcanzado (0 si todavía no llega al 25 %). */
export function hitoAlcanzado(pct) {
  const p = Number(pct) || 0;
  let h = 0;
  for (const x of HITOS) if (p >= x) h = x;
  return h;
}

/**
 * ¿Hay un hito NUEVO que celebrar? Devuelve el hito (25/50/75/100) o null.
 * previo = el último hito que esa pantalla ya vio o celebró. Solo se celebra al SUBIR: si el avance baja, no pasa nada.
 */
export function hitoNuevo(pct, previo) {
  const h = hitoAlcanzado(pct);
  return h > (previo || 0) ? h : null;
}

/** Qué tan abierta está la flor: pétalos exteriores (0–12, con decimales) e interiores (0–1, florecen en la 2.ª mitad de la meta). */
export function aperturaFlor(pct, n = PETALOS) {
  const p = Math.min(100, Math.max(0, Number(pct) || 0));
  return { exteriores: (p / 100) * n, interiores: Math.min(1, Math.max(0, (p - 50) / 50)), plena: p >= 100 };
}
/** Apertura (0–1) de CADA pétalo exterior i: el primero se abre antes que el segundo, y así. */
export const aperturaPetalo = (exteriores, i) => Math.min(1, Math.max(0, exteriores - i));
