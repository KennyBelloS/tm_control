import ExcelJS from 'exceljs/dist/exceljs.min.js';
import { calcularPorcentajeMeta, clasificarEstado } from './calculos';
const VERDE_MARCA = 'FF166534';
const VERDE_CLARO = 'FFDCFCE7';
const VERDE_OSCURO_TXT = 'FF0F3D22';
const DORADO = 'FFC9932B';
const DORADO_CLARO = 'FFFDF3DF';
const AMBAR_CLARO = 'FFFEF3C7';
const ROJO_CLARO = 'FFFBE3E7';
const GRIS_CLARO = 'FFF3F4F6';
const BLANCO = 'FFFFFFFF';
function tarjetaPromedioGeneral(ws, filaInicio, ultimaCol, promedioGeneral, totalPersonas) {
  ws.mergeCells(`A${filaInicio}:${ultimaCol}${filaInicio + 2}`);
  const celda = ws.getCell(`A${filaInicio}`);
  celda.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: {
      argb: DORADO_CLARO
    }
  };
  celda.alignment = {
    vertical: 'middle',
    horizontal: 'left',
    wrapText: true
  };
  celda.value = {
    richText: [{
      font: {
        bold: true,
        size: 11,
        color: {
          argb: VERDE_OSCURO_TXT
        }
      },
      text: '⭐ RENDIMIENTO PROMEDIO GENERAL   '
    }, {
      font: {
        bold: true,
        size: 22,
        color: {
          argb: DORADO
        }
      },
      text: `${promedioGeneral} `
    }, {
      font: {
        bold: true,
        size: 11,
        color: {
          argb: VERDE_OSCURO_TXT
        }
      },
      text: `tallos/hora   ·   ${totalPersonas} persona(s)`
    }]
  };
  ws.getRow(filaInicio).height = 20;
  ws.getRow(filaInicio + 1).height = 20;
  ws.getRow(filaInicio + 2).height = 14;
  for (let r = filaInicio; r <= filaInicio + 2; r++) {
    for (let c = 1; c <= ultimaCol.charCodeAt(0) - 64; c++) {
      ws.getCell(r, c).border = {
        top: {
          style: 'medium',
          color: {
            argb: DORADO
          }
        },
        bottom: {
          style: 'medium',
          color: {
            argb: DORADO
          }
        }
      };
    }
  }
  return filaInicio + 4;
}
function estiloEncabezadoHoja(ws, titulo, subtitulo, ultimaCol) {
  ws.mergeCells(`A1:${ultimaCol}1`);
  const t = ws.getCell('A1');
  t.value = titulo;
  t.font = {
    bold: true,
    size: 16,
    color: {
      argb: BLANCO
    }
  };
  t.alignment = {
    vertical: 'middle',
    horizontal: 'left'
  };
  t.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: {
      argb: VERDE_MARCA
    }
  };
  ws.getRow(1).height = 30;
  ws.mergeCells(`A2:${ultimaCol}2`);
  const s = ws.getCell('A2');
  s.value = subtitulo;
  s.font = {
    italic: true,
    size: 10,
    color: {
      argb: 'FF4B5563'
    }
  };
  ws.getRow(2).height = 20;
}
function estiloFilaEncabezadoTabla(row) {
  row.eachCell(cell => {
    cell.font = {
      bold: true,
      color: {
        argb: BLANCO
      },
      size: 10.5
    };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: {
        argb: VERDE_MARCA
      }
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center'
    };
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
        top: {
          style: 'thin',
          color: {
            argb: 'FFE5E7EB'
          }
        },
        bottom: {
          style: 'thin',
          color: {
            argb: 'FFE5E7EB'
          }
        },
        left: {
          style: 'thin',
          color: {
            argb: 'FFE5E7EB'
          }
        },
        right: {
          style: 'thin',
          color: {
            argb: 'FFE5E7EB'
          }
        }
      };
      if (esPar) cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: {
          argb: GRIS_CLARO
        }
      };
      cell.alignment = {
        vertical: 'middle',
        ...(c === 2 ? {
          horizontal: 'left'
        } : {
          horizontal: 'center'
        })
      };
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
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
export async function exportarExcelProfesional({
  tipo,
  filas,
  cfg,
  fecha
}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Torremolinos · TMControl';
  wb.created = new Date();
  const metaHora = cfg?.metaHora || 470;
  const generado = new Date().toLocaleString('es-CO');
  if (tipo === 'historico') {
    const ws = wb.addWorksheet('Histórico', {
      views: [{
        state: 'frozen',
        ySplit: 8
      }]
    });
    ws.columns = [{
      width: 32
    }, {
      width: 13
    }, {
      width: 14
    }, {
      width: 16
    }, {
      width: 12
    }, {
      width: 12
    }, {
      width: 22
    }];
    const conRend = filas.filter(r => r.rendimiento > 0);
    const promedioGeneral = conRend.length > 0 ? Math.round(conRend.reduce((s, r) => s + r.rendimiento, 0) / conRend.length) : 0;
    estiloEncabezadoHoja(ws, 'TORREMOLINOS · REPORTE DE RENDIMIENTOS — HISTÓRICO', `Generado el ${generado} · Fecha: ${fecha} · Meta por hora: ${metaHora} tallos`, 'G');
    const filaHeader = tarjetaPromedioGeneral(ws, 3, 'G', promedioGeneral, filas.length);
    const header = ws.getRow(filaHeader);
    header.values = ['Colaborador', 'Fecha', 'Total Tallos', 'Tiempo Trabajado', 'Tiempo Real (h)', 'Rendimiento', 'Estado'];
    estiloFilaEncabezadoTabla(header);
    let fila = filaHeader + 1;
    for (const r of filas) {
      const pct = r.tiempo_trabajado_min ? calcularPorcentajeMeta(r.rendimiento, metaHora) : null;
      const estado = pct !== null ? clasificarEstado(pct) : null;
      const row = ws.addRow([r.colaborador, r.fecha, r.total_tallos, r.tiempo_trabajado_min ? `${Math.round(r.tiempo_trabajado_min / 60 * 100) / 100} h` : 'Sin registrar', r.tiempo_trabajado_min ? r.tiempo_real_horas : '—', r.tiempo_trabajado_min ? r.rendimiento : '—', estado ? estado.label : 'Falta tiempo']);
      if (estado) {
        row.getCell(7).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: {
            argb: estadoColorFill(estado.css)
          }
        };
        row.getCell(7).font = {
          bold: true
        };
      }
      fila++;
    }
    aplicarZebraYBordes(ws, filaHeader + 1, fila - 1, 1, 7);
  } else {
    const ws = wb.addWorksheet('Turno Actual', {
      views: [{
        state: 'frozen',
        ySplit: 8
      }]
    });
    ws.columns = [{
      width: 10
    }, {
      width: 32
    }, {
      width: 12
    }, {
      width: 16
    }, {
      width: 14
    }, {
      width: 10
    }, {
      width: 12
    }, {
      width: 10
    }, {
      width: 22
    }];
    const promedioGeneral = filas.length > 0 ? Math.round(filas.reduce((s, r) => s + (r.rendimiento || 0), 0) / filas.length) : 0;
    estiloEncabezadoHoja(ws, 'TORREMOLINOS · REPORTE DE RENDIMIENTOS — TURNO ACTUAL', `Generado el ${generado} · Fecha: ${fecha} · Meta por hora: ${metaHora} tallos`, 'I');
    const filaHeader = tarjetaPromedioGeneral(ws, 3, 'I', promedioGeneral, filas.length);
    const header = ws.getRow(filaHeader);
    header.values = ['Código', 'Colaborador', 'Fecha', 'Bloque', 'Tiempo Trabajado', 'Tallos', 'Rendimiento', '% Meta', 'Estado'];
    estiloFilaEncabezadoTabla(header);
    let fila = filaHeader + 1;
    for (const r of filas) {
      const pct = calcularPorcentajeMeta(r.rendimiento, metaHora);
      const estado = clasificarEstado(pct);
      const row = ws.addRow([r.mesa ?? '—', r.colaborador, r.fecha, `${r.hora_inicio}–${r.hora_fin}`, `${r.tiempo_real_horas} h`, r.total_tallos, r.rendimiento, `${pct.toFixed(2)}%`, estado.label]);
      row.getCell(9).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: {
          argb: estadoColorFill(estado.css)
        }
      };
      row.getCell(9).font = {
        bold: true
      };
      fila++;
    }
    aplicarZebraYBordes(ws, filaHeader + 1, fila - 1, 1, 9);
  }
  const nombre = tipo === 'historico' ? 'historico' : 'turno_actual';
  await descargar(wb, `torremolinos_${nombre}_${fecha}.xlsx`);
}
export async function exportarRespaldoCompletoExcel({
  historico,
  actual,
  personas,
  metasDiarias,
  cfg
}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Torremolinos · TMControl';
  wb.created = new Date();
  const metaHora = cfg?.metaHora || 470;
  const generado = new Date().toLocaleString('es-CO');
  const wsResumen = wb.addWorksheet('Resumen');
  wsResumen.columns = [{
    width: 32
  }, {
    width: 20
  }];
  estiloEncabezadoHoja(wsResumen, 'TORREMOLINOS · RESPALDO COMPLETO', `Generado el ${generado} — copia de seguridad de toda la base de datos`, 'B');
  const filasResumen = [['Tabla', 'Registros'], ['Histórico (rendimiento_historico)', historico.length], ['Turno Actual (rendimiento_actual)', actual.length], ['Personas', personas.length], ['Metas Diarias configuradas', metasDiarias.length]];
  filasResumen.forEach((f, i) => {
    const row = wsResumen.addRow(f);
    if (i === 0) estiloFilaEncabezadoTabla(row);
  });
  aplicarZebraYBordes(wsResumen, 5, 4 + filasResumen.length - 1, 1, 2);
  const wsHist = wb.addWorksheet('Histórico', {
    views: [{
      state: 'frozen',
      ySplit: 8
    }]
  });
  wsHist.columns = [{
    width: 32
  }, {
    width: 13
  }, {
    width: 14
  }, {
    width: 16
  }, {
    width: 14
  }, {
    width: 12
  }, {
    width: 12
  }, {
    width: 22
  }];
  const conRendHist = historico.filter(r => r.rendimiento > 0);
  const promedioHist = conRendHist.length > 0 ? Math.round(conRendHist.reduce((s, r) => s + r.rendimiento, 0) / conRendHist.length) : 0;
  estiloEncabezadoHoja(wsHist, 'HISTÓRICO COMPLETO', `${historico.length} registros totales · Meta por hora: ${metaHora} tallos`, 'H');
  const filaHeaderHist = tarjetaPromedioGeneral(wsHist, 3, 'H', promedioHist, historico.length);
  const headerHist = wsHist.getRow(filaHeaderHist);
  headerHist.values = ['Colaborador', 'Fecha', 'Total Tallos', 'Tiempo Trabajado (min)', 'Tiempo No Prod. (min)', 'Tiempo Real (h)', 'Rendimiento', 'Estado'];
  estiloFilaEncabezadoTabla(headerHist);
  let filaHist = filaHeaderHist + 1;
  for (const r of historico) {
    const pct = r.tiempo_trabajado_min ? calcularPorcentajeMeta(r.rendimiento, metaHora) : null;
    const estado = pct !== null ? clasificarEstado(pct) : null;
    const row = wsHist.addRow([r.colaborador, r.fecha, r.total_tallos, r.tiempo_trabajado_min ?? '—', r.tiempo_no_productivo_min ?? 0, r.tiempo_trabajado_min ? r.tiempo_real_horas : '—', r.tiempo_trabajado_min ? r.rendimiento : '—', estado ? estado.label : 'Falta tiempo']);
    if (estado) {
      row.getCell(8).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: {
          argb: estadoColorFill(estado.css)
        }
      };
      row.getCell(8).font = {
        bold: true
      };
    }
    filaHist++;
  }
  aplicarZebraYBordes(wsHist, filaHeaderHist + 1, filaHist - 1, 1, 8);
  const wsAct = wb.addWorksheet('Turno Actual', {
    views: [{
      state: 'frozen',
      ySplit: 8
    }]
  });
  wsAct.columns = [{
    width: 10
  }, {
    width: 32
  }, {
    width: 13
  }, {
    width: 16
  }, {
    width: 14
  }, {
    width: 10
  }, {
    width: 12
  }, {
    width: 22
  }];
  const promedioAct = actual.length > 0 ? Math.round(actual.reduce((s, r) => s + (r.rendimiento || 0), 0) / actual.length) : 0;
  estiloEncabezadoHoja(wsAct, 'TURNO ACTUAL — ÚLTIMA CARGA', `${actual.length} registros`, 'H');
  const filaHeaderAct = tarjetaPromedioGeneral(wsAct, 3, 'H', promedioAct, actual.length);
  const headerAct = wsAct.getRow(filaHeaderAct);
  headerAct.values = ['Código', 'Colaborador', 'Fecha', 'Bloque', 'Tiempo (h)', 'Tallos', 'Rendimiento', 'Estado'];
  estiloFilaEncabezadoTabla(headerAct);
  let filaAct = filaHeaderAct + 1;
  for (const r of actual) {
    const pct = calcularPorcentajeMeta(r.rendimiento, metaHora);
    const estado = clasificarEstado(pct);
    const row = wsAct.addRow([r.mesa ?? '—', r.colaborador, r.fecha, `${r.hora_inicio}–${r.hora_fin}`, r.tiempo_real_horas, r.total_tallos, r.rendimiento, estado.label]);
    row.getCell(8).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: {
        argb: estadoColorFill(estado.css)
      }
    };
    row.getCell(8).font = {
      bold: true
    };
    filaAct++;
  }
  aplicarZebraYBordes(wsAct, filaHeaderAct + 1, filaAct - 1, 1, 8);
  const wsPer = wb.addWorksheet('Personas', {
    views: [{
      state: 'frozen',
      ySplit: 4
    }]
  });
  wsPer.columns = [{
    width: 10
  }, {
    width: 36
  }];
  estiloEncabezadoHoja(wsPer, 'CATÁLOGO DE PERSONAS', `${personas.length} colaboradores registrados`, 'B');
  estiloFilaEncabezadoTabla(wsPer.addRow(['Id', 'Nombre']));
  personas.forEach(p => wsPer.addRow([p.id, p.nombre]));
  aplicarZebraYBordes(wsPer, 5, 4 + personas.length, 1, 2);
  const wsMetas = wb.addWorksheet('Metas Diarias', {
    views: [{
      state: 'frozen',
      ySplit: 4
    }]
  });
  wsMetas.columns = [{
    width: 16
  }, {
    width: 16
  }];
  estiloEncabezadoHoja(wsMetas, 'METAS DIARIAS CONFIGURADAS', `${metasDiarias.length} días con meta puntual definida`, 'B');
  estiloFilaEncabezadoTabla(wsMetas.addRow(['Fecha', 'Meta de Tallos']));
  metasDiarias.forEach(m => wsMetas.addRow([m.fecha, m.meta_tallos]));
  aplicarZebraYBordes(wsMetas, 5, 4 + metasDiarias.length, 1, 2);
  const wsCfg = wb.addWorksheet('Configuración');
  wsCfg.columns = [{
    width: 30
  }, {
    width: 30
  }];
  estiloEncabezadoHoja(wsCfg, 'CONFIGURACIÓN ACTUAL DEL SISTEMA', `Vigente al momento de este respaldo`, 'B');
  estiloFilaEncabezadoTabla(wsCfg.addRow(['Parámetro', 'Valor']));
  const filasCfg = [['Meta de tallos por hora', cfg?.metaHora ?? '—'], ['Meta global del día (por defecto)', cfg?.metaGlobalDia ?? '—'], ['Hora inicio jornada (por defecto)', cfg?.horaInicioDefault ?? '—'], ['Hora fin jornada (por defecto)', cfg?.horaFinDefault ?? '—'], ['Descuentos de tiempo activos', cfg?.descansosActivos ? 'Sí' : 'No'], ['Descansos configurados', (cfg?.descansos || []).map(d => `${d.horaCorte} (${d.minutos} min)`).join(', ') || '—'], ['Límite de almacenamiento (MB)', cfg?.almacenamientoLimiteMB ?? '—']];
  filasCfg.forEach(f => wsCfg.addRow(f));
  aplicarZebraYBordes(wsCfg, 5, 4 + filasCfg.length, 1, 2);
  const fechaArchivo = new Date().toISOString().slice(0, 10);
  await descargar(wb, `torremolinos_respaldo_completo_${fechaArchivo}.xlsx`);
}
