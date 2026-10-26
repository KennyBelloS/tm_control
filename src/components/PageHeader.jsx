import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useMenuToggle } from './Layout';
import { MODULOS_PRINCIPALES, MODULOS_GESTION, MODULOS_TECNICOS } from './Sidebar';
import EnVivo from './EnVivo';
import NotificationBell from './NotificationBell';
import MenuUsuario from './MenuUsuario';
import FiestaChip from './efectos/FiestaChip';
import logoUrl from '../assets/logo-icon.png';


/** ¿Es una pantalla de celular o tablet pequeña? (el menú de tres líneas y la barra compacta). */
function useMovil() {
  const q = '(max-width:1023px)';
  const [m, setM] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(q).matches);
  useEffect(() => { const mq = matchMedia(q), f = () => setM(mq.matches); mq.addEventListener?.('change', f); f(); return () => mq.removeEventListener?.('change', f); }, []);
  return m;
}

/**
 * Encabezado de cada pantalla, en UNA fila: grupo y título (con el subtítulo si cabe), los botones de la pantalla,
 * el indicador en vivo, la búsqueda, la campana y el menú de la persona (usuario, tema, densidad, atajos, cerrar sesión).
 * En celular la barra fija es UNA sola fila (☰ siempre visible, título, búsqueda, campana y avatar) y los botones de la pantalla
 * van en una fila normal debajo (no fija), para que nunca tapen el contenido.
 */
export default function PageHeader({ title, subtitle, children }) {
  const toggleMenu = useMenuToggle();
  const hayAcciones = !!children, movil = useMovil();
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
    <>
    <header className={`topbar ${hayAcciones ? 'topbar-con-acciones' : ''}`}>
      <div className="topbar-title-group">
        <button className="menu-toggle" onClick={toggleMenu} aria-label="Abrir menú">
          <i className="fa-solid fa-bars"></i>
        </button>
        <img className="topbar-logo" src={logoUrl} alt="Torremolinos" width="36" height="36" />
        <div className="topbar-titulos">
          {ubicacion && <span className="topbar-grupo">{ubicacion.grupo}</span>}
          <h1>{title}</h1>
          {subtitle && <p className="topbar-sub" title={subtitle}>{subtitle}</p>}
        </div>
      </div>

      {hayAcciones && !movil && <div className="topbar-acciones">{children}</div>}

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
    {hayAcciones && movil && <div className="acciones-movil">{children}</div>}
    </>
  );
}
