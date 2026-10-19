import { Marco } from '../devoluciones/Graficos';
import { DIAS_SEMANA } from '../devoluciones/util';

export const COLOR_ESTADO = { success: '#22A05A', warning: '#E0A43A', danger: '#DC4C5E' };
const dd = iso => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const diaNombre = iso => DIAS_SEMANA[new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10))).getUTCDay()].slice(0, 3);
const fmt = n => Math.round(n).toLocaleString('es-CO');

/** Rendimiento día por día: una columna por día (verde cumple · ámbar a punto · rojo por mejorar), la línea de la meta y un punto rojo si hubo devoluciones. */
export default function GraficoDias({ dias, metaHora, promedio, seleccionado, onElegir }) {
  const W = 680, mi = { l: 40, r: 12, t: 22, b: 34 }, H = 230, iw = W - mi.l - mi.r, ih = H - mi.t - mi.b;
  const max = Math.max(metaHora * 1.15, ...dias.map(d => d.rend || 0), 1);
  const paso = iw / Math.max(1, dias.length), ancho = Math.min(34, paso * 0.68);
  const x = i => mi.l + paso * i + paso / 2, y = v => mi.t + ih - (v / max) * ih;
  const cadaN = dias.length > 31 ? 7 : dias.length > 16 ? 2 : 1;
  return (
    <Marco titulo="Rendimiento día por día" className="colab-grafico" leyenda={[{ nombre: 'Cumple la meta', color: COLOR_ESTADO.success }, { nombre: 'A punto', color: COLOR_ESTADO.warning }, { nombre: 'Por mejorar', color: COLOR_ESTADO.danger }, { nombre: 'Devolución (punto rojo)', color: '#C0392B' }, { nombre: 'Meta (línea dorada)', color: 'var(--gold)' }, { nombre: 'Promedio (línea punteada)', color: 'var(--primary)' }]}>
      <svg viewBox={`0 0 ${W} ${H}`} className="gx-svg" role="img" aria-label="Rendimiento día por día">
        {[0, 0.5, 1].map(t => <g key={t}><line x1={mi.l} x2={W - mi.r} y1={mi.t + ih * (1 - t)} y2={mi.t + ih * (1 - t)} className="gx-linea" /><text x={mi.l - 6} y={mi.t + ih * (1 - t) + 4} textAnchor="end" className="gx-texto">{fmt(max * t)}</text></g>)}
        {dias.map((d, i) => (
          <g key={d.fecha} className={`colab-col ${d.fecha === seleccionado ? 'sel' : ''} ${d.trabajo ? 'clicable' : ''}`} onClick={() => d.trabajo && onElegir(d.fecha)}>
            <rect x={x(i) - paso / 2} y={mi.t} width={paso} height={ih + 24} fill="transparent" data-tip={`${diaNombre(d.fecha)} ${dd(d.fecha)} · ${d.trabajo ? `${fmt(d.rend)} t/h (${d.pct.toFixed(0)}% de la meta) · ${fmt(d.tallos)} tallos` : 'sin trabajo'}${d.devol == null ? '' : ` · ${d.devol} devoluciones`}`} />
            {d.trabajo && <rect x={x(i) - ancho / 2} y={y(d.rend)} width={ancho} height={Math.max(2, mi.t + ih - y(d.rend))} rx="5" fill={COLOR_ESTADO[d.estado.css]} className="gx-barra" style={{ animationDelay: `${Math.min(i, 30) * 25}ms` }} pointerEvents="none" />}
            {!d.trabajo && <line x1={x(i) - 4} x2={x(i) + 4} y1={mi.t + ih - 1} y2={mi.t + ih - 1} stroke="var(--borde-fuerte)" strokeWidth="2" strokeLinecap="round" pointerEvents="none" />}
            {d.devol > 0 && <g pointerEvents="none"><circle cx={x(i)} cy={(d.trabajo ? y(d.rend) : mi.t + ih) - 11} r="7" fill="#C0392B" /><text x={x(i)} y={(d.trabajo ? y(d.rend) : mi.t + ih) - 8} textAnchor="middle" className="colab-punto-dev">{d.devol}</text></g>}
            {i % cadaN === 0 && <text x={x(i)} y={H - 14} textAnchor="middle" className="gx-texto" pointerEvents="none">{diaNombre(d.fecha)}</text>}
            {i % cadaN === 0 && <text x={x(i)} y={H - 3} textAnchor="middle" className="gx-texto gx-texto-sub" pointerEvents="none">{dd(d.fecha)}</text>}
            {d.fecha === seleccionado && <rect x={x(i) - paso / 2 + 1} y={mi.t - 4} width={paso - 2} height={ih + 8} rx="6" className="colab-sel" pointerEvents="none" />}
          </g>
        ))}
        <line x1={mi.l} x2={W - mi.r} y1={y(metaHora)} y2={y(metaHora)} className="colab-meta" />
        <text x={W - mi.r} y={y(metaHora) - 5} textAnchor="end" className="colab-meta-texto">Meta {fmt(metaHora)}</text>
        {promedio > 0 && <line x1={mi.l} x2={W - mi.r} y1={y(promedio)} y2={y(promedio)} className="colab-prom" data-tip={`Promedio del período: ${fmt(promedio)} t/h`} />}
      </svg>
    </Marco>
  );
}
