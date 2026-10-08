import { useMenuToggle } from './Layout';
import { useSesion } from '../lib/useSesion';
import { ROL_LABEL, cerrarSesion } from '../lib/roles';
import NotificationBell from './NotificationBell';

function fechaHoy() {
  return new Date().toLocaleDateString('es-CO');
}
function iniciales(nombre) {
  return String(nombre || '?').trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

/**
 * Encabezado de cada pantalla.
 * - Computador: título a la izquierda; a la derecha los botones de la pantalla, la persona
 *   (avatar + nombre + rol), la campana y cerrar sesión.
 * - Celular: arriba título + campana + cerrar sesión; la persona con su rol queda debajo del
 *   título; y los botones de la pantalla bajan a su propia fila para que nada se corte.
 */
export default function PageHeader({ title, subtitle, children }) {
  const toggleMenu = useMenuToggle();
  const { sesion } = useSesion();
  const rolTexto = ROL_LABEL[sesion?.rol] || sesion?.rol;
  const hayAcciones = !!children;
  return (
    <header className={`topbar ${hayAcciones ? 'topbar-con-acciones' : ''}`}>
      <div className="topbar-title-group">
        <button className="menu-toggle" onClick={toggleMenu} aria-label="Abrir menú">
          <i className="fa-solid fa-bars"></i>
        </button>
        <div className="topbar-titulos">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
          {sesion && (
            <div className="usuario-linea-movil">
              <span className="usuario-avatar usuario-avatar-mini">{iniciales(sesion.nombre)}</span>
              <strong>{sesion.nombre}</strong>
              <span className={`rol-pill rol-${sesion.rol}`}>{rolTexto}</span>
            </div>
          )}
        </div>
      </div>

      {hayAcciones && <div className="topbar-acciones">{children}</div>}

      <div className="topbar-herramientas">
        <button className="topbar-buscar" onClick={() => window.dispatchEvent(new Event('tm-abrir-paleta'))} title="Búsqueda rápida (Ctrl + K)">
          <i className="fa-solid fa-magnifying-glass"></i><span>Buscar</span><kbd>Ctrl K</kbd>
        </button>
        {sesion && (
          <div className="usuario-chip" title={`${sesion.nombre} · ${rolTexto}`}>
            <span className="usuario-avatar">{iniciales(sesion.nombre)}</span>
            <span className="usuario-datos">
              <strong>{sesion.nombre}</strong>
              <span className="usuario-sub">
                <span className={`rol-pill rol-${sesion.rol}`}>{rolTexto}</span>
                <em>{fechaHoy()}</em>
              </span>
            </span>
          </div>
        )}
        <NotificationBell />
        <button className="btn-secondary btn-cerrar-sesion" onClick={() => { if (confirm('¿Cerrar sesión?')) cerrarSesion(); }}>
          <i className="fa-solid fa-right-from-bracket"></i> <span className="btn-texto">Cerrar sesión</span>
        </button>
      </div>
    </header>
  );
}
