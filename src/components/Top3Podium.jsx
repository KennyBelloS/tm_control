import { calcularPorcentajeMeta, clasificarEstado } from '../lib/calculos';

const MEDALLAS = ['🥇', '🥈', '🥉'];
const ORDEN_PODIO = [1, 0, 2];

function iniciales(nombre) {
  const partes = String(nombre || '?').trim().split(/\s+/);
  return ((partes[0]?.[0] || '') + (partes[1]?.[0] || '')).toUpperCase();
}

export default function Top3Podium({ lista, metaHora }) {
  const top3 = lista.slice(0, 3);
  if (top3.length === 0) return null;

  return (
    <section className="podio-real">
      {ORDEN_PODIO.filter(i => top3[i]).map(i => {
        const p = top3[i];
        const pct = calcularPorcentajeMeta(p.promedioRend, metaHora);
        const estado = clasificarEstado(pct);
        return (
          <div key={p.colaborador_id} className={`podio-columna podio-puesto-${i + 1}`} style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="podio-medalla-flotante">{MEDALLAS[i]}</div>
            <div className="podio-avatar-real">{iniciales(p.colaborador)}</div>
            <div className="podio-nombre-real">{p.colaborador}</div>
            <div className="podio-rendimiento-real">{p.promedioRend}<span>tallos/h</span></div>
            <span className={`status ${estado.css}`}>{estado.label}</span>
            <div className="podio-base">
              <span className="podio-numero">{i + 1}°</span>
            </div>
          </div>
        );
      })}
    </section>
  );
}
