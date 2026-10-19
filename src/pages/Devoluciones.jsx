import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { EstadoVacio, BloqueCargando } from '../components/Estados';
import CargaDevoluciones from '../components/devoluciones/CargaDevoluciones';
import ResumenDev from '../components/devoluciones/ResumenDev';
import TopDev from '../components/devoluciones/TopDev';
import CausasDev from '../components/devoluciones/CausasDev';
import TendenciaDev from '../components/devoluciones/TendenciaDev';
import ColaboradorDev from '../components/devoluciones/ColaboradorDev';
import FormadorasDev from '../components/devoluciones/FormadorasDev';
import { fFecha } from '../components/devoluciones/util';
import { cargarDatosDevoluciones, esErrorSinTablas } from '../lib/devoluciones';
import { periodos as calcularPeriodos, estadoPeriodo, resumenPeriodo, rankingPeriodo, causas, tendencia, devolucionesSinAsistencia } from '../lib/devolucionesCalculos';
import { useRealtimeRefresco } from '../lib/useRealtimeRefresco';
import { useMostrarColaborador } from '../lib/periodoDev';
import { useSesion } from '../lib/useSesion';
import { puedeEditar } from '../lib/roles';
import { fechaLocalISO } from '../lib/clasificacionCalculos';

const TABS = [['resumen', 'Resumen', 'fa-table-cells'], ['top', 'Top 5', 'fa-ranking-star'], ['causas', 'Causas', 'fa-chart-pie'], ['tendencia', 'Tendencia', 'fa-chart-line'], ['colaborador', 'Colaborador', 'fa-user'], ['formadoras', 'Formadoras', 'fa-people-group']];
const leerMin = () => { try { const j = JSON.parse(localStorage.getItem('tm_dev_min')); return { semana: j.semana ?? 5, mes: j.mes ?? 22, historico: j.historico ?? 25 }; } catch { return { semana: 5, mes: 22, historico: 25 }; } };

export default function Devoluciones() {
  const { sesion } = useSesion();
  const puedeCargar = puedeEditar(sesion?.rol);
  const [datos, setDatos] = useState(undefined);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('resumen');
  const [params] = useSearchParams();
  const [buscarColab, setBuscarColab] = useState(params.get('buscar') || '');
  useEffect(() => { if (params.get('buscar')) setTab('colaborador'); }, []);        // viene del Tablero integrado del colaborador
  const [fecha, setFecha] = useState('');
  const [minimos, setMinimos] = useState(leerMin);
  const [modo, setModo] = useMostrarColaborador();          // Mostrar colaborador por: Código / Nombre / Ambos (como en el Excel)

  const cargar = useCallback(async () => {
    try {
      const d = await cargarDatosDevoluciones();
      setDatos(d); setError('');
      setFecha(f => f || d.meta?.ultima_fecha_registro || d.dias[d.dias.length - 1]?.fecha || fechaLocalISO());
    } catch (e) { setError(esErrorSinTablas(e) ? 'sin-tablas' : (e.message || 'No se pudieron leer las devoluciones.')); setDatos(null); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);
  useRealtimeRefresco(['devoluciones_dia', 'devoluciones_meta', 'devoluciones_asistencia'], cargar);
  useEffect(() => { try { localStorage.setItem('tm_dev_min', JSON.stringify(minimos)); } catch { /* sin almacenamiento */ } }, [minimos]);

  const razones = datos?.meta?.razones?.length ? datos.meta.razones : [];
  const hayDatos = !!datos && datos.dias.length > 0;
  const P = useMemo(() => (fecha ? calcularPeriodos(fecha) : null), [fecha]);
  const min4 = useMemo(() => ({ dia: 1, ...minimos }), [minimos]);

  // Todo se calcula una sola vez por cambio de fecha o de datos
  const calc = useMemo(() => {
    if (!hayDatos || !P) return null;
    const estados = Object.fromEntries(Object.entries(P).map(([k, p]) => [k, estadoPeriodo(datos, p)]));
    const resumen = Object.fromEntries(Object.entries(estados).map(([k, e]) => [k, resumenPeriodo(e)]));
    const rankings = Object.fromEntries(Object.entries(estados).map(([k, e]) => [k, rankingPeriodo(e, datos.personas, min4[k])]));
    const c = causas(datos, razones, P);
    return { resumen, rankings, causas: c, cuadra: Object.fromEntries(Object.keys(P).map(k => [k, c.totales[k] === resumen[k].total])), serie: tendencia(datos, fecha), calidad: devolucionesSinAsistencia(datos) };
  }, [hayDatos, datos, P, razones, min4, fecha]);

  const primera = hayDatos ? datos.dias[0].fecha : null;
  const ultima = datos?.meta?.ultima_fecha_registro || (hayDatos ? datos.dias[datos.dias.length - 1].fecha : null);
  const diaSinCargar = !!ultima && !!fecha && fecha > ultima;          // el día elegido es posterior al último que se subió: no hay nada cargado
  const cambiarMin = (k, v) => setMinimos(m => ({ ...m, [k]: Math.max(1, Math.min(31, Number(v) || 1)) }));

  return (
    <>
      <PageHeader title="Devoluciones" subtitle="Calidad: devoluciones por persona, día, semana, mes y causa" />
      <div className="page dev-pagina">
        {error === 'sin-tablas' && <EstadoVacio icono="fa-database" titulo="Falta preparar la base de datos" texto="Corre en Supabase el SQL del módulo de Devoluciones (sección 24 de migracion_autenticacion.sql) y recarga esta pantalla." />}
        {error && error !== 'sin-tablas' && <div className="alert err"><i className="fa-solid fa-circle-exclamation"></i> {error}</div>}
        {datos === undefined && !error && <BloqueCargando alto={220} etiqueta="Cargando devoluciones…" />}

        {datos !== undefined && error !== 'sin-tablas' && (
          <>
            <div className="dev-cabecera">
              <div className="dev-estado">
                {hayDatos
                  ? <><span className="dev-punto"></span><div><strong>Datos hasta el {fFecha(datos.meta.ultima_fecha_registro || datos.dias[datos.dias.length - 1].fecha)}</strong><small>{datos.dias.length.toLocaleString('es-CO')} registros · {datos.personas.size} personas · desde {fFecha(primera)}</small></div></>
                  : <div><strong>Aún no hay devoluciones cargadas</strong><small>{puedeCargar ? 'Sube el Excel para empezar.' : 'Pídele a quien carga los datos que suba el Excel.'}</small></div>}
              </div>
              <CargaDevoluciones meta={datos.meta} hayDatos={hayDatos} puedeCargar={puedeCargar} onGuardado={cargar} />
            </div>

            {hayDatos && calc && (
              <>
                <div className="dev-barra">
                  <label>Día<input type="date" value={fecha} min={primera} max={fechaLocalISO()} onChange={e => e.target.value && setFecha(e.target.value)} /></label>
                  <label className="dev-mostrar" title="Cómo se muestra cada colaborador en los rankings, gráficos y tablas">Mostrar colaborador por
                    <select value={modo} onChange={e => setModo(e.target.value)}><option value="codigo">Código</option><option value="nombre">Nombre</option><option value="ambos">Ambos</option></select>
                  </label>
                  <div className="dev-minimos" title="Mínimo de días trabajados para entrar en el ranking de “menos devoluciones”">
                    <span>Mín. días</span>
                    {[['semana', 'Sem.'], ['mes', 'Mes'], ['historico', 'Hist.']].map(([k, et]) => <label key={k}>{et}<input type="number" min="1" max="31" value={minimos[k]} onChange={e => cambiarMin(k, e.target.value)} /></label>)}
                  </div>
                </div>

                <div className="fuente-toggle dev-tabs" role="tablist">
                  {TABS.map(([k, n, i]) => <button key={k} className={tab === k ? 'activo' : ''} onClick={() => { setTab(k); if (k !== 'colaborador') setBuscarColab(''); }} role="tab" aria-selected={tab === k} aria-label={n} title={n}><i className={`fa-solid ${i}`}></i><span>{n}</span></button>)}
                </div>

                {diaSinCargar && <p className="dev-nota dev-nota-aviso"><i className="fa-solid fa-triangle-exclamation"></i> El <b>{fFecha(fecha)}</b> todavía no tiene devoluciones cargadas (el último día cargado es el <b>{fFecha(ultima)}</b>). Por eso el «Día» aparece sin datos; la semana y el mes solo suman lo que ya está cargado.</p>}
                {tab === 'resumen' && <ResumenDev resumen={calc.resumen} periodos={P} fecha={fecha} calidad={calc.calidad} cuadra={calc.cuadra} primera={primera} diaSinCargar={diaSinCargar} />}
                {tab === 'top' && <TopDev rankings={calc.rankings} periodos={P} minimos={min4} diaSinCargar={diaSinCargar} ultima={ultima} modo={modo} onVer={e => { setBuscarColab(String(e.codigo ?? e.nombre)); setTab('colaborador'); }} />}
                {tab === 'causas' && <CausasDev datos={calc.causas} diaSinCargar={diaSinCargar} />}
                {tab === 'tendencia' && <TendenciaDev serie={calc.serie} />}
                {tab === 'colaborador' && <ColaboradorDev datos={datos} periodos={P} minimos={min4} razones={razones} diaSinCargar={diaSinCargar} modo={modo} inicial={buscarColab} />}
                {tab === 'formadoras' && <FormadorasDev datos={datos} fecha={fecha} razones={razones} ultima={ultima} modo={modo} />}
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
