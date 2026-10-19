import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Línea fina que cruza la parte de arriba cuando se cambia de pantalla.
 * Arranca en el INSTANTE del clic (o del atajo de teclado), no cuando la pantalla termina de dibujarse:
 * así confirma la acción incluso en las pantallas pesadas. Con el botón "atrás" del navegador arranca al cambiar la ruta.
 */
export default function BarraRuta() {
  const { pathname } = useLocation();
  const primera = useRef(true);
  const ultimoInicio = useRef(-1e9);
  const [clave, setClave] = useState(0);

  const iniciar = () => {
    ultimoInicio.current = performance.now();
    setClave(c => c + 1);
  };

  useEffect(() => {
    const alClic = e => {
      const a = e.target.closest?.('a[href]');
      const href = a?.getAttribute('href');
      if (!a || !href || !href.startsWith('/') || href.startsWith('//') || a.target === '_blank' || e.ctrlKey || e.metaKey || e.shiftKey || e.button) return;
      if (new URL(a.href).pathname === window.location.pathname) return;          // mismo destino: no hay navegación
      iniciar();
    };
    document.addEventListener('click', alClic, true);
    window.addEventListener('tm-navegando', iniciar);
    return () => { document.removeEventListener('click', alClic, true); window.removeEventListener('tm-navegando', iniciar); };
  }, []);

  useEffect(() => {
    if (primera.current) { primera.current = false; return; }                     // no en la carga inicial
    if (performance.now() - ultimoInicio.current < 1000) return;                  // ya se mostró al hacer clic
    iniciar();
  }, [pathname]);

  return clave === 0 ? null : <div key={clave} className="barra-ruta" aria-hidden="true"><i></i></div>;
}
