import { supabase } from './supabaseClient';
export const ROLES = ['administrador', 'ingeniero', 'profesional', 'digitador', 'supervisor', 'formador'];
export const ROL_LABEL = {
  administrador: 'Administrador',
  ingeniero: 'Ingeniero',
  profesional: 'Profesional',
  digitador: 'Digitador',
  supervisor: 'Supervisor',
  formador: 'Formador'
};
export const MODULOS = {
  dashboard: {
    roles: ['administrador', 'ingeniero', 'profesional', 'digitador', 'supervisor', 'formador']
  },
  personas: {
    roles: ['administrador', 'ingeniero', 'profesional', 'digitador', 'supervisor']
  },
  rendimientos: {
    roles: ['administrador', 'ingeniero', 'profesional', 'digitador', 'supervisor', 'formador']
  },
  reportes: {
    roles: ['administrador', 'ingeniero', 'profesional', 'digitador', 'supervisor']
  },
  ranking: {
    roles: ['administrador', 'ingeniero', 'profesional', 'digitador', 'supervisor', 'formador']
  },
  lineas: {
    roles: ['administrador', 'ingeniero', 'profesional', 'digitador', 'supervisor']
  },
  indirectos: {
    roles: ['administrador', 'ingeniero', 'profesional', 'digitador']
  },
  gerencia: {
    roles: ['administrador', 'ingeniero', 'profesional', 'digitador']
  },
  configuracion: {
    roles: ['administrador', 'digitador']
  },
  usuarios: {
    roles: ['administrador', 'digitador']
  },
  auditoria: {
    // Auditoría = base de datos, respaldo, optimización — nunca para Digitador.
    roles: ['administrador']
  }
};
export function puedeVer(rol, moduloKey) {
  return MODULOS[moduloKey]?.roles.includes(rol) ?? false;
}
export function puedeEditar(rol) {
  return rol === 'administrador' || rol === 'ingeniero' || rol === 'profesional' || rol === 'digitador';
}
function correoDesdeEntrada(entrada) {
  const valor = String(entrada || '').trim();
  // Supabase Auth solo maneja correos; a quien no es Administrador se le
  // arma un correo falso interno a partir de su "usuario" para que el
  // login funcione igual con usuario+contraseña.
  return valor.includes('@') ? valor.toLowerCase() : `${valor.toLowerCase()}@torremolinos.local`;
}
export async function iniciarSesion(usuarioOCorreo, password) {
  const email = correoDesdeEntrada(usuarioOCorreo);
  const {
    error
  } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (error) throw new Error('Usuario/correo o contraseña incorrectos.');
}
export async function cerrarSesion() {
  await supabase.auth.signOut();
}
export async function getPerfilActual() {
  const {
    data: {
      session
    }
  } = await supabase.auth.getSession();
  if (!session) return null;
  const {
    data,
    error
  } = await supabase.from('perfiles').select('nombre, rol, activo').eq('id', session.user.id).single();
  if (error || !data || !data.activo) return null;
  return {
    nombre: data.nombre,
    rol: data.rol,
    email: session.user.email
  };
}
export async function crearUsuario({
  nombre,
  rol,
  esAdmin,
  usuario,
  email,
  password
}) {
  const {
    data: {
      session
    }
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Debes iniciar sesión.');
  const resp = await fetch('/api/crear-usuario', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      tokenAdmin: session.access_token,
      nombre,
      rol,
      esAdmin,
      usuario,
      email,
      password
    })
  });
  const data = await leerRespuestaSegura(resp);
  if (!resp.ok) throw new Error(data.error || `No se pudo crear el usuario (código ${resp.status}).`);
  return data;
}

/**
 * Lee la respuesta de una función serverless de forma segura: si por algún
 * error inesperado del servidor la respuesta viene vacía o no es JSON
 * válido, esto evita el "JSON.parse: unexpected end of data" y en su lugar
 * da un mensaje de error entendible con el código de estado real.
 */
async function leerRespuestaSegura(resp) {
  const texto = await resp.text();
  if (!texto) return { error: `El servidor respondió vacío (código ${resp.status}). Intenta de nuevo en un momento.` };
  try {
    return JSON.parse(texto);
  } catch {
    return { error: `Respuesta inesperada del servidor (código ${resp.status}): ${texto.slice(0, 200)}` };
  }
}
export async function listarPerfiles() {
  const {
    data,
    error
  } = await supabase.from('perfiles').select('id, nombre, rol, activo, creado_en, es_super_admin').order('creado_en', {
    ascending: false
  });
  if (error) throw error;
  return data || [];
}
export async function cambiarEstadoPerfil(id, activo) {
  const {
    error
  } = await supabase.from('perfiles').update({
    activo
  }).eq('id', id);
  if (error) throw error;
}
export async function cambiarRolPerfil(id, rol) {
  const {
    error
  } = await supabase.from('perfiles').update({
    rol
  }).eq('id', id);
  if (error) throw error;
}

async function llamarGestionarUsuario(payload) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Debes iniciar sesión.');
  const resp = await fetch('/api/gestionar-usuario', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tokenAdmin: session.access_token, ...payload }),
  });
  const data = await leerRespuestaSegura(resp);
  if (!resp.ok) throw new Error(data.error || `No se pudo completar la acción (código ${resp.status}).`);
  return data;
}

export async function eliminarUsuario(idObjetivo) {
  return llamarGestionarUsuario({ accion: 'eliminar', idObjetivo });
}

export async function cambiarPasswordUsuario(idObjetivo, nuevaPassword) {
  return llamarGestionarUsuario({ accion: 'cambiar_password', idObjetivo, nuevaPassword });
}

export async function cambiarNombreUsuario(idObjetivo, nuevoNombre) {
  return llamarGestionarUsuario({ accion: 'cambiar_nombre', idObjetivo, nuevoNombre });
}
