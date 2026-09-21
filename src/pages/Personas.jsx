import { useEffect, useMemo, useRef, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { useSesion } from '../lib/useSesion';
import { puedeEditar } from '../lib/roles';
import { listarPersonasModulo, insertarPersonasDesdeExcel, agregarPersonaManual, actualizarPersonaModulo, cambiarActivoPersona, getHorasTotalesPorPersona } from '../lib/db';
import { parsearReportePersonas } from '../lib/excel';

export default function Personas() {
  const { sesion } = useSesion();
  const puedeModificar = puedeEditar(sesion?.rol);

  const [personas, setPersonas] = useState([]);
  const [horasPorPersona, setHorasPorPersona] = useState(new Map());
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [soloActivas, setSoloActivas] = useState(true);
  const [soloPocaActividad, setSoloPocaActividad] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const fileRef = useRef(null);

  const [mostrarFormManual, setMostrarFormManual] = useState(false);
  const [nuevoId, setNuevoId] = useState('');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoCodigoEmp, setNuevoCodigoEmp] = useState('');
  const [nuevoRol, setNuevoRol] = useState('');

  const [editandoId, setEditandoId] = useState(null);
  const [borrador, setBorrador] = useState({});

  async function cargar() {
    setCargando(true);
    try {
      const [r, h] = await Promise.all([listarPersonasModulo(), getHorasTotalesPorPersona()]);
      setPersonas(r);
      setHorasPorPersona(h);
    } catch (e) {
      setMensaje({ tipo: 'err', texto: e.message });
    } finally {
      setCargando(false);
    }
  }
  useEffect(() => { cargar(); }, []);

  const UMBRAL_POCA_ACTIVIDAD_HORAS = 10;
  const personasFiltradas = useMemo(() => {
    let base = personas;
    if (soloActivas) base = base.filter(p => p.activo);
    if (soloPocaActividad) base = base.filter(p => (horasPorPersona.get(p.id) || 0) < UMBRAL_POCA_ACTIVIDAD_HORAS);
    if (busqueda) {
      const b = busqueda.toLowerCase();
      base = base.filter(p =>
        p.nombre.toLowerCase().includes(b) ||
        String(p.id).includes(b) ||
        (p.codigo_empleado || '').toLowerCase().includes(b)
      );
    }
    return [...base].sort((a, b) => (horasPorPersona.get(a.id) || 0) - (horasPorPersona.get(b.id) || 0));
  }, [personas, busqueda, soloActivas, soloPocaActividad, horasPorPersona]);

  async function manejarArchivo(file) {
    if (!file) return;
    setProcesando(true);
    setMensaje(null);
    try {
      const buffer = await file.arrayBuffer();
      const lista = parsearReportePersonas(buffer);
      const { insertados } = await insertarPersonasDesdeExcel(lista);
      setMensaje({ tipo: 'ok', texto: `Se guardaron ${insertados} personas del archivo. Las que ya existían se actualizaron con su código y rol más reciente.` });
      await cargar();
    } catch (e) {
      setMensaje({ tipo: 'err', texto: `Error procesando el archivo: ${e.message}` });
    } finally {
      setProcesando(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function agregarManual() {
    if (!nuevoId || !nuevoNombre) {
      setMensaje({ tipo: 'err', texto: 'Código y nombre son obligatorios.' });
      return;
    }
    setProcesando(true);
    setMensaje(null);
    try {
      await agregarPersonaManual({ id: Number(nuevoId), nombre: nuevoNombre, codigo_empleado: nuevoCodigoEmp, rol: nuevoRol });
      setMensaje({ tipo: 'ok', texto: `${nuevoNombre} agregado(a) correctamente.` });
      setNuevoId(''); setNuevoNombre(''); setNuevoCodigoEmp(''); setNuevoRol('');
      setMostrarFormManual(false);
      await cargar();
    } catch (e) {
      setMensaje({ tipo: 'err', texto: e.message });
    } finally {
      setProcesando(false);
    }
  }

  function iniciarEdicion(p) {
    setEditandoId(p.id);
    setBorrador({ nombre: p.nombre, codigo_empleado: p.codigo_empleado || '', rol: p.rol || '' });
  }
  async function guardarEdicion(id) {
    try {
      await actualizarPersonaModulo(id, borrador);
      setEditandoId(null);
      await cargar();
    } catch (e) {
      setMensaje({ tipo: 'err', texto: e.message });
    }
  }
  async function toggleActivo(p) {
    try {
      await cambiarActivoPersona(p.id, !p.activo);
      await cargar();
    } catch (e) {
      setMensaje({ tipo: 'err', texto: e.message });
    }
  }

  return (
    <>
      <PageHeader title="Personas" subtitle="Catálogo de colaboradores — no incluye rendimientos, solo el registro de personas y sus códigos." />
      <div className="page">
        {puedeModificar && (
          <section className="step-panel">
            <h3><i className="fa-solid fa-file-arrow-up"></i> Cargar Excel de Activos</h3>
            <p style={{ fontSize: 12.5, color: 'var(--gray)', marginBottom: 12 }}>
              Sube el reporte de "Activos Boncheo" (columnas Mesa, Nombre, Emp.Cod, Rol). Se guardan o actualizan todas las personas del archivo automáticamente.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" disabled={procesando}
                onChange={e => manejarArchivo(e.target.files?.[0])} />
              <button className="btn-secondary" onClick={() => setMostrarFormManual(m => !m)}>
                <i className="fa-solid fa-user-plus"></i> Agregar persona manualmente
              </button>
            </div>

            {mostrarFormManual && (
              <div className="form-row" style={{ gridTemplateColumns: '1fr 2fr 1fr 1fr auto', marginTop: 14 }}>
                <div><label>Código (Mesa)</label><input type="number" value={nuevoId} onChange={e => setNuevoId(e.target.value)} /></div>
                <div><label>Nombre completo</label><input type="text" value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} /></div>
                <div><label>Emp.Cod (opcional)</label><input type="text" value={nuevoCodigoEmp} onChange={e => setNuevoCodigoEmp(e.target.value)} /></div>
                <div><label>Rol (opcional)</label><input type="text" value={nuevoRol} onChange={e => setNuevoRol(e.target.value)} /></div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button className="btn-primary" disabled={procesando} onClick={agregarManual}>
                    <i className="fa-solid fa-check"></i> Guardar
                  </button>
                </div>
              </div>
            )}

            {mensaje && <div className={`alert ${mensaje.tipo === 'ok' ? 'ok' : 'err'}`} style={{ marginTop: 14 }}>
              <i className={`fa-solid ${mensaje.tipo === 'ok' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
              {mensaje.texto}
            </div>}
          </section>
        )}

        <section className="cards">
          <div className="card"><div className="icon"><i className="fa-solid fa-users"></i></div>
            <div><span>Total Personas</span><h2>{personas.length}</h2><small>en el catálogo</small></div></div>
          <div className="card acento-azul"><div className="icon"><i className="fa-solid fa-user-check"></i></div>
            <div><span>Activas</span><h2>{personas.filter(p => p.activo).length}</h2><small>disponibles para asignar</small></div></div>
          <div className="card acento-rojo"><div className="icon"><i className="fa-solid fa-user-slash"></i></div>
            <div><span>Inactivas</span><h2>{personas.filter(p => !p.activo).length}</h2><small>desactivadas</small></div></div>
        </section>

        <section className="filters">
          <div className="search">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input type="text" placeholder="Buscar por nombre o código..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--gray)' }}>
            <input type="checkbox" checked={soloActivas} onChange={e => setSoloActivas(e.target.checked)} />
            Solo mostrar activas
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--gray)' }} title="Menos de 10 horas trabajadas en todo el histórico">
            <input type="checkbox" checked={soloPocaActividad} onChange={e => setSoloPocaActividad(e.target.checked)} />
            Solo poca actividad (&lt; {UMBRAL_POCA_ACTIVIDAD_HORAS} h en total)
          </label>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--gray)' }}>
            {cargando ? 'Cargando...' : `${personasFiltradas.length} de ${personas.length}`}
          </span>
        </section>

        <div className="alert-inline">
          <i className="fa-solid fa-circle-info"></i>
          Desactivar una persona <strong>no borra sus registros del Histórico</strong> — los tallos que ya procesó siguen contando igual en los totales semanales y mensuales. Solo deja de aparecer como opción para asignaciones nuevas.
        </div>

        <section className="table-panel">
          <div className="table-scroll">
            <table>
              <thead><tr><th>Código</th><th>Nombre</th><th>Emp.Cod</th><th>Rol</th><th>Horas trabajadas</th><th>Estado</th>{puedeModificar && <th>Acciones</th>}</tr></thead>
              <tbody>
                {cargando && <tr><td colSpan={7}><div className="empty-state">Cargando...</div></td></tr>}
                {!cargando && personasFiltradas.length === 0 && <tr><td colSpan={7}><div className="empty-state"><i className="fa-solid fa-users"></i>Sin personas para este filtro. Sube el Excel de Activos para empezar.</div></td></tr>}
                {personasFiltradas.map(p => {
                  const editando = editandoId === p.id;
                  return (
                    <tr key={p.id}>
                      <td>{p.id}</td>
                      {editando ? (
                        <>
                          <td><input type="text" value={borrador.nombre} onChange={e => setBorrador(b => ({ ...b, nombre: e.target.value }))} /></td>
                          <td><input type="text" value={borrador.codigo_empleado} onChange={e => setBorrador(b => ({ ...b, codigo_empleado: e.target.value }))} /></td>
                          <td><input type="text" value={borrador.rol} onChange={e => setBorrador(b => ({ ...b, rol: e.target.value }))} /></td>
                        </>
                      ) : (
                        <>
                          <td>{p.nombre}</td>
                          <td>{p.codigo_empleado || '—'}</td>
                          <td>{p.rol || '—'}</td>
                        </>
                      )}
                      <td>
                        {(horasPorPersona.get(p.id) || 0) < UMBRAL_POCA_ACTIVIDAD_HORAS
                          ? <span className="badge-poco-tiempo"><i className="fa-solid fa-triangle-exclamation"></i> {(horasPorPersona.get(p.id) || 0)} h</span>
                          : <span>{horasPorPersona.get(p.id) || 0} h</span>}
                      </td>
                      <td><span className={`status ${p.activo ? 'success' : 'danger'}`}>{p.activo ? 'Activa' : 'Inactiva'}</span></td>
                      {puedeModificar && (
                        <td>
                          {editando ? (
                            <>
                              <button title="Guardar" onClick={() => guardarEdicion(p.id)}><i className="fa-solid fa-check"></i></button>
                              <button title="Cancelar" onClick={() => setEditandoId(null)}><i className="fa-solid fa-xmark"></i></button>
                            </>
                          ) : (
                            <>
                              <button title="Editar" onClick={() => iniciarEdicion(p)}><i className="fa-solid fa-pen"></i></button>
                              <button title={p.activo ? 'Desactivar' : 'Activar'} onClick={() => toggleActivo(p)}>
                                <i className={`fa-solid ${p.activo ? 'fa-user-slash' : 'fa-user-check'}`}></i>
                              </button>
                            </>
                          )}
                        </td>
                      )}
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
