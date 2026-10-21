import { useEffect, useMemo, useState } from 'react';
import { buscarPersona, seguimientoPersona, normalizarNombre } from '../../lib/devolucionesCalculos';
import { fmt, dec, fFecha } from './util';
import { BarrasHorizontales, COLORES } from './Graficos';
import { NombreCodigo } from './NombreCodigo';
import { defectosPersonaRango, periodosComparar, TIPOS_COMPARACION, causaPrincipalPorDia, causaPrincipalRango } from '../../lib/devolucionesAnalisis';

/** Seguimiento individual: se busca por código (manda) o por parte del nombre. */
export default function ColaboradorDev({ datos, periodos, minimos, razones, diaSinCargar, modo = 'ambos', inicial = '' }) {
  const [texto, setTexto] = useState(inicial);
  const [comparar, setComparar] = useState('mes_historico');        // qué se compara en la gráfica de defectos
  const [rangoDia, setRangoDia] = useState('mes');                    // qué días muestra la tabla de la causa principal por día
  useEffect(() => { if (inicial) setTexto(inicial); }, [inicial]);
  const persona = useMemo(() => buscarPersona(datos.personas, texto), [datos.personas, texto]);
  const sugerencias = useMemo(() => {
    const t = texto.trim();
    if (t.length < 2 || /^\d+$/.test(t)) return [];
    const q = normalizarNombre(t);
    return [...datos.personas.values()].filter(p => normalizarNombre(p.nombre).includes(q)).slice(0, 6);
  }, [datos.personas, texto]);
  const sg = useMemo(() => (persona ? seguimientoPersona(datos, datos.personas, persona.id, periodos, minimos) : null), [persona, datos, periodos, minimos]);
  const nombreRazon = Object.fromEntries(razones.map(r => [r.k, r.n]));
  const reglon = k => ({ dia: 'Día', semana: 'Semana', mes: 'Mes', historico: 'Histórico' }[k]);
  const filasDef = sg ? Object.keys({ ...sg.defectos.semana, ...sg.defectos.mes, ...sg.defectos.historico }).sort((a, b) => (sg.defectos.historico[b] || 0) - (sg.defectos.historico[a] || 0)) : [];
  return (
    <div className="dev-panel">
      <div className="dev-buscar">
        <div className="search"><i className="fa-solid fa-magnifying-glass"></i><input type="text" value={texto} maxLength={60} onChange={e => setTexto(e.target.value)} placeholder="Código (ej. 23) o parte del nombre…" aria-label="Buscar colaborador" /></div>
        {sugerencias.length > 1 && <div className="dev-sugerencias">{sugerencias.map(p => <button key={p.id} onClick={() => setTexto(String(p.codigo ?? p.nombre))}>{modo === 'codigo' ? <span className="dev-codigo">{p.codigo ?? '—'}</span> : modo === 'nombre' ? p.nombre : <>{p.nombre} <span className="dev-codigo">{p.codigo ?? '—'}</span></>}</button>)}</div>}
      </div>
      {!texto.trim() && <p className="dev-vacio-mini"><i className="fa-solid fa-user-magnifying-glass"></i> Escribe un código o un nombre para ver el seguimiento de esa persona.</p>}
      {texto.trim() && !persona && <p className="dev-vacio-mini">No encontré a nadie con “{texto}”.</p>}
      {persona && sg && (
        <>
          <div className="dev-ficha">
            <div className="dev-avatar">{persona.nombre.split(' ').slice(0, 2).map(x => x[0]).join('')}</div>
            <div><h4>{modo === 'codigo' ? `Código ${persona.codigo ?? '—'}` : persona.nombre}</h4><p>{modo === 'nombre' ? persona.nombre : modo === 'codigo' ? persona.nombre : <>Código <b>{persona.codigo ?? '—'}</b></>}{modo === 'nombre' ? <> · código <b>{persona.codigo ?? '—'}</b></> : null} · ID {persona.id} · Última asistencia: <b>{sg.ultimaAsistencia ? fFecha(sg.ultimaAsistencia) : '—'}</b></p></div>
          </div>
          <div className="dev-tabla-scroll">
            <table className="dev-tabla">
              <thead><tr><th>Período</th><th className="num">Devol.</th><th className="num">Días trab.</th><th className="num">Devol./día</th><th className="num">Puesto “más”</th><th className="num">Puesto “menos”</th></tr></thead>
              <tbody>{['dia', 'semana', 'mes', 'historico'].map(k => { const p = sg.periodos[k]; return (
                k === 'dia' && diaSinCargar
                  ? <tr key={k}><td>{reglon(k)}</td><td className="num dev-cero" colSpan={5}>— este día todavía no tiene datos cargados</td></tr>
                  : <tr key={k}><td>{reglon(k)}</td><td className="num"><b>{fmt(p.devol)}</b></td><td className="num">{p.diasTrab}</td><td className="num">{dec(p.porDia)}</td><td className="num">{p.puestoMas}</td><td className={`num ${p.puestoMenos === 'No elegible' ? 'dev-cero' : ''}`}>{p.puestoMenos}</td></tr>); })}</tbody>
            </table>
          </div>
          <p className="dev-pie">Puesto “más”: 1 = el que más devolvió. Puesto “menos”: 1 = el mejor entre los elegibles; “No elegible” = no cumple los días mínimos o está en el Top 5 de “más”.</p>
          {(() => {
            const ref = periodos.dia.desde, pc = periodosComparar(comparar, ref);
            const dA = defectosPersonaRango(datos, persona.id, pc.a.desde, pc.a.hasta), dB = defectosPersonaRango(datos, persona.id, pc.b.desde, pc.b.hasta);
            const claves = [...new Set([...Object.keys(dA.porRazon), ...Object.keys(dB.porRazon)])].filter(k => (dA.porRazon[k] || 0) + (dB.porRazon[k] || 0) > 0).sort((x, y) => ((dA.porRazon[y] || 0) + (dB.porRazon[y] || 0)) - ((dA.porRazon[x] || 0) + (dB.porRazon[x] || 0)));
            const R = periodos[rangoDia] || periodos.mes, filasDia = causaPrincipalPorDia(datos, persona.id, R.desde, R.hasta, razones), principalRango = causaPrincipalRango(datos, persona.id, R.desde, R.hasta, razones);
            const nombre = k => nombreRazon[k] || k.replace(/_/g, ' ');
            return (<>
              <div className="dev-sub dev-comparar">
                <strong>Comparar defectos</strong>
                <div className="fuente-toggle" role="tablist" aria-label="Qué comparar">
                  {TIPOS_COMPARACION.map(([k, n]) => <button key={k} className={comparar === k ? 'activo' : ''} onClick={() => setComparar(k)} role="tab" aria-selected={comparar === k}>{n}</button>)}
                </div>
                <span className="dev-rango">{pc.a.etiqueta} contra {pc.b.etiqueta}</span>
              </div>
              {claves.length === 0 ? <p className="dev-vacio-mini">Esta persona no tiene devoluciones en {pc.a.etiqueta} ni en {pc.b.etiqueta}.</p> : (
                <div className="dev-colab-def">
                  <BarrasHorizontales titulo={`Defectos del colaborador — ${pc.a.etiqueta} vs ${pc.b.etiqueta}`} filas={claves.map(k => ({ etq: nombre(k), valores: [dA.porRazon[k] || 0, dB.porRazon[k] || 0] }))} series={[{ nombre: pc.a.etiqueta, color: COLORES.naranja }, { nombre: pc.b.etiqueta, color: COLORES.marino }]} />
                  <div className="dev-tabla-scroll">
                    <table className="dev-tabla">
                      <thead><tr><th>Tipo de defecto</th><th className="num">{pc.a.etiqueta}</th><th className="num">{pc.b.etiqueta}</th><th className="num">Cambio</th></tr></thead>
                      <tbody>{claves.map(k => { const x = dA.porRazon[k] || 0, y = dB.porRazon[k] || 0, d = x - y; return <tr key={k}><td>{nombre(k)}</td><td className={`num ${x === 0 ? 'dev-cero' : ''}`}>{fmt(x)}</td><td className={`num ${y === 0 ? 'dev-cero' : ''}`}>{fmt(y)}</td><td className={`num ${d > 0 ? 'dev-mal' : d < 0 ? 'dev-ok' : 'dev-cero'}`}>{d > 0 ? '+' : ''}{fmt(d)}</td></tr>; })}</tbody>
                      <tfoot><tr><td>TOTAL</td><td className="num">{fmt(dA.total)}</td><td className="num">{fmt(dB.total)}</td><td className={`num ${dA.total - dB.total > 0 ? 'dev-mal' : dA.total - dB.total < 0 ? 'dev-ok' : ''}`}>{dA.total - dB.total > 0 ? '+' : ''}{fmt(dA.total - dB.total)}</td></tr></tfoot>
                    </table>
                    <p className="dev-pie">Cambio en rojo = más devoluciones que en el otro período; en verde = menos.</p>
                  </div>
                </div>
              )}
              <div className="dev-sub dev-comparar">
                <strong>Causa principal por día</strong>
                <div className="fuente-toggle" role="tablist" aria-label="Días a mostrar">
                  {[['semana', 'Semana'], ['mes', 'Mes'], ['historico', 'Histórico']].map(([k, n]) => <button key={k} className={rangoDia === k ? 'activo' : ''} onClick={() => setRangoDia(k)} role="tab" aria-selected={rangoDia === k}>{n}</button>)}
                </div>
                {principalRango && <span className="dev-chip dev-chip-0">Más frecuente: {principalRango.nombre} · {principalRango.cantidad}</span>}
              </div>
              {filasDia.length === 0 ? <p className="dev-vacio-mini">Sin devoluciones en este período.</p> : (
                <div className="dev-tabla-scroll dev-por-dia">
                  <table className="dev-tabla">
                    <thead><tr><th>Día</th><th className="num">Devol.</th><th>Causa principal</th><th>Otras causas ese día</th></tr></thead>
                    <tbody>{filasDia.map(f => <tr key={f.fecha}><td>{fFecha(f.fecha)}</td><td className="num"><b>{fmt(f.total)}</b></td><td><span className="dev-causa-principal">{f.principal.nombre}</span> <b>{fmt(f.principal.cantidad)}</b></td><td>{f.otras.length ? f.otras.map(o => <span key={o.k} className="dev-chip">{o.nombre} · {o.cantidad}</span>) : <span className="dev-cero">—</span>}</td></tr>)}</tbody>
                  </table>
                </div>
              )}
            </>);
          })()}
        </>
      )}
    </div>
  );
}
