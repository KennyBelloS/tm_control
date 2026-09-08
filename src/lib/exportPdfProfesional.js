import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { calcularPorcentajeMeta, clasificarEstado, agregarRankingPorPersona } from './calculos';
import logoUrl from '../assets/logo-icon.png';
const VERDE_MARCA = [22, 101, 52];
const VERDE_CLARO = [220, 252, 231];
const AMBAR_CLARO = [254, 243, 199];
const ROJO_CLARO = [251, 227, 231];
const DORADO = [201, 147, 43];
const DORADO_CLARO = [253, 243, 223];
function coloresEstado(css) {
  if (css === 'success') return {
    fill: VERDE_CLARO,
    text: [22, 101, 52]
  };
  if (css === 'warning') return {
    fill: AMBAR_CLARO,
    text: [180, 83, 9]
  };
  return {
    fill: ROJO_CLARO,
    text: [169, 29, 58]
  };
}
function cajaPromedioGeneral(doc, y, promedioGeneral, totalPersonas) {
  const w = doc.internal.pageSize.getWidth() - 28;
  doc.setFillColor(...DORADO_CLARO);
  doc.setDrawColor(...DORADO);
  doc.setLineWidth(0.8);
  doc.roundedRect(14, y, w, 20, 3, 3, 'FD');
  doc.setTextColor(15, 61, 34);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('⭐ RENDIMIENTO PROMEDIO GENERAL', 20, y + 8);
  doc.setTextColor(...DORADO);
  doc.setFontSize(20);
  doc.text(`${promedioGeneral}`, 20, y + 17);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 61, 34);
  doc.text(`tallos/hora   ·   ${totalPersonas} persona(s)`, 20 + doc.getTextWidth(`${promedioGeneral}`) + 4, y + 16.5);
  doc.setTextColor(0, 0, 0);
  return y + 26;
}
function cargarLogoBase64() {
  return fetch(logoUrl).then(r => r.blob()).then(blob => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  })).catch(() => null);
}
function encabezadoPagina(doc, logoBase64, titulo, subtitulo) {
  doc.setFillColor(...VERDE_MARCA);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 34, 'F');
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', 12, 6, 22, 22);
    } catch {}
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('TORREMOLINOS · TMCONTROL', logoBase64 ? 40 : 14, 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(titulo, logoBase64 ? 40 : 14, 23);
  doc.setFontSize(8);
  doc.setTextColor(220, 240, 225);
  doc.text(subtitulo, logoBase64 ? 40 : 14, 29);
  doc.setTextColor(0, 0, 0);
}
function piePagina(doc) {
  const paginas = doc.internal.getNumberOfPages();
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i);
    const h = doc.internal.pageSize.getHeight();
    const w = doc.internal.pageSize.getWidth();
    doc.setFontSize(8);
    doc.setTextColor(130, 130, 130);
    doc.text(`Página ${i} de ${paginas}`, w - 30, h - 8);
    doc.text('Generado automáticamente · Torremolinos TMControl', 14, h - 8);
  }
}
function dibujarPodio(doc, y, ranking) {
  const medallas = ['1°', '2°', '3°'];
  const colores = [[201, 147, 43], [148, 158, 156], [178, 118, 62]];
  const top3 = ranking.slice(0, 3);
  const anchoCol = 58;
  top3.forEach((p, i) => {
    const x = 14 + i * (anchoCol + 4);
    doc.setFillColor(...colores[i]);
    doc.roundedRect(x, y, anchoCol, 22, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(medallas[i], x + 5, y + 9);
    doc.setFontSize(8);
    const nombreCorto = p.colaborador.length > 22 ? p.colaborador.slice(0, 20) + '…' : p.colaborador;
    doc.text(nombreCorto, x + 5, y + 15);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`${p.promedioRend} tallos/h`, x + 5, y + 20);
  });
  doc.setTextColor(0, 0, 0);
  return y + 30;
}
function tablaRanking(doc, startY, ranking, metaHora) {
  const filas = ranking.map((p, i) => {
    const pct = calcularPorcentajeMeta(p.promedioRend, metaHora);
    const estado = clasificarEstado(pct);
    return {
      cells: [i + 1, p.codigo ?? '—', p.colaborador, p.totalTallos.toLocaleString(), p.promedioRend, `${pct.toFixed(2)}%`, estado.label],
      estado
    };
  });
  autoTable(doc, {
    startY,
    head: [['#', 'Código', 'Colaborador', 'Total Tallos', 'Rendimiento', '% Meta', 'Estado']],
    body: filas.map(f => f.cells),
    theme: 'grid',
    headStyles: {
      fillColor: VERDE_MARCA,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 8.5
    },
    columnStyles: {
      0: {
        cellWidth: 10,
        fontStyle: 'bold'
      }
    },
    alternateRowStyles: {
      fillColor: [246, 246, 242]
    },
    didParseCell: data => {
      if (data.section === 'body' && data.column.index === 6) {
        const est = filas[data.row.index]?.estado;
        if (est) {
          const c = coloresEstado(est.css);
          data.cell.styles.fillColor = c.fill;
          data.cell.styles.textColor = c.text;
          data.cell.styles.fontStyle = 'bold';
        }
      }
    }
  });
}
export async function exportarPdfProfesional({
  tipo,
  filas,
  cfg,
  fecha
}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  const logoBase64 = await cargarLogoBase64();
  const metaHora = cfg?.metaHora || 470;
  const generado = new Date().toLocaleString('es-CO');
  const ranking = agregarRankingPorPersona(filas);
  const promedioGeneral = ranking.length > 0 ? Math.round(ranking.reduce((s, p) => s + p.promedioRend, 0) / ranking.length) : 0;
  const titulo = tipo === 'historico' ? 'Ranking de Rendimientos — Histórico' : 'Ranking de Rendimientos — Turno Actual';
  encabezadoPagina(doc, logoBase64, titulo, `Generado el ${generado} · Fecha: ${fecha} · Meta: ${metaHora} tallos/h · Ordenado de mayor a menor`);
  let y = 40;
  if (ranking.length > 0) {
    y = cajaPromedioGeneral(doc, y, promedioGeneral, ranking.length);
    y = dibujarPodio(doc, y, ranking);
    tablaRanking(doc, y + 4, ranking, metaHora);
  } else {
    doc.setFontSize(11);
    doc.text('Sin datos para esta fecha.', 14, y + 6);
  }
  piePagina(doc);
  const nombre = tipo === 'historico' ? 'historico' : 'turno_actual';
  doc.save(`torremolinos_ranking_${nombre}_${fecha}.pdf`);
}
