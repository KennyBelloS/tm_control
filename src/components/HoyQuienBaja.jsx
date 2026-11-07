import { useEffect, useState } from 'react';
import { getHorasTodosHoy, getConfig } from '../lib/db';
import { evaluarTodos } from '../lib/evolucionHoras';

/** En la pantalla de inicio del TIC: quiénes van bajando hoy (hora tras hora), para entrar a su tablero con un toque. */
export default function HoyQuienBaja({ personas, onElegir }) {
  const [lista, setLista] = useState(null);
  useEffect(() => {
    let vivo = true;
    Promise.all([getHorasTodosHoy(), getConfig().catch(() => null)]).then(([f, c]) => { if (vivo) setLista(evaluarTodos(f, c?.metaHora || 470).filter(x => x.tendencia === 'baja').slice(0, 8)); }).catch(() => { if (vivo) setLista([]); });
    return () => { vivo = false; };
  }, []);
  if (!lista || !lista.length) return null;
  return (
    <div className="hh-baja"><small><i className="fa-solid fa-arrow-trend-down"></i> Hoy van bajando (hora tras hora)</small>
      <div>{lista.map(x => <button key={x.id} className="colab-atajo" onClick={() => onElegir(personas.find(p => p.id === x.id) || { id: x.id, nombre: x.nombre, codigo: x.mesa })} title={x.consejo || ''}>{x.nombre}<span className="hh-baja-n"> · {x.horas.length} h</span></button>)}</div>
    </div>
  );
}
