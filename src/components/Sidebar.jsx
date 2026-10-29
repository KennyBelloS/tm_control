import { NavLink, useLocation } from 'react-router-dom';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { alternarMenu } from '../lib/ajustesUI';
import logo from '../assets/logo-icon.png';
import { puedeVer } from '../lib/roles';
import { useSesion } from '../lib/useSesion';
import { esNuevaFuncion } from '../lib/novedades';
// Insignia "Nuevo": se muestra hasta que la persona entra una vez al módulo (se recuerda en el navegador).
const CLAVE_VISTOS = 'tm_modulos_vistos';
const yaVisto = k => { try { return (JSON.parse(localStorage.getItem(CLAVE_VISTOS)) || []).includes(k); } catch { return false; } };
const marcarVisto = k => { try { const v = new Set(JSON.parse(localStorage.getItem(CLAVE_VISTOS)) || []); v.add(k); localStorage.setItem(CLAVE_VISTOS, JSON.stringify([...v])); } catch { /* sin almacenamiento */ } };

export const MODULOS_PRINCIPALES = [{
  to: '/',
  icon: 'fa-house',
  label: 'Dashboard',
  end: true,
  key: 'dashboard'
}, {
  to: '/personas',
  icon: 'fa-users',
  label: 'Personas',
  key: 'personas'
}, {
  to: '/rendimientos',
  icon: 'fa-leaf',
  label: 'Rendimientos',
  key: 'rendimientos'
}, {
  to: '/reportes',
  icon: 'fa-chart-column',
  label: 'Reportes',
  key: 'reportes'
}, {
  to: '/ranking',
  icon: 'fa-ranking-star',
  label: 'Ranking',
  key: 'ranking'
}, {
  to: '/lineas',
  icon: 'fa-warehouse',
  label: 'Líneas',
  key: 'lineas'
}, {
  to: '/clasificacion',
  icon: 'fa-boxes-stacked',
  label: 'Clasificación',
  key: 'clasificacion'
}, {
  to: '/devoluciones',
  icon: 'fa-rotate-left',
  label: 'Devoluciones',
  key: 'devoluciones'
}, {
  to: '/colaborador',
  icon: 'fa-id-card-clip',
  label: 'TIC',
  sub: 'Tablero integrado',
  titulo: 'Tablero Integrado del Colaborador',
  key: 'colaborador',
  nuevo: true
}, {
  to: '/tableros',
  icon: 'fa-table-columns',
  label: 'Tableros',
  key: 'tableros'
}, {
  to: '/ayuda',
  icon: 'fa-circle-question',
  label: 'Cómo se usa',
  key: 'ayuda',
  nuevo: true
}];
export const MODULOS_GESTION = [{
  to: '/indirectos',
  icon: 'fa-user-gear',
  label: 'Indirectos',
  key: 'indirectos'
}, {
  to: '/gerencia',
  icon: 'fa-briefcase',
  label: 'Gerencia',
  key: 'gerencia'
}, {
  to: '/configuracion',
  icon: 'fa-gear',
  label: 'Configuración',
  key: 'configuracion'
}];
export const MODULOS_TECNICOS = [{
  to: '/usuarios',
  icon: 'fa-user-shield',
  label: 'Usuarios',
  key: 'usuarios'
}, {
  to: '/auditoria',
  icon: 'fa-clipboard-list',
  label: 'Auditoría',
  key: 'auditoria'
}, {
  to: '/seguridad',
  icon: 'fa-lock',
  label: 'Seguridad',
  key: 'seguridad'
}, {
  to: '/resumenes',
  icon: 'fa-file-lines',
  label: 'Resúmenes',
  key: 'resumenes'
}];
export default function Sidebar({
  open,
  onNavigate,
  onClose
}) {
  const {
    sesion
  } = useSesion();
  const rol = sesion?.rol;
  const principales = MODULOS_PRINCIPALES.filter(m => puedeVer(rol, m.key));
  const gestion = MODULOS_GESTION.filter(m => puedeVer(rol, m.key));
  const tecnicos = MODULOS_TECNICOS.filter(m => puedeVer(rol, m.key));
  const navRef = useRef(null);
  const { pathname } = useLocation();
  const [, refrescar] = useState(0);
  const [tip, setTip] = useState(null);                // etiqueta flotante del menú contraído (se dibuja FUERA del menú para que el desplazamiento no la corte)
  useEffect(() => { if (pathname.startsWith('/colaborador') && !yaVisto('colaborador')) { marcarVisto('colaborador'); refrescar(n => n + 1); } }, [pathname]);
  // Indicador que SE DESLIZA hasta la pantalla activa (se mide el enlace activo y se dejan las medidas como variables CSS)
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const hayMas = () => {                                // sombras que avisan que hay más módulos arriba o abajo
      nav.classList.toggle('hay-mas-arriba', nav.scrollTop > 4);
      nav.classList.toggle('hay-mas-abajo', nav.scrollTop + nav.clientHeight < nav.scrollHeight - 4);
    };
    const verActiva = () => {                             // si el menú se desplaza, la pantalla activa siempre queda a la vista
      const a = nav.querySelector('a.nav-active');
      if (!a) return;
      const n = nav.getBoundingClientRect(), r = a.getBoundingClientRect();
      if (r.top < n.top) nav.scrollTop -= (n.top - r.top) + 10;
      else if (r.bottom > n.bottom) nav.scrollTop += (r.bottom - n.bottom) + 10;
    };
    const medir = () => {
      verActiva(); hayMas();
      const a = nav.querySelector('a.nav-active');
      if (!a) { nav.style.setProperty('--ind-op', '0'); return; }
      const n = nav.getBoundingClientRect(), r = a.getBoundingClientRect();
      nav.style.setProperty('--ind-y', `${r.top - n.top + nav.scrollTop}px`);
      nav.style.setProperty('--ind-x', `${r.left - n.left}px`);
      nav.style.setProperty('--ind-w', `${r.width}px`);
      nav.style.setProperty('--ind-h', `${r.height}px`);
      nav.style.setProperty('--ind-op', '1');
    };
    medir();
    const tras = () => setTimeout(medir, 360);            // al contraer/expandir el menú se espera a que termine la animación
    window.addEventListener('tm-ajustes', tras);
    window.addEventListener('resize', medir);
    const ro = new ResizeObserver(medir);
    ro.observe(nav);
    nav.addEventListener('scroll', hayMas, { passive: true });
    return () => { window.removeEventListener('tm-ajustes', tras); window.removeEventListener('resize', medir); nav.removeEventListener('scroll', hayMas); ro.disconnect(); };
  }, [pathname, principales.length, gestion.length, tecnicos.length]);
  const mostrarTip = e => {
    if (document.documentElement.dataset.menu !== 'mini' || window.innerWidth < 1024) { if (tip) setTip(null); return; }
    const a = e.target.closest?.('a[data-tip]');
    if (!a) return;
    const r = a.getBoundingClientRect();
    setTip({ texto: a.dataset.tip, y: r.top + r.height / 2 });
  };
  return <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="logo">
        <img src={logo} alt="Falcon Farms · Torremolinos" />
        <div>
          <h2>TORREMOLINOS</h2>
          <span>TMCONTROL</span>
        </div>
        <button className="sidebar-close" onClick={onClose} aria-label="Cerrar menú">
          <i className="fa-solid fa-xmark"></i>
        </button>
        <button className="sidebar-colapsar" onClick={alternarMenu} aria-label="Contraer o expandir el menú" title="Contraer o expandir el menú  ( [ )">
          <i className="fa-solid fa-angles-left"></i>
        </button>
      </div>
      <nav ref={navRef} onMouseOver={mostrarTip} onFocus={mostrarTip} onMouseLeave={() => setTip(null)} onBlur={() => setTip(null)} onScroll={() => setTip(null)}>
        <ul>
          {principales.map(m => <li key={m.to} className="nav-item">
              <NavLink to={m.to} end={m.end} data-tip={m.titulo || m.label} onClick={onNavigate} className={({
            isActive
          }) => isActive ? 'nav-active' : ''}>
                <i className={`fa-solid ${m.icon}`}></i><span className="nav-etq">{m.label}{m.sub && <small className="nav-sub">{m.sub}</small>}</span>{esNuevaFuncion(m.key) && <em className="nav-nuevo">Nuevo</em>}
              </NavLink>
            </li>)}
        </ul>

        {gestion.length > 0 && <>
            <p className="nav-group-label">Gestión</p>
            <ul>
              {gestion.map(m => <li key={m.to} className="nav-item">
                  <NavLink to={m.to} data-tip={m.titulo || m.label} onClick={onNavigate} className={({
              isActive
            }) => isActive ? 'nav-active' : ''}>
                    <i className={`fa-solid ${m.icon}`}></i><span className="nav-etq">{m.label}{m.sub && <small className="nav-sub">{m.sub}</small>}</span>{esNuevaFuncion(m.key) && <em className="nav-nuevo">Nuevo</em>}
                  </NavLink>
                </li>)}
            </ul>
          </>}

        {tecnicos.length > 0 && <>
            <p className="nav-group-label">Técnico</p>
            <ul>
              {tecnicos.map(m => <li key={m.to} className="nav-item">
                  <NavLink to={m.to} data-tip={m.titulo || m.label} onClick={onNavigate} className={({
              isActive
            }) => isActive ? 'nav-active' : ''}>
                    <i className={`fa-solid ${m.icon}`}></i><span className="nav-etq">{m.label}{m.sub && <small className="nav-sub">{m.sub}</small>}</span>{esNuevaFuncion(m.key) && <em className="nav-nuevo">Nuevo</em>}
                  </NavLink>
                </li>)}
            </ul>
          </>}
      </nav>
    {tip && <div className="menu-tip" style={{ top: tip.y }} role="tooltip">{tip.texto}</div>}
    </aside>;
}
