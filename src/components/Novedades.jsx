import Texto from './TextoMd';

const cap = t => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);
const ETQ = { nuevo: 'Nuevo', mejora: 'Mejora', arreglo: 'Arreglo' };
const Tarjeta = ({ it, i }) => (
  <article className={`nv-item nv-${it.tipo}`} style={{ '--i': i }}>
    <span className="nv-ic"><i className={`fa-solid ${it.icono}`}></i></span>
    <div><div className="nv-tit">{it.titulo && <strong>{it.titulo}</strong>}<em>{ETQ[it.tipo]}</em></div><p><Texto t={cap(it.texto)} /></p></div>
  </article>
);

/** Novedades: la versión más reciente destacada y, debajo, la línea de tiempo con las anteriores. */
export default function Novedades({ entradas }) {
  const [ultima, ...antes] = entradas;
  if (!ultima) return <div className="panel ay-vacio"><i className="fa-solid fa-gift"></i><b>Aún no hay novedades</b></div>;
  return (
    <div className="nv">
      <section className="nv-hero">
        <div className="nv-hero-cab">
          <span className="nv-ultima"><i className="fa-solid fa-sparkles"></i> Lo último</span>
          <div className="nv-ver"><small>Versión</small><b>{ultima.version}</b></div>
          <div className="nv-hero-txt"><h2>{ultima.titulo || 'Novedades'}</h2><p>{ultima.fecha}{ultima.fecha ? ' · ' : ''}{ultima.items.length} novedades</p></div>
        </div>
        <div className="nv-grid">{ultima.items.map((it, i) => <Tarjeta key={i} it={it} i={i} />)}</div>
      </section>
      {antes.length > 0 && (
        <section className="nv-linea" aria-label="Versiones anteriores">
          <h3><i className="fa-solid fa-clock-rotate-left"></i> Versiones anteriores</h3>
          {antes.map(e => (
            <details key={e.version} className="nv-prev">
              <summary><span className="nv-punto"></span><b>Versión {e.version}</b><span>{e.titulo}</span><em>{e.fecha || ''}</em></summary>
              <div className="nv-grid nv-chico">{e.items.map((it, i) => <Tarjeta key={i} it={it} i={i} />)}</div>
            </details>
          ))}
        </section>
      )}
    </div>
  );
}
