// Utilidades compartidas de las funciones del servidor. El guion bajo en el nombre hace que Vercel NO lo publique como ruta.
import { createClient } from '@supabase/supabase-js';

export const ROLES_VALIDOS = ['administrador', 'ingeniero', 'profesional', 'digitador', 'supervisor', 'formador'];

/** Toda respuesta: JSON, sin caché (hay datos de sesión) y sin que el navegador "adivine" el tipo. */
export function prepararRespuesta(res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
}

/** Solo se aceptan peticiones que vengan de esta misma página (un sitio ajeno no puede usar la sesión de un administrador). */
export function origenValido(req) {
  const origen = req.headers.origin;
  if (!origen) return true;                       // herramientas que no son un navegador: igual deben traer el token
  try { return new URL(origen).host === req.headers.host; } catch { return false; }
}

const ventanas = new Map();
/** Límite simple de peticiones por IP y por función (frena la fuerza bruta y los abusos). Devuelve true si se pasó del límite. */
export function excedeTasa(req, clave, max = 20, ventanaMs = 60_000) {
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'desconocida';
  const llave = `${clave}:${ip}`;
  const ahora = Date.now();
  const lista = (ventanas.get(llave) || []).filter(t => ahora - t < ventanaMs);
  lista.push(ahora);
  ventanas.set(llave, lista);
  if (ventanas.size > 5000) for (const [k, v] of ventanas) if (!v.some(t => ahora - t < ventanaMs)) ventanas.delete(k);
  return lista.length > max;
}

/** Cliente con la llave de servicio (poder total): SOLO existe aquí, en el servidor. */
export function crearClienteAdmin() {
  const url = process.env.VITE_SUPABASE_URL, llave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && llave ? createClient(url, llave, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
}

export function extraerToken(req) {
  const h = String(req.headers.authorization || '');
  if (/^Bearer\s+/i.test(h)) return h.replace(/^Bearer\s+/i, '').trim();
  return typeof req.body?.tokenAdmin === 'string' ? req.body.tokenAdmin.trim() : '';
}

/** Comprueba la sesión y que quien llama sea un Administrador activo. Devuelve { ok, status, error, usuario }. */
export async function exigirAdministrador(req, admin) {
  const token = extraerToken(req);
  if (!token || token.length > 4096) return { ok: false, status: 401, error: 'Falta la sesión del administrador.' };
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return { ok: false, status: 401, error: 'Sesión inválida.' };
  const { data: perfil } = await admin.from('perfiles').select('rol, activo').eq('id', data.user.id).single();
  if (!perfil || perfil.rol !== 'administrador' || !perfil.activo) return { ok: false, status: 403, error: 'Solo un Administrador puede hacer esto.' };
  return { ok: true, usuario: data.user };
}

/** El cuerpo debe ser un objeto JSON normal (no un arreglo ni un texto). */
export const cuerpoObjeto = req => (req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : null);
