// Lógica PURA de Clasificación (sin base de datos): leer el Excel, agrupar por
// hora y armar la comparación hoy vs ayer. Separada para poder probarla sola.
import * as XLSX from 'xlsx';

const sinAcentos = t => String(t ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

/** Fecha en hora LOCAL (toISOString usa UTC y después de las 7 p.m. marcaría mañana). */
export function fechaLocalISO(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function formatoFecha(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
/** 15 → "3 a 4 pm", 5 → "5 a 6 am". Internamente la hora es el bloque 15:00–15:59. */
export function etiquetaHora(h) {
  const a = h % 12 === 0 ? 12 : h % 12;
  const fin = h + 1;
  const b = fin % 12 === 0 ? 12 : fin % 12;
  const sufijo = fin >= 12 && fin < 24 ? 'pm' : 'am';
  return `${a} a ${b} ${sufijo}`;
}
export function minutosAHora(min) {
  const m = Math.min(Math.max(min, 0), 1439);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
export function horaAMinutos(txt) {
  const m = String(txt || '').match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = Number(m[1]), mi = Number(m[2]);
  return h > 23 || mi > 59 ? null : h * 60 + mi;
}

function minutosDeCelda(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return Math.round((v % 1) * 1440) % 1440; // fracción de día de Excel
  return horaAMinutos(String(v).trim());
}

/** Lee el "Reporte de movimiento de clasificación": Mesa (= línea), Hora Salida, Total Tallos. */
export function parsearMovimientosClasificacion(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: false, raw: true });
  const hoja = wb.Sheets[wb.SheetNames[0]];
  const matriz = XLSX.utils.sheet_to_json(hoja, { header: 1, raw: true, defval: null });
  let filaHeader = -1, iMesa = -1, iHora = -1, iTallos = -1;
  for (let r = 0; r < Math.min(matriz.length, 30); r++) {
    const fila = (matriz[r] || []).map(sinAcentos);
    const m = fila.findIndex(c => c === 'mesa' || c === 'linea');
    const h = fila.findIndex(c => c.includes('hora'));
    const t = fila.findIndex(c => c.includes('tallos'));
    if (m !== -1 && h !== -1 && t !== -1) { filaHeader = r; iMesa = m; iHora = h; iTallos = t; break; }
  }
  if (filaHeader === -1) {
    throw new Error('No encontré las columnas "Mesa", "Hora Salida" y "Total Tallos". Verifica que sea el Reporte de movimiento de clasificación.');
  }
  const movimientos = [];
  let ignoradas = 0;
  for (let r = filaHeader + 1; r < matriz.length; r++) {
    const fila = matriz[r] || [];
    if (fila.every(c => c == null || c === '')) continue;
    const linea = Number(fila[iMesa]);
    const minutos = minutosDeCelda(fila[iHora]);
    const tallos = Number(fila[iTallos]);
    if (!Number.isFinite(linea) || linea <= 0 || minutos == null || !Number.isFinite(tallos)) { ignoradas++; continue; }
    movimientos.push({ linea: Math.round(linea), minutos, tallos: Math.round(tallos) });
  }
  if (movimientos.length === 0) throw new Error('El archivo no tiene movimientos válidos.');
  return { movimientos, ignoradas };
}

/**
 * Agrupa los movimientos por línea y por hora.
 * corteMin = hora del reporte en minutos. Se registra todo lo que salió ANTES
 * de ese minuto: reporte de las 7:00 → se registra hasta las 6:59 y la última
 * hora es "6 a 7 am" (completa). Con 10:49 → última hora "10 a 11 am" EN CURSO.
 * corteMin = null → todo el archivo.
 */
export function resumirMovimientos(movimientos, corteMin = null) {
  const minutoMaximo = Math.max(...movimientos.map(m => m.minutos));
  const corte = corteMin == null ? minutoMaximo + 1 : corteMin;
  const incluidos = movimientos.filter(m => m.minutos < corte);
  const ultimaHora = Math.floor((corte - 1) / 60);
  const parcial = corte % 60 !== 0;
  const horaInicial = incluidos.length ? Math.min(...incluidos.map(m => Math.floor(m.minutos / 60))) : ultimaHora;
  const lineas = [...new Set(incluidos.map(m => m.linea))].sort((a, b) => a - b);
  const acumulado = new Map();
  for (const m of incluidos) {
    const k = `${m.linea}|${Math.floor(m.minutos / 60)}`;
    const a = acumulado.get(k) || { tallos: 0, movimientos: 0 };
    a.tallos += m.tallos; a.movimientos += 1;
    acumulado.set(k, a);
  }
  const filas = [];
  for (const l of lineas) {
    for (let h = horaInicial; h <= ultimaHora; h++) {
      const a = acumulado.get(`${l}|${h}`) || { tallos: 0, movimientos: 0 };
      filas.push({ linea: l, hora: h, tallos: a.tallos, movimientos: a.movimientos });
    }
  }
  return {
    filas, lineas, horaInicial, ultimaHora, parcial, corteMin: corte, minutoMaximo,
    movimientosIncluidos: incluidos.length, excluidos: movimientos.length - incluidos.length,
    totalTallos: incluidos.reduce((s, m) => s + m.tallos, 0)
  };
}

// La tabla siempre muestra la jornada completa (5 a 6 am … 10 a 11 pm), haya o no datos en cada hora.
export const HORA_INICIO_JORNADA = 5;
export const HORA_FIN_JORNADA = 22;

/**
 * Compara el día de hoy contra el anterior, hora a hora — SOLO CON DATOS REALES (nada estimado).
 * - 'mejor' (verde): hoy movió MÁS que ayer en esa hora. 'peor' (rojo): menos. 'igual': lo mismo.
 * - 'curso': la hora que todavía no termina. Se muestra su valor real, pero no se compara
 *   (ayer ya la terminó y hoy aún no: compararlas sería injusto).
 * - 'futuro': horas que todavía no llegan (se ven como "—", nunca en rojo).
 * - La diferencia del día usa solo las HORAS COMPLETAS: hoy − ayer en esas mismas horas.
 */
export function armarComparacion({ fechaHoy, fechaAyer, cargaHoy, cargaAyer, filasHoy = [], filasAyer = [] }) {
  const todas = [...filasHoy, ...filasAyer];
  if (todas.length === 0) return { vacio: true, fechaHoy, fechaAyer, cargaHoy, cargaAyer };
  const lineas = [...new Set(todas.map(f => f.linea))].sort((a, b) => a - b);
  const ultimaHoy = cargaHoy ? cargaHoy.ultima_hora : (filasHoy.length ? Math.max(...filasHoy.map(f => f.hora)) : -1);
  const parcial = !!cargaHoy?.parcial;
  const fraccion = parcial ? (cargaHoy.corte_min % 60) / 60 : 1;      // solo se usa para el promedio por hora (tiempo trabajado)
  const ultimaCompletaHora = parcial ? ultimaHoy - 1 : ultimaHoy;
  const horaMin = Math.min(HORA_INICIO_JORNADA, ...todas.map(f => f.hora));
  const horaMax = Math.max(HORA_FIN_JORNADA, ...todas.map(f => f.hora));
  const horas = [];
  for (let h = horaMin; h <= horaMax; h++) horas.push(h);
  const indexar = filas => { const m = new Map(); filas.forEach(f => m.set(`${f.linea}|${f.hora}`, f.tallos)); return m; };
  const mHoy = indexar(filasHoy), mAyer = indexar(filasAyer);
  const veredicto = (hoy, ayer) => (!fechaAyer ? 'neutro' : hoy > ayer ? 'mejor' : hoy < ayer ? 'peor' : 'igual');

  const celdasBase = l => horas.map(h => ({ hora: h, hoy: mHoy.get(`${l}|${h}`) || 0, ayer: mAyer.get(`${l}|${h}`) || 0 }));

  const resumir = (clave, base) => {
    let accHoy = 0, accAyer = 0, hoyCompletas = 0, ayerCompletas = 0;
    const celdas = base.map(b => {
      const futura = b.hora > ultimaHoy;
      const enCurso = parcial && b.hora === ultimaHoy;
      const completa = !futura && !enCurso;
      if (!futura) accHoy += b.hoy;
      accAyer += b.ayer;
      if (completa) { hoyCompletas += b.hoy; ayerCompletas += b.ayer; }
      return {
        hora: b.hora, hoy: b.hoy, ayer: b.ayer, parcial: enCurso,
        estado: futura ? 'futuro' : enCurso ? 'curso' : veredicto(b.hoy, b.ayer),
        diferencia: completa ? b.hoy - b.ayer : 0,
        acumHoy: futura ? null : accHoy,
        acumAyer: accAyer,
        acumEstado: futura ? 'futuro' : enCurso ? 'curso' : veredicto(accHoy, accAyer),
        acumDiferencia: completa ? accHoy - accAyer : 0
      };
    });
    const hayCompletas = ultimaCompletaHora >= horaMin && celdas.some(c => c.estado !== 'futuro' && c.estado !== 'curso');
    // Promedio por hora: desde la primera hora en que HOY hubo movimiento
    const primera = celdas.find(c => c.estado !== 'futuro' && c.hoy > 0);
    const horasTranscurridas = primera ? Math.max((ultimaHoy - primera.hora + 1) - (parcial ? 1 - fraccion : 0), 0) : 0;
    const vivas = celdas.filter(c => c.estado !== 'futuro');
    const pico = vivas.reduce((m, c) => (c.hoy > (m?.hoy ?? 0) ? c : m), null);
    const celdaCompleta = [...celdas].reverse().find(c => c.hora === ultimaCompletaHora && c.estado !== 'futuro' && c.estado !== 'curso') || null;
    const celdaUltima = vivas.length ? vivas[vivas.length - 1] : null;
    return {
      linea: clave, celdas,
      totalHoy: accHoy,                 // lo que lleva hoy (real, incluye la hora en curso)
      totalAyer: accAyer,               // el total real del día anterior
      hoyCompletas, ayerCompletas,      // base de la comparación: solo horas completas, ambos reales
      diferencia: hoyCompletas - ayerCompletas,
      estado: hayCompletas ? veredicto(hoyCompletas, ayerCompletas) : 'neutro',
      primeraHora: primera ? primera.hora : null,
      horasTranscurridas: Math.round(horasTranscurridas * 100) / 100,
      promedioHora: horasTranscurridas >= 0.25 ? Math.round(accHoy / horasTranscurridas) : null,
      pico: pico ? { hora: pico.hora, tallos: pico.hoy } : null,
      ultimaCompleta: celdaCompleta ? { hora: celdaCompleta.hora, hoy: celdaCompleta.hoy, ayer: celdaCompleta.ayer, estado: celdaCompleta.estado } : null,
      ultimaCelda: celdaUltima ? { hora: celdaUltima.hora, hoy: celdaUltima.hoy, ayer: celdaUltima.ayer, estado: celdaUltima.estado, parcial: celdaUltima.parcial, diferencia: celdaUltima.diferencia } : null
    };
  };

  const basesLinea = lineas.map(celdasBase);
  const baseTotal = horas.map((h, i) => basesLinea.reduce(
    (t, b) => ({ hora: h, hoy: t.hoy + b[i].hoy, ayer: t.ayer + b[i].ayer }),
    { hora: h, hoy: 0, ayer: 0 }
  ));
  const porLinea = lineas.map((l, i) => resumir(l, basesLinea[i]));
  const total = resumir(null, baseTotal);
  return { vacio: false, fechaHoy, fechaAyer, cargaHoy, cargaAyer, ultimaHoy, ultimaCompletaHora, parcial, fraccion, horas, lineas, porLinea, total };
}
