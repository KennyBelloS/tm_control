// roles.js
// -----------------------------------------------------------------------
// Sistema de roles y permisos por módulo. Por ahora la "sesión" vive en
// localStorage (no hay login real todavía — eso se conecta más adelante
// con Supabase Auth + la tabla de Usuarios). Cada módulo declara qué
// roles pueden verlo; el Sidebar y las rutas se filtran con esto.
// -----------------------------------------------------------------------

export const ROLES = ['administrador', 'ingeniero', 'supervisor', 'formador'];

export const ROL_LABEL = {
  administrador: 'Administrador',
  ingeniero: 'Ingeniero',
  supervisor: 'Supervisor',
  formador: 'Formador',
};

// Módulos marcados como "técnicos" (Usuarios, Auditoría, Configuración):
// el Ingeniero ve todo MENOS estos. Supervisor y Formador tienen su propio
// listado explícito más abajo (no se definieron reglas exactas todavía,
// así que dejé un criterio razonable — ajústalo en este archivo cuando
// tengas las reglas definitivas).
export const MODULOS = {
  dashboard:      { roles: ['administrador', 'ingeniero', 'supervisor', 'formador'] },
  personas:       { roles: ['administrador', 'ingeniero', 'supervisor'] },
  rendimientos:   { roles: ['administrador', 'ingeniero', 'supervisor', 'formador'] },
  reportes:       { roles: ['administrador', 'ingeniero', 'supervisor'] },
  ranking:        { roles: ['administrador', 'ingeniero', 'supervisor', 'formador'] },
  lineas:         { roles: ['administrador', 'ingeniero', 'supervisor'] },
  indirectos:     { roles: ['administrador', 'ingeniero'] },
  gerencia:       { roles: ['administrador', 'ingeniero'] },
  configuracion:  { roles: ['administrador'] },       // técnico
  usuarios:       { roles: ['administrador'] },       // técnico
  auditoria:      { roles: ['administrador'] },       // técnico
};

export function puedeVer(rol, moduloKey) {
  return MODULOS[moduloKey]?.roles.includes(rol) ?? false;
}

const KEY_SESION = 'tm_sesion';

export function getSesion() {
  try {
    const raw = localStorage.getItem(KEY_SESION);
    if (raw) return JSON.parse(raw);
  } catch { /* noop */ }
  return null;
}

export function setSesion(sesion) {
  localStorage.setItem(KEY_SESION, JSON.stringify(sesion));
  window.dispatchEvent(new Event('tm-sesion-cambio'));
}

export function cerrarSesion() {
  localStorage.removeItem(KEY_SESION);
  window.dispatchEvent(new Event('tm-sesion-cambio'));
}
