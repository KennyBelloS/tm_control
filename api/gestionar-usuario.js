import { prepararRespuesta, origenValido, excedeTasa, crearClienteAdmin, exigirAdministrador, cuerpoObjeto } from './_comun.js';
import { limpiarTexto, esUuid, esPasswordValida } from '../src/lib/seguridad.js';

const ACCIONES = ['eliminar', 'cambiar_password', 'cambiar_nombre'];

export default async function handler(req, res) {
  prepararRespuesta(res);
  try {
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Método no permitido' }); }
    if (!origenValido(req)) return res.status(403).json({ error: 'Origen no permitido.' });
    if (excedeTasa(req, 'gestionar-usuario', 30)) return res.status(429).json({ error: 'Demasiadas solicitudes. Espera un minuto.' });

    const admin = crearClienteAdmin();
    if (!admin) return res.status(500).json({ error: 'Falta configurar SUPABASE_SERVICE_ROLE_KEY en Vercel.' });
    const auth = await exigirAdministrador(req, admin);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

    const b = cuerpoObjeto(req);
    if (!b || !ACCIONES.includes(b.accion)) return res.status(400).json({ error: 'Acción desconocida.' });
    if (!esUuid(b.idObjetivo)) return res.status(400).json({ error: 'Identificador inválido.' });

    const { data: objetivo } = await admin.from('perfiles').select('id, es_super_admin').eq('id', b.idObjetivo).single();
    if (!objetivo) return res.status(404).json({ error: 'No existe ese usuario.' });
    if (objetivo.es_super_admin) return res.status(403).json({ error: 'Esta cuenta es el Super Administrador: no se puede modificar ni eliminar.' });

    if (b.accion === 'eliminar') {
      if (b.idObjetivo === auth.usuario.id) return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta.' });
      const { error } = await admin.auth.admin.deleteUser(b.idObjetivo);
      if (error) return res.status(400).json({ error: 'No se pudo eliminar el usuario.' });
      return res.status(200).json({ ok: true });
    }
    if (b.accion === 'cambiar_password') {
      if (!esPasswordValida(b.nuevaPassword)) return res.status(400).json({ error: 'La contraseña debe tener entre 8 y 72 caracteres.' });
      const { error } = await admin.auth.admin.updateUserById(b.idObjetivo, { password: b.nuevaPassword });
      if (error) return res.status(400).json({ error: 'No se pudo cambiar la contraseña.' });
      return res.status(200).json({ ok: true });
    }
    const nombre = limpiarTexto(b.nuevoNombre, 80);
    if (nombre.length < 2) return res.status(400).json({ error: 'El nombre debe tener al menos 2 caracteres.' });
    const { error } = await admin.from('perfiles').update({ nombre }).eq('id', b.idObjetivo);
    if (error) return res.status(400).json({ error: 'No se pudo cambiar el nombre.' });
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('gestionar-usuario:', e);
    return res.status(500).json({ error: 'Error inesperado del servidor.' });
  }
}
