/**
 * RESUMEN EJECUTIVO — parte PURA: arma el "correo ejecutivo" a partir de los cálculos del período (finca, un proceso o una persona):
 * un panorama redactado con los números reales, indicadores con tendencia, equipos ordenados, conclusiones y la firma.
 * No consulta nada ni dibuja: devuelve datos que la pantalla y la descarga usan por igual.
 *
 * Reglas de las cifras (decididas con Kenny):
 *   · CUMPLIMIENTO GENERAL = rendimiento promedio real ÷ meta por hora (no tallos totales vs meta diaria: no depende de cuánta gente trabajó).
 *   · CALIDAD = % de tallos SIN devolución, sobre lo CLASIFICADO (lo que sale a despacho); si no hay clasificación, sobre lo bonchado.
 *   · DESTACADOS: solo cifras confiables (3+ días, 12+ horas y sin valores atípicos).
 */
const fmt = n => Math.round(n).toLocaleString('es-CO');
const fmt1 = n => (Math.round(n * 10) / 10).toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmt2 = n => n.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ddmm = iso => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const unir = l => (l.length <= 1 ? l.join('') : `${l.slice(0, -1).join(', ')} y ${l.at(-1)}`);
export const corto = n => { const t = String(n || '').replace(/\{\}/g, ' ').trim().split(/\s+/).filter(Boolean); return t.length < 2 ? (t[0] || '—') : `${t[0]} ${(t.length >= 4 ? t[2] : t[1])[0]}.`; };

export const FIRMA_DEFECTO = { nombre: 'Equipo Torremolinos', cargo: 'TMControl', empresa: 'Falcon Farms', finca: 'Finca Torremolinos', ubicacion: 'Finca Torremolinos, Suesca – Colombia', telefono: '', correo: '' };
/** La firma que se escribe a mano: se limpia y se limita (nada de HTML, largos razonables, correo y teléfono con forma válida). */
export function normalizarFirma(f = {}) {
  const t = (v, d, max = 80) => { const s = String(v ?? '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max); return s || d; };
  const correo = String(f.correo ?? '').trim().slice(0, 80), tel = String(f.telefono ?? '').replace(/[^\d+()\-\s.]/g, '').trim().slice(0, 30);
  return { nombre: t(f.nombre, FIRMA_DEFECTO.nombre), cargo: t(f.cargo, FIRMA_DEFECTO.cargo), empresa: FIRMA_DEFECTO.empresa, finca: FIRMA_DEFECTO.finca, ubicacion: t(f.ubicacion, FIRMA_DEFECTO.ubicacion, 100), telefono: tel, correo: /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(correo) ? correo : '' };
}

export const periodoFrase = p => (p.tipo === 'mensual' ? `el mes de ${p.etiqueta}` : p.tipo === 'semanal' ? `la ${p.etiqueta}` : `el período ${p.etiqueta}`);
const cambio = v => (v === null || v === undefined ? '' : Math.abs(v) < 0.5 ? ', igual que el período anterior' : `, un ${Math.abs(Math.round(v))} % ${v > 0 ? 'más' : 'menos'} que el período anterior`);
/** Una variación en porcentaje → { txt, clase } ("bien" si fue en la dirección que conviene). */
export function tendencia(v, buenoSiSube = true) {
  if (v === null || v === undefined) return null;
  if (Math.abs(v) < 0.5) return { txt: '= igual', clase: 'igual' };
  return { txt: `${v > 0 ? '▲' : '▼'} ${Math.abs(Math.round(v))} %`, clase: (v > 0) === buenoSiSube ? 'bien' : 'mal' };
}
/** Una diferencia en puntos (p. ej. de cumplimiento o de calidad). */
export function puntos(v, buenoSiSube = true) {
  if (v === null || v === undefined || Number.isNaN(v)) return null;
  if (Math.abs(v) < 0.05) return { txt: '= igual', clase: 'igual' };
  return { txt: `${v > 0 ? '▲' : '▼'} ${Math.abs(v) < 10 ? fmt1(Math.abs(v)) : fmt(Math.abs(v))} pts`, clase: (v > 0) === buenoSiSube ? 'bien' : 'mal' };
}

/** La CALIDAD: % de tallos sin devolución, sobre lo clasificado (o, si no hay clasificación, sobre lo bonchado). */
export function calidadDe(r) {
  const clas = r.clasificacion?.tallos > 0, base = clas ? r.clasificacion.tallos : r.tallos, de = clas ? 'clasificados' : 'bonchados';
  if (!r.devoluciones?.hayDatos || !(base > 0)) return { pct: null, porMil: null, base: de, tallosBase: base };
  return { pct: (1 - r.devoluciones.total / base) * 100, porMil: (r.devoluciones.total / base) * 1000, base: de, tallosBase: base };
}

/** Los equipos con producción, del mejor al menor rendimiento. equipos: [{ id, nombre, r, c }]. */
export function ordenarEquipos(equipos = []) {
  const con = equipos.filter(e => e.r?.diasTrabajados > 0 && e.r.tallos > 0).sort((a, b) => b.r.rend - a.r.rend || b.r.tallos - a.r.tallos);
  const mejor = con[0]?.r.rend || 0;
  return con.map((e, i) => ({ id: e.id, nombre: e.nombre, puesto: i + 1, tallos: e.r.tallos, rend: e.r.rend, personas: e.r.personasPorDia, cumplenMetaPct: e.r.cumplenMetaPct, cumpl: e.r.cumplimientoGeneral ?? null, d: tendencia(e.c?.rend), porDia: e.r.porDia, pctDelMejor: mejor > 0 ? (e.r.rend / mejor) * 100 : 0, devoluciones: e.r.devoluciones.hayDatos ? e.r.devoluciones.total : null }));
}

const esProceso = (a, p) => a?.tipo === 'proceso' && (!p || a.proceso === p);
/** El TITULAR: una frase corta con el tono (bien / info / atencion) y un ícono. */
export function titularEjecutivo(r, c, alcance = { tipo: 'finca' }) {
  if (!r.diasTrabajados) return { tono: 'info', icono: 'fa-circle-info', texto: 'Sin registros en este período', detalle: 'Cuando se carguen los reportes, aquí aparecerá el resumen.' };
  const g = r.cumplimientoGeneral;
  if (g !== null && g !== undefined && !esProceso(alcance) || (g !== null && g !== undefined && esProceso(alcance, 'boncheo'))) {
    const p = Math.round(g), falta = Math.max(0, r.metaHora - r.rend);
    if (g >= 100) return { tono: 'bien', icono: 'fa-trophy', texto: `Se cumplió la meta: ${p} %`, detalle: `Rendimiento de ${fmt(r.rend)} tallos por hora frente a la meta de ${fmt(r.metaHora)}.` };
    if (g >= 90) return { tono: 'info', icono: 'fa-bullseye', texto: `Muy cerca de la meta: ${p} %`, detalle: `Faltaron ${fmt(falta)} tallos por hora para llegar a ${fmt(r.metaHora)}.` };
    return { tono: 'atencion', icono: 'fa-triangle-exclamation', texto: `Por debajo de la meta: ${p} %`, detalle: `Faltaron ${fmt(falta)} tallos por hora (meta ${fmt(r.metaHora)}); conviene reforzar.` };
  }
  if (esProceso(alcance, 'calidad')) {
    const q = calidadDe(r);
    if (q.pct === null) return { tono: 'info', icono: 'fa-circle-info', texto: 'Devoluciones sin cargar', detalle: 'Cuando se carguen, aquí aparecerá la calidad del período.' };
    if (c.devoluciones !== null && c.devoluciones <= -5) return { tono: 'bien', icono: 'fa-thumbs-up', texto: `Menos devoluciones: calidad de ${fmt2(q.pct)} %`, detalle: `${Math.abs(Math.round(c.devoluciones))} % menos devoluciones que el período anterior.` };
    if (c.devoluciones !== null && c.devoluciones >= 10) return { tono: 'atencion', icono: 'fa-triangle-exclamation', texto: `Más devoluciones: calidad de ${fmt2(q.pct)} %`, detalle: `${Math.round(c.devoluciones)} % más devoluciones que el período anterior.` };
    return { tono: 'info', icono: 'fa-equals', texto: `Calidad estable: ${fmt2(q.pct)} %`, detalle: `${fmt(r.devoluciones.total)} devoluciones en el período.` };
  }
  if (c.rend !== null && c.rend >= 3) return { tono: 'bien', icono: 'fa-arrow-trend-up', texto: 'Mejor ritmo que el período anterior', detalle: `${fmt(r.rend)} tallos por hora, ${Math.round(c.rend)} % más.` };
  if (c.rend !== null && c.rend <= -3) return { tono: 'atencion', icono: 'fa-arrow-trend-down', texto: 'El ritmo bajó frente al período anterior', detalle: `${fmt(r.rend)} tallos por hora, ${Math.abs(Math.round(c.rend))} % menos.` };
  return { tono: 'info', icono: 'fa-equals', texto: 'Ritmo estable', detalle: `${fmt(r.rend)} tallos por hora, parecido al período anterior.` };
}

/** Los indicadores clave (con tendencia contra el período anterior), según el alcance. */
export function indicadores({ r, c, previo, alcance = { tipo: 'finca' } }) {
  const cal = calidadDe(r), calP = previo ? calidadDe(previo) : { pct: null }, dCal = cal.pct !== null && calP.pct !== null ? puntos(cal.pct - calP.pct) : null;
  const dCump = r.cumplimientoGeneral != null && previo?.cumplimientoGeneral != null ? puntos(r.cumplimientoGeneral - previo.cumplimientoGeneral) : null;
  const dev = { id: 'devol', icono: 'fa-rotate-left', etq: 'Devoluciones', valor: r.devoluciones.hayDatos ? fmt(r.devoluciones.total) : '—', sub: r.devoluciones.hayDatos ? (r.devoluciones.diaMas ? `más: ${ddmm(r.devoluciones.diaMas[0])}` : 'en el período') : 'sin cargar', d: tendencia(c.devoluciones, false) };
  const calidad = { id: 'calidad', icono: 'fa-circle-check', etq: 'Calidad', valor: cal.pct === null ? '—' : `${fmt2(cal.pct)} %`, sub: cal.pct === null ? 'sin devoluciones cargadas' : `de los tallos ${cal.base}, sin devolución`, d: dCal };
  if (esProceso(alcance, 'clasificacion')) return [
    { id: 'tallos', icono: 'fa-boxes-stacked', etq: 'Clasificados', valor: fmt(r.tallos), sub: `${r.diasTrabajados} día${r.diasTrabajados === 1 ? '' : 's'} con registro`, d: tendencia(c.tallos) },
    { id: 'rend', icono: 'fa-gauge-high', etq: 'Por hora', valor: fmt(r.rend), sub: 'tallos clasificados por hora', d: tendencia(c.rend) },
    { id: 'lineas', icono: 'fa-diagram-project', etq: 'Líneas activas', valor: fmt(r.clasificacion?.lineas.length || 0), sub: 'con producción', d: null },
    { id: 'mejor', icono: 'fa-medal', etq: 'Línea líder', valor: r.clasificacion?.lineas[0]?.nombre || '—', sub: r.clasificacion?.lineas[0] ? `${fmt(r.clasificacion.lineas[0].tallos)} tallos` : '', d: null },
    { id: 'dias', icono: 'fa-calendar-check', etq: 'Mejor día', valor: r.mejor ? ddmm(r.mejor.fecha) : '—', sub: r.mejor ? `${fmt(r.mejor.tallos)} tallos` : '', d: null },
    { id: 'horas', icono: 'fa-clock', etq: 'Horas con registro', valor: fmt(r.horas || 0), sub: 'franjas de clasificación', d: null }];
  if (esProceso(alcance, 'calidad')) return [
    dev, calidad,
    { id: 'pormil', icono: 'fa-scale-balanced', etq: 'Por 1.000 tallos', valor: cal.porMil === null ? '—' : fmt2(cal.porMil), sub: `sobre tallos ${cal.base}`, d: tendencia(c.porMil, false) },
    { id: 'causa', icono: 'fa-magnifying-glass', etq: 'Causa principal', valor: r.devoluciones.causas[0]?.nombre || '—', sub: r.devoluciones.causas[0] ? `${Math.round(r.devoluciones.causas[0].pct * 100)} % de las devoluciones` : '', d: null },
    { id: 'dia', icono: 'fa-calendar-day', etq: 'Día con más', valor: r.devoluciones.diaMas ? ddmm(r.devoluciones.diaMas[0]) : '—', sub: r.devoluciones.diaMas ? `${fmt(r.devoluciones.diaMas[1])} devoluciones` : '', d: null },
    { id: 'datos', icono: 'fa-database', etq: 'Días con datos', valor: `${r.cobertura?.devoluciones ?? 0}/${r.cobertura?.laborables ?? 0}`, sub: 'días laborables con devoluciones', d: null }];
  const persona = alcance.tipo === 'persona', boncheo = esProceso(alcance, 'boncheo');
  const cump = { id: 'cumpl', icono: 'fa-bullseye', etq: 'Cumplimiento general', valor: r.cumplimientoGeneral == null ? '—' : `${Math.round(r.cumplimientoGeneral)} %`, sub: r.metaHora ? `${fmt(r.tallos)} tallos en ${fmt(r.horas)} h reales ÷ meta ${fmt(r.metaHora)} t/h` : 'sin meta configurada', aro: r.cumplimientoGeneral ?? null, d: dCump };
  const turnos = { id: 'turnos', icono: 'fa-circle-check', etq: persona ? 'Días con meta' : 'Turnos con meta', valor: r.cumplenMetaPct == null ? '—' : `${Math.round(r.cumplenMetaPct)} %`, sub: persona ? 'de sus días alcanzó la meta por hora' : 'de los turnos alcanzó la meta por hora', aro: r.cumplenMetaPct ?? null, d: null };
  const base = [{ id: 'tallos', icono: 'fa-seedling', etq: 'Tallos', valor: fmt(r.tallos), sub: `${r.diasTrabajados} día${r.diasTrabajados === 1 ? '' : 's'} de trabajo`, d: tendencia(c.tallos) }, { id: 'rend', icono: 'fa-gauge-high', etq: 'Rendimiento', valor: fmt(r.rend), sub: 'tallos por hora real', d: tendencia(c.rend) }, cump, turnos];
  if (boncheo) return [...base, { id: 'pers', icono: 'fa-users', etq: 'Personas por día', valor: fmt1(r.personasPorDia), sub: 'promedio con registro', d: null }, { id: 'horas', icono: 'fa-clock', etq: 'Horas trabajadas', valor: fmt(r.horas || 0), sub: 'horas reales del período', d: null }];
  return [...base, calidad, dev];
}

/** El panorama redactado, párrafo por tema, con los números reales del período. */
export function narrativa({ r, c, equipos = [], alcance = { tipo: 'finca' } }) {
  if (!r.diasTrabajados) return [{ id: 'sin', icono: 'fa-circle-info', titulo: 'Sin registros', texto: 'Todavía no hay registros en este período. Cuando se carguen los reportes, este resumen se completa solo.' }];
  const out = [], quien = alcance.tipo === 'persona' ? alcance.nombre : 'la finca', per = periodoFrase(r.periodo), cal = calidadDe(r);
  const met = r.metaHora ? ` (meta de ${fmt(r.metaHora)} tallos por hora)` : '';
  if (esProceso(alcance, 'clasificacion')) {
    const l = r.clasificacion?.lineas || [];
    out.push({ id: 'produccion', icono: 'fa-boxes-stacked', titulo: 'Clasificación', texto: `Durante ${per} se clasificaron ${fmt(r.tallos)} tallos en ${r.diasTrabajados} día${r.diasTrabajados === 1 ? '' : 's'} con registro, a ${fmt(r.rend)} tallos por hora${cambio(c.rend)}.${c.tallos !== null && Math.abs(c.tallos) >= 0.5 ? ` El total ${c.tallos > 0 ? 'subió' : 'bajó'} ${Math.abs(Math.round(c.tallos))} %.` : ''}` });
    if (l.length) out.push({ id: 'lineas', icono: 'fa-diagram-project', titulo: 'Líneas', texto: `La línea más productiva fue ${l[0].nombre} (${fmt(l[0].tallos)} tallos, ${fmt(l[0].porHora)} por hora)${l.length > 1 ? ` y la de menor producción, ${l.at(-1).nombre} (${fmt(l.at(-1).tallos)} tallos)` : ''}.` });
    if (r.mejor) out.push({ id: 'dias', icono: 'fa-calendar-check', titulo: 'Días', texto: `El mejor día fue el ${r.mejor.dia} ${ddmm(r.mejor.fecha)} con ${fmt(r.mejor.tallos)} tallos${r.peor ? `; el más bajo, el ${r.peor.dia} ${ddmm(r.peor.fecha)} con ${fmt(r.peor.tallos)}` : ''}.` });
  } else if (esProceso(alcance, 'calidad')) {
    const dv = r.devoluciones;
    out.push(dv.hayDatos ? { id: 'calidad', icono: 'fa-rotate-left', titulo: 'Calidad', texto: `Durante ${per} se registraron ${fmt(dv.total)} devoluciones: una calidad de ${fmt2(cal.pct)} % sobre los tallos ${cal.base} (${fmt2(cal.porMil)} devoluciones por cada 1.000)${c.devoluciones !== null && Math.abs(c.devoluciones) >= 0.5 ? `, ${Math.abs(Math.round(c.devoluciones))} % ${c.devoluciones > 0 ? 'más' : 'menos'} devoluciones que el período anterior` : ''}.` } : { id: 'calidad', icono: 'fa-rotate-left', titulo: 'Calidad', texto: 'Las devoluciones de este período todavía no se han cargado.' });
    if (dv.causas.length) out.push({ id: 'causas', icono: 'fa-magnifying-glass', titulo: 'Causas', texto: `Las causas más frecuentes fueron ${unir(dv.causas.slice(0, 3).map(x => `${x.nombre} (${Math.round(x.pct * 100)} %)`))}.` });
    if (dv.diaMas) out.push({ id: 'dia', icono: 'fa-calendar-day', titulo: 'Día crítico', texto: `El día con más devoluciones fue el ${ddmm(dv.diaMas[0])}, con ${fmt(dv.diaMas[1])}.` });
  } else {
    const p = alcance.tipo === 'persona';
    out.push({ id: 'produccion', icono: 'fa-seedling', titulo: 'Producción', texto: `Durante ${per} ${p ? `${quien} trabajó ${r.diasTrabajados} día${r.diasTrabajados === 1 ? '' : 's'} y produjo ${fmt(r.tallos)} tallos en ${fmt(r.horas || 0)} horas reales, a ${fmt(r.rend)} tallos por hora` : `la finca produjo ${fmt(r.tallos)} tallos en ${r.diasTrabajados} día${r.diasTrabajados === 1 ? '' : 's'} de trabajo, con un rendimiento promedio de ${fmt(r.rend)} tallos por hora real`}${cambio(c.rend)}.${c.tallos !== null && Math.abs(c.tallos) >= 0.5 ? ` La producción total ${c.tallos > 0 ? 'subió' : 'bajó'} ${Math.abs(Math.round(c.tallos))} %.` : ''}` });
    if (r.cumplimientoGeneral != null) out.push({ id: 'meta', icono: 'fa-bullseye', titulo: 'Meta', texto: `El cumplimiento general fue de ${Math.round(r.cumplimientoGeneral)} %: un rendimiento de ${fmt(r.rend)} tallos por hora (${fmt(r.tallos)} tallos en ${fmt(r.horas)} horas realmente trabajadas) frente a la meta de ${fmt(r.metaHora)}.${r.cumplenMetaPct != null ? ` ${p ? `Alcanzó la meta por hora en el ${Math.round(r.cumplenMetaPct)} % de sus días` : `El ${Math.round(r.cumplenMetaPct)} % de los turnos de persona alcanzó la meta por hora`}.` : ''}` });
    const eq = ordenarEquipos(equipos);
    if (eq.length >= 2) { const a = eq[0], z = eq.at(-1); out.push({ id: 'equipos', icono: 'fa-people-group', titulo: 'Equipos', texto: `El equipo con mejor rendimiento fue ${a.nombre} (${fmt(a.rend)} tallos/hora) y el de menor rendimiento, ${z.nombre} (${fmt(z.rend)}); la diferencia entre ambos es de ${Math.round(((a.rend - z.rend) / a.rend) * 100)} %.` }); }
    if (alcance.tipo === 'finca' || p) {
      out.push(r.devoluciones.hayDatos ? { id: 'calidad', icono: 'fa-rotate-left', titulo: 'Calidad', texto: `Se registraron ${fmt(r.devoluciones.total)} devoluciones: una calidad de ${fmt2(cal.pct)} % (${fmt2(cal.porMil)} por cada 1.000 tallos ${cal.base})${c.devoluciones !== null && Math.abs(c.devoluciones) >= 0.5 ? `, ${Math.abs(Math.round(c.devoluciones))} % ${c.devoluciones > 0 ? 'más' : 'menos'} devoluciones que el período anterior` : ''}.${r.devoluciones.causas[0] ? ` La causa principal fue ${r.devoluciones.causas[0].nombre} (${Math.round(r.devoluciones.causas[0].pct * 100)} %).` : ''}` } : { id: 'calidad', icono: 'fa-rotate-left', titulo: 'Calidad', texto: 'Las devoluciones de este período todavía no se han cargado.' });
    }
    if (r.clasificacion && alcance.tipo === 'finca') { const l = r.clasificacion.lineas[0]; out.push({ id: 'clasificacion', icono: 'fa-boxes-stacked', titulo: 'Clasificación', texto: `La clasificación movió ${fmt(r.clasificacion.tallos)} tallos, a ${fmt(r.clasificacion.porHora)} tallos por hora${l ? `; la línea más productiva fue ${l.nombre} (${fmt(l.tallos)} tallos)` : ''}.` }); }
    if (r.destacadosConfiables?.length && !p) out.push({ id: 'destacados', icono: 'fa-medal', titulo: 'Destacados', texto: `Destacaron por rendimiento ${unir(r.destacadosConfiables.map(x => `${corto(x.nombre)} (${fmt(x.rend)} t/h)`))}. Solo se cuentan cifras confiables: 3 o más días, 12 o más horas y sin valores atípicos${r.noConfiables ? ` (${r.noConfiables} persona${r.noConfiables === 1 ? '' : 's'} ${r.noConfiables === 1 ? 'quedó' : 'quedaron'} por fuera de este criterio)` : ''}.` });
  }
  const cb = r.cobertura;
  if (cb && cb.laborables > 0) {
    const faltas = [];
    if (!esProceso(alcance, 'clasificacion') && !esProceso(alcance, 'calidad') && cb.boncheo < cb.laborables && alcance.tipo !== 'persona') faltas.push(`boncheo en ${cb.boncheo} de ${cb.laborables} días`);
    if ((alcance.tipo === 'finca' || esProceso(alcance, 'calidad') || alcance.tipo === 'persona') && r.devoluciones && cb.devoluciones < cb.laborables) faltas.push(`devoluciones en ${cb.devoluciones} de ${cb.laborables} días`);
    if ((alcance.tipo === 'finca' || esProceso(alcance, 'clasificacion')) && cb.clasificacion < cb.laborables) faltas.push(`clasificación en ${cb.clasificacion} de ${cb.laborables} días`);
    if (faltas.length) out.push({ id: 'cobertura', icono: 'fa-database', titulo: 'Datos', texto: `Ojo: hay datos incompletos (${unir(faltas)}), así que algunas cifras pueden cambiar cuando se carguen.` });
  }
  return out;
}

/** Lo que se recomienda hacer, según cómo salió el período. (Los pendientes del sistema van aparte, en su propia sección.) [{ tono, icono, texto }] */
export function conclusiones({ r, c, equipos = [], alcance = { tipo: 'finca' } }) {
  if (!r.diasTrabajados) return [{ tono: 'info', icono: 'fa-circle-info', texto: 'Cargar los reportes del período para poder analizarlo.' }];
  const out = [], t = titularEjecutivo(r, c, alcance), eq = ordenarEquipos(equipos), cb = r.cobertura;
  out.push({ tono: t.tono, icono: t.icono, texto: `${t.texto}. ${t.detalle}` });
  if (r.cumplimientoGeneral != null && r.cumplimientoGeneral < 90 && !esProceso(alcance, 'clasificacion') && !esProceso(alcance, 'calidad')) out.push({ tono: 'atencion', icono: 'fa-bullseye', texto: `Subir el rendimiento promedio: faltan ${fmt(Math.max(0, r.metaHora - r.rend))} tallos por hora para llegar a la meta de ${fmt(r.metaHora)}.` });
  if (c.devoluciones !== null && c.devoluciones > 10 && r.devoluciones.causas[0]) out.push({ tono: 'atencion', icono: 'fa-rotate-left', texto: `Las devoluciones aumentaron ${Math.round(c.devoluciones)} %: revisar la causa principal (${r.devoluciones.causas[0].nombre}).` });
  if (eq.length >= 2 && eq.at(-1).pctDelMejor < 90) out.push({ tono: 'info', icono: 'fa-people-group', texto: `Acompañar al equipo de ${eq.at(-1).nombre}: rinde ${Math.round(100 - eq.at(-1).pctDelMejor)} % menos que el mejor equipo.` });
  if (alcance.tipo === 'persona' && r.cumplimientoGeneral != null && r.cumplimientoGeneral >= 100) out.push({ tono: 'bien', icono: 'fa-thumbs-up', texto: 'Reconocer el buen desempeño de la persona en este período.' });
  if (r.devoluciones && !r.devoluciones.hayDatos && !esProceso(alcance, 'clasificacion')) out.push({ tono: 'info', icono: 'fa-file-arrow-up', texto: 'Cargar las devoluciones del período para completar el análisis de calidad.' });
  if (cb && cb.laborables > 0 && cb.boncheo < cb.laborables && alcance.tipo !== 'persona' && !esProceso(alcance, 'clasificacion') && !esProceso(alcance, 'calidad')) out.push({ tono: 'info', icono: 'fa-file-arrow-up', texto: `Completar el boncheo de los días que faltan (${cb.boncheo} de ${cb.laborables} días laborables con datos).` });
  if (out.length === 1 && t.tono === 'bien') out.push({ tono: 'bien', icono: 'fa-thumbs-up', texto: 'Mantener el ritmo actual y reconocer a los equipos destacados.' });
  return out.slice(0, 6);
}

/** La serie del gráfico principal ("Producción por día", "Devoluciones por día"…): [{ fecha, dia, valor, texto, ok }]. */
export function serieDe(r) {
  if (r.serie) return { titulo: r.serie.titulo, unidad: r.serie.unidad, datos: r.serie.datos.map(d => ({ ...d, ok: false })) };
  return { titulo: 'Producción por día', unidad: 'tallos', datos: (r.porDia || []).map(d => ({ fecha: d.fecha, dia: d.dia, valor: d.tallos, texto: `${fmt(d.rend)} t/h · ${d.personas} persona${d.personas === 1 ? '' : 's'}`, ok: r.metaHora ? d.rend >= r.metaHora : false })) };
}

/** El modelo completo del documento. */
export function modeloEjecutivo({ r, c, previo = null, equipos = [], alcance = { tipo: 'finca' }, alertas = [], firma, generado }) {
  const eq = ordenarEquipos(equipos), cb = r.cobertura || null;
  return {
    periodo: r.periodo, alcance, titular: titularEjecutivo(r, c, alcance), generado: generado || '', firma: normalizarFirma(firma),
    indicadores: r.diasTrabajados ? indicadores({ r, c, previo, alcance }) : [], narrativa: narrativa({ r, c, equipos, alcance }),
    serie: serieDe(r), metaHora: r.metaHora || 0, equipos: eq,
    causas: (r.devoluciones.causas || []).map(x => ({ nombre: x.nombre, cantidad: x.cantidad, pct: x.pct })),
    lineas: (r.clasificacion?.lineas || []).slice(0, 6).map(l => ({ nombre: l.nombre, tallos: l.tallos, porHora: l.porHora })),
    destacados: alcance.tipo === 'persona' || esProceso(alcance, 'clasificacion') || esProceso(alcance, 'calidad') ? [] : (r.destacadosConfiables || []).map(p => ({ nombre: corto(p.nombre), rend: p.rend, dias: p.dias })),
    noConfiables: r.noConfiables || 0, cobertura: cb,
    conclusiones: conclusiones({ r, c, equipos, alcance }), alertas: alertas.slice(0, 5)
  };
}

/** El mismo documento en texto simple (para copiar y pegar en un correo o mensaje). */
export function textoEjecutivo(m) {
  const f = m.firma, L = [`RESUMEN EJECUTIVO — ${m.periodo.etiqueta}`, m.titular.texto, '', 'Cordial saludo.', ''];
  for (const n of m.narrativa) L.push(`${n.titulo}: ${n.texto}`, '');
  if (m.indicadores.length) { L.push('Indicadores clave'); for (const k of m.indicadores) L.push(`• ${k.etq}: ${k.valor} (${k.sub})${k.d ? ` ${k.d.txt}` : ''}`); L.push(''); }
  if (m.equipos.length) { L.push('Equipos (por rendimiento)'); for (const e of m.equipos) L.push(`${e.puesto}. ${e.nombre}: ${fmt(e.rend)} t/h · ${fmt(e.tallos)} tallos`); L.push(''); }
  if (m.conclusiones.length) { L.push('Conclusiones y recomendaciones'); for (const x of m.conclusiones) L.push(`• ${x.texto}`); L.push(''); }
  L.push('Cordialmente,', f.nombre, f.cargo, `${f.empresa} · ${f.finca}`, ...(f.telefono ? [f.telefono] : []), ...(f.correo ? [f.correo] : []), f.ubicacion, '', `Resumen generado automáticamente por TMControl${m.generado ? ` · ${m.generado}` : ''}.`);
  return L.join('\n');
}
