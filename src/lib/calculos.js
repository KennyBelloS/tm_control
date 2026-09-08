// calculos.js
// -----------------------------------------------------------------------
// Fórmulas verificadas fila por fila contra el archivo maestro
// (B_D_RENDIMIENT_-TM-POS-02.xlsb, hoja "Rendimiento"):
//
//   Tiempo Real Laborado (horas) = (Tiempo a Trabajar − Tiempo No Productivo) / 60
//   Rendimiento                  = Total Tallos / Tiempo Real Laborado (horas)
//
// Todo lo demás (bloque por hora, % de meta, etc.) se deriva de esto.
// -----------------------------------------------------------------------

export const META_HORA_DEFAULT = 470;

/** Convierte horas trabajadas (ej. 8, o 7.5) a minutos. */
export function horasAMinutos(horas) {
  if (!Number.isFinite(Number(horas))) return null;
  return Math.round(Number(horas) * 60);
}

export function minutosAHoras(minutos) {
  if (!Number.isFinite(Number(minutos))) return 0;
  return Math.round((Number(minutos) / 60) * 100) / 100;
}

/**
 * Fórmula real del archivo maestro: resta el tiempo no productivo al
 * tiempo trabajado, y con eso calcula el rendimiento (tallos/hora).
 * El rendimiento se redondea a número entero (no tiene sentido mostrar
 * decimales en tallos/hora).
 */
export function calcularRendimientoReal(totalTallos, tiempoTrabajadoMin, tiempoNoProductivoMin = 0) {
  const trabajado = Number.isFinite(Number(tiempoTrabajadoMin)) ? Number(tiempoTrabajadoMin) : 0;
  const noProductivo = Number.isFinite(Number(tiempoNoProductivoMin)) ? Number(tiempoNoProductivoMin) : 0;
  const tiempoRealMin = Math.max(0, trabajado - noProductivo);
  const tiempoRealHoras = Math.round((tiempoRealMin / 60) * 100) / 100;
  const rendimiento = tiempoRealHoras > 0 ? Math.round(totalTallos / tiempoRealHoras) : 0;
  return { tiempoRealMin, tiempoRealHoras, rendimiento };
}

/** Minutos entre dos horas "HH:MM" (soporta bloques que cruzan medianoche). */
export function minutosEntreBloque(horaInicio, horaFin) {
  if (!horaInicio || !horaFin) return 0;
  const [h1, m1] = horaInicio.split(':').map(Number);
  const [h2, m2] = horaFin.split(':').map(Number);
  let ini = h1 * 60 + m1;
  let fin = h2 * 60 + m2;
  if (fin <= ini) fin += 24 * 60;
  return fin - ini;
}

/**
 * Calcula cuántos minutos de descanso (almuerzo, etc.) hay que descontar
 * de un bloque de horas. Un descanso solo se descuenta si su "hora de
 * corte" cae DENTRO del bloque trabajado (por ejemplo, si el descanso es
 * a las 12:00 y el bloque va de 06:00 a 13:00, sí se descuenta; si el
 * bloque termina a las 11:00, no se descuenta porque no llegó a esa hora).
 * `descansos` es un arreglo de hasta 3: [{ horaCorte:'12:00', minutos:30 }, ...]
 */
export function minutosDescansoAplicable(horaInicio, horaFin, descansos = []) {
  if (!horaInicio || !horaFin || !Array.isArray(descansos) || descansos.length === 0) return 0;
  const [h1, m1] = horaInicio.split(':').map(Number);
  const [h2, m2] = horaFin.split(':').map(Number);
  let ini = h1 * 60 + m1;
  let fin = h2 * 60 + m2;
  if (fin <= ini) fin += 24 * 60;

  let total = 0;
  for (const d of descansos) {
    if (!d?.horaCorte || !d?.minutos) continue;
    const [hc, mc] = d.horaCorte.split(':').map(Number);
    let corte = hc * 60 + mc;
    if (corte < ini) corte += 24 * 60; // el corte puede caer "al día siguiente" si el bloque cruza medianoche
    if (corte > ini && corte < fin) total += Number(d.minutos) || 0;
  }
  return total;
}

/**
 * Rendimiento del Turno Actual (hora a hora): tallos ÷ horas del bloque,
 * ya descontando los descansos configurados que caigan dentro del bloque.
 * Ej: bloque 06:00–13:00 con almuerzo de 30 min a las 12:00 → 6.5 horas.
 */
export function calcularRendimientoBloque(totalTallos, horaInicio, horaFin, descansos = []) {
  const minutosBrutos = minutosEntreBloque(horaInicio, horaFin);
  const descuento = minutosDescansoAplicable(horaInicio, horaFin, descansos);
  const minutos = Math.max(0, minutosBrutos - descuento);
  const horas = Math.round((minutos / 60) * 100) / 100;
  const rendimiento = horas > 0 ? Math.round(totalTallos / horas) : 0;
  return { minutos, horas, rendimiento, minutosDescontados: descuento };
}

/**
 * % de cumplimiento frente a la meta por hora, usando el rendimiento real
 * (no un supuesto de horas por el bloque del Excel).
 */
export function calcularPorcentajeMeta(rendimiento, metaHora = META_HORA_DEFAULT) {
  return metaHora > 0 ? Math.round((rendimiento / metaHora) * 10000) / 100 : 0;
}

/**
 * Clasifica el % de cumplimiento frente a la meta.
 * - 100% o más SIEMPRE dice "Cumple" (verde) — llegar a la meta es cumplir, punto.
 * - 90%-99.9%: "A punto de cumplir" (amarillo) con un texto alusivo, porque
 *   está cerca pero todavía no alcanza la meta.
 * - Menos de 90%: "Bajo" (rojo).
 * - 130% o más: "Excelente" (verde intenso), como reconocimiento extra —
 *   sigue siendo "cumple", solo con mejor etiqueta.
 */
export function clasificarEstado(porcentaje) {
  if (porcentaje >= 130) return { label: 'Excelente', css: 'success', mensaje: '¡Rendimiento sobresaliente!' };
  if (porcentaje >= 100) return { label: 'Cumple', css: 'success', mensaje: 'Meta alcanzada' };
  if (porcentaje >= 90) return { label: 'A punto de cumplir', css: 'warning', mensaje: 'Muy cerca de la meta, un poco más' };
  return { label: 'Bajo', css: 'danger', mensaje: 'Por debajo de la meta esperada' };
}

export function obtenerSemanaISO(fechaStr) {
  if (!fechaStr) return null;
  const d = new Date(fechaStr + 'T00:00:00');
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const diff = (target - firstThursday) / 86400000;
  return 1 + Math.round((diff - ((firstThursday.getDay() + 6) % 7)) / 7);
}

/**
 * Agrupa filas (del Histórico o del Turno Actual) en un ranking por
 * persona: suma tallos/ramos y promedia el rendimiento, sin repetir a
 * nadie aunque tenga varios bloques ese día. Queda listo para ordenar de
 * mayor a menor rendimiento.
 */
export function agregarRankingPorPersona(filas) {
  const mapa = new Map();
  for (const r of filas) {
    const key = r.colaborador_id;
    if (!mapa.has(key)) {
      mapa.set(key, { colaborador_id: key, colaborador: r.colaborador, totalTallos: 0, totalRamos: 0, sumaRend: 0, bloques: 0 });
    }
    const acc = mapa.get(key);
    acc.totalTallos += r.total_tallos || 0;
    acc.totalRamos += r.total_ramos || 0;
    acc.sumaRend += r.rendimiento || 0;
    acc.bloques += 1;
  }
  return [...mapa.values()]
    .map(a => ({ ...a, promedioRend: a.bloques > 0 ? Math.round(a.sumaRend / a.bloques) : 0 }))
    .sort((a, b) => b.promedioRend - a.promedioRend);
}

/**
 * Agrupa las filas del Turno Actual (por bloque de hora) en UN total por
 * persona: suma los tallos de todos sus bloques y calcula el rendimiento
 * real sobre el tiempo total trabajado (no un promedio de bloques sueltos).
 * También junta los distintos Códigos (mesa) que haya usado ese día.
 */
export function agregarTurnoActualPorPersona(filas, descansos = []) {
  const mapa = new Map();
  const bloquesContados = new Set();
  for (const r of filas) {
    const key = r.colaborador_id;
    if (!mapa.has(key)) {
      mapa.set(key, {
        colaborador_id: key, colaborador: r.colaborador, fecha: r.fecha,
        total_tallos: 0, total_ramos: 0, tiempo_trabajado_min: 0, codigos: new Set(),
      });
    }
    const acc = mapa.get(key);
    acc.total_tallos += r.total_tallos || 0;
    acc.total_ramos += r.total_ramos || 0;
    if (r.mesa !== null && r.mesa !== undefined) acc.codigos.add(r.mesa);

    const bloqueKey = `${key}_${r.hora_inicio}_${r.hora_fin}`;
    if (!bloquesContados.has(bloqueKey)) {
      bloquesContados.add(bloqueKey);
      const minutosBrutos = minutosEntreBloque(r.hora_inicio, r.hora_fin);
      const descuento = minutosDescansoAplicable(r.hora_inicio, r.hora_fin, descansos);
      acc.tiempo_trabajado_min += Math.max(0, minutosBrutos - descuento);
    }
  }
  return [...mapa.values()].map(a => {
    const { tiempoRealHoras, rendimiento } = calcularRendimientoReal(a.total_tallos, a.tiempo_trabajado_min, 0);
    return {
      colaborador_id: a.colaborador_id, colaborador: a.colaborador, fecha: a.fecha,
      total_tallos: a.total_tallos, total_ramos: a.total_ramos,
      tiempo_trabajado_min: a.tiempo_trabajado_min, tiempo_real_horas: tiempoRealHoras,
      rendimiento, codigos: [...a.codigos].sort((x, y) => x - y),
    };
  }).sort((a, b) => b.total_tallos - a.total_tallos);
}
