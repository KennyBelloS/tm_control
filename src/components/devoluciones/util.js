export const fmt = n => (n ?? 0).toLocaleString('es-CO');
export const dec = (n, d = 2) => (n == null ? '—' : n.toFixed(d).replace('.', ','));
export const fFecha = iso => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '—');
export const fCorta = iso => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '—');
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const nombreMes = iso => `${MESES[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
export const mesCorto = iso => `${MESES[Number(iso.slice(5, 7)) - 1].slice(0, 3)}-${iso.slice(2, 4)}`;
export const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
