import { COLOR_ESTADO } from './GraficoDias';
import { DIAS_SEMANA } from '../devoluciones/util';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** "Mapa del mes": un calendario donde cada día se pinta según el cumplimiento de la meta; el número rojo es de devoluciones. */
export default function MapaMes({ dias, mesDe, seleccionado, onElegir, hoy }) {
  const [a, m] = [Number(mesDe.slice(0, 4)), Number(mesDe.slice(5, 7))];
  const primero = new Date(Date.UTC(a, m - 1, 1)), total = new Date(Date.UTC(a, m, 0)).getUTCDate();
  const huecos = primero.getUTCDay();
  const porFecha = new Map(dias.map(d => [d.fecha, d]));
  const celdas = [...Array(huecos).fill(null), ...Array.from({ length: total }, (_, i) => `${mesDe.slice(0, 8)}${String(i + 1).padStart(2, '0')}`)];
  return (
    <section className="colab-mapa">
      <header><h4>Mapa del mes</h4><span>{MESES[m - 1]} {a}</span></header>
      <div className="colab-mapa-cab">{DIAS_SEMANA.map(d => <span key={d}>{d.slice(0, 3)}</span>)}</div>
      <div className="colab-mapa-grilla" role="grid" aria-label={`Cumplimiento de la meta, ${MESES[m - 1]} ${a}`}>
        {celdas.map((f, i) => {
          if (!f) return <span key={`h${i}`} className="colab-celda vacia"></span>;
          const d = porFecha.get(f);
          const clic = d?.trabajo;
          const estilo = d?.trabajo ? { background: COLOR_ESTADO[d.estado.css] } : undefined;
          return (
            <button key={f} role="gridcell" className={`colab-celda ${d?.trabajo ? 'trabajo' : ''} ${d ? '' : 'fuera'} ${f === seleccionado ? 'sel' : ''} ${f === hoy ? 'hoy' : ''}`} style={estilo} disabled={!clic} onClick={() => clic && onElegir(f)}
              title={d?.trabajo ? `${f.slice(8)}/${f.slice(5, 7)} · ${Math.round(d.rend)} t/h (${d.pct.toFixed(0)}%)${d.devol ? ` · ${d.devol} devoluciones` : ''}` : d ? 'Sin trabajo' : 'Fuera del período'}>
              <b>{Number(f.slice(8))}</b>
              {d?.trabajo && <small>{Math.round(d.rend)}</small>}
              {d?.devol > 0 && <i className="colab-celda-dev">{d.devol}</i>}
            </button>
          );
        })}
      </div>
      <div className="colab-mapa-leyenda"><span><i style={{ background: COLOR_ESTADO.success }}></i>≥ 100 %</span><span><i style={{ background: COLOR_ESTADO.warning }}></i>90–99 %</span><span><i style={{ background: COLOR_ESTADO.danger }}></i>&lt; 90 %</span><span><i className="gris"></i>sin trabajo</span><span><i className="dev"></i>devoluciones</span></div>
    </section>
  );
}
