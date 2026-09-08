import { useState } from 'react';
import { calcularPorcentajeMeta, clasificarEstado } from '../lib/calculos';
import RankingModal from './RankingModal';

const MEDALLAS = ['🥇', '🥈', '🥉'];
const COLOR_ESTADO = {
  success: { color: '#166534', bg: '#DCFCE7' },
  warning: { color: '#B45309', bg: '#FEF3C7' },
  danger: { color: '#A91D3A', bg: '#FBE3E7' },
};

function iniciales(nombre) {
  const partes = String(nombre || '?').trim().split(/\s+/);
  return ((partes[0]?.[0] || '') + (partes[1]?.[0] || '')).toUpperCase();
}

/**
 * Ranking: Top 3 en tarjetas grandes destacadas (con medalla, avatar y
 * borde de color según el puesto) + tabla general del resto. El botón
 * "Ampliar" abre una vista distinta (RankingModal), agrupada por nivel de
 * desempeño en vez de repetir la misma tabla más larga.
 */
export default function RankingExcelTable({ lista, metaHora = 470, titulo = 'Ranking del último Excel', topInicial = 5 }) {
  const [modalAbierto, setModalAbierto] = useState(false);

  const ordenada = [...lista].sort((a, b) => b.promedioRend - a.promedioRend);
  const visibles = ordenada.slice(0, topInicial);
  const maxRend = ordenada[0]?.promedioRend || 1;

  if (ordenada.length === 0) {
    return (
      <div className="empty-state">
        <i className="fa-solid fa-trophy"></i>
        Sin datos suficientes para mostrar el ranking.
      </div>
    );
  }

  return (
    <div className="ranking-excel">
      <div className="ranking-excel-header">
        <div className="ranking-excel-title">
          <i className="fa-solid fa-star"></i> {titulo}
        </div>
        <div className="ranking-excel-actions">
          <span className="ranking-badge">Mayor a Menor</span>
          {ordenada.length > topInicial && (
            <button className="ranking-expand-btn" title="Ver a todo el personal, agrupado por desempeño" onClick={() => setModalAbierto(true)}>
              <i className="fa-solid fa-expand"></i>
              <span>Ampliar</span>
            </button>
          )}
        </div>
      </div>

      <div className="table-scroll">
        <table className="ranking-excel-table">
          <thead>
            <tr>
              <th>Puesto</th><th>Colaborador</th><th>Tallos</th><th>Rendimiento</th>
              <th>Progreso</th><th>% Eficiencia</th><th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((p, i) => {
              const pct = calcularPorcentajeMeta(p.promedioRend, metaHora);
              const estado = clasificarEstado(pct);
              const colores = COLOR_ESTADO[estado.css];
              const anchoBarra = Math.max(4, Math.min(100, Math.round((p.promedioRend / maxRend) * 100)));
              return (
                <tr key={p.colaborador_id} className="ranking-row-anim" style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}>
                  <td>
                    {i < 3
                      ? <span className="puesto-medalla">{MEDALLAS[i]}</span>
                      : <span className="puesto-numero">#{i + 1}</span>}
                  </td>
                  <td className="ranking-nombre-cell">
                    <span className="ranking-avatar">{iniciales(p.colaborador)}</span>
                    <div>
                      <div className="ranking-nombre">{p.colaborador}</div>
                      <div className="ranking-id">Id {p.colaborador_id}</div>
                    </div>
                  </td>
                  <td>{(p.totalTallos || 0).toLocaleString()}</td>
                  <td><strong>{p.promedioRend}</strong> <span className="ranking-unidad">/h</span></td>
                  <td>
                    <div className="ranking-progreso">
                      <div style={{ width: `${anchoBarra}%`, background: colores.color }}></div>
                    </div>
                  </td>
                  <td>{pct.toFixed(2)}%</td>
                  <td>
                    <span className="ranking-estado" style={{ color: colores.color, background: colores.bg }}>{estado.label}</span>
                    {estado.css === 'warning' && <div className="ranking-alusivo">{estado.mensaje}</div>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {ordenada.length > topInicial && (
        <button className="btn-secondary" style={{ marginTop: 14, alignSelf: 'flex-start' }} onClick={() => setModalAbierto(true)}>
          <i className="fa-solid fa-chevron-down"></i> Ver el resto ({ordenada.length - topInicial} personas más)
        </button>
      )}

      {modalAbierto && (
        <RankingModal lista={ordenada} metaHora={metaHora} titulo={titulo} onClose={() => setModalAbierto(false)} />
      )}
    </div>
  );
}
