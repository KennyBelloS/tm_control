/**
 * Preferencias de la interfaz que se recuerdan en este navegador (no son datos del negocio):
 *  - menu: "completo" | "mini"       (menú lateral con textos o contraído a íconos)
 *  - densidad: "comoda" | "compacta"  (aire de las tablas y listas)
 * Se aplican como atributos del <html> (data-menu / data-densidad) y el CSS hace el resto.
 */
const CLAVES = { menu: 'tm_menu', densidad: 'tm_densidad' };
const VALIDOS = { menu: ['completo', 'mini'], densidad: ['comoda', 'compacta'] };
const DEFECTO = { menu: 'completo', densidad: 'comoda' };

export function leerAjuste(nombre) {
  try {
    const v = localStorage.getItem(CLAVES[nombre]);
    return VALIDOS[nombre].includes(v) ? v : DEFECTO[nombre];
  } catch { return DEFECTO[nombre]; }
}
export const obtenerAjuste = nombre => document.documentElement.dataset[nombre] || DEFECTO[nombre];

export function aplicarAjustesIniciales() {
  for (const n of Object.keys(CLAVES)) document.documentElement.dataset[n] = leerAjuste(n);
}
export function fijarAjuste(nombre, valor) {
  if (!VALIDOS[nombre]?.includes(valor)) return;
  document.documentElement.dataset[nombre] = valor;
  try { localStorage.setItem(CLAVES[nombre], valor); } catch { /* sin almacenamiento */ }
  window.dispatchEvent(new CustomEvent('tm-ajustes', { detail: { [nombre]: valor } }));
}
export const alternarMenu = () => fijarAjuste('menu', obtenerAjuste('menu') === 'mini' ? 'completo' : 'mini');
export const alternarDensidad = () => fijarAjuste('densidad', obtenerAjuste('densidad') === 'compacta' ? 'comoda' : 'compacta');
