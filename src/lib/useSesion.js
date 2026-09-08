import { useEffect, useState } from 'react';
import { getSesion } from './roles';

/** Devuelve la sesión actual y se re-renderiza si cambia (login, logout, cambio de rol). */
export function useSesion() {
  const [sesion, setSesionState] = useState(getSesion());

  useEffect(() => {
    function actualizar() { setSesionState(getSesion()); }
    window.addEventListener('tm-sesion-cambio', actualizar);
    window.addEventListener('storage', actualizar);
    return () => {
      window.removeEventListener('tm-sesion-cambio', actualizar);
      window.removeEventListener('storage', actualizar);
    };
  }, []);

  return sesion;
}
