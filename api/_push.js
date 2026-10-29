// Avisos importantes: guarda el aviso (para la campana de todos) y lo manda fuera de la app SOLO a quien el Administrador activó.
// La lógica va aquí, separada del endpoint, para poder probarla sin enviar nada de verdad (recibe quién envía y el cliente de la base).
import { armarAviso, esEvento } from '../src/lib/eventosApp.js';

const EDITORES = ['administrador', 'ingeniero', 'digitador'];
const puedeCargar = p => Boolean(p && p.activo && p.edicion !== 'ver' && (p.edicion === 'editar' || EDITORES.includes(p.rol)));

/** → { status, ok, ... }. Nunca devuelve datos de otras personas; los errores internos no se detallan. */
export async function procesarAviso({ admin, enviar, token, cuerpo }) {
  if (!token) return { status: 401, ok: false, error: 'Debes iniciar sesión.' };
  const { data: u, error: eu } = await admin.auth.getUser(token);
  if (eu || !u?.user) return { status: 401, ok: false, error: 'Sesión no válida.' };
  const { data: perfil } = await admin.from('perfiles').select('id, rol, activo, edicion').eq('id', u.user.id).maybeSingle();
  if (!puedeCargar(perfil)) return { status: 403, ok: false, error: 'No tienes permiso para esto.' };
  if (!cuerpo || !esEvento(cuerpo.evento)) return { status: 400, ok: false, error: 'Aviso no válido.' };
  const aviso = armarAviso(cuerpo.evento, { fecha: cuerpo.fecha, hora: cuerpo.hora });
  if (!aviso || !aviso.clave) return { status: 400, ok: false, error: 'Aviso no válido.' };

  const fila = { clave: aviso.clave, tipo: aviso.evento, titulo: aviso.titulo, detalle: aviso.cuerpo, ruta: aviso.ruta, fecha: aviso.fecha, creado_por: u.user.id };
  const { error: ei } = await admin.from('eventos_app').insert(fila);
  if (ei) return /duplicate|23505|unique/i.test(`${ei.code || ''} ${ei.message || ''}`) ? { status: 200, ok: true, duplicado: true, enviados: 0 } : { status: 500, ok: false, error: 'No se pudo guardar el aviso.' };
  try { await admin.from('eventos_app').delete().lt('creado_en', new Date(Date.now() - 30 * 864e5).toISOString()); } catch { /* limpieza: si falla, no importa */ }

  if (!enviar) return { status: 200, ok: true, enviados: 0, sinPush: true };
  const { data: dest } = await admin.from('perfiles').select('id').eq('activo', true).contains('push_eventos', [aviso.evento]);
  const ids = (dest || []).map(d => d.id).filter(id => id !== u.user.id);
  if (!ids.length) return { status: 200, ok: true, enviados: 0, destinatarios: 0 };
  const { data: subs } = await admin.from('push_suscripciones').select('id, usuario_id, endpoint, p256dh, auth').in('usuario_id', ids);
  const carga = JSON.stringify({ titulo: aviso.titulo, cuerpo: aviso.cuerpo, ruta: aviso.ruta, clave: aviso.clave });
  let enviados = 0, fallidos = 0; const caducadas = [];
  for (const s of subs || []) {
    try { await enviar({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, carga); enviados++; }
    catch (e) { fallidos++; if (e?.statusCode === 404 || e?.statusCode === 410) caducadas.push(s.id); }   // el celular ya no existe o quitó el permiso
  }
  if (caducadas.length) { try { await admin.from('push_suscripciones').delete().in('id', caducadas); } catch { /* nada */ } }
  return { status: 200, ok: true, destinatarios: ids.length, enviados, fallidos };
}
