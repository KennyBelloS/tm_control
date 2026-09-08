import { useEffect } from 'react';
import { calcularPorcentajeMeta, clasificarEstado } from '../lib/calculos';
const MEDALLAS = ['🥇', '🥈', '🥉'];
const GRUPOS = [{
  css: 'success',
  titulo: 'Cumple la meta',
  icono: 'fa-circle-check'
}, {
  css: 'warning',
  titulo: 'A punto de cumplir',
  icono: 'fa-triangle-exclamation'
}, {
  css: 'danger',
  titulo: 'Por debajo de la meta',
  icono: 'fa-arrow-trend-down'
}];
const COLOR_ESTADO = {
  success: '#166534',
  warning: '#B45309',
  danger: '#A91D3A'
};
function iniciales(nombre) {
  const partes = String(nombre || '?').trim().split(/\s+/);
  return ((partes[0]?.[0] || '') + (partes[1]?.[0] || '')).toUpperCase();
}
export default function RankingModal({
  lista,
  metaHora,
  titulo,
  onClose
}) {
  useEffect(() => {
    function onEsc(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onEsc);
      document.body.style.overflow = '';
    };
  }, [onClose]);
  const ordenada = [...lista].sort((a, b) => b.promedioRend - a.promedioRend);
  const maxRend = ordenada[0]?.promedioRend || 1;
  const grupos = GRUPOS.map(g => ({
    ...g,
    personas: ordenada.filter(p => clasificarEstado(calcularPorcentajeMeta(p.promedioRend, metaHora)).css === g.css)
  }));
  return <div className="ranking-modal-overlay" onClick={onClose}>
      <div className="ranking-modal" onClick={e => e.stopPropagation()}>
        <div className="ranking-modal-header">
          <div>
            <h2><i className="fa-solid fa-chart-simple"></i> {titulo}</h2>
            <p>{ordenada.length} colaboradores · ordenado de mayor a menor rendimiento</p>
          </div>
          <button className="ranking-modal-close" onClick={onClose} aria-label="Cerrar">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="ranking-modal-body">
          {grupos.map(g => g.personas.length > 0 && <div key={g.css} className="ranking-modal-grupo">
              <div className="ranking-modal-grupo-titulo" style={{
            color: COLOR_ESTADO[g.css]
          }}>
                <i className={`fa-solid ${g.icono}`}></i> {g.titulo}
                <span className="ranking-modal-grupo-count">{g.personas.length}</span>
              </div>
              <div className="ranking-modal-lista">
                {g.personas.map(p => {
              const puestoGlobal = ordenada.findIndex(x => x.colaborador_id === p.colaborador_id) + 1;
              const pct = calcularPorcentajeMeta(p.promedioRend, metaHora);
              const ancho = Math.max(6, Math.round(p.promedioRend / maxRend * 100));
              return <div key={p.colaborador_id} className="ranking-modal-fila">
                      <div className="ranking-modal-puesto">
                        {puestoGlobal <= 3 ? MEDALLAS[puestoGlobal - 1] : `#${puestoGlobal}`}
                      </div>
                      <div className="ranking-modal-avatar">{iniciales(p.colaborador)}</div>
                      <div className="ranking-modal-info">
                        <div className="ranking-modal-nombre">{p.colaborador}</div>
                        <div className="ranking-modal-barra-track">
                          <div className="ranking-modal-barra-fill" style={{
                      width: `${ancho}%`,
                      background: COLOR_ESTADO[g.css]
                    }}>
                            <span>{p.promedioRend} /h</span>
                          </div>
                        </div>
                      </div>
                      <div className="ranking-modal-pct" style={{
                  color: COLOR_ESTADO[g.css]
                }}>{pct.toFixed(0)}%</div>
                    </div>;
            })}
              </div>
            </div>)}
        </div>
      </div>
    </div>;
}
