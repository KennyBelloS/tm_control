import { useEffect, useState } from 'react';
import { alternarDensidad, obtenerAjuste } from '../lib/ajustesUI';

/** Cambia el aire de tablas y listas: "cómoda" (más espacio) o "compacta" (más filas a la vista). */
export default function BotonDensidad() {
  const [densidad, setDensidad] = useState(() => obtenerAjuste('densidad'));
  useEffect(() => {
    const alCambiar = e => { if (e.detail.densidad) setDensidad(e.detail.densidad); };
    window.addEventListener('tm-ajustes', alCambiar);
    return () => window.removeEventListener('tm-ajustes', alCambiar);
  }, []);
  const compacta = densidad === 'compacta';
  return (
    <button className="boton-densidad" onClick={alternarDensidad} aria-pressed={compacta}
      aria-label={compacta ? 'Cambiar a tablas cómodas' : 'Cambiar a tablas compactas'} title={compacta ? 'Tablas cómodas' : 'Tablas compactas (más filas a la vista)'}>
      <i className={`fa-solid ${compacta ? 'fa-table-list' : 'fa-grip-lines'}`}></i>
    </button>
  );
}
