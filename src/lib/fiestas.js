/**
 * FESTIVIDADES del ambiente visual. PURO: sin navegador, para poder probar las fechas.
 * Cada festividad trae su paleta (solo los colores de acento: el resto de la interfaz no cambia), sus partículas y su saludo.
 * Las fechas móviles se calculan cada año (por ejemplo, el Día de la Madre es el segundo domingo de mayo).
 */
const p2 = n => String(n).padStart(2, '0');
const iso = (a, m, d) => `${a}-${p2(m)}-${p2(d)}`;

/** El día del mes del n-ésimo "diaSemana" (0 = domingo … 6 = sábado) de un mes. Ej.: 2.º domingo de mayo. */
export function nEsimoDiaSemana(anio, mes, diaSemana, n) {
  const primero = new Date(Date.UTC(anio, mes - 1, 1)).getUTCDay();
  return 1 + ((diaSemana - primero + 7) % 7) + (n - 1) * 7;
}

/**
 * Las festividades. "ventanas(anio)" devuelve los rangos [desde, hasta] (inclusive) del ambiente festivo de ese año.
 * colores: solo los de acento (primary, primary-dark, primary-light, accent, gold, secondary).
 */
export const FIESTAS = [
  {
    id: 'ano_nuevo', nombre: 'Año Nuevo', emoji: '🥂', saludo: '¡Feliz Año Nuevo!', fecha: '29 dic – 3 ene',
    ventanas: a => [[iso(a, 12, 29), iso(a + 1, 1, 3)], [iso(a - 1, 12, 29), iso(a, 1, 3)]],
    colores: { primary: '#1E293B', 'primary-dark': '#0B1020', 'primary-light': '#64748B', accent: '#F59E0B', gold: '#FBBF24', secondary: '#334155' },
    particulas: ['🎆', '✨', '🥂', '🎉', '⭐'], confeti: ['#FBBF24', '#F59E0B', '#FFFFFF', '#94A3B8']
  },
  {
    id: 'san_valentin', nombre: 'San Valentín', emoji: '💘', saludo: '¡Feliz San Valentín!', fecha: '1 – 15 feb',
    ventanas: a => [[iso(a, 2, 1), iso(a, 2, 15)]],
    colores: { primary: '#BE123C', 'primary-dark': '#6B0F2A', 'primary-light': '#FB7185', accent: '#EC4899', gold: '#F4A6B7', secondary: '#E11D48' },
    particulas: ['❤️', '💖', '🌹', '💘', '💕'], confeti: ['#FB7185', '#F43F5E', '#FFFFFF', '#F9A8D4']
  },
  {
    id: 'mujer', nombre: 'Día de la Mujer', emoji: '🌷', saludo: '¡Feliz Día de la Mujer!', fecha: '1 – 9 mar',
    ventanas: a => [[iso(a, 3, 1), iso(a, 3, 9)]],
    colores: { primary: '#7E22CE', 'primary-dark': '#3B0F6B', 'primary-light': '#C084FC', accent: '#16A34A', gold: '#F5B83D', secondary: '#9333EA' },
    particulas: ['🌷', '🌸', '🦋', '💜', '🌺'], confeti: ['#C084FC', '#A855F7', '#FFFFFF', '#86EFAC']
  },
  {
    id: 'madre', nombre: 'Día de la Madre', emoji: '💐', saludo: '¡Feliz Día de la Madre!', fecha: '1 may – 2.º domingo',
    ventanas: a => [[iso(a, 5, 1), iso(a, 5, nEsimoDiaSemana(a, 5, 0, 2))]],
    colores: { primary: '#BE185D', 'primary-dark': '#6D0E3A', 'primary-light': '#F472B6', accent: '#F97316', gold: '#FBBF24', secondary: '#DB2777' },
    particulas: ['🌸', '💐', '🌷', '🌹', '🤍'], confeti: ['#F472B6', '#FBCFE8', '#FFFFFF', '#FBBF24']
  },
  {
    id: 'padre', nombre: 'Día del Padre', emoji: '🏆', saludo: '¡Feliz Día del Padre!', fecha: '8 jun – 3.er domingo',
    ventanas: a => [[iso(a, 6, 8), iso(a, 6, nEsimoDiaSemana(a, 6, 0, 3))]],
    colores: { primary: '#1D4ED8', 'primary-dark': '#0F2A6B', 'primary-light': '#60A5FA', accent: '#0EA5E9', gold: '#F59E0B', secondary: '#2563EB' },
    particulas: ['⭐', '🏆', '💙', '🎖️'], confeti: ['#60A5FA', '#3B82F6', '#FFFFFF', '#FBBF24']
  },
  {
    id: 'patria', nombre: 'Fiestas patrias', emoji: '🎊', saludo: '¡Viva Colombia!', fecha: '14 – 21 jul · 1 – 8 ago',
    ventanas: a => [[iso(a, 7, 14), iso(a, 7, 21)], [iso(a, 8, 1), iso(a, 8, 8)]],
    colores: { primary: '#1E40AF', 'primary-dark': '#0F1F5C', 'primary-light': '#5B82E6', accent: '#DC2626', gold: '#FACC15', secondary: '#2549B8' },
    particulas: ['⭐', '🎉', '🎊', '✨'], confeti: ['#FACC15', '#1E40AF', '#DC2626', '#FFFFFF']
  },
  {
    id: 'amor_amistad', nombre: 'Amor y Amistad', emoji: '💛', saludo: '¡Feliz Amor y Amistad!', fecha: '10 sep – 3.er sábado',
    ventanas: a => [[iso(a, 9, 10), iso(a, 9, nEsimoDiaSemana(a, 9, 6, 3))]],
    colores: { primary: '#A21CAF', 'primary-dark': '#59125F', 'primary-light': '#E879F9', accent: '#FB923C', gold: '#FBBF24', secondary: '#C026D3' },
    particulas: ['💛', '🤝', '💜', '🎈', '✨'], confeti: ['#E879F9', '#FBBF24', '#FB923C', '#FFFFFF']
  },
  {
    id: 'halloween', nombre: 'Halloween', emoji: '🎃', saludo: '¡Feliz Halloween!', fecha: '15 oct – 1 nov',
    ventanas: a => [[iso(a, 10, 15), iso(a, 11, 1)]],
    colores: { primary: '#B45309', 'primary-dark': '#2E1250', 'primary-light': '#F59E0B', accent: '#7C3AED', gold: '#FBBF24', secondary: '#C2570C' },
    particulas: ['🎃', '🦇', '👻', '🕷️', '🍬'], confeti: ['#F59E0B', '#7C3AED', '#111827', '#FB923C']
  },
  {
    id: 'accion_gracias', nombre: 'Acción de Gracias', emoji: '🦃', saludo: '¡Feliz Acción de Gracias!', fecha: '15 nov – 4.º jueves',
    ventanas: a => [[iso(a, 11, 15), iso(a, 11, nEsimoDiaSemana(a, 11, 4, 4))]],
    colores: { primary: '#C2410C', 'primary-dark': '#5A260B', 'primary-light': '#FB923C', accent: '#B45309', gold: '#EAB308', secondary: '#D9560F' },
    particulas: ['🍂', '🍁', '🦃', '🌽', '🍂'], confeti: ['#FB923C', '#EAB308', '#92400E', '#FEF3C7']
  },
  {
    id: 'navidad', nombre: 'Navidad', emoji: '🎄', saludo: '¡Feliz Navidad!', fecha: '7 – 28 dic',
    ventanas: a => [[iso(a, 12, 7), iso(a, 12, 28)]],
    colores: { primary: '#B91C1C', 'primary-dark': '#0F4423', 'primary-light': '#4ADE80', accent: '#16A34A', gold: '#FBBF24', secondary: '#15803D' },
    particulas: ['❄️', '⭐', '🎄', '🎁', '❄️'], confeti: ['#EF4444', '#22C55E', '#FBBF24', '#FFFFFF']
  }
];

export const fiestaPorId = id => FIESTAS.find(f => f.id === id) || null;

/** ¿La fecha (aaaa-mm-dd) cae dentro del ambiente de alguna festividad? Devuelve la festividad o null. */
export function fiestaDelDia(fecha) {
  const a = Number(fecha.slice(0, 4));
  for (const f of FIESTAS) {
    for (const anio of [a - 1, a, a + 1]) {          // los rangos que cruzan de año (Año Nuevo) se prueban con los años vecinos
      for (const [d, h] of f.ventanas(anio)) if (fecha >= d && fecha <= h) return f;
    }
  }
  return null;
}

const diasEntre = (a, b) => Math.round((Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) - Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10))) / 86_400_000);

/** La próxima festividad (si hoy hay una, es la de hoy): { fiesta, desde, dias } */
export function proximaFiesta(fecha) {
  const a = Number(fecha.slice(0, 4));
  let mejor = null;
  for (const f of FIESTAS) {
    for (const anio of [a - 1, a, a + 1]) {
      for (const [d, h] of f.ventanas(anio)) {
        if (h < fecha) continue;
        const dias = Math.max(0, diasEntre(fecha, d));
        if (!mejor || dias < mejor.dias) mejor = { fiesta: f, desde: d, dias };
      }
    }
  }
  return mejor;
}
