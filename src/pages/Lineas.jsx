import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { useSesion } from '../lib/useSesion';
import { puedeEditar } from '../lib/roles';
import { listarPersonasModulo, getConfig } from '../lib/db';
import {
  listarLineas, crearLinea, cambiarActivaLinea,
  listarFormadoras, crearFormadora, cambiarActivaFormadora,
  getAsignacionesDia, asignarPersona, quitarAsignacion,
  getRendimientoPorLinea, getTableroFormadoras, guardarFilaTablero
} from '../lib/lineas';

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

const MEDALLAS = ['🥇', '🥈', '🥉'];

export default function Lineas() {
  const { sesion } = useSesion();
  const puedeModificar = puedeEditar(sesion?.rol);
  const hoy = hoyISO();

  const [lineas, setLineas] = useState([]);
  const [formadoras, setFormadoras] = useState([]);
  const [personas, setPersonas] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);
  const [rendimientoPorLinea, setRendimientoPorLinea] = useState([]);
  const [tableroFilas, setTableroFilas] = useState([]);
  const [tableroDesde, setTableroDesde] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 13);
    return d.toISOString().slice(0, 10);
  });
  const [tableroHasta, setTableroHasta] = useState(hoyISO());
  const [cargandoTablero, setCargandoTablero] = useState(false);
  const [guardandoFilaTablero, setGuardandoFilaTablero] = useState(null);
  const [metaHora, setMetaHora] = useState(470);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState(null);

  const [nuevaLinea, setNuevaLinea] = useState('');
  const [nuevoSupervisor, setNuevoSupervisor] = useState('');
  const [nuevaFormadora, setNuevaFormadora] = useState('');

  const [asigFormadora, setAsigFormadora] = useState('');
  const [asigLinea, setAsigLinea] = useState('');
  const [busquedaPersona, setBusquedaPersona] = useState('');

  async function cargarTodo() {
    setCargando(true);
    try {
      const [l, f, p, a, r, cfg] = await Promise.all([
        listarLineas(),
        listarFormadoras(),
        listarPersonasModulo(),
        getAsignacionesDia(hoy),
        getRendimientoPorLinea(hoy, hoy),
        getConfig()
      ]);
      setLineas(l);
      setFormadoras(f);
      setPersonas(p);
      setAsignaciones(a);
      setRendimientoPorLinea(r);
      setMetaHora(cfg.metaHora || 470);
    } catch (e) {
      setMensaje({ tipo: 'err', texto: e.message });
    } finally {
      setCargando(false);
    }
  }
  useEffect(() => { cargarTodo(); }, []);

  async function cargarTablero() {
    setCargandoTablero(true);
    try {
      const filas = await getTableroFormadoras(tableroDesde, tableroHasta);
      setTableroFilas(filas);
    } catch (e) {
      setMensaje({ tipo: 'err', texto: e.message });
    } finally {
      setCargandoTablero(false);
    }
  }
  useEffect(() => { cargarTablero(); }, [tableroDesde, tableroHasta]);

  function actualizarCampoTablero(fecha, formadoraId, campo, valor) {
    setTableroFilas(filas => filas.map(f => (f.fecha === fecha && f.formadora_id === formadoraId) ? { ...f, [campo]: valor } : f));
  }
  async function guardarFilaTableroAhora(fila) {
    const clave = `${fila.fecha}_${fila.formadora_id}`;
    setGuardandoFilaTablero(clave);
    try {
      await guardarFilaTablero(fila.fecha, fila.formadora_id, {
        semana: fila.semana,
        metaClasificacion: fila.metaClasificacion,
        resultadoClasificacion: fila.resultadoClasificacion,
        devoluciones: fila.devoluciones
      });
    } catch (e) {
      setMensaje({ tipo: 'err', texto: e.message });
    } finally {
      setGuardandoFilaTablero(null);
    }
  }

  const lineasActivas = useMemo(() => lineas.filter(l => l.activa), [lineas]);

  const personasFiltradas = useMemo(() => {
    if (!busquedaPersona) return personas.filter(p => p.activo).slice(0, 30);
    const b = busquedaPersona.toLowerCase();
    return personas.filter(p => p.activo && (p.nombre.toLowerCase().includes(b) || String(p.id).includes(b))).slice(0, 30);
  }, [personas, busquedaPersona]);

  const asignacionesPorLinea = useMemo(() => {
    const mapa = new Map();
    for (const a of asignaciones) {
      mapa.set(a.linea, (mapa.get(a.linea) || 0) + 1);
    }
    return [...mapa.entries()].map(([linea, cantidad]) => ({ linea, cantidad })).sort((a, b) => b.cantidad - a.cantidad);
  }, [asignaciones]);

  const resumen = useMemo(() => {
    const totalTallos = rendimientoPorLinea.reduce((s, l) => s + l.totalTallos, 0);
    const promedioCumplimiento = rendimientoPorLinea.length > 0
      ? Math.round(rendimientoPorLinea.reduce((s, l) => s + l.rendimientoPromedio, 0) / rendimientoPorLinea.length / metaHora * 100)
      : 0;
    return { totalTallos, promedioCumplimiento };
  }, [rendimientoPorLinea, metaHora]);

  const maxOperariosLinea = Math.max(1, ...asignacionesPorLinea.map(l => l.cantidad));

  async function agregarLinea() {
    if (!nuevaLinea.trim()) return;
    try {
      await crearLinea(nuevaLinea.trim(), nuevoSupervisor.trim());
      setNuevaLinea(''); setNuevoSupervisor('');
      await cargarTodo();
    } catch (e) {
      setMensaje({ tipo: 'err', texto: e.message });
    }
  }
  async function toggleLinea(l) {
    try { await cambiarActivaLinea(l.id, !l.activa); await cargarTodo(); }
    catch (e) { setMensaje({ tipo: 'err', texto: e.message }); }
  }
  async function agregarFormadora() {
    if (!nuevaFormadora.trim()) return;
    try {
      await crearFormadora(nuevaFormadora.trim());
      setNuevaFormadora('');
      await cargarTodo();
    } catch (e) {
      setMensaje({ tipo: 'err', texto: e.message });
    }
  }
  async function toggleFormadora(f) {
    try { await cambiarActivaFormadora(f.id, !f.activa); await cargarTodo(); }
    catch (e) { setMensaje({ tipo: 'err', texto: e.message }); }
  }
  async function asignarDirecto(colaboradorId) {
    if (!asigFormadora || !asigLinea) {
      setMensaje({ tipo: 'err', texto: 'Primero elige la formadora y la línea arriba.' });
      return;
    }
    try {
      await asignarPersona({ fecha: hoy, colaboradorId, lineaId: Number(asigLinea), formadoraId: Number(asigFormadora) });
      setBusquedaPersona('');
      await cargarTodo();
    } catch (e) {
      setMensaje({ tipo: 'err', texto: e.message });
    }
  }
  async function quitar(id) {
    try { await quitarAsignacion(id); await cargarTodo(); }
    catch (e) { setMensaje({ tipo: 'err', texto: e.message }); }
  }

  return (
    <>
      <PageHeader title="Líneas" subtitle="Líneas de producción, formadoras, y asignación diaria de personal." />
      <div className="page">

        <section className="cards">
          <div className="card"><div className="icon"><i className="fa-solid fa-industry"></i></div>
            <div><span>Total Líneas</span><h2>{lineas.length}</h2><small>{lineasActivas.length} activas</small></div></div>
          <div className="card acento-azul"><div className="icon"><i className="fa-solid fa-users"></i></div>
            <div><span>Operarios Asignados</span><h2>{asignaciones.length}</h2><small>hoy ({hoy})</small></div></div>
          <div className="card acento-oro"><div className="icon"><i className="fa-solid fa-gauge-high"></i></div>
            <div><span>Cumplimiento Promedio</span><h2>{resumen.promedioCumplimiento}%</h2><small>líneas con producción</small></div></div>
          <div className="card acento-rojo"><div className="icon"><i className="fa-solid fa-chalkboard-user"></i></div>
            <div><span>Formadoras</span><h2>{formadoras.filter(f => f.activa).length}</h2><small>activas</small></div></div>
        </section>

        {mensaje && <div className={`alert ${mensaje.tipo === 'ok' ? 'ok' : 'err'}`}>
          <i className={`fa-solid ${mensaje.tipo === 'ok' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
          {mensaje.texto}
          <button onClick={() => setMensaje(null)} style={{ marginLeft: 'auto', background: 'none' }}><i className="fa-solid fa-xmark"></i></button>
        </div>}

        <div className="two-col-panels">
          <section className="table-panel">
            <div className="panel-header">
              <div><h2>Líneas <span className="badge-count">{lineas.length}</span></h2><p>Activa o desactiva; solo las activas se pueden usar para asignar hoy.</p></div>
            </div>
            {puedeModificar && (
              <div className="form-row" style={{ gridTemplateColumns: '2fr 2fr auto', padding: '0 20px 14px' }}>
                <input type="text" placeholder="Nombre de la línea" value={nuevaLinea} onChange={e => setNuevaLinea(e.target.value)} />
                <input type="text" placeholder="Supervisor (opcional)" value={nuevoSupervisor} onChange={e => setNuevoSupervisor(e.target.value)} />
                <button className="btn-primary" onClick={agregarLinea}><i className="fa-solid fa-plus"></i> Agregar</button>
              </div>
            )}
            <div className="table-scroll">
              <table>
                <thead><tr><th>Línea</th><th>Supervisor</th><th>Estado</th>{puedeModificar && <th>Acción</th>}</tr></thead>
                <tbody>
                  {lineas.map(l => (
                    <tr key={l.id}>
                      <td>{l.nombre}</td>
                      <td>{l.supervisor || '—'}</td>
                      <td><span className={`status ${l.activa ? 'success' : 'danger'}`}>{l.activa ? 'Activa' : 'Inactiva'}</span></td>
                      {puedeModificar && <td>
                        <button title={l.activa ? 'Desactivar' : 'Activar'} onClick={() => toggleLinea(l)}>
                          <i className={`fa-solid ${l.activa ? 'fa-toggle-on' : 'fa-toggle-off'}`}></i>
                        </button>
                      </td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="table-panel">
            <div className="panel-header">
              <div><h2>Formadoras <span className="badge-count">{formadoras.length}</span></h2><p>Agrega las que necesites; solo las activas aparecen para asignar.</p></div>
            </div>
            {puedeModificar && (
              <div className="form-row" style={{ gridTemplateColumns: '1fr auto', padding: '0 20px 14px' }}>
                <input type="text" placeholder="Nombre de la formadora" value={nuevaFormadora} onChange={e => setNuevaFormadora(e.target.value)} />
                <button className="btn-primary" onClick={agregarFormadora}><i className="fa-solid fa-plus"></i> Agregar</button>
              </div>
            )}
            <div className="table-scroll">
              <table>
                <thead><tr><th>Formadora</th><th>Estado</th>{puedeModificar && <th>Acción</th>}</tr></thead>
                <tbody>
                  {formadoras.map(f => (
                    <tr key={f.id}>
                      <td>{f.nombre}</td>
                      <td><span className={`status ${f.activa ? 'success' : 'danger'}`}>{f.activa ? 'Activa' : 'Inactiva'}</span></td>
                      {puedeModificar && <td>
                        <button title={f.activa ? 'Desactivar' : 'Activar'} onClick={() => toggleFormadora(f)}>
                          <i className={`fa-solid ${f.activa ? 'fa-toggle-on' : 'fa-toggle-off'}`}></i>
                        </button>
                      </td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <section className="step-panel">
          <h3><i className="fa-solid fa-user-plus"></i> Asignación de hoy ({hoy}) — se reinicia cada día</h3>

          {formadoras.filter(f => f.activa).length === 0 && (
            <div className="alert-inline" style={{ marginBottom: 14 }}>
              <i className="fa-solid fa-triangle-exclamation"></i> Todavía no tienes ninguna <strong>formadora activa</strong> — agrégala en la tabla "Formadoras" de arriba primero.
            </div>
          )}
          {lineasActivas.length === 0 && (
            <div className="alert-inline" style={{ marginBottom: 14 }}>
              <i className="fa-solid fa-triangle-exclamation"></i> Todavía no tienes ninguna <strong>línea activa</strong> — revisa la tabla "Líneas" de arriba: si no aparece ninguna, agrega una con el formulario de esa sección, o actívala con el interruptor si ya existe pero está apagada.
            </div>
          )}

          <div className="asignacion-pasos">
            <div className="asignacion-paso">
              <span className="asignacion-paso-num">1</span>
              <div className="asignacion-paso-campo">
                <label>Formadora</label>
                <select value={asigFormadora} onChange={e => setAsigFormadora(e.target.value)}>
                  <option value="">Elige la formadora...</option>
                  {formadoras.filter(f => f.activa).map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                </select>
              </div>
            </div>
            <div className="asignacion-paso">
              <span className="asignacion-paso-num">2</span>
              <div className="asignacion-paso-campo">
                <label>Línea</label>
                <select value={asigLinea} onChange={e => setAsigLinea(e.target.value)}>
                  <option value="">Elige la línea...</option>
                  {lineasActivas.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
                </select>
              </div>
            </div>
          </div>

          {asigFormadora && asigLinea ? (
            <div className="asignacion-busqueda">
              <span className="asignacion-paso-num">3</span>
              <div className="asignacion-paso-campo">
                <label>Toca a la persona para asignarla de una vez (busca por nombre o código)</label>
                <div className="search">
                  <i className="fa-solid fa-magnifying-glass"></i>
                  <input type="text" autoFocus placeholder="Escribe para buscar..." value={busquedaPersona} onChange={e => setBusquedaPersona(e.target.value)} />
                </div>
                <div className="asignacion-resultados">
                  {personasFiltradas.length === 0 && <div className="empty-state" style={{ padding: 16 }}>Sin resultados.</div>}
                  {personasFiltradas.map(p => (
                    <button key={p.id} className="asignacion-resultado-item" onClick={() => asignarDirecto(p.id)}>
                      <span className="asignacion-resultado-codigo">{p.id}</span>
                      <span>{p.nombre}</span>
                      <i className="fa-solid fa-circle-plus"></i>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="alert-inline" style={{ marginTop: 14 }}>
              <i className="fa-solid fa-circle-info"></i> Elige primero la formadora y la línea arriba para poder buscar y asignar personas.
            </div>
          )}

          <div className="table-scroll" style={{ marginTop: 18 }}>
            <table>
              <thead><tr><th>Código</th><th>Colaborador</th><th>Formadora</th><th>Línea</th><th>Acción</th></tr></thead>
              <tbody>
                {asignaciones.length === 0 && <tr><td colSpan={5}><div className="empty-state"><i className="fa-solid fa-user-group"></i>Todavía no hay asignaciones para hoy.</div></td></tr>}
                {asignaciones.map(a => (
                  <tr key={a.id}>
                    <td>{a.colaborador_id}</td>
                    <td>{a.colaborador}</td>
                    <td>{a.formadora}</td>
                    <td>{a.linea}</td>
                    <td><button title="Quitar" onClick={() => quitar(a.id)}><i className="fa-solid fa-trash"></i></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {asignacionesPorLinea.length > 0 && (
          <section className="panel">
            <div className="panel-header">
              <div><h2><i className="fa-solid fa-chart-simple" style={{ color: 'var(--primary)', marginRight: 8 }}></i>Distribución de Operarios por Línea</h2>
                <p>Cantidad de operarios asignados actualmente a cada línea.</p></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {asignacionesPorLinea.map(l => (
                <div key={l.linea}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                    <strong>{l.linea}</strong><span>{l.cantidad} operarios</span>
                  </div>
                  <div className="progress" style={{ background: 'var(--border)' }}>
                    <div style={{ width: `${(l.cantidad / maxOperariosLinea) * 100}%`, background: 'linear-gradient(90deg,var(--primary),var(--primary-light))' }}></div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {rendimientoPorLinea.length > 0 && (
          <section className="panel">
            <div className="panel-header">
              <div><h2><i className="fa-solid fa-trophy" style={{ color: 'var(--gold)', marginRight: 8 }}></i>Top Líneas — Rendimiento de Hoy</h2>
                <p>Líneas con mayor rendimiento promedio de sus operarios asignados.</p></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {rendimientoPorLinea.slice(0, 5).map((l, i) => (
                <div key={l.linea_id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px', borderRadius: 10, background: i < 3 ? 'var(--background)' : 'transparent' }}>
                  <span style={{ fontSize: 20, width: 30 }}>{MEDALLAS[i] || `${i + 1}°`}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{l.linea}</div>
                    {l.supervisor && <div style={{ fontSize: 11, color: 'var(--gray)' }}>Supervisor: {l.supervisor}</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>{l.rendimientoPromedio}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--gray)' }}>tallos/h · {l.operarios} operarios</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="table-panel">
          <div className="panel-header">
            <div>
              <h2><i className="fa-solid fa-table" style={{ color: 'var(--primary)', marginRight: 8 }}></i>Tablero Integrado de Formadoras</h2>
              <p>Una fila por formadora y día. Formadora, fecha y rendimiento promedio se llenan solos; edita Semana, Meta, Resultado y Devoluciones a mano — se guardan al salir del campo.</p>
            </div>
          </div>
          <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr', padding: '0 20px 14px' }}>
            <div><label>Desde</label><input type="date" value={tableroDesde} onChange={e => setTableroDesde(e.target.value)} /></div>
            <div><label>Hasta</label><input type="date" value={tableroHasta} max={hoy} onChange={e => setTableroHasta(e.target.value)} /></div>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Semana</th><th>Fecha</th><th>Formadora</th>
                  <th>Meta tallos Clasificación</th><th>Resultado Clasificación</th>
                  <th>Rendimiento Promedio Boncheo</th><th>N° Devoluciones</th>
                </tr>
              </thead>
              <tbody>
                {cargandoTablero && <tr><td colSpan={7}><div className="empty-state">Cargando...</div></td></tr>}
                {!cargandoTablero && tableroFilas.length === 0 && <tr><td colSpan={7}><div className="empty-state"><i className="fa-solid fa-table"></i>Sin asignaciones en este rango — asigna personas a formadoras arriba para que aparezcan aquí.</div></td></tr>}
                {tableroFilas.map(f => {
                  const clave = `${f.fecha}_${f.formadora_id}`;
                  const guardando = guardandoFilaTablero === clave;
                  return (
                    <tr key={clave}>
                      <td><input type="text" style={{ width: 70 }} value={f.semana} onChange={e => actualizarCampoTablero(f.fecha, f.formadora_id, 'semana', e.target.value)} onBlur={() => guardarFilaTableroAhora(f)} /></td>
                      <td>{f.fecha}</td>
                      <td>{f.formadora}</td>
                      <td><input type="number" style={{ width: 90 }} value={f.metaClasificacion} onChange={e => actualizarCampoTablero(f.fecha, f.formadora_id, 'metaClasificacion', e.target.value)} onBlur={() => guardarFilaTableroAhora(f)} /></td>
                      <td><input type="number" style={{ width: 90 }} value={f.resultadoClasificacion} onChange={e => actualizarCampoTablero(f.fecha, f.formadora_id, 'resultadoClasificacion', e.target.value)} onBlur={() => guardarFilaTableroAhora(f)} /></td>
                      <td><strong>{f.rendimientoPromedio}</strong></td>
                      <td>
                        <input type="number" style={{ width: 80 }} value={f.devoluciones} onChange={e => actualizarCampoTablero(f.fecha, f.formadora_id, 'devoluciones', e.target.value)} onBlur={() => guardarFilaTableroAhora(f)} />
                        {guardando && <i className="fa-solid fa-spinner fa-spin" style={{ marginLeft: 6, color: 'var(--gray)' }}></i>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
