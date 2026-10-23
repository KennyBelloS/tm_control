/**
 * Cálculos del módulo de Devoluciones. PURO: no toca la base de datos ni el navegador, así se puede probar con datos reales.
 *
 * Datos que recibe (los mismos que se guardan, en formato compacto):
 *   dias        [{ fecha:'2026-10-12', id, codigo, razones:{ maltrato:2 }, total, filas }]   una fila por persona y día
 *   asistencia  [{ id, mes:'2026-10-01', dias:<número> }]                                    bit 0 = día 1 … bit 30 = día 31
 *   personas    Map(id → { id, nombre, codigo })
 */

/* ---------------- Fechas (texto aaaa-mm-dd, sin husos horarios) ---------------- */
const MS = 86_400_000;
const aUTC = iso => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d); };
const deUTC = ms => new Date(ms).toISOString().slice(0, 10);
export const sumarDias = (iso, n) => deUTC(aUTC(iso) + n * MS);
export const diaSemana = iso => new Date(aUTC(iso)).getUTCDay();               // 0 = domingo
export const inicioSemana = iso => sumarDias(iso, -diaSemana(iso));             // la semana va de domingo a sábado
export const finSemana = iso => sumarDias(iso, 6 - diaSemana(iso));
export const primerDiaMes = iso => `${iso.slice(0, 8)}01`;
export const ultimoDiaMes = iso => { const [y, m] = iso.split('-').map(Number); return deUTC(Date.UTC(y, m, 0)); };
export const sumarMeses = (iso, n) => { const [y, m] = iso.split('-').map(Number); return deUTC(Date.UTC(y, m - 1 + n, 1)); };
export const serialAISO = n => deUTC(Math.round((n - 25569) * MS));             // número de fecha de Excel → aaaa-mm-dd
export const HISTORICO = Object.freeze({ desde: '0000-01-01', hasta: '9999-12-31' });

export function periodos(fecha) {
  return {
    dia: { desde: fecha, hasta: fecha },
    semana: { desde: inicioSemana(fecha), hasta: finSemana(fecha) },
    mes: { desde: primerDiaMes(fecha), hasta: ultimoDiaMes(fecha) },
    historico: HISTORICO
  };
}

/* ---------------- Días trabajados guardados en un solo número por persona y mes ---------------- */
export const popcount = n => { let c = 0; n >>>= 0; while (n) { c += n & 1; n >>>= 1; } return c; };
export const bitDelDia = iso => 1 << (Number(iso.slice(8, 10)) - 1);
export const asistioEl = (mascara, fecha) => (mascara & bitDelDia(fecha)) !== 0;
/** Cuántos días de la máscara de ese mes caen dentro de [desde, hasta]. */
export function diasEnRango(mascara, mes, desde, hasta) {
  const ini = primerDiaMes(mes), fin = ultimoDiaMes(mes);
  const a = desde > ini ? desde : ini, b = hasta < fin ? hasta : fin;
  if (a > b) return 0;
  const d1 = Number(a.slice(8, 10)), d2 = Number(b.slice(8, 10));
  return popcount(mascara & ((2 ** (d2 - d1 + 1) - 1) * 2 ** (d1 - 1)));
}
/** Arma la máscara de un mes a partir de los días (1–31) trabajados. */
export const mascaraDeDias = lista => lista.reduce((m, d) => m | (1 << (d - 1)), 0);

/* ---------------- Razones (tipos de defecto) ---------------- */
export const slugRazon = nombre => String(nombre).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
export const normalizarNombre = n => String(n ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();

/* ---------------- Totales por persona dentro de un período ---------------- */
export function estadoPeriodo(datos, P) {
  const m = new Map();
  const de = id => { let e = m.get(id); if (!e) m.set(id, e = { id, devol: 0, filas: 0, diasTrab: 0, razones: {} }); return e; };
  for (const r of datos.dias) {
    if (r.fecha < P.desde || r.fecha > P.hasta) continue;
    const e = de(r.id);
    e.devol += r.total; e.filas += r.filas;
    for (const [k, v] of Object.entries(r.razones)) e.razones[k] = (e.razones[k] || 0) + v;
  }
  for (const a of datos.asistencia) {
    const n = diasEnRango(a.dias, a.mes, P.desde, P.hasta);
    if (n) de(a.id).diasTrab += n;
  }
  return m;
}

/** Los indicadores de la parte de arriba (Día / Semana / Mes / Histórico). */
export function resumenPeriodo(estado) {
  let total = 0, filas = 0, conDev = 0, asistieron = 0, diasPersona = 0;
  for (const e of estado.values()) {
    total += e.devol; filas += e.filas; diasPersona += e.diasTrab;
    if (e.devol > 0) conDev++;
    if (e.diasTrab > 0) asistieron++;
  }
  return { total, filas, personasConDevoluciones: conDev, personasAsistieron: asistieron, diasPersona, porDiaTrabajado: diasPersona > 0 ? total / diasPersona : null };
}

/* ---------------- Top 5: quién más y quién menos devuelve ---------------- */
const porCodigo = (a, b) => (a.codigo ?? 1e9) - (b.codigo ?? 1e9) || a.nombre.localeCompare(b.nombre);
/**
 * MÁS  = el total de devoluciones del período (sin mínimo de días). Empate: sube quien trabajó MENOS días, luego el código menor.
 * MENOS = solo quien trabajó el mínimo de días del período y NO está en el Top 5 de MÁS. Empate: gana quien trabajó MÁS días, luego el código menor.
 */
export function rankingPeriodo(estado, personas, minDias, n = 5) {
  const lista = [...estado.values()].map(e => ({ ...e, nombre: personas.get(e.id)?.nombre || `ID ${e.id}`, codigo: personas.get(e.id)?.codigo ?? null }));
  const conDev = lista.filter(e => e.devol > 0).sort((a, b) => b.devol - a.devol || a.diasTrab - b.diasTrab || porCodigo(a, b));
  const mas = conDev.slice(0, n);
  const enMas = new Set(mas.map(e => e.id));
  const elegibles = lista.filter(e => e.diasTrab >= minDias && !enMas.has(e.id)).sort((a, b) => a.devol - b.devol || b.diasTrab - a.diasTrab || porCodigo(a, b));
  const menos = elegibles.slice(0, n);
  const quinto = menos[n - 1];
  const empatadosFuera = quinto ? elegibles.slice(n).filter(e => e.devol === quinto.devol).length : 0;
  return { mas, menos, personasConDevoluciones: conDev.length, elegibles: elegibles.length, empatadosFuera, quintoDevol: quinto?.devol ?? null, minDias, ordenMas: conDev, ordenMenos: elegibles };
}

/* ---------------- Causas: devoluciones por tipo de defecto ---------------- */
export function causas(datos, razones, P4, fecha) {
  const sumas = { dia: {}, semana: {}, mes: {}, historico: {} };
  for (const r of datos.dias) {
    for (const [nombre, P] of Object.entries(P4)) {
      if (r.fecha < P.desde || r.fecha > P.hasta) continue;
      for (const [k, v] of Object.entries(r.razones)) sumas[nombre][k] = (sumas[nombre][k] || 0) + v;
    }
  }
  const totales = {};
  for (const p of Object.keys(sumas)) totales[p] = Object.values(sumas[p]).reduce((a, b) => a + b, 0);
  const filas = razones.map(({ k, n }) => ({
    k, nombre: n,
    dia: sumas.dia[k] || 0, semana: sumas.semana[k] || 0, mes: sumas.mes[k] || 0, historico: sumas.historico[k] || 0,
    pctMes: totales.mes > 0 ? (sumas.mes[k] || 0) / totales.mes : 0
  }));
  // razones que aparecen en los datos pero no en la lista guardada (columnas nuevas del Excel)
  const conocidas = new Set(razones.map(r => r.k));
  for (const p of Object.keys(sumas)) for (const k of Object.keys(sumas[p])) if (!conocidas.has(k)) {
    conocidas.add(k);
    filas.push({ k, nombre: k.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase()), dia: sumas.dia[k] || 0, semana: sumas.semana[k] || 0, mes: sumas.mes[k] || 0, historico: sumas.historico[k] || 0, pctMes: totales.mes > 0 ? (sumas.mes[k] || 0) / totales.mes : 0 });
  }
  return { filas, totales };
}

/* ---------------- Tendencia: 12 meses hasta el mes seleccionado ---------------- */
export function tendencia(datos, fecha, meses = 12) {
  const fin = primerDiaMes(fecha);
  const lista = [];
  for (let i = meses - 1; i >= 0; i--) {
    const mes = sumarMeses(fin, -i);
    const P = { desde: mes, hasta: ultimoDiaMes(mes) };
    let devol = 0, dias = 0;
    for (const r of datos.dias) if (r.fecha >= P.desde && r.fecha <= P.hasta) devol += r.total;
    for (const a of datos.asistencia) if (a.mes === mes) dias += popcount(a.dias);
    lista.push({ mes, devol, dias, porDia: dias > 0 ? devol / dias : null });
  }
  return lista;
}

/* ---------------- Seguimiento individual ---------------- */
export function buscarPersona(personas, texto) {
  const t = String(texto ?? '').trim();
  if (!t) return null;
  const lista = [...personas.values()];
  if (/^\d+$/.test(t)) return lista.find(p => String(p.codigo) === t) || lista.find(p => String(p.id) === t) || null;     // el código manda
  const q = normalizarNombre(t);
  return lista.find(p => normalizarNombre(p.nombre).includes(q)) || null;
}

export function seguimientoPersona(datos, personas, id, P4, minimos) {
  const out = { periodos: {}, defectos: { semana: {}, mes: {}, historico: {} }, ultimaAsistencia: null };
  for (const [nombre, P] of Object.entries(P4)) {
    const estado = estadoPeriodo(datos, P);
    const e = estado.get(id) || { devol: 0, diasTrab: 0, razones: {} };
    const r = rankingPeriodo(estado, personas, minimos[nombre] ?? 1);
    const iMas = r.ordenMas.findIndex(x => x.id === id);
    const iMenos = r.menos.findIndex(x => x.id === id);
    const elegible = r.ordenMenos.some(x => x.id === id);
    out.periodos[nombre] = {
      devol: e.devol, diasTrab: e.diasTrab, porDia: e.diasTrab > 0 ? e.devol / e.diasTrab : null,
      puestoMas: iMas >= 0 ? `${iMas + 1} de ${r.personasConDevoluciones}` : '—',
      puestoMenos: elegible ? `${r.ordenMenos.findIndex(x => x.id === id) + 1} de ${r.elegibles}` : 'No elegible',
      enTop5Menos: iMenos >= 0
    };
    if (out.defectos[nombre]) out.defectos[nombre] = e.razones;
  }
  let ultima = null;
  for (const a of datos.asistencia) if (a.id === id && a.dias > 0) { const f = sumarDias(a.mes, Math.floor(Math.log2(a.dias))); if (!ultima || f > ultima) ultima = f; }
  out.ultimaAsistencia = ultima;
  return out;
}

/* ---------------- Calidad de datos ---------------- */
/** Devoluciones registradas un día en que la persona NO tiene asistencia (no cuentan como día trabajado). */
export function devolucionesSinAsistencia(datos) {
  const mascara = new Map(datos.asistencia.map(a => [`${a.id}|${a.mes}`, a.dias]));
  let registros = 0, devoluciones = 0;
  for (const r of datos.dias) {
    const m = mascara.get(`${r.id}|${primerDiaMes(r.fecha)}`) ?? 0;
    if (!asistioEl(m, r.fecha)) { registros++; devoluciones += r.total; }
  }
  return { registros, devoluciones };
}

/* ---------------- Formadoras: las devoluciones de la gente que tiene asignada ---------------- */
/**
 * quienEsLaFormadora(fecha, idDevolucion) → id de la formadora (o null si no se sabe).
 * Devuelve por formadora: total, razón principal, quién más devolvió, y el total de cada día.
 */
export function devolucionesPorFormadora(datos, personas, P, quienEsLaFormadora) {
  const res = new Map();
  for (const r of datos.dias) {
    if (r.fecha < P.desde || r.fecha > P.hasta) continue;
    const f = quienEsLaFormadora(r.fecha, r.id) ?? 'sin';
    let e = res.get(f);
    if (!e) res.set(f, e = { formadora: f, total: 0, porDia: new Map(), personas: new Map(), razones: {} });
    e.total += r.total;
    e.porDia.set(r.fecha, (e.porDia.get(r.fecha) || 0) + r.total);
    const p = e.personas.get(r.id) || { id: r.id, nombre: personas.get(r.id)?.nombre || `ID ${r.id}`, codigo: personas.get(r.id)?.codigo ?? null, devol: 0 };
    p.devol += r.total; e.personas.set(r.id, p);
    for (const [k, v] of Object.entries(r.razones)) e.razones[k] = (e.razones[k] || 0) + v;
  }
  for (const e of res.values()) {
    e.top = [...e.personas.values()].sort((a, b) => b.devol - a.devol || porCodigo(a, b))[0] || null;
    e.razonPrincipal = Object.entries(e.razones).sort((a, b) => b[1] - a[1])[0] || null;
  }
  return res;
}

// ---- Emparejar personas de la app con las del módulo de Devoluciones (regla pura; la usan el navegador y el servidor) ----
export const palabras = n => normalizarNombre(n).split(' ').filter(p => p.length > 1);
export function subconjunto(a, b) { const [chico, grande] = a.length <= b.length ? [a, b] : [b, a]; return chico.length >= 2 && chico.every(p => grande.includes(p)); }
/** Sin código de mesa, un nombre parcial solo sirve si trae al menos 3 palabras (nombre y apellidos) y es el ÚNICO que coincide. */
export const unicoParcial = (lista, pal, sacar) => { const c = lista.filter(x => sacar(x).length >= 3 && subconjunto(sacar(x), pal)); return c.length === 1 ? c[0] : null; };

/**
 * Empareja personas de la app (Líneas, Personas…) con las personas del módulo de Devoluciones.
 * personasApp = [{ id, nombre, mesa }]   personasDev = [{ id, nombre, codigo }]   → Map(idApp → persona de Devoluciones | null)
 * Orden: 1) mismo ID  2) mismo nombre  3) nombre parcial + mismo código  4) nombre parcial de 3+ palabras y ÚNICO (nunca adivina entre dos).
 */
export function emparejarConDevoluciones(personasApp, personasDev) {
  const porId = new Map(personasDev.map(p => [p.id, p]));
  const porNombre = new Map(personasDev.map(p => [normalizarNombre(p.nombre), p]));
  const lista = personasDev.map(p => ({ ...p, pal: palabras(p.nombre) }));
  const res = new Map();
  for (const a of personasApp) {
    const pal = palabras(a.nombre);
    const dev = porId.get(a.id)
      || porNombre.get(normalizarNombre(a.nombre))
      || (a.mesa != null ? lista.find(x => x.codigo === a.mesa && subconjunto(pal, x.pal)) : null)
      || unicoParcial(lista, pal, x => x.pal);
    res.set(a.id, dev || null);
  }
  return res;
}
