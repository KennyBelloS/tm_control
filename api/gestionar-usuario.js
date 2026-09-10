import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Falta configurar SUPABASE_SERVICE_ROLE_KEY en Vercel.' });
  }

  const { tokenAdmin, accion, idObjetivo, nuevaPassword, nuevoNombre } = req.body || {};
  if (!tokenAdmin || !accion || !idObjetivo) {
    return res.status(400).json({ error: 'Faltan datos.' });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey);

  const { data: quienLlama, error: errorToken } = await supabaseAdmin.auth.getUser(tokenAdmin);
  if (errorToken || !quienLlama?.user) {
    return res.status(401).json({ error: 'Sesión inválida.' });
  }
  const { data: perfilQuienLlama } = await supabaseAdmin
    .from('perfiles')
    .select('rol, activo')
    .eq('id', quienLlama.user.id)
    .single();
  if (!perfilQuienLlama || perfilQuienLlama.rol !== 'administrador' || !perfilQuienLlama.activo) {
    return res.status(403).json({ error: 'Solo un Administrador puede gestionar usuarios.' });
  }

  const { data: perfilObjetivo } = await supabaseAdmin
    .from('perfiles')
    .select('es_super_admin')
    .eq('id', idObjetivo)
    .single();
  if (perfilObjetivo?.es_super_admin) {
    return res.status(403).json({ error: 'Esta cuenta es el Super Administrador — no se puede modificar ni eliminar.' });
  }

  if (accion === 'eliminar') {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(idObjetivo);
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  if (accion === 'cambiar_password') {
    if (!nuevaPassword || nuevaPassword.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
    }
    const { error } = await supabaseAdmin.auth.admin.updateUserById(idObjetivo, { password: nuevaPassword });
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  if (accion === 'cambiar_nombre') {
    const { error } = await supabaseAdmin.from('perfiles').update({ nombre: nuevoNombre }).eq('id', idObjetivo);
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: 'Acción desconocida.' });
}
