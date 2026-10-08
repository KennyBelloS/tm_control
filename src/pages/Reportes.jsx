import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader';
import RankingExcelTable from '../components/RankingExcelTable';
import ClasificacionPanel from '../components/ClasificacionPanel';
import { fechaLocalISO } from '../lib/clasificacionCalculos';
import { useSesion } from '../lib/useSesion';
import { getConfig, getHistorico, getActual } from '../lib/db';
import { getRendimientoPorLinea, getRendimientoPorFormadora } from '../lib/lineas';
import { useRealtimeRefresco } from '../lib/useRealtimeRefresco';
import { agregarRankingPorPersona, marcarPocoTiempo } from '../lib/calculos';

function hoyISO() {
  return fechaLocalISO(); // hora local, no UTC
}
function rangoDelMes(mesISO) {
  const [anio, mes] = mesISO.split('-').map(Number);
  const inicio = `${mesISO}-01`;
  const ultimoDia = new Date(anio, mes, 0).getDate();
  const fin = `${mesISO}-${String(ultimoDia).padStart(2, '0')}`;
  return { inicio, fin };
}
function rangoDeSemana(fechaISO, diaFinSemana = 6) {
  const d = new Date(fechaISO + 'T00:00:00');
  const dia = d.getDay();
  const diasHastaFin = (diaFinSemana - dia + 7) % 7;
  const fin = new Date(d);
  fin.setDate(d.getDate() + diasHastaFin);
  const inicio = new Date(fin);
  inicio.setDate(fin.getDate() - 6);
  const fmt = (x) => x.toISOString().slice(0, 10);
  return { inicio: fmt(inicio), fin: fmt(fin) };
}
function formatoCorto(fechaISO) {
  return new Date(fechaISO + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}

export default function Reportes() {
  const { sesion } = useSesion();
  const esAdministrador = sesion?.rol === 'administrador';
  const [cfg, setCfg] = useState(null);
  const [fuenteExportar, setFuenteExportar] = useState('actual');
  const [periodo, setPeriodo] = useState('dia');
  const [fechaExportar, setFechaExportar] = useState(hoyISO());
  const [fechaSemana, setFechaSemana] = useState(hoyISO());
  const [mes, setMes] = useState(hoyISO().slice(0, 7));
  const [modoRendimiento, setModoRendimiento] = useState('simple');
  const [fechaClasif, setFechaClasif] = useState(hoyISO());
  const [filas, setFilas] = useState([]);
  const [resumenPorLinea, setResumenPorLinea] = useState([]);
  const [resumenPorFormadora, setResumenPorFormadora] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [exportando, setExportando] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [tickTiempoReal, setTickTiempoReal] = useState(0);
  useRealtimeRefresco(['rendimiento_historico', 'rendimiento_actual'], () => setTickTiempoReal(t => t + 1));

  useEffect(() => { getConfig().then(setCfg).catch(() => {}); }, []);

  const rango = useMemo(() => {
    if (fuenteExportar === 'actual') return { inicio: fechaExportar, fin: fechaExportar, etiqueta: fechaExportar };
    if (periodo === 'semana') {
      const r = rangoDeSemana(fechaSemana, cfg?.diaFinSemana ?? 6);
      return { ...r, etiqueta: `Semana del ${formatoCorto(r.inicio)} al ${formatoCorto(r.fin)}` };
    }
    if (periodo === 'mes') {
      const r = rangoDelMes(mes);
      return { ...r, etiqueta: new Date(mes + '-02').toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }) };
    }
    return { inicio: fechaExportar, fin: fechaExportar, etiqueta: fechaExportar };
  }, [fuenteExportar, periodo, fechaExportar, fechaSemana, mes, cfg]);

  useEffect(() => {
    let activo = true;
    Promise.all([
      getRendimientoPorLinea(rango.inicio, rango.fin),
      getRendimientoPorFormadora(rango.inicio, rango.fin)
    ]).then(([l, f]) => {
      if (!activo) return;
      setResumenPorLinea(l);
      setResumenPorFormadora(f);
    }).catch(() => {});
    return () => { activo = false; };
  }, [rango]);

  useEffect(() => {
    let activo = true;
    function cargarFilas() {
      setCargando(true);
      const cargar = fuenteExportar === 'historico'
        ? getHistorico({ desde: rango.inicio, hasta: rango.fin })
        : getActual({ fecha: fechaExportar });
      cargar
        .then(r => { if (activo) setFilas(r); })
        .catch(e => { if (activo) setMensaje({ tipo: 'err', texto: e.message }); })
        .finally(() => { if (activo) setCargando(false); });
    }
    cargarFilas();
    return () => { activo = false; };
  }, [fuenteExportar, rango, fechaExportar, tickTiempoReal]);

  const ranking = useMemo(() => marcarPocoTiempo(agregarRankingPorPersona(filas)), [filas]);
  const rankingConfiable = useMemo(() => ranking.filter(p => !p.pocoTiempo), [ranking]);
  const [verSoloConfiables, setVerSoloConfiables] = useState(false);
  const metaHora = cfg?.metaHora || 470;

  const idsPocoTiempo = useMemo(() => new Set(ranking.filter(p => p.pocoTiempo).map(p => p.colaborador_id)), [ranking]);
  // Las filas que de verdad se meten en el archivo descargado — respeta el
  // mismo interruptor "Ver todos / Solo confiables" de la vista previa.
  const filasParaExportar = useMemo(() => {
    if (!verSoloConfiables) return filas;
    return filas.filter(f => !idsPocoTiempo.has(f.colaborador_id));
  }, [filas, verSoloConfiables, idsPocoTiempo]);

  const rankingParaMostrar = useMemo(() => {
    const base = verSoloConfiables ? rankingConfiable : ranking;
    if (modoRendimiento === 'simple') return base;
    return base.map(p => ({ ...p, promedioRend: p.rendimientoPonderado }));
  }, [ranking, rankingConfiable, verSoloConfiables, modoRendimiento]);

  const resumen = useMemo(() => {
    // El total de tallos SIEMPRE se calcula sobre TODOS, incluyendo a quien
    // trabajó poco tiempo — filtrarlos de la vista de rendimiento nunca debe
    // hacer que el total de producción parezca más bajo de lo que fue.
    const tallosTotales = ranking.reduce((s, p) => s + (p.totalTallos || 0), 0);
    const grupoPromedio = verSoloConfiables ? rankingConfiable : ranking;
    const base = modoRendimiento === 'simple' ? 'promedioRend' : 'rendimientoPonderado';
    const promedioGeneral = grupoPromedio.length > 0
      ? Math.round(grupoPromedio.reduce((s, p) => s + p[base], 0) / grupoPromedio.length)
      : 0;
    const conPocoTiempo = ranking.filter(p => p.pocoTiempo).length;
    return { tallosTotales, promedioGeneral, conPocoTiempo };
  }, [ranking, rankingConfiable, verSoloConfiables, modoRendimiento]);

  async function exportarExcel() {
    setExportando('excel');
    setMensaje(null);
    try {
      const { exportarExcelProfesional } = await import('../lib/exportExcelProfesional');
      const etiqueta = verSoloConfiables ? `${rango.etiqueta} (sin poco tiempo)` : rango.etiqueta;
      await exportarExcelProfesional({ tipo: fuenteExportar, filas: filasParaExportar, cfg, fecha: etiqueta });
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
      const etiqueta = verSoloConfiables ? `${rango.etiqueta} (sin poco tiempo)` : rango.etiqueta;
      await exportarPdfProfesional({ tipo: fuenteExportar, filas: filasParaExportar, cfg, fecha: etiqueta });
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
      const etiqueta = verSoloConfiables ? `${rango.etiqueta} (sin poco tiempo)` : rango.etiqueta;
      await exportarImagenProfesional({ tipo: fuenteExportar, filas: filasParaExportar, cfg, fecha: etiqueta, formato });
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
                <option value="historico">Histórico</option>
              </select>
            </div>
            {fuenteExportar === 'actual' && (
              <div>
                <label>Fecha del reporte</label>
                <input type="date" value={fechaExportar} onChange={e => setFechaExportar(e.target.value)} />
              </div>
            )}
          </div>

          {fuenteExportar === 'historico' && (
            <>
              <div className="fuente-toggle" style={{ marginBottom: 12 }}>
                <button className={periodo === 'dia' ? 'activo' : ''} onClick={() => setPeriodo('dia')}>
                  <i className="fa-solid fa-calendar-day"></i> Por día
                </button>
                <button className={periodo === 'semana' ? 'activo' : ''} onClick={() => setPeriodo('semana')}>
                  <i className="fa-solid fa-calendar-week"></i> Por semana
                </button>
                <button className={periodo === 'mes' ? 'activo' : ''} onClick={() => setPeriodo('mes')}>
                  <i className="fa-solid fa-calendar"></i> Por mes
                </button>
              </div>
              {periodo === 'dia' && (
                <input type="date" value={fechaExportar} onChange={e => setFechaExportar(e.target.value)} />
              )}
              {periodo === 'semana' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <input type="date" value={fechaSemana} onChange={e => setFechaSemana(e.target.value)} />
                  <span style={{ fontSize: 11.5, color: 'var(--gray)' }}>{rango.etiqueta}</span>
                </div>
              )}
              {periodo === 'mes' && (
                <input type="month" value={mes} onChange={e => setMes(e.target.value)} />
              )}
            </>
          )}

          <div className="alert-inline" style={{ marginTop: 14 }}>
            <i className="fa-solid fa-circle-info"></i>
            El reporte incluye solo lo elegido arriba — Histórico y Turno Actual nunca se mezclan en un mismo archivo.
          </div>

          {ranking.length > 0 && resumen.conPocoTiempo > 0 && (
            <div className="descuento-hoy-panel" style={{ marginTop: 14 }}>
              <div className="descuento-hoy-header">
                <span><i className="fa-solid fa-triangle-exclamation"></i> {resumen.conPocoTiempo} persona(s) trabajaron muy poco tiempo — ¿las incluyes al descargar?</span>
              </div>
              <div className="fuente-toggle" style={{ marginTop: 8 }}>
                <button className={!verSoloConfiables ? 'activo' : ''} onClick={() => setVerSoloConfiables(false)}>
                  Descargar con todos ({ranking.length} personas)
                </button>
                <button className={verSoloConfiables ? 'activo' : ''} onClick={() => setVerSoloConfiables(true)}>
                  <i className="fa-solid fa-filter-circle-xmark"></i> Descargar sin ellos ({rankingConfiable.length} personas)
                </button>
              </div>
            </div>
          )}

          {mensaje && <div className={`alert ${mensaje.tipo === 'ok' ? 'ok' : 'err'}`}><i className="fa-solid fa-circle-info"></i> {mensaje.texto}</div>}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
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
          <>
            <div className="two-col-panels" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <section className="fuente-toggle">
                <button className={modoRendimiento === 'simple' ? 'activo' : ''} onClick={() => setModoRendimiento('simple')}>
                  Rendimiento simple
                </button>
                <button className={modoRendimiento === 'ponderado' ? 'activo' : ''} onClick={() => setModoRendimiento('ponderado')}>
                  <i className="fa-solid fa-scale-balanced"></i> Ajustado por tiempo
                </button>
              </section>
              <section className="fuente-toggle">
                <button className={!verSoloConfiables ? 'activo' : ''} onClick={() => setVerSoloConfiables(false)}>
                  Ver todos {resumen.conPocoTiempo > 0 && `(${resumen.conPocoTiempo} en rojo)`}
                </button>
                <button className={verSoloConfiables ? 'activo' : ''} onClick={() => setVerSoloConfiables(true)}>
                  <i className="fa-solid fa-filter-circle-xmark"></i> Solo confiables
                </button>
              </section>
            </div>

            {modoRendimiento === 'ponderado' && (
              <div className="alert-inline">
                <i className="fa-solid fa-circle-info"></i> Este modo calcula el rendimiento como <strong>tallos totales ÷ horas totales trabajadas</strong> de cada persona en el período — no se deja engañar por alguien que trabajó poco tiempo pero le fue muy bien esas pocas horas.
              </div>
            )}
            {resumen.conPocoTiempo > 0 && (
              <div className="alert-inline">
                <i className="fa-solid fa-triangle-exclamation"></i> {resumen.conPocoTiempo} persona(s) trabajaron muy poco tiempo comparado con el promedio del grupo en este período — están resaltadas <strong style={{ color: '#B91C1C' }}>en rojo</strong> abajo porque su rendimiento no es representativo. El "Total de Tallos" no cambia aunque las quites de la vista con "Solo confiables" — sus tallos siguen contando igual.
              </div>
            )}

            <section className="cards">
              <div className="card acento-oro">
                <div className="icon"><i className="fa-solid fa-gauge-high"></i></div>
                <div><span>Rendimiento Promedio General</span><h2 style={{ fontSize: 34 }}>{resumen.promedioGeneral}</h2><small>tallos/hora {modoRendimiento === 'ponderado' ? '(ajustado)' : ''} {verSoloConfiables ? '· solo confiables' : ''}</small></div>
              </div>
              <div className="card acento-azul">
                <div className="icon"><i className="fa-solid fa-seedling"></i></div>
                <div><span>Total de Tallos</span><h2 style={{ fontSize: 34 }}>{resumen.tallosTotales.toLocaleString()}</h2><small>{ranking.length} colaboradores</small></div>
              </div>
            </section>
          </>
        )}

        {(resumenPorLinea.length > 0 || resumenPorFormadora.length > 0) && (
          <div className="two-col-panels">
            <section className="table-panel">
              <div className="panel-header">
                <div><h2><i className="fa-solid fa-industry" style={{ color: 'var(--primary)', marginRight: 8 }}></i>Resumen por Línea</h2>
                  <p>{rango.etiqueta} — personas, tallos y rendimiento por línea.</p></div>
              </div>
              <div className="table-scroll">
                <table>
                  <thead><tr><th>Línea</th><th>Personas</th><th>Tallos</th><th>Rendimiento</th></tr></thead>
                  <tbody>
                    {resumenPorLinea.length === 0 && <tr><td colSpan={4}><div className="empty-state">Sin asignaciones en este período.</div></td></tr>}
                    {resumenPorLinea.map(l => (
                      <tr key={l.linea_id}>
                        <td>{l.linea}</td>
                        <td>{l.operarios}</td>
                        <td>{l.totalTallos.toLocaleString()}</td>
                        <td><strong>{l.rendimientoPromedio}</strong> t/h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="table-panel">
              <div className="panel-header">
                <div><h2><i className="fa-solid fa-chalkboard-user" style={{ color: 'var(--accent)', marginRight: 8 }}></i>Resumen por Formadora</h2>
                  <p>{rango.etiqueta} — personas, tallos y rendimiento por formadora.</p></div>
              </div>
              <div className="table-scroll">
                <table>
                  <thead><tr><th>Formadora</th><th>Línea(s)</th><th>Personas</th><th>Tallos</th><th>Rendimiento</th></tr></thead>
                  <tbody>
                    {resumenPorFormadora.length === 0 && <tr><td colSpan={5}><div className="empty-state">Sin asignaciones en este período.</div></td></tr>}
                    {resumenPorFormadora.map(f => (
                      <tr key={f.formadora_id}>
                        <td>{f.formadora}</td>
                        <td>{f.lineas}</td>
                        <td>{f.operarios}</td>
                        <td>{f.totalTallos.toLocaleString()}</td>
                        <td><strong>{f.rendimientoPromedio}</strong> t/h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {esAdministrador && !cargando && ranking.length > 0 && (
          <section className="table-panel">
            <div className="panel-header">
              <div>
                <h2><i className="fa-solid fa-user-shield" style={{ color: 'var(--gold)', marginRight: 8 }}></i>Vista previa de Tiempo Productivo <span className="badge-count">Solo Administrador</span></h2>
                <p>Esto es solo para tu revisión interna — <strong>nunca aparece en los Excel/PDF/PNG/JPG que se descargan</strong>. Ayuda a detectar quién trabajó muy poco tiempo en este período.</p>
              </div>
            </div>
            <div className="table-scroll">
              <table>
                <thead><tr><th>Código</th><th>Colaborador</th><th>Horas Trabajadas</th><th>Tallos</th><th>Rendimiento</th><th>Comparado con el grupo</th></tr></thead>
                <tbody>
                  {[...ranking].sort((a, b) => a.horasTrabajadas - b.horasTrabajadas).map(p => (
                    <tr key={p.colaborador_id} className={p.pocoTiempo ? 'ranking-fila-poco-tiempo' : ''}>
                      <td>{p.codigo ?? p.colaborador_id}</td>
                      <td>{p.colaborador}</td>
                      <td><strong>{p.horasTrabajadas}</strong> h</td>
                      <td>{p.totalTallos.toLocaleString()}</td>
                      <td>{p.promedioRend} t/h</td>
                      <td>
                        {p.pocoTiempo
                          ? <span className="badge-poco-tiempo"><i className="fa-solid fa-triangle-exclamation"></i> Muy por debajo del promedio ({p.promedioHorasGrupo} h)</span>
                          : <span style={{ color: 'var(--gray)', fontSize: 11.5 }}>Dentro de lo normal</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="panel">
          {cargando ? (
            <p style={{ color: 'var(--gray)' }}>Cargando vista previa...</p>
          ) : rankingParaMostrar.length === 0 ? (
            <div className="empty-state"><i className="fa-solid fa-inbox"></i>Sin datos para este filtro.</div>
          ) : (
            <RankingExcelTable
              lista={rankingParaMostrar}
              metaHora={metaHora}
              titulo={fuenteExportar === 'historico' ? `Vista previa — ${rango.etiqueta}` : 'Vista previa — Turno Actual'}
              topInicial={10}
            />
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2><i className="fa-solid fa-boxes-stacked" style={{ color: 'var(--primary)', marginRight: 8 }}></i>Clasificación hora a hora</h2>
              <p>Tallos movidos por línea, hora a hora, contra el día anterior. Descárgalo en imagen o PDF.</p>
            </div>
            <input type="date" value={fechaClasif} max={hoyISO()} onChange={e => setFechaClasif(e.target.value)} style={{ maxWidth: 170 }} />
          </div>
          <ClasificacionPanel fecha={fechaClasif} />
        </section>
      </div>
    </>
  );
}
