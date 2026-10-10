import { useEffect, useMemo, useState, lazy, Suspense } from 'react';
import PageHeader from '../components/PageHeader';
import RankingExcelTable from '../components/RankingExcelTable';
import Top3Podium from '../components/Top3Podium';
import RankingFormadoras from '../components/RankingFormadoras';
import CarruselLista from '../components/CarruselLista';
const EstadoDonutChart = lazy(() => import('../components/charts/EstadoDonutChart'));
import { getRankingDia, getRankingHoraAHora, getRankingRango, getConfig, getMetaTotalPeriodo } from '../lib/db';
import { useRealtimeRefresco } from '../lib/useRealtimeRefresco';
import { calcularPorcentajeMeta, clasificarEstado } from '../lib/calculos';
import { fechaLocalISO } from '../lib/clasificacionCalculos';

function hoyISO() {
  return fechaLocalISO();
}
function mesActualISO() {
  return new Date().toISOString().slice(0, 7);
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

export default function Ranking() {
  const [fuente, setFuente] = useState('historico');
  const [periodo, setPeriodo] = useState('dia');
  const [fecha, setFecha] = useState(hoyISO());
  const [fechaSemana, setFechaSemana] = useState(hoyISO());
  const [mes, setMes] = useState(mesActualISO());
  const [datos, setDatos] = useState({ lista: [], rendimientoPromedioGeneral: 0 });
  const [metaHora, setMetaHora] = useState(470);
  const [metaTallosPeriodo, setMetaTallosPeriodo] = useState(0);
  const [tickTiempoReal, setTickTiempoReal] = useState(0);
  useRealtimeRefresco(['rendimiento_historico', 'rendimiento_actual', 'metas_diarias'], () => setTickTiempoReal(t => t + 1));
  const [diaFinSemana, setDiaFinSemana] = useState(6);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getConfig().then(c => { setMetaHora(c.metaHora); setDiaFinSemana(c.diaFinSemana ?? 6); }).catch(() => {});
  }, []);

  const rangoSemanaActual = useMemo(() => rangoDeSemana(fechaSemana, diaFinSemana), [fechaSemana, diaFinSemana]);
  const rangoMesActual = useMemo(() => rangoDelMes(mes), [mes]);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError(null);
    let cargar;
    if (fuente === 'actual') {
      cargar = getRankingHoraAHora(fecha);
    } else if (periodo === 'semana') {
      cargar = getRankingRango(rangoSemanaActual.inicio, rangoSemanaActual.fin);
    } else if (periodo === 'mes') {
      cargar = getRankingRango(rangoMesActual.inicio, rangoMesActual.fin);
    } else {
      cargar = getRankingDia(fecha);
    }
    cargar
      .then(r => { if (activo) setDatos(r); })
      .catch(e => { if (activo) setError(e.message); })
      .finally(() => { if (activo) setCargando(false); });

    const [rangoMetaInicio, rangoMetaFin] = periodo === 'semana' && fuente !== 'actual'
      ? [rangoSemanaActual.inicio, rangoSemanaActual.fin]
      : periodo === 'mes' && fuente !== 'actual'
        ? [rangoMesActual.inicio, rangoMesActual.fin]
        : [fecha, fecha];
    getMetaTotalPeriodo(rangoMetaInicio, rangoMetaFin)
      .then(m => { if (activo) setMetaTallosPeriodo(m); })
      .catch(() => {});

    return () => { activo = false; };
  }, [fecha, fechaSemana, mes, fuente, periodo, rangoSemanaActual, rangoMesActual, tickTiempoReal]);

  const { lista, rendimientoPromedioGeneral } = datos;

  const resumen = useMemo(() => {
    const mejor = lista[0]?.promedioRend || 0;
    const operarios = lista.length;
    const cumplen = lista.filter(p => clasificarEstado(calcularPorcentajeMeta(p.promedioRend, metaHora)).css === 'success').length;
    const promedioPct = operarios > 0 ? Math.round(rendimientoPromedioGeneral / metaHora * 100) : 0;
    const tallosTotales = lista.reduce((s, p) => s + (p.totalTallos || 0), 0);
    return { mejor, operarios, cumplen, promedioPct, tallosTotales };
  }, [lista, rendimientoPromedioGeneral, metaHora]);

  // período que se está viendo (para el ranking de formadoras)
  const [desdeRank, hastaRank] = fuente === 'actual' || periodo === 'dia' ? [fecha, fecha]
    : periodo === 'semana' ? [rangoSemanaActual.inicio, rangoSemanaActual.fin] : [rangoMesActual.inicio, rangoMesActual.fin];

  const tituloTabla = fuente === 'actual'
    ? 'Ranking del Turno Actual (hora a hora)'
    : periodo === 'semana'
      ? `Mejor rendimiento — semana del ${formatoCorto(rangoSemanaActual.inicio)} al ${formatoCorto(rangoSemanaActual.fin)}`
      : periodo === 'mes'
        ? `Mejor rendimiento de ${new Date(mes + '-02').toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}`
        : 'Ranking del Histórico (día)';

  return (
    <>
      <PageHeader title="Ranking de Operarios" subtitle="Clasificación según rendimiento y productividad." />
      <div className="page">
        {!cargando && lista.length > 0 && (
          <section className="cards">
            <div className="card"><div className="icon"><i className="fa-solid fa-seedling"></i></div>
              <div><span>Mejor rendimiento</span><h2>{resumen.mejor}</h2><small>tallos procesados</small></div></div>
            <div className="card acento-azul"><div className="icon"><i className="fa-solid fa-users"></i></div>
              <div><span>Mesas operando</span><h2>{resumen.operarios}</h2><small>en este período</small></div></div>
            <div className="card acento-oro"><div className="icon"><i className="fa-solid fa-gauge-high"></i></div>
              <div><span>Cumplimiento de Tallos</span><h2>{resumen.promedioPct}%</h2><small>vs. la meta</small></div></div>
            <div className="card acento-rojo"><div className="icon"><i className="fa-solid fa-trophy"></i></div>
              <div><span>Meta cumplida</span><h2>{resumen.cumplen}</h2><small>operarios</small></div></div>
            <div className="card card-real-vs-meta"><div className="icon"><i className="fa-solid fa-layer-group"></i></div>
              <div>
                <span>Tallos Totales vs. Meta</span>
                <h2>{resumen.tallosTotales.toLocaleString()} <span className="card-meta-separador">/</span> <span className="card-meta-numero">{metaTallosPeriodo.toLocaleString()}</span></h2>
                <small>Real (producido) / Proyectado ({periodo === 'dia' || fuente === 'actual' ? 'del día' : 'del período'})</small>
              </div>
            </div>
            <div className="card acento-azul"><div className="icon"><i className="fa-solid fa-chart-simple"></i></div>
              <div><span>Rendimiento Promedio</span><h2>{rendimientoPromedioGeneral}</h2><small>tallos/hora</small></div></div>
          </section>
        )}

        <section className="filters">
          <div className="fuente-toggle">
            <button className={fuente === 'historico' ? 'activo' : ''} onClick={() => setFuente('historico')}>
              <i className="fa-solid fa-calendar-days"></i> Histórico
            </button>
            <button className={fuente === 'actual' ? 'activo' : ''} onClick={() => setFuente('actual')}>
              <i className="fa-solid fa-stopwatch"></i> Turno Actual
            </button>
          </div>

          {fuente === 'historico' && (
            <div className="fuente-toggle">
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
          )}

          {(fuente === 'actual' || periodo === 'dia') && (
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
          )}
          {fuente === 'historico' && periodo === 'semana' && (
            <>
              <input type="date" value={fechaSemana} onChange={e => setFechaSemana(e.target.value)} />
              <span style={{ fontSize: 11.5, color: 'var(--gray)' }}>
                Semana: {formatoCorto(rangoSemanaActual.inicio)} – {formatoCorto(rangoSemanaActual.fin)}
              </span>
            </>
          )}
          {fuente === 'historico' && periodo === 'mes' && (
            <input type="month" value={mes} onChange={e => setMes(e.target.value)} />
          )}

          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--gray)' }}>
            {cargando ? 'Cargando...' : `${lista.length} colaboradores`}
          </span>
        </section>

        {error && <div className="alert err"><i className="fa-solid fa-circle-exclamation"></i> {error}</div>}

        {!cargando && lista.length > 0 && <Top3Podium lista={lista} metaHora={metaHora} />}

        {!cargando && lista.length > 0 && (
          <CarruselLista personas={lista} metaHora={metaHora} titulo="Ranking en vivo" icono="fa-ranking-star" />
        )}

        {!cargando && lista.length > 0 && (
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2><i className="fa-solid fa-chart-pie" style={{ color: 'var(--primary)', marginRight: 8 }}></i>Distribución por Estado</h2>
                <p>Cuántos operarios están en cada nivel de desempeño.</p>
              </div>
            </div>
            <Suspense fallback={<p style={{ color: 'var(--gray)', fontSize: 12.5 }}>Cargando gráfica...</p>}>
              <EstadoDonutChart lista={lista} metaHora={metaHora} />
            </Suspense>
          </section>
        )}

        <RankingFormadoras fuente={fuente} desde={desdeRank} hasta={hastaRank} metaHora={metaHora} />

        <section className="panel">
          {!cargando && lista.length === 0 ? (
            <div className="empty-state">
              <i className="fa-solid fa-ranking-star"></i>
              {fuente === 'actual'
                ? 'No hay registros en el Turno Actual para esa fecha.'
                : periodo === 'semana'
                  ? 'No hay tiempo trabajado registrado para ningún día de esa semana en el Histórico.'
                  : periodo === 'mes'
                    ? 'No hay tiempo trabajado registrado para ningún día de ese mes en el Histórico.'
                    : 'No hay tiempo trabajado registrado para esa fecha en el Histórico (edita el tiempo en Rendimientos para que aparezca aquí).'}
            </div>
          ) : (
            <RankingExcelTable lista={lista} metaHora={metaHora} titulo={tituloTabla} topInicial={5} />
          )}
        </section>
      </div>
    </>
  );
}
