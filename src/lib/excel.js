import * as XLSX from 'xlsx';
import { minutosEntreBloque, minutosDescansoAplicable } from './calculos';

/**
 * Lee cualquier libro soportado: .xlsx, .xls (BIFF8) y .xlsb.
 * SheetJS (xlsx) soporta los tres formatos de forma nativa.
 */
function leerLibro(arrayBuffer) {
  return XLSX.read(arrayBuffer, { type: 'array', cellDates: false, raw: true });
}

function normalizar(txt) {
  return String(txt ?? '').trim().toLowerCase();
}

/**
 * Parser único del "Reporte Consolidado Boncheo".
 * El archivo es la exportación de una tabla dinámica: los encabezados NO
 * están siempre en la misma fila/columna, así que los buscamos por texto
 * en vez de asumir posiciones fijas. Estructura esperada de la tabla:
 *
 *   Mesa | Colaborador Id | Colaborador | Hora Acumulada |
 *   Total Tallos | Total Ramos | Rend. Tallos | Rend. Ramos
 *
 * y, en alguna parte de las primeras filas, la celda "Semana Bonchado"
 * con su valor debajo (formato AAAASS, ej. 202636 = año 2026, semana 36).
 */
export function parsearReporteBoncheo(arrayBuffer, { fecha }) {
  const workbook = leerLibro(arrayBuffer);
  const nombreHoja = workbook.SheetNames[0];
  const hoja = workbook.Sheets[nombreHoja];
  const matriz = XLSX.utils.sheet_to_json(hoja, { header: 1, raw: true, defval: null });

  // 1. localizar la fila de encabezados de la tabla (busca "colaborador id")
  let filaHeader = -1;
  const columnas = {};
  for (let r = 0; r < matriz.length; r++) {
    const fila = matriz[r] || [];
    const idx = fila.findIndex(c => normalizar(c) === 'colaborador id');
    if (idx !== -1) {
      filaHeader = r;
      fila.forEach((c, i) => {
        const t = normalizar(c);
        if (t) columnas[t] = i;
      });
      break;
    }
  }
  if (filaHeader === -1) {
    throw new Error('No se encontró la columna "Colaborador Id" en el archivo. Verifica que sea el Reporte Consolidado Boncheo.');
  }

  const colMesa = columnas['mesa'];
  const colId = columnas['colaborador id'];
  const colNombre = columnas['colaborador'];
  const colHora = columnas['hora acumulada'];
  const colTallos = columnas['total tallos'];
  const colRamos = columnas['total ramos'];
  const colRendTallos = columnas['rend. tallos'];
  const colRendRamos = columnas['rend. ramos'];

  // 2. localizar "Semana Bonchado" (el valor está en la fila siguiente, misma columna)
  let semana = null;
  for (let r = 0; r < matriz.length; r++) {
    const fila = matriz[r] || [];
    const idx = fila.findIndex(c => normalizar(c) === 'semana bonchado');
    if (idx !== -1) {
      const valorDebajo = matriz[r + 1]?.[idx];
      if (Number.isFinite(Number(valorDebajo))) semana = Number(valorDebajo);
      break;
    }
  }

  // 3. recorrer filas de datos hasta "Grand Total" o fin de la matriz
  const registros = [];
  for (let r = filaHeader + 1; r < matriz.length; r++) {
    const fila = matriz[r] || [];
    const mesaRaw = fila[colMesa];
    const idRaw = fila[colId];
    const nombreRaw = fila[colNombre];

    if (typeof mesaRaw === 'string' && /grand total/i.test(mesaRaw)) break;
    if ((idRaw === null || idRaw === undefined || idRaw === '') && !nombreRaw) continue;

    const colaboradorId = parseInt(String(idRaw).trim(), 10);
    if (!Number.isFinite(colaboradorId)) continue;

    const mesa = Number.isFinite(Number(mesaRaw)) ? Number(mesaRaw) : null;
    if (mesa === 0) continue; // Código/Mesa = 0 se descarta: no es un registro válido

    const nombre = String(nombreRaw ?? '').trim();

    const horaTexto = String(fila[colHora] ?? '').trim(); // "06:00 - 07:00"
    const [horaInicio, horaFin] = horaTexto.split('-').map(s => s?.trim()).filter(Boolean);

    registros.push({
      fecha,
      colaborador_id: colaboradorId,
      colaborador: nombre,
      mesa,
      hora_inicio: horaInicio || null,
      hora_fin: horaFin || null,
      total_tallos: Number.isFinite(Number(fila[colTallos])) ? Math.round(Number(fila[colTallos])) : 0,
      total_ramos: Number.isFinite(Number(fila[colRamos])) ? Math.round(Number(fila[colRamos])) : 0,
      rend_tallos: Number.isFinite(Number(fila[colRendTallos])) ? Math.round(Number(fila[colRendTallos])) : 0,
      rend_ramos: Number.isFinite(Number(fila[colRendRamos])) ? Math.round(Number(fila[colRendRamos])) : 0,
      semana,
    });
  }

  return { registros, semana, hojaUsada: nombreHoja };
}

/** Exporta resultados ya calculados (no el archivo original) a un .xlsx para descarga. */
export function exportarAExcel(filas, nombreArchivo, nombreHoja = 'Datos') {
  const ws = XLSX.utils.json_to_sheet(filas);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, nombreHoja);
  XLSX.writeFile(wb, nombreArchivo);
}

/**
 * Suma los bloques por hora en un solo total por persona/día — así el
 * Histórico refleja el total real de tallos del día (igual que la columna
 * "Total Unidades" del archivo maestro), no una fila por cada bloque.
 * El tiempo trabajado se calcula solo, sumando la duración de cada bloque
 * de hora (hora_inicio–hora_fin) que traiga el archivo para esa persona.
 */
export function agregarPorPersonaDia(registros, descansos = []) {
  const mapa = new Map();
  const bloquesContados = new Set(); // evita sumar el mismo bloque de horas 2 veces por persona
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
      });
    }
    const acc = mapa.get(key);
    acc.total_tallos += r.total_tallos || 0;
    acc.total_ramos += r.total_ramos || 0;

    const bloqueKey = `${key}_${r.hora_inicio}_${r.hora_fin}`;
    if (!bloquesContados.has(bloqueKey)) {
      bloquesContados.add(bloqueKey);
      const minutosBrutos = minutosEntreBloque(r.hora_inicio, r.hora_fin);
      const descuento = minutosDescansoAplicable(r.hora_inicio, r.hora_fin, descansos);
      acc.tiempo_trabajado_min += Math.max(0, minutosBrutos - descuento);
    }
  }
  return [...mapa.values()];
}
