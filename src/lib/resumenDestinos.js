/** DESTINATARIOS DE LOS RESÚMENES — reglas puras: validar el formulario, describir la programación y calcular el próximo envío. */
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const sumar = (iso, n) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const ddmm = iso => `${Number(iso.slice(8, 10))}/${Number(iso.slice(5, 7))}`;

/** Deja solo dígitos (y un + inicial opcional). Acepta espacios, guiones y paréntesis. */
export const limpiarNumero = n => { const t = String(n || '').trim(); const d = t.replace(/\D/g, ''); return (t.startsWith('+') ? '+' : '') + d; };
export const numeroValido = n => /^\+?[0-9]{8,15}$/.test(limpiarNumero(n));
/** Cómo se ve el número: +57 300 123 4567 */
export function numeroBonito(n) { const d = limpiarNumero(n).replace('+', ''); const c = /^57(3\d{9})$/.exec(d) || /^(3\d{9})$/.exec(d); return c ? `+57 ${c[1].slice(0, 3)} ${c[1].slice(3, 6)} ${c[1].slice(6)}` : limpiarNumero(n); }

/** Valida el formulario. Devuelve { ok, errores:{campo:texto}, datos } con los datos ya limpios. */
export function validarDestino(f) {
  const errores = {}, nombre = String(f.nombre || '').trim().replace(/\s+/g, ' ');
  if (nombre.length < 2) errores.nombre = 'Escribe el nombre (mínimo 2 letras).'; else if (nombre.length > 60) errores.nombre = 'El nombre es muy largo (máximo 60).';
  if (!numeroValido(f.numero)) errores.numero = 'El número debe tener entre 8 y 15 dígitos (ej. 300 123 4567 o +57 300 123 4567).';
  if (!['general', 'formadora'].includes(f.tipo)) errores.tipo = 'Elige qué resumen recibe.';
  if (f.tipo === 'formadora' && !f.formadoraId) errores.formadoraId = 'Elige la formadora cuyo equipo resume.';
  if (!f.semanal && !f.mensual) errores.frecuencia = 'Elige al menos una frecuencia: semanal o mensual.';
  return { ok: Object.keys(errores).length === 0, errores, datos: { nombre, numero: limpiarNumero(f.numero), tipo: f.tipo, formadora_id: f.tipo === 'formadora' ? Number(f.formadoraId) : null, semanal: !!f.semanal, mensual: !!f.mensual } };
}
export const describirProgramacion = d => [d.semanal && 'cada lunes a las 9:00 a. m.', d.mensual && 'el día 1 de cada mes a las 9:00 a. m.'].filter(Boolean).join(' y ') || 'sin programación';
export const describirResumen = (d, nombreFormadora) => (d.tipo === 'formadora' ? `Equipo de ${nombreFormadora || 'la formadora'}` : 'Resumen general de la finca');

/** El próximo envío automático de un destinatario desde hoy (hoy mismo cuenta si es antes de las 9 a. m. y no pasó): { fecha, frecuencia, texto } o null. */
export function proximoEnvio(d, hoy, hora = 0) {
  if (!d.activo || (!d.semanal && !d.mensual)) return null;
  const cand = [];
  for (let i = 0; i <= 62 && cand.length < 2; i++) {
    const f = sumar(hoy, i); if (i === 0 && hora >= 9) continue;
    const dow = new Date(`${f}T12:00:00Z`).getUTCDay();
    if (d.semanal && dow === 1 && !cand.some(c => c.frecuencia === 'semanal')) cand.push({ fecha: f, frecuencia: 'semanal' });
    if (d.mensual && f.slice(8) === '01' && !cand.some(c => c.frecuencia === 'mensual')) cand.push({ fecha: f, frecuencia: 'mensual' });
  }
  cand.sort((a, b) => (a.fecha < b.fecha ? -1 : 1)); const p = cand[0];
  return p ? { ...p, texto: `${DIAS[new Date(`${p.fecha}T12:00:00Z`).getUTCDay()]} ${ddmm(p.fecha)} (${p.frecuencia})` } : null;
}
export const ESTADOS_ENVIO = { aviso: { texto: 'Programado', icono: 'fa-clock', tono: 'info' }, enviado: { texto: 'Enviado', icono: 'fa-circle-check', tono: 'bien' }, cancelado: { texto: 'Cancelado', icono: 'fa-ban', tono: 'gris' }, error: { texto: 'Con error', icono: 'fa-circle-exclamation', tono: 'atencion' } };
