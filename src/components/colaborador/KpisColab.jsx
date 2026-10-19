import NumeroAnimado from '../NumeroAnimado';
import { cambio } from '../../lib/colaboradorCalculos';

const dec = (n, d = 1) => (n == null ? '—' : n.toFixed(d).replace('.', ','));

function Delta({ c, sufijo = 'vs. período anterior' }) {
  if (!c) return <small className="colab-delta">{sufijo === '' ? '' : 'sin período anterior'}</small>;
  return <small className={`colab-delta colab-delta-${c.tono}`}><i className={`fa-solid fa-arrow-${c.sube ? 'up' : 'down'}`}></i> {Math.abs(c.pct).toFixed(1).replace('.', ',')}% {sufijo}</small>;
}

/** Los indicadores principales de la persona en el período, con el cambio frente al período anterior. */
export default function KpisColab({ t }) {
  const r = t.resumen, p = t.resumenPrevio;
  const enCurso = t.periodo.hasta > t.ref;          // período sin terminar: los TOTALES no se comparan contra uno completo (sería engañoso)
  const tono = r.estado ? { success: 'ok', warning: 'aviso', danger: 'mal' }[r.estado.css] : 'neutro';
  return (
    <div className="colab-kpis">
      <article className="colab-kpi" style={{ '--acento': '#176B3A' }}>
        <span>Rendimiento promedio</span>
        <strong><NumeroAnimado valor={r.promedioRend} /><em> t/h</em></strong>
        <Delta c={cambio(r.promedioRend, p.promedioRend, true)} />
      </article>
      <article className="colab-kpi" style={{ '--acento': tono === 'ok' ? '#22A05A' : tono === 'aviso' ? '#E0A43A' : '#DC4C5E' }}>
        <span>Cumplimiento de la meta</span>
        <strong>{dec(r.pct)}<em>%</em></strong>
        <small className={`colab-delta colab-delta-${tono}`}>{r.estado?.label || 'Sin datos'} · meta {t.metaHora}</small>
      </article>
      <article className="colab-kpi" style={{ '--acento': '#C9932B' }}>
        <span>Tallos procesados</span>
        <strong><NumeroAnimado valor={r.tallos} /></strong>
        {enCurso ? <small className="colab-delta" title="El período todavía no termina, por eso no se compara con el anterior completo">período en curso · {r.diasTrabajados} día{r.diasTrabajados === 1 ? '' : 's'}</small> : <Delta c={cambio(r.tallos, p.tallos, true)} />}
      </article>
      <article className="colab-kpi" style={{ '--acento': '#2563EB' }}>
        <span>Días trabajados</span>
        <strong><NumeroAnimado valor={r.diasTrabajados} /></strong>
        <small className="colab-delta">cumplió la meta <b>{r.cumplieron}</b> · {r.horas} h reales</small>
      </article>
      <article className="colab-kpi" style={{ '--acento': '#C0392B' }}>
        <span>Devoluciones</span>
        <strong>{r.devolPorDia == null && r.diasConDatosDev === 0 ? '—' : <NumeroAnimado valor={r.devol} />}</strong>
        {r.devolPorDia != null ? <small className="colab-delta"><b>{dec(r.devolPorDia, 2)}</b> por día trabajado</small> : <small className="colab-delta">{t.devolucion.enModulo ? 'aún sin cargar' : 'no está en Devoluciones'}</small>}
      </article>
      <article className="colab-kpi" style={{ '--acento': '#1F3864' }}>
        <span>Puesto en el ranking</span>
        <strong>{t.ranking ? <><NumeroAnimado valor={t.ranking.puesto} /><em> de {t.ranking.total}</em></> : '—'}</strong>
        <small className="colab-delta">por rendimiento promedio</small>
      </article>
    </div>
  );
}
