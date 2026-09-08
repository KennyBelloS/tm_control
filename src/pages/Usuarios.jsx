import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { ROLES, ROL_LABEL, listarPerfiles, crearUsuario, cambiarEstadoPerfil, cambiarRolPerfil } from '../lib/roles';
export default function Usuarios() {
  const [perfiles, setPerfiles] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState('formador');
  const [esAdmin, setEsAdmin] = useState(false);
  const [usuario, setUsuario] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [creando, setCreando] = useState(false);
  async function cargar() {
    setCargando(true);
    try {
      setPerfiles(await listarPerfiles());
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }
  useEffect(() => {
    cargar();
  }, []);
  async function crear(e) {
    e.preventDefault();
    setCreando(true);
    setError(null);
    setMensaje(null);
    try {
      const res = await crearUsuario({
        nombre,
        rol,
        esAdmin,
        usuario,
        email,
        password
      });
      setMensaje(`Cuenta creada: ${res.correo}`);
      setNombre('');
      setUsuario('');
      setEmail('');
      setPassword('');
      setEsAdmin(false);
      setRol('formador');
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreando(false);
    }
  }
  async function toggleActivo(p) {
    try {
      await cambiarEstadoPerfil(p.id, !p.activo);
      await cargar();
    } catch (e) {
      setError(e.message);
    }
  }
  async function cambiarRol(p, nuevoRol) {
    try {
      await cambiarRolPerfil(p.id, nuevoRol);
      await cargar();
    } catch (e) {
      setError(e.message);
    }
  }
  return <>
      <PageHeader title="Usuarios" subtitle="Crea cuentas y asigna roles. Solo el Administrador entra con correo; el resto entra con usuario y contraseña." />
      <div className="page">
        {error && <div className="alert err"><i className="fa-solid fa-circle-exclamation"></i> {error}</div>}
        {mensaje && <div className="alert ok"><i className="fa-solid fa-circle-check"></i> {mensaje}</div>}

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2><i className="fa-solid fa-user-plus" style={{
                color: 'var(--primary)',
                marginRight: 8
              }}></i>Crear nueva cuenta</h2>
              <p>El Administrador entra con correo real. Los demás roles entran con un usuario y contraseña que tú defines aquí.</p>
            </div>
          </div>
          <form onSubmit={crear} style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 14
        }}>
            <div className="form-row" style={{
            maxWidth: 640
          }}>
              <div>
                <label>Nombre completo</label>
                <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required />
              </div>
              <div>
                <label>Rol</label>
                <select value={rol} onChange={e => {
                setRol(e.target.value);
                setEsAdmin(e.target.value === 'administrador');
              }}>
                  {ROLES.map(r => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
                </select>
              </div>
            </div>

            {esAdmin ? <div className="form-row" style={{
            maxWidth: 640
          }}>
                <div>
                  <label>Correo</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="correo@empresa.com" required />
                </div>
                <div>
                  <label>Contraseña</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                </div>
              </div> : <div className="form-row" style={{
            maxWidth: 640
          }}>
                <div>
                  <label>Usuario</label>
                  <input type="text" value={usuario} onChange={e => setUsuario(e.target.value)} placeholder="ej. jperez" required />
                </div>
                <div>
                  <label>Contraseña</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                </div>
              </div>}

            <div>
              <button type="submit" className="btn-primary" disabled={creando}>
                <i className="fa-solid fa-user-plus"></i> {creando ? 'Creando...' : 'Crear cuenta'}
              </button>
            </div>
          </form>
        </section>

        <section className="table-panel">
          <div className="panel-header">
            <div>
              <h2>Cuentas existentes <span className="badge-count">{perfiles.length}</span></h2>
              <p>Cambia el rol o desactiva el acceso de cualquier cuenta.</p>
            </div>
          </div>
          <div className="table-scroll">
            <table>
              <thead><tr><th>Nombre</th><th>Rol</th><th>Estado</th><th>Creado</th><th>Acciones</th></tr></thead>
              <tbody>
                {cargando && <tr><td colSpan={5}><div className="empty-state">Cargando...</div></td></tr>}
                {!cargando && perfiles.length === 0 && <tr><td colSpan={5}><div className="empty-state"><i className="fa-solid fa-users"></i>Todavía no hay cuentas creadas.</div></td></tr>}
                {perfiles.map(p => <tr key={p.id}>
                    <td>{p.nombre}</td>
                    <td>
                      <select value={p.rol} onChange={e => cambiarRol(p, e.target.value)} style={{
                    padding: '5px 8px',
                    borderRadius: 8,
                    border: '1px solid var(--border)'
                  }}>
                        {ROLES.map(r => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
                      </select>
                    </td>
                    <td><span className={`status ${p.activo ? 'success' : 'danger'}`}>{p.activo ? 'Activo' : 'Desactivado'}</span></td>
                    <td>{new Date(p.creado_en).toLocaleDateString('es-CO')}</td>
                    <td>
                      <button title={p.activo ? 'Desactivar' : 'Activar'} onClick={() => toggleActivo(p)}>
                        <i className={`fa-solid ${p.activo ? 'fa-user-slash' : 'fa-user-check'}`}></i>
                      </button>
                    </td>
                  </tr>)}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>;
}
