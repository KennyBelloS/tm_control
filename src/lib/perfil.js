/** MI PERFIL — infraestructura: guardar el nombre (función SQL de la sección 36) y el avatar de flores (datos de la cuenta). */
import { supabase } from './supabaseClient';
import { florValida } from './avatares';

export async function guardarPerfil({ nombre, avatar, cambiaNombre, cambiaAvatar }) {
  if (cambiaNombre) {
    const { error } = await supabase.rpc('actualizar_mi_nombre', { p_nombre: nombre });
    if (error) throw new Error(/function|schema cache|could not find|not find/i.test(error.message) ? 'Falta ejecutar en Supabase el SQL de la sección 36 para poder cambiar el nombre.' : error.message);
  }
  if (cambiaAvatar) {
    const { error } = await supabase.auth.updateUser({ data: { avatar: florValida(avatar) ? avatar : null } });
    if (error) throw error;
  }
  window.dispatchEvent(new Event('tm-sesion-cambio'));          // el menú, la barra y los demás se enteran
}
