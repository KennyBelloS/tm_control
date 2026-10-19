import { useEffect, useState } from 'react';
import { estadoVivo } from '../lib/vivo';

const hace = ms => {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 8) return 'ahora mismo';
  if (s < 60) return `hace ${s} s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `hace ${m} min` : `hace ${Math.floor(m / 60)} h`;
};
const TEXTO = { vivo: 'En vivo', conectando: 'Conectando…', error: 'Sin conexión en vivo' };

/**
 * Indicador de conexión en vivo: punto que respira cuando hay conexión, la hora de la última actualización de datos,
 * y un destello cada vez que llegan datos nuevos (por ejemplo, cuando alguien sube un reporte).
 */
export default function EnVivo() {
  const [estado, setEstado] = useState(estadoVivo.estado);
  const [ultima, setUltima] = useState(estadoVivo.ultima);
  const [ahora, setAhora] = useState(Date.now());
  const [destello, setDestello] = useState(0);
  useEffect(() => {
    const alEstado = e => setEstado(e.detail);
    const alDatos = e => { setUltima(e.detail); setDestello(d => d + 1); };
    window.addEventListener('tm-estado-vivo', alEstado);
    window.addEventListener('tm-datos-actualizados', alDatos);
    const reloj = setInterval(() => setAhora(Date.now()), 10_000);
    return () => { window.removeEventListener('tm-estado-vivo', alEstado); window.removeEventListener('tm-datos-actualizados', alDatos); clearInterval(reloj); };
  }, []);
  return (
    <div className={`en-vivo en-vivo-${estado}`} role="status" aria-live="polite"
      title={estado === 'vivo' ? 'Los datos se actualizan solos cuando alguien sube o cambia información.' : estado === 'error' ? 'La conexión en vivo se cayó: recarga la página para reconectar.' : 'Estableciendo la conexión en vivo…'}>
      <span key={destello} className={`en-vivo-punto ${destello ? 'en-vivo-destello' : ''}`}></span>
      <span className="en-vivo-texto"><strong>{TEXTO[estado]}</strong><small>Actualizado {hace(ahora - ultima)}</small></span>
    </div>
  );
}
