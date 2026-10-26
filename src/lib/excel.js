import * as XLSX from 'xlsx';
export { agregarPorPersonaDia } from './agregados';           // sigue disponible desde aquí para quien ya lo usaba
import { minutosEntreBloque, minutosDescansoAplicable } from './calculos';
import { OPCIONES_LECTURA_EXCEL, limpiarTexto } from './seguridad.js';
function leerLibro(arrayBuffer) {
  return XLSX.read(arrayBuffer, OPCIONES_LECTURA_EXCEL);
}
function normalizar(txt) {
  return String(txt ?? '').trim().toLowerCase();
}
export function parsearReporteBoncheo(arrayBuffer, {
  fecha
}) {
  const workbook = leerLibro(arrayBuffer);
  const nombreHoja = workbook.SheetNames[0];
  const hoja = workbook.Sheets[nombreHoja];
  const matriz = XLSX.utils.sheet_to_json(hoja, {
    header: 1,
    raw: true,
    defval: null
  });
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
    if (mesa === 0) continue;
    const nombre = String(nombreRaw ?? '').trim();
    const horaTexto = String(fila[colHora] ?? '').trim();
    const [horaInicio, horaFin] = horaTexto.split('-').map(s => s?.trim()).filter(Boolean);
    registros.push({
      fecha,
      colaborador_id: colaboradorId,
      colaborador: limpiarTexto(nombre, 120),
      mesa,
      hora_inicio: horaInicio || null,
      hora_fin: horaFin || null,
      total_tallos: Number.isFinite(Number(fila[colTallos])) ? Math.round(Number(fila[colTallos])) : 0,
      total_ramos: Number.isFinite(Number(fila[colRamos])) ? Math.round(Number(fila[colRamos])) : 0,
      rend_tallos: Number.isFinite(Number(fila[colRendTallos])) ? Math.round(Number(fila[colRendTallos])) : 0,
      rend_ramos: Number.isFinite(Number(fila[colRendRamos])) ? Math.round(Number(fila[colRendRamos])) : 0,
      semana
    });
  }
  return {
    registros,
    semana,
    hojaUsada: nombreHoja
  };
}
/**
 * Lee el reporte de "Activos Boncheo" (o similar): columnas Mesa, Nombre,
 * Emp.Cod, Rol — para cargar el catálogo de Personas de una sola vez.
 */
export function parsearReportePersonas(arrayBuffer) {
  const workbook = leerLibro(arrayBuffer);
  const hoja = workbook.Sheets[workbook.SheetNames[0]];
  const matriz = XLSX.utils.sheet_to_json(hoja, { header: 1, raw: true, defval: null });
  let filaHeader = -1;
  const columnas = {};
  for (let r = 0; r < matriz.length; r++) {
    const fila = matriz[r] || [];
    if (fila.findIndex(c => normalizar(c) === 'mesa') !== -1) {
      filaHeader = r;
      fila.forEach((c, i) => { const t = normalizar(c); if (t) columnas[t] = i; });
      break;
    }
  }
  if (filaHeader === -1) throw new Error('No se encontró la columna "Mesa" en el archivo. Verifica que sea el reporte de Activos Boncheo.');
  const idxMesa = columnas['mesa'];
  const idxNombre = columnas['nombre'];
  const idxEmpCod = columnas['emp.cod'] ?? columnas['emp cod'] ?? columnas['empcod'];
  const idxRol = columnas['rol'];
  if (idxNombre === undefined) throw new Error('No se encontró la columna "Nombre" en el archivo.');
  if (idxEmpCod === undefined) throw new Error('No se encontró la columna "Emp.Cod". Es el código con el que el boncheo identifica a cada persona, así que es obligatorio.');

  const porCodigo = new Map();
  let sinCodigo = 0;
  for (let r = filaHeader + 1; r < matriz.length; r++) {
    const fila = matriz[r] || [];
    const nombre = fila[idxNombre];
    if (!nombre) continue;
    const empCod = Number(String(fila[idxEmpCod] ?? '').trim());
    if (!Number.isInteger(empCod) || empCod <= 0) { sinCodigo++; continue; }
    const mesa = Number(fila[idxMesa]);
    porCodigo.set(empCod, {
      id: empCod,                                   // el boncheo identifica a la persona por su Emp.Cod
      nombre: limpiarTexto(String(nombre).replace(/\{\}/g, ''), 120),
      codigo_empleado: String(empCod),
      mesa: Number.isInteger(mesa) && mesa > 0 ? mesa : null,
      rol: idxRol !== undefined && fila[idxRol] ? limpiarTexto(fila[idxRol], 60) : null,
      activo: true
    });
  }
  const personas = [...porCodigo.values()];
  if (personas.length === 0) throw new Error('No se encontraron personas válidas en el archivo.');
  personas.sinCodigo = sinCodigo;
  return personas;
}

export function exportarAExcel(filas, nombreArchivo, nombreHoja = 'Datos') {
  const ws = XLSX.utils.json_to_sheet(filas);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, nombreHoja);
  XLSX.writeFile(wb, nombreArchivo);
}
