import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader';
import RankingExcelTable from '../components/RankingExcelTable';
import CarruselLista from '../components/CarruselLista';
import { getConfig, getHistorico, getActual } from '../lib/db';
import { useRealtimeRefresco } from '../lib/useRealtimeRefresco';
import { agregarRankingPorPersona } from '../lib/calculos';

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function Reportes() {
  const [cfg, setCfg] = useState(null);
  const [fuenteExportar, setFuenteExportar] = useState('actual');
  const [fechaExportar, setFechaExportar] = useState(hoyISO());
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [exportando, setExportando] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [tickTiempoReal, setTickTiempoReal] = useState(0);
  useRealtimeRefresco(['rendimiento_historico', 'rendimiento_actual'], () => setTickTiempoReal(t => t + 1));

  useEffect(() => { getConfig().then(setCfg).catch(() => {}); }, []);

  useEffect(() => {
    let activo = true;
    function cargarFilas() {
      setCargando(true);
      const cargar = fuenteExportar === 'historico'
        ? getHistorico({ fecha: fechaExportar })
        : getActual({ fecha: fechaExportar });
      cargar
        .then(r => { if (activo) setFilas(r); })
        .catch(e => { if (activo) setMensaje({ tipo: 'err', texto: e.message }); })
        .finally(() => { if (activo) setCargando(false); });
    }
    cargarFilas();
    return () => { activo = false; };
  }, [fuenteExportar, fechaExportar, tickTiempoReal]);

  const ranking = useMemo(() => agregarRankingPorPersona(filas), [filas]);
  const metaHora = cfg?.metaHora || 470;

  const resumen = useMemo(() => {
    const tallosTotales = ranking.reduce((s, p) => s + (p.totalTallos || 0), 0);
    const promedioGeneral = ranking.length > 0
      ? Math.round(ranking.reduce((s, p) => s + p.promedioRend, 0) / ranking.length)
      : 0;
    return { tallosTotales, promedioGeneral };
  }, [ranking]);

  async function exportarExcel() {
    setExportando('excel');
    setMensaje(null);
    try {
      const { exportarExcelProfesional } = await import('../lib/exportExcelProfesional');
      await exportarExcelProfesional({ tipo: fuenteExportar, filas, cfg, fecha: fechaExportar });
    } catch (e) {
      setMensaje({ tipo: 'err', texto: `Error generando el Excel: ${e.message}` });
    } finally {
      setExportando(null);
    }
  }

  async function exportarPdf() {
    setExportando('pdf');
    setMensaje(null);
    try {
      const { exportarPdfProfesional } = await import('../lib/exportPdfProfesional');
      await exportarPdfProfesional({ tipo: fuenteExportar, filas, cfg, fecha: fechaExportar });
    } catch (e) {
      setMensaje({ tipo: 'err', texto: `Error generando el PDF: ${e.message}` });
    } finally {
      setExportando(null);
    }
  }

  async function exportarImagen(formato) {
    setExportando(`imagen-${formato}`);
    setMensaje(null);
    try {
      const { exportarImagenProfesional } = await import('../lib/exportImagenProfesional');
      await exportarImagenProfesional({ tipo: fuenteExportar, filas, cfg, fecha: fechaExportar, formato });
    } catch (e) {
      setMensaje({ tipo: 'err', texto: `Error generando la imagen: ${e.message}` });
    } finally {
      setExportando(null);
    }
  }

  return (
    <>
      <PageHeader title="Reportes" subtitle="Filtra, revisa la vista previa y descarga el reporte en el formato que necesites." />
      <div className="page">
        <section className="step-panel">
          <h3><i className="fa-solid fa-filter"></i> ¿Qué quieres descargar?</h3>
          <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <label>Fuente</label>
              <select value={fuenteExportar} onChange={e => setFuenteExportar(e.target.value)}>
                <option value="actual">Turno Actual (hora a hora)</option>
                <option value="historico">Histórico (día)</option>
              </select>
            </div>
            <div>
              <label>Fecha del reporte</label>
              <input type="date" value={fechaExportar} onChange={e => {
                const nueva = e.target.value;
                setFechaExportar(nueva);
                setFuenteExportar(nueva === hoyISO() ? 'actual' : 'historico');
              }} />
            </div>
          </div>
          <div className="alert-inline">
            <i className="fa-solid fa-circle-info"></i>
            El reporte incluye solo lo elegido arriba — Histórico y Turno Actual nunca se mezclan en un mismo archivo.
          </div>
          {mensaje && <div className={`alert ${mensaje.tipo === 'ok' ? 'ok' : 'err'}`}><i className="fa-solid fa-circle-info"></i> {mensaje.texto}</div>}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn-secondary" disabled={exportando === 'excel'} onClick={exportarExcel}>
              <i className="fa-solid fa-file-excel"></i> {exportando === 'excel' ? 'Generando...' : 'Descargar Excel'}
            </button>
            <button className="btn-secondary" disabled={exportando === 'pdf'} onClick={exportarPdf}>
              <i className="fa-solid fa-file-pdf"></i> {exportando === 'pdf' ? 'Generando...' : 'Descargar PDF'}
            </button>
            <button className="btn-secondary" disabled={exportando === 'imagen-png'} onClick={() => exportarImagen('png')}>
              <i className="fa-solid fa-file-image"></i> {exportando === 'imagen-png' ? 'Generando...' : 'Descargar PNG'}
            </button>
            <button className="btn-secondary" disabled={exportando === 'imagen-jpg'} onClick={() => exportarImagen('jpg')}>
              <i className="fa-solid fa-file-image"></i> {exportando === 'imagen-jpg' ? 'Generando...' : 'Descargar JPG'}
            </button>
          </div>
        </section>

        {!cargando && ranking.length > 0 && (
          <section className="cards">
            <div className="card acento-oro">
              <div className="icon"><i className="fa-solid fa-gauge-high"></i></div>
              <div><span>Rendimiento Promedio General</span><h2 style={{ fontSize: 34 }}>{resumen.promedioGeneral}</h2><small>tallos/hora</small></div>
            </div>
            <div className="card acento-azul">
              <div className="icon"><i className="fa-solid fa-seedling"></i></div>
              <div><span>Total de Tallos</span><h2 style={{ fontSize: 34 }}>{resumen.tallosTotales.toLocaleString()}</h2><small>{ranking.length} colaboradores</small></div>
            </div>
          </section>
        )}

        {!cargando && ranking.length > 0 && (
          <CarruselLista
            personas={ranking}
            metaHora={metaHora}
            titulo={fuenteExportar === 'historico' ? 'Vista en vivo — Histórico' : 'Vista en vivo — Turno Actual'}
            icono="fa-file-export"
          />
        )}

        <section className="panel">
          {cargando ? (
            <p style={{ color: 'var(--gray)' }}>Cargando vista previa...</p>
          ) : ranking.length === 0 ? (
            <div className="empty-state"><i className="fa-solid fa-inbox"></i>Sin datos para esta fecha/fuente.</div>
          ) : (
            <RankingExcelTable
              lista={ranking}
              metaHora={metaHora}
              titulo={fuenteExportar === 'historico' ? 'Vista previa — Histórico' : 'Vista previa — Turno Actual'}
              topInicial={10}
            />
          )}
        </section>
      </div>
    </>
  );
}
