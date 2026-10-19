import { useState } from 'react';
import NumeroAnimado from '../NumeroAnimado';
import { indiceIntegral, nivelIndice, PESOS_DEFECTO } from '../../lib/colaboradorCalculos';

const COLOR = { ok: 'var(--ok)', aviso: 'var(--aviso)', mal: 'var(--peligro)', neutro: 'var(--gray)' };
const ETIQUETA = { productividad: 'Productividad', calidad: 'Calidad', constancia: 'Constancia' };
const AYUDA = {
  productividad: 'Qué tanto cumple la meta de tallos por hora (tope 100).',
  calidad: 'Menos devoluciones por día trabajado que el promedio de la finca: sin devoluciones = 100; igual al promedio = 50; el doble o más = 0.',
  constancia: 'Porcentaje de días trabajados en que cumplió la meta.'
};

/** El Índice integral: un número de 0 a 100 que junta productividad, calidad y constancia (los pesos se pueden ajustar). */
export default function Indice({ componentes, pesos, onPesos }) {
  const [abierto, setAbierto] = useState(false);
  const { score, partes } = indiceIntegral(componentes, pesos);
  const nivel = nivelIndice(score);
  const R = 54, C = 2 * Math.PI * R, arco = score == null ? 0 : (score / 100) * C * 0.75;      // el anillo cubre 270° (abierto abajo)
  const cambiar = (k, v) => onPesos({ ...pesos, [k]: Math.max(0, Math.min(100, Number(v) || 0)) });
  return (
    <section className="colab-indice">
      <div className="colab-gauge" role="img" aria-label={`Índice integral: ${score ?? 'sin datos'} de 100`}>
        <svg viewBox="0 0 140 140">
          <circle cx="70" cy="70" r={R} className="colab-gauge-fondo" strokeDasharray={`${C * 0.75} ${C}`} />
          <circle cx="70" cy="70" r={R} className="colab-gauge-arco" stroke={COLOR[nivel.tono]} strokeDasharray={`${arco} ${C}`} key={score} />
        </svg>
        <div className="colab-gauge-centro"><strong>{score == null ? '—' : <NumeroAnimado valor={score} />}</strong><span>de 100</span></div>
      </div>
      <div className="colab-indice-info">
        <span className="colab-etiqueta">Índice integral</span>
        <span className={`colab-nivel colab-nivel-${nivel.tono}`}>{nivel.etiqueta}</span>
        <div className="colab-partes">
          {['productividad', 'calidad', 'constancia'].map(k => {
            const p = partes.find(x => x.k === k);
            return (
              <div key={k} className={`colab-parte ${p ? '' : 'sin-dato'}`} title={AYUDA[k]}>
                <span>{ETIQUETA[k]}{p && <small> · {p.peso}%</small>}</span>
                <div className="colab-parte-barra"><i style={{ width: `${p ? p.v : 0}%` }}></i></div>
                <b>{p ? Math.round(p.v) : '—'}</b>
              </div>
            );
          })}
        </div>
        <button className="colab-como" onClick={() => setAbierto(a => !a)} aria-expanded={abierto}><i className={`fa-solid fa-chevron-${abierto ? 'up' : 'down'}`}></i> ¿Cómo se calcula?</button>
        {abierto && (
          <div className="colab-pesos">
            <p>Es un promedio ponderado de tres partes. Si a la persona le falta una (por ejemplo no aparece en Devoluciones), los pesos se reparten entre las demás. Puedes ajustar cuánto pesa cada una:</p>
            {Object.keys(PESOS_DEFECTO).map(k => (
              <label key={k}>{ETIQUETA[k]}<input type="range" min="0" max="100" step="5" value={pesos[k]} onChange={e => cambiar(k, e.target.value)} /><b>{pesos[k]}</b></label>
            ))}
            <button className="colab-como" onClick={() => onPesos({ ...PESOS_DEFECTO })}>Volver a 50 · 30 · 20</button>
          </div>
        )}
      </div>
    </section>
  );
}
