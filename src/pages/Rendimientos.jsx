import { useEffect, useMemo, useRef, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { getConfig, getHistorico, getActual, insertarHistorico, reemplazarActual, borrarTablaHistorico, borrarTablaActual, actualizarRegistroHistorico, eliminarRegistroHistorico, actualizarRegistroActual, eliminarRegistroActual, eliminarPersonaDeActual, getMetaTotalPeriodo, getUltimaFechaHistorico, getRangoHorarioHistorico, getResumenHistoricoCompleto, getDescansosDiariosRango } from '../lib/db';
import { useRealtimeRefresco } from '../lib/useRealtimeRefresco';
import { parsearReporteBoncheo } from '../lib/excel';
import { calcularPorcentajeMeta, clasificarEstado, horasAMinutos, minutosAHoras, agregarTurnoActualPorPersona, minutosEntreBloque, minutosDescansoAplicable } from '../lib/calculos';
import { supabaseConfigurado } from '../lib/supabaseClient';
import { useSesion } from '../lib/useSesion';
import { puedeEditar } from '../lib/roles';
import { fechaLocalISO } from '../lib/clasificacionCalculos';
function hoyISO() {
  return fechaLocalISO();
}
function ayerISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return fechaLocalISO(d);
}
export default function Rendimientos() {
  const {
    sesion
  } = useSesion();
  const rol = sesion?.rol;
  const puedeModificar = puedeEditar(rol);
  const [cfg, setCfg] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [actual, setActual] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [metaHistoricoPeriodo, setMetaHistoricoPeriodo] = useState(0);
  const [resumenHistoricoTotal, setResumenHistoricoTotal] = useState(null);
  const [fFecha, setFFecha] = useState('');
  const [fFechaLista, setFFechaLista] = useState(false);
  const [fFechaActual, setFFechaActual] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [destino, setDestino] = useState('actual');
  const [fechaCarga, setFechaCarga] = useState(hoyISO());
  const [horaInicioManual, setHoraInicioManual] = useState('');
  const [horaFinManual, setHoraFinManual] = useState('');
  const fileRef = useRef(null);
  const [arrastrando, setArrastrando] = useState(false);
  async function cargarTodo() {
    setCargando(true);
    try {
      const [c, h, a] = await Promise.all([getConfig(), getHistorico({
        fecha: fFecha || undefined
      }), getActual({})]);
      setCfg(c);
      setHistorico(h);
      setActual(a);
    } catch (e) {
      setMensaje({
        tipo: 'err',
        texto: `Error conectando con Supabase: ${e.message}`
      });
    } finally {
      setCargando(false);
    }
  }
  const [editandoHistorico, setEditandoHistorico] = useState(false);
  const [editandoActual, setEditandoActual] = useState(false);
  const [refrescoPendiente, setRefrescoPendiente] = useState(false);
  const hayEdicionActiva = editandoHistorico || editandoActual;
  useRealtimeRefresco(['rendimiento_historico', 'rendimiento_actual'], () => {
    // Si alguien está editando una fila ahora mismo, no la interrumpimos con
    // un refresco automático — lo dejamos pendiente y se aplica solo apenas
    // termine de editar (guarda o cancela), para no arriesgar perder lo que
    // esté escribiendo.
    if (hayEdicionActiva) {
      setRefrescoPendiente(true);
    } else {
      cargarTodo();
    }
  });
  useEffect(() => {
    if (!hayEdicionActiva && refrescoPendiente) {
      setRefrescoPendiente(false);
      cargarTodo();
    }
  }, [hayEdicionActiva, refrescoPendiente]);
  function cargarResumenHistoricoTotal() {
    getResumenHistoricoCompleto().then(setResumenHistoricoTotal).catch(() => {});
  }
  useEffect(() => { cargarResumenHistoricoTotal(); }, []);
  useRealtimeRefresco(['rendimiento_historico'], cargarResumenHistoricoTotal);
  useEffect(() => {
    // Abre el Histórico mostrando el último día registrado (no "ayer" fijo):
    // si el domingo no se trabaja, el pendiente por revisar sigue siendo el sábado.
    let activo = true;
    getUltimaFechaHistorico()
      .then(fecha => { if (activo) setFFecha(fecha || ayerISO()); })
      .catch(() => { if (activo) setFFecha(ayerISO()); })
      .finally(() => { if (activo) setFFechaLista(true); });
    return () => { activo = false; };
  }, []);
  useEffect(() => {
    if (!fFechaLista) return;
    cargarTodo();
  }, [fFecha, fFechaLista]);
  async function manejarArchivo(file) {
    if (!file) return;
    if (!fechaCarga) {
      setMensaje({
        tipo: 'err',
        texto: 'Selecciona la fecha de la operación antes de subir el archivo.'
      });
      return;
    }
    setProcesando(true);
    try {
      const buffer = await file.arrayBuffer();
      const {
        registros,
        hojaUsada,
        semana
      } = parsearReporteBoncheo(buffer, {
        fecha: fechaCarga
      });
      if (registros.length === 0) {
        setMensaje({
          tipo: 'err',
          texto: `No se encontraron filas válidas (hoja "${hojaUsada}").`
        });
        return;
      }
      const registrosFinales = horaInicioManual && horaFinManual ? registros.map(r => ({
        ...r,
        hora_inicio: horaInicioManual,
        hora_fin: horaFinManual
      })) : registros;

      if (destino === 'historico') {
        const {
          insertados
        } = await insertarHistorico(registrosFinales);
        setMensaje({
          tipo: 'ok',
          texto: `Histórico actualizado: ${insertados} persona(s) con su total del día para ${fechaCarga}${semana ? ` (semana ${semana})` : ''}. Recuerda editar el tiempo trabajado de cada quien para ver el rendimiento real.`
        });
      } else {
        const {
          insertados
        } = await reemplazarActual(registrosFinales);
        setMensaje({
          tipo: 'ok',
          texto: `Se reemplazó automáticamente la carga anterior: ${insertados} registros nuevos guardados para ${fechaCarga}.`
        });
      }
      await cargarTodo();
    } catch (e) {
      setMensaje({
        tipo: 'err',
        texto: `Error procesando el archivo: ${e.message}`
      });
    } finally {
      setProcesando(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }
  async function eliminarTabla(tabla) {
    const nombre = tabla === 'historico' ? 'HISTÓRICO PERMANENTE' : 'TURNO ACTUAL';
    if (!confirm(`Esto borrará TODA la tabla de ${nombre}. Esta acción no se puede deshacer. ¿Continuar?`)) return;
    setProcesando(true);
    try {
      if (tabla === 'historico') await borrarTablaHistorico();else await borrarTablaActual();
      setMensaje({
        tipo: 'ok',
        texto: `Tabla de ${nombre.toLowerCase()} eliminada por completo.`
      });
      await cargarTodo();
    } catch (e) {
      setMensaje({
        tipo: 'err',
        texto: `Error eliminando: ${e.message}`
      });
    } finally {
      setProcesando(false);
    }
  }
  const historicoFiltrado = useMemo(() => {
    if (!busqueda) return historico;
    const b = busqueda.toLowerCase();
    return historico.filter(r => r.colaborador.toLowerCase().includes(b));
  }, [historico, busqueda]);
  useEffect(() => {
    if (historicoFiltrado.length === 0) {
      setMetaHistoricoPeriodo(0);
      return;
    }
    const fechas = historicoFiltrado.map(r => r.fecha).sort();
    const desde = fechas[0];
    const hasta = fechas[fechas.length - 1];
    let activo = true;
    getMetaTotalPeriodo(desde, hasta).then(m => { if (activo) setMetaHistoricoPeriodo(m); }).catch(() => {});
    return () => { activo = false; };
  }, [historicoFiltrado]);
  const actualFiltrado = useMemo(() => {
    let base = actual;
    if (fFechaActual) base = base.filter(r => r.fecha === fFechaActual);
    if (busqueda) {
      const b = busqueda.toLowerCase();
      base = base.filter(r => r.colaborador.toLowerCase().includes(b) || String(r.mesa ?? '').includes(b));
    }
    return base;
  }, [actual, fFechaActual, busqueda]);
  const [descansosPorFechaActual, setDescansosPorFechaActual] = useState(new Map());
  useEffect(() => {
    const fechas = [...new Set(actualFiltrado.map(r => r.fecha))];
    if (fechas.length === 0) return;
    let activo = true;
    getDescansosDiariosRango(fechas, 'actual').then(m => { if (activo) setDescansosPorFechaActual(m); }).catch(() => {});
    return () => { activo = false; };
  }, [actualFiltrado]);
  const promedioActual = useMemo(() => {
    if (actualFiltrado.length === 0) return 0;
    return Math.round(actualFiltrado.reduce((s, r) => s + (r.rendimiento || 0), 0) / actualFiltrado.length);
  }, [actualFiltrado]);
  const totalTallosActual = useMemo(() => actualFiltrado.reduce((s, r) => s + (r.total_tallos || 0), 0), [actualFiltrado]);
  const personasActual = useMemo(() => new Set(actualFiltrado.map(r => r.colaborador_id)).size, [actualFiltrado]);
  const totalPorPersonaActual = useMemo(() => agregarTurnoActualPorPersona(actualFiltrado, cfg?.descansosActivosActual ? cfg.descansosActual : [], descansosPorFechaActual), [actualFiltrado, cfg, descansosPorFechaActual]);
  const kpis = useMemo(() => {
    const totalTallos = historicoFiltrado.reduce((s, r) => s + (r.total_tallos || 0), 0);
    const personas = historicoFiltrado.length;
    const metaGlobal = metaHistoricoPeriodo || cfg?.metaGlobalDia || 25000;
    const cumplimiento = metaGlobal > 0 ? Math.round(totalTallos / metaGlobal * 100) : 0;
    const conRendimiento = historicoFiltrado.filter(r => r.rendimiento > 0);
    const rendimientoPromedio = conRendimiento.length > 0 ? Math.round(conRendimiento.reduce((s, r) => s + r.rendimiento, 0) / conRendimiento.length) : 0;
    return {
      totalTallos,
      personas,
      cumplimiento,
      rendimientoPromedio,
      metaGlobal
    };
  }, [historicoFiltrado, cfg, metaHistoricoPeriodo]);
  function irATurnoActual() {
    document.getElementById('turno-actual')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }
  return <>
      <PageHeader title="Rendimientos" subtitle="Sube el Reporte Consolidado Boncheo (.xls, .xlsx o .xlsb). Los datos se guardan en Supabase; el archivo nunca se almacena.">
        <button className="btn-secondary" onClick={irATurnoActual}>
          <i className="fa-solid fa-arrow-down"></i> Ir a Turno Actual
        </button>
      </PageHeader>

      <div className="page">
        {!supabaseConfigurado && <div className="alert warn">
            <i className="fa-solid fa-triangle-exclamation"></i>
            Supabase no está configurado todavía. Copia <code>.env.example</code> a <code>.env</code> y reinicia <code>npm run dev</code>.
          </div>}

        {refrescoPendiente && <div className="alert warn">
            <i className="fa-solid fa-clock"></i>
            Alguien más actualizó datos mientras editabas una fila — se van a mostrar apenas termines (guarda o cancela tu edición).
          </div>}

        {mensaje && <div className={`alert ${mensaje.tipo === 'ok' ? 'ok' : 'err'}`}>
            <i className={`fa-solid ${mensaje.tipo === 'ok' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
            {mensaje.texto}
            <button onClick={() => setMensaje(null)} style={{
          marginLeft: 'auto',
          background: 'none',
          color: 'inherit'
        }}>
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>}

        <section className={puedeModificar ? 'two-col-panels' : ''}>
          {puedeModificar && <div className="step-panel">
            <h3><i className="fa-solid fa-upload"></i> 1. Importar Excel</h3>
            <div className="form-row" style={{
            gridTemplateColumns: '1fr 1fr'
          }}>
              <div>
                <label>Guardar en</label>
                <select value={destino} onChange={e => setDestino(e.target.value)}>
                  <option value="actual">Turno actual (reemplaza lo anterior)</option>
                  <option value="historico">Histórico (suma el total del día)</option>
                </select>
              </div>
              <div>
                <label>Fecha operación</label>
                <input type="date" value={fechaCarga} onChange={e => setFechaCarga(e.target.value)} />
              </div>
            </div>

            {destino === 'actual' ? <div className="alert-inline">
                <i className="fa-solid fa-circle-info"></i>
                Al subir un nuevo Excel en este modo, se reemplaza automáticamente el anterior.
              </div> : <div className="alert-inline">
                <i className="fa-solid fa-circle-info"></i>
                Se suman todos los bloques de hora del archivo y se guarda el total del día por persona. El rendimiento real se calcula cuando ingreses el tiempo trabajado en la tabla de abajo.
              </div>}

            <div className="form-row" style={{
            gridTemplateColumns: '1fr 1fr'
          }}>
              <div>
                <label>Hora inicio (opcional, sobreescribe el Excel)</label>
                <input type="time" value={horaInicioManual} onChange={e => setHoraInicioManual(e.target.value)} />
              </div>
              <div>
                <label>Hora fin (opcional, sobreescribe el Excel)</label>
                <input type="time" value={horaFinManual} onChange={e => setHoraFinManual(e.target.value)} />
              </div>
            </div>

            <div>
              <label style={{
              display: 'block',
              marginBottom: 5
            }}>Reporte Consolidado Boncheo</label>
              <div className={`dropzone ${arrastrando ? 'dragging' : ''}`} onClick={() => fileRef.current?.click()} onDragOver={e => {
              e.preventDefault();
              setArrastrando(true);
            }} onDragLeave={() => setArrastrando(false)} onDrop={e => {
              e.preventDefault();
              setArrastrando(false);
              manejarArchivo(e.dataTransfer.files[0]);
            }}>
                <i className="fa-solid fa-cloud-arrow-up"></i>
                {procesando ? 'Procesando...' : 'Arrastra el archivo o haz clic para buscarlo (.xls, .xlsx, .xlsb)'}
              </div>
              <input ref={fileRef} type="file" accept=".xls,.xlsx,.xlsb" hidden disabled={procesando} onChange={e => manejarArchivo(e.target.files[0])} />
            </div>
          </div>}

          <div className="step-panel">
            <h3><i className="fa-solid fa-filter"></i> 2. Filtros de búsqueda</h3>
            {resumenHistoricoTotal && (
              <div className="alert-inline" style={{ marginBottom: 12 }}>
                <i className="fa-solid fa-database"></i>
                Nada se pierde: hay <strong>{resumenHistoricoTotal.totalDias} días</strong> guardados en el Histórico completo ({resumenHistoricoTotal.primeraFecha} → {resumenHistoricoTotal.ultimaFecha}), aunque abajo solo se muestre uno a la vez. Usa "Limpiar parámetros" para ver todos, o revisa Ranking → Por semana/mes.
              </div>
            )}
            <div className="form-row" style={{
            gridTemplateColumns: '1fr 1fr'
          }}>
              <div>
                <label>Colaborador</label>
                <input type="text" placeholder="Buscar por nombre o Código..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
              </div>
              <div>
                <label>Fecha — Histórico</label>
                <input type="date" value={fFecha} onChange={e => setFFecha(e.target.value)} />
              </div>
              <div>
                <label>Fecha — Turno Actual</label>
                <input type="date" value={fFechaActual} onChange={e => setFFechaActual(e.target.value)} placeholder="Todas" />
              </div>
            </div>
            <div style={{
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
            marginTop: 4
          }}>
              <button className="btn-secondary" onClick={() => {
              setFFecha('');
              setFFechaActual('');
              setBusqueda('');
            }}>
                <i className="fa-solid fa-eraser"></i> Limpiar parámetros
              </button>
              <button className="btn-primary" onClick={cargarTodo}>
                <i className="fa-solid fa-magnifying-glass"></i> Aplicar consulta
              </button>
            </div>
          </div>
        </section>

        <section className="cards">
          <div className="card"><div className="icon"><i className="fa-solid fa-users"></i></div>
            <div><span>Personas Activas</span><h2>{kpis.personas}</h2><small>{fFecha || 'Todas las fechas'}</small></div></div>
          <div className="card"><div className="icon"><i className="fa-solid fa-seedling"></i></div>
            <div><span>Total Tallos</span><h2>{kpis.totalTallos.toLocaleString()}</h2><small>Histórico filtrado</small></div></div>
          <div className="card acento-oro"><div className="icon"><i className="fa-solid fa-gauge-high"></i></div>
            <div><span>Rendimiento Promedio</span><h2>{kpis.rendimientoPromedio}</h2><small>tallos/hora real</small></div></div>
          <div className="card acento-azul"><div className="icon"><i className="fa-solid fa-chart-line"></i></div>
            <div><span>Cumplimiento</span><h2>{kpis.cumplimiento}%</h2><small>vs. la meta</small></div></div>
          <div className="card acento-rojo"><div className="icon"><i className="fa-solid fa-bullseye"></i></div>
            <div><span>Meta de Tallos</span><h2>{kpis.metaGlobal.toLocaleString()}</h2><small>{fFecha ? 'del día filtrado' : 'del período mostrado'}</small></div></div>
        </section>

        <TablaHistorico filas={historicoFiltrado} cfg={cfg} onEliminarTabla={() => eliminarTabla('historico')} onGuardarFila={async (id, cambios) => {
        await actualizarRegistroHistorico(id, cambios);
        await cargarTodo();
      }} onEliminarFila={async id => {
        await eliminarRegistroHistorico(id);
        await cargarTodo();
      }} procesando={procesando} promedioGeneral={kpis.rendimientoPromedio} soloLectura={!puedeModificar} onEditandoCambio={setEditandoHistorico} />

        <div id="turno-actual" style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 26
      }}>
          <section className="cards">
            <div className="card"><div className="icon"><i className="fa-solid fa-users"></i></div>
              <div><span>Mesas Activas</span><h2>{personasActual}</h2><small>{fFechaActual || 'Todas las fechas'}</small></div></div>
            <div className="card acento-rojo"><div className="icon"><i className="fa-solid fa-seedling"></i></div>
              <div><span>Total Tallos — Turno Actual</span><h2>{totalTallosActual.toLocaleString()}</h2><small>Suma de todos los bloques cargados</small></div></div>
            <div className="card acento-oro"><div className="icon"><i className="fa-solid fa-gauge-high"></i></div>
              <div><span>Rendimiento Promedio</span><h2>{promedioActual}</h2><small>tallos/hora real</small></div></div>
          </section>

          {totalPorPersonaActual.length > 0 && <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Total de Tallos por Persona</h2>
                  <p>Suma de todos los bloques cargados del Turno Actual, con el rendimiento real de cada colaborador.</p>
                </div>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr><th>Código</th><th>Colaborador</th><th>Mesa</th><th>Total Tallos</th><th>Rendimiento</th><th>% Meta</th><th>Estado</th>{puedeModificar && <th>Acciones</th>}</tr>
                  </thead>
                  <tbody>
                    {totalPorPersonaActual.map(p => {
                  const pct = calcularPorcentajeMeta(p.rendimiento, cfg?.metaHora || 470);
                  const estado = clasificarEstado(pct);
                  return <tr key={p.colaborador_id}>
                          <td>{p.colaborador_id}</td>
                          <td>{p.colaborador}</td>
                          <td>{p.codigos.length > 0 ? p.codigos.join(', ') : '—'}</td>
                          <td><strong>{p.total_tallos.toLocaleString()}</strong></td>
                          <td>{p.rendimiento}</td>
                          <td>{pct.toFixed(2)}%</td>
                          <td><span className={`status ${estado.css}`}>{estado.label}</span></td>
                          {puedeModificar && <td>
                              <button title="Eliminar todos los bloques de esta persona" onClick={() => {
                        if (confirm(`¿Eliminar todos los registros de ${p.colaborador} del Turno Actual?`)) {
                          eliminarPersonaDeActual(p.colaborador_id).then(cargarTodo);
                        }
                      }}>
                                <i className="fa-solid fa-trash"></i>
                              </button>
                            </td>}
                        </tr>;
                })}
                  </tbody>
                </table>
              </div>
            </section>}

          <TablaActual filas={actualFiltrado} cfg={cfg} onEliminarTabla={() => eliminarTabla('actual')} onGuardarFila={async (id, cambios) => {
          await actualizarRegistroActual(id, cambios);
          await cargarTodo();
        }} onEliminarFila={async id => {
          await eliminarRegistroActual(id);
          await cargarTodo();
        }} procesando={procesando} promedioGeneral={promedioActual} soloLectura={!puedeModificar} onEditandoCambio={setEditandoActual} />
        </div>
      </div>
    </>;
}
function VistaPreviaTiempo({
  totalTallos,
  horaInicio,
  horaFin,
  noProductivoMin,
  cfg
}) {
  if (!horaInicio || !horaFin) return null;
  const descansos = cfg?.descansosActivosHistorico ? cfg.descansosHistorico : [];
  const brutos = minutosEntreBloque(horaInicio, horaFin);
  const descuento = minutosDescansoAplicable(horaInicio, horaFin, descansos);
  const trabajadoMin = Math.max(0, brutos - descuento);
  const noProd = Number(noProductivoMin) || 0;
  const realMin = Math.max(0, trabajadoMin - noProd);
  const realHoras = minutosAHoras(realMin);
  const rendimiento = realHoras > 0 ? Math.round(totalTallos / realHoras * 100) / 100 : 0;
  return <div className="tiempo-preview">
      <i className="fa-solid fa-calculator"></i>
      {horaInicio}–{horaFin} = {minutosAHoras(brutos)} h
      {descuento > 0 && <> − {descuento} min de almuerzo</>}
      {' '}→ Tiempo real: <strong>{realMin} min</strong> ({realHoras} h) → Rendimiento: <strong>{rendimiento}</strong> tallos/h
    </div>;
}
function TablaHistorico({
  filas,
  cfg,
  onEliminarTabla,
  onGuardarFila,
  onEliminarFila,
  procesando,
  promedioGeneral,
  soloLectura,
  onEditandoCambio
}) {
  const metaHora = cfg?.metaHora || 470;
  const [editandoId, setEditandoId] = useState(null);
  const editandoIdRef = useRef(null);
  const [borrador, setBorrador] = useState({});
  function iniciarEdicion(r) {
    setEditandoId(r.id);
    editandoIdRef.current = r.id;
    onEditandoCambio?.(true);
    setBorrador({
      fecha: r.fecha,
      horaInicio: cfg?.horaInicioDefault || '06:00',
      horaFin: cfg?.horaFinDefault || '',
      noProductivoMin: r.tiempo_no_productivo_min ?? 0,
      total_tallos: r.total_tallos
    });
    // Trae el horario real que se cargó ese día para esta persona (si existe),
    // y reemplaza el genérico de arriba en cuanto llega — solo si sigues
    // editando esta misma fila (por si cambiaste de fila mientras cargaba).
    getRangoHorarioHistorico(r.fecha, r.colaborador_id).then(rango => {
      if (rango && editandoIdRef.current === r.id) setBorrador(b => ({ ...b, horaInicio: rango.horaInicio, horaFin: rango.horaFin }));
    });
  }
  async function guardarEdicion(id) {
    const descansos = cfg?.descansosActivosHistorico ? cfg.descansosHistorico : [];
    let tiempoTrabajadoMin = null;
    if (borrador.horaInicio && borrador.horaFin) {
      const brutos = minutosEntreBloque(borrador.horaInicio, borrador.horaFin);
      const descuento = minutosDescansoAplicable(borrador.horaInicio, borrador.horaFin, descansos);
      tiempoTrabajadoMin = Math.max(0, brutos - descuento);
    }
    await onGuardarFila(id, {
      fecha: borrador.fecha,
      total_tallos: Number(borrador.total_tallos),
      tiempo_trabajado_min: tiempoTrabajadoMin,
      tiempo_no_productivo_min: Number(borrador.noProductivoMin) || 0,
      hora_inicio: borrador.horaInicio || null,
      hora_fin: borrador.horaFin || null
    });
    setEditandoId(null);
    onEditandoCambio?.(false);
  }
  return <section className="table-panel">
      <div className="panel-header">
        <div>
          <h2>Histórico <span className="badge-count">{filas.length}</span></h2>
          <p>Un total de tallos por persona por día. El tiempo trabajado se calcula solo con las horas del Excel; edítalo si necesitas corregirlo.</p>
        </div>
        <div style={{
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
          <span className="promedio-pill"><i className="fa-solid fa-gauge-high"></i> Promedio general: <strong>{promedioGeneral}</strong> tallos/h</span>
          {!soloLectura && <button className="btn-danger-outline" disabled={procesando} onClick={onEliminarTabla}>
              <i className="fa-solid fa-trash"></i> Eliminar toda la tabla
            </button>}
        </div>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Código</th><th>Colaborador</th><th>Fecha</th><th>Total Tallos</th>
              <th>Tiempo Trabajado</th><th>Tiempo No Prod.</th><th>Tiempo Real</th>
              <th>Rendimiento</th><th>% Meta</th><th>Estado</th>{!soloLectura && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 && <tr><td colSpan={11}><div className="empty-state"><i className="fa-solid fa-inbox"></i>Sin registros para el filtro actual.</div></td></tr>}
            {filas.map(r => {
            const editando = editandoId === r.id;
            const porcentaje = calcularPorcentajeMeta(r.rendimiento, metaHora);
            const estado = clasificarEstado(porcentaje);
            return <tr key={r.id}>
                  <td>{r.colaborador_id}</td>
                  <td>{r.colaborador}</td>
                  {editando ? <>
                      <td><input type="date" value={borrador.fecha} onChange={e => setBorrador(b => ({
                    ...b,
                    fecha: e.target.value
                  }))} /></td>
                      <td><input type="number" style={{
                    width: 76
                  }} value={borrador.total_tallos} onChange={e => setBorrador(b => ({
                    ...b,
                    total_tallos: e.target.value
                  }))} /></td>
                      <td colSpan={2}>
                        <div className="edit-row-form">
                          <input type="time" value={borrador.horaInicio} onChange={e => setBorrador(b => ({
                      ...b,
                      horaInicio: e.target.value
                    }))} />
                          <input type="time" value={borrador.horaFin} onChange={e => setBorrador(b => ({
                      ...b,
                      horaFin: e.target.value
                    }))} />
                          <input type="number" min="0" placeholder="No prod. (min)" style={{
                      width: 110
                    }} value={borrador.noProductivoMin} onChange={e => setBorrador(b => ({
                      ...b,
                      noProductivoMin: e.target.value
                    }))} />
                        </div>
                        <VistaPreviaTiempo totalTallos={Number(borrador.total_tallos) || 0} horaInicio={borrador.horaInicio} horaFin={borrador.horaFin} noProductivoMin={borrador.noProductivoMin} cfg={cfg} />
                      </td>
                      <td colSpan={2} style={{
                  color: 'var(--gray)',
                  fontSize: 11.5
                }}>se calcula al guardar</td>
                    </> : <>
                      <td>{r.fecha}</td>
                      <td>{(r.total_tallos || 0).toLocaleString()}</td>
                      <td>{r.tiempo_trabajado_min ? `${minutosAHoras(r.tiempo_trabajado_min)} h (${r.tiempo_trabajado_min} min)` : <span style={{
                    color: 'var(--gray)'
                  }}>Sin registrar</span>}</td>
                      <td>{r.tiempo_no_productivo_min || 0} min</td>
                      <td>{r.tiempo_trabajado_min ? `${r.tiempo_real_horas} h` : '—'}</td>
                      <td>{r.tiempo_trabajado_min ? <strong>{r.rendimiento}</strong> : '—'}</td>
                    </>}
                  {!editando && <td>{r.tiempo_trabajado_min ? `${porcentaje}%` : '—'}</td>}
                  {!editando && <td>{r.tiempo_trabajado_min ? <span className={`status ${estado.css}`}>{estado.label}</span> : <span className="status neutral">Falta tiempo</span>}</td>}
                  {!soloLectura && <td>
                      {editando ? <>
                          <button className="icon-btn-save" title="Guardar" onClick={() => guardarEdicion(r.id)}><i className="fa-solid fa-check"></i></button>
                          <button className="icon-btn-cancel" title="Cancelar" onClick={() => { setEditandoId(null); onEditandoCambio?.(false); }}><i className="fa-solid fa-xmark"></i></button>
                        </> : <>
                          <button title="Editar tiempo trabajado" onClick={() => iniciarEdicion(r)}><i className="fa-solid fa-pen"></i></button>
                          <button title="Eliminar" onClick={() => {
                    if (confirm(`¿Eliminar el total de ${r.colaborador} del ${r.fecha}?`)) onEliminarFila(r.id);
                  }}>
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </>}
                    </td>}
                </tr>;
          })}
          </tbody>
        </table>
      </div>
    </section>;
}
function TablaActual({
  filas,
  cfg,
  onEliminarTabla,
  onGuardarFila,
  onEliminarFila,
  procesando,
  promedioGeneral,
  soloLectura,
  onEditandoCambio
}) {
  const metaHora = cfg?.metaHora || 470;
  const [editandoId, setEditandoId] = useState(null);
  const [borrador, setBorrador] = useState({});
  function iniciarEdicion(r) {
    setEditandoId(r.id);
    onEditandoCambio?.(true);
    setBorrador({
      fecha: r.fecha,
      hora_inicio: r.hora_inicio,
      hora_fin: r.hora_fin
    });
  }
  async function guardarEdicion(id) {
    await onGuardarFila(id, {
      fecha: borrador.fecha,
      hora_inicio: borrador.hora_inicio,
      hora_fin: borrador.hora_fin
    });
    setEditandoId(null);
    onEditandoCambio?.(false);
  }
  return <section className="table-panel">
      <div className="panel-header">
        <div>
          <h2>Turno Actual (hora a hora) <span className="badge-count">{filas.length}</span></h2>
          <p>Solo contiene la última carga. Rendimiento = Tallos ÷ horas del bloque (edita el bloque si está mal).</p>
        </div>
        <div style={{
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
          <span className="promedio-pill"><i className="fa-solid fa-gauge-high"></i> Promedio general: <strong>{promedioGeneral}</strong> tallos/h</span>
          {!soloLectura && <button className="btn-danger-outline" disabled={procesando} onClick={onEliminarTabla}>
              <i className="fa-solid fa-trash"></i> Eliminar toda la tabla
            </button>}
        </div>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Código</th><th>Colaborador</th><th>Fecha</th><th>Mesa</th><th>Bloque</th>
              <th>Tiempo Trabajado</th><th>Tallos</th><th>Rendimiento</th><th>% Meta</th><th>Estado</th>{!soloLectura && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 && <tr><td colSpan={11}><div className="empty-state"><i className="fa-solid fa-inbox"></i>Sin registros para el filtro actual.</div></td></tr>}
            {filas.map(r => {
            const editando = editandoId === r.id;
            const porcentaje = calcularPorcentajeMeta(r.rendimiento, metaHora);
            const estado = clasificarEstado(porcentaje);
            return <tr key={r.id}>
                  <td>{r.colaborador_id}</td>
                  <td>{r.colaborador}</td>
                  {editando ? <>
                      <td><input type="date" value={borrador.fecha} onChange={e => setBorrador(b => ({
                    ...b,
                    fecha: e.target.value
                  }))} /></td>
                      <td>{r.mesa ?? '—'}</td>
                      <td>
                        <div className="edit-row-form">
                          <input type="time" value={borrador.hora_inicio} onChange={e => setBorrador(b => ({
                      ...b,
                      hora_inicio: e.target.value
                    }))} />
                          <input type="time" value={borrador.hora_fin} onChange={e => setBorrador(b => ({
                      ...b,
                      hora_fin: e.target.value
                    }))} />
                        </div>
                      </td>
                    </> : <>
                      <td>{r.fecha}</td>
                      <td>{r.mesa ?? '—'}</td>
                      <td>{r.hora_inicio}–{r.hora_fin}</td>
                    </>}
                  <td>{r.tiempo_trabajado_min ? `${minutosAHoras(r.tiempo_trabajado_min)} h (${r.tiempo_trabajado_min} min)` : '—'}</td>
                  <td>{(r.total_tallos || 0).toLocaleString()}</td>
                  <td>{r.rendimiento}</td>
                  <td>{porcentaje}%</td>
                  <td><span className={`status ${estado.css}`}>{estado.label}</span></td>
                  {!soloLectura && <td>
                      {editando ? <>
                          <button className="icon-btn-save" title="Guardar" onClick={() => guardarEdicion(r.id)}><i className="fa-solid fa-check"></i></button>
                          <button className="icon-btn-cancel" title="Cancelar" onClick={() => { setEditandoId(null); onEditandoCambio?.(false); }}><i className="fa-solid fa-xmark"></i></button>
                        </> : <>
                          <button title="Editar" onClick={() => iniciarEdicion(r)}><i className="fa-solid fa-pen"></i></button>
                          <button title="Eliminar" onClick={() => {
                    if (confirm(`¿Eliminar el registro de ${r.colaborador} (${r.fecha}, ${r.hora_inicio}–${r.hora_fin})?`)) onEliminarFila(r.id);
                  }}>
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </>}
                    </td>}
                </tr>;
          })}
          </tbody>
        </table>
      </div>
    </section>;
}
