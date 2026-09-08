import { createClient } from '@supabase/supabase-js';
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Método no permitido'
    });
  }
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({
      error: 'Falta configurar SUPABASE_SERVICE_ROLE_KEY en Vercel (ver MANUAL.md).'
    });
  }
  const {
    tokenAdmin,
    nombre,
    rol,
    esAdmin,
    usuario,
    email,
    password
  } = req.body || {};
  if (!tokenAdmin) return res.status(401).json({
    error: 'Falta el token de sesión del administrador.'
  });
  if (!nombre || !rol || !password) return res.status(400).json({
    error: 'Faltan datos: nombre, rol o contraseña.'
  });
  if (!['administrador', 'ingeniero', 'supervisor', 'formador'].includes(rol)) {
    return res.status(400).json({
      error: 'Rol inválido.'
    });
  }
  const supabaseAdmin = createClient(supabaseUrl, serviceKey);
  const {
    data: quienLlama,
    error: errorToken
  } = await supabaseAdmin.auth.getUser(tokenAdmin);
  if (errorToken || !quienLlama?.user) {
    return res.status(401).json({
      error: 'Sesión inválida.'
    });
  }
  const {
    data: perfilQuienLlama
  } = await supabaseAdmin.from('perfiles').select('rol, activo').eq('id', quienLlama.user.id).single();
  if (!perfilQuienLlama || perfilQuienLlama.rol !== 'administrador' || !perfilQuienLlama.activo) {
    return res.status(403).json({
      error: 'Solo un Administrador puede crear usuarios.'
    });
  }
  const correoFinal = esAdmin ? String(email || '').trim().toLowerCase() : `${String(usuario || '').trim().toLowerCase()}@torremolinos.local`;
  if (!esAdmin && !usuario) return res.status(400).json({
    error: 'Falta el nombre de usuario.'
  });
  if (esAdmin && !email) return res.status(400).json({
    error: 'Falta el correo.'
  });
  const {
    data: nuevo,
    error: errorCrear
  } = await supabaseAdmin.auth.admin.createUser({
    email: correoFinal,
    password,
    email_confirm: true
  });
  if (errorCrear) return res.status(400).json({
    error: errorCrear.message
  });
  const {
    error: errorPerfil
  } = await supabaseAdmin.from('perfiles').insert({
    id: nuevo.user.id,
    nombre,
    rol
  });
  if (errorPerfil) {
    await supabaseAdmin.auth.admin.deleteUser(nuevo.user.id);
    return res.status(400).json({
      error: errorPerfil.message
    });
  }
  return res.status(200).json({
    ok: true,
    id: nuevo.user.id,
    correo: correoFinal
  });
}
