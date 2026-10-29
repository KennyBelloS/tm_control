/**
 * AVATARES DE ROSAS — datos puros: 12 rosas de distintos tipos para el perfil (cómo se dibuja cada una) y la validación del nombre.
 * Cada rosa: sus CAPAS de pétalos (de afuera hacia adentro: forma, cuántos, tamaño, colores, giro), el centro (el espiral del capullo) y el fondo.
 * El dibujo lo hace components/AvatarFlor.jsx.
 */
export const ROSAS = [
  { id: 'roja', nombre: 'Rosa roja', fondo: ['#FFE3E6', '#FFC4CB'], capas: [{ forma: 'redondo', n: 6, largo: 35, ancho: 21, colores: ['#E0344D', '#A50F2C'], giro: 0 }, { forma: 'redondo', n: 5, largo: 27, ancho: 17, colores: ['#EF4E63', '#B3162F'], giro: 36 }, { forma: 'redondo', n: 4, largo: 19, ancho: 13, colores: ['#F26B7C', '#C81D3B'], giro: 18 }], centro: { r: 5, color: '#7A0B20' }, espiral: '#7A0B20' },
  { id: 'blanca', nombre: 'Rosa blanca', fondo: ['#E7F4EA', '#C9E6D1'], capas: [{ forma: 'redondo', n: 6, largo: 35, ancho: 21, colores: ['#FFFFFF', '#E3DCE3'], giro: 0 }, { forma: 'redondo', n: 5, largo: 27, ancho: 17, colores: ['#FFF7F7', '#E9DFE5'], giro: 36 }, { forma: 'redondo', n: 4, largo: 19, ancho: 13, colores: ['#FFFFFF', '#EEE3E9'], giro: 18 }], centro: { r: 5, color: '#BFAFBB' }, espiral: '#BFAFBB' },
  { id: 'rosada', nombre: 'Rosa rosada', fondo: ['#FFF0F4', '#FFD3E0'], capas: [{ forma: 'redondo', n: 6, largo: 35, ancho: 21, colores: ['#F7A1BC', '#D9507F'], giro: 0 }, { forma: 'redondo', n: 5, largo: 27, ancho: 17, colores: ['#FAB4CB', '#E0668F'], giro: 36 }, { forma: 'redondo', n: 4, largo: 19, ancho: 13, colores: ['#FCC8D9', '#E87BA0'], giro: 18 }], centro: { r: 5, color: '#B5336A' }, espiral: '#B5336A' },
  { id: 'amarilla', nombre: 'Rosa amarilla', fondo: ['#FFF7D6', '#FFE79A'], capas: [{ forma: 'redondo', n: 6, largo: 35, ancho: 21, colores: ['#FFD84A', '#E7A800'], giro: 0 }, { forma: 'redondo', n: 5, largo: 27, ancho: 17, colores: ['#FFE36E', '#EDB400'], giro: 36 }, { forma: 'redondo', n: 4, largo: 19, ancho: 13, colores: ['#FFEE99', '#F2BE1A'], giro: 18 }], centro: { r: 5, color: '#B77F00' }, espiral: '#B77F00' },
  { id: 'coral', nombre: 'Rosa coral', fondo: ['#FFEBE0', '#FFCDB5'], capas: [{ forma: 'redondo', n: 6, largo: 35, ancho: 21, colores: ['#FF8A65', '#E5502F'], giro: 0 }, { forma: 'redondo', n: 5, largo: 27, ancho: 17, colores: ['#FF9C7B', '#EA6240'], giro: 36 }, { forma: 'redondo', n: 4, largo: 19, ancho: 13, colores: ['#FFB097', '#F07858'], giro: 18 }], centro: { r: 5, color: '#B03A1C' }, espiral: '#B03A1C' },
  { id: 'lavanda', nombre: 'Rosa lavanda', fondo: ['#F1E8FF', '#D9C5F7'], capas: [{ forma: 'redondo', n: 6, largo: 35, ancho: 21, colores: ['#C8A2F0', '#8E5BD0'], giro: 0 }, { forma: 'redondo', n: 5, largo: 27, ancho: 17, colores: ['#D5B6F5', '#9C6DDA'], giro: 36 }, { forma: 'redondo', n: 4, largo: 19, ancho: 13, colores: ['#E2CBF8', '#AD84E2'], giro: 18 }], centro: { r: 5, color: '#6A3FB0' }, espiral: '#6A3FB0' },
  { id: 'burdeos', nombre: 'Rosa burdeos', fondo: ['#F4E1E6', '#E3B8C4'], capas: [{ forma: 'redondo', n: 6, largo: 35, ancho: 21, colores: ['#8E1B3A', '#4F0A1F'], giro: 0 }, { forma: 'redondo', n: 5, largo: 27, ancho: 17, colores: ['#A12547', '#5C0E24'], giro: 36 }, { forma: 'redondo', n: 4, largo: 19, ancho: 13, colores: ['#B53058', '#6B1229'], giro: 18 }], centro: { r: 5, color: '#2E0510' }, espiral: '#2E0510' },
  { id: 'durazno', nombre: 'Rosa durazno', fondo: ['#FFF1E6', '#FFD9BD'], capas: [{ forma: 'redondo', n: 6, largo: 35, ancho: 21, colores: ['#FFC49B', '#F08A55'], giro: 0 }, { forma: 'redondo', n: 5, largo: 27, ancho: 17, colores: ['#FFD0AE', '#F49C6C'], giro: 36 }, { forma: 'redondo', n: 4, largo: 19, ancho: 13, colores: ['#FFDDC2', '#F7AD83'], giro: 18 }], centro: { r: 5, color: '#C2693A' }, espiral: '#C2693A' },
  { id: 'fucsia', nombre: 'Rosa fucsia', fondo: ['#FFE3F2', '#FFB8DE'], capas: [{ forma: 'redondo', n: 6, largo: 35, ancho: 21, colores: ['#E83E9B', '#A8146A'], giro: 0 }, { forma: 'redondo', n: 5, largo: 27, ancho: 17, colores: ['#EE5AAB', '#B6207A'], giro: 36 }, { forma: 'redondo', n: 4, largo: 19, ancho: 13, colores: ['#F377BD', '#C42E8A'], giro: 18 }], centro: { r: 5, color: '#7C0B4E' }, espiral: '#7C0B4E' },
  { id: 'bicolor', nombre: 'Rosa bicolor', fondo: ['#FFF3E4', '#FFD9B0'], capas: [{ forma: 'redondo', n: 6, largo: 35, ancho: 21, colores: ['#FFE6E9', '#D2223E'], giro: 0 }, { forma: 'redondo', n: 5, largo: 27, ancho: 17, colores: ['#FFB3BF', '#D2223E'], giro: 36 }, { forma: 'redondo', n: 4, largo: 19, ancho: 13, colores: ['#E0344D', '#A50F2C'], giro: 18 }], centro: { r: 5, color: '#7A0B20' }, espiral: '#7A0B20' },
  { id: 'silvestre', nombre: 'Rosa silvestre', fondo: ['#E3F4E8', '#BFE3CB'], capas: [{ forma: 'redondo', n: 5, largo: 35, ancho: 27, colores: ['#F9B7CF', '#E56B99'], giro: 0 }], centro: { r: 9, color: '#FFD54A', color2: '#E0A400', puntos: true }, espiral: null },
  { id: 'capullo', nombre: 'Capullo de rosa', fondo: ['#E9F6EC', '#C7E6D0'], capas: [{ forma: 'punta', n: 4, largo: 36, ancho: 9, colores: ['#5FBF73', '#2E8C4E'], giro: 0 }, { forma: 'redondo', n: 5, largo: 26, ancho: 16, colores: ['#F0506A', '#B3162F'], giro: 0 }, { forma: 'redondo', n: 4, largo: 17, ancho: 11, colores: ['#F77B8E', '#C81D3B'], giro: 20 }], centro: { r: 4, color: '#8E0F25' }, espiral: '#7A0B20' }
];
export const FLORES = ROSAS;            // (nombre antiguo, se conserva para no tocar el resto del código)
const IDS = new Set(FLORES.map(f => f.id));
export const florValida = id => IDS.has(String(id ?? ''));
export const florPorId = id => FLORES.find(f => f.id === id) || null;
/** Una rosa al azar (para el festejo); `azar` permite probarla. */
export const florAlAzar = (azar = Math.random) => FLORES[Math.floor(azar() * FLORES.length)];

/** El nombre de la persona: 2 a 60 caracteres, sin < ni >, con los espacios arreglados. → { ok, valor, error } */
export function validarNombre(texto) {
  const valor = String(texto ?? '').replace(/\s+/g, ' ').trim();
  if (valor.length < 2) return { ok: false, valor, error: 'El nombre debe tener al menos 2 letras.' };
  if (valor.length > 60) return { ok: false, valor, error: 'El nombre puede tener hasta 60 letras.' };
  if (/[<>]/.test(valor)) return { ok: false, valor, error: 'El nombre no puede llevar los signos < ni >.' };
  return { ok: true, valor, error: '' };
}
