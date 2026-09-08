import { NavLink } from 'react-router-dom';
import logo from '../assets/logo-icon.png';
import { puedeVer } from '../lib/roles';
import { useSesion } from '../lib/useSesion';

const MODULOS_PRINCIPALES = [
  { to: '/', icon: 'fa-house', label: 'Dashboard', end: true, key: 'dashboard' },
  { to: '/personas', icon: 'fa-users', label: 'Personas', key: 'personas' },
  { to: '/rendimientos', icon: 'fa-leaf', label: 'Rendimientos', key: 'rendimientos' },
  { to: '/reportes', icon: 'fa-chart-column', label: 'Reportes', key: 'reportes' },
  { to: '/ranking', icon: 'fa-ranking-star', label: 'Ranking', key: 'ranking' },
  { to: '/lineas', icon: 'fa-warehouse', label: 'Líneas', key: 'lineas' },
];

const MODULOS_GESTION = [
  { to: '/indirectos', icon: 'fa-user-gear', label: 'Indirectos', key: 'indirectos' },
  { to: '/gerencia', icon: 'fa-briefcase', label: 'Gerencia', key: 'gerencia' },
  { to: '/configuracion', icon: 'fa-gear', label: 'Configuración', key: 'configuracion' },
];

const MODULOS_TECNICOS = [
  { to: '/usuarios', icon: 'fa-user-shield', label: 'Usuarios', key: 'usuarios' },
  { to: '/auditoria', icon: 'fa-clipboard-list', label: 'Auditoría', key: 'auditoria' },
];

export default function Sidebar({ open, onNavigate, onClose }) {
  const { rol } = useSesion();
  const principales = MODULOS_PRINCIPALES.filter(m => puedeVer(rol, m.key));
  const gestion = MODULOS_GESTION.filter(m => puedeVer(rol, m.key));
  const tecnicos = MODULOS_TECNICOS.filter(m => puedeVer(rol, m.key));

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="logo">
        <img src={logo} alt="Falcon Farms · Torremolinos" />
        <div>
          <h2>TORREMOLINOS</h2>
          <span>TMCONTROL</span>
        </div>
        <button className="sidebar-close" onClick={onClose} aria-label="Cerrar menú">
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>
      <nav>
        <ul>
          {principales.map(m => (
            <li key={m.to} className="nav-item">
              <NavLink to={m.to} end={m.end} onClick={onNavigate}
                className={({ isActive }) => isActive ? 'nav-active' : ''}>
                <i className={`fa-solid ${m.icon}`}></i>{m.label}
              </NavLink>
            </li>
          ))}
        </ul>

        {gestion.length > 0 && (
          <>
            <p className="nav-group-label">Gestión</p>
            <ul>
              {gestion.map(m => (
                <li key={m.to} className="nav-item">
                  <NavLink to={m.to} onClick={onNavigate}
                    className={({ isActive }) => isActive ? 'nav-active' : ''}>
                    <i className={`fa-solid ${m.icon}`}></i>{m.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </>
        )}

        {tecnicos.length > 0 && (
          <>
            <p className="nav-group-label">Técnico</p>
            <ul>
              {tecnicos.map(m => (
                <li key={m.to} className="nav-item">
                  <NavLink to={m.to} onClick={onNavigate}
                    className={({ isActive }) => isActive ? 'nav-active' : ''}>
                    <i className={`fa-solid ${m.icon}`}></i>{m.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </>
        )}
      </nav>
    </aside>
  );
}
