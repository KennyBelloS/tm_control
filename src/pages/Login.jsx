import { useState } from 'react';
import logo from '../assets/logo-icon.png';
import PieLegal from '../components/PieLegal';
import { iniciarSesion } from '../lib/roles';
export default function Login() {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  async function entrar(e) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    try {
      await iniciarSesion(usuario, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }
  return <div className="login-pantalla">
      <form className="login-card" onSubmit={entrar}>
        <img src={logo} alt="Falcon Farms · Torremolinos" className="login-logo" />
        <h1>TORREMOLINOS</h1>
        <p className="login-subtitulo">TMCONTROL</p>

        {error && <div className="alert err" style={{
        fontSize: 12,
        marginBottom: 6
      }}><i className="fa-solid fa-circle-exclamation"></i> {error}</div>}

        <label>Usuario o correo</label>
        <input type="text" placeholder="tu.usuario o correo@empresa.com" value={usuario} onChange={e => setUsuario(e.target.value)} required />

        <label>Contraseña</label>
        <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />

        <button type="submit" className="btn-primary" disabled={cargando} style={{
        justifyContent: 'center',
        marginTop: 10
      }}>
          <i className="fa-solid fa-right-to-bracket"></i> {cargando ? 'Entrando...' : 'Entrar'}
        </button>

        <p className="login-nota">
          El Administrador entra con su correo. Ingeniero, Supervisor y Formador entran con el usuario y la contraseña que el Administrador les creó en el módulo Usuarios.
        </p>
      </form>
      <PieLegal />
    </div>;
}
