import { useRespaldoAutomatico } from '../lib/useRespaldoAutomatico';
import { createContext, Suspense, useContext, useEffect, useState } from 'react';
import { activarMicroInteracciones } from '../lib/microInteracciones';
import { Outlet, useLocation } from 'react-router-dom';
import ErrorBoundary from './ErrorBoundary';
import Sidebar from './Sidebar';
import PieLegal from './PieLegal';
import PaletaComandos from './PaletaComandos';
import BarraRuta from './BarraRuta';
import Toasts from './Toasts';
import VolverArriba from './VolverArriba';
import AtajosTeclado from './AtajosTeclado';
import Bienvenida from './Bienvenida';
import BannerConexion from './BannerConexion';
import { precargar, precargarEnSegundoPlano } from '../lib/paginas';

/** Mientras llega la pantalla (casi siempre ya precargada) se ve un esqueleto: el menú y la barra no se mueven. */
function PantallaCargando() {
  return <div className="page pc" aria-busy="true" aria-label="Cargando"><div className="pc-barra"></div><div className="pc-fila"><i></i><i></i><i></i></div><div className="pc-bloque"></div><div className="pc-bloque pc-corto"></div></div>;
}
import CapaAmbiente from './efectos/CapaAmbiente';
import PanelEfectos from './efectos/PanelEfectos';
import { activarInteraccionesVivas } from '../lib/interaccionesVivas';
const MenuContext = createContext(() => {});
export function useMenuToggle() {
  return useContext(MenuContext);
}
export default function Layout() {
  useEffect(() => {                                                                 // precarga: al acercarse a un enlace y, en ratos libres, las pantallas más usadas
    const cerca = e => { const a = e.target?.closest?.('a[href^="/"]'); if (a) precargar(a.getAttribute('href')); };
    document.addEventListener('pointerover', cerca, { passive: true }); document.addEventListener('touchstart', cerca, { passive: true });
    const parar = precargarEnSegundoPlano();
    return () => { document.removeEventListener('pointerover', cerca); document.removeEventListener('touchstart', cerca); parar(); };
  }, []);
  const [recarga, setRecarga] = useState(0);                                    // al volver el internet se vuelve a pedir lo que se estaba viendo
  useEffect(() => { const f = () => setRecarga(r => r + 1); window.addEventListener('tm-conexion-restablecida', f); return () => window.removeEventListener('tm-conexion-restablecida', f); }, []);
  useRespaldoAutomatico();                       // copia mensual automática (solo si quien abre la app es administrador)
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => activarMicroInteracciones(), []);
  useEffect(() => activarInteraccionesVivas(), []);
  return <MenuContext.Provider value={() => setOpen(o => !o)}>
      <div className={`overlay ${open ? 'visible' : ''}`} onClick={() => setOpen(false)} />
      <CapaAmbiente />
      <BarraRuta />
      <div className="barra-estado" aria-hidden="true" />
      <Toasts />
      <VolverArriba />
      <PaletaComandos />
      <AtajosTeclado />
      <Bienvenida />
      <BannerConexion />
      <PanelEfectos />
      <Sidebar open={open} onNavigate={() => setOpen(false)} onClose={() => setOpen(false)} />
      <main className="main">
        <ErrorBoundary claveReinicio={pathname}><Suspense fallback={<PantallaCargando />}><Outlet key={recarga} /></Suspense></ErrorBoundary>
        <PieLegal />
      </main>
    </MenuContext.Provider>;
}
