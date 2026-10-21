/**
 * Datos del módulo de Devoluciones en el navegador: leer lo guardado, cargar un Excel nuevo y asociar las devoluciones
 * con la formadora que tenía asignada a cada persona.
 */
import { supabase } from './supabaseClient';
import { armarPayload } from './devolucionesExcel';
import { minimosValidos } from './devolucionesAnalisis';
import { normalizarNombre, sumarDias, devolucionesPorFormadora, periodos, inicioSemana, finSemana, primerDiaMes, ultimoDiaMes } from './devolucionesCalculos';

/** Supabase entrega máximo 1.000 filas por consulta: se pide por páginas hasta traer todo. */
async function paginar(construir, tam = 1000) {
  const todo = [];
  for (let desde = 0; ; desde += tam) {
    const { data, error } = await construir().range(desde, desde + tam - 1);
    if (error) throw error;
    todo.push(...data);
    if (data.length < tam) break;
  }
  return todo;
}

export const esErrorSinTablas = e => ['42P01', 'PGRST205', 'PGRST202', '42883'].includes(e?.code) || /devoluciones_/.test(e?.message || '') && /(does not exist|schema cache|Could not find)/i.test(e?.message || '');

/** Los mínimos de días elegidos por el administrador (tabla devoluciones_ajustes). null = aún no hay; 'sin-tabla' = falta ejecutar la actualización de la base. */
export async function leerAjustesDevoluciones() {
  const { data, error } = await supabase.from('devoluciones_ajustes').select('minimos, actualizado_en').eq('id', 1).maybeSingle();
  if (error) return 'sin-tabla';
  return data ? { minimos: minimosValidos(data.minimos), actualizadoEn: data.actualizado_en } : null;
}
/** Guarda los mínimos como PREDETERMINADOS para todos. Solo lo permite la base a los administradores. */
export async function guardarAjustesDevoluciones(minimos) {
  const m = minimosValidos(minimos);
  const { error } = await supabase.from('devoluciones_ajustes').upsert({ id: 1, minimos: m, actualizado_en: new Date().toISOString() }, { onConflict: 'id' });
  if (error) throw error;
  return m;
}

export async function cargarDatosDevoluciones() {
  const [dias, asistencia, personas, meta, ajustes] = await Promise.all([
    paginar(() => supabase.from('devoluciones_dia').select('fecha, colaborador_id, codigo, razones, total, filas').order('fecha').order('colaborador_id')),
    paginar(() => supabase.from('devoluciones_asistencia').select('colaborador_id, mes, dias').order('mes').order('colaborador_id')),
    paginar(() => supabase.from('devoluciones_personas').select('colaborador_id, nombre, codigo').order('colaborador_id')),
    supabase.from('devoluciones_meta').select('*').eq('id', 1).maybeSingle(),
    leerAjustesDevoluciones().then(a => (a === 'sin-tabla' ? undefined : a))
  ]);
  if (meta.error) throw meta.error;
  return {
    dias: dias.map(r => ({ fecha: r.fecha, id: r.colaborador_id, codigo: r.codigo, razones: r.razones || {}, total: r.total, filas: r.filas })),
    asistencia: asistencia.map(r => ({ id: r.colaborador_id, mes: r.mes, dias: r.dias })),
    personas: new Map(personas.map(p => [p.colaborador_id, { id: p.colaborador_id, nombre: p.nombre, codigo: p.codigo }])),
    meta: meta.data || {},
    ajustes: ajustes?.minimos ?? null,                  // mínimos de días guardados por el administrador (null = todavía no hay nada guardado)
    ajustesDisponibles: ajustes !== undefined
  };
}

/** Guarda la carga en UNA operación: o se guarda todo o no se guarda nada. */
export async function importarDevoluciones(carga) {
  const { data, error } = await supabase.rpc('devoluciones_importar', armarPayload(carga));
  if (error) throw error;
  return data;
}

/* ------------------------------------------------------------------------------------------------
   Asociar con las formadoras: cada persona de Devoluciones se empareja con la persona asignada a una formadora
   (por ID; si no, por nombre completo; si no, por nombre parcial + mismo código).
   ------------------------------------------------------------------------------------------------ */
const palabras = n => normalizarNombre(n).split(' ').filter(p => p.length > 1);
function subconjunto(a, b) { const [chico, grande] = a.length <= b.length ? [a, b] : [b, a]; return chico.length >= 2 && chico.every(p => grande.includes(p)); }
/** Sin código de mesa, un nombre parcial solo sirve si trae al menos 3 palabras (nombre y apellidos) y es el ÚNICO que coincide. */
const unicoParcial = (lista, pal, sacar) => { const c = lista.filter(x => sacar(x).length >= 3 && subconjunto(sacar(x), pal)); return c.length === 1 ? c[0] : null; };

/**
 * asignaciones: filas de asignaciones_diarias [{ fecha, colaborador_id, formadora_id, formadoras:{nombre}, personas:{nombre, mesa} }]
 * personasDev: Map(id → { nombre, codigo })
 * conRespaldo: si ese día no hay asignaciones, usa las del día anterior más reciente (lo normal en datos antiguos)
 * → { quien(fecha, idDev) → id de formadora | null, formadoras: Map(id → nombre) }
 */
export function construirAtribuidor(asignaciones, personasDev, { conRespaldo = true } = {}) {
  const porFecha = new Map(), formadoras = new Map();
  for (const a of asignaciones || []) {
    if (!porFecha.has(a.fecha)) porFecha.set(a.fecha, []);
    porFecha.get(a.fecha).push({ id: a.colaborador_id, formadora: a.formadora_id, nombre: a.personas?.nombre || '', mesa: a.personas?.mesa ?? null, pal: palabras(a.personas?.nombre) });
    if (a.formadoras?.nombre) formadoras.set(a.formadora_id, a.formadoras.nombre);
  }
  const fechas = [...porFecha.keys()].sort();
  const fechaDeAsignacion = f => {
    if (porFecha.has(f)) return f;
    if (!conRespaldo) return null;
    let mejor = null; for (const x of fechas) { if (x <= f) mejor = x; else break; }
    return mejor;
  };
  const cache = new Map();
  const quien = (fecha, idDev) => {
    const fa = fechaDeAsignacion(fecha);
    if (!fa) return null;
    const key = `${fa}|${idDev}`;
    if (cache.has(key)) return cache.get(key);
    const lista = porFecha.get(fa);
    const dev = personasDev.get(idDev);
    let r = lista.find(x => x.id === idDev);                                                         // 1) mismo ID
    if (!r && dev) {
      const nd = normalizarNombre(dev.nombre), pd = palabras(dev.nombre);
      r = lista.find(x => normalizarNombre(x.nombre) === nd)                                          // 2) mismo nombre
        || lista.find(x => x.pal.length && dev.codigo != null && x.mesa === dev.codigo && subconjunto(x.pal, pd))      // 3) nombre parcial + mismo código
        || unicoParcial(lista.filter(x => x.mesa == null), pd, x => x.pal);                                           // 4) sin mesa: nombre parcial de 3+ palabras y único
    }
    const res = r ? r.formadora : null;
    cache.set(key, res);
    return res;
  };
  return { quien, formadoras };
}

/** Asignaciones de personas a formadoras. Pide también la "mesa"; si la base aún no tiene esa columna, sigue sin ella (se empareja por ID y nombre). */
async function traerAsignaciones(desde, hasta) {
  const con = campos => paginar(() => supabase.from('asignaciones_diarias').select(`fecha, colaborador_id, formadora_id, formadoras(nombre), personas(${campos})`).gte('fecha', desde).lte('fecha', hasta).order('fecha').order('colaborador_id'));
  try { return await con('nombre, mesa'); } catch { return con('nombre'); }
}

/** Devoluciones de la gente de cada formadora en un rango de fechas (con los datos del módulo ya cargados). */
export async function resumenDevolucionesFormadoras(datos, P) {
  const asig = await traerAsignaciones(sumarDias(P.desde, -45), P.hasta);
  const { quien, formadoras } = construirAtribuidor(asig, datos.personas, { conRespaldo: true });
  const res = devolucionesPorFormadora(datos, datos.personas, P, quien);
  return { res, formadoras };
}

/** Último día del Excel que ya se subió. Un día POSTERIOR a este no está cargado: no debe mostrar ningún número. */
export async function ultimaFechaCargada() {
  const { data, error } = await supabase.from('devoluciones_meta').select('ultima_fecha_registro').eq('id', 1).maybeSingle();
  if (error) throw error;
  return data?.ultima_fecha_registro || null;
}

/** Todo el módulo de Devoluciones en un rango de fechas (solo lo necesario para sumar). */
async function traerDevolucionesRango(desde, hasta) {
  const [dias, personas] = await Promise.all([
    paginar(() => supabase.from('devoluciones_dia').select('fecha, colaborador_id, total').gte('fecha', desde).lte('fecha', hasta).order('fecha').order('colaborador_id')),
    paginar(() => supabase.from('devoluciones_personas').select('colaborador_id, nombre, codigo').order('colaborador_id'))
  ]);
  return { dias, personas };
}

/**
 * Para el Tablero de Formadoras: por cada fila (día + formadora) las devoluciones de la gente que esa formadora tenía asignada,
 * ese DÍA, en la SEMANA (domingo a sábado) y en el MES de esa fecha. Cada día cuenta con SU asignación.
 * filas = [{ fecha, formadora_id }] → Map("fecha_formadora" → { dia, semana, mes })   (dia = null si ese día no hay datos de devoluciones)
 */
export async function devolucionesParaTablero(filas) {
  const vacio = { mapa: new Map(), ultima: null };
  if (!filas?.length) return vacio;
  const fechas = filas.map(f => f.fecha).sort();
  const minF = fechas[0], maxF = fechas[fechas.length - 1];
  const desde = inicioSemana(minF) < primerDiaMes(minF) ? inicioSemana(minF) : primerDiaMes(minF);
  const hasta = finSemana(maxF) > ultimoDiaMes(maxF) ? finSemana(maxF) : ultimoDiaMes(maxF);
  const [{ dias, personas }, ultima] = await Promise.all([traerDevolucionesRango(desde, hasta), ultimaFechaCargada()]);
  if (!ultima || !personas.length) return vacio;                   // sin días cargados o sin personas: no hay nada que mostrar
  const asig = await traerAsignaciones(sumarDias(desde, -45), hasta);
  const { quien } = construirAtribuidor(asig, new Map(personas.map(p => [p.colaborador_id, { nombre: p.nombre, codigo: p.codigo }])), { conRespaldo: true });
  const porFormadora = new Map();                                   // formadora → Map(fecha → total)
  for (const d of dias) {
    const f = quien(d.fecha, d.colaborador_id);
    if (f == null) continue;
    if (!porFormadora.has(f)) porFormadora.set(f, new Map());
    porFormadora.get(f).set(d.fecha, (porFormadora.get(f).get(d.fecha) || 0) + d.total);
  }
  const sumar = (f, a, b) => { let t = 0; for (const [fe, v] of porFormadora.get(f) || []) if (fe >= a && fe <= b) t += v; return t; };
  const mapa = new Map();
  for (const { fecha, formadora_id: f } of filas) {
    const P = periodos(fecha);
    const cargado = fecha <= ultima;                      // un día posterior al último cargado NO muestra números (ni el de la semana ni el del mes)
    mapa.set(`${fecha}_${f}`, cargado ? { dia: sumar(f, fecha, fecha), semana: sumar(f, P.semana.desde, P.semana.hasta), mes: sumar(f, P.mes.desde, P.mes.hasta) } : { dia: null, semana: null, mes: null });
  }
  return { mapa, ultima };
}

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

/**
 * Para la pantalla de Líneas: las devoluciones (día, semana, mes) de CADA PERSONA asignada.
 * personasApp = [{ id, nombre, mesa }] → { porPersona: Map(id → {dia, semana, mes} | null si no se encontró), hayDia, hayDatos }
 */
export async function devolucionesDePersonas(personasApp, fecha) {
  const sinDatos = { porPersona: new Map(), hayDia: false, hayDatos: false, ultima: null };
  if (!personasApp?.length || !fecha) return sinDatos;
  const P = periodos(fecha);
  const desde = P.semana.desde < P.mes.desde ? P.semana.desde : P.mes.desde, hasta = P.semana.hasta > P.mes.hasta ? P.semana.hasta : P.mes.hasta;
  const [{ dias, personas }, ultima] = await Promise.all([traerDevolucionesRango(desde, hasta), ultimaFechaCargada()]);
  if (!personas.length || !ultima) return sinDatos;
  const emparejadas = emparejarConDevoluciones(personasApp, personas.map(p => ({ id: p.colaborador_id, nombre: p.nombre, codigo: p.codigo })));
  const sumas = new Map();
  for (const d of dias) {
    const e = sumas.get(d.colaborador_id) || { dia: 0, semana: 0, mes: 0 };
    if (d.fecha === fecha) e.dia += d.total;
    if (d.fecha >= P.semana.desde && d.fecha <= P.semana.hasta) e.semana += d.total;
    if (d.fecha >= P.mes.desde && d.fecha <= P.mes.hasta) e.mes += d.total;
    sumas.set(d.colaborador_id, e);
  }
  const porPersona = new Map();
  for (const a of personasApp) {
    const dev = emparejadas.get(a.id);
    porPersona.set(a.id, dev ? (sumas.get(dev.id) || { dia: 0, semana: 0, mes: 0 }) : null);
  }
  return { porPersona, hayDia: fecha <= ultima, hayDatos: true, ultima };      // hayDia: ese día ya está cargado (si no, no se muestra ningún número)
}

/** Quién es la formadora de cada persona en un rango de fechas (para la pantalla de Devoluciones). */
export async function cargarAtribuidor(personasDev, desde, hasta) {
  const asig = await traerAsignaciones(sumarDias(desde, -45), hasta);
  return { ...construirAtribuidor(asig, personasDev, { conRespaldo: true }), hayAsignaciones: asig.length > 0 };
}

/** Las personas del módulo de Devoluciones con su CÓDIGO corto (el del Excel, ej. 15; no es el ID). */
export async function listarPersonasDevoluciones() {
  const filas = await paginar(() => supabase.from('devoluciones_personas').select('colaborador_id, nombre, codigo').order('colaborador_id'));
  return filas.map(p => ({ id: p.colaborador_id, nombre: p.nombre, codigo: p.codigo }));
}
