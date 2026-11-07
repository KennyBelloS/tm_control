/**
 * AVISOS FUERA DE LA APP — parte PURA: validar la llave pública (que no esté mal copiada) y comparar llaves.
 * (Traducir los errores del navegador a frases claras lo hace pushErrores.js.)
 */
export const limpiarClave = s => String(s ?? '').trim().replace(/^["']+|["']+$/g, '').replace(/\s+/g, '');
/** Convierte una llave base64url en bytes. Lanza error si trae caracteres que no son de una llave. */
export function aBytes(b64) {
  const limpio = limpiarClave(b64);
  if (!/^[A-Za-z0-9_-]+={0,2}$/.test(limpio)) throw new Error('clave con caracteres no válidos');
  const p = '='.repeat((4 - (limpio.length % 4)) % 4), s = atob((limpio + p).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, c => c.charCodeAt(0));
}
/** Una llave pública VAPID es un punto P-256 sin comprimir: 65 bytes y el primero es 4 (en texto son 87 caracteres que empiezan por «B»). */
export function claveValida(b64) { try { const b = aBytes(b64); return b.length === 65 && b[0] === 4; } catch { return false; } }
export const mismasLlaves = (a, b) => !!a && !!b && a.length === b.length && a.every((x, i) => x === b[i]);
