import { useMenuToggle } from './Layout';
import { useSesion } from '../lib/useSesion';
import { ROL_LABEL, cerrarSesion } from '../lib/roles';
import NotificationBell from './NotificationBell';
function fechaHoy() {
  return new Date().toLocaleDateString('es-CO');
}
export default function PageHeader({
  title,
  subtitle,
  children
}) {
  const toggleMenu = useMenuToggle();
  const {
    sesion
  } = useSesion();
  return <header className="topbar">
      <div className="topbar-title-group">
        <button className="menu-toggle" onClick={toggleMenu} aria-label="Abrir menú">
          <i className="fa-solid fa-bars"></i>
        </button>
        <div>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      <div className="topbar-right">
        {children}
        {sesion && <div className="topbar-identidad">
            <span className="topbar-fecha">{fechaHoy()}</span>
            <span className="topbar-usuario">{sesion.nombre} · {ROL_LABEL[sesion.rol] || sesion.rol}</span>
          </div>}
        <NotificationBell />
        <button className="btn-secondary" onClick={() => {
        if (confirm('¿Cerrar sesión?')) cerrarSesion();
      }}>
          <i className="fa-solid fa-right-from-bracket"></i> Cerrar sesión
        </button>
      </div>
    </header>;
}
