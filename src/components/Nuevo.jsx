import { esNuevaFuncion } from '../lib/novedades';

/** La insignia «Nuevo» de una función: aparece los primeros días de su versión y se quita sola (ver lib/nuevo.js). */
export default function Nuevo({ id, className = '' }) {
  if (!esNuevaFuncion(id)) return null;
  return <em className={`nuevo-badge ${className}`} title="Función nueva: la insignia se quita sola a los 2 días">Nuevo</em>;
}
