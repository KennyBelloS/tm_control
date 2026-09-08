import { useEffect, useState, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { getConfig, getHistorico, getActual, getMetaDia, getTendenciaHistorico } from '../lib/db';
import { agregarTurnoActualPorPersona } from '../lib/calculos';
import { supabaseConfigurado } from '../lib/supabaseClient';

const TendenciaTallosChart = lazy(() => import('../components/charts/TendenciaTallosChart'));
const EstadoDonutChart = lazy(() => import('../components/charts/EstadoDonutChart'));

function hoyISO() { return new Date().toISOString().slice(0, 10); }
function ayerISO() { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); }

export default function Dashboard() {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [tendencia, setTendencia] = useState({ categorias: [], valores: [] });
  const [metaHoy, setMetaHoy] = useState(0);
  const [metaTablaLista, setMetaTablaLista] = useState(true);
  const [personasParaDona, setPersonasParaDona] = useState([]);
  const hoy = hoyISO();
  const ayer = ayerISO();

  useEffect(() => {
    let activo = true;
    (async () => {
      setCargando(true);
      try {
        const cfg = await getConfig();
        const { meta, tablaLista } = await getMetaDia(hoy);
        const turnoActual = await getActual({});
        const historicoAyer = await getHistorico({ fecha: ayer });
        getTendenciaHistorico(14).then(r => { if (activo) setTendencia(r); }).catch(() => {});

        const totalTallosActual = turnoActual.reduce((s, r) => s + (r.total_tallos || 0), 0);
        const personasActual = new Set(turnoActual.map(r => r.colaborador_id)).size;
        const cumplimientoActual = meta > 0 ? Math.round((totalTallosActual / meta) * 100) : 0;
        const promedioPersonaActual = personasActual > 0 ? Math.round(totalTallosActual / personasActual) : 0;
        const rendimientoPromedioActual = turnoActual.length > 0
          ? Math.round(turnoActual.reduce((s, r) => s + (r.rendimiento || 0), 0) / turnoActual.length)
          : 0;

        const totalTallosAyer = historicoAyer.reduce((s, r) => s + (r.total_tallos || 0), 0);
        const personasAyer = historicoAyer.length;
        const conRendAyer = historicoAyer.filter(r => r.rendimiento > 0);
        const rendimientoPromedioAyer = conRendAyer.length > 0
          ? Math.round(conRendAyer.reduce((s, r) => s + r.rendimiento, 0) / conRendAyer.length)
          : 0;

        if (!activo) return;
        setMetaHoy(meta);
        setMetaTablaLista(tablaLista);
        setPersonasParaDona(
          agregarTurnoActualPorPersona(turnoActual, cfg.descansosActivos ? cfg.descansos : [])
            .map(p => ({ colaborador_id: p.colaborador_id, colaborador: p.colaborador, promedioRend: p.rendimiento }))
        );
        setStats({
          cfg,
          actual: { totalTallos: totalTallosActual, personas: personasActual, cumplimiento: cumplimientoActual, promedioPersona: promedioPersonaActual, rendimientoPromedio: rendimientoPromedioActual, bloques: turnoActual.length },
          ayer: { totalTallos: totalTallosAyer, personas: personasAyer, rendimientoPromedio: rendimientoPromedioAyer },
        });
      } catch (e) {
        if (activo) setError(e.message);
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => { activo = false; };
  }, [hoy, ayer]);

  return (
    <>
      <PageHeader title="Dashboard Ejecutivo" subtitle="Resumen general de producción, en tiempo real desde el Turno Actual.">
        <Link to="/rendimientos" className="btn-primary">
          <i className="fa-solid fa-upload"></i> Subir Reporte Boncheo
        </Link>
      </PageHeader>

      <div className="page">
        {!supabaseConfigurado && (
          <div className="alert warn">
            <i className="fa-solid fa-triangle-exclamation"></i>
            Supabase no está configurado. Copia <code>.env.example</code> a <code>.env</code> con las credenciales de tu proyecto "tm-control" y reinicia la app. Ver MANUAL.md.
          </div>
        )}
        {error && <div className="alert err"><i className="fa-solid fa-circle-exclamation"></i> {error}</div>}
        {cargando && <p style={{ color: 'var(--gray)' }}>Cargando datos...</p>}

        {stats && (
          <>
            {!metaTablaLista && (
              <div className="alert warn">
                <i className="fa-solid fa-triangle-exclamation"></i>
                Falta crear la tabla "metas_diarias" en Supabase — corre <code>supabase/migracion_metas_diarias.sql</code>. Mientras tanto se usa el valor por defecto de Configuración.
              </div>
            )}

            <h3 className="dashboard-section-title"><i className="fa-solid fa-bolt"></i> Turno Actual (en vivo, {stats.actual.bloques} bloques cargados)</h3>
            <section className="cards">
              <div className="card"><div className="icon"><i className="fa-solid fa-users"></i></div>
                <div><span>Personas Activas</span><h2>{stats.actual.personas}</h2><small>{hoy}</small></div></div>
              <div className="card"><div className="icon"><i className="fa-solid fa-seedling"></i></div>
                <div><span>Total Tallos</span><h2>{stats.actual.totalTallos.toLocaleString()}</h2><small>Última carga por hora</small></div></div>
              <div className="card acento-oro"><div className="icon"><i className="fa-solid fa-gauge-high"></i></div>
                <div><span>Rendimiento Promedio</span><h2>{stats.actual.rendimientoPromedio}</h2><small>tallos/hora real</small></div></div>
              <div className="card acento-azul"><div className="icon"><i className="fa-solid fa-chart-line"></i></div>
                <div><span>Cumplimiento</span><h2>{stats.actual.cumplimiento}%</h2><small>Meta de hoy: {metaHoy.toLocaleString()}</small></div></div>
            </section>

            <section className="performance-summary">
              <div className="summary-left">
                <h2>Producción del Turno Actual</h2>
                <p>Se han producido <strong>{stats.actual.totalTallos.toLocaleString()}</strong> tallos de una meta de <strong>{metaHoy.toLocaleString()}</strong> para hoy.</p>
                <div className="progress"><div style={{ width: `${Math.min(stats.actual.cumplimiento, 100)}%` }}></div></div>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,.7)', marginTop: 10 }}>
                  <i className="fa-solid fa-circle-info"></i> La meta de hoy se define en <Link to="/configuracion" style={{ color: '#fff', fontWeight: 700, textDecoration: 'underline' }}>Configuración</Link>.
                </p>
              </div>
              <div className="summary-right">
                <div className="mini-card"><span>Meta de Hoy</span><h3>{metaHoy.toLocaleString()}</h3></div>
                <div className="mini-card"><span>Tallos Promedio / Persona</span><h3>{stats.actual.promedioPersona}</h3></div>
                <div className="mini-card"><span>Rendimiento Promedio</span><h3>{stats.actual.rendimientoPromedio}</h3></div>
                <div className="mini-card"><span>Meta Hora</span><h3>{stats.cfg.metaHora}</h3></div>
              </div>
            </section>

            {stats.actual.bloques === 0 && (
              <div className="alert warn">
                <i className="fa-solid fa-triangle-exclamation"></i>
                Todavía no hay ninguna carga de Turno Actual. Ve a <Link to="/rendimientos" style={{ fontWeight: 700, textDecoration: 'underline' }}>Rendimientos</Link> y sube el Reporte Consolidado Boncheo (opción "Turno actual").
              </div>
            )}

            <h3 className="dashboard-section-title"><i className="fa-solid fa-calendar-days"></i> Histórico de Ayer ({ayer})</h3>
            <section className="cards">
              <div className="card"><div className="icon"><i className="fa-solid fa-users"></i></div>
                <div><span>Personas con Registro</span><h2>{stats.ayer.personas}</h2><small>{ayer}</small></div></div>
              <div className="card"><div className="icon"><i className="fa-solid fa-seedling"></i></div>
                <div><span>Total Tallos</span><h2>{stats.ayer.totalTallos.toLocaleString()}</h2><small>Día cerrado</small></div></div>
              <div className="card acento-oro"><div className="icon"><i className="fa-solid fa-gauge-high"></i></div>
                <div><span>Rendimiento Promedio</span><h2>{stats.ayer.rendimientoPromedio}</h2><small>tallos/hora real</small></div></div>
            </section>

            {stats.ayer.personas === 0 && (
              <div className="alert warn">
                <i className="fa-solid fa-triangle-exclamation"></i>
                No hay Histórico guardado para ayer ({ayer}). Sube el Excel del día anterior en <Link to="/rendimientos" style={{ fontWeight: 700, textDecoration: 'underline' }}>Rendimientos</Link> (opción "Histórico").
              </div>
            )}

            <h3 className="dashboard-section-title"><i className="fa-solid fa-chart-simple"></i> Visualizaciones</h3>
            <div className="dashboard-charts-grid">
              <section className="panel">
                <div className="panel-header">
                  <div>
                    <h2><i className="fa-solid fa-chart-area" style={{ color: 'var(--primary)', marginRight: 8 }}></i>Tendencia de Producción</h2>
                    <p>Total de tallos por día, últimos 14 días del Histórico.</p>
                  </div>
                </div>
                <Suspense fallback={<p style={{ color: 'var(--gray)', fontSize: 12.5 }}>Cargando gráfica...</p>}>
                  <TendenciaTallosChart categorias={tendencia.categorias} valores={tendencia.valores} />
                </Suspense>
              </section>

              <section className="panel">
                <div className="panel-header">
                  <div>
                    <h2><i className="fa-solid fa-chart-pie" style={{ color: 'var(--primary)', marginRight: 8 }}></i>Estado del Turno Actual</h2>
                    <p>Distribución del personal por nivel de desempeño, ahora mismo.</p>
                  </div>
                </div>
                <Suspense fallback={<p style={{ color: 'var(--gray)', fontSize: 12.5 }}>Cargando gráfica...</p>}>
                  <EstadoDonutChart lista={personasParaDona} metaHora={stats.cfg.metaHora} />
                </Suspense>
              </section>
            </div>
          </>
        )}
      </div>
    </>
  );
}
