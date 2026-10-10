import { useEffect, useMemo, useState } from 'react';
import { getDetalleRendimientoAsignaciones, getDetalleRendimientoTurnoActual } from '../lib/lineas';
import { formatoFecha, etiquetaHora, etiquetaCortaLinea } from '../lib/clasificacionCalculos';
import { useRealtimeRefresco } from '../lib/useRealtimeRefresco';

const fmt = n => (n ?? 0).toLocaleString('es-CO');
const flecha = n => (n > 0 ? `▲ +${fmt(n)}` : n < 0 ? `▼ −${fmt(Math.abs(n))}` : '＝ igual');
const nombresLineas = nums => nums.map(etiquetaCortaLinea).join(' + ');
const iniciales = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();
const MEDALLAS = ['🥇', '🥈', '🥉'];

/**
 * Rendimiento por formadora o por línea, en dos fuentes (hora a hora = Turno Actual, por día = Histórico).
 * Muestra quién lidera la clasificación, y por cada una dos barras: lo que movió su línea (contra la líder)
 * y el rendimiento de su gente (contra la meta). Toca una tarjeta para ver a cada persona con su barra.
 */
export default function FormadoresLineasPanel({ metaHora = 470 }) {
  const [turno, setTurno] = useState(undefined);
  const [historico, setHistorico] = useState(undefined);
  const [fechaHist, setFechaHist] = useState(null);
  const [fuente, setFuente] = useState(null);
  const [vista, setVista] = useState('formadora');
  const [orden, setOrden] = useState('clasif');
  const [abierto, setAbierto] = useState(null);
  const [oculto, setOculto] = useState(false);

  async function cargar() {
    try {
      const [t, h] = await Promise.all([
        getDetalleRendimientoTurnoActual(metaHora).catch(() => null),
        getDetalleRendimientoAsignaciones(metaHora, fechaHist)
      ]);
      setTurno(t); setHistorico(h); setOculto(false);
    } catch { setOculto(true); }
  }
  useEffect(() => { cargar(); }, [metaHora, fechaHist]);
  useRealtimeRefresco(['asignaciones_diarias', 'rendimiento_historico', 'rendimiento_actual', 'formadora_linea', 'clasificacion_hora'], cargar);

  const turnoUtil = !!turno && !turno.sinAsignaciones && turno.porFormadora.length > 0;
  const histUtil = !!historico && !historico.sinHistorico;
  const fuenteActual = fuente === 'turno' && turnoUtil ? 'turno' : fuente === 'historico' && histUtil ? 'historico' : (turnoUtil ? 'turno' : 'historico');
  const datos = fuenteActual === 'turno' ? turno : historico;

  const grupos = useMemo(() => {
    if (!datos) return [];
    const base = [...(vista === 'formadora' ? datos.porFormadora : datos.porLinea)];
    const tallos = g => (g.clasif?.disponible ? g.clasif.tallos : -1);
    return base.sort((a, b) => orden === 'clasif' ? (tallos(b) - tallos(a)) || (b.rendPromedio - a.rendPromedio) : (b.rendPromedio - a.rendPromedio));
  }, [datos, vista, orden]);

  if (oculto || (turno === undefined && historico === undefined)) return null;
  if (!turnoUtil && !histUtil) {
    if (!turno && !historico) return null;
    return (
      <section className="panel fl-vacio">
        <i className="fa-solid fa-chalkboard-user"></i>
        <p>
          {turno?.sinAsignaciones
            ? `Hay un Turno Actual cargado (${formatoFecha(turno.fecha)}) pero esas personas todavía no están asignadas a una formadora y línea. Asígnalas en Líneas (puedes elegir la fecha).`
            : `Ya hay personas asignadas (${formatoFecha(historico?.fecha)}), pero todavía no se sube el Histórico de ese día en Rendimientos.`}
        </p>
      </section>
    );
  }

  const conClasif = grupos.filter(g => g.clasif?.disponible && g.clasif.tallos > 0).sort((a, b) => b.clasif.tallos - a.clasif.tallos);
  const lider = conClasif[0] || null;
  const segundo = conClasif[1] || null;
  const maxTallos = lider ? lider.clasif.tallos : 1;
  const topRend = [...grupos].sort((a, b) => b.rendPromedio - a.rendPromedio)[0];
  const escalaRend = metaHora * 1.3;
  const claveAbierto = g => `${fuenteActual}-${vista}-${g.id}`;

  return (
    <section className="panel fl2-panel">
      <div className="panel-header">
        <div>
          <h2><i className="fa-solid fa-users-gear" style={{ color: 'var(--primary)', marginRight: 8 }}></i>Rendimiento por {vista === 'formadora' ? 'formadora' : 'línea'}</h2>
          <p>
            {fuenteActual === 'turno' ? `Turno actual (hora a hora) · ${formatoFecha(datos.fecha)}` : `Histórico (por día) · ${formatoFecha(datos.fecha)}`}
            {' · '}toca una tarjeta para ver a su gente
          </p>
        </div>
        <div className="fl-controles">
          <div className="fuente-toggle">
            <button className={fuenteActual === 'turno' ? 'activo' : ''} disabled={!turnoUtil} onClick={() => { setFuente('turno'); setAbierto(null); }}><i className="fa-solid fa-clock"></i> Hora a hora</button>
            <button className={fuenteActual === 'historico' ? 'activo' : ''} disabled={!histUtil} onClick={() => { setFuente('historico'); setAbierto(null); }}><i className="fa-solid fa-calendar-day"></i> Por día</button>
          </div>
          <div className="fuente-toggle">
            <button className={vista === 'formadora' ? 'activo' : ''} onClick={() => { setVista('formadora'); setAbierto(null); }}>Formadoras</button>
            <button className={vista === 'linea' ? 'activo' : ''} onClick={() => { setVista('linea'); setAbierto(null); }}>Líneas</button>
          </div>
          <div className="fuente-toggle" title="Cómo se ordenan las tarjetas">
            <button className={orden === 'clasif' ? 'activo' : ''} onClick={() => setOrden('clasif')}><i className="fa-solid fa-boxes-stacked"></i> Clasificación</button>
            <button className={orden === 'rend' ? 'activo' : ''} onClick={() => setOrden('rend')}><i className="fa-solid fa-gauge-high"></i> Rendimiento</button>
          </div>
          {fuenteActual === 'historico' && historico?.fechasDisponibles?.length > 1 && (
            <select value={datos.fecha} onChange={e => { setFechaHist(e.target.value); setAbierto(null); }} style={{ maxWidth: 150 }}>
              {historico.fechasDisponibles.map(f => <option key={f} value={f}>{formatoFecha(f)}</option>)}
            </select>
          )}
        </div>
      </div>

      {datos.fechaAsignacion && datos.fechaAsignacion !== datos.fecha && (
        <div className="alert warn" style={{ margin: '0 0 12px' }}>
          <i className="fa-solid fa-triangle-exclamation"></i>
          <span>Todavía no hay asignación de personas del {formatoFecha(datos.fecha)}: se está usando la del <strong>{formatoFecha(datos.fechaAsignacion)}</strong>. Asigna el día en Líneas para que sea exacto.</span>
        </div>
      )}

      {lider ? (
        <div className="fl2-lider">
          <span className="fl2-lider-corona" aria-hidden="true">👑</span>
          <div className="fl2-lider-texto">
            <small>Lidera la clasificación</small>
            <strong>{lider.nombre}</strong>
          </div>
          <div className="fl2-lider-dato"><b>{fmt(lider.clasif.tallos)}</b><span>tallos</span></div>
          {segundo && <div className="fl2-lider-dato fl2-lider-ventaja"><b>+{fmt(lider.clasif.tallos - segundo.clasif.tallos)}</b><span>sobre {segundo.nombre}</span></div>}
          {topRend && <div className="fl2-lider-dato fl2-lider-rend"><b>{topRend.nombre}</b><span>mejor rendimiento de boncheo ({topRend.rendPromedio.toLocaleString('es-CO', { minimumFractionDigits: 1 })}/h)</span></div>}
        </div>
      ) : grupos.length > 0 && (
        <div className="fl2-lider fl2-lider-sinclasif"><span className="fl2-lider-corona" aria-hidden="true">🏅</span>
          <div className="fl2-lider-texto"><small>Mejor rendimiento de boncheo</small><strong>{topRend.nombre}</strong></div>
          <div className="fl2-lider-dato"><b>{topRend.rendPromedio.toLocaleString('es-CO', { minimumFractionDigits: 1 })}</b><span>tallos/hora</span></div>
        </div>
      )}

      {grupos.length === 0 && <div className="empty-state">Sin datos para mostrar.</div>}
      <div className="fl2-lista">
        {grupos.map((g, i) => {
          const abiertoAhora = abierto === claveAbierto(g);
          const cumple = g.rendPromedio >= metaHora;
          const esLider = lider && g.id === lider.id;
          const pctClasif = g.clasif?.disponible ? Math.max(3, (g.clasif.tallos / maxTallos) * 100) : 0;
          const pctRend = Math.min((g.rendPromedio / escalaRend) * 100, 100);
          const maxPersona = Math.max(escalaRend, ...g.operarios.map(o => o.rendExacto));
          return (
            <div key={g.id} className={`fl2-card ${esLider ? 'fl2-card-lider' : ''} ${abiertoAhora ? 'fl2-abierta' : ''}`} style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}>
              <button className="fl2-cab" onClick={() => setAbierto(abiertoAhora ? null : claveAbierto(g))}>
                <span className="fl2-puesto">{i < 3 && orden === 'clasif' && g.clasif?.disponible ? MEDALLAS[i] : `#${i + 1}`}</span>
                <span className={`fl2-avatar ${cumple ? 'fl2-avatar-ok' : 'fl2-avatar-mal'}`}>{iniciales(g.nombre)}</span>
                <span className="fl2-titulo">
                  <strong>{g.nombre}{esLider && <i className="fl2-corona-mini" title="Lidera la clasificación"> 👑</i>}</strong>
                  <small>{g.operarios.length} operarios{g.clasif?.disponible ? ` · ${nombresLineas(g.clasif.lineas)}` : ''}</small>
                </span>
                <span className="fl2-barras">
                  <span className="fl2-barra-fila">
                    <em>Clasificación</em>
                    <span className="fl2-barra"><i className="fl2-relleno fl2-relleno-clasif" style={{ width: `${pctClasif}%` }}></i></span>
                    <b>{g.clasif?.disponible ? fmt(g.clasif.tallos) : 'sin datos'}</b>
                  </span>
                  <span className="fl2-barra-fila">
                    <em>Rendimiento</em>
                    <span className="fl2-barra">
                      <i className={`fl2-relleno ${cumple ? 'fl2-relleno-ok' : 'fl2-relleno-mal'}`} style={{ width: `${pctRend}%` }}></i>
                      <s className="fl2-meta-marca" style={{ left: `${(metaHora / escalaRend) * 100}%` }} title={`Meta ${metaHora}/h`}></s>
                    </span>
                    <b className={cumple ? 'fl-ok' : 'fl-mal'}>{g.rendPromedio.toLocaleString('es-CO', { minimumFractionDigits: 1 })}<small>/h · {Math.round((g.rendPromedio / metaHora) * 100)}%</small></b>
                  </span>
                </span>
                <i className={`fa-solid fa-chevron-${abiertoAhora ? 'up' : 'down'} fl-flecha`}></i>
              </button>

              {abiertoAhora && (
                <div className="fl2-detalle">
                  {g.clasif?.disponible && g.clasif.ultima && (
                    <div className="fl2-ultima-fila">
                      <span className="fl-horas-titulo">Hasta la última hora</span>
                      <div className={`fl-ultima fl-hora-${g.clasif.ultima.estado}`}>
                        <span className="fl-ultima-hora">{etiquetaHora(g.clasif.ultima.hora)}{g.clasif.ultima.enCurso ? ' · en curso' : ''}</span>
                        <strong>{fmt(g.clasif.ultima.tallos)}</strong>
                        <small>{g.clasif.ultima.enCurso ? 'aún no termina la hora' : g.clasif.ultima.hayAyer ? `${flecha(g.clasif.ultima.diferencia)} vs ayer` : 'tallos'}</small>
                      </div>
                    </div>
                  )}
                  {g.clasif?.disponible && !g.clasif.ultima && (
                    <div className="fl-nota"><i className="fa-solid fa-circle-info"></i> Total del día en clasificación: <strong>{fmt(g.clasif.tallos)}</strong> tallos (el detalle por hora de esta fecha ya no está guardado).</div>
                  )}
                  {g.clasif && !g.clasif.disponible && (
                    <div className="fl-nota"><i className="fa-solid fa-circle-info"></i> No hay clasificación cargada para esta fecha. Sube el reporte en Clasificación.</div>
                  )}
                  <div className="fl2-personas">
                    {g.operarios.map((o, k) => (
                      <div key={o.id} className="fl2-persona">
                        <span className="fl2-persona-puesto">{k + 1}</span>
                        <span className="fl2-persona-nombre">{o.nombre}</span>
                        <span className="fl2-barra fl2-barra-persona">
                          <i className={`fl2-relleno ${o.rendExacto >= metaHora ? 'fl2-relleno-ok' : 'fl2-relleno-mal'}`} style={{ width: `${Math.min((o.rendExacto / maxPersona) * 100, 100)}%` }}></i>
                          <s className="fl2-meta-marca" style={{ left: `${(metaHora / maxPersona) * 100}%` }}></s>
                        </span>
                        <b className={`fl2-persona-valor ${o.rend >= metaHora ? 'fl-ok' : 'fl-mal'}`}>{o.rend}<small>/h</small> <small>{o.pct.toFixed(0)}%</small></b>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
