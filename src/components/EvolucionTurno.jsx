import { useEffect, useMemo, useState } from 'react';
import { getHorasTurno } from '../lib/db';
import { evaluarTodos, fusionarHoras, resumenGrupo } from '../lib/evolucionHoras';
import Nuevo from './Nuevo';

const fmt = n => Math.round(n).toLocaleString('es-CO');
const TEND = { baja: { t: 'Va bajando', i: 'fa-arrow-trend-down', c: 'baja' }, sube: { t: 'Va mejorando', i: 'fa-arrow-trend-up', c: 'sube' }, estable: { t: 'Estable', i: 'fa-equals', c: 'estable' }, pocas: { t: 'Pocas horas', i: 'fa-hourglass-half', c: 'pocas' } };
const VER = { inicio: { t: 'Primera hora', i: 'fa-flag', c: 'inicio' }, mejoro: { t: 'Mejoró', i: 'fa-arrow-up', c: 'mejoro' }, empeoro: { t: 'Empeoró', i: 'fa-arrow-down', c: 'empeoro' }, igual: { t: 'Igual', i: 'fa-minus', c: 'igual' } };

/** Barritas, una por hora: la altura es el rendimiento, el color es el estado y la línea punteada es la meta. */
function Barras({ horas, meta }) {
  const max = Math.max(meta * 1.15, ...horas.map(h => h.rend), 1);
  return (
    <div className="ev-barras" aria-hidden="true">
      <i className="ev-meta" style={{ bottom: `${(meta / max) * 100}%` }}></i>
      {horas.map((h, k) => <span key={h.inicio} className={`ev-b ${h.css}`} style={{ '--h': `${Math.max(6, (h.rend / max) * 100)}%`, '--k': k }} title={`${h.etiqueta}: ${fmt(h.rend)} t/h`}></span>)}
    </div>
  );
}

/**
 * Evolución por hora del Turno Actual: a cada persona se le evalúa cómo mejoró o empeoró hora por hora.
 * Las horas quedan guardadas (aunque un reporte nuevo reemplace al anterior) y se borran solas a las 6 a. m. del día siguiente.
 */
export default function EvolucionTurno({ filas, metaHora = 470 }) {
  const [guardadas, setGuardadas] = useState([]), [q, setQ] = useState(''), [filtro, setFiltro] = useState('todas'), [abiertas, setAbiertas] = useState(() => new Set()), [limite, setLimite] = useState(12);
  const [plegada, setPlegada] = useState(() => { try { return localStorage.getItem('tm_ev_plegada') === '1'; } catch { return false; } });
  const alternarSeccion = () => setPlegada(p => { try { localStorage.setItem('tm_ev_plegada', p ? '0' : '1'); } catch { /* sin almacenamiento */ } return !p; });
  useEffect(() => { let v = true; getHorasTurno().then(d => { if (v) setGuardadas(d); }); return () => { v = false; }; }, [filas.length]);
  const lista = useMemo(() => {
    const fechas = new Set(filas.map(f => f.fecha));
    return evaluarTodos(fusionarHoras(filas, guardadas.filter(g => !fechas.size || fechas.has(g.fecha))), metaHora);
  }, [filas, guardadas, metaHora]);
  const g = useMemo(() => resumenGrupo(lista), [lista]);
  const vista = useMemo(() => lista.filter(x => (filtro === 'todas' || x.tendencia === filtro) && (!q.trim() || `${x.nombre} ${x.mesa ?? ''}`.toLowerCase().includes(q.trim().toLowerCase()))), [lista, filtro, q]);
  if (!lista.length) return null;
  const visibles = vista.slice(0, limite), todasAbiertas = visibles.length > 0 && visibles.every(x => abiertas.has(x.id));
  const alternarUna = id => setAbiertas(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const desplegarTodo = () => { setLimite(vista.length); setAbiertas(new Set(vista.map(x => x.id))); };
  const plegarTodo = () => setAbiertas(new Set());
  const Acciones = ({ pos }) => <div className={`ev-acciones ev-acc-${pos}`}><button className="ev-todo" onClick={desplegarTodo} disabled={todasAbiertas && visibles.length === vista.length}><i className="fa-solid fa-angles-down"></i> Desplegar todo</button><button className="ev-todo" onClick={plegarTodo} disabled={abiertas.size === 0}><i className="fa-solid fa-angles-up"></i> Plegar todo</button></div>;
  return (
    <>
    <div className="ev-sep" role="separator"><span><i className="fa-solid fa-chart-line"></i> Evolución del turno</span></div>
    <section className={`ev panel ${plegada ? 'ev-plegada' : ''}`} aria-label="Evolución por hora del turno actual">
      <header className="ev-cab">
        <button className="ev-titulo" onClick={alternarSeccion} aria-expanded={!plegada}><h2><i className="fa-solid fa-chart-line"></i> Evolución por hora <Nuevo id="evolucion-horas" /></h2><i className="fa-solid fa-chevron-down ev-sec-flecha"></i></button>
        {!plegada && <input className="vb-input ev-buscar" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nombre o mesa…" aria-label="Buscar persona" />}
        {!plegada && <p>Cómo ha mejorado o empeorado cada persona hora por hora. Las horas se guardan y el Turno Actual se reinicia solo a las 6:00 a. m.</p>}
      </header>
      {!plegada && <>
      <Acciones pos="arriba" />
      <div className="ev-filtros" role="tablist" aria-label="Filtrar por tendencia">
        {[['todas', 'Todas', lista.length], ['baja', 'Van bajando', g.baja], ['estable', 'Estables', g.estable], ['sube', 'Van mejorando', g.sube], ['pocas', 'Pocas horas', g.pocas]].filter(([k, , n]) => k === 'todas' || n > 0).map(([k, t, n]) => <button key={k} role="tab" aria-selected={filtro === k} className={`${filtro === k ? 'on' : ''} ev-f-${k}`} onClick={() => { setFiltro(k); setLimite(12); }}>{t} <b>{n}</b></button>)}
      </div>
      <ul className="ev-lista">
        {visibles.map(x => {
          const t = TEND[x.tendencia], abierto = abiertas.has(x.id);
          return (
            <li key={x.id} className={`ev-item ev-${t.c} ${abierto ? 'abierto' : ''}`}>
              <button className="ev-fila" onClick={() => alternarUna(x.id)} aria-expanded={abierto}>
                <span className="ev-nombre"><b>{x.nombre}</b><small>{x.mesa != null ? `Mesa ${x.mesa} · ` : ''}{x.horas.length} {x.horas.length === 1 ? 'hora' : 'horas'} · {fmt(x.promedio)} t/h</small></span>
                <Barras horas={x.horas} meta={metaHora} />
                <span className={`ev-chip ev-chip-${t.c}`}><i className={`fa-solid ${t.i}`}></i> {t.t}</span>
                <i className="fa-solid fa-chevron-down ev-flecha"></i>
              </button>
              {abierto && (
                <div className="ev-detalle">
                  <div className="ev-horas">
                    {x.horas.map((h, k) => { const v = VER[h.veredicto]; return (
                      <div key={h.inicio} className={`ev-hora ev-v-${v.c}`} style={{ '--k': k }}>
                        <small>{h.etiqueta}</small><b>{fmt(h.rend)}</b><span>t/h · {Math.round(h.pctMeta)} % de la meta</span>
                        <em className={`ev-ver ev-ver-${v.c}`}><i className={`fa-solid ${v.i}`}></i> {v.t}{h.cambio !== null && h.veredicto !== 'igual' ? ` ${h.cambio > 0 ? '+' : ''}${Math.round(h.cambio)} %` : h.cambio !== null ? ` (${h.cambio > 0 ? '+' : ''}${Math.round(h.cambio)} %)` : ''}</em>
                      </div>); })}
                  </div>
                  <ul className="ev-texto">{x.texto.map((t2, i) => <li key={i}>{t2}</li>)}</ul>
                </div>)}
            </li>);
        })}
      </ul>
      {vista.length === 0 && <p className="ev-vacio">Nadie coincide con ese filtro.</p>}
      {vista.length > limite && <button className="btn-secondary ev-mas" onClick={() => setLimite(l => l + 12)}>Ver más ({vista.length - limite} personas)</button>}
      {vista.length > 3 && <Acciones pos="abajo" />}
      </>}
    </section>
    </>
  );
}
