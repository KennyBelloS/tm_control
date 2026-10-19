import { useLocation } from 'react-router-dom';
import { useMenuToggle } from './Layout';
import { MODULOS_PRINCIPALES, MODULOS_GESTION, MODULOS_TECNICOS } from './Sidebar';
import EnVivo from './EnVivo';
import NotificationBell from './NotificationBell';
import MenuUsuario from './MenuUsuario';
import FiestaChip from './efectos/FiestaChip';


/**
 * Encabezado de cada pantalla, en UNA fila: grupo y título (con el subtítulo si cabe), los botones de la pantalla,
 * el indicador en vivo, la búsqueda, la campana y el menú de la persona (usuario, tema, densidad, atajos, cerrar sesión).
 * En celular los botones de la pantalla bajan a su propia fila para que nada se corte.
 */
export default function PageHeader({ title, subtitle, children }) {
  const toggleMenu = useMenuToggle();
  const hayAcciones = !!children;
  const { pathname } = useLocation();
  // Dónde estoy: "Operación › Rendimientos" (el grupo del menú y el módulo), arriba del título
  const ubicacion = (() => {
    for (const [grupo, lista] of [['Operación', MODULOS_PRINCIPALES], ['Gestión', MODULOS_GESTION], ['Técnico', MODULOS_TECNICOS]]) {
      const m = lista.find(x => (x.end ? pathname === x.to : pathname === x.to || pathname.startsWith(`${x.to}/`)));
      if (m) return { grupo, modulo: m.label };
    }
    return null;
  })();
  return (
    <header className={`topbar ${hayAcciones ? 'topbar-con-acciones' : ''}`}>
      <div className="topbar-title-group">
        <button className="menu-toggle" onClick={toggleMenu} aria-label="Abrir menú">
          <i className="fa-solid fa-bars"></i>
        </button>
        <div className="topbar-titulos">
          {ubicacion && <span className="topbar-grupo">{ubicacion.grupo}</span>}
          <h1>{title}</h1>
          {subtitle && <p className="topbar-sub" title={subtitle}>{subtitle}</p>}
        </div>
      </div>

      {hayAcciones && <div className="topbar-acciones">{children}</div>}

      <div className="topbar-herramientas">
        <FiestaChip />
        <EnVivo />
        <button className="cab-icono topbar-buscar" onClick={() => window.dispatchEvent(new Event('tm-abrir-paleta'))} title="Búsqueda rápida (Ctrl + K  o  /)" aria-label="Búsqueda rápida">
          <i className="fa-solid fa-magnifying-glass"></i>
        </button>
        <NotificationBell />
        <MenuUsuario />
      </div>
    </header>
  );
}
