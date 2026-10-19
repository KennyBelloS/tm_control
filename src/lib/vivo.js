/**
 * Estado de la conexión en vivo (Supabase Realtime) y de la última vez que llegaron datos nuevos.
 * Lo escribe useRealtimeRefresco y lo lee el indicador "En vivo" de la barra superior.
 */
export const estadoVivo = { estado: 'conectando', ultima: Date.now() };   // estado: conectando | vivo | error

export function notificarEstado(estado) {
  if (estadoVivo.estado === estado) return;
  estadoVivo.estado = estado;
  window.dispatchEvent(new CustomEvent('tm-estado-vivo', { detail: estado }));
}
export function notificarDatos() {
  estadoVivo.ultima = Date.now();
  window.dispatchEvent(new CustomEvent('tm-datos-actualizados', { detail: estadoVivo.ultima }));
}
