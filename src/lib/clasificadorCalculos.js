/**
 * CLASIFICADOR ↔ BONCHADOR — reglas puras (sin base de datos ni pantalla).
 * Cada día a un clasificador se le asigna un bonchador. Ese día el clasificador TOMA del bonchador: la asistencia (cuenta como si
 * hubiera venido), el rendimiento y las devoluciones. Si cambia de bonchador, cada día guarda lo del bonchador de ESE día.
 *   pares: [{ fecha, bonchador_id }]  (los de UN clasificador)
 */
export const mapaPares = pares => new Map(pares.map(p => [p.fecha, p.bonchador_id]));

/** Del histórico de los bonchadores, SOLO la fila del bonchador que tenía asignado cada día, a nombre del clasificador. */
export function filasEfectivas(pares, filasBonchadores, clasificadorId) {
  const m = mapaPares(pares);
  return filasBonchadores.filter(f => m.get(f.fecha) === f.colaborador_id).map(f => ({ ...f, colaborador_id: clasificadorId, via: f.colaborador_id }));
}

/** Devoluciones por día del bonchador asignado ese día. devFilas: [{ fecha, id, total, razones }]; bonchadorADev: Map(bonchador_id → id en devoluciones). */
export function devEfectiva(pares, devFilas, bonchadorADev) {
  const m = mapaPares(pares), out = new Map();
  for (const r of devFilas) {
    const b = m.get(r.fecha); if (b === undefined) continue;
    if (bonchadorADev.get(b) === r.id) out.set(r.fecha, { total: r.total, razones: r.razones });
  }
  return out;
}

/** Los días con asignación (para marcar asistencia) y un resumen: cuántos días y con qué bonchadores. */
export function resumenPares(pares, nombrePorId = new Map()) {
  const por = new Map();
  for (const p of pares) por.set(p.bonchador_id, (por.get(p.bonchador_id) || 0) + 1);
  const bonchadores = [...por].map(([id, dias]) => ({ id, nombre: nombrePorId.get(id) || `ID ${id}`, dias })).sort((a, b) => b.dias - a.dias || a.nombre.localeCompare(b.nombre));
  const fechas = pares.map(p => p.fecha).sort(); let cambios = 0;
  for (let i = 1; i < fechas.length; i++) { const a = pares.find(p => p.fecha === fechas[i - 1]).bonchador_id, b = pares.find(p => p.fecha === fechas[i]).bonchador_id; if (a !== b) cambios++; }
  return { dias: pares.length, bonchadores, cambios };
}
