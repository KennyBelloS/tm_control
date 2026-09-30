import { useEffect, useState, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { getConfig, getHistorico, getActual, getMetaDia, getTendenciaHistorico, getUltimaFechaHistorico, getDescansosDiariosRango } from '../lib/db';
import { agregarTurnoActualPorPersona } from '../lib/calculos';
import { supabaseConfigurado } from '../lib/supabaseClient';
const TendenciaTallosChart = lazy(() => import('../components/charts/TendenciaTallosChart'));
const EstadoDonutChart = lazy(() => import('../components/charts/EstadoDonutChart'));
import DashboardCarrusel from '../components/DashboardCarrusel';
import ModoPresentacion from '../components/ModoPresentacion';
import { getRendimientoPorLinea } from '../lib/lineas';
import { useRealtimeRefresco } from '../lib/useRealtimeRefresco';
function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}
function emojiCumplimiento(pct) {
  if (pct >= 100) return { icono: '🤩', texto: '¡Meta alcanzada!' };
  if (pct >= 60) return { icono: '🙂', texto: 'Vamos bien, sigue así' };
  if (pct >= 30) return { icono: '😐', texto: 'A mitad de camino' };
  return { icono: '😟', texto: 'Falta bastante para la meta' };
}
function colorProgreso(pct) {
  if (pct >= 100) return '#22C55E';
  if (pct >= 60) return '#84CC16';
  if (pct >= 30) return '#F59E0B';
  return '#EF4444';
}
export default function Dashboard() {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [tendencia, setTendencia] = useState({
    categorias: [],
    valores: []
  });
  const [metaHoy, setMetaHoy] = useState(0);
  const [metaTablaLista, setMetaTablaLista] = useState(true);
  const [personasParaDona, setPersonasParaDona] = useState([]);
  const [carruselHoy, setCarruselHoy] = useState([]);
  const [carruselAyer, setCarruselAyer] = useState([]);
  const [fechaHistoricoMostrado, setFechaHistoricoMostrado] = useState(null);
  const [presentando, setPresentando] = useState(false);
  const [resumenPorLinea, setResumenPorLinea] = useState([]);

  const [tickTiempoReal, setTickTiempoReal] = useState(0);
  useRealtimeRefresco(['rendimiento_historico', 'rendimiento_actual', 'metas_diarias', 'configuracion'], () => setTickTiempoReal(t => t + 1));
  const hoy = hoyISO();
  useEffect(() => {
    let activo = true;
    async function cargarDashboard() {
      setCargando(true);
      try {
        const cfg = await getConfig();
        const {
          meta,
          tablaLista
        } = await getMetaDia(hoy);
        const turnoActual = await getActual({});
        const descansosPorFechaHoy = await getDescansosDiariosRango([hoy], 'actual');
        // Muestra el último día registrado en el Histórico, no "ayer" fijo —
        // si el domingo no se trabaja, el pendiente por revisar sigue siendo el sábado.
        const ultimaFecha = await getUltimaFechaHistorico();
        if (activo) setFechaHistoricoMostrado(ultimaFecha);
        const historicoAyer = ultimaFecha ? await getHistorico({
          fecha: ultimaFecha
        }) : [];
        getTendenciaHistorico().then(r => {
          if (activo) setTendencia(r);
        }).catch(() => {});
        const totalTallosActual = turnoActual.reduce((s, r) => s + (r.total_tallos || 0), 0);
        const personasActual = new Set(turnoActual.map(r => r.colaborador_id)).size;
        const cumplimientoActual = meta > 0 ? Math.round(totalTallosActual / meta * 100) : 0;
        const promedioPersonaActual = personasActual > 0 ? Math.round(totalTallosActual / personasActual) : 0;
        const rendimientoPromedioActual = turnoActual.length > 0 ? Math.round(turnoActual.reduce((s, r) => s + (r.rendimiento || 0), 0) / turnoActual.length) : 0;
        const totalTallosAyer = historicoAyer.reduce((s, r) => s + (r.total_tallos || 0), 0);
        const personasAyer = historicoAyer.length;
        const conRendAyer = historicoAyer.filter(r => r.rendimiento > 0);
        const rendimientoPromedioAyer = conRendAyer.length > 0 ? Math.round(conRendAyer.reduce((s, r) => s + r.rendimiento, 0) / conRendAyer.length) : 0;
        if (!activo) return;
        setMetaHoy(meta);
        setMetaTablaLista(tablaLista);
        setPersonasParaDona(agregarTurnoActualPorPersona(turnoActual, cfg.descansosActivosActual ? cfg.descansosActual : [], descansosPorFechaHoy).map(p => ({
          colaborador_id: p.colaborador_id,
          colaborador: p.colaborador,
          promedioRend: p.rendimiento
        })));
        setCarruselHoy(agregarTurnoActualPorPersona(turnoActual, cfg.descansosActivosActual ? cfg.descansosActual : [], descansosPorFechaHoy).sort((a, b) => b.rendimiento - a.rendimiento));
        setCarruselAyer([...historicoAyer].sort((a, b) => (b.rendimiento || 0) - (a.rendimiento || 0)));
        setStats({
          cfg,
          actual: {
            totalTallos: totalTallosActual,
            personas: personasActual,
            cumplimiento: cumplimientoActual,
            promedioPersona: promedioPersonaActual,
            rendimientoPromedio: rendimientoPromedioActual,
            bloques: turnoActual.length
          },
          ayer: {
            totalTallos: totalTallosAyer,
            personas: personasAyer,
            rendimientoPromedio: rendimientoPromedioAyer
          }
        });
      } catch (e) {
        if (activo) setError(e.message);
      } finally {
        if (activo) setCargando(false);
      }
    }
    cargarDashboard();
    return () => {
      activo = false;
    };
  }, [hoy, tickTiempoReal]);
  return <>
      <PageHeader title="Dashboard Ejecutivo" subtitle="Resumen general de producción, en tiempo real desde el Turno Actual.">
        <button className="btn-secondary" onClick={() => {
          setPresentando(true);
          getRendimientoPorLinea(hoy, hoy).then(setResumenPorLinea).catch(() => {});
        }}>
          <i className="fa-solid fa-expand"></i> Presentar
        </button>
        <Link to="/rendimientos" className="btn-primary">
          <i className="fa-solid fa-upload"></i> Subir Reporte Boncheo
        </Link>
      </PageHeader>

      <div className="page">
        {!supabaseConfigurado && <div className="alert warn">
            <i className="fa-solid fa-triangle-exclamation"></i>
            Supabase no está configurado. Copia <code>.env.example</code> a <code>.env</code> con las credenciales de tu proyecto "tm-control" y reinicia la app. Ver MANUAL.md.
          </div>}
        {error && <div className="alert err"><i className="fa-solid fa-circle-exclamation"></i> {error}</div>}
        {cargando && <p style={{
        color: 'var(--gray)'
      }}>Cargando datos...</p>}

        {stats && <>
            {!metaTablaLista && <div className="alert warn">
                <i className="fa-solid fa-triangle-exclamation"></i>
                Falta crear la tabla "metas_diarias" en Supabase — corre <code>supabase/migracion_metas_diarias.sql</code>. Mientras tanto se usa el valor por defecto de Configuración.
              </div>}

            <h3 className="dashboard-section-title"><i className="fa-solid fa-bolt"></i> Turno Actual (en vivo, {stats.actual.bloques} bloques cargados)</h3>
            <section className="cards">
              <div className="card"><div className="icon"><i className="fa-solid fa-users"></i></div>
                <div><span>Mesas Activas</span><h2>{stats.actual.personas}</h2><small>{hoy}</small></div></div>
              <div className="card"><div className="icon"><i className="fa-solid fa-seedling"></i></div>
                <div><span>Total Tallos</span><h2>{stats.actual.totalTallos.toLocaleString()}</h2><small>Última carga por hora</small></div></div>
              <div className="card acento-oro"><div className="icon"><i className="fa-solid fa-gauge-high"></i></div>
                <div><span>Rendimiento Promedio</span><h2>{stats.actual.rendimientoPromedio}</h2><small>tallos/hora real</small></div></div>
              <div className="card acento-azul"><div className="icon"><i className="fa-solid fa-chart-line"></i></div>
                <div><span>Cumplimiento</span><h2>{stats.actual.cumplimiento}%</h2><small>Meta de hoy: {metaHoy.toLocaleString()}</small></div></div>
            </section>

            <section className="performance-summary">
              <div className="summary-left">
                <div className="summary-badge"><i className="fa-solid fa-chart-line"></i> Producción en vivo</div>
                <h2>Producción del Turno Actual</h2>
                <div className="summary-stat-principal">
                  <span className="summary-stat-numero">{stats.actual.totalTallos.toLocaleString()}</span>
                  <span className="summary-stat-de">de</span>
                  <span className="summary-stat-meta">{metaHoy.toLocaleString()}</span>
                  <span className="summary-stat-unidad">tallos</span>
                </div>

                <div className="progress-con-emoji">
                  <div className="progress">
                    <div style={{ width: `${Math.min(stats.actual.cumplimiento, 100)}%`, background: colorProgreso(stats.actual.cumplimiento) }}></div>
                    <span
                      className="progress-emoji-flotante"
                      title={emojiCumplimiento(stats.actual.cumplimiento).texto}
                      style={{ left: `${Math.min(Math.max(stats.actual.cumplimiento, 4), 96)}%` }}
                    >
                      {emojiCumplimiento(stats.actual.cumplimiento).icono}
                    </span>
                  </div>
                  <div className="progress-pie">
                    <span className="progress-pct" style={{ color: colorProgreso(stats.actual.cumplimiento) }}>{stats.actual.cumplimiento}%</span>
                    <span className="progress-faltan">
                      {stats.actual.cumplimiento >= 100
                        ? `¡Meta superada por ${(stats.actual.totalTallos - metaHoy).toLocaleString()} tallos!`
                        : `Faltan ${Math.max(0, metaHoy - stats.actual.totalTallos).toLocaleString()} tallos para la meta`}
                    </span>
                  </div>
                </div>

                <p className="summary-nota">
                  <i className="fa-solid fa-circle-info"></i> La meta de hoy se define en <Link to="/configuracion">Configuración</Link>.
                </p>
              </div>
              <div className="summary-right">
                <div className="mini-card">
                  <div className="mini-card-icono"><i className="fa-solid fa-bullseye"></i></div>
                  <div><span>Meta de Hoy</span><h3>{metaHoy.toLocaleString()}</h3></div>
                </div>
                <div className="mini-card">
                  <div className="mini-card-icono"><i className="fa-solid fa-user-group"></i></div>
                  <div><span>Tallos / Persona</span><h3>{stats.actual.promedioPersona.toLocaleString()}</h3></div>
                </div>
                <div className="mini-card">
                  <div className="mini-card-icono"><i className="fa-solid fa-gauge-high"></i></div>
                  <div><span>Rendimiento Promedio</span><h3>{stats.actual.rendimientoPromedio}</h3></div>
                </div>
                <div className="mini-card">
                  <div className="mini-card-icono"><i className="fa-solid fa-stopwatch"></i></div>
                  <div><span>Meta / Hora</span><h3>{stats.cfg.metaHora}</h3></div>
                </div>
              </div>
            </section>

            {stats.actual.bloques === 0 && <div className="alert warn">
                <i className="fa-solid fa-triangle-exclamation"></i>
                Todavía no hay ninguna carga de Turno Actual. Ve a <Link to="/rendimientos" style={{
            fontWeight: 700,
            textDecoration: 'underline'
          }}>Rendimientos</Link> y sube el Reporte Consolidado Boncheo (opción "Turno actual").
              </div>}

            <h3 className="dashboard-section-title"><i className="fa-solid fa-calendar-days"></i> Último Histórico registrado {fechaHistoricoMostrado ? `(${fechaHistoricoMostrado})` : ''}</h3>
            <section className="cards">
              <div className="card"><div className="icon"><i className="fa-solid fa-users"></i></div>
                <div><span>Personas con Registro</span><h2>{stats.ayer.personas}</h2><small>{fechaHistoricoMostrado || 'Sin datos'}</small></div></div>
              <div className="card"><div className="icon"><i className="fa-solid fa-seedling"></i></div>
                <div><span>Total Tallos</span><h2>{stats.ayer.totalTallos.toLocaleString()}</h2><small>Día cerrado</small></div></div>
              <div className="card acento-oro"><div className="icon"><i className="fa-solid fa-gauge-high"></i></div>
                <div><span>Rendimiento Promedio</span><h2>{stats.ayer.rendimientoPromedio}</h2><small>tallos/hora real</small></div></div>
            </section>

            {stats.ayer.personas === 0 && <div className="alert warn">
                <i className="fa-solid fa-triangle-exclamation"></i>
                Todavía no hay ningún día guardado en el Histórico. Sube un Excel en <Link to="/rendimientos" style={{
            fontWeight: 700,
            textDecoration: 'underline'
          }}>Rendimientos</Link> (opción "Histórico").
              </div>}

            <DashboardCarrusel personasHoy={carruselHoy} personasAyer={carruselAyer} metaHora={stats.cfg.metaHora} fechaHistorico={fechaHistoricoMostrado} />

            <h3 className="dashboard-section-title"><i className="fa-solid fa-chart-simple"></i> Visualizaciones</h3>
            <div className="dashboard-charts-grid">
              <section className="panel">
                <div className="panel-header">
                  <div>
                    <h2><i className="fa-solid fa-chart-area" style={{
                    color: 'var(--primary)',
                    marginRight: 8
                  }}></i>Tendencia de Producción</h2>
                    <p>Total de tallos por día, del mes en curso.</p>
                  </div>
                </div>
                <Suspense fallback={<p style={{
              color: 'var(--gray)',
              fontSize: 12.5
            }}>Cargando gráfica...</p>}>
                  <TendenciaTallosChart categorias={tendencia.categorias} valores={tendencia.valores} />
                </Suspense>
              </section>

              <section className="panel">
                <div className="panel-header">
                  <div>
                    <h2><i className="fa-solid fa-chart-pie" style={{
                    color: 'var(--primary)',
                    marginRight: 8
                  }}></i>Estado del Turno Actual</h2>
                    <p>Distribución del personal por nivel de desempeño, ahora mismo.</p>
                  </div>
                </div>
                <Suspense fallback={<p style={{
              color: 'var(--gray)',
              fontSize: 12.5
            }}>Cargando gráfica...</p>}>
                  <EstadoDonutChart lista={personasParaDona} metaHora={stats.cfg.metaHora} />
                </Suspense>
              </section>
            </div>
          </>}
      </div>
      {presentando && stats && (
        <ModoPresentacion
          ranking={carruselHoy}
          metaHora={stats.cfg.metaHora}
          totalTallos={stats.actual.totalTallos}
          metaHoy={metaHoy}
          cumplimiento={stats.actual.cumplimiento}
          resumenPorLinea={resumenPorLinea}
          onCerrar={() => setPresentando(false)}
        />
      )}
    </>;
}
