import { useState } from 'react';
import logo from '../assets/logo-icon.png';
import { ROLES, ROL_LABEL, setSesion } from '../lib/roles';

export default function Login() {
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState('administrador');

  function entrar(e) {
    e.preventDefault();
    setSesion({ nombre: nombre.trim() || 'Usuario', rol });
  }

  return (
    <div className="login-pantalla">
      <form className="login-card" onSubmit={entrar}>
        <img src={logo} alt="Falcon Farms · Torremolinos" className="login-logo" />
        <h1>TORREMOLINOS</h1>
        <p className="login-subtitulo">TMCONTROL</p>

        <label>Tu nombre</label>
        <input type="text" placeholder="Ej. Luisa Ortega" value={nombre} onChange={e => setNombre(e.target.value)} />

        <label>Rol</label>
        <select value={rol} onChange={e => setRol(e.target.value)}>
          {ROLES.map(r => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
        </select>

        <button type="submit" className="btn-primary" style={{ justifyContent: 'center', marginTop: 6 }}>
          <i className="fa-solid fa-right-to-bracket"></i> Entrar
        </button>

        <p className="login-nota">
          Selector temporal mientras se conecta el login real (Usuarios). El sistema recuerda tu elección en este navegador.
        </p>
      </form>
    </div>
  );
}
