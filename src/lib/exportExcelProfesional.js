import ExcelJS from 'exceljs/dist/exceljs.min.js';
import { calcularPorcentajeMeta, clasificarEstado } from './calculos';

const VERDE_MARCA = 'FF166534';
const VERDE_CLARO = 'FFDCFCE7';
const AMBAR_CLARO = 'FFFEF3C7';
const ROJO_CLARO = 'FFFBE3E7';
const GRIS_CLARO = 'FFF3F4F6';
const BLANCO = 'FFFFFFFF';

function estiloEncabezadoHoja(ws, titulo, subtitulo, ultimaCol) {
  ws.mergeCells(`A1:${ultimaCol}1`);
  const t = ws.getCell('A1');
  t.value = titulo;
  t.font = { bold: true, size: 16, color: { argb: BLANCO } };
  t.alignment = { vertical: 'middle', horizontal: 'left' };
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERDE_MARCA } };
  ws.getRow(1).height = 30;

  ws.mergeCells(`A2:${ultimaCol}2`);
  const s = ws.getCell('A2');
  s.value = subtitulo;
  s.font = { italic: true, size: 10, color: { argb: 'FF4B5563' } };
  ws.getRow(2).height = 20;
}

function estiloFilaEncabezadoTabla(row) {
  row.eachCell(cell => {
    cell.font = { bold: true, color: { argb: BLANCO }, size: 10.5 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERDE_MARCA } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
  row.height = 22;
}

function aplicarZebraYBordes(ws, filaInicio, filaFin, colInicio, colFin) {
  for (let r = filaInicio; r <= filaFin; r++) {
    const row = ws.getRow(r);
    const esPar = (r - filaInicio) % 2 === 1;
    for (let c = colInicio; c <= colFin; c++) {
      const cell = row.getCell(c);
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      };
      if (esPar) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRIS_CLARO } };
      cell.alignment = { vertical: 'middle', ...(c === 2 ? { horizontal: 'left' } : { horizontal: 'center' }) };
    }
  }
}

function estadoColorFill(estadoCss) {
  if (estadoCss === 'success') return VERDE_CLARO;
  if (estadoCss === 'warning') return AMBAR_CLARO;
  return ROJO_CLARO;
}

async function descargar(workbook, nombreArchivo) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Genera un Excel profesional de UN SOLO tema: Histórico o Turno Actual,
 * nunca los dos juntos en el mismo archivo.
 */
export async function exportarExcelProfesional({ tipo, filas, cfg, fecha }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Torremolinos · TMControl';
  wb.created = new Date();
  const metaHora = cfg?.metaHora || 470;
  const generado = new Date().toLocaleString('es-CO');

  if (tipo === 'historico') {
    const ws = wb.addWorksheet('Histórico', { views: [{ state: 'frozen', ySplit: 4 }] });
    ws.columns = [{ width: 10 }, { width: 32 }, { width: 13 }, { width: 14 }, { width: 16 }, { width: 12 }, { width: 12 }, { width: 22 }];
    estiloEncabezadoHoja(ws, 'TORREMOLINOS · REPORTE DE RENDIMIENTOS — HISTÓRICO',
      `Generado el ${generado} · Fecha: ${fecha} · Meta por hora: ${metaHora} tallos`, 'H');

    const header = ws.addRow(['Id', 'Colaborador', 'Fecha', 'Total Tallos', 'Tiempo Trabajado', 'Tiempo Real (h)', 'Rendimiento', 'Estado']);
    estiloFilaEncabezadoTabla(header);

    let fila = 5;
    for (const r of filas) {
      const pct = r.tiempo_trabajado_min ? calcularPorcentajeMeta(r.rendimiento, metaHora) : null;
      const estado = pct !== null ? clasificarEstado(pct) : null;
      const row = ws.addRow([
        r.colaborador_id, r.colaborador, r.fecha, r.total_tallos,
        r.tiempo_trabajado_min ? `${Math.round((r.tiempo_trabajado_min / 60) * 100) / 100} h` : 'Sin registrar',
        r.tiempo_trabajado_min ? r.tiempo_real_horas : '—',
        r.tiempo_trabajado_min ? r.rendimiento : '—',
        estado ? estado.label : 'Falta tiempo',
      ]);
      if (estado) {
        row.getCell(8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: estadoColorFill(estado.css) } };
        row.getCell(8).font = { bold: true };
      }
      fila++;
    }
    aplicarZebraYBordes(ws, 5, fila - 1, 1, 8);
  } else {
    const ws = wb.addWorksheet('Turno Actual', { views: [{ state: 'frozen', ySplit: 4 }] });
    ws.columns = [{ width: 10 }, { width: 32 }, { width: 12 }, { width: 12 }, { width: 16 }, { width: 14 }, { width: 10 }, { width: 12 }, { width: 10 }, { width: 22 }];
    estiloEncabezadoHoja(ws, 'TORREMOLINOS · REPORTE DE RENDIMIENTOS — TURNO ACTUAL',
      `Generado el ${generado} · Fecha: ${fecha} · Meta por hora: ${metaHora} tallos`, 'J');

    const header = ws.addRow(['Id', 'Colaborador', 'Fecha', 'Código', 'Bloque', 'Tiempo Trabajado', 'Tallos', 'Rendimiento', '% Meta', 'Estado']);
    estiloFilaEncabezadoTabla(header);

    let fila = 5;
    for (const r of filas) {
      const pct = calcularPorcentajeMeta(r.rendimiento, metaHora);
      const estado = clasificarEstado(pct);
      const row = ws.addRow([
        r.colaborador_id, r.colaborador, r.fecha, r.mesa ?? '—', `${r.hora_inicio}–${r.hora_fin}`,
        `${r.tiempo_real_horas} h`, r.total_tallos, r.rendimiento, `${pct.toFixed(2)}%`, estado.label,
      ]);
      row.getCell(10).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: estadoColorFill(estado.css) } };
      row.getCell(10).font = { bold: true };
      fila++;
    }
    aplicarZebraYBordes(ws, 5, fila - 1, 1, 10);
  }

  const nombre = tipo === 'historico' ? 'historico' : 'turno_actual';
  await descargar(wb, `torremolinos_${nombre}_${fecha}.xlsx`);
}
