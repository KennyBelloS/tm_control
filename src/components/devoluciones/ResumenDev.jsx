import { fmt, dec, fFecha, fCorta, nombreMes } from './util';
import NumeroAnimado from '../NumeroAnimado';

const FILAS = [
  { k: 'total', et: 'Devoluciones totales', f: fmt, destacada: true },
  { k: 'filas', et: 'Registros con devoluciones', f: fmt, ayuda: 'Filas del Excel con al menos una devolución (las filas vacías no se guardan).' },
  { k: 'personasConDevoluciones', et: 'Personas con devoluciones', f: fmt },
  { k: 'personasAsistieron', et: 'Personas que asistieron', f: fmt },
  { k: 'diasPersona', et: 'Días-persona trabajados', f: fmt },
  { k: 'porDiaTrabajado', et: 'Devoluciones por día trabajado', f: v => dec(v), ayuda: 'Devoluciones ÷ días-persona trabajados. Sirve para comparar períodos con distinta cantidad de gente.' }
];

/** Indicadores de la parte de arriba del Excel: Día · Semana · Mes · Histórico. */
const ACENTOS = { dia: '#C9932B', semana: '#176B3A', mes: '#2563EB', historico: '#1F3864' };

export default function ResumenDev({ resumen, periodos, fecha, calidad, cuadra, primera, diaSinCargar }) {
  const cols = [
    { k: 'dia', et: 'Día', sub: fFecha(periodos.dia.desde).slice(0, 5) },
    { k: 'semana', et: 'Semana', sub: `${fCorta(periodos.semana.desde)} – ${fCorta(periodos.semana.hasta)}` },
    { k: 'mes', et: 'Mes', sub: nombreMes(fecha) },
    { k: 'historico', et: 'Histórico', sub: primera ? `desde ${fCorta(primera)}/${primera.slice(2, 4)}` : '' }
  ];
  return (
    <div className="dev-panel">
      <div className="dev-kpis">
        {cols.map(c => { const r = resumen[c.k]; return (
          <article key={c.k} className="dev-kpi" style={{ '--acento': ACENTOS[c.k] }}>
            <header><span>{c.et}</span><small>{c.sub}</small></header>
            {c.k === 'dia' && diaSinCargar
              ? <><strong className="dev-sin-cargar">—</strong><em>sin cargar</em><footer><span>Este día todavía no tiene devoluciones cargadas</span></footer></>
              : <><strong><NumeroAnimado valor={r.total} /></strong><em>devoluciones</em><footer><span><b>{dec(r.porDiaTrabajado)}</b> por día trabajado</span><span><b>{fmt(r.personasConDevoluciones)}</b> personas con devoluciones</span></footer></>}
          </article>); })}
      </div>
      <div className="dev-tabla-scroll">
        <table className="dev-tabla dev-resumen">
          <thead><tr><th>Indicador</th>{cols.map(c => <th key={c.k} className="num"><span>{c.et}</span><small>{c.sub}</small></th>)}</tr></thead>
          <tbody>
            {FILAS.map(f => (
              <tr key={f.k} className={f.destacada ? 'dev-fila-destacada' : ''}>
                <td title={f.ayuda}>{f.et}{f.ayuda && <i className="fa-regular fa-circle-question dev-ayuda"></i>}</td>
                {cols.map(c => <td key={c.k} className="num">{c.k === 'dia' && diaSinCargar ? '—' : f.f(resumen[c.k][f.k])}</td>)}
              </tr>
            ))}
            <tr><td>Cuadre (suma por tipo = total)</td>{cols.map(c => <td key={c.k} className={`num ${cuadra[c.k] ? 'dev-ok' : 'dev-mal'}`}>{cuadra[c.k] ? '✔ Cuadra' : '✗ No cuadra'}</td>)}</tr>
          </tbody>
        </table>
      </div>
      {calidad.registros > 0 && (
        <p className="dev-nota dev-nota-aviso"><i className="fa-solid fa-triangle-exclamation"></i> {fmt(calidad.registros)} registros ({fmt(calidad.devoluciones)} devoluciones) son de días en que la persona <b>no tiene asistencia</b>; esas devoluciones cuentan, pero ese día no suma como día trabajado.</p>
      )}
    </div>
  );
}
