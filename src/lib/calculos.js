export const META_HORA_DEFAULT = 470;
export function horasAMinutos(horas) {
  if (!Number.isFinite(Number(horas))) return null;
  return Math.round(Number(horas) * 60);
}
export function minutosAHoras(minutos) {
  if (!Number.isFinite(Number(minutos))) return 0;
  return Math.round(Number(minutos) / 60 * 100) / 100;
}
export function calcularRendimientoReal(totalTallos, tiempoTrabajadoMin, tiempoNoProductivoMin = 0) {
  const trabajado = Number.isFinite(Number(tiempoTrabajadoMin)) ? Number(tiempoTrabajadoMin) : 0;
  const noProductivo = Number.isFinite(Number(tiempoNoProductivoMin)) ? Number(tiempoNoProductivoMin) : 0;
  const tiempoRealMin = Math.max(0, trabajado - noProductivo);
  const tiempoRealHoras = Math.round(tiempoRealMin / 60 * 100) / 100;
  const rendimiento = tiempoRealHoras > 0 ? Math.round(totalTallos / tiempoRealHoras) : 0;
  return {
    tiempoRealMin,
    tiempoRealHoras,
    rendimiento
  };
}
export function minutosEntreBloque(horaInicio, horaFin) {
  if (!horaInicio || !horaFin) return 0;
  const [h1, m1] = horaInicio.split(':').map(Number);
  const [h2, m2] = horaFin.split(':').map(Number);
  let ini = h1 * 60 + m1;
  let fin = h2 * 60 + m2;
  if (fin <= ini) fin += 24 * 60;
  return fin - ini;
}
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
    if (corte < ini) corte += 24 * 60;
    // solo se descuenta si el bloque realmente cruza la hora de corte (ej. almuerzo a las 12:00)
    if (corte > ini && corte < fin) total += Number(d.minutos) || 0;
  }
  return total;
}
export function calcularRendimientoBloque(totalTallos, horaInicio, horaFin, descansos = []) {
  const minutosBrutos = minutosEntreBloque(horaInicio, horaFin);
  const descuento = minutosDescansoAplicable(horaInicio, horaFin, descansos);
  const minutos = Math.max(0, minutosBrutos - descuento);
  const horas = Math.round(minutos / 60 * 100) / 100;
  const rendimiento = horas > 0 ? Math.round(totalTallos / horas) : 0;
  return {
    minutos,
    horas,
    rendimiento,
    minutosDescontados: descuento
  };
}
export function calcularPorcentajeMeta(rendimiento, metaHora = META_HORA_DEFAULT) {
  return metaHora > 0 ? Math.round(rendimiento / metaHora * 10000) / 100 : 0;
}
export function clasificarEstado(porcentaje) {
  if (porcentaje >= 130) return {
    label: 'Excelente',
    css: 'success',
    mensaje: '¡Rendimiento sobresaliente!'
  };
  if (porcentaje >= 100) return {
    label: 'Cumple',
    css: 'success',
    mensaje: 'Meta alcanzada'
  };
  if (porcentaje >= 90) return {
    label: 'A punto de cumplir',
    css: 'warning',
    mensaje: 'Muy cerca de la meta, un poco más'
  };
  return {
    label: 'Por mejorar',
    css: 'danger',
    mensaje: 'Por debajo de la meta esperada'
  };
}
export function obtenerSemanaISO(fechaStr) {
  if (!fechaStr) return null;
  const d = new Date(fechaStr + 'T00:00:00');
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const diff = (target - firstThursday) / 86400000;
  return 1 + Math.round((diff - (firstThursday.getDay() + 6) % 7) / 7);
}
export function agregarRankingPorPersona(filas) {
  // Une varios bloques de la misma persona en una sola fila (ranking sin
  // duplicados), y guarda todas las mesas donde trabajó ese día en "codigos".
  const mapa = new Map();
  for (const r of filas) {
    const key = r.colaborador_id;
    if (!mapa.has(key)) {
      mapa.set(key, {
        colaborador_id: key,
        colaborador: r.colaborador,
        totalTallos: 0,
        totalRamos: 0,
        sumaRend: 0,
        bloques: 0,
        codigos: new Set()
      });
    }
    const acc = mapa.get(key);
    acc.totalTallos += r.total_tallos || 0;
    acc.totalRamos += r.total_ramos || 0;
    acc.sumaRend += r.rendimiento || 0;
    acc.bloques += 1;
    if (r.codigos) {
      acc.codigosHistorico = r.codigos;
    } else if (r.mesa !== null && r.mesa !== undefined) {
      acc.codigos.add(r.mesa);
    }
  }
  return [...mapa.values()].map(a => ({
    ...a,
    promedioRend: a.bloques > 0 ? Math.round(a.sumaRend / a.bloques) : 0,
    codigo: a.codigosHistorico || (a.codigos.size > 0 ? [...a.codigos].sort((x, y) => x - y).join(', ') : null)
  })).sort((a, b) => b.promedioRend - a.promedioRend);
}
export function agregarTurnoActualPorPersona(filas, descansos = []) {
  const mapa = new Map();
  const bloquesContados = new Set();
  for (const r of filas) {
    const key = r.colaborador_id;
    if (!mapa.has(key)) {
      mapa.set(key, {
        colaborador_id: key,
        colaborador: r.colaborador,
        fecha: r.fecha,
        total_tallos: 0,
        total_ramos: 0,
        tiempo_trabajado_min: 0,
        codigos: new Set()
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
    const {
      tiempoRealHoras,
      rendimiento
    } = calcularRendimientoReal(a.total_tallos, a.tiempo_trabajado_min, 0);
    return {
      colaborador_id: a.colaborador_id,
      colaborador: a.colaborador,
      fecha: a.fecha,
      total_tallos: a.total_tallos,
      total_ramos: a.total_ramos,
      tiempo_trabajado_min: a.tiempo_trabajado_min,
      tiempo_real_horas: tiempoRealHoras,
      rendimiento,
      codigos: [...a.codigos].sort((x, y) => x - y)
    };
  }).sort((a, b) => b.total_tallos - a.total_tallos);
}
