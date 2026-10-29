/**
 * "NUEVO" — parte PURA: qué funciones llevan la insignia «Nuevo» y hasta cuándo. Cada función nueva se anota aquí con la versión en que llegó;
 * la insignia se muestra desde la fecha de esa versión (la del Historial de cambios) y se quita sola a los DIAS_NUEVO días.
 */
export const DIAS_NUEVO = 2;
/** id → versión en que llegó. Las claves de módulos del menú (ayuda, resumenes…) son las mismas del Sidebar. */
export const FUNCIONES_NUEVAS = {
  ayuda: '1.6.0',                      // Cómo se usa: lecciones que avanzan solas, paso a paso, íconos
  resumenes: '1.6.0',                  // Resumen por finca, proceso o persona
  'resumen-alcance': '1.6.0',          // el selector «Por proceso / Por persona»
  'top5-imagen': '1.6.0',              // Top 5: más con código, menos con nombre
  'lecciones-auto': '1.6.0',           // la pestaña Manual: pasa sola a la siguiente lección
  'horario-duracion': '1.6.0',         // el horario con su duración (y miércoles/sábado de 6 a 12)
  'evolucion-horas': '1.7.0',          // Rendimientos: evolución por hora de cada persona
  perfil: '1.7.0',                     // Mi perfil con avatar de flores
  seguridad: '1.8.0',                  // el tablero de seguridad (con uso de la app, errores y permisos)
  'uso-app': '1.8.0',                  // quién usa la app (ranking) y el comportamiento por persona
  'permiso-persona': '1.8.0',          // Usuarios: solo ver / puede editar por persona
  'avisos-fuera': '1.9.0',             // avisos importantes fuera de la app, a quien el Administrador active
  'eventos-presentacion': '1.9.0',     // la presentación muestra cuándo una línea supera a otra o el rendimiento cambia de golpe
  rosas: '1.8.0'                       // Mi perfil con avatares de rosas y el festejo con la acción
};
const ms = iso => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
/** ¿La insignia sigue vigente? Desde el día de la versión hasta antes de cumplirse `dias` días (nunca antes de la fecha). */
export function vigente(fechaISO, hoyISO, dias = DIAS_NUEVO) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fechaISO || '')) || !/^\d{4}-\d{2}-\d{2}$/.test(String(hoyISO || ''))) return false;
  const d = (ms(hoyISO) - ms(fechaISO)) / 864e5;
  return d >= 0 && d < dias;
}
/** "dd/mm/aaaa" → "aaaa-mm-dd" (null si no es una fecha). */
export const isoDeFecha = f => { const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(f || '')); return m ? `${m[3]}-${m[2]}-${m[1]}` : null; };
/** ¿Esta función es nueva hoy? entradas: lo que devuelve novedades(md). */
export function esNueva(id, entradas, hoyISO, registro = FUNCIONES_NUEVAS) {
  const v = registro[id]; if (!v) return false;
  const e = entradas.find(x => x.version === v);
  return !!e && vigente(isoDeFecha(e.fecha), hoyISO);
}
