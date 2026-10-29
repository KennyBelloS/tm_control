/**
 * VENTANAS DEL CARRUSEL DEL DASHBOARD — parte PURA. El carrusel recorre a todas las personas, pero dibuja solo `max` por vuelta
 * (cientos de filas de golpe congelaban el celular): cada vuelta muestra las siguientes, hasta recorrerlas todas.
 */
export const MAX_FILAS = 40;
/** → { paginas, desde, hasta (exclusivo), vueltas (las que hacen falta para ver a todos, al menos `minimo`), texto } */
export function ventanaCarrusel(total, vuelta = 0, { max = MAX_FILAS, minimo = 3 } = {}) {
  const t = Math.max(0, Math.floor(total) || 0), paginas = Math.max(1, Math.ceil(t / max));
  const desde = (Math.max(0, vuelta) % paginas) * max, hasta = Math.min(t, desde + max);
  return { paginas, desde, hasta, vueltas: Math.max(minimo, paginas), texto: paginas > 1 ? `${desde + 1}–${hasta} de ${t} personas` : `${t} ${t === 1 ? 'persona' : 'personas'}` };
}
