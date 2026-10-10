import { useState } from 'react';
import { calcularPorcentajeMeta, clasificarEstado } from '../lib/calculos';
import RankingModal from './RankingModal';
const MEDALLAS = ['🥇', '🥈', '🥉'];
const COLOR_ESTADO = {
  success: {
    color: '#166534',
    bg: '#DCFCE7'
  },
  warning: {
    color: '#B45309',
    bg: '#FEF3C7'
  },
  danger: {
    color: '#A91D3A',
    bg: '#FBE3E7'
  }
};
function iniciales(nombre) {
  const partes = String(nombre || '?').trim().split(/\s+/);
  return ((partes[0]?.[0] || '') + (partes[1]?.[0] || '')).toUpperCase();
}
export default function RankingExcelTable({
  lista,
  metaHora = 470,
  titulo = 'Ranking del último Excel',
  topInicial = 5
}) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const ordenada = [...lista].sort((a, b) => b.promedioRend - a.promedioRend);
  const visibles = ordenada.slice(0, topInicial);
  const maxRend = ordenada[0]?.promedioRend || 1;
  if (ordenada.length === 0) {
    return <div className="empty-state">
        <i className="fa-solid fa-trophy"></i>
        Sin datos suficientes para mostrar el ranking.
      </div>;
  }
  return <div className="ranking-excel">
      <div className="ranking-excel-header">
        <div className="ranking-excel-title">
          <i className="fa-solid fa-star"></i> {titulo}
        </div>
        <div className="ranking-excel-actions">
          <span className="ranking-badge">Mayor a Menor</span>
          {ordenada.length > topInicial && <button className="ranking-expand-btn" title="Ver a todo el personal, agrupado por desempeño" onClick={() => setModalAbierto(true)}>
              <i className="fa-solid fa-expand"></i>
              <span>Ampliar</span>
            </button>}
        </div>
      </div>

      <div className="rk-lista">
        {visibles.map((p, i) => {
          const pct = calcularPorcentajeMeta(p.promedioRend, metaHora);
          const estado = clasificarEstado(pct);
          const colores = COLOR_ESTADO[estado.css];
          const escala = Math.max(maxRend, metaHora * 1.15);
          const ancho = Math.max(3, Math.min(100, (p.promedioRend / escala) * 100));
          const marcaMeta = Math.min(100, (metaHora / escala) * 100);
          return (
            <div key={p.colaborador_id} className={`rk-fila ranking-row-anim ${i === 0 ? 'rk-primero' : ''} ${p.pocoTiempo ? 'ranking-fila-poco-tiempo' : ''}`} style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}>
              <span className="rk-puesto">{i < 3 ? MEDALLAS[i] : `#${i + 1}`}</span>
              <span className="rk-persona">
                <span className="ranking-avatar" style={i === 0 ? { boxShadow: '0 0 0 3px #fff, 0 0 0 5px var(--gold)' } : undefined}>{iniciales(p.colaborador)}</span>
                <span className="rk-nombre">
                  <strong>{p.colaborador}</strong>
                  <small>{p.codigo ? `Código ${p.codigo}` : `Emp.Cod ${p.colaborador_id}`} · {(p.totalTallos || 0).toLocaleString('es-CO')} tallos</small>
                </span>
              </span>
              <span className="rk-barra-zona">
                <span className="rk-barra">
                  <i className="rk-relleno" style={{ width: `${ancho}%`, background: `linear-gradient(90deg, ${colores.color}, ${colores.color}CC)` }}>
                    <b>{p.promedioRend}<small>/h</small></b>
                  </i>
                  <s className="rk-meta" style={{ left: `${marcaMeta}%` }} title={`Meta ${metaHora}/h`}></s>
                </span>
                {p.pocoTiempo && (
                  <span className="ranking-poco-tiempo" title={`Solo ${p.horasTrabajadas} h trabajadas (el promedio del grupo es ${p.promedioHorasGrupo} h) — este rendimiento no es representativo`}>
                    <i className="fa-solid fa-triangle-exclamation"></i> Solo {p.horasTrabajadas} h — no confiable
                  </span>
                )}
              </span>
              <span className="rk-estado">
                <strong style={{ color: colores.color }}>{pct.toFixed(1)}%</strong>
                <span className="ranking-estado" style={{ color: colores.color, background: colores.bg }}>{estado.label}</span>
              </span>
            </div>
          );
        })}
      </div>

      {ordenada.length > topInicial && <button className="btn-secondary" style={{
      marginTop: 14,
      alignSelf: 'flex-start'
    }} onClick={() => setModalAbierto(true)}>
          <i className="fa-solid fa-chevron-down"></i> Ver el resto ({ordenada.length - topInicial} personas más)
        </button>}

      {modalAbierto && <RankingModal lista={ordenada} metaHora={metaHora} titulo={titulo} onClose={() => setModalAbierto(false)} />}
    </div>;
}
