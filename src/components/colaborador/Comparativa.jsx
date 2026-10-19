const fmt = (n, d = 0) => (n == null ? '—' : n.toFixed(d).replace('.', ','));

/** Barras para comparar a la persona con su equipo (la gente de su formadora) y con toda la finca. */
export default function Comparativa({ titulo, datos, unidad, decimales = 0, masEsMejor = true, equipoNombre }) {
  const filas = [{ k: 'persona', et: 'Esta persona', v: datos.persona, color: 'var(--primary)' }, { k: 'equipo', et: equipoNombre ? `Equipo de ${equipoNombre}` : 'Su equipo', v: datos.equipo, color: 'var(--gold)' }, { k: 'general', et: 'Toda la finca', v: datos.general, color: '#7F8C8D' }];
  const max = Math.max(0.0001, ...filas.map(f => f.v || 0));
  const dif = (a, b) => (a == null || b == null || b === 0 ? null : ((a - b) / b) * 100);
  const vsEq = dif(datos.persona, datos.equipo), vsGen = dif(datos.persona, datos.general);
  const tono = d => (d == null || Math.abs(d) < 1 ? 'neutro' : (d > 0) === masEsMejor ? 'ok' : 'mal');
  return (
    <section className="colab-comp">
      <h4>{titulo}</h4>
      {filas.map(f => (
        <div key={f.k} className={`colab-comp-fila ${f.k}`}>
          <span>{f.et}</span>
          <div className="colab-comp-barra"><i style={{ width: `${f.v ? (f.v / max) * 100 : 0}%`, background: f.color }}></i></div>
          <b>{fmt(f.v, decimales)}<small> {f.v != null ? unidad : ''}</small></b>
        </div>
      ))}
      <footer>
        {vsEq != null && <span className={`colab-delta-${tono(vsEq)}`}>{vsEq > 0 ? '+' : ''}{vsEq.toFixed(0)}% vs. su equipo</span>}
        {vsGen != null && <span className={`colab-delta-${tono(vsGen)}`}>{vsGen > 0 ? '+' : ''}{vsGen.toFixed(0)}% vs. la finca</span>}
        {vsEq == null && vsGen == null && <span className="dev-cero">Sin datos para comparar</span>}
      </footer>
    </section>
  );
}
