import { useId } from 'react';
import { aperturaFlor, aperturaPetalo, PETALOS } from '../lib/hitos';

const PETALO_EXT = 'M100,100 C76,70 78,24 100,8 C122,24 124,70 100,100 Z';       // pétalo largo en forma de lente
const PETALO_INT = 'M100,100 C84,80 86,50 100,38 C114,50 116,80 100,100 Z';      // pétalo corto de la segunda corona

/**
 * LA FLOR DE LA META: el avance del día no es una barra ni un anillo, es una flor que va floreciendo.
 * 12 pétalos exteriores se abren uno a uno hasta la meta (los que faltan se ven como siluetas tenues); en la segunda mitad florece una corona interior dorada;
 * al 100 % queda plena, gira despacio y brilla. Toma sus colores de la marca (o de la festividad activa) y se ve igual en claro y en oscuro.
 */
export default function FlorMeta({ pct = 0, tamano = 120, children, className = '' }) {
  const id = useId().replace(/:/g, '');
  const { exteriores, interiores, plena } = aperturaFlor(pct);
  return (
    <div className={`flor-meta ${plena ? 'plena' : ''} ${className}`} style={{ width: tamano, height: tamano }} role="img" aria-label={`Flor de la meta: ${Math.round(pct)}% de avance`}>
      <svg viewBox="0 0 200 200" className="flor-svg" aria-hidden="true">
        <defs>
          <radialGradient id={`pe${id}`} cx="50%" cy="100%" r="100%"><stop offset="0%" style={{ stopColor: 'var(--primary-dark)' }} /><stop offset="55%" style={{ stopColor: 'var(--primary)' }} /><stop offset="100%" style={{ stopColor: 'var(--primary-light)' }} /></radialGradient>
          <radialGradient id={`pi${id}`} cx="50%" cy="100%" r="100%"><stop offset="0%" style={{ stopColor: 'var(--gold)' }} /><stop offset="100%" style={{ stopColor: '#FFF3C4' }} /></radialGradient>
        </defs>
        <g className="flor-giro">
          {Array.from({ length: PETALOS }, (_, i) => {
            const s = aperturaPetalo(exteriores, i);
            return <path key={`e${i}`} d={PETALO_EXT} className="flor-petalo" fill={`url(#pe${id})`} data-abierto={s.toFixed(2)}
              style={{ transform: `rotate(${i * (360 / PETALOS)}deg) scale(${0.62 + s * 0.38})`, opacity: 0.27 + s * 0.73, transitionDelay: `${i * 70}ms` }} />;
          })}
          {Array.from({ length: PETALOS }, (_, i) => (
            <path key={`i${i}`} d={PETALO_INT} className="flor-petalo flor-interior" fill={`url(#pi${id})`} data-abierto={interiores.toFixed(2)}
              style={{ transform: `rotate(${i * (360 / PETALOS) + 15}deg) scale(${0.04 + interiores * 0.96})`, opacity: interiores > 0 ? 0.6 + interiores * 0.4 : 0, transitionDelay: `${i * 50}ms` }} />
          ))}
        </g>
        <circle cx="100" cy="100" r="38" className="flor-centro" />
        <circle cx="100" cy="100" r="38" className="flor-aro" />
      </svg>
      <div className="flor-contenido">{children}</div>
    </div>
  );
}
