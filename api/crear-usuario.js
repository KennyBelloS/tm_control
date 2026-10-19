import { prepararRespuesta, origenValido, excedeTasa, crearClienteAdmin, exigirAdministrador, cuerpoObjeto, ROLES_VALIDOS } from './_comun.js';
import { limpiarTexto, esCorreo, esUsuarioValido, esPasswordValida } from '../src/lib/seguridad.js';

export default async function handler(req, res) {
  prepararRespuesta(res);
  // Todo dentro de un try/catch: pase lo que pase, el navegador recibe un JSON claro y NUNCA detalles internos.
  try {
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Método no permitido' }); }
    if (!origenValido(req)) return res.status(403).json({ error: 'Origen no permitido.' });
    if (excedeTasa(req, 'crear-usuario', 15)) return res.status(429).json({ error: 'Demasiadas solicitudes. Espera un minuto.' });

    const admin = crearClienteAdmin();
    if (!admin) return res.status(500).json({ error: 'Falta configurar SUPABASE_SERVICE_ROLE_KEY en Vercel.' });
    const auth = await exigirAdministrador(req, admin);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

    const b = cuerpoObjeto(req);
    if (!b) return res.status(400).json({ error: 'Datos inválidos.' });
    const nombre = limpiarTexto(b.nombre, 80);
    if (nombre.length < 2) return res.status(400).json({ error: 'El nombre debe tener al menos 2 caracteres.' });
    if (!ROLES_VALIDOS.includes(b.rol)) return res.status(400).json({ error: 'Rol inválido.' });
    if (!esPasswordValida(b.password)) return res.status(400).json({ error: 'La contraseña debe tener entre 8 y 72 caracteres.' });

    let correo;
    if (b.esAdmin === true) {
      correo = String(b.email || '').trim().toLowerCase();
      if (!esCorreo(correo)) return res.status(400).json({ error: 'El correo no es válido.' });
    } else {
      const usuario = String(b.usuario || '').trim().toLowerCase();
      if (!esUsuarioValido(usuario)) return res.status(400).json({ error: 'El usuario debe tener de 3 a 30 caracteres: letras minúsculas, números, punto, guion o guion bajo.' });
      correo = `${usuario}@torremolinos.local`;
    }

    const { data: nuevo, error: errorCrear } = await admin.auth.admin.createUser({ email: correo, password: b.password, email_confirm: true });
    if (errorCrear) {
      const yaExiste = /already|registered|exists/i.test(errorCrear.message || '');
      return res.status(yaExiste ? 409 : 400).json({ error: yaExiste ? 'Ese usuario o correo ya existe.' : 'No se pudo crear el usuario.' });
    }
    const { error: errorPerfil } = await admin.from('perfiles').insert({ id: nuevo.user.id, nombre, rol: b.rol });
    if (errorPerfil) {
      await admin.auth.admin.deleteUser(nuevo.user.id);          // no dejar una cuenta sin perfil
      const faltaSql = errorPerfil.code === '23514' || /check/i.test(errorPerfil.message || '');
      return res.status(400).json({ error: faltaSql ? 'La base de datos aún no acepta este rol: falta correr el SQL que agrega los roles nuevos a la tabla perfiles.' : 'No se pudo guardar el perfil.' });
    }
    return res.status(200).json({ ok: true, id: nuevo.user.id, correo });
  } catch (e) {
    console.error('crear-usuario:', e);                          // el detalle queda en el registro del servidor, no en la respuesta
    return res.status(500).json({ error: 'Error inesperado del servidor.' });
  }
}
