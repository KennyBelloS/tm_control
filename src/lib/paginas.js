/**
 * Pantallas por demanda: cada módulo es un archivo aparte que se descarga SOLO cuando se necesita (el arranque pesa lo mínimo).
 * Se precargan: (1) al pasar el mouse/dedo por un enlace del menú, (2) en un rato libre después de abrir, si la conexión lo permite.
 */
export const cargadores = {
  '/': () => import('../pages/Dashboard'),
  '/personas': () => import('../pages/Personas'),
  '/rendimientos': () => import('../pages/Rendimientos'),
  '/reportes': () => import('../pages/Reportes'),
  '/ranking': () => import('../pages/Ranking'),
  '/lineas': () => import('../pages/Lineas'),
  '/indirectos': () => import('../pages/Indirectos'),
  '/gerencia': () => import('../pages/Gerencia'),
  '/clasificacion': () => import('../pages/Clasificacion'),
  '/colaborador': () => import('../pages/TableroColaborador'),
  '/devoluciones': () => import('../pages/Devoluciones'),
  '/tableros': () => import('../pages/Tableros'),
  '/configuracion': () => import('../pages/Configuracion'),
  '/usuarios': () => import('../pages/Usuarios'),
  '/auditoria': () => import('../pages/Auditoria'),
  '/resumenes': () => import('../pages/Resumenes'),
  '/ayuda': () => import('../pages/Ayuda')
};
const pedidas = new Map();
/** Pide la pantalla de esa ruta (una sola vez). Devuelve la promesa; nunca falla en voz alta. */
export function precargar(ruta) {
  const base = ruta === '/' ? '/' : '/' + String(ruta).split(/[/?#]/).filter(Boolean)[0];
  const f = cargadores[base];
  if (!f) return null;
  if (!pedidas.has(base)) pedidas.set(base, f().catch(() => { pedidas.delete(base); }));
  return pedidas.get(base);
}
const conexionLenta = () => { const c = typeof navigator !== 'undefined' && navigator.connection; return !!c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || '')); };
/** En ratos libres, de una en una y las más usadas primero (así no compite con lo que se está viendo). */
export function precargarEnSegundoPlano() {
  if (conexionLenta()) return () => {};
  const orden = ['/reportes', '/personas', '/rendimientos', '/ranking', '/devoluciones', '/clasificacion', '/lineas', '/colaborador', '/resumenes', '/ayuda'];
  let i = 0, t;
  const idle = typeof requestIdleCallback === 'function' ? requestIdleCallback : f => setTimeout(f, 300);
  const sig = () => { if (i >= orden.length) return; precargar(orden[i++])?.finally?.(() => { t = setTimeout(() => idle(sig), 400); }) ?? idle(sig); };
  t = setTimeout(() => idle(sig), 3500);
  return () => clearTimeout(t);
}
