/**
 * RESUMEN AUTOMÁTICO DE LA OPERACIÓN — reglas puras: de los datos de un período saca las cifras, las compara con el período anterior
 * y escribe frases claras. Sin base de datos ni pantalla (lo usan igual el navegador y el servidor).
 *
 * datos: { historico:[{fecha,colaborador_id,total_tallos,tiempo_trabajado_min,tiempo_no_productivo_min}], devoluciones:[{fecha,id,total,razones}],
 *          clasificacionHora:[{fecha,linea,hora,tallos}], clasificacionHist:[{fecha,linea,total_tallos}], asignaciones:[{fecha,colaborador_id,formadora_id,linea_id}],
 *          personas:Map(id→nombre), lineas:Map(id→nombre), razones:[{k,n}], config:{metaHora,metaDia}, devIdPorColaborador?:Map }
 * destino: { tipo:'general' } | { tipo:'formadora', formadoraId, nombre }
 */
const NOMBRE_DIA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const fmt = n => Math.round(n).toLocaleString('es-CO');
const fmt1 = n => (Math.round(n * 10) / 10).toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const ddmm = iso => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const diaDe = iso => NOMBRE_DIA[new Date(`${iso}T12:00:00Z`).getUTCDay()];
const horasReales = r => Math.max(0, ((r.tiempo_trabajado_min || 0) - (r.tiempo_no_productivo_min || 0)) / 60);
const sumarDias = (iso, n) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

/** Los períodos: semanal = la semana anterior completa (lunes a domingo); mensual = el mes anterior completo. hoy = día en que se envía. */
export function periodoResumen(tipo, hoy) {
  if (tipo === 'mensual') {
    const d = new Date(`${hoy}T12:00:00Z`); d.setUTCDate(1); d.setUTCDate(0);                      // último día del mes anterior
    const hasta = d.toISOString().slice(0, 10), desde = `${hasta.slice(0, 8)}01`;
    const M = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return { tipo, desde, hasta, etiqueta: `${M[Number(desde.slice(5, 7)) - 1]} de ${desde.slice(0, 4)}`, titulo: 'Resumen mensual' };
  }
  const dow = new Date(`${hoy}T12:00:00Z`).getUTCDay(), haciaLunes = dow === 0 ? 6 : dow - 1;
  const lunesActual = sumarDias(hoy, -haciaLunes), desde = sumarDias(lunesActual, -7), hasta = sumarDias(lunesActual, -1);
  return { tipo: 'semanal', desde, hasta, etiqueta: `semana del ${ddmm(desde)} al ${ddmm(hasta)}`, titulo: 'Resumen semanal' };
}
/** Un rango elegido a mano (p. ej. los últimos 7 días): se compara con el rango anterior de la misma duración. */
export const periodoRango = (desde, hasta, titulo = 'Resumen') => ({ tipo: 'rango', desde, hasta, etiqueta: `del ${ddmm(desde)} al ${ddmm(hasta)}`, titulo });
/** El período inmediatamente anterior, de la misma duración (para comparar). */
export function periodoPrevio(p) {
  if (p.tipo === 'mensual') return periodoResumen('mensual', p.desde);
  if (p.tipo === 'rango') { const n = Math.round((new Date(`${p.hasta}T12:00:00Z`) - new Date(`${p.desde}T12:00:00Z`)) / 864e5) + 1; return { ...p, desde: sumarDias(p.desde, -n), hasta: sumarDias(p.desde, -1) }; }
  const desde = sumarDias(p.desde, -7), hasta = sumarDias(p.desde, -1); return { ...p, desde, hasta, etiqueta: `semana del ${ddmm(desde)} al ${ddmm(hasta)}` };
}

export function calcularResumen(datos, periodo, destino = { tipo: 'general' }) {
  const enRango = f => f >= periodo.desde && f <= periodo.hasta;
  let hist = datos.historico.filter(r => enRango(r.fecha));
  // Formadora: solo las personas que tuvo asignadas cada día
  let permitido = null;
  if (destino.tipo === 'formadora') {
    permitido = new Set(datos.asignaciones.filter(a => enRango(a.fecha) && a.formadora_id === destino.formadoraId).map(a => `${a.fecha}|${a.colaborador_id}`));
    hist = hist.filter(r => permitido.has(`${r.fecha}|${r.colaborador_id}`));
  }
  const porDiaMap = new Map(), personas = new Map();
  for (const r of hist) {
    const d = porDiaMap.get(r.fecha) || { fecha: r.fecha, tallos: 0, horas: 0, personas: new Set() };
    d.tallos += r.total_tallos || 0; d.horas += horasReales(r); d.personas.add(r.colaborador_id); porDiaMap.set(r.fecha, d);
    const p = personas.get(r.colaborador_id) || { id: r.colaborador_id, tallos: 0, horas: 0, dias: 0, diasMeta: 0 };
    p.tallos += r.total_tallos || 0; p.horas += horasReales(r); p.dias++;
    if (horasReales(r) > 0 && (r.total_tallos / horasReales(r)) >= (datos.config.metaHora || Infinity)) p.diasMeta++;
    personas.set(r.colaborador_id, p);
  }
  const porDia = [...porDiaMap.values()].sort((a, b) => (a.fecha < b.fecha ? -1 : 1)).map(d => ({ fecha: d.fecha, dia: diaDe(d.fecha), tallos: d.tallos, rend: d.horas > 0 ? d.tallos / d.horas : 0, personas: d.personas.size }));
  const tallos = porDia.reduce((s, d) => s + d.tallos, 0), horas = [...porDiaMap.values()].reduce((s, d) => s + d.horas, 0), diasTrabajados = porDia.length;
  const metaDia = destino.tipo === 'general' ? (datos.config.metaDia || 0) : 0;
  const cumplimiento = metaDia > 0 && diasTrabajados > 0 ? (tallos / (metaDia * diasTrabajados)) * 100 : null;
  const mejor = porDia.length ? porDia.reduce((m, d) => (d.tallos > m.tallos ? d : m)) : null, peor = porDia.length > 1 ? porDia.reduce((m, d) => (d.tallos < m.tallos ? d : m)) : null;
  const listaP = [...personas.values()].map(p => ({ ...p, nombre: datos.personas.get(p.id) || `ID ${p.id}`, rend: p.horas > 0 ? p.tallos / p.horas : 0 }));
  const personaDias = listaP.reduce((s, p) => s + p.dias, 0), cumplen = listaP.reduce((s, p) => s + p.diasMeta, 0);
  const destacados = listaP.filter(p => p.dias >= 3).sort((a, b) => b.rend - a.rend).slice(0, 3);

  // Devoluciones (de todo el personal; para una formadora, solo de su gente si se conoce la equivalencia)
  let dv = datos.devoluciones.filter(r => enRango(r.fecha));
  let devFiltrada = false;
  if (destino.tipo === 'formadora' && datos.devIdPorColaborador) {
    const ids = new Set([...personas.keys()].map(id => datos.devIdPorColaborador.get(id)).filter(x => x !== undefined)); dv = dv.filter(r => ids.has(r.id)); devFiltrada = true;
  }
  const causasMap = {}; let devTotal = 0;
  for (const r of dv) { devTotal += r.total; for (const [k, v] of Object.entries(r.razones || {})) causasMap[k] = (causasMap[k] || 0) + v; }
  const nombreCausa = k => datos.razones.find(x => x.k === k)?.n || k.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
  const causas = Object.entries(causasMap).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5).map(([k, c]) => ({ k, nombre: nombreCausa(k), cantidad: c, pct: devTotal > 0 ? c / devTotal : 0 }));
  const devPorDia = new Map(); for (const r of dv) devPorDia.set(r.fecha, (devPorDia.get(r.fecha) || 0) + r.total);
  const diaMasDev = [...devPorDia].sort((a, b) => b[1] - a[1])[0] || null;
  const porMil = tallos > 0 ? (devTotal / tallos) * 1000 : null;

  // Clasificación (solo en el resumen general)
  let clasificacion = null;
  if (destino.tipo === 'general') {
    const horas2 = (datos.clasificacionHora || []).filter(r => enRango(r.fecha) && r.linea !== 99), franjas = new Set(horas2.map(r => `${r.fecha}|${r.hora}`));
    const porLinea = new Map(); for (const r of horas2) { const l = porLinea.get(r.linea) || { linea: r.linea, tallos: 0, franjas: new Set() }; l.tallos += r.tallos; l.franjas.add(`${r.fecha}|${r.hora}`); porLinea.set(r.linea, l); }
    const tallosCl = horas2.reduce((s, r) => s + r.tallos, 0);
    if (tallosCl > 0) clasificacion = { tallos: tallosCl, porHora: tallosCl / Math.max(1, franjas.size), lineas: [...porLinea.values()].map(l => ({ linea: l.linea, nombre: datos.lineas?.get(l.linea) || `Línea ${l.linea}`, tallos: l.tallos, porHora: l.tallos / Math.max(1, l.franjas.size) })).sort((a, b) => b.tallos - a.tallos) };
  }
  return { periodo, destino, tallos, rend: horas > 0 ? tallos / horas : 0, diasTrabajados, personasPorDia: diasTrabajados ? porDia.reduce((s, d) => s + d.personas, 0) / diasTrabajados : 0, metaHora: datos.config.metaHora || null, metaDia, cumplimiento, porDia, mejor, peor, cumplenMetaPct: personaDias > 0 ? (cumplen / personaDias) * 100 : null, destacados, devoluciones: { total: devTotal, porMil, causas, diaMas: diaMasDev, filtrada: devFiltrada, hayDatos: dv.length > 0 }, clasificacion };
}

/** Cambio porcentual de un valor respecto al anterior (null si no hay con qué comparar). */
export const variacion = (a, b) => (b > 0 && a !== null && a !== undefined ? ((a - b) / b) * 100 : null);
export function comparar(actual, previo) {
  if (!previo || !previo.diasTrabajados) return { tallos: null, rend: null, devoluciones: null, porMil: null, cumplimiento: null };
  return { tallos: variacion(actual.tallos, previo.tallos), rend: variacion(actual.rend, previo.rend), devoluciones: variacion(actual.devoluciones.total, previo.devoluciones.total), porMil: variacion(actual.devoluciones.porMil, previo.devoluciones.porMil), cumplimiento: actual.cumplimiento !== null && previo.cumplimiento !== null ? actual.cumplimiento - previo.cumplimiento : null };
}
const flecha = v => (v === null ? '' : v > 0.5 ? `▲ ${Math.round(v)}%` : v < -0.5 ? `▼ ${Math.abs(Math.round(v))}%` : '= igual');

/** Las frases del resumen: claras, con números y con la comparación contra el período anterior. [{ icono, tono:'bien'|'atencion'|'info', texto }] */
export function insights(r, c) {
  const out = [], pd = r.periodo.tipo === 'mensual' ? 'el mes anterior' : 'la semana anterior';
  if (!r.diasTrabajados) return [{ icono: 'fa-circle-info', tono: 'info', texto: 'No hay producción registrada en este período.' }];
  if (r.mejor) out.push({ icono: 'fa-trophy', tono: 'bien', texto: `El mejor día fue el ${r.mejor.dia} ${ddmm(r.mejor.fecha)} con ${fmt(r.mejor.tallos)} tallos${r.diasTrabajados > 1 ? ` (${Math.round(variacion(r.mejor.tallos, r.tallos / r.diasTrabajados))}% sobre el promedio diario)` : ''}.` });
  if (r.cumplimiento !== null) out.push({ icono: 'fa-bullseye', tono: r.cumplimiento >= 100 ? 'bien' : r.cumplimiento >= 90 ? 'info' : 'atencion', texto: r.cumplimiento >= 100 ? `Se superó la meta: ${Math.round(r.cumplimiento)}% (${fmt(r.tallos - r.metaDia * r.diasTrabajados)} tallos por encima).` : `Cumplimiento de la meta: ${Math.round(r.cumplimiento)}%; faltaron ${fmt(r.metaDia * r.diasTrabajados - r.tallos)} tallos.` });
  if (c.rend !== null) out.push({ icono: c.rend >= 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down', tono: c.rend >= 0 ? 'bien' : 'atencion', texto: `El rendimiento promedio fue de ${fmt(r.rend)} tallos/hora, ${c.rend >= 0 ? 'un' : 'un'} ${Math.abs(Math.round(c.rend))}% ${c.rend >= 0 ? 'más' : 'menos'} que ${pd}.` });
  if (r.devoluciones.hayDatos) {
    const causa = r.devoluciones.causas[0];
    out.push({ icono: 'fa-rotate-left', tono: c.devoluciones !== null && c.devoluciones > 10 ? 'atencion' : 'info', texto: `Hubo ${fmt(r.devoluciones.total)} devoluciones${c.devoluciones !== null ? ` (${c.devoluciones <= 0 ? 'bajaron' : 'subieron'} ${Math.abs(Math.round(c.devoluciones))}% frente a ${pd})` : ''}${causa ? `; la causa principal fue ${causa.nombre} (${Math.round(causa.pct * 100)}%)` : ''}.` });
    if (r.devoluciones.porMil !== null) out.push({ icono: 'fa-scale-balanced', tono: c.porMil !== null && c.porMil > 10 ? 'atencion' : 'info', texto: `Calidad: ${fmt1(r.devoluciones.porMil)} devoluciones por cada 1.000 tallos${c.porMil !== null ? ` (${c.porMil <= 0 ? 'mejor' : 'peor'} que ${pd})` : ''}.` });
  } else if (r.destino.tipo === 'general') out.push({ icono: 'fa-rotate-left', tono: 'info', texto: 'Todavía no hay devoluciones cargadas para este período.' });
  if (r.clasificacion) out.push({ icono: 'fa-boxes-stacked', tono: 'info', texto: `Clasificación: promedio de ${fmt(r.clasificacion.porHora)} tallos por hora entre todas las líneas; lideró ${r.clasificacion.lineas[0].nombre} con ${fmt(r.clasificacion.lineas[0].tallos)} tallos.` });
  if (r.cumplenMetaPct !== null) out.push({ icono: 'fa-user-check', tono: r.cumplenMetaPct >= 50 ? 'bien' : 'info', texto: `${Math.round(r.cumplenMetaPct)}% de los turnos de bonchadores alcanzó la meta de ${fmt(r.metaHora)} tallos/hora.` });
  if (r.destacados.length) out.push({ icono: 'fa-star', tono: 'bien', texto: `Rendimiento destacado: ${r.destacados.map(p => `${p.nombre} (${fmt(p.rend)} t/h)`).join(', ')}.` });
  if (r.peor && r.diasTrabajados > 2) out.push({ icono: 'fa-triangle-exclamation', tono: 'atencion', texto: `El día más flojo fue el ${r.peor.dia} ${ddmm(r.peor.fecha)} (${fmt(r.peor.tallos)} tallos).` });
  return out;
}

/** El texto del resumen, en texto simple (para copiar y pegar donde se quiera): título, cifras, frases y quién lo firma. */
export function textoResumen(r, c, { para, remitente, finca = 'Finca Torremolinos', generado }) {
  const cab = [`${r.periodo.titulo} — ${r.periodo.etiqueta}${r.destino.tipo === 'formadora' ? ` · Equipo de ${r.destino.nombre}` : ''}`, ''];
  if (r.diasTrabajados) {
    cab.push(`🌹 Tallos: ${fmt(r.tallos)} ${flecha(c.tallos)}`.trim(), `⚙️ Rendimiento: ${fmt(r.rend)} t/h ${flecha(c.rend)}`.trim());
    if (r.cumplimiento !== null) cab.push(`🎯 Cumplimiento: ${Math.round(r.cumplimiento)}%`);
    if (r.devoluciones.hayDatos) cab.push(`↩️ Devoluciones: ${fmt(r.devoluciones.total)} ${flecha(c.devoluciones)} · ${fmt1(r.devoluciones.porMil || 0)} por 1.000 tallos`.replace('  ', ' '));
    if (r.clasificacion) cab.push(`📦 Clasificación: ${fmt(r.clasificacion.porHora)} t/h`);
    cab.push('');
  }
  const frases = insights(r, c).map(i => `• ${i.texto}`);
  const firma = ['', `${remitente ? `De parte de ${remitente}. ` : ''}TMControl · ${finca}${generado ? ` · ${generado}` : ''}${para ? ` · Para ${para}` : ''}`];
  return [...cab, ...frases, ...firma].join('\n');
}
