/** Memoria (infraestructura) de qué hito ya se celebró hoy. Las reglas puras de los hitos están en hitos.js. */
/* ---- Memoria de qué hito ya se celebró hoy (por pantalla: 'dash' o 'pres'), en este navegador ---- */
const clave = (ambito, fecha) => `tm_hito_${ambito}_${fecha}`;
export function leerHito(ambito, fecha) { try { return Number(localStorage.getItem(clave(ambito, fecha))) || 0; } catch { return 0; } }
export function guardarHito(ambito, fecha, h) { try { localStorage.setItem(clave(ambito, fecha), String(h)); } catch { /* sin almacenamiento */ } }
