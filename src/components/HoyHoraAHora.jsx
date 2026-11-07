import { useEffect, useMemo, useState } from 'react';
import { getHorasPersonaHoy, getConfig } from '../lib/db';
import { evaluarEvolucion, geometriaGrafico } from '../lib/evolucionHoras';
import { useRealtimeRefresco } from '../lib/useRealtimeRefresco';
import Nuevo from './Nuevo';

const fmt = n => Math.round(n).toLocaleString('es-CO');
const COLOR_ESTADO = { success: '#2E8C4E', warning: '#E0A526', danger: '#C0392B' };
const VER = { inicio: { t: 'Primera hora del día', c: '#9AA5A0', i: 'fa-flag' }, mejoro: { t: 'Mejoró', c: '#2E8C4E', i: 'fa-arrow-trend-up' }, empeoro: { t: 'Empeoró', c: '#C0392B', i: 'fa-arrow-trend-down' }, igual: { t: 'Igual', c: '#1F5F8B', i: 'fa-equals' } };
const TEND = { sube: { t: 'Va mejorando', c: 'sube', i: 'fa-arrow-trend-up' }, baja: { t: 'Va bajando', c: 'baja', i: 'fa-arrow-trend-down' }, estable: { t: 'Estable', c: 'estable', i: 'fa-equals' }, pocas: { t: 'Pocas horas aún', c: 'pocas', i: 'fa-hourglass-half' } };

/**
 * «Hoy, hora a hora» (TIC): cómo ha ido el rendimiento de UNA persona durante el turno de hoy, hora por hora, contra la meta.
 * Sirve para ver si viene mejorando o empeorando y en qué hora cambió. Se guarda solo el día de hoy y se reinicia a las 6:00 a. m.
 */
export default function HoyHoraAHora({ persona }) {
  const [filas, setFilas] = useState(null), [meta, setMeta] = useState(470), [sel, setSel] = useState(null), [tick, setTick] = useState(0);
  useRealtimeRefresco(['rendimiento_actual', 'turno_actual_horas'], () => setTick(t => t + 1));
  useEffect(() => { setFilas(null); setSel(null); }, [persona.id]);
  useEffect(() => {
    let vivo = true;
    Promise.all([getHorasPersonaHoy(persona.id), getConfig().catch(() => null)]).then(([f, c]) => { if (!vivo) return; setFilas(f); if (c?.metaHora) setMeta(c.metaHora); }).catch(() => { if (vivo) setFilas(prev => prev ?? []); });
    return () => { vivo = false; };
  }, [persona.id, tick]);
  const ev = useMemo(() => (filas?.length ? evaluarEvolucion(filas, meta) : null), [filas, meta]);
  const g = useMemo(() => (ev ? geometriaGrafico(ev.horas, meta) : null), [ev, meta]);
  const idx = ev ? Math.min(sel ?? ev.horas.length - 1, ev.horas.length - 1) : 0, h = ev?.horas[idx], v = h ? VER[h.veredicto] : null, t = ev ? TEND[ev.tendencia] : null;

  return (
    <section className="hh panel" aria-label="Hoy, hora a hora">
      <header className="hh-cab">
        <div><h2><i className="fa-solid fa-chart-line"></i> Hoy, hora a hora <Nuevo id="hora-a-hora-persona" /></h2><p>Cómo ha ido el rendimiento de <b>{persona.nombre}</b> en el turno de hoy, hora por hora. Toca una hora para ver su detalle. Solo se guarda el día de hoy: a las 6:00 a. m. se reinicia.</p></div>
        {t && <span className={`hh-tend hh-t-${t.c}`}><i className={`fa-solid ${t.i}`}></i> {t.t}</span>}
      </header>
      {filas === null && <p className="hh-vacio"><i className="fa-solid fa-spinner fa-spin"></i> Cargando las horas de hoy…</p>}
      {filas && !ev && <p className="hh-vacio"><i className="fa-solid fa-hourglass-start"></i> Hoy todavía no hay horas cargadas de {persona.nombre}. Aparecen cuando se sube el Turno Actual.</p>}
      {ev && g && (
        <>
          <div className="hh-caja">
            <svg className="hh-svg" viewBox={`0 0 ${g.ancho} ${g.alto}`} role="img" aria-label={`Rendimiento por hora de ${persona.nombre} hoy`}>
              {g.ticks.map(k => <g key={k.v}><line className="hh-rejilla" x1={g.izq} x2={g.der} y1={k.y} y2={k.y} /><text className="hh-eje" x={g.izq - 8} y={k.y + 4} textAnchor="end">{k.v}</text></g>)}
              <path className="hh-area" d={g.area} />
              <line className="hh-meta" x1={g.izq} x2={g.der} y1={g.yMeta} y2={g.yMeta} /><text className="hh-meta-txt" x={g.der} y={g.yMeta - 6} textAnchor="end">Meta {fmt(meta)}</text>
              {g.segmentos.map((s, i) => <line key={i} className="hh-tramo" x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={VER[s.veredicto].c} style={{ '--i': i }} />)}
              {g.puntos.map(p => (
                <g key={p.i} className={`hh-punto ${p.i === idx ? 'on' : ''}`} role="button" tabIndex={0} aria-label={`${p.etiqueta}: ${fmt(p.rend)} tallos por hora`} onClick={() => setSel(p.i)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSel(p.i); } }}>
                  <circle cx={p.x} cy={p.y} r={p.i === idx ? 11 : 7.5} fill={COLOR_ESTADO[p.css] || '#9AA5A0'} />
                  <text className="hh-valor" x={p.x} y={p.y - 15} textAnchor="middle">{fmt(p.rend)}</text>
                  <text className="hh-hora" x={p.x} y={g.alto - 14} textAnchor="middle">{p.corta}</text>
                </g>))}
            </svg>
          </div>
          <div className="hh-leyenda"><span><i style={{ background: '#2E8C4E' }}></i> mejoró</span><span><i style={{ background: '#1F5F8B' }}></i> igual</span><span><i style={{ background: '#C0392B' }}></i> empeoró</span><span className="hh-l-meta"><i></i> meta</span></div>
          <div className="hh-det" aria-live="polite">
            <div><small>Hora</small><b>{h.etiqueta}</b></div>
            <div><small>Rendimiento</small><b>{fmt(h.rend)} <em>t/h</em></b></div>
            <div><small>De la meta</small><b>{Math.round(h.pctMeta)} % <em className={`hh-e hh-e-${h.css}`}>{h.estado}</em></b></div>
            <div><small>Frente a la hora anterior</small><b style={{ color: v.c }}><i className={`fa-solid ${v.i}`}></i> {v.t}{h.cambio != null ? ` ${h.cambio > 0 ? '+' : ''}${Math.round(h.cambio)} %` : ''}</b></div>
            <div><small>Tallos · minutos trabajados</small><b>{fmt(h.tallos)} · {Math.round(h.minutos)} min</b></div>
          </div>
          <ul className="hh-texto">{ev.texto.map((x, i) => <li key={i}>{x}</li>)}</ul>
          {ev.consejo && <p className={`hh-consejo hh-c-${ev.tendencia}`}><i className="fa-solid fa-lightbulb"></i> {ev.consejo}</p>}
        </>)}
    </section>
  );
}
