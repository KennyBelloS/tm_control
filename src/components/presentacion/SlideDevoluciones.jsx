const fmt = n => Number(n).toLocaleString('es-CO');

/**
 * Una vista de devoluciones para Presentar (día, semana o mes).
 * Izquierda: quienes MÁS tuvieron — solo con su CÓDIGO (sin nombre, a propósito). Derecha: quienes MENOS tuvieron — con su NOMBRE.
 */
export default function SlideDevoluciones({ vista }) {
  const maxMas = Math.max(1, ...vista.mas.map(e => e.devol));
  return (
    <div className="pres-slide-lista pres-dev">
      <h2 className="slide-titulo"><i className="fa-solid fa-rotate-left"></i> {vista.titulo}</h2>
      <p className="pres-slide-sub">{vista.rango} · {vista.nota}</p>
      <div className="pres-dev-cols">
        <section className="pres-dev-col mas">
          <header><i className="fa-solid fa-arrow-trend-up"></i><div><b>Más devoluciones</b><small>solo se muestra el código</small></div></header>
          {vista.mas.length === 0
            ? <p className="pres-dev-vacio"><span>🎉</span>Sin devoluciones en este período</p>
            : vista.mas.map((e, i) => (
              <div className="pres-dev-fila" key={e.id} style={{ animationDelay: `${i * 80}ms` }}>
                <span className="pres-dev-puesto">{i + 1}</span>
                <span className="pres-dev-codigo"><small>Código</small>{e.codigo ?? '—'}</span>
                <span className="pres-dev-barra"><i style={{ width: `${(e.devol / maxMas) * 100}%` }}></i></span>
                <b className="pres-dev-num">{fmt(e.devol)}</b>
              </div>
            ))}
        </section>
        <section className="pres-dev-col menos">
          <header><i className="fa-solid fa-arrow-trend-down"></i><div><b>Menos devoluciones</b><small>mínimo {vista.minDias} día{vista.minDias === 1 ? '' : 's'} trabajado{vista.minDias === 1 ? '' : 's'}</small></div></header>
          {vista.menos.length === 0
            ? <p className="pres-dev-vacio"><span>—</span>Nadie cumple el mínimo de días trabajados en este período</p>
            : vista.menos.map((e, i) => (
              <div className="pres-dev-fila" key={e.id} style={{ animationDelay: `${i * 80}ms` }}>
                <span className="pres-dev-puesto">{i + 1}</span>
                <span className="pres-dev-nombre"><b>{e.nombre}</b><small>Código {e.codigo ?? '—'} · {e.diasTrab} día{e.diasTrab === 1 ? '' : 's'}</small></span>
                <b className="pres-dev-num ok">{fmt(e.devol)}</b>
              </div>
            ))}
          {vista.empatadosFuera > 0 && <p className="pres-dev-empate">+{fmt(vista.empatadosFuera)} persona{vista.empatadosFuera === 1 ? '' : 's'} más también con {fmt(vista.quintoDevol)} devolución{vista.quintoDevol === 1 ? '' : 'es'}</p>}
        </section>
      </div>
      <p className="pres-dev-pie"><b>{fmt(vista.total)}</b> devoluciones en total · <b>{fmt(vista.personasConDevoluciones)}</b> persona{vista.personasConDevoluciones === 1 ? '' : 's'} con devoluciones</p>
    </div>
  );
}
