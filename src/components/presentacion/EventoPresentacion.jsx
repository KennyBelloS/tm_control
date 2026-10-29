import { useEffect, useRef } from 'react';
import { ConfetiCss } from './FestivoPresentacion';

const ETIQUETA = { lider: 'Cambio de líder', supera: 'Adelantamiento', sube: 'Rendimiento', baja: 'Atención', 'cumpl-sube': 'Meta del día' };
/** Cartel grande que se SOBREPONE en la presentación (sin salirse de ella) cuando pasa algo especial. Dura 7 s y no estorba: no recibe toques. */
export default function EventoPresentacion({ evento, onFin, conConfeti = true }) {
  const fin = useRef(onFin); fin.current = onFin;
  useEffect(() => { const t = setTimeout(() => fin.current(), 7000); return () => clearTimeout(t); }, [evento.clave]);
  return (
    <div className={`pev pev-${evento.tono} pev-${evento.tipo}`} role="status" aria-live="polite" key={evento.clave}>
      {conConfeti && evento.tono !== 'rojo' && <ConfetiCss fiesta={null} cantidad={evento.tipo === 'lider' ? 80 : 40} />}
      <div className="pev-tarjeta">
        <div className="pev-icono" aria-hidden="true">{evento.icono}</div>
        <div className="pev-texto"><small>{ETIQUETA[evento.tipo] || 'Importante'}</small><h2>{evento.titulo}</h2><p>{evento.detalle}</p></div>
        <i className="pev-barra"></i>
      </div>
    </div>
  );
}
