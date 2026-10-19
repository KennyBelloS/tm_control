import { useEffect, useMemo, useState } from 'react';
import { buscarPersona, seguimientoPersona, normalizarNombre } from '../../lib/devolucionesCalculos';
import { fmt, dec, fFecha } from './util';
import { BarrasHorizontales, COLORES } from './Graficos';
import { NombreCodigo } from './NombreCodigo';

/** Seguimiento individual: se busca por código (manda) o por parte del nombre. */
export default function ColaboradorDev({ datos, periodos, minimos, razones, diaSinCargar, modo = 'ambos', inicial = '' }) {
  const [texto, setTexto] = useState(inicial);
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
          {filasDef.length > 0 && (
            <div className="dev-colab-def">
            <BarrasHorizontales titulo="Defectos del colaborador — mes vs histórico" filas={filasDef.filter(k => (sg.defectos.mes[k] || 0) + (sg.defectos.historico[k] || 0) > 0).map(k => ({ etq: nombreRazon[k] || k.replace(/_/g, ' '), valores: [sg.defectos.mes[k] || 0, sg.defectos.historico[k] || 0] }))} series={[{ nombre: 'Mes', color: COLORES.naranja }, { nombre: 'Histórico', color: COLORES.marino }]} />
            <div className="dev-tabla-scroll">
              <table className="dev-tabla">
                <thead><tr><th>Tipo de defecto</th><th className="num">Semana</th><th className="num">Mes</th><th className="num">Histórico</th></tr></thead>
                <tbody>{filasDef.map(k => <tr key={k}><td>{nombreRazon[k] || k.replace(/_/g, ' ')}</td>{['semana', 'mes', 'historico'].map(c => <td key={c} className={`num ${!(sg.defectos[c][k]) ? 'dev-cero' : ''}`}>{fmt(sg.defectos[c][k] || 0)}</td>)}</tr>)}</tbody>
                <tfoot><tr><td>TOTAL</td>{['semana', 'mes', 'historico'].map(c => <td key={c} className="num">{fmt(Object.values(sg.defectos[c]).reduce((a, b) => a + b, 0))}</td>)}</tr></tfoot>
              </table>
            </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
