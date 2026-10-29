import { useEffect, useState } from 'react';

/**
 * Monta su contenido más tarde, en un rato libre y por turnos (`orden`): en vez de dibujar toda la pantalla en una sola tarea larga, se hace por partes.
 * En un celular modesto eso significa que un toque nunca espera detrás de casi un segundo de trabajo. Mientras tanto reserva el espacio (`alto`) para que la página no salte.
 */
export default function Diferido({ orden = 1, alto = 240, children }) {
  const [listo, setListo] = useState(false);
  useEffect(() => {
    let r;
    const t = setTimeout(() => { if (typeof requestIdleCallback === 'function') r = requestIdleCallback(() => setListo(true), { timeout: 1500 }); else setListo(true); }, 150 * orden);
    return () => { clearTimeout(t); if (r && typeof cancelIdleCallback === 'function') cancelIdleCallback(r); };
  }, [orden]);
  return listo ? children : <div className="diferido" style={{ minHeight: alto }} aria-hidden="true"></div>;
}
