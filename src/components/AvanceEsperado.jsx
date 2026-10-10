import { useEffect, useState } from 'react';
import { etiquetaHora } from '../lib/clasificacionCalculos';
import { Link } from 'react-router-dom';
import { getAvanceEsperado } from '../lib/lineas';
import { useRealtimeRefresco } from '../lib/useRealtimeRefresco';

const fmt = n => Math.round(n ?? 0).toLocaleString('es-CO');
const horasTxt = h => String(h).replace('.', ',');
const nivel = p => (p == null ? 'neutro' : p >= 100 ? 'ok' : p >= 90 ? 'medio' : 'mal');

/** Barra de avance: la marca vertical es el 100 % (lo que debería llevar). */
function Medidor({ pct }) {
  const tope = 130;
  return (
    <span className="avx-barra">
      <i className={`avx-relleno avx-${nivel(pct)}`} style={{ width: `${pct == null ? 0 : Math.min(pct, tope) / tope * 100}%` }}></i>
      <s className="avx-marca" style={{ left: `${100 / tope * 100}%` }} title="100 %: lo que debería llevar"></s>
    </span>
  );
}

/** Cuánto falta para llevar lo que debería (o cuánto va adelante). */
function Falta({ esperado, real }) {
  if (!(esperado > 0)) return <span className="avx-falta avx-t-neutro">—</span>;
  const dif = esperado - real;
  return dif > 0
    ? <span className="avx-falta avx-t-mal">faltan {fmt(dif)}</span>
    : <span className="avx-falta avx-t-ok">+{fmt(-dif)} adelante</span>;
}

function Resumen({ esperado, real, pct, etiquetaReal = 'Llevan' }) {
  const dif = real - esperado;
  return (
    <div className="avx-resumen">
      <div><span>Deberían llevar</span><strong>{fmt(esperado)}</strong></div>
      <div><span>{etiquetaReal}</span><strong>{fmt(real)}</strong></div>
      <div className={`avx-cumple avx-${nivel(pct)}`}>
        <span>Cumplimiento</span>
        <strong>{pct == null ? '—' : `${pct.toFixed(1).replace('.', ',')}%`}</strong>
        {pct != null && <em>{dif >= 0 ? `+${fmt(dif)} por encima` : `faltan ${fmt(-dif)}`}</em>}
      </div>
    </div>
  );
}

/**
 * Cuánto deberían llevar a esta hora, y cómo van: boncheo y clasificación cada uno por su lado,
 * en general y por línea. Se calcula con el último corte cargado (no con el reloj).
 */
export default function AvanceEsperado({ metaHora = 470, hoy }) {
  const [d, setD] = useState(null);
  const [lineaSel, setLineaSel] = useState('todas');
  async function cargar() {
    try { setD(await getAvanceEsperado(metaHora, hoy)); } catch { setD({ boncheo: { disponible: false }, clasificacion: { disponible: false } }); }
  }
  useEffect(() => { cargar(); }, [metaHora, hoy]);
  useRealtimeRefresco(['rendimiento_actual', 'clasificacion_hora', 'clasificacion_cargas', 'asignaciones_diarias', 'metas_linea_mes', 'configuracion'], cargar);
  if (!d) return <div className="esqueleto" style={{ height: 160, marginBottom: 16 }}></div>;
  const b = d.boncheo, c = d.clasificacion;

  return (
    <section className="avx">
      <div className="avx-cabecera">
        <h4><i className="fa-solid fa-bullseye"></i> Cuánto deberían llevar a esta hora</h4>
        <p>Lo esperado es lo que se movería si todos los que están trabajando rindieran 470 por hora durante las horas trabajadas. "Falta" es lo que debería llevar menos lo que lleva, y el cumplimiento compara lo uno con lo otro.</p>
      </div>

      <div className="avx-grid">
        {/* ---------------- BONCHEO ---------------- */}
        <article className="avx-card">
          <header><span className="avx-icono avx-icono-boncheo"><i className="fa-solid fa-seedling"></i></span><div><h5>Boncheo</h5>
            {b.disponible ? <small>{b.personas} personas activas × {d.metaHora}/h × {horasTxt(b.horas)} h</small> : <small>Turno Actual</small>}</div></header>
          {b.disponible ? (
            <>
              <Resumen esperado={b.esperado} real={b.real} pct={b.pct} />
              <Medidor pct={b.pct} />
              <p className="avx-nota">Del {b.inicio} al corte de las {b.corte} (última carga del Turno Actual), sin contar el almuerzo.</p>
              <div className="avx-filas">
                <div className="avx-fila avx-fila-cab"><span>Línea</span><span>Debería</span><span>Llevan</span><span>Falta</span><span>Avance</span></div>
                {b.porLinea.map(l => (
                  <div key={l.id} className="avx-fila">
                    <span className="avx-nombre"><strong>{l.nombre}</strong><small>{l.personas} personas</small></span>
                    <span>{fmt(l.esperado)}</span><span>{fmt(l.real)}</span><Falta esperado={l.esperado} real={l.real} />
                    <span className="avx-avance"><Medidor pct={l.pct} /><b className={`avx-t-${nivel(l.pct)}`}>{l.pct == null ? '—' : `${Math.round(l.pct)}%`}</b></span>
                  </div>
                ))}
                {b.sinAsignar && (
                  <div className="avx-fila avx-fila-suave">
                    <span className="avx-nombre"><strong>Sin línea asignada</strong><small>{b.sinAsignar.personas} personas · <Link to="/lineas">asignar</Link></small></span>
                    <span>{fmt(b.sinAsignar.esperado)}</span><span>{fmt(b.sinAsignar.real)}</span><Falta esperado={b.sinAsignar.esperado} real={b.sinAsignar.real} /><span></span>
                  </div>
                )}
                {b.porLinea.length === 0 && !b.sinAsignar && <p className="avx-nota">Asigna a las personas a una línea en <Link to="/lineas">Líneas</Link> para ver el avance por línea.</p>}
              </div>
            </>
          ) : <p className="avx-vacio"><i className="fa-solid fa-circle-info"></i> Todavía no se ha cargado el Turno Actual de hoy. Esta parte se reinicia cada día.</p>}
        </article>

        {/* ---------------- CLASIFICACIÓN ---------------- */}
        <article className="avx-card">
          <header><span className="avx-icono avx-icono-clasif"><i className="fa-solid fa-boxes-stacked"></i></span><div><h5>Clasificación</h5>
            {c.disponible ? <small>{c.personas} personas activas × {d.metaHora}/h × {horasTxt(c.horas)} h</small> : <small>Reporte hora a hora</small>}</div></header>
          {c.disponible ? (
            <>
              <Resumen esperado={c.esperado} real={c.real} pct={c.pct} etiquetaReal="Han movido" />
              <Medidor pct={c.pct} />
              <p className="avx-nota">
                {c.inicio ? `Del ${c.inicio} ` : ''}al corte del reporte de las {c.corte}, sin contar el almuerzo.
                {!c.conTurno && ' Todavía no hay Turno Actual de hoy: se cuentan las personas asignadas a las líneas.'}
              </p>
              <div className="avx-filas">
                <div className="avx-fila avx-fila-cab"><span>Línea</span><span>Debería</span><span>Ha movido</span><span>Falta</span><span>Avance</span></div>
                {c.lineas.map(l => (
                  <div key={l.linea} className="avx-fila">
                    <span className="avx-nombre">
                      <strong>{l.nombre}</strong>
                      <small>{l.personas > 0 ? `${l.personas} personas${l.formadora ? ` · ${l.formadora}` : ''}` : 'sin personas asignadas'}</small>
                      {l.metaDia != null && <small className="avx-metadia">meta del día {fmt(l.metaDia)} · lleva {Math.round(l.avanceMeta)}%</small>}
                    </span>
                    <span>{l.personas > 0 ? fmt(l.esperado) : '—'}</span>
                    <span>{fmt(l.real)}</span>
                    {l.personas > 0 ? <Falta esperado={l.esperado} real={l.real} /> : <span className="avx-falta avx-t-neutro">—</span>}
                    <span className="avx-avance"><Medidor pct={l.pct} /><b className={`avx-t-${nivel(l.pct)}`}>{l.pct == null ? '—' : `${Math.round(l.pct)}%`}</b></span>
                  </div>
                ))}
              </div>
              {c.sinPersonas.length > 0 && (
                <p className="avx-nota">Para ver cuánto debería llevar {c.sinPersonas.join(', ')}, asigna sus personas en <Link to="/lineas">Líneas</Link>. Lo que mueven ya cuenta en el total.</p>
              )}
            </>
          ) : <p className="avx-vacio"><i className="fa-solid fa-circle-info"></i> Todavía no hay clasificación cargada hoy. <Link to="/clasificacion">Sube el reporte</Link>.</p>}
        </article>
      </div>
    </section>
  );
}
