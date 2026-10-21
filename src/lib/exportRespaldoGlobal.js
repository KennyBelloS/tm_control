/**
 * RESPALDO GLOBAL EN EXCEL — infraestructura de presentación (ExcelJS). Recibe los datos ya leídos y arma un libro MUY VISUAL:
 *   Portada (índice con enlaces) · Resumen (tarjetas de cifras, gráficos, barras por tabla) · una hoja por tabla con encabezado de la marca,
 *   filtros, filas alternas, barras de datos y escalas de color · Asistencia en cuadrícula persona × día.
 */
import ExcelJS from 'exceljs/dist/exceljs.min.js';
import { TABLAS, GRUPOS, asistenciaADias, formatoMB, nombreArchivoBackup } from './respaldoGlobal';

const C = { osc: 'FF0B3D22', verde: 'FF166534', claro: 'FFE8F3EC', dorado: 'FFC9932B', gris: 'FF5E6F65', blanco: 'FFFFFFFF', rojo: 'FFC0392B', zebra: 'FFF3F8F5' };
const COLOR_GRUPO = { produccion: 'FF166534', calidad: 'FFC0392B', organizacion: 'FF1F5F8B', sistema: 'FF6B7C71' };
const humanizar = k => String(k).replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
const aCelda = v => (v == null ? null : typeof v === 'object' ? JSON.stringify(v) : v);
const col = n => { let s = ''; for (; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };
const relleno = argb => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });

/** Gráfico de barras como imagen (solo en el navegador; en otros entornos se omite). */
function barrasPng(titulo, etiquetas, valores, color) {
  if (typeof document === 'undefined' || !valores.length) return null;
  const W = 960, H = 330, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'); if (!g) return null;
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.fillStyle = '#0B3D22'; g.font = 'bold 20px sans-serif'; g.fillText(titulo, 24, 34);
  const max = Math.max(...valores, 1), x0 = 70, y0 = H - 46, ancho = W - x0 - 24, alto = y0 - 62, bw = ancho / valores.length;
  g.strokeStyle = '#DDE5DF'; g.fillStyle = '#6B7C71'; g.font = '12px sans-serif';
  for (let i = 0; i <= 4; i++) { const y = y0 - (alto * i) / 4; g.beginPath(); g.moveTo(x0, y); g.lineTo(W - 24, y); g.stroke(); g.fillText(Math.round((max * i) / 4).toLocaleString('es-CO'), 8, y + 4); }
  valores.forEach((v, i) => { const h = (v / max) * alto; g.fillStyle = color; g.fillRect(x0 + i * bw + bw * 0.12, y0 - h, bw * 0.76, h); });
  g.fillStyle = '#6B7C71'; const paso = Math.ceil(valores.length / 12); etiquetas.forEach((e, i) => { if (i % paso === 0) g.fillText(e, x0 + i * bw, y0 + 18); });
  return cv.toDataURL('image/png');
}

/** Una hoja de tabla con el estilo de la marca. cols: [{ header, width, fmt }]  filas: arreglos. */
function hojaTabla(wb, nombre, titulo, grupo, cols, filas, { barras = [], escala = [] } = {}) {
  const ws = wb.addWorksheet(nombre, { properties: { tabColor: { argb: COLOR_GRUPO[grupo] || C.verde } }, views: [{ state: 'frozen', ySplit: 3, showGridLines: false }] });
  const n = Math.max(cols.length, 4);
  ws.mergeCells(1, 1, 1, n); const t = ws.getCell(1, 1); t.value = titulo; t.font = { name: 'Calibri', bold: true, size: 15, color: { argb: C.blanco } }; t.fill = relleno(COLOR_GRUPO[grupo] || C.verde); t.alignment = { vertical: 'middle', indent: 1 }; ws.getRow(1).height = 30;
  ws.mergeCells(2, 1, 2, n); const s = ws.getCell(2, 1); s.value = `${filas.length.toLocaleString('es-CO')} filas · ${GRUPOS[grupo] || ''} · respaldo del ${new Date().toLocaleString('es-CO')}`; s.font = { size: 10, italic: true, color: { argb: C.gris } }; s.alignment = { indent: 1 };
  const h = ws.getRow(3); h.height = 24;
  cols.forEach((c, i) => { const x = h.getCell(i + 1); x.value = c.header; x.font = { bold: true, color: { argb: C.blanco }, size: 11 }; x.fill = relleno(C.osc); x.alignment = { vertical: 'middle', horizontal: c.fmt ? 'right' : 'left', wrapText: true }; ws.getColumn(i + 1).width = c.width || 14; if (c.fmt) ws.getColumn(i + 1).numFmt = c.fmt; });
  if (filas.length) ws.addRows(filas);
  const ultima = Math.max(4, filas.length + 3);
  ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: cols.length } };
  ws.addConditionalFormatting({ ref: `A4:${col(cols.length)}${ultima}`, rules: [{ type: 'expression', formulae: ['MOD(ROW(),2)=0'], style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: C.zebra } } } }] });
  for (const i of barras) ws.addConditionalFormatting({ ref: `${col(i + 1)}4:${col(i + 1)}${ultima}`, rules: [{ type: 'dataBar', cfvo: [{ type: 'min' }, { type: 'max' }], color: { argb: 'FF7CC59A' }, gradient: false, showValue: true }] });
  for (const i of escala) ws.addConditionalFormatting({ ref: `${col(i + 1)}4:${col(i + 1)}${ultima}`, rules: [{ type: 'colorScale', cfvo: [{ type: 'min' }, { type: 'percentile', value: 50 }, { type: 'max' }], color: [{ argb: 'FFF8696B' }, { argb: 'FFFFEB84' }, { argb: 'FF63BE7B' }] }] });
  return ws;
}

/** Arma las columnas y filas de una tabla: nombres legibles, la persona junto a su ID y columnas calculadas. */
function prepararTabla(def, filas, ctx) {
  const t = def.tabla; if (!filas.length) return { cols: [{ header: 'Sin datos', width: 20 }], filas: [], barras: [], escala: [] };
  let keys = Object.keys(filas[0]); const conPersona = keys.includes('colaborador_id') && ctx.personas.size > 0;
  let cols = [], extra = []; const barras = [], escala = [];
  if (t === 'devoluciones_dia') {
    const razones = [...new Set(filas.flatMap(f => Object.keys(f.razones || {})))].sort(); keys = keys.filter(k => k !== 'razones');
    extra = razones.map(k => ({ header: ctx.razonNombre.get(k) || humanizar(k), get: f => (f.razones || {})[k] ?? 0, fmt: '0', width: 13, escala: true }));
  }
  keys.forEach(k => { cols.push({ header: humanizar(k), get: f => aCelda(f[k]), width: /fecha|mes|creado|actualizado|cargado/.test(k) ? 14 : /nombre|titulo|clave/.test(k) ? 28 : 13, fmt: typeof filas[0][k] === 'number' ? '#,##0.##' : undefined }); if (k === 'colaborador_id' && conPersona) cols.push({ header: 'Persona', get: f => ctx.personas.get(f.colaborador_id) ?? '', width: 30 }); });
  if (/^rendimiento_(historico|actual)$/.test(t) && keys.includes('total_tallos') && keys.includes('tiempo_trabajado_min')) extra.push({ header: 'Rend. t/h', get: f => (f.tiempo_trabajado_min > 0 ? Math.round(f.total_tallos / (f.tiempo_trabajado_min / 60)) : null), fmt: '#,##0', width: 11, escala: true });
  cols = [...cols, ...extra];
  cols.forEach((c, i) => { if (c.escala) escala.push(i); });
  if (keys.includes('total_tallos')) barras.push(cols.findIndex(c => c.header === 'Total tallos')); if (keys.includes('tallos') && /clasificacion/.test(t)) barras.push(cols.findIndex(c => c.header === 'Tallos'));
  if (t === 'devoluciones_dia') { const i = cols.findIndex(c => c.header === 'Total'); if (i >= 0) escala.push(i); }
  return { cols, filas: filas.map(f => cols.map(c => c.get(f))), barras: barras.filter(i => i >= 0), escala };
}

/** Asistencia: una cuadrícula persona × día (verde = vino). */
function hojaAsistencia(wb, filas, ctx) {
  const dias = new Set(), por = new Map();
  for (const a of filas) for (const f of asistenciaADias(a.mes, a.dias)) { dias.add(f); if (!por.has(a.colaborador_id)) por.set(a.colaborador_id, new Set()); por.get(a.colaborador_id).add(f); }
  const fechas = [...dias].sort(), ids = [...por.keys()].sort((a, b) => (ctx.codigos.get(a) ?? 1e9) - (ctx.codigos.get(b) ?? 1e9));
  const cols = [{ header: 'Código', width: 9 }, { header: 'Persona', width: 32 }, { header: 'Días', width: 7, fmt: '0' }, ...fechas.map(f => ({ header: f.slice(8) + '/' + f.slice(5, 7), width: 5.2, fmt: '0' }))];
  const rows = ids.map(id => [ctx.codigos.get(id) ?? '', ctx.personas.get(id) ?? `ID ${id}`, por.get(id).size, ...fechas.map(f => (por.get(id).has(f) ? 1 : null))]);
  const ws = hojaTabla(wb, 'Asistencia', 'Asistencia diaria (verde = vino)', 'calidad', cols, rows);
  if (fechas.length && rows.length) ws.addConditionalFormatting({ ref: `D4:${col(cols.length)}${rows.length + 3}`, rules: [{ type: 'cellIs', operator: 'equal', formulae: ['1'], style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FF63BE7B' } }, font: { color: { argb: 'FF63BE7B' } } } }] });
  return ws;
}

export async function generarRespaldoGlobalExcel({ datos, filas, uso, limiteMB, usuario, descargar = true }) {
  const wb = new ExcelJS.Workbook(); wb.creator = 'Torremolinos · TMControl'; wb.created = new Date(); wb.title = 'Respaldo global de la base de datos';
  const personas = new Map((datos.personas || []).map(p => [p.id, p.nombre])); for (const p of datos.devoluciones_personas || []) if (!personas.has(p.colaborador_id)) personas.set(p.colaborador_id, p.nombre);
  const codigos = new Map((datos.devoluciones_personas || []).map(p => [p.colaborador_id, p.codigo]));
  const ctx = { personas, codigos, razonNombre: new Map(((datos.devoluciones_meta || [])[0]?.razones || []).map(r => [r.k, r.n])) };
  const ahora = new Date(), total = Object.values(filas).reduce((s, n) => s + n, 0), porc = limiteMB > 0 ? (uso / limiteMB) * 100 : 0;

  // ---------- PORTADA ----------
  const p = wb.addWorksheet('Portada', { properties: { tabColor: { argb: C.dorado } }, views: [{ showGridLines: false }] });
  p.columns = [{ width: 3 }, { width: 34 }, { width: 22 }, { width: 16 }, { width: 44 }];
  p.mergeCells('B2:E3'); Object.assign(p.getCell('B2'), { value: 'TORREMOLINOS · TMCONTROL', font: { bold: true, size: 26, color: { argb: C.blanco } }, fill: relleno(C.osc), alignment: { vertical: 'middle', indent: 1 } });
  p.mergeCells('B4:E4'); Object.assign(p.getCell('B4'), { value: 'Respaldo global de la base de datos', font: { bold: true, size: 15, color: { argb: C.blanco } }, fill: relleno(C.verde), alignment: { indent: 1, vertical: 'middle' } }); p.getRow(4).height = 26;
  [['Generado', ahora.toLocaleString('es-CO')], ['Por', usuario || '—'], ['Filas respaldadas', total.toLocaleString('es-CO')], ['Base de datos usada', `${formatoMB(uso)} de ${formatoMB(limiteMB)} (${porc.toFixed(1).replace('.', ',')} %)`]].forEach(([a, b], i) => { const r = 6 + i; p.getCell(`B${r}`).value = a; p.getCell(`B${r}`).font = { bold: true, color: { argb: C.gris } }; p.mergeCells(`C${r}:E${r}`); p.getCell(`C${r}`).value = b; p.getCell(`C${r}`).font = { size: 12, bold: true }; });
  p.getCell('B11').value = 'CONTENIDO (clic para ir a la hoja)'; p.getCell('B11').font = { bold: true, size: 12, color: { argb: C.verde } };
  ['Hoja', 'Grupo', 'Filas', 'Qué contiene'].forEach((h, i) => { const c = p.getCell(12, 2 + i); c.value = h; c.font = { bold: true, color: { argb: C.blanco } }; c.fill = relleno(C.osc); });
  let r = 13; const entradas = [{ hoja: 'Resumen', grupo: 'sistema', filas: '', titulo: 'Cifras, gráficos y filas por tabla' }, ...TABLAS.map(t => ({ hoja: t.hoja, grupo: t.grupo, filas: filas[t.tabla] ?? 0, titulo: t.titulo }))];
  for (const e of entradas) { p.getCell(r, 2).value = { text: e.hoja, hyperlink: `#'${e.hoja}'!A1` }; p.getCell(r, 2).font = { color: { argb: 'FF1F5F8B' }, underline: true }; p.getCell(r, 3).value = GRUPOS[e.grupo]; p.getCell(r, 3).font = { color: { argb: COLOR_GRUPO[e.grupo] }, bold: true }; p.getCell(r, 4).value = e.filas; p.getCell(r, 4).numFmt = '#,##0'; p.getCell(r, 5).value = e.titulo; p.getCell(r, 5).font = { color: { argb: C.gris } }; if (r % 2 === 0) for (let c = 2; c <= 5; c++) p.getCell(r, c).fill = relleno(C.zebra); r++; }
  p.mergeCells(`B${r + 1}:E${r + 2}`); Object.assign(p.getCell(`B${r + 1}`), { value: 'Este archivo contiene TODA la información guardada en la base de datos. Consérvalo en un lugar seguro: es la única copia de lo que se elimine de la base.', font: { italic: true, color: { argb: C.rojo } }, alignment: { wrapText: true, vertical: 'top' } });

  // ---------- RESUMEN ----------
  const R = wb.addWorksheet('Resumen', { properties: { tabColor: { argb: C.dorado } }, views: [{ showGridLines: false }] });
  R.columns = Array.from({ length: 12 }, () => ({ width: 15 }));
  R.mergeCells('A1:L1'); Object.assign(R.getCell('A1'), { value: 'Resumen del respaldo', font: { bold: true, size: 18, color: { argb: C.blanco } }, fill: relleno(C.osc), alignment: { indent: 1, vertical: 'middle' } }); R.getRow(1).height = 34;
  const hist = datos.rendimiento_historico || [], fechasH = hist.map(h => h.fecha).filter(Boolean).sort(), dev = (datos.devoluciones_dia || []).reduce((s, d) => s + (d.total || 0), 0), tallos = hist.reduce((s, h) => s + (h.total_tallos || 0), 0);
  const tarjetas = [['Filas respaldadas', total.toLocaleString('es-CO')], ['Tablas', String(TABLAS.length)], ['Histórico desde', fechasH[0] || '—'], ['Histórico hasta', fechasH[fechasH.length - 1] || '—'], ['Tallos en el histórico', tallos.toLocaleString('es-CO')], ['Devoluciones registradas', dev.toLocaleString('es-CO')]];
  tarjetas.forEach(([a, b], i) => { const c0 = 1 + i * 2; R.mergeCells(3, c0, 3, c0 + 1); R.mergeCells(4, c0, 5, c0 + 1); const x = R.getCell(3, c0); x.value = a; x.font = { size: 10, bold: true, color: { argb: C.gris } }; x.fill = relleno(C.claro); x.alignment = { horizontal: 'center' }; const y = R.getCell(4, c0); y.value = b; y.font = { size: 18, bold: true, color: { argb: C.verde } }; y.fill = relleno(C.claro); y.alignment = { horizontal: 'center', vertical: 'middle' }; });
  R.getRow(3).height = 20; R.getRow(4).height = 22; R.getRow(5).height = 22;
  // gráficos
  const porDia = (lista, campo) => { const m = new Map(); for (const x of lista) if (x.fecha) m.set(x.fecha, (m.get(x.fecha) || 0) + (x[campo] || 0)); return [...m].sort((a, b) => (a[0] < b[0] ? -1 : 1)).slice(-60); };
  const g1 = porDia(hist, 'total_tallos'), g2 = porDia(datos.devoluciones_dia || [], 'total');
  const img1 = barrasPng('Tallos por día (últimos 60 días)', g1.map(x => x[0].slice(8) + '/' + x[0].slice(5, 7)), g1.map(x => x[1]), '#2E8C4E'), img2 = barrasPng('Devoluciones por día (últimos 60 días)', g2.map(x => x[0].slice(8) + '/' + x[0].slice(5, 7)), g2.map(x => x[1]), '#C0392B');
  let fila = 7; for (const img of [img1, img2]) if (img) { const id = wb.addImage({ base64: img, extension: 'png' }); R.addImage(id, { tl: { col: 0, row: fila - 1 }, ext: { width: 900, height: 310 } }); fila += 17; }
  R.getCell(fila, 1).value = 'Filas por tabla'; R.getCell(fila, 1).font = { bold: true, size: 13, color: { argb: C.verde } }; fila++;
  ['Tabla', '', 'Grupo', '', 'Filas', '¿Se elimina?'].forEach((h, i) => { if (h || i % 2 === 0) { const c = R.getCell(fila, 1 + i); c.value = h; c.font = { bold: true, color: { argb: C.blanco } }; c.fill = relleno(C.osc); } });
  const f0 = fila + 1; TABLAS.forEach((t, i) => { const rr = f0 + i; R.mergeCells(rr, 1, rr, 2); R.mergeCells(rr, 3, rr, 4); R.getCell(rr, 1).value = t.hoja; R.getCell(rr, 3).value = GRUPOS[t.grupo]; R.getCell(rr, 3).font = { color: { argb: COLOR_GRUPO[t.grupo] }, bold: true }; R.getCell(rr, 5).value = filas[t.tabla] ?? 0; R.getCell(rr, 5).numFmt = '#,##0'; R.getCell(rr, 6).value = t.vaciar ? 'Sí' : 'No, se conserva'; R.getCell(rr, 6).font = { bold: true, color: { argb: t.vaciar ? C.rojo : C.verde } }; });
  R.addConditionalFormatting({ ref: `E${f0}:E${f0 + TABLAS.length - 1}`, rules: [{ type: 'dataBar', cfvo: [{ type: 'min' }, { type: 'max' }], color: { argb: 'FF7CC59A' }, gradient: false, showValue: true }] });

  // ---------- UNA HOJA POR TABLA ----------
  for (const def of TABLAS) {
    if (def.tabla === 'devoluciones_asistencia') { hojaAsistencia(wb, datos[def.tabla] || [], ctx); continue; }
    const pr = prepararTabla(def, datos[def.tabla] || [], ctx);
    hojaTabla(wb, def.hoja, def.titulo, def.grupo, pr.cols, pr.filas, { barras: pr.barras, escala: pr.escala });
  }
  const nombre = nombreArchivoBackup(ahora);
  const buffer = await wb.xlsx.writeBuffer();
  if (descargar && typeof document !== 'undefined') {
    const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const a = document.createElement('a'); a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  return { nombre, bytes: buffer.byteLength, buffer, hojas: wb.worksheets.map(w => w.name), filas };
}
