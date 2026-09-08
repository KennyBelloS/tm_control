import { calcularPorcentajeMeta, clasificarEstado } from '../lib/calculos';
const MEDALLAS = ['🥇', '🥈', '🥉'];
function iniciales(nombre) {
  const partes = String(nombre || '?').trim().split(/\s+/);
  return ((partes[0]?.[0] || '') + (partes[1]?.[0] || '')).toUpperCase();
}
export default function Top3Podium({
  lista,
  metaHora
}) {
  const top3 = lista.slice(0, 3);
  if (top3.length === 0) return null;
  return <section className="top3-grid">
      {top3.map((p, i) => {
      const pct = calcularPorcentajeMeta(p.promedioRend, metaHora);
      const estado = clasificarEstado(pct);
      return <div key={p.colaborador_id} className={`top3-card top3-puesto-${i + 1}`}>
            <div className="top3-medalla">{MEDALLAS[i]}</div>
            <div className="top3-avatar">{iniciales(p.colaborador)}</div>
            <div className="top3-nombre">{p.colaborador}</div>
            <div className="top3-id">Id {p.colaborador_id}</div>
            <div className="top3-rendimiento">{p.promedioRend}</div>
            <div className="top3-unidad">tallos/hora</div>
            <span className={`status ${estado.css}`} style={{
          marginTop: 8
        }}>{estado.label}</span>
          </div>;
    })}
    </section>;
}
