import { hayConexion } from './conexion';
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
    roles: ['administrador', 'ingeniero', 'profesional', 'digitador', 'supervisor', 'formador']
  },
  rendimientos: {
    roles: ['administrador', 'ingeniero', 'profesional', 'digitador', 'supervisor', 'formador']
  },
  reportes: {
    roles: ['administrador', 'ingeniero', 'profesional', 'digitador', 'supervisor', 'formador']
  },
  ranking: {
    roles: ['administrador', 'ingeniero', 'profesional', 'digitador', 'supervisor', 'formador']
  },
  colaborador: {
    roles: ['administrador', 'ingeniero', 'profesional', 'digitador', 'supervisor', 'formador']
  },
  lineas: {
    roles: ['administrador', 'ingeniero', 'profesional', 'digitador', 'supervisor', 'formador']
  },
  indirectos: {
    roles: ['administrador', 'ingeniero', 'profesional', 'digitador']
  },
  gerencia: {
    roles: ['administrador', 'ingeniero', 'profesional', 'digitador']
  },
  clasificacion: {
    roles: ['administrador', 'ingeniero', 'profesional', 'digitador', 'supervisor', 'formador']
  },
  devoluciones: {
    roles: ['administrador', 'ingeniero', 'profesional', 'digitador', 'supervisor', 'formador']
  },
  tableros: {
    // Todos los roles pueden ver este módulo, tal como pediste.
    roles: ['administrador', 'ingeniero', 'profesional', 'digitador', 'supervisor', 'formador']
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
  },
  resumenes: {
    // Resúmenes de la finca (con cifras de todo el personal) → solo Administrador.
    roles: ['administrador']
  },
  ayuda: {
    // Cómo se usa: el manual dentro de la app, para todos.
    roles: ['administrador', 'ingeniero', 'profesional', 'digitador', 'supervisor', 'formador']
  }
};
export function puedeVer(rol, moduloKey) {
  return MODULOS[moduloKey]?.roles.includes(rol) ?? false;
}
// Supervisor y Formador son roles de SOLO VISUALIZACIÓN: nunca cargan, editan ni borran nada (la base de datos también lo impide).
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
// Freno de contraseñas adivinadas: tras 5 fallos seguidos se espera 30 s, y el tiempo se duplica en cada nuevo fallo (máx. 5 min).
// (La protección real también la hace el servidor de autenticación; esto evita ataques desde esta misma pantalla.)
const CLAVE_LOGIN = 'tm_login';
const leerEstadoLogin = () => { try { return JSON.parse(localStorage.getItem(CLAVE_LOGIN)) || { fallos: 0, hasta: 0 }; } catch { return { fallos: 0, hasta: 0 }; } };
const guardarEstadoLogin = est => { try { localStorage.setItem(CLAVE_LOGIN, JSON.stringify(est)); } catch { /* sin almacenamiento */ } };
export async function iniciarSesion(usuarioOCorreo, password) {
  const est = leerEstadoLogin();
  if (est.hasta > Date.now()) throw new Error(`Demasiados intentos. Espera ${Math.ceil((est.hasta - Date.now()) / 1000)} segundos.`);
  const entrada = String(usuarioOCorreo || '').trim();
  const invalido = !entrada || entrada.length > 254 || typeof password !== 'string' || !password || password.length > 128;
  const email = invalido ? null : correoDesdeEntrada(entrada);
  const { error } = invalido ? { error: true } : await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const fallos = est.fallos + 1;
    guardarEstadoLogin({ fallos, hasta: fallos >= 5 ? Date.now() + Math.min(30_000 * 2 ** (fallos - 5), 300_000) : 0 });
    // Mismo mensaje para "usuario inexistente" y "contraseña mala": no se revela qué cuentas existen.
    throw new Error('Usuario/correo o contraseña incorrectos.');
  }
  guardarEstadoLogin({ fallos: 0, hasta: 0 });
  olvidarDatosLocales();
  try { localStorage.setItem('tm_bienvenida_pendiente', '1'); } catch { /* sin almacenamiento */ }       // al entrar: pantalla de bienvenida y recorrido
}
export async function cerrarSesion() {
  olvidarDatosLocales();
  await supabase.auth.signOut();
}
const CLAVE_PERFIL = 'tm_perfil_cache';
const perfilGuardado = () => { try { const p = JSON.parse(localStorage.getItem(CLAVE_PERFIL) || 'null'); return p && Date.now() - p.t < 30 * 864e5 ? p.perfil : null; } catch { return null; } };
/** Los datos guardados para ver la app sin internet son de UNA persona: se borran al entrar y al salir. */
export function olvidarDatosLocales() { try { localStorage.removeItem(CLAVE_PERFIL); } catch { /* sin almacenamiento */ } try { caches?.delete?.('datos-api'); } catch { /* sin caché */ } }
export async function getPerfilActual() {
  const {
    data: {
      session
    }
  } = await supabase.auth.getSession();
  // Sin internet no se saca a nadie de la app: se usa el último perfil conocido (solo para ver; guardar exige conexión).
  if (!session) return hayConexion() ? null : perfilGuardado();
  const {
    data,
    error
  } = await supabase.from('perfiles').select('nombre, rol, activo').eq('id', session.user.id).single();
  if (error && !hayConexion()) return perfilGuardado();
  if (error || !data || !data.activo) return null;
  const perfil = {
    nombre: data.nombre,
    rol: data.rol,
    email: session.user.email
  };
  try { localStorage.setItem(CLAVE_PERFIL, JSON.stringify({ t: Date.now(), perfil })); } catch { /* sin almacenamiento */ }
  return perfil;
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
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`
    },
    body: JSON.stringify({
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
    return { error: `Respuesta inesperada del servidor (código ${resp.status}).` };
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
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(payload),
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
