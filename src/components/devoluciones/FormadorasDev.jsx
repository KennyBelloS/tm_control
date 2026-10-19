import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { cargarAtribuidor } from '../../lib/devoluciones';
import { devolucionesPorFormadora, periodos as calcularPeriodos, sumarDias } from '../../lib/devolucionesCalculos';
import { fmt, fCorta, DIAS_SEMANA } from './util';
import { ColumnasApiladas, ColumnasAgrupadas, COLORES } from './Graficos';
import { NombreCodigo } from './NombreCodigo';

/**
 * Devoluciones por formadora, según las personas que tenía asignadas cada día (módulo Líneas): la tabla de la semana por día,
 * las columnas apiladas del Excel y el comparador de semanas. Cada persona se empareja por su ID o, si no, por su nombre y código.
 */
export default function FormadorasDev({ datos, fecha, razones, ultima, modo = 'ambos' }) {
  const [ref, setRef] = useState(fecha);
  const [refA, setRefA] = useState(sumarDias(fecha, -7));
  const [atrib, setAtrib] = useState(undefined);
  const nombreRazon = Object.fromEntries(razones.map(r => [r.k, r.n]));
  useEffect(() => { setRef(fecha); setRefA(sumarDias(fecha, -7)); }, [fecha]);
  const P = useMemo(() => calcularPeriodos(ref), [ref]);
  const PA = useMemo(() => calcularPeriodos(refA), [refA]);
  useEffect(() => {
    let vivo = true;
    const desde = [P.semana.desde, PA.semana.desde, P.mes.desde].sort()[0], hasta = [P.semana.hasta, PA.semana.hasta, P.mes.hasta].sort().reverse()[0];
    setAtrib(undefined);
    cargarAtribuidor(datos.personas, desde, hasta).then(a => vivo && setAtrib(a)).catch(() => vivo && setAtrib(null));
    return () => { vivo = false; };
  }, [P.semana.desde, PA.semana.desde, P.mes.desde, datos.personas]);

  const calc = useMemo(() => {
    if (!atrib) return null;
    const sem = devolucionesPorFormadora(datos, datos.personas, P.semana, atrib.quien);
    const semA = devolucionesPorFormadora(datos, datos.personas, PA.semana, atrib.quien);
    const mes = devolucionesPorFormadora(datos, datos.personas, P.mes, atrib.quien);
    const orden = (a, b) => (mes.get(b)?.total || 0) - (mes.get(a)?.total || 0) || (sem.get(b)?.total || 0) - (sem.get(a)?.total || 0);
    const ids = [...new Set([...sem.keys(), ...mes.keys()])].filter(k => k !== 'sin').sort(orden);
    const columnas = [...ids, ...(sem.has('sin') || mes.has('sin') ? ['sin'] : [])];
    const idsComp = [...new Set([...sem.keys(), ...semA.keys()])].filter(k => k !== 'sin').sort((a, b) => (sem.get(b)?.total || 0) - (sem.get(a)?.total || 0));
    const comp = [...idsComp, ...(sem.has('sin') || semA.has('sin') ? ['sin'] : [])];
    return { sem, semA, mes, columnas, comp };
  }, [atrib, datos, P, PA]);

  if (atrib === undefined) return <div className="dev-panel"><div className="esqueleto" style={{ height: 160 }}></div></div>;
  if (atrib === null) return <div className="dev-panel"><p className="dev-vacio-mini">No se pudieron leer las asignaciones de las formadoras.</p></div>;
  const nombre = k => (k === 'sin' ? 'Sin asignar' : atrib.formadoras.get(k) || `Formadora ${k}`);
  const color = (k, i) => (k === 'sin' ? '#B8BDB9' : COLORES.formadoras[i % COLORES.formadoras.length]);
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(P.semana.desde, i));
  const totalCol = k => calc.sem.get(k)?.total || 0;
  const totA = k => calc.semA.get(k)?.total || 0;
  const sumaA = calc.comp.reduce((s, k) => s + totA(k), 0), sumaB = calc.comp.reduce((s, k) => s + totalCol(k), 0);
  const cambiarA = v => { if (v) setRefA(v); };

  return (
    <div className="dev-panel">
      <div className="dev-sub">
        <div className="dev-semana">
          <button onClick={() => setRef(sumarDias(ref, -7))} aria-label="Semana anterior"><i className="fa-solid fa-chevron-left"></i></button>
          <strong>Semana del {fCorta(P.semana.desde)} al {fCorta(P.semana.hasta)}</strong>
          <button onClick={() => setRef(sumarDias(ref, 7))} aria-label="Semana siguiente"><i className="fa-solid fa-chevron-right"></i></button>
        </div>
        <span className="dev-rango">Según las personas que tenía asignadas cada formadora ese día</span>
      </div>
      {!atrib.hayAsignaciones && <p className="dev-nota dev-nota-aviso"><i className="fa-solid fa-triangle-exclamation"></i> Todavía no hay personas asignadas a formadoras. Asígnalas en <Link to="/lineas">Líneas</Link> y aquí aparecerán sus devoluciones.</p>}

      <div className="dev-dos dev-dos-ancho">
        <div className="dev-tabla-scroll">
          <table className="dev-tabla dev-formadoras">
            <thead><tr><th>Día</th>{calc.columnas.map((k, i) => <th key={k} className="num" style={{ borderBottom: `3px solid ${color(k, i)}` }}>{nombre(k)}</th>)}<th className="num">Total</th></tr></thead>
            <tbody>
              {dias.map((d, i) => {
                const celdas = calc.columnas.map(k => calc.sem.get(k)?.porDia.get(d) || 0);
                const sinCargar = !!ultima && d > ultima;          // día posterior al último cargado: sin números
                return <tr key={d}><td>{DIAS_SEMANA[i]} <small>{fCorta(d)}</small></td>{celdas.map((v, j) => <td key={j} className={`num ${v === 0 || sinCargar ? 'dev-cero' : ''}`}>{sinCargar ? '—' : v === 0 ? '·' : fmt(v)}</td>)}<td className="num">{sinCargar ? <span className="dev-cero">sin cargar</span> : <b>{fmt(celdas.reduce((a, b) => a + b, 0))}</b>}</td></tr>;
              })}
            </tbody>
            <tfoot><tr><td>TOTAL SEMANA</td>{calc.columnas.map(k => <td key={k} className="num">{fmt(totalCol(k))}</td>)}<td className="num">{fmt(calc.columnas.reduce((s, k) => s + totalCol(k), 0))}</td></tr></tfoot>
          </table>
        </div>
        <ColumnasApiladas titulo="Semana elegida — devoluciones por día" categorias={DIAS_SEMANA.map(d => d.slice(0, 3))}
          series={calc.columnas.map((k, i) => ({ nombre: nombre(k), color: color(k, i), valores: dias.map(d => calc.sem.get(k)?.porDia.get(d) || 0) }))} />
      </div>

      <h4 className="dev-titulo-mini">Comparador de semanas por formadora</h4>
      <div className="dev-sub">
        <label className="dev-comp-a">Semana A <input type="date" value={refA} onChange={e => cambiarA(e.target.value)} /> <span>{fCorta(PA.semana.desde)} al {fCorta(PA.semana.hasta)}</span></label>
        <span className="dev-rango">Semana B = la elegida arriba ({fCorta(P.semana.desde)} al {fCorta(P.semana.hasta)})</span>
      </div>
      <div className="dev-dos dev-dos-ancho">
        <div className="dev-tabla-scroll">
          <table className="dev-tabla">
            <thead><tr><th>Formadora</th><th className="num">Semana A</th><th className="num">Semana B</th><th className="num">Dif. (B − A)</th></tr></thead>
            <tbody>
              {calc.comp.map(k => { const d = totalCol(k) - totA(k); return (
                <tr key={k}><td>{nombre(k)}</td><td className="num">{fmt(totA(k))}</td><td className="num">{fmt(totalCol(k))}</td><td className={`num ${d > 0 ? 'dev-mal' : d < 0 ? 'dev-ok' : 'dev-cero'}`}><b>{d > 0 ? '+' : ''}{fmt(d)}</b></td></tr>); })}
            </tbody>
            <tfoot><tr><td>TOTAL</td><td className="num">{fmt(sumaA)}</td><td className="num">{fmt(sumaB)}</td><td className={`num ${sumaB - sumaA > 0 ? 'dev-mal' : sumaB - sumaA < 0 ? 'dev-ok' : ''}`}>{sumaB - sumaA > 0 ? '+' : ''}{fmt(sumaB - sumaA)}</td></tr></tfoot>
          </table>
          <p className="dev-pie">Diferencia positiva (rojo) = empeoró en la semana B; negativa (verde) = mejoró.</p>
        </div>
        <ColumnasAgrupadas titulo="Semana A vs Semana B" categorias={calc.comp.map(nombre)} series={[{ nombre: 'Semana A', color: COLORES.gris, valores: calc.comp.map(totA) }, { nombre: 'Semana B', color: COLORES.marino, valores: calc.comp.map(totalCol) }]} />
      </div>

      <h4 className="dev-titulo-mini">Resumen por formadora</h4>
      <div className="dev-tabla-scroll">
        <table className="dev-tabla">
          <thead><tr><th>Formadora</th><th className="num">Semana</th><th className="num">Mes</th><th>Persona con más devoluciones (mes)</th><th>Razón principal (mes)</th></tr></thead>
          <tbody>
            {calc.columnas.map(k => { const m = calc.mes.get(k), s = calc.sem.get(k); return (
              <tr key={k}>
                <td><b>{nombre(k)}</b></td><td className="num">{fmt(s?.total || 0)}</td><td className="num">{fmt(m?.total || 0)}</td>
                <td>{m?.top ? <><NombreCodigo nombre={m.top.nombre} codigo={m.top.codigo} modo={modo} /> <b>{fmt(m.top.devol)}</b></> : '—'}</td>
                <td>{m?.razonPrincipal ? <>{nombreRazon[m.razonPrincipal[0]] || m.razonPrincipal[0]} <b>{fmt(m.razonPrincipal[1])}</b></> : '—'}</td>
              </tr>); })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
