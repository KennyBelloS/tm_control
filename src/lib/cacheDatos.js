/**
 * DATOS GUARDADOS PARA VER SIN INTERNET — infraestructura: copia propia de las consultas a la base (Cache Storage del navegador).
 * La llave incluye lo que cambia la respuesta (Accept, Prefer, Range): la misma dirección pedida como «una fila» o como «lista» no se mezcla.
 * Se borra al iniciar y al cerrar sesión (ver olvidarDatosLocales en roles.js). Nunca falla en voz alta.
 */
const NOMBRE = 'datos-api', MAX = 400, MAX_BYTES = 3 * 1024 * 1024;
let escrituras = 0;
export function claveCache(url, init) {
  const h = new Headers(init?.headers);
  const v = [h.get('accept') || '', h.get('prefer') || '', h.get('range') || '', h.get('accept-profile') || ''].join('|');
  return `${url}${url.includes('?') ? '&' : '?'}__tm=${encodeURIComponent(v)}`;
}
export async function guardarCache(clave, resp) {
  try {
    if (typeof caches === 'undefined' || !resp || resp.status !== 200) return;
    const blob = await resp.clone().blob(); if (blob.size > MAX_BYTES) return;
    const h = new Headers(resp.headers); h.set('x-tm-guardado', String(Date.now()));
    const c = await caches.open(NOMBRE);
    await c.put(new Request(clave), new Response(blob, { status: 200, headers: h }));
    if (++escrituras % 40 === 0) { const ks = await c.keys(); for (const k of ks.slice(0, Math.max(0, ks.length - MAX))) await c.delete(k); }
  } catch { /* sin caché: se sigue sin guardar */ }
}
export async function leerCache(clave) {
  try { if (typeof caches === 'undefined') return null; const c = await caches.open(NOMBRE); return (await c.match(new Request(clave), { ignoreVary: true })) || null; } catch { return null; }
}
