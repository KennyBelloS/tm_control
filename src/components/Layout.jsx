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
import PerfilModal from './PerfilModal';
import Festejo from './Festejo';
import { limpiarTurnoActual } from '../lib/db';
import { registrarAcceso, instalarRegistro } from '../lib/registroActividad';
import { avisar } from '../lib/avisos';
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
  const [recarga, setRecarga] = useState(0);
  useEffect(() => {                                                              // quién entra y qué errores ven (para el tablero de Seguridad)
    registrarAcceso(); const off = instalarRegistro(); const v = () => { if (document.visibilityState === 'visible') registrarAcceso(); };
    document.addEventListener('visibilitychange', v); return () => { off(); document.removeEventListener('visibilitychange', v); };
  }, []);
  useEffect(() => {                                                              // 6:00 a. m.: el Turno Actual del día anterior se borra solo (la base lo hace a hora de Colombia)
    let vivo = true;
    const limpiar = () => limpiarTurnoActual().then(n => { if (vivo && n > 0) { window.dispatchEvent(new Event('tm-conexion-restablecida')); avisar('Se reinició el Turno Actual (6:00 a. m.): se borró lo del día anterior.'); } });
    limpiar(); const t = setInterval(limpiar, 10 * 60 * 1000);
    return () => { vivo = false; clearInterval(t); };
  }, []);                                    // al volver el internet se vuelve a pedir lo que se estaba viendo
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
      <PerfilModal />
      <Festejo />
      <PanelEfectos />
      <Sidebar open={open} onNavigate={() => setOpen(false)} onClose={() => setOpen(false)} />
      <main className="main">
        <ErrorBoundary claveReinicio={pathname}><Suspense fallback={<PantallaCargando />}><Outlet key={recarga} /></Suspense></ErrorBoundary>
        <PieLegal />
      </main>
    </MenuContext.Provider>;
}
