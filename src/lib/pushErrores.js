/**
 * POR QUÉ FALLÓ ACTIVAR LOS AVISOS — parte PURA: convierte el error del navegador en (1) una frase clara para la persona y
 * (2) la causa técnica exacta para el Administrador (se anota en Seguridad → Errores recientes). Nada de nombres de variables para la persona.
 *   → { causa: 'permiso' | 'llave' | 'servicio' | 'aparato' | 'sql' | 'sin-permiso-admin' | 'red' | 'otro', texto, tecnico }
 */
const tec = e => `${e?.name ? `${e.name}: ` : ''}${String(e?.message ?? e ?? '').replace(/\s+/g, ' ')}`.slice(0, 220);

export function explicarFalloPush(e) {
  const nombre = String(e?.name || ''), msg = String(e?.message ?? e ?? ''), todo = `${nombre} ${msg}`;
  const t = tec(e);
  if (/todavía no te activó avisos/i.test(msg)) return { causa: 'sin-permiso-admin', texto: 'El Administrador todavía no te activó avisos fuera de la app. Pídele que lo haga y vuelve a intentarlo.', tecnico: t };
  if (/no diste permiso|NotAllowedError|permission (denied|was denied)|denied/i.test(todo)) return { causa: 'permiso', texto: 'El aparato no dejó mostrar avisos. Permite las notificaciones de esta app en los ajustes del aparato y vuelve a intentarlo.', tecnico: t };
  if (/applicationServerKey|InvalidAccessError|InvalidCharacterError|valid P-256|not a valid|base64|atob|decode/i.test(todo)) return { causa: 'llave', texto: 'Los avisos no están bien configurados en el servidor. Avísale al administrador y dale este código.', tecnico: `La llave pública de los avisos no es válida (revisar VITE_VAPID_PUBLIC_KEY y hacer Redeploy sin caché): ${t}` };
  if (/AbortError|push service|registration failed|network error|timeout/i.test(todo)) return { causa: 'servicio', texto: 'El servicio de avisos del navegador no respondió. Revisa tu internet e inténtalo de nuevo; si usas Brave o tienes el ahorro de datos activado, pueden estar bloqueados.', tecnico: `El servicio de avisos del navegador no respondió: ${t}` };
  if (/service ?worker|no active|not ready|ready/i.test(todo)) return { causa: 'aparato', texto: 'La app todavía se está preparando en este aparato. Ciérrala del todo, ábrela de nuevo e inténtalo.', tecnico: `El service worker no estaba listo: ${t}` };
  if (/guardar_suscripcion_push|schema cache|could not find the function|42883|PGRST202|todavía no está activada/i.test(todo)) return { causa: 'sql', texto: 'Falta terminar una actualización en el servidor. Avísale al administrador y dale este código.', tecnico: `Falta ejecutar el SQL de la sección 38 (guardar_suscripcion_push): ${t}` };
  if (/failed to fetch|networkerror|load failed|sin conexi/i.test(todo)) return { causa: 'red', texto: 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.', tecnico: t };
  return { causa: 'otro', texto: 'No se pudieron activar los avisos en este aparato. Inténtalo de nuevo; si sigue pasando, avísale al administrador y dale este código.', tecnico: t };
}
