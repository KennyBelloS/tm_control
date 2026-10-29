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
  '/seguridad': () => import('../pages/Seguridad'),
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
const conexionLenta = () => { const c = typeof navigator !== 'undefined' && navigator.connection; return !!c && (c.saveData || /(^|-)[23]g$/.test(c.effectiveType || '')); };
/** Celulares, tabletas pequeñas y equipos modestos: ahí NO se precarga nada (la app instalada ya guarda sus archivos y, mientras tanto, cada pantalla se baja al abrirla). */
export const equipoLimitado = () => {
  if (typeof navigator === 'undefined') return false;
  const n = navigator;
  return conexionLenta() || (typeof matchMedia === 'function' && matchMedia('(max-width: 1023px)').matches) || /Android|iPhone|iPad|iPod|Mobile/i.test(n.userAgent || '') || (n.deviceMemory && n.deviceMemory <= 2) || (n.hardwareConcurrency && n.hardwareConcurrency <= 2);
};
/**
 * En computadores, en ratos REALMENTE libres, de una en una y las más usadas primero. Se detiene mientras la persona toca, teclea o desplaza,
 * y nunca fuerza al navegador (sin «timeout»): lo que se está haciendo siempre va primero. En celulares no hace nada.
 */
export function precargarEnSegundoPlano() {
  if (equipoLimitado()) return () => {};
  const orden = ['/reportes', '/personas', '/rendimientos', '/ranking', '/devoluciones', '/clasificacion', '/lineas', '/colaborador', '/resumenes', '/ayuda'];
  let i = 0, t, parado = false, ultima = -1e9;
  const marcar = () => { ultima = performance.now(); };
  const eventos = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'];
  eventos.forEach(e => window.addEventListener(e, marcar, { passive: true, capture: true }));
  const libre = () => performance.now() - ultima > 1500;
  const cuando = f => { if (parado) return; const ok = () => { if (parado) return; if (libre()) f(); else t = setTimeout(() => cuando(f), 700); }; if (typeof requestIdleCallback === 'function') requestIdleCallback(ok); else t = setTimeout(ok, 300); };
  // Primero lo pesado que comparten varias pantallas (Excel y gráficos), para que ninguna lo descargue en frío al abrirse.
  const calentar = () => { import('xlsx').catch(() => {}); import('react-apexcharts').catch(() => {}); };
  const sig = () => { if (parado || i >= orden.length) return; const p = precargar(orden[i++]); const seguir = () => { t = setTimeout(() => cuando(sig), 250); }; if (p && p.finally) p.finally(seguir); else seguir(); };
  t = setTimeout(() => cuando(() => { calentar(); cuando(sig); }), 2500);
  return () => { parado = true; clearTimeout(t); eventos.forEach(e => window.removeEventListener(e, marcar, { capture: true })); };
}
