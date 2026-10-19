/**
 * Lee el Excel de devoluciones (hojas "Registro" y "Asistencia_Diaria") y lo deja en el formato compacto que se guarda.
 * Las columnas se buscan POR SU NOMBRE (no por su posición): si agregan una razón nueva o mueven una columna, sigue funcionando.
 * Las personas se unifican por NOMBRE, como hace el propio Excel (el ID de la asistencia a veces está desactualizado).
 */
import * as XLSX from 'xlsx';
import { OPCIONES_LECTURA_EXCEL, limpiarTexto } from './seguridad.js';
import { serialAISO, slugRazon, normalizarNombre, mascaraDeDias, primerDiaMes, sumarDias } from './devolucionesCalculos.js';

const limpiarNombre = v => limpiarTexto(String(v ?? '').replace(/[{}[\]<>]/g, ' '), 160);
const norm = v => normalizarNombre(v).replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
export const FECHA_MINIMA = '2020-01-01';

/** Número de Excel, texto o fecha → aaaa-mm-dd (o null si no es una fecha). */
export function aFechaISO(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v > 20000 && v < 80000 ? serialAISO(v) : null;
  if (v instanceof Date && !Number.isNaN(v)) return v.toISOString().slice(0, 10);
  const t = String(v).trim();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);                     // día/mes/año (formato de aquí)
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
}
const entero = v => { const n = Number(v); return Number.isFinite(n) ? Math.round(n) : null; };

function buscarCabecera(filas, claves) {
  for (let i = 0; i < Math.min(filas.length, 20); i++) {
    const celdas = (filas[i] || []).map(norm);
    if (claves.every(c => celdas.some(x => x.startsWith(c)))) return { fila: i, celdas };
  }
  return null;
}
const col = (celdas, prefijo) => celdas.findIndex(x => x.startsWith(prefijo));

function nombreHoja(nombres, buscada) {
  return nombres.find(n => norm(n).replace(/ /g, '') === norm(buscada).replace(/ /g, ''));
}

/**
 * @param buffer ArrayBuffer del Excel
 * @param hoyISO fecha de hoy (aaaa-mm-dd): no se aceptan registros de fechas futuras (más de 1 día)
 */
export function parsearDevoluciones(buffer, hoyISO) {
  const nombres = XLSX.read(buffer, { type: 'array', bookSheets: true }).SheetNames || [];
  const hReg = nombreHoja(nombres, 'Registro'), hAsis = nombreHoja(nombres, 'Asistencia_Diaria');
  if (!hReg) throw new Error('No encontré la hoja "Registro" en el Excel. ¿Es el archivo de devoluciones?');
  const wb = XLSX.read(buffer, { ...OPCIONES_LECTURA_EXCEL, sheets: [hReg, hAsis].filter(Boolean) });
  const filasDe = nombre => XLSX.utils.sheet_to_json(wb.Sheets[nombre], { header: 1, raw: true, defval: null });
  const limite = sumarDias(hoyISO, 1);
  const invalidas = [];
  const fechaValida = f => f && f >= FECHA_MINIMA && f <= limite;

  /* ---------- Registro ---------- */
  const filasReg = filasDe(hReg);
  const cab = buscarCabecera(filasReg, ['FECHA', 'CODIGO', 'ID COLABORADOR', 'NOMBRE']);
  if (!cab) throw new Error('En la hoja "Registro" no encontré las columnas Fecha, Código, ID Colaborador y Nombre.');
  const cFecha = col(cab.celdas, 'FECHA'), cCod = col(cab.celdas, 'CODIGO'), cId = col(cab.celdas, 'ID COLABORADOR'), cNom = col(cab.celdas, 'NOMBRE');
  const cMes = col(cab.celdas, 'MES'), cTotal = cab.celdas.findIndex((x, i) => i > cMes && x === 'TOTAL');
  if (cMes < 0 || cTotal < 0) throw new Error('En la hoja "Registro" no encontré las columnas "Mes" y "Total" que encierran las razones.');
  const razones = [];                                    // se conserva el orden y el nombre original de cada razón
  const rawCab = filasReg[cab.fila];
  for (let c = cMes + 1; c < cTotal; c++) { const n = limpiarTexto(rawCab[c], 60); if (n) razones.push({ k: slugRazon(n), n, col: c }); }

  const filasValidas = [];
  let filasLeidas = 0, filasVacias = 0;
  for (let i = cab.fila + 1; i < filasReg.length; i++) {
    const r = filasReg[i];
    if (!r || r[cFecha] == null || r[cFecha] === '') continue;
    filasLeidas++;
    const fecha = aFechaISO(r[cFecha]);
    const nombre = limpiarNombre(r[cNom]);
    if (!fechaValida(fecha)) { invalidas.push({ hoja: 'Registro', fila: i + 1, fecha: fecha || String(r[cFecha]), nombre, motivo: fecha ? 'Fecha fuera de rango' : 'Fecha ilegible' }); continue; }
    const rz = {}; let total = 0;
    for (const x of razones) { const v = entero(r[x.col]); if (v && v > 0) { rz[x.k] = v; total += v; } }
    if (total === 0) { filasVacias++; continue; }
    filasValidas.push({ fecha, id: entero(r[cId]), nombre, codigo: entero(r[cCod]), rz, total, fila: i + 1 });
  }

  /* ---------- Asistencia ---------- */
  const asisFilas = [];
  if (hAsis) {
    const fa = filasDe(hAsis);
    const ca = buscarCabecera(fa, ['FECHA', 'CODIGO']);
    if (ca) {
      const aF = col(ca.celdas, 'FECHA'), aC = col(ca.celdas, 'CODIGO'), aId = col(ca.celdas, 'ID'), aN = col(ca.celdas, 'NOMBRE'), aCol = col(ca.celdas, 'COLABORADOR');
      for (let i = ca.fila + 1; i < fa.length; i++) {
        const r = fa[i];
        if (!r || r[aF] == null || r[aF] === '') continue;
        const fecha = aFechaISO(r[aF]);
        const nombre = limpiarNombre(aCol >= 0 && r[aCol] ? r[aCol] : r[aN]);                 // el nombre "según Asignaciones" manda; si falta, el pegado ya limpio
        const sinCoincidencia = aCol >= 0 && !r[aCol];
        if (!fechaValida(fecha)) { invalidas.push({ hoja: 'Asistencia_Diaria', fila: i + 1, fecha: fecha || String(r[aF]), nombre, motivo: fecha ? 'Fecha fuera de rango' : 'Fecha ilegible' }); continue; }
        if (!nombre && !(entero(r[aId]) > 0)) { invalidas.push({ hoja: 'Asistencia_Diaria', fila: i + 1, fecha, nombre: '', motivo: 'Sin nombre ni ID' }); continue; }
        asisFilas.push({ fecha, nombre, idPegado: aId >= 0 ? entero(r[aId]) : null, codigo: aC >= 0 ? entero(r[aC]) : null, fila: i + 1, sinCoincidencia });
      }
    }
  }

  /* ---------- Unificar personas por nombre (el ID del Registro es el vigente; el de Asistencia solo si no hay otro) ---------- */
  const idPorNombre = new Map(), fechaId = new Map();
  for (const r of filasValidas) {
    const k = norm(r.nombre); if (!k || !(r.id > 0)) continue;
    if (!fechaId.has(k) || r.fecha >= fechaId.get(k)) { fechaId.set(k, r.fecha); idPorNombre.set(k, r.id); }
  }
  const idSoloAsis = new Map(), fechaIdAsis = new Map();
  for (const a of asisFilas) {
    const k = norm(a.nombre); if (!k || !(a.idPegado > 0) || idPorNombre.has(k)) continue;
    if (!fechaIdAsis.has(k) || a.fecha >= fechaIdAsis.get(k)) { fechaIdAsis.set(k, a.fecha); idSoloAsis.set(k, a.idPegado); }
  }
  const idDe = (nombre, idCrudo) => idPorNombre.get(norm(nombre)) ?? idSoloAsis.get(norm(nombre)) ?? (idCrudo > 0 ? idCrudo : null);

  const personas = new Map(), vistoPersona = new Map();
  const anotar = (id, nombre, codigo, fecha) => {
    if (!id) return;
    if (!vistoPersona.has(id) || fecha >= vistoPersona.get(id)) { vistoPersona.set(id, fecha); personas.set(id, { id, nombre: nombre || personas.get(id)?.nombre || `ID ${id}`, codigo: codigo ?? personas.get(id)?.codigo ?? null }); }
  };

  /* Registro → una fila por persona y día (si una persona tiene varias filas el mismo día, se suman) */
  const mapaDias = new Map();
  for (const r of filasValidas) {
    const id = idDe(r.nombre, r.id);
    if (!id) { invalidas.push({ hoja: 'Registro', fila: r.fila, fecha: r.fecha, nombre: r.nombre, motivo: 'Sin ID de colaborador' }); continue; }
    anotar(id, r.nombre, r.codigo, r.fecha);
    const key = `${r.fecha}|${id}`;
    let d = mapaDias.get(key);
    if (!d) mapaDias.set(key, d = { fecha: r.fecha, id, codigo: r.codigo, razones: {}, total: 0, filas: 0 });
    for (const [k, v] of Object.entries(r.rz)) d.razones[k] = (d.razones[k] || 0) + v;
    d.total += r.total; d.filas++; d.codigo = r.codigo ?? d.codigo;
  }
  const dias = [...mapaDias.values()].sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : a.id - b.id));

  /* Asistencia → una fila por persona: lista de días trabajados (luego se agrupa por mes) */
  const diasAsistencia = new Map();                      // id → Set(fecha)
  for (const a of asisFilas) {
    const id = idDe(a.nombre, a.idPegado);
    if (!id) { invalidas.push({ hoja: 'Asistencia_Diaria', fila: a.fila, fecha: a.fecha, nombre: a.nombre, motivo: 'Sin ID de colaborador' }); continue; }
    anotar(id, a.nombre, a.codigo, a.fecha);
    if (!diasAsistencia.has(id)) diasAsistencia.set(id, new Set());
    diasAsistencia.get(id).add(a.fecha);
  }

  // Calidad de la asistencia: se cuenta cada persona-día UNA vez. Esto avisa dónde difiere el Excel original.
  const vistos = new Set(); let duplicadas = 0; const sinCoincidencia = [];
  for (const a of asisFilas) {
    const k = `${norm(a.nombre)}|${a.fecha}`;
    if (vistos.has(k)) duplicadas++; else vistos.add(k);
    if (a.sinCoincidencia && a.nombre) sinCoincidencia.push({ fila: a.fila, fecha: a.fecha, nombre: a.nombre });
  }
  const fechasReg = dias.map(d => d.fecha);
  const fechasAsis = [...diasAsistencia.values()].flatMap(s => [...s]);
  return {
    razones: razones.map(({ k, n }) => ({ k, n })),
    dias, diasAsistencia, personas, invalidas, avisosAsistencia: { sinCoincidencia: sinCoincidencia.slice(0, 20), duplicadas },
    resumen: {
      filasRegistro: filasLeidas, filasVacias, filasValidas: filasValidas.length,
      personaDias: dias.length, devoluciones: dias.reduce((s, d) => s + d.total, 0),
      filasAsistencia: asisFilas.length, asistenciaDuplicada: duplicadas, asistenciaSinCoincidencia: sinCoincidencia.length,
      desdeReg: fechasReg.reduce((m, f) => (m && m < f ? m : f), null), hastaReg: fechasReg.reduce((m, f) => (m && m > f ? m : f), null),
      desdeAsis: fechasAsis.reduce((m, f) => (m && m < f ? m : f), null), hastaAsis: fechasAsis.reduce((m, f) => (m && m > f ? m : f), null)
    }
  };
}

/**
 * Decide QUÉ se carga: la primera vez todo; después solo desde el último día ya guardado
 * (ese último día se vuelve a leer completo por si estaba a medias). Lo anterior se omite.
 * meta = { ultima_fecha_registro, ultima_fecha_asistencia } (nulos = primera carga)
 */
export function prepararCarga(parseado, meta, { reemplazar = false } = {}) {
  const desdeReg = reemplazar ? null : meta?.ultima_fecha_registro || null;
  const desdeAsis = reemplazar ? null : meta?.ultima_fecha_asistencia || null;
  const dias = parseado.dias.filter(d => !desdeReg || d.fecha >= desdeReg);
  const omitidosReg = parseado.dias.length - dias.length;

  const masc = new Map();                                // id|mes → lista de días del mes
  let filasAsisNuevas = 0, omitidosAsis = 0;
  for (const [id, fechas] of parseado.diasAsistencia) {
    for (const f of fechas) {
      if (desdeAsis && f < desdeAsis) { omitidosAsis++; continue; }
      filasAsisNuevas++;
      const key = `${id}|${primerDiaMes(f)}`;
      if (!masc.has(key)) masc.set(key, []);
      masc.get(key).push(Number(f.slice(8, 10)));
    }
  }
  const asistencia = [...masc].map(([key, lista]) => { const [id, mes] = key.split('|'); return { id: Number(id), mes, dias: mascaraDeDias(lista) }; });

  const usados = new Set([...dias.map(d => d.id), ...asistencia.map(a => a.id)]);
  const personas = [...usados].map(id => parseado.personas.get(id)).filter(Boolean);
  const nuevaFecha = dias.length ? dias[dias.length - 1].fecha : null;
  return {
    dias, asistencia, personas, razones: parseado.razones, desdeReg, desdeAsis, reemplazar,
    resumen: {
      primeraVez: !desdeReg && !desdeAsis, reemplazar,
      personaDiasNuevos: dias.length, personaDiasOmitidos: omitidosReg,
      devolucionesNuevas: dias.reduce((s, d) => s + d.total, 0),
      diasAsistenciaNuevos: filasAsisNuevas, diasAsistenciaOmitidos: omitidosAsis,
      desde: desdeReg || parseado.resumen.desdeReg, hasta: nuevaFecha || parseado.resumen.hastaReg,
      personas: personas.length, invalidas: parseado.invalidas.length
    }
  };
}

/** Lo que se manda a la base de datos (nombres cortos para que viaje poco). */
export function armarPayload(carga) {
  return {
    p_personas: carga.personas.map(p => ({ i: p.id, n: p.nombre, c: p.codigo })),
    p_dias: carga.dias.map(d => ({ f: d.fecha, i: d.id, c: d.codigo, r: d.razones, t: d.total, n: d.filas })),
    p_asistencia: carga.asistencia.map(a => ({ i: a.id, m: a.mes, d: a.dias })),
    p_razones: carga.razones,
    p_desde_reg: carga.desdeReg, p_desde_asis: carga.desdeAsis, p_reemplazar: !!carga.reemplazar
  };
}
