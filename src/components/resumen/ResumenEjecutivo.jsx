import { useState } from 'react';

const fmt = n => Math.round(n).toLocaleString('es-CO');
const fmt1 = n => (Math.round(n * 10) / 10).toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const ddmm = iso => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** El aro de cumplimiento, como imagen: la captura para descargar no dibuja bien los gráficos SVG en línea, pero sí las imágenes. */
function Aro({ pct }) {
  const p = Math.max(0, Math.min(100, pct)), R = 22, C = 2 * Math.PI * R, col = pct >= 100 ? '#2E8C4E' : pct >= 90 ? '#C9932B' : '#C0392B';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="112" height="112" viewBox="0 0 56 56"><circle cx="28" cy="28" r="${R}" fill="none" stroke="#E7E4DA" stroke-width="7"/><circle cx="28" cy="28" r="${R}" fill="none" stroke="${col}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${(C * p) / 100} ${C}" transform="rotate(-90 28 28)"/></svg>`;
  return <img className="ej-aro" src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} alt="" width="38" height="38" />;
}
const Seccion = ({ icono, titulo, children, i = 0 }) => <section className="ej-sec" style={{ '--i': i }}><h2><span><i className={`fa-solid ${icono}`}></i></span>{titulo}</h2>{children}</section>;

function Barras({ dias, meta }) {
  const [sel, setSel] = useState(null);
  const max = Math.max(1, meta || 0, ...dias.map(d => d.tallos)), d = sel !== null ? dias[sel] : null;
  return (
    <div>
      <div className="ej-barras" role="list">
        {meta > 0 && <i className="ej-meta" style={{ '--f': meta / max }} title={`Meta diaria ${fmt(meta)}`}><em>Meta {fmt(meta)}</em></i>}
        {dias.map((x, k) => (
          <button key={x.fecha} role="listitem" className={`ej-barra ${sel === k ? 'on' : ''} ${meta && x.tallos >= meta ? 'sobre' : ''}`} style={{ '--f': Math.max(0.03, x.tallos / max), '--k': k }} onClick={() => setSel(s => (s === k ? null : k))} aria-label={`${x.dia} ${ddmm(x.fecha)}: ${fmt(x.tallos)} tallos`}>
            <b>{dias.length <= 8 ? fmt(x.tallos) : ''}</b><span className="ej-col"></span><small>{dias.length > 8 ? x.fecha.slice(8) : `${x.dia.slice(0, 3)} ${x.fecha.slice(8)}`}</small>
          </button>
        ))}
      </div>
      <p className="ej-dato">{d ? <><b>{d.dia} {ddmm(d.fecha)}</b> · {fmt(d.tallos)} tallos · {fmt(d.rend)} t/h · {d.personas} personas</> : 'Toca una barra para ver el detalle del día.'}</p>
    </div>
  );
}
function Equipos({ lista }) {
  const [abiertos, setAbiertos] = useState(() => new Set());
  const alt = id => setAbiertos(a => { const n = new Set(a); n.has(id) ? n.delete(id) : n.add(id); return n; });
  return (
    <ol className="ej-equipos">{lista.map((e, i) => {
      const max = Math.max(1, ...e.porDia.map(d => d.tallos)), abierto = abiertos.has(e.id);
      return (
        <li key={e.id} className={abierto ? 'abierto' : ''} style={{ '--i': i }}>
          <button className="ej-eq-cab" onClick={() => alt(e.id)} aria-expanded={abierto}>
            <span className={`ej-puesto p${Math.min(e.puesto, 4)}`}>{e.puesto}</span>
            <span className="ej-eq-nombre"><b>{e.nombre}</b><i style={{ '--w': `${e.pctDelMejor}%` }}></i></span>
            <span className="ej-eq-cifra"><b>{fmt(e.rend)}</b><small>t/h</small></span>
            {e.d && <em className={`ej-fl ej-fl-${e.d.clase}`}>{e.d.txt}</em>}
            <i className="fa-solid fa-chevron-down ej-flecha"></i>
          </button>
          <div className="ej-detalle">
            <div className="ej-mini">{e.porDia.map(d => <span key={d.fecha} title={`${ddmm(d.fecha)}: ${fmt(d.tallos)}`} style={{ '--h': `${Math.max(6, (d.tallos / max) * 100)}%` }}></span>)}</div>
            <ul><li><b>{fmt(e.tallos)}</b> tallos en el período</li><li><b>{fmt1(e.personas)}</b> personas por día</li>{e.cumplenMetaPct != null && <li><b>{Math.round(e.cumplenMetaPct)} %</b> de los turnos cumplió la meta por hora</li>}{e.devoluciones !== null && <li><b>{fmt(e.devoluciones)}</b> devoluciones</li>}</ul>
          </div>
        </li>);
    })}</ol>
  );
}
const BarrasH = ({ filas, color }) => { const max = Math.max(1, ...filas.map(f => f.v)); return <ul className="ej-hb">{filas.map((f, i) => <li key={f.n} style={{ '--i': i }}><span>{f.n}</span><div><i style={{ '--w': `${(f.v / max) * 100}%`, background: color }}></i></div><b>{fmt(f.v)}{f.x && <small> {f.x}</small>}</b></li>)}</ul>; };

/**
 * El resumen ejecutivo, con forma de correo: encabezado con logo, banda verde, panorama, indicadores, producción por día,
 * equipos (desplegables), calidad, destacados, conclusiones, pendientes y la firma. Se ve en pantalla y se descarga igual.
 */
export default function ResumenEjecutivo({ modelo: m, logo, refDoc }) {
  const f = m.firma, t = m.titular;
  return (
    <article className="ej" ref={refDoc} aria-label={`Resumen ejecutivo ${m.periodo.etiqueta}`}>
      <header className="ej-cab">
        <div className="ej-marca">{logo && <img src={logo} alt="" />}<div><b>FALCON FARMS</b><span>FINCA TORREMOLINOS</span></div></div>
        <span className="ej-sistema">Sistema Integrado<br />de Gestión</span>
      </header>
      <section className="ej-banda">
        <small>Resumen ejecutivo</small>
        <h1>{m.periodo.titulo.replace('Resumen ', 'Resumen ')} · {m.periodo.etiqueta}</h1>
        <span className={`ej-titular ej-${t.tono}`}><i className={`fa-solid ${t.icono}`}></i> {t.texto}</span>
      </section>
      <div className="ej-cuerpo">
        <p className="ej-saludo"><b>Cordial saludo.</b> Este es el resumen ejecutivo de {m.periodo.tipo === 'mensual' ? 'el mes' : 'la operación'}: producción, equipos, calidad, clasificación y lo que requiere atención. Se genera solo con los datos cargados en TMControl.</p>
        {m.indicadores.length > 0 && <div className="ej-kpis">{m.indicadores.map((k, i) => (
          <div key={k.id} className="ej-kpi" style={{ '--i': i }}>
            <span className="ej-kpi-ic"><i className={`fa-solid ${k.icono}`}></i></span>
            <small>{k.etq}</small><b>{k.valor}</b><em>{k.sub}</em>
            {k.d && <i className={`ej-fl ej-fl-${k.d.clase}`}>{k.d.txt}</i>}
            {k.aro != null && <Aro pct={k.aro} />}
          </div>))}</div>}
        <Seccion icono="fa-newspaper" titulo="Panorama general" i={0}>{m.narrativa.map(n => <p key={n.id} className="ej-parr"><i className={`fa-solid ${n.icono}`}></i><span><b>{n.titulo}.</b> {n.texto}</span></p>)}</Seccion>
        {m.porDia.length > 0 && <Seccion icono="fa-chart-column" titulo="Producción por día" i={1}><Barras dias={m.porDia} meta={m.metaDia} /></Seccion>}
        {m.equipos.length > 0 && <Seccion icono="fa-people-group" titulo="Desempeño por equipos" i={2}><Equipos lista={m.equipos} /></Seccion>}
        {(m.causas.length > 0 || m.lineas.length > 0) && (
          <div className="ej-dos">
            {m.causas.length > 0 && <Seccion icono="fa-rotate-left" titulo="Causas de devolución" i={3}><BarrasH filas={m.causas.map(c => ({ n: c.nombre, v: c.cantidad, x: `${Math.round(c.pct * 100)} %` }))} color="#D4473A" /></Seccion>}
            {m.lineas.length > 0 && <Seccion icono="fa-boxes-stacked" titulo="Clasificación por línea" i={4}><BarrasH filas={m.lineas.map(l => ({ n: l.nombre, v: l.tallos, x: `${fmt(l.porHora)}/h` }))} color="#C9932B" /></Seccion>}
          </div>)}
        {m.destacados.length > 0 && <Seccion icono="fa-medal" titulo="Destacados por rendimiento" i={5}><div className="ej-podio">{m.destacados.map((p, i) => <div key={p.nombre} className={`ej-pod p${i + 1}`} style={{ '--i': i }}><span>{i + 1}</span><b>{p.nombre}</b><strong>{fmt(p.rend)}<small> t/h</small></strong><em>{p.dias} días</em></div>)}</div></Seccion>}
        <Seccion icono="fa-list-check" titulo="Conclusiones y recomendaciones" i={6}><ul className="ej-concl">{m.conclusiones.map((x, i) => <li key={i} className={`ej-${x.tono}`}><i className={`fa-solid ${x.icono}`}></i><span>{x.texto}</span></li>)}</ul></Seccion>
        {m.alertas.length > 0 && <Seccion icono="fa-triangle-exclamation" titulo="Estado del sistema y pendientes" i={7}><ul className="ej-concl">{m.alertas.map((a, i) => <li key={i} className={a.severidad === 'critica' ? 'ej-atencion' : 'ej-info'}><i className="fa-solid fa-circle-exclamation"></i><span><b>{a.titulo}.</b> {a.descripcion}</span></li>)}</ul></Seccion>}
        <div className="ej-nota"><b>Nota:</b> este mensaje es informativo y se genera automáticamente con los datos cargados hasta el momento ({m.generado}). Los porcentajes de variación comparan con el período anterior de la misma duración.</div>
        <p className="ej-corto">Cordialmente,</p>
        <footer className="ej-firma">
          <div className="ej-firma-logo">{logo && <img src={logo} alt="" />}<b>FALCON FARMS</b><span>FINCA TORREMOLINOS</span></div>
          <div className="ej-firma-datos">
            <b>{f.nombre}</b><span>{f.cargo}</span><span>{f.empresa} · {f.finca}</span>
            {f.telefono && <p><i className="fa-solid fa-phone"></i>{f.telefono}</p>}
            {f.correo && <p><i className="fa-solid fa-envelope"></i>{f.correo}</p>}
            <p><i className="fa-solid fa-location-dot"></i>{f.ubicacion}</p>
          </div>
        </footer>
        <p className="ej-legal">Este mensaje o cualquier archivo adjunto a éste puede contener información legal, confidencial, privilegiada y/o sensible o relacionada con datos personales, la cual no podrá ser copiada ni reproducida de cualquier manera por su receptor sin autorización expresa y previa de su emisor. Si usted recibe este mensaje por error favor notificarlo al remitente de inmediato y desecharlo de su sistema.</p>
        <p className="ej-pie">Mensaje generado automáticamente por TMControl, Sistema Integrado de Gestión de {f.finca}.</p>
      </div>
    </article>
  );
}
