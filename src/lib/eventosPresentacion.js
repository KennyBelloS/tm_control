/**
 * EVENTOS DE LA PRESENTACIÓN — parte PURA: compara lo que se veía hace un momento con lo que se ve ahora y dice qué merece un aviso grande
 * sobre la pantalla: una línea que supera a otra (o toma el liderazgo), el rendimiento o el cumplimiento que suben o bajan de golpe.
 *   snapshot = { cumplimiento: % | null, rend: tallos/hora | null, lineas: [{ id, nombre, tallos }] }
 */
export const UMBRALES = { rendPct: 5, rendAbs: 20, cumplPuntos: 8, minTallosLinea: 300 };

const ordenar = ls => [...(ls || [])].filter(l => l && l.tallos > 0).sort((a, b) => b.tallos - a.tallos);

export function detectarEventosPresentacion(prev, act, u = UMBRALES) {
  if (!prev || !act) return [];
  const out = [];
  // 1) Líneas: quién es el líder y quién pasó a quién (solo entre líneas con producción real)
  const a = ordenar(prev.lineas), b = ordenar(act.lineas);
  if (a.length >= 2 && b.length >= 2 && b[0].tallos >= u.minTallosLinea) {
    if (a[0].id !== b[0].id) out.push({ tipo: 'lider', clave: `lider-${b[0].id}`, titulo: `${b[0].nombre} toma el liderazgo`, detalle: `Pasó a ${a[0].nombre} y ahora va primera con ${Math.round(b[0].tallos).toLocaleString('es-CO')} tallos.`, icono: '👑', tono: 'oro' });
    const posA = new Map(a.map((l, i) => [l.id, i])), nuevo = [];
    for (let i = 1; i < b.length; i++) { const l = b[i - 1], debajo = b[i]; if (posA.has(l.id) && posA.has(debajo.id) && posA.get(l.id) > posA.get(debajo.id) && !(i === 1 && a[0].id !== b[0].id)) nuevo.push({ tipo: 'supera', clave: `supera-${l.id}-${debajo.id}`, titulo: `${l.nombre} superó a ${debajo.nombre}`, detalle: `Ahora va ${i}.ª con ${Math.round(l.tallos).toLocaleString('es-CO')} tallos.`, icono: '🚀', tono: 'oro' }); }
    out.push(...nuevo.slice(0, 2));
  }
  // 2) El rendimiento de la finca sube o baja de golpe
  const diaEmpezando = act.cumplimiento != null && act.cumplimiento < 10;            // a primera hora el promedio salta por poco: no se anuncia
  if (!diaEmpezando && prev.rend > 0 && act.rend > 0) {
    const d = act.rend - prev.rend, pct = (d / prev.rend) * 100;
    if (d >= u.rendAbs && pct >= u.rendPct) out.push({ tipo: 'sube', clave: 'rend-sube', titulo: 'El rendimiento está subiendo', detalle: `+${Math.round(pct)} % (de ${Math.round(prev.rend)} a ${Math.round(act.rend)} tallos por hora).`, icono: '📈', tono: 'verde' });
    else if (d <= -u.rendAbs && pct <= -u.rendPct) out.push({ tipo: 'baja', clave: 'rend-baja', titulo: 'El rendimiento está bajando', detalle: `${Math.round(pct)} % (de ${Math.round(prev.rend)} a ${Math.round(act.rend)} tallos por hora).`, icono: '📉', tono: 'rojo' });
  }
  // 3) El cumplimiento de la meta del día salta
  if (prev.cumplimiento != null && act.cumplimiento != null) {
    const d = act.cumplimiento - prev.cumplimiento;
    if (d >= u.cumplPuntos) out.push({ tipo: 'cumpl-sube', clave: 'cumpl-sube', titulo: 'La meta del día avanza rápido', detalle: `+${Math.round(d)} puntos: ya va en ${Math.round(act.cumplimiento)} % de la meta.`, icono: '🎯', tono: 'verde' });
  }
  return out;
}
/** Evita repetir el mismo evento seguido: devuelve solo los que no se mostraron en los últimos `ventanaMs` (mapa clave → instante). */
export function sinRepetidos(eventos, vistos, ahora, ventanaMs = 5 * 60 * 1000) {
  return eventos.filter(e => { const t = vistos.get(e.clave); if (t != null && ahora - t < ventanaMs) return false; vistos.set(e.clave, ahora); return true; });
}
