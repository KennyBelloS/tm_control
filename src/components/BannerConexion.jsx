import { useEffect, useRef, useState } from 'react';
import { useConexion } from '../lib/conexion';

/** Aviso discreto abajo: "Sin conexión" (se ven los últimos datos) y, al volver, "Conexión restablecida" unos segundos. No aparece mientras hay internet. */
export default function BannerConexion() {
  const enLinea = useConexion();
  const [vuelta, setVuelta] = useState(false), estuvoSin = useRef(false);
  useEffect(() => {
    if (!enLinea) { estuvoSin.current = true; setVuelta(false); return undefined; }
    if (!estuvoSin.current) return undefined;
    estuvoSin.current = false; setVuelta(true);
    const t = setTimeout(() => setVuelta(false), 3500); return () => clearTimeout(t);
  }, [enLinea]);
  if (enLinea && !vuelta) return null;
  return (
    <div className={`bc ${enLinea ? 'bc-ok' : 'bc-sin'}`} role="status" aria-live="polite">
      <i className={`fa-solid ${enLinea ? 'fa-wifi' : 'fa-cloud-arrow-down'}`}></i>
      {enLinea ? <span><b>Conexión restablecida.</b> Datos actualizados.</span> : <span><b>Sin conexión.</b> Estás viendo lo último guardado; para guardar cambios vuelve a conectarte.</span>}
    </div>
  );
}
