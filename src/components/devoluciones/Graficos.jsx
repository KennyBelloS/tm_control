import { useState } from 'react';
import { fmt } from './util';

/**
 * Gráficos del módulo de Devoluciones, iguales a los del Excel (mismos tipos y colores) pero hechos en SVG:
 * livianos, sin librerías, con el texto y las líneas tomando los colores del tema (claro u oscuro).
 */
export const COLORES = {
  mas: '#C0392B', menos: '#1E8449',               // Top 5: rojo = más devoluciones, verde = menos
  causas: '#2E5E6E', marino: '#1F3864', naranja: '#E67E22', gris: '#7F8C8D',
  formadoras: ['#4672A8', '#AB4744', '#8AA64F', '#725990', '#4299B0', '#DC853E', '#93A9CE', '#7F8C8D', '#2E5E6E', '#C9932B']   // la paleta del Excel
};
const corto = (t, n) => (String(t).length > n ? `${String(t).slice(0, n - 1)}…` : String(t));

export function Marco({ titulo, leyenda, children, className = '' }) {
  const [tip, setTip] = useState(null);
  // Tooltip propio: sigue al cursor y atenúa lo demás (mejor que el texto emergente del navegador, que tarda y no se puede dar formato)
  const mover = e => {
    const el = e.target.closest?.('[data-tip]');
    if (!el) { if (tip) setTip(null); return; }
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ texto: el.getAttribute('data-tip'), x: e.clientX - r.left, y: e.clientY - r.top });
  };
  return (
    <figure className={`gx ${tip ? 'gx-hover' : ''} ${className}`} onPointerMove={mover} onPointerLeave={() => setTip(null)}>
      {titulo && <figcaption>{titulo}</figcaption>}
      {children}
      {leyenda && <div className="gx-leyenda">{leyenda.map(l => <span key={l.nombre}><i style={{ background: l.color }}></i>{l.nombre}</span>)}</div>}
      {tip && <div className="gx-tip" style={{ left: tip.x, top: tip.y }} role="tooltip">{tip.texto}</div>}
    </figure>
  );
}
function Ejes({ W, mi, ih, max, formato }) {
  return [0, 0.5, 1].map(t => (
    <g key={t}>
      <line x1={mi.l} x2={W - mi.r} y1={mi.t + ih * (1 - t)} y2={mi.t + ih * (1 - t)} className="gx-linea" />
      <text x={mi.l - 6} y={mi.t + ih * (1 - t) + 4} textAnchor="end" className="gx-texto">{formato(Math.round(max * t * 10) / 10)}</text>
    </g>
  ));
}

/** Barras verticales (el Top 5 de más y menos devoluciones). datos = [{ etq, valor, titulo }] */
export function BarrasVerticales({ titulo, datos, color, formato = fmt, alto = 150 }) {
  const W = 360, mi = { l: 30, r: 8, t: 20, b: 24 }, H = alto, iw = W - mi.l - mi.r, ih = H - mi.t - mi.b;
  const max = Math.max(1, ...datos.map(d => d.valor));
  if (!datos.length) return <Marco titulo={titulo}><p className="gx-vacio">Sin datos</p></Marco>;
  const paso = iw / datos.length, ancho = Math.min(46, paso * 0.62), x = i => mi.l + paso * i + paso / 2, y = v => mi.t + ih - (v / max) * ih;
  return (
    <Marco titulo={titulo}>
      <svg viewBox={`0 0 ${W} ${H + (datos.some(d => d.etq2) ? 12 : 0)}`} className="gx-svg" role="img" aria-label={titulo}>
        <Ejes W={W} mi={mi} ih={ih} max={max} formato={formato} />
        {datos.map((d, i) => (
          <g key={i}>
            <rect x={x(i) - ancho / 2} y={y(d.valor)} width={ancho} height={Math.max(0, mi.t + ih - y(d.valor))} rx="5" fill={color} className="gx-barra" style={{ animationDelay: `${i * 60}ms` }} data-tip={`${d.titulo || d.etq}: ${formato(d.valor)}`}></rect>
            <text x={x(i)} y={y(d.valor) - 5} textAnchor="middle" className="gx-valor">{formato(d.valor)}</text>
            <text x={x(i)} y={H - 7} textAnchor="middle" className={d.etq2 ? 'gx-texto gx-texto-fuerte' : 'gx-texto'}>{corto(d.etq, 10)}</text>
            {d.etq2 && <text x={x(i)} y={H + 5} textAnchor="middle" className="gx-texto gx-texto-sub">{corto(d.etq2, 11)}</text>}
          </g>
        ))}
      </svg>
    </Marco>
  );
}

/** Barras horizontales, con una o varias series (las causas; los defectos de un colaborador: mes contra histórico). filas = [{ etq, valores:[...] }] */
export function BarrasHorizontales({ titulo, filas, series, formato = fmt, anchoEtiqueta = 150 }) {
  const W = 560, alturaFila = 12 * series.length + 12, mi = { l: anchoEtiqueta, r: 52, t: 6, b: 6 }, H = mi.t + mi.b + filas.length * alturaFila, iw = W - mi.l - mi.r;
  const max = Math.max(1, ...filas.flatMap(f => f.valores));
  if (!filas.length) return <Marco titulo={titulo}><p className="gx-vacio">Sin datos</p></Marco>;
  return (
    <Marco titulo={titulo} leyenda={series.length > 1 ? series : null}>
      <svg viewBox={`0 0 ${W} ${H}`} className="gx-svg" role="img" aria-label={titulo}>
        <line x1={mi.l} x2={mi.l} y1={mi.t} y2={H - mi.b} className="gx-linea" />
        {filas.map((f, i) => {
          const y0 = mi.t + i * alturaFila;
          return (
            <g key={f.etq}>
              <text x={mi.l - 8} y={y0 + alturaFila / 2 + 4} textAnchor="end" className="gx-texto">{corto(f.etq, 24)}</text>
              {series.map((s, j) => {
                const v = f.valores[j] || 0, yb = y0 + 6 + j * 12;
                return (
                  <g key={s.nombre}>
                    <rect x={mi.l} y={yb} width={Math.max(v > 0 ? 2 : 0, (v / max) * iw)} height="9" rx="3" fill={s.color} className="gx-barra-h" style={{ animationDelay: `${i * 25}ms` }} data-tip={`${f.etq} · ${s.nombre}: ${formato(v)}`}></rect>
                    <text x={mi.l + (v / max) * iw + 5} y={yb + 8} className="gx-valor-h">{formato(v)}</text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </Marco>
  );
}

/** Línea con puntos (devoluciones por mes; devoluciones por día trabajado). puntos = [{ etq, valor }] */
export function Lineas({ titulo, puntos, color, formato = fmt, alto = 190 }) {
  const W = 360, mi = { l: 40, r: 14, t: 22, b: 26 }, H = alto, iw = W - mi.l - mi.r, ih = H - mi.t - mi.b;
  if (!puntos.length) return <Marco titulo={titulo}><p className="gx-vacio">Sin datos</p></Marco>;
  const max = Math.max(0.1, ...puntos.map(p => p.valor || 0));
  const x = i => mi.l + (puntos.length === 1 ? iw / 2 : (iw * i) / (puntos.length - 1)), y = v => mi.t + ih - (v / max) * ih;
  const trazo = puntos.map((p, i) => `${x(i)},${y(p.valor || 0)}`).join(' ');
  return (
    <Marco titulo={titulo}>
      <svg viewBox={`0 0 ${W} ${H}`} className="gx-svg" role="img" aria-label={titulo}>
        <Ejes W={W} mi={mi} ih={ih} max={max} formato={formato} />
        <polyline points={`${x(0)},${mi.t + ih} ${trazo} ${x(puntos.length - 1)},${mi.t + ih}`} fill={color} opacity=".1" />
        <polyline points={trazo} fill="none" stroke={color} strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" className="gx-trazo" />
        {puntos.map((p, i) => (
          <g key={p.etq}>
            <circle cx={x(i)} cy={y(p.valor || 0)} r="4.5" fill="var(--panel)" stroke={color} strokeWidth="2.5" data-tip={`${p.etq}: ${formato(p.valor || 0)}`}></circle>
            <text x={x(i)} y={y(p.valor || 0) - 9} textAnchor="middle" className="gx-valor">{formato(p.valor || 0)}</text>
            <text x={x(i)} y={H - 7} textAnchor="middle" className="gx-texto">{p.etq}</text>
          </g>
        ))}
      </svg>
    </Marco>
  );
}

/** Columnas apiladas (la semana, día por día, con un color por formadora). series = [{ nombre, color, valores:[...] }] */
export function ColumnasApiladas({ titulo, categorias, series, formato = fmt, alto = 210 }) {
  const W = 520, mi = { l: 34, r: 10, t: 22, b: 26 }, H = alto, iw = W - mi.l - mi.r, ih = H - mi.t - mi.b;
  const totales = categorias.map((_, i) => series.reduce((s, x) => s + (x.valores[i] || 0), 0));
  const max = Math.max(1, ...totales);
  const paso = iw / categorias.length, ancho = Math.min(52, paso * 0.62), x = i => mi.l + paso * i + paso / 2, y = v => mi.t + ih - (v / max) * ih;
  return (
    <Marco titulo={titulo} leyenda={series.map(s => ({ nombre: s.nombre, color: s.color }))}>
      <svg viewBox={`0 0 ${W} ${H}`} className="gx-svg" role="img" aria-label={titulo}>
        <Ejes W={W} mi={mi} ih={ih} max={max} formato={formato} />
        {categorias.map((c, i) => {
          let acum = 0;
          return (
            <g key={c}>
              {series.map(s => {
                const v = s.valores[i] || 0; if (!v) return null;
                const y1 = y(acum + v), alto1 = y(acum) - y1; acum += v;
                return <rect key={s.nombre} x={x(i) - ancho / 2} y={y1} width={ancho} height={alto1} fill={s.color} className="gx-barra" data-tip={`${c} · ${s.nombre}: ${formato(v)}`}></rect>;
              })}
              {totales[i] > 0 && <text x={x(i)} y={y(totales[i]) - 5} textAnchor="middle" className="gx-valor">{formato(totales[i])}</text>}
              <text x={x(i)} y={H - 7} textAnchor="middle" className="gx-texto">{c}</text>
            </g>
          );
        })}
      </svg>
    </Marco>
  );
}

/** Columnas agrupadas (Semana A contra Semana B, por formadora). */
export function ColumnasAgrupadas({ titulo, categorias, series, formato = fmt, alto = 210 }) {
  const W = 520, mi = { l: 34, r: 10, t: 22, b: 30 }, H = alto, iw = W - mi.l - mi.r, ih = H - mi.t - mi.b;
  const max = Math.max(1, ...series.flatMap(s => s.valores));
  const paso = iw / categorias.length, ancho = Math.min(26, (paso * 0.74) / series.length), x = (i, j) => mi.l + paso * i + paso / 2 + (j - (series.length - 1) / 2) * (ancho + 2), y = v => mi.t + ih - (v / max) * ih;
  return (
    <Marco titulo={titulo} leyenda={series.map(s => ({ nombre: s.nombre, color: s.color }))}>
      <svg viewBox={`0 0 ${W} ${H}`} className="gx-svg" role="img" aria-label={titulo}>
        <Ejes W={W} mi={mi} ih={ih} max={max} formato={formato} />
        {categorias.map((c, i) => (
          <g key={c}>
            {series.map((s, j) => { const v = s.valores[i] || 0; return (
              <g key={s.nombre}>
                <rect x={x(i, j) - ancho / 2} y={y(v)} width={ancho} height={Math.max(0, mi.t + ih - y(v))} rx="4" fill={s.color} className="gx-barra" data-tip={`${c} · ${s.nombre}: ${formato(v)}`}></rect>
                {v > 0 && <text x={x(i, j)} y={y(v) - 4} textAnchor="middle" className="gx-valor gx-valor-chico">{formato(v)}</text>}
              </g>); })}
            <text x={mi.l + paso * i + paso / 2} y={H - 9} textAnchor="middle" className="gx-texto">{corto(c, 14)}</text>
          </g>
        ))}
      </svg>
    </Marco>
  );
}
