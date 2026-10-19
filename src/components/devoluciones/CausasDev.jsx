import { fmt } from './util';
import { BarrasHorizontales, COLORES } from './Graficos';

/** Devoluciones por tipo de defecto: la tabla de períodos y, a su lado, el gráfico "Causas — mes seleccionado" del Excel. */
export default function CausasDev({ datos, diaSinCargar }) {
  const { filas, totales } = datos;
  const principales = [...filas].filter(f => f.mes > 0).sort((a, b) => b.mes - a.mes).slice(0, 3);
  return (
    <div className="dev-panel">
      {principales.length > 0 && (
        <div className="dev-causas-top">
          <span>Más devoluciones este mes:</span>
          {principales.map((f, i) => <b key={f.k} className={`dev-chip dev-chip-${i}`}>{f.nombre} · {Math.round(f.pctMes * 100)}%</b>)}
        </div>
      )}
      <div className="dev-causas">
        <div className="dev-tabla-scroll">
          <table className="dev-tabla">
            <thead><tr><th>Tipo de defecto</th><th className="num">Día</th><th className="num">Semana</th><th className="num">Mes</th><th className="num">Histórico</th><th className="dev-col-pct">% del mes</th></tr></thead>
            <tbody>
              {filas.map(f => (
                <tr key={f.k} className={f.mes === 0 && f.historico === 0 ? 'dev-fila-cero' : ''}>
                  <td>{f.nombre}</td>
                  {['dia', 'semana', 'mes', 'historico'].map(c => <td key={c} className={`num ${f[c] === 0 || (c === 'dia' && diaSinCargar) ? 'dev-cero' : ''}`}>{c === 'dia' && diaSinCargar ? '—' : fmt(f[c])}</td>)}
                  <td className="dev-col-pct"><em>{(f.pctMes * 100).toFixed(0)}%</em></td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td>TOTAL</td>{['dia', 'semana', 'mes', 'historico'].map(c => <td key={c} className="num">{c === 'dia' && diaSinCargar ? '—' : fmt(totales[c])}</td>)}<td className="dev-col-pct"><em>100%</em></td></tr></tfoot>
          </table>
        </div>
        <BarrasHorizontales titulo="Causas — mes seleccionado" filas={filas.map(f => ({ etq: f.nombre, valores: [f.mes] }))} series={[{ nombre: 'Mes', color: COLORES.causas }]} />
      </div>
    </div>
  );
}
