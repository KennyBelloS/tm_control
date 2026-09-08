import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader';
import RankingExcelTable from '../components/RankingExcelTable';
import Top3Podium from '../components/Top3Podium';
import { lazy, Suspense } from 'react';
const EstadoDonutChart = lazy(() => import('../components/charts/EstadoDonutChart'));
import { getRankingDia, getRankingHoraAHora, getRankingRango, getConfig } from '../lib/db';
import { calcularPorcentajeMeta, clasificarEstado } from '../lib/calculos';
function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}
function mesActualISO() {
  return new Date().toISOString().slice(0, 7);
}
function rangoDelMes(mesISO) {
  const [anio, mes] = mesISO.split('-').map(Number);
  const inicio = `${mesISO}-01`;
  const ultimoDia = new Date(anio, mes, 0).getDate();
  const fin = `${mesISO}-${String(ultimoDia).padStart(2, '0')}`;
  return {
    inicio,
    fin
  };
}
export default function Ranking() {
  const [fuente, setFuente] = useState('historico');
  const [periodo, setPeriodo] = useState('dia');
  const [fecha, setFecha] = useState(hoyISO());
  const [mes, setMes] = useState(mesActualISO());
  const [datos, setDatos] = useState({
    lista: [],
    rendimientoPromedioGeneral: 0
  });
  const [metaHora, setMetaHora] = useState(470);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    getConfig().then(c => setMetaHora(c.metaHora)).catch(() => {});
  }, []);
  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError(null);
    let cargar;
    if (fuente === 'actual') {
      cargar = getRankingHoraAHora(fecha);
    } else if (periodo === 'mes') {
      const {
        inicio,
        fin
      } = rangoDelMes(mes);
      cargar = getRankingRango(inicio, fin);
    } else {
      cargar = getRankingDia(fecha);
    }
    cargar.then(r => {
      if (activo) setDatos(r);
    }).catch(e => {
      if (activo) setError(e.message);
    }).finally(() => {
      if (activo) setCargando(false);
    });
    return () => {
      activo = false;
    };
  }, [fecha, mes, fuente, periodo]);
  const {
    lista,
    rendimientoPromedioGeneral
  } = datos;
  const resumen = useMemo(() => {
    const mejor = lista[0]?.promedioRend || 0;
    const operarios = lista.length;
    const cumplen = lista.filter(p => clasificarEstado(calcularPorcentajeMeta(p.promedioRend, metaHora)).css === 'success').length;
    const promedioPct = operarios > 0 ? Math.round(rendimientoPromedioGeneral / metaHora * 100) : 0;
    const tallosTotales = lista.reduce((s, p) => s + (p.totalTallos || 0), 0);
    return {
      mejor,
      operarios,
      cumplen,
      promedioPct,
      tallosTotales
    };
  }, [lista, rendimientoPromedioGeneral, metaHora]);
  const tituloTabla = fuente === 'actual' ? 'Ranking del Turno Actual (hora a hora)' : periodo === 'mes' ? `Mejor rendimiento de ${new Date(mes + '-02').toLocaleDateString('es-CO', {
    month: 'long',
    year: 'numeric'
  })}` : 'Ranking del Histórico (día)';
  return <>
      <PageHeader title="Ranking de Operarios" subtitle="Clasificación según rendimiento y productividad." />
      <div className="page">
        {}
        {!cargando && lista.length > 0 && <section className="cards">
            <div className="card"><div className="icon"><i className="fa-solid fa-seedling"></i></div>
              <div><span>Mejor rendimiento</span><h2>{resumen.mejor}</h2><small>tallos procesados</small></div></div>
            <div className="card acento-azul"><div className="icon"><i className="fa-solid fa-users"></i></div>
              <div><span>Operarios trabajando</span><h2>{resumen.operarios}</h2><small>en este período</small></div></div>
            <div className="card acento-oro"><div className="icon"><i className="fa-solid fa-gauge-high"></i></div>
              <div><span>Promedio general</span><h2>{resumen.promedioPct}%</h2><small>cumplimiento</small></div></div>
            <div className="card acento-rojo"><div className="icon"><i className="fa-solid fa-trophy"></i></div>
              <div><span>Meta cumplida</span><h2>{resumen.cumplen}</h2><small>operarios</small></div></div>
            <div className="card"><div className="icon"><i className="fa-solid fa-layer-group"></i></div>
              <div><span>Tallos Totales</span><h2>{resumen.tallosTotales.toLocaleString()}</h2><small>del período</small></div></div>
            <div className="card acento-azul"><div className="icon"><i className="fa-solid fa-chart-simple"></i></div>
              <div><span>Rendimiento Promedio</span><h2>{rendimientoPromedioGeneral}</h2><small>tallos/hora</small></div></div>
          </section>}

        {}
        <section className="filters">
          <div className="fuente-toggle">
            <button className={fuente === 'historico' ? 'activo' : ''} onClick={() => setFuente('historico')}>
              <i className="fa-solid fa-calendar-days"></i> Histórico
            </button>
            <button className={fuente === 'actual' ? 'activo' : ''} onClick={() => setFuente('actual')}>
              <i className="fa-solid fa-stopwatch"></i> Turno Actual
            </button>
          </div>

          {fuente === 'historico' && <div className="fuente-toggle">
              <button className={periodo === 'dia' ? 'activo' : ''} onClick={() => setPeriodo('dia')}>
                <i className="fa-solid fa-calendar-day"></i> Por día
              </button>
              <button className={periodo === 'mes' ? 'activo' : ''} onClick={() => setPeriodo('mes')}>
                <i className="fa-solid fa-calendar"></i> Por mes
              </button>
            </div>}

          {(fuente === 'actual' || periodo === 'dia') && <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />}
          {fuente === 'historico' && periodo === 'mes' && <input type="month" value={mes} onChange={e => setMes(e.target.value)} />}

          <span style={{
          marginLeft: 'auto',
          fontSize: 12,
          color: 'var(--gray)'
        }}>
            {cargando ? 'Cargando...' : `${lista.length} colaboradores`}
          </span>
        </section>

        {error && <div className="alert err"><i className="fa-solid fa-circle-exclamation"></i> {error}</div>}

        {}
        {!cargando && lista.length > 0 && <Top3Podium lista={lista} metaHora={metaHora} />}

        {}
        {!cargando && lista.length > 0 && <section className="panel">
            <div className="panel-header">
              <div>
                <h2><i className="fa-solid fa-chart-pie" style={{
                color: 'var(--primary)',
                marginRight: 8
              }}></i>Distribución por Estado</h2>
                <p>Cuántos operarios están en cada nivel de desempeño.</p>
              </div>
            </div>
            <Suspense fallback={<p style={{
          color: 'var(--gray)',
          fontSize: 12.5
        }}>Cargando gráfica...</p>}>
              <EstadoDonutChart lista={lista} metaHora={metaHora} />
            </Suspense>
          </section>}

        {}
        <section className="panel">
          {!cargando && lista.length === 0 ? <div className="empty-state">
              <i className="fa-solid fa-ranking-star"></i>
              {fuente === 'actual' ? 'No hay registros en el Turno Actual para esa fecha.' : periodo === 'mes' ? 'No hay tiempo trabajado registrado para ningún día de ese mes en el Histórico.' : 'No hay tiempo trabajado registrado para esa fecha en el Histórico (edita el tiempo en Rendimientos para que aparezca aquí).'}
            </div> : <RankingExcelTable lista={lista} metaHora={metaHora} titulo={tituloTabla} topInicial={5} />}
        </section>
      </div>
    </>;
}
