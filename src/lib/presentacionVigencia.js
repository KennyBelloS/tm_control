/** PRESENTACIÓN QUE NO SE CIERRA SOLA — parte PURA: ¿una presentación que estaba abierta debe retomarse sola después de recargar la página (una actualización, un corte)? */
export const HORAS_VIGENTE = 12;
/** `guardadoMs` = el último «latido» de la presentación; `ahoraMs` = ahora. Retoma si el latido es reciente (hasta 12 h) y no viene del futuro. */
export const presentacionVigente = (guardadoMs, ahoraMs, horas = HORAS_VIGENTE) => Number.isFinite(guardadoMs) && guardadoMs > 0 && ahoraMs - guardadoMs >= 0 && ahoraMs - guardadoMs < horas * 3600e3;
/** Cuántos segundos deja pasar antes de dar un fallo por «roto»: reintenta a los 1,5 s, 3 s, 6 s… hasta 15 s (nunca se rinde). */
export const esperaReintento = intento => Math.min(15000, 1500 * 2 ** Math.max(0, Math.min(intento, 4)));
