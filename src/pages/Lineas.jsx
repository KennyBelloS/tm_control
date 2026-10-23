import { useEffect, useMemo, useRef, useState } from 'react';
import logo from '../assets/logo-icon.png';
import { exportarElemento, vistaPreviaElemento } from '../lib/exportarElemento';
import { ModalVistaImagen } from '../components/VistaPreviaImagen';
import { fechaLocalISO, formatoFecha } from '../lib/clasificacionCalculos';
import { esFilaMesaLegada, coincidePersona } from '../lib/personasUtil';
import PageHeader from '../components/PageHeader';
import { useSesion } from '../lib/useSesion';
import { puedeEditar } from '../lib/roles';
import { listarPersonasModulo, getConfig, getCodigosPorPersona } from '../lib/db';
import {
  listarLineas, crearLinea, actualizarLinea, cambiarActivaLinea,
  listarFormadoras, crearFormadora, cambiarActivaFormadora,
  getAsignacionesDia, asignarPersona, quitarAsignacion,
  getRendimientoPorLinea, getTableroFormadoras, guardarFilaTablero,
  getMetasMes, guardarMetaMes, mesDe, mesAnterior, getFormadoraLinea, setFormadoraLinea,
  actualizarFormadora, eliminarFormadora, actualizarAsignacion, getLineasDia, setLineaDia
} from '../lib/lineas';
import { limpiarTexto } from '../lib/seguridad';
import { devolucionesDePersonas } from '../lib/devoluciones';
import { Link } from 'react-router-dom';
import AsignarClasificador from '../components/lineas/AsignarClasificador';
import { usePeriodoDev, useExtrasTablero } from '../lib/periodoDev';
import { FiltroDevoluciones, FiltroExtrasTablero, valorPeriodo, etiquetaPeriodo, CifraDev } from '../components/devoluciones/PiezasDevLineas';
import { EstadoVacio, FilasEsqueleto } from '../components/Estados';

const nombreMes = mes => {
  const [y, m] = mes.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
};
function hoyISO() {
  return fechaLocalISO(); // hora local: toISOString() usa UTC y después de las 7 p.m. marcaría mañana
}

const MEDALLAS = ['🥇', '🥈', '🥉'];

export default function Lineas() {
  const { sesion } = useSesion();
  const puedeModificar = puedeEditar(sesion?.rol);
  const hoy = hoyISO();
  const [fechaAsignacion, setFechaAsignacion] = useState(hoyISO());

  const [lineas, setLineas] = useState([]);
  const [formadoras, setFormadoras] = useState([]);
  const [personas, setPersonas] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);
  const [rendimientoPorLinea, setRendimientoPorLinea] = useState([]);
  const [tableroFilas, setTableroFilas] = useState([]);
  const [tableroDesde, setTableroDesde] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 13);
    return fechaLocalISO(d);
  });
  const [tableroHasta, setTableroHasta] = useState(hoyISO());
  const [cargandoTablero, setCargandoTablero] = useState(false);
  const [guardandoFilaTablero, setGuardandoFilaTablero] = useState(null);
  const [metaHora, setMetaHora] = useState(470);
  const mesActual = mesDe(hoy);
  const [metasMes, setMetasMes] = useState(undefined);        // undefined = cargando, null = aún sin el SQL (meta fija anterior)
  const [metasMesPrevio, setMetasMesPrevio] = useState(null);
  const [formadoraDeLinea, setFormadoraDeLinea] = useState(new Map());
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState(null);

  const [metaTick, setMetaTick] = useState(0);
  const [codigosDerivados, setCodigosDerivados] = useState(new Map());   // código de cada persona sacado del turno/histórico
  const [lineasDia, setLineasDia] = useState(new Map());     // ajustes de "trabaja / no trabaja" para la fecha elegida
  const [editandoLineaId, setEditandoLineaId] = useState(null);
  const [borradorLinea, setBorradorLinea] = useState({ nombre: '', supervisor: '' });
  const [editandoFormId, setEditandoFormId] = useState(null);
  const [borradorForm, setBorradorForm] = useState('');
  const [nuevaLinea, setNuevaLinea] = useState('');
  const [nuevoSupervisor, setNuevoSupervisor] = useState('');
  const [nuevaFormadora, setNuevaFormadora] = useState('');

  const [asigFormadora, setAsigFormadora] = useState('');
  const [asigLinea, setAsigLinea] = useState('');
  const [busquedaPersona, setBusquedaPersona] = useState('');

  async function cargarTodo() {
    setCargando(true);
    try {
      const [l, f, p, a, r, cfg, mm, mp, fl, ld, cd] = await Promise.all([
        listarLineas(),
        listarFormadoras(),
        listarPersonasModulo(),
        getAsignacionesDia(fechaAsignacion),
        getRendimientoPorLinea(fechaAsignacion, fechaAsignacion),
        getConfig(),
        getMetasMes(mesActual),
        getMetasMes(mesAnterior(mesActual)),
        getFormadoraLinea(fechaAsignacion),
        getLineasDia(fechaAsignacion),
        getCodigosPorPersona().catch(() => new Map())
      ]);
      setCodigosDerivados(cd);
      setMetasMes(mm); setMetasMesPrevio(mp); setFormadoraDeLinea(fl); setLineasDia(ld);
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
  useEffect(() => { cargarTodo(); }, [fechaAsignacion]);
  // Devoluciones de las personas asignadas, tomadas del módulo de Devoluciones. Por defecto SOLO el día; la semana y el mes se eligen aparte.
  const [periodoDev, setPeriodoDev] = usePeriodoDev();          // filtro de la franja y de la tabla de personas (un período a la vez)
  const [extrasTab, setExtrasTab] = useExtrasTablero();          // columnas extra del Tablero: semana y/o mes (el día siempre se ve)
  const columnasTab = 8 + (extrasTab.semana ? 1 : 0) + (extrasTab.mes ? 1 : 0);
  const [devPersonas, setDevPersonas] = useState(null);
  useEffect(() => {
    let vivo = true;
    devolucionesDePersonas(asignaciones.map(a => ({ id: a.colaborador_id, nombre: a.colaborador, mesa: a.mesa })), fechaAsignacion)
      .then(r => vivo && setDevPersonas(r)).catch(() => vivo && setDevPersonas(null));
    return () => { vivo = false; };
  }, [asignaciones, fechaAsignacion]);
  const verDev = !!devPersonas?.hayDatos;
  const valorDevPersona = id => valorPeriodo(devPersonas?.porPersona.get(id), periodoDev, devPersonas?.hayDia);
  const resumenDevFormadoras = useMemo(() => {
    if (!verDev) return [];
    const m = new Map();
    for (const a of asignaciones) {
      const v = valorPeriodo(devPersonas.porPersona.get(a.colaborador_id), periodoDev, devPersonas.hayDia);
      const e = m.get(a.formadora_id) || { id: a.formadora_id, nombre: a.formadora, personas: 0, sinDato: 0, total: 0, conDato: 0 };
      e.personas++;
      if (v == null) e.sinDato++; else { e.total += v; e.conDato++; }
      m.set(a.formadora_id, e);
    }
    return [...m.values()].sort((x, y) => y.total - x.total);
  }, [asignaciones, devPersonas, verDev, periodoDev]);

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
  const tableroExportRef = useRef(null);
  const [exportandoTablero, setExportandoTablero] = useState(null);
  const [previaTablero, setPreviaTablero] = useState(null);
  async function verPreviaTablero() { setPreviaTablero({ src: null }); try { setPreviaTablero({ src: await vistaPreviaElemento(tableroExportRef.current) }); } catch (e) { setPreviaTablero(null); setMensaje({ tipo: 'err', texto: e.message }); } }
  async function descargarTablero(formato) {
    setExportandoTablero(formato);
    try { await exportarElemento(tableroExportRef.current, `tablero_formadoras_${tableroDesde}_a_${tableroHasta}`, formato); }
    catch (e) { setMensaje({ tipo: 'err', texto: e.message }); }
    finally { setExportandoTablero(null); }
  }
  async function guardarMetaLinea(linea, valor) {
    const meta = valor === '' || valor == null ? null : Number(valor);
    if (meta !== null && (!Number.isFinite(meta) || meta < 0)) return;
    // La meta es por HORA (ej. 5.000). Un número muy grande suele ser la meta del DÍA escrita por error.
    if (meta !== null && meta > 15000 && !confirm(`${meta.toLocaleString('es-CO')} tallos POR HORA parece demasiado alto (¿es la meta del día?). Este campo es la meta por hora, por ejemplo 5.000.\n\n¿Guardar ${meta.toLocaleString('es-CO')} de todos modos?`)) {
      setMetaTick(t => t + 1);
      return;
    }
    try {
      if (metasMes) {                               // metas por mes (se reinician cada mes)
        if ((metasMes.get(linea.id) ?? null) === meta) return;
        await guardarMetaMes(mesActual, linea.id, meta);
        setMetasMes(m => { const n = new Map(m); if (meta == null) n.delete(linea.id); else n.set(linea.id, meta); return n; });
      } else {                                      // aún sin el SQL: meta fija de antes
        if ((linea.meta_hora ?? null) === meta) return;
        await actualizarLinea(linea.id, { meta_hora: meta });
        setLineas(ls => ls.map(l => l.id === linea.id ? { ...l, meta_hora: meta } : l));
      }
    } catch (e) {
      setMensaje({ tipo: 'err', texto: 'No se pudo guardar la meta. ¿Ya corriste el SQL de metas por mes? ' + e.message });
    }
  }
  async function cambiarFormadoraLinea(lineaId, valor) {
    try {
      await setFormadoraLinea(fechaAsignacion, lineaId, valor ? Number(valor) : null);
      setFormadoraDeLinea(await getFormadoraLinea(fechaAsignacion));
    } catch (e) {
      setMensaje({ tipo: 'err', texto: e.message });
    }
  }
  function usarResultadoAuto(fila) {
    const nueva = { ...fila, resultadoClasificacion: fila.resultadoAuto };
    setTableroFilas(filas => filas.map(f => (f.fecha === fila.fecha && f.formadora_id === fila.formadora_id) ? nueva : f));
    guardarFilaTableroAhora(nueva);
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

  // Una línea trabaja ese día si así se ajustó; si no hay ajuste, vale lo general de la línea (activa/inactiva)
  const lineasActivas = useMemo(() => lineas.filter(l => lineasDia.has(l.id) ? lineasDia.get(l.id) : l.activa), [lineas, lineasDia]);

  // Cada persona se muestra y se busca por su CÓDIGO (el más corto), nunca por el id largo
  const codigoDe = (id, mesa) => (mesa != null ? String(mesa) : (codigosDerivados.get(id) ?? null));
  const personasFiltradas = useMemo(() => {
    const vigentes = personas.filter(p => p.activo && !esFilaMesaLegada(p))
      .map(p => ({ ...p, codigo: codigoDe(p.id, p.mesa) }))
      .sort((x, y) => (Number(x.codigo) || 1e9) - (Number(y.codigo) || 1e9) || String(x.nombre).localeCompare(String(y.nombre)));
    if (!busquedaPersona) return vigentes.slice(0, 30);
    return vigentes.filter(p => coincidePersona({ nombre: p.nombre, mesa: p.codigo }, busquedaPersona)).slice(0, 30);
  }, [personas, busquedaPersona, codigosDerivados]);

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

  async function guardarEdicionLinea(id) {
    const nombre = borradorLinea.nombre.trim();
    if (!nombre) { setMensaje({ tipo: 'err', texto: 'La línea necesita un nombre.' }); return; }
    try {
      await actualizarLinea(id, { nombre: limpiarTexto(nombre, 60), supervisor: limpiarTexto(borradorLinea.supervisor, 80) || null });
      setEditandoLineaId(null);
      await cargarTodo();
    } catch (e) {
      setMensaje({ tipo: 'err', texto: e.code === '23505' ? 'Ya existe una línea con ese nombre.' : e.message });
    }
  }
  async function guardarEdicionFormadora(id) {
    const nombre = borradorForm.trim();
    if (!nombre) { setMensaje({ tipo: 'err', texto: 'La formadora necesita un nombre.' }); return; }
    try {
      await actualizarFormadora(id, limpiarTexto(nombre, 80));
      setEditandoFormId(null);
      await cargarTodo();
    } catch (e) {
      setMensaje({ tipo: 'err', texto: e.message });
    }
  }
  async function borrarFormadora(f) {
    if (!confirm(`¿Eliminar a ${f.nombre}? También se quitarán sus asignaciones y las líneas que tenía a cargo. Si solo quieres que no aparezca, mejor desactívala.`)) return;
    try { await eliminarFormadora(f.id); await cargarTodo(); } catch (e) { setMensaje({ tipo: 'err', texto: e.message }); }
  }
  async function corregirAsignacion(a, campo, valor) {
    try {
      await actualizarAsignacion(a.id, campo === 'linea' ? { lineaId: Number(valor) } : { formadoraId: Number(valor) });
      await cargarTodo();
    } catch (e) {
      setMensaje({ tipo: 'err', texto: e.message });
    }
  }
  async function cambiarLineaDia(linea, trabaja) {
    try {
      await setLineaDia(fechaAsignacion, linea.id, trabaja);
      setLineasDia(await getLineasDia(fechaAsignacion));
    } catch (e) {
      setMensaje({ tipo: 'err', texto: e.message });
    }
  }
  async function agregarLinea() {
    if (!nuevaLinea.trim()) return;
    try {
      await crearLinea(limpiarTexto(nuevaLinea, 60), limpiarTexto(nuevoSupervisor, 80));
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
      await crearFormadora(limpiarTexto(nuevaFormadora, 80));
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
      await asignarPersona({ fecha: fechaAsignacion, colaboradorId, lineaId: Number(asigLinea), formadoraId: Number(asigFormadora) });
      // Si esa línea todavía no tiene formadora a cargo ese día, queda con la que se está usando
      if (!formadoraDeLinea.get(Number(asigLinea))) await setFormadoraLinea(fechaAsignacion, Number(asigLinea), Number(asigFormadora)).catch(() => {});
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
            <div><span>Operarios Asignados</span><h2>{asignaciones.length}</h2><small>{fechaAsignacion === hoy ? 'hoy' : 'el'} {formatoFecha(fechaAsignacion)}</small></div></div>
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
              <div><h2>Líneas <span className="badge-count">{lineas.length}</span></h2><p>Activa o desactiva; solo las activas se pueden usar para asignar.</p></div>
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
                <thead><tr><th>Línea</th><th>Supervisor</th><th title="Meta de tallos de clasificación de TODO el día para esa línea. Es solo informativa (no cambia lo que deberían llevar a cada hora). Se define cada mes: al empezar un mes nuevo arranca vacía.">Meta del día (tallos) · {nombreMes(mesActual)}</th><th>Estado</th>{puedeModificar && <th>Acción</th>}</tr></thead>
                <tbody>
                  {lineas.map(l => (
                    <tr key={l.id}>
                      {editandoLineaId === l.id
                        ? <td><input type="text" value={borradorLinea.nombre} onChange={e => setBorradorLinea(b => ({ ...b, nombre: e.target.value }))} /></td>
                        : <td>{l.nombre}</td>}
                      {editandoLineaId === l.id
                        ? <td><input type="text" value={borradorLinea.supervisor} placeholder="—" onChange={e => setBorradorLinea(b => ({ ...b, supervisor: e.target.value }))} /></td>
                        : <td>{l.supervisor || '—'}</td>}
                      <td>
                        {(() => {
                          const valor = metasMes ? (metasMes.get(l.id) ?? '') : (l.meta_hora ?? '');
                          const previo = metasMesPrevio?.get(l.id);
                          if (!puedeModificar) return valor === '' ? '—' : valor;
                          return (
                            <>
                              <input key={`${l.id}-${mesActual}-${valor}-${metaTick}`} type="number" min="0" className="meta-linea-input" defaultValue={valor} placeholder="—" onBlur={e => guardarMetaLinea(l, e.target.value)} />
                              {metasMes && valor === '' && previo != null && (
                                <button className="meta-usar-previa" title={`El mes pasado fue ${previo}. Toca para usarla este mes.`} onClick={() => guardarMetaLinea(l, previo)}>↺ {previo}</button>
                              )}
                            </>
                          );
                        })()}
                      </td>
                      <td><span className={`status ${l.activa ? 'success' : 'danger'}`}>{l.activa ? 'Activa' : 'Inactiva'}</span></td>
                      {puedeModificar && <td>
                        {editandoLineaId === l.id ? (
                          <>
                            <button title="Guardar" onClick={() => guardarEdicionLinea(l.id)}><i className="fa-solid fa-check"></i></button>
                            <button title="Cancelar" onClick={() => setEditandoLineaId(null)}><i className="fa-solid fa-xmark"></i></button>
                          </>
                        ) : (
                          <>
                            <button title="Editar nombre y supervisor" onClick={() => { setEditandoLineaId(l.id); setBorradorLinea({ nombre: l.nombre, supervisor: l.supervisor || '' }); }}><i className="fa-solid fa-pen"></i></button>
                            <button title={l.activa ? 'Desactivar (en general)' : 'Activar (en general)'} onClick={() => toggleLinea(l)}>
                              <i className={`fa-solid ${l.activa ? 'fa-toggle-on' : 'fa-toggle-off'}`}></i>
                            </button>
                          </>
                        )}
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
                      {editandoFormId === f.id
                        ? <td><input type="text" value={borradorForm} onChange={e => setBorradorForm(e.target.value)} onKeyDown={e => e.key === 'Enter' && guardarEdicionFormadora(f.id)} /></td>
                        : <td>{f.nombre}</td>}
                      <td><span className={`status ${f.activa ? 'success' : 'danger'}`}>{f.activa ? 'Activa' : 'Inactiva'}</span></td>
                      {puedeModificar && <td>
                        {editandoFormId === f.id ? (
                          <>
                            <button title="Guardar" onClick={() => guardarEdicionFormadora(f.id)}><i className="fa-solid fa-check"></i></button>
                            <button title="Cancelar" onClick={() => setEditandoFormId(null)}><i className="fa-solid fa-xmark"></i></button>
                          </>
                        ) : (
                          <>
                            <button title="Cambiar el nombre" onClick={() => { setEditandoFormId(f.id); setBorradorForm(f.nombre); }}><i className="fa-solid fa-pen"></i></button>
                            <button title={f.activa ? 'Desactivar' : 'Activar'} onClick={() => toggleFormadora(f)}>
                              <i className={`fa-solid ${f.activa ? 'fa-toggle-on' : 'fa-toggle-off'}`}></i>
                            </button>
                            <button title="Eliminar" onClick={() => borrarFormadora(f)}><i className="fa-solid fa-trash"></i></button>
                          </>
                        )}
                      </td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <section className="step-panel">
          <h3><i className="fa-solid fa-user-plus"></i> Asignación de personas a formadora y línea</h3>
          <div className="asig-fecha">
            <div>
              <label>Fecha de la asignación</label>
              <input type="date" value={fechaAsignacion} onChange={e => e.target.value && setFechaAsignacion(e.target.value)} />
            </div>
            <p>
              Cada fecha tiene su propia asignación (no se mezclan). Elige el día para asignar o corregir
              {fechaAsignacion === hoy ? '' : <strong> — estás editando el {formatoFecha(fechaAsignacion)}, no hoy</strong>}.
              {fechaAsignacion !== hoy && <button className="btn-secondary" style={{ marginLeft: 10 }} onClick={() => setFechaAsignacion(hoy)}>Volver a hoy</button>}
            </p>
          </div>

          <div className="linea-formadora">
            <h4><i className="fa-solid fa-link"></i> Líneas y formadora a cargo · {formatoFecha(fechaAsignacion)}</h4>
            <p>Marca qué líneas trabajan este día y elige qué formadora lleva cada una: los tallos de clasificación de esa línea se cuentan para ella. Si no eliges, se asigna sola la primera vez que le pones gente a una línea.</p>
            <div className="linea-formadora-grid">
              {lineas.map(l => {
                const trabaja = lineasDia.has(l.id) ? lineasDia.get(l.id) : l.activa;
                return (
                  <div key={l.id} className={`linea-formadora-item ${trabaja ? '' : 'linea-descansa'}`}>
                    <span className="linea-formadora-cab">
                      {l.nombre}
                      <label className="linea-trabaja" title="Marca si esta línea trabaja este día. Solo cambia esta fecha.">
                        <input type="checkbox" checked={trabaja} disabled={!puedeModificar} onChange={e => cambiarLineaDia(l, e.target.checked)} /> trabaja este día
                      </label>
                    </span>
                    <select value={formadoraDeLinea.get(l.id)?.formadora_id ?? ''} onChange={e => cambiarFormadoraLinea(l.id, e.target.value)} disabled={!puedeModificar || !trabaja}>
                      <option value="">Sin asignar</option>
                      {formadoras.filter(f => f.activa).map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                    </select>
                  </div>
                );
              })}
              {lineas.length === 0 && <span style={{ fontSize: 12, color: 'var(--gray)' }}>No hay líneas.</span>}
            </div>
          </div>

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
                <label>Toca a la persona para asignarla de una vez (busca por nombre o por código)</label>
                <div className="search">
                  <i className="fa-solid fa-magnifying-glass"></i>
                  <input type="text" autoFocus placeholder="Busca por nombre o por código (ej. 4)…" maxLength={60} value={busquedaPersona} onChange={e => setBusquedaPersona(e.target.value)} />
                </div>
                <div className="asignacion-resultados">
                  {personasFiltradas.length === 0 && <EstadoVacio titulo="Sin resultados" compacto />}
                  {personasFiltradas.map(p => (
                    <button key={p.id} className="asignacion-resultado-item" onClick={() => asignarDirecto(p.id)}>
                      <span className="asignacion-resultado-codigo" title="Código (el más corto)">{p.codigo ?? '—'}</span>
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

          {verDev && resumenDevFormadoras.length > 0 && (
            <div className="dev-formadoras-strip" aria-label="Devoluciones por formadora, según las personas asignadas">
              <div className="dev-strip-cab">
                <span className="dev-strip-titulo"><i className="fa-solid fa-rotate-left"></i> Devoluciones de la gente de cada formadora · {etiquetaPeriodo(periodoDev, fechaAsignacion, devPersonas.ultima)}</span>
                <FiltroDevoluciones periodo={periodoDev} onCambio={setPeriodoDev} />
              </div>
              {resumenDevFormadoras.map(f => (
                <div key={f.id} className="dev-strip-item" title={f.sinDato ? `${f.sinDato} persona(s) sin dato en Devoluciones para este período` : ''}>
                  <strong>{f.nombre}</strong><span>{f.personas} persona{f.personas === 1 ? '' : 's'}</span>
                  <CifraDev valor={f.conDato > 0 ? f.total : null} ultima={devPersonas.ultima} periodo={periodoDev} fecha={fechaAsignacion} claseBase="dev-strip-num" />
                </div>
              ))}
            </div>
          )}
          <div className="table-scroll" style={{ marginTop: 18 }}>
            <table>
              <thead><tr><th>Código (mesa)</th><th>Colaborador</th><th>Formadora</th><th>Línea</th>{verDev && <th className="th-dev" title="Devoluciones de esta persona en el período elegido (filtro «Devoluciones»)">Devoluciones<small>{etiquetaPeriodo(periodoDev, fechaAsignacion, devPersonas.ultima)}</small></th>}<th>Acción</th></tr></thead>
              <tbody>
                {asignaciones.length === 0 && <tr><td colSpan={verDev ? 6 : 5}><EstadoVacio icono="fa-user-group" titulo="Todavía no hay asignaciones para esta fecha" /></td></tr>}
                {asignaciones.map(a => (
                  <tr key={a.id}>
                    <td><strong>{codigoDe(a.colaborador_id, a.mesa) ?? '—'}</strong></td>
                    <td><Link className="enlace-colab" to={`/colaborador?id=${a.colaborador_id}`} title="Ver el tablero integrado de esta persona">{a.colaborador}</Link></td>
                    <td>{puedeModificar
                      ? <select className="asig-select" value={a.formadora_id} onChange={e => corregirAsignacion(a, 'formadora', e.target.value)}>
                          {formadoras.filter(f => f.activa || f.id === a.formadora_id).map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                        </select>
                      : a.formadora}</td>
                    <td>{puedeModificar
                      ? <select className="asig-select" value={a.linea_id} onChange={e => corregirAsignacion(a, 'linea', e.target.value)}>
                          {lineas.filter(l => lineasActivas.some(x => x.id === l.id) || l.id === a.linea_id).map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
                        </select>
                      : a.linea}</td>
                    {verDev && <td className="td-dev"><CifraDev valor={valorDevPersona(a.colaborador_id)} ultima={devPersonas.ultima} periodo={periodoDev} fecha={fechaAsignacion} /></td>}
                    <td><button title="Quitar" onClick={() => quitar(a.id)}><i className="fa-solid fa-trash"></i></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <AsignarClasificador fecha={fechaAsignacion} esHoy={fechaAsignacion === hoy} asignaciones={asignaciones} personas={personas} puedeModificar={puedeModificar} />

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
              <p>Formadora, línea, fecha y rendimiento promedio se llenan solos (de Boncheo). Escribe a mano Semana, Meta, Resultado y Devoluciones — se guardan al salir del campo.</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-secondary" disabled={!!exportandoTablero || tableroFilas.length === 0} onClick={verPreviaTablero}><i className="fa-solid fa-eye"></i> Vista previa</button>
              <button className="btn-secondary" disabled={!!exportandoTablero || tableroFilas.length === 0} onClick={() => descargarTablero('png')}><i className="fa-solid fa-file-image"></i> {exportandoTablero === 'png' ? 'Generando…' : 'Imagen'}</button>
              <button className="btn-secondary" disabled={!!exportandoTablero || tableroFilas.length === 0} onClick={() => descargarTablero('pdf')}><i className="fa-solid fa-file-pdf"></i> {exportandoTablero === 'pdf' ? 'Generando…' : 'PDF'}</button>
              {previaTablero && <ModalVistaImagen titulo="Vista previa — Tablero de formadoras" src={previaTablero.src} onCerrar={() => setPreviaTablero(null)} acciones={[{ texto: 'Descargar imagen', icono: 'fa-file-image', primario: true, deshabilitado: !previaTablero.src || !!exportandoTablero, onClick: () => descargarTablero('png') }]} />}
            </div>
          </div>
          <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr', padding: '0 20px 14px' }}>
            <div><label>Desde</label><input type="date" value={tableroDesde} onChange={e => setTableroDesde(e.target.value)} /></div>
            <div><label>Hasta</label><input type="date" value={tableroHasta} max={hoy} onChange={e => setTableroHasta(e.target.value)} /></div>
          </div>
          <div className="tab-leyenda">
            <span><i className="cls-punto cls-mejor"></i> Rendimiento ≥ {metaHora} /h (cumple)</span>
            <span><i className="cls-punto cls-peor"></i> Rendimiento por debajo de {metaHora} /h</span>
            <span><i className="cls-punto cls-peor"></i> Devoluciones mayores a 0</span>
          </div>
          <FiltroExtrasTablero extras={extrasTab} onCambio={setExtrasTab} />
          <div className="table-scroll">
            <table className="tablero-tabla">
              <thead>
                <tr>
                  <th>Semana</th><th>Fecha</th><th>Formadora</th><th>Línea</th>
                  <th>Meta tallos Clasificación</th><th>Resultado Clasificación</th>
                  <th>Rendimiento Promedio Boncheo</th><th>N° Devoluciones</th>
                  {extrasTab.semana && <th className="th-dev" title="Devoluciones de la gente que esta formadora tenía asignada, en la semana (domingo a sábado) de esa fecha. Se calcula solo.">Devol. semana</th>}
                  {extrasTab.mes && <th className="th-dev" title="Devoluciones de la gente que esta formadora tenía asignada, en el mes de esa fecha. Se calcula solo.">Devol. mes</th>}
                </tr>
              </thead>
              <tbody>
                {cargandoTablero && <FilasEsqueleto columnas={columnasTab} />}
                {!cargandoTablero && tableroFilas.length === 0 && <tr><td colSpan={columnasTab}><EstadoVacio icono="fa-table" titulo="Sin asignaciones en este rango — asigna personas a formadoras arriba para que aparezcan aquí" /></td></tr>}
                {tableroFilas.map(f => {
                  const clave = `${f.fecha}_${f.formadora_id}`;
                  const guardando = guardandoFilaTablero === clave;
                  const claseRend = f.rendimientoPromedio > 0 ? (f.rendimientoPromedio >= metaHora ? 'tab-verde' : 'tab-rojo') : '';
                  const devEfectiva = f.devoluciones !== '' ? f.devoluciones : (f.devolucionesAuto ?? '');      // lo escrito a mano manda; si no, el del módulo de Devoluciones
                  const claseDev = devEfectiva === '' ? '' : (Number(devEfectiva) > 0 ? 'tab-rojo' : 'tab-verde');
                  const sinResultado = f.resultadoClasificacion === '' || f.resultadoClasificacion == null;
                  return (
                    <tr key={clave}>
                      <td><input type="text" style={{ width: 70 }} value={f.semana} onChange={e => actualizarCampoTablero(f.fecha, f.formadora_id, 'semana', e.target.value)} onBlur={() => guardarFilaTableroAhora(f)} /></td>
                      <td>{formatoFecha(f.fecha)}</td>
                      <td>{f.formadora}</td>
                      <td>{f.lineas}</td>
                      <td><input type="number" style={{ width: 90 }} value={f.metaClasificacion} onChange={e => actualizarCampoTablero(f.fecha, f.formadora_id, 'metaClasificacion', e.target.value)} onBlur={() => guardarFilaTableroAhora(f)} /></td>
                      <td>
                        <input type="number" style={{ width: 90 }} value={f.resultadoClasificacion} onChange={e => actualizarCampoTablero(f.fecha, f.formadora_id, 'resultadoClasificacion', e.target.value)} onBlur={() => guardarFilaTableroAhora(f)} />
                        {sinResultado && f.resultadoAuto != null && (
                          <button className="tab-auto" title="Total que ya se cargó en Clasificación para su(s) línea(s) ese día" onClick={() => usarResultadoAuto(f)}>
                            usar {f.resultadoAuto.toLocaleString('es-CO')}
                          </button>
                        )}
                      </td>
                      <td className={claseRend}><strong>{f.rendimientoPromedio || '—'}</strong></td>
                      <td className={claseDev}>
                        <input type="number" min="0" style={{ width: 80 }} value={f.devoluciones} placeholder={f.devolucionesAuto != null ? String(f.devolucionesAuto) : ''} onChange={e => actualizarCampoTablero(f.fecha, f.formadora_id, 'devoluciones', e.target.value)} onBlur={() => guardarFilaTableroAhora(f)} />
                        {f.devoluciones === '' && f.devolucionesAuto != null && <span className="tab-auto-dev" title="Calculado desde el módulo de Devoluciones con las personas que esta formadora tenía asignadas ese día. Escribe un número para cambiarlo.">auto</span>}
                        {guardando && <i className="fa-solid fa-spinner fa-spin" style={{ marginLeft: 6, color: 'var(--gray)' }}></i>}
                      </td>
                      {extrasTab.semana && <td className="td-dev"><CifraDev valor={f.devolucionesSemana} ultima={f.devolucionesUltima} periodo="semana" fecha={f.fecha} /></td>}
                      {extrasTab.mes && <td className="td-dev"><CifraDev valor={f.devolucionesMes} ultima={f.devolucionesUltima} periodo="mes" fecha={f.fecha} /></td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Versión de solo lectura (fuera de pantalla) que se usa para descargar imagen y PDF */}
          <div className="tablero-export-oculto" aria-hidden="true">
            <div ref={tableroExportRef} className="tablero-export">
              <div className="tablero-export-cab">
                <img src={logo} alt="" />
                <div>
                  <h3>Tablero Integrado de Formadoras</h3>
                  <p>{formatoFecha(tableroDesde)} al {formatoFecha(tableroHasta)} · Meta de rendimiento: {metaHora} tallos/h</p>
                </div>
              </div>
              <table className="tablero-export-tabla">
                <thead>
                  <tr><th>Semana</th><th>Fecha</th><th>Formadora</th><th>Línea</th><th>Meta tallos<br />Clasificación</th><th>Resultado<br />Clasificación</th><th>Rendimiento<br />Promedio Boncheo</th><th>N° de<br />devoluciones</th>{extrasTab.semana && <th>Devol.<br />semana</th>}{extrasTab.mes && <th>Devol.<br />mes</th>}</tr>
                </thead>
                <tbody>
                  {tableroFilas.map(f => (
                    <tr key={`${f.fecha}_${f.formadora_id}`}>
                      <td>{f.semana}</td><td>{formatoFecha(f.fecha)}</td><td>{f.formadora}</td><td>{f.lineas}</td>
                      <td>{f.metaClasificacion !== '' ? Number(f.metaClasificacion).toLocaleString('es-CO') : ''}</td>
                      <td>{f.resultadoClasificacion !== '' ? Number(f.resultadoClasificacion).toLocaleString('es-CO') : ''}</td>
                      <td className={f.rendimientoPromedio > 0 ? (f.rendimientoPromedio >= metaHora ? 'tab-verde' : 'tab-rojo') : ''}>{f.rendimientoPromedio || ''}</td>
                      <td className={(f.devoluciones !== '' ? f.devoluciones : (f.devolucionesAuto ?? '')) === '' ? '' : (Number(f.devoluciones !== '' ? f.devoluciones : f.devolucionesAuto) > 0 ? 'tab-rojo' : 'tab-verde')}>{f.devoluciones !== '' ? f.devoluciones : (f.devolucionesAuto ?? '')}</td>
                      {extrasTab.semana && <td>{f.devolucionesSemana ?? ''}</td>}{extrasTab.mes && <td>{f.devolucionesMes ?? ''}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="tablero-export-pie">Verde: cumple o supera la meta de {metaHora} /h · Rojo: por debajo de la meta, o con devoluciones</p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
