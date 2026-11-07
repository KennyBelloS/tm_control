/**
 * SIMULACRO (solo Administrador, en Configuración) — parte PURA: las situaciones de muestra. Los carteles de la presentación se generan con la MISMA
 * lógica real (eventosPresentacion.js) alimentada con datos inventados, para que lo que se ve en el simulacro sea exactamente lo que verá el público.
 */
import { detectarEventosPresentacion } from './eventosPresentacion.js';
import { HITOS } from './hitos.js';

export const META_MUESTRA = 20000;
const L = (id, tallos) => ({ id, nombre: `Línea ${id}`, tallos });
const BASE = { cumplimiento: 52, rend: 430, lineas: [L(1, 4200), L(2, 3900), L(3, 3600)] };
const con = (cambios) => ({ ...BASE, ...cambios });
// qué cambia entre «hace un momento» (BASE) y «ahora» en cada situación
const CAMBIOS = {
  lider: con({ lineas: [L(1, 4300), L(2, 3950), L(3, 4700)] }),
  supera: con({ lineas: [L(1, 4300), L(2, 3950), L(3, 4050)] }),
  sube: con({ rend: 480, cumplimiento: 55 }),
  baja: con({ rend: 395, cumplimiento: 51 }),
  cumpl: con({ cumplimiento: 63, rend: 436 })
};

export const ESCENAS = [
  ...HITOS.map(h => ({ id: `hito-${h}`, grupo: 'Meta del día', tipo: 'hito', hito: h, titulo: h >= 100 ? 'Se cumple el 100 % de la meta' : `Se llega al ${h} % de la meta`, descripcion: h >= 100 ? 'La flor se abre completa, con confeti, y el cartel dice «¡Meta cumplida!».' : `La flor se abre hasta el ${h} % y se felicita al equipo.` })),
  { id: 'lider', grupo: 'Líneas y rendimiento', tipo: 'evento', titulo: 'Una línea toma el liderazgo', descripcion: 'La línea que iba de tercera pasa a la primera.' },
  { id: 'supera', grupo: 'Líneas y rendimiento', tipo: 'evento', titulo: 'Una línea supera a otra', descripcion: 'Un adelantamiento que no cambia al líder.' },
  { id: 'sube', grupo: 'Líneas y rendimiento', tipo: 'evento', titulo: 'El rendimiento sube de golpe', descripcion: 'Sube 5 % o más entre una actualización y la siguiente.' },
  { id: 'baja', grupo: 'Líneas y rendimiento', tipo: 'evento', titulo: 'El rendimiento baja de golpe', descripcion: 'Baja 5 % o más: cartel rojo que llama la atención.' },
  { id: 'cumpl', grupo: 'Líneas y rendimiento', tipo: 'evento', titulo: 'La meta del día avanza rápido', descripcion: 'El cumplimiento salta 8 puntos o más de golpe.' },
  { id: 'festejo-ok', grupo: 'Al guardar o subir algo', tipo: 'festejo', titulo: 'Se guarda o se sube algo', descripcion: 'Florece la rosa y aparece el aviso de lo que se hizo.' },
  { id: 'festejo-error', grupo: 'Al guardar o subir algo', tipo: 'error', titulo: 'Algo falla al guardar', descripcion: 'El aviso rojo con el mensaje claro del error (sin tecnicismos).' },
  { id: 'aviso-fuera', grupo: 'Avisos', tipo: 'aviso', titulo: 'Aviso en la pantalla del celular', descripcion: 'Cómo se ve un aviso fuera de la app (en este aparato; no se envía a nadie).' }
];
export const escenaPorId = id => ESCENAS.find(e => e.id === id) || null;
export const gruposDeEscenas = () => [...new Set(ESCENAS.map(e => e.grupo))].map(g => ({ grupo: g, escenas: ESCENAS.filter(e => e.grupo === g) }));
export const datosHito = hito => ({ hito, meta: META_MUESTRA, tallos: Math.round(META_MUESTRA * (hito / 100) + (hito >= 100 ? 350 : 0)) });
/** Los carteles de la presentación de una situación, con la lógica real. */
export function eventosDeEscena(id) { const act = CAMBIOS[id]; return act ? detectarEventosPresentacion(BASE, act) : []; }
/** El texto del aviso del celular de muestra. */
export const AVISO_MUESTRA = { titulo: 'Turno actual cargado', cuerpo: 'Ya está el rendimiento hora a hora hasta las 10:00 a. m. (simulacro)', ruta: '/rendimientos' };
