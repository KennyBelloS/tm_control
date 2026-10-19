import { fmt, dec, mesCorto } from './util';
import { Lineas, COLORES } from './Graficos';

/** Evolución mensual: las dos líneas del Excel (devoluciones por mes y por día trabajado) y su tabla. Solo desde el primer mes con datos. */
export default function TendenciaDev({ serie }) {
  const desde = serie.findIndex(m => m.devol > 0 || m.dias > 0);
  const datos = desde < 0 ? [] : serie.slice(desde);
  if (!datos.length) return <div className="dev-panel"><p className="dev-vacio-mini">Todavía no hay meses con datos.</p></div>;
  return (
    <div className="dev-panel">
      <div className="dev-graficos-2">
        <Lineas titulo="Devoluciones por mes" puntos={datos.map(m => ({ etq: mesCorto(m.mes), valor: m.devol }))} color={COLORES.marino} />
        <Lineas titulo="Devoluciones por día trabajado" puntos={datos.map(m => ({ etq: mesCorto(m.mes), valor: m.porDia ?? 0 }))} color={COLORES.naranja} formato={v => dec(v, v >= 10 ? 1 : 2)} />
      </div>
      <p className="dev-pie">Devol./día = devoluciones ÷ días-persona trabajados. Sirve para comparar meses con distinta cantidad de personal o de días.</p>
      <div className="dev-tabla-scroll">
        <table className="dev-tabla">
          <thead><tr><th>Mes</th><th className="num">Devol.</th><th className="num">Días trab.</th><th className="num">Devol./día</th></tr></thead>
          <tbody>{datos.map(m => <tr key={m.mes}><td>{mesCorto(m.mes)}</td><td className="num">{fmt(m.devol)}</td><td className="num">{fmt(m.dias)}</td><td className="num">{dec(m.porDia)}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
