import { useEffect, useState } from 'react';
import { alternarTema, obtenerTema } from '../lib/tema';

/** Botón sol/luna para cambiar entre tema claro y oscuro. */
export default function BotonTema() {
  const [tema, setTema] = useState(obtenerTema);
  useEffect(() => {
    const alCambiar = e => setTema(e.detail);
    window.addEventListener('tm-tema', alCambiar);
    return () => window.removeEventListener('tm-tema', alCambiar);
  }, []);
  const oscuro = tema === 'oscuro';
  return (
    <button className="boton-tema" onClick={alternarTema} aria-label={oscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'} title={oscuro ? 'Tema claro' : 'Tema oscuro'} aria-pressed={oscuro}>
      <i className={`fa-solid ${oscuro ? 'fa-sun' : 'fa-moon'}`}></i>
    </button>
  );
}
