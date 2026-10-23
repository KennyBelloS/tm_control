import { useRespaldoAutomatico } from '../lib/useRespaldoAutomatico';
import { createContext, useContext, useEffect, useState } from 'react';
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
import CapaAmbiente from './efectos/CapaAmbiente';
import PanelEfectos from './efectos/PanelEfectos';
import { activarInteraccionesVivas } from '../lib/interaccionesVivas';
const MenuContext = createContext(() => {});
export function useMenuToggle() {
  return useContext(MenuContext);
}
export default function Layout() {
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
      <PanelEfectos />
      <Sidebar open={open} onNavigate={() => setOpen(false)} onClose={() => setOpen(false)} />
      <main className="main">
        <ErrorBoundary claveReinicio={pathname}><Outlet /></ErrorBoundary>
        <PieLegal />
      </main>
    </MenuContext.Provider>;
}
