/** Suma de los registros de rendimiento por persona y día — sin la librería de Excel (el arranque de la app no debe cargarla). */
import { minutosEntreBloque, minutosDescansoAplicable } from './calculos';

export function agregarPorPersonaDia(registros, descansos = [], descansosPorFecha = null) {
  const mapa = new Map();
  const bloquesContados = new Set();
  for (const r of registros) {
    const key = `${r.fecha}_${r.colaborador_id}`;
    if (!mapa.has(key)) {
      mapa.set(key, {
        fecha: r.fecha,
        colaborador_id: r.colaborador_id,
        colaborador: r.colaborador,
        total_tallos: 0,
        total_ramos: 0,
        tiempo_trabajado_min: 0,
        semana: r.semana ?? null,
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
      // Si ese día en concreto tiene un descuento propio configurado, se usa
      // ese en vez del general (permite cambiar el almuerzo solo un día).
      const descansosDelDia = descansosPorFecha?.has(r.fecha)
        ? (descansosPorFecha.get(r.fecha).activos ? descansosPorFecha.get(r.fecha).descansos : [])
        : descansos;
      const descuento = minutosDescansoAplicable(r.hora_inicio, r.hora_fin, descansosDelDia);
      acc.tiempo_trabajado_min += Math.max(0, minutosBrutos - descuento);
    }
  }
  return [...mapa.values()].map(a => ({
    ...a,
    codigos: a.codigos.size > 0 ? [...a.codigos].sort((x, y) => x - y).join(', ') : null
  }));
}
