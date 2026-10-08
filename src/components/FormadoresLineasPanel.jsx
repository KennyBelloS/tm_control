import { useEffect, useState } from 'react';
import { getDetalleRendimientoAsignaciones, getDetalleRendimientoTurnoActual } from '../lib/lineas';
import { formatoFecha, etiquetaHora } from '../lib/clasificacionCalculos';
import { useRealtimeRefresco } from '../lib/useRealtimeRefresco';

const fmt = n => (n ?? 0).toLocaleString('es-CO');
const flecha = n => n > 0 ? `▲ +${fmt(n)}` : n < 0 ? `▼ −${fmt(Math.abs(n))}` : '＝ igual';
const nombresLineas = nums => nums.map(n => `L${n}`).join(' + ');
const iniciales = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();

/**
 * Rendimiento de Boncheo por formadora o por línea, en dos fuentes:
 *  - Hora a hora: sale del Turno Actual (el de hoy), con el detalle por hora.
 *  - Por día: sale del Histórico (cualquier día que tenga asignaciones e histórico).
 * Toca una tarjeta para ver su equipo ordenado (ranking).
 */
export default function FormadoresLineasPanel({ metaHora = 470 }) {
  const [turno, setTurno] = useState(undefined);
  const [historico, setHistorico] = useState(undefined);
  const [fechaHist, setFechaHist] = useState(null);
  const [fuente, setFuente] = useState(null);
  const [vista, setVista] = useState('formadora');
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
  useRealtimeRefresco(['asignaciones_diarias', 'rendimiento_historico', 'rendimiento_actual'], cargar);

  if (oculto || (turno === undefined && historico === undefined)) return null;

  const turnoUtil = !!turno && !turno.sinAsignaciones && turno.porFormadora.length > 0;
  const histUtil = !!historico && !historico.sinHistorico;
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

  const fuenteActual = fuente === 'turno' && turnoUtil ? 'turno' : fuente === 'historico' && histUtil ? 'historico' : (turnoUtil ? 'turno' : 'historico');
  const datos = fuenteActual === 'turno' ? turno : historico;
  const grupos = vista === 'formadora' ? datos.porFormadora : datos.porLinea;
  const claveAbierto = g => `${fuenteActual}-${vista}-${g.id}`;

  return (
    <section className="panel fl-panel">
      <div className="panel-header">
        <div>
          <h2><i className="fa-solid fa-users-gear" style={{ color: 'var(--primary)', marginRight: 8 }}></i>Rendimiento por {vista === 'formadora' ? 'formadora' : 'línea'}</h2>
          <p>
            {fuenteActual === 'turno' ? `Turno actual (hora a hora) · ${formatoFecha(datos.fecha)}` : `Histórico (por día) · ${formatoFecha(datos.fecha)}`}
            {' · '}toca una tarjeta para ver su equipo
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
      {grupos.length === 0 && <div className="empty-state">Sin datos para mostrar.</div>}
      <div className="fl-lista">
        {grupos.map(g => {
          const abiertoAhora = abierto === claveAbierto(g);
          const cumple = g.rendPromedio >= metaHora;
          return (
            <div key={g.id} className={`fl-grupo ${abiertoAhora ? 'fl-abierto' : ''}`}>
              <button className="fl-cabecera" onClick={() => setAbierto(abiertoAhora ? null : claveAbierto(g))}>
                <span className="fl-avatar">{iniciales(g.nombre)}</span>
                <span className="fl-info">
                  <strong>{g.nombre}</strong>
                  <small>
                    {g.operarios.length} operarios ·{' '}
                    {g.clasif?.disponible
                      ? <><strong>{fmt(g.clasif.tallos)}</strong> tallos de clasificación ({nombresLineas(g.clasif.lineas)})</>
                      : 'sin clasificación cargada'}
                  </small>
                </span>
                <span className={`fl-rend ${cumple ? 'fl-ok' : 'fl-mal'}`}>{g.rendPromedio.toLocaleString('es-CO', { minimumFractionDigits: 1 })} <small>/h</small></span>
                <i className={`fa-solid fa-chevron-${abiertoAhora ? 'up' : 'down'} fl-flecha`}></i>
              </button>
              {abiertoAhora && (
                <div className="fl-equipo">
                  {g.clasif?.disponible && g.clasif.ultima && (
                    <div className="fl-horas">
                      <span className="fl-horas-titulo">Hasta la última hora</span>
                      <div className={`fl-ultima fl-hora-${g.clasif.ultima.estado}`}>
                        <span className="fl-ultima-hora">{etiquetaHora(g.clasif.ultima.hora)}{g.clasif.ultima.enCurso ? ' · en curso' : ''}</span>
                        <strong>{fmt(g.clasif.ultima.tallos)}</strong>
                        <small>
                          {g.clasif.ultima.enCurso ? 'aún no termina la hora'
                            : g.clasif.ultima.hayAyer ? `${flecha(g.clasif.ultima.diferencia)} vs ayer` : 'tallos'}
                        </small>
                      </div>
                    </div>
                  )}
                  {g.clasif?.disponible && !g.clasif.ultima && (
                    <div className="fl-nota"><i className="fa-solid fa-circle-info"></i> Total del día en clasificación: <strong>{fmt(g.clasif.tallos)}</strong> tallos (el detalle por hora de esta fecha ya no está guardado).</div>
                  )}
                  {g.clasif && !g.clasif.disponible && (
                    <div className="fl-nota"><i className="fa-solid fa-circle-info"></i> No hay clasificación cargada para esta fecha. Sube el reporte en Clasificación.</div>
                  )}
                  {g.operarios.map((o, i) => (
                    <div key={o.id} className="fl-fila">
                      <span className="fl-puesto">{i + 1}</span>
                      <span className="fl-nombre">{o.nombre}</span>
                      <span className={`fl-valor ${o.rend >= metaHora ? 'fl-ok' : 'fl-mal'}`}>{o.rend} /h · {o.pct.toFixed(2)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
