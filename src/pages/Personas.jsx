import { useEffect, useMemo, useRef, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { useSesion } from '../lib/useSesion';
import { puedeEditar } from '../lib/roles';
import { listarPersonasModulo, insertarPersonasDesdeExcel, agregarPersonaManual, actualizarPersonaModulo, cambiarActivoPersona, getHorasTotalesPorPersona } from '../lib/db';
import { parsearReportePersonas } from '../lib/excel';
import { esFilaMesaLegada, coincidePersona } from '../lib/personasUtil';

const UMBRAL_POCA_ACTIVIDAD_HORAS = 10;

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
  const [nuevoEmpCod, setNuevoEmpCod] = useState('');
  const [nuevaMesa, setNuevaMesa] = useState('');
  const [nuevoNombre, setNuevoNombre] = useState('');
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

  // Filas guardadas por una versión anterior con la mesa como id: se esconden (las corrige el SQL).
  const legadas = useMemo(() => personas.filter(esFilaMesaLegada), [personas]);
  const vigentes = useMemo(() => personas.filter(p => !esFilaMesaLegada(p)), [personas]);

  const personasFiltradas = useMemo(() => {
    let base = vigentes;
    if (soloActivas) base = base.filter(p => p.activo);
    if (soloPocaActividad) base = base.filter(p => (horasPorPersona.get(p.id) || 0) < UMBRAL_POCA_ACTIVIDAD_HORAS);
    if (busqueda) base = base.filter(p => coincidePersona(p, busqueda) || (p.codigo_empleado || '').includes(busqueda.trim()));
    return [...base].sort((a, b) => (horasPorPersona.get(a.id) || 0) - (horasPorPersona.get(b.id) || 0));
  }, [vigentes, busqueda, soloActivas, soloPocaActividad, horasPorPersona]);

  async function manejarArchivo(file) {
    if (!file) return;
    setProcesando(true);
    setMensaje(null);
    try {
      const lista = parsearReportePersonas(await file.arrayBuffer());
      const { insertados } = await insertarPersonasDesdeExcel(lista);
      const aviso = lista.sinCodigo ? ` (${lista.sinCodigo} fila(s) sin Emp.Cod se ignoraron)` : '';
      setMensaje({ tipo: 'ok', texto: `Se guardaron ${insertados} personas${aviso}. Cada una queda identificada por su Emp.Cod, igual que en el boncheo, y la mesa es su código.` });
      await cargar();
    } catch (e) {
      setMensaje({ tipo: 'err', texto: `Error procesando el archivo: ${e.message}` });
    } finally {
      setProcesando(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function agregarManual() {
    const id = Number(nuevoEmpCod);
    if (!Number.isInteger(id) || id <= 0 || !nuevoNombre.trim()) {
      setMensaje({ tipo: 'err', texto: 'El Emp.Cod (número) y el nombre son obligatorios.' });
      return;
    }
    setProcesando(true);
    setMensaje(null);
    try {
      await agregarPersonaManual({ id, nombre: nuevoNombre.trim(), mesa: nuevaMesa ? Number(nuevaMesa) : null, rol: nuevoRol.trim() });
      setMensaje({ tipo: 'ok', texto: `${nuevoNombre} agregado(a) correctamente.` });
      setNuevoEmpCod(''); setNuevaMesa(''); setNuevoNombre(''); setNuevoRol('');
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
    setBorrador({ nombre: p.nombre, mesa: p.mesa ?? '', rol: p.rol || '' });
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
      <PageHeader title="Personas" subtitle="Catálogo de colaboradores — el Emp.Cod los une con el boncheo, la mesa es su código." />
      <div className="page">
        {legadas.length > 0 && (
          <div className="alert warn">
            <i className="fa-solid fa-triangle-exclamation"></i>
            <span>
              Hay <strong>{legadas.length} persona(s) guardada(s) con la mesa como identificador</strong> (una versión anterior). No se muestran aquí
              para no duplicarlas. Corre en Supabase el SQL de corrección de Personas para unirlas con sus rendimientos y asignaciones.
            </span>
          </div>
        )}

        {puedeModificar && (
          <section className="step-panel">
            <h3><i className="fa-solid fa-file-arrow-up"></i> Cargar Excel de Activos</h3>
            <p style={{ fontSize: 12.5, color: 'var(--gray)', marginBottom: 12 }}>
              Sube el reporte de "Activos Boncheo" (columnas Mesa, Nombre, Emp.Cod, Rol). Cada persona se guarda por su <strong>Emp.Cod</strong> —el mismo
              código que usa el boncheo— y la <strong>mesa</strong> queda como su código visible. Si ya existe, se actualiza.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" disabled={procesando} onChange={e => manejarArchivo(e.target.files?.[0])} />
              <button className="btn-secondary" onClick={() => setMostrarFormManual(m => !m)}>
                <i className="fa-solid fa-user-plus"></i> Agregar persona manualmente
              </button>
            </div>

            {mostrarFormManual && (
              <div className="form-row personas-form-manual">
                <div><label>Emp.Cod *</label><input type="number" value={nuevoEmpCod} onChange={e => setNuevoEmpCod(e.target.value)} placeholder="ej. 94460" /></div>
                <div><label>Mesa (código)</label><input type="number" value={nuevaMesa} onChange={e => setNuevaMesa(e.target.value)} placeholder="ej. 4" /></div>
                <div><label>Nombre completo *</label><input type="text" value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} /></div>
                <div><label>Rol</label><input type="text" value={nuevoRol} onChange={e => setNuevoRol(e.target.value)} placeholder="Bonchador" /></div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button className="btn-primary" disabled={procesando} onClick={agregarManual}><i className="fa-solid fa-check"></i> Guardar</button>
                </div>
              </div>
            )}

            {mensaje && <div className={`alert ${mensaje.tipo === 'ok' ? 'ok' : 'err'}`} style={{ marginTop: 14 }}>
              <i className={`fa-solid ${mensaje.tipo === 'ok' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i> {mensaje.texto}
            </div>}
          </section>
        )}
        {!puedeModificar && mensaje && <div className="alert err">{mensaje.texto}</div>}

        <section className="cards">
          <div className="card"><div className="icon"><i className="fa-solid fa-users"></i></div>
            <div><span>Total Personas</span><h2>{vigentes.length}</h2><small>en el catálogo</small></div></div>
          <div className="card acento-azul"><div className="icon"><i className="fa-solid fa-user-check"></i></div>
            <div><span>Activas</span><h2>{vigentes.filter(p => p.activo).length}</h2><small>disponibles para asignar</small></div></div>
          <div className="card acento-rojo"><div className="icon"><i className="fa-solid fa-user-slash"></i></div>
            <div><span>Inactivas</span><h2>{vigentes.filter(p => !p.activo).length}</h2><small>desactivadas</small></div></div>
        </section>

        <section className="filters">
          <div className="search">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input type="text" placeholder="Buscar por nombre, mesa o Emp.Cod..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--gray)' }}>
            <input type="checkbox" checked={soloActivas} onChange={e => setSoloActivas(e.target.checked)} /> Solo activas
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--gray)' }} title="Menos de 10 horas trabajadas en todo el histórico">
            <input type="checkbox" checked={soloPocaActividad} onChange={e => setSoloPocaActividad(e.target.checked)} /> Poca actividad (&lt; {UMBRAL_POCA_ACTIVIDAD_HORAS} h)
          </label>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--gray)' }}>
            {cargando ? 'Cargando...' : `${personasFiltradas.length} de ${vigentes.length}`}
          </span>
        </section>

        <div className="alert-inline">
          <i className="fa-solid fa-circle-info"></i>
          Desactivar una persona <strong>no borra sus registros del Histórico</strong>: sus tallos siguen contando en los totales semanales y mensuales. Solo deja de aparecer para asignaciones nuevas.
        </div>

        <section className="table-panel">
          <div className="table-scroll">
            <table>
              <thead><tr><th>Código (mesa)</th><th>Nombre</th><th>Emp.Cod</th><th>Rol</th><th>Horas trabajadas</th><th>Estado</th>{puedeModificar && <th>Acciones</th>}</tr></thead>
              <tbody>
                {cargando && <tr><td colSpan={7}><div className="empty-state">Cargando...</div></td></tr>}
                {!cargando && personasFiltradas.length === 0 && <tr><td colSpan={7}><div className="empty-state"><i className="fa-solid fa-users"></i>Sin personas para este filtro. Sube el Excel de Activos para empezar.</div></td></tr>}
                {personasFiltradas.map(p => {
                  const editando = editandoId === p.id;
                  const horas = horasPorPersona.get(p.id) || 0;
                  return (
                    <tr key={p.id}>
                      {editando
                        ? <td><input type="number" style={{ width: 80 }} value={borrador.mesa} onChange={e => setBorrador(b => ({ ...b, mesa: e.target.value }))} /></td>
                        : <td><strong>{p.mesa ?? '—'}</strong></td>}
                      {editando
                        ? <td><input type="text" value={borrador.nombre} onChange={e => setBorrador(b => ({ ...b, nombre: e.target.value }))} /></td>
                        : <td>{p.nombre}</td>}
                      <td>{p.id}</td>
                      {editando
                        ? <td><input type="text" value={borrador.rol} onChange={e => setBorrador(b => ({ ...b, rol: e.target.value }))} /></td>
                        : <td>{p.rol || '—'}</td>}
                      <td>{horas < UMBRAL_POCA_ACTIVIDAD_HORAS
                        ? <span className="badge-poco-tiempo"><i className="fa-solid fa-triangle-exclamation"></i> {horas} h</span>
                        : <span>{horas} h</span>}</td>
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
