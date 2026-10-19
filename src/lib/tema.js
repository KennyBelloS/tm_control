/** Tema claro/oscuro: se guarda en el navegador; sin elección usa el del sistema. */
const CLAVE = 'tm_tema';
export const obtenerTema = () => document.documentElement.dataset.tema === 'oscuro' ? 'oscuro' : 'claro';
export function aplicarTema(tema) {
  document.documentElement.dataset.tema = tema;
  try { localStorage.setItem(CLAVE, tema); } catch { /* sin almacenamiento */ }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', tema === 'oscuro' ? '#0B120E' : '#166534');
  window.dispatchEvent(new CustomEvent('tm-tema', { detail: tema }));
}
export const alternarTema = () => { const nuevo = obtenerTema() === 'oscuro' ? 'claro' : 'oscuro'; aplicarTema(nuevo); return nuevo; };
