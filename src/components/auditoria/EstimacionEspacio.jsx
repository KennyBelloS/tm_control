import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { estimarEspacio } from '../../lib/espacioDatos';
import { textoPlazo } from '../../lib/espacioProyeccion';

const hoyISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const mesAnio = iso => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }) : null);
const mb = n => (n >= 100 ? Math.round(n).toLocaleString('es-CO') : n.toFixed(n < 10 ? 2 : 1).replace('.', ','));
const COLORES = ['#166534', '#C9932B', '#1F5F8B', '#C0392B', '#6B7C71', '#8E5AA8'];
const TEXTO_NIVEL = { ok: 'Hay espacio de sobra', atencion: 'Conviene planear', urgente: 'Hay que actuar pronto', critico: 'Espacio casi agotado' };

/** Auditoría: cuándo se llenaría la base de datos al ritmo real de datos nuevos, qué tablas la llenan y qué hacer. */
export default function EstimacionEspacio({ usoMB, limiteMB }) {
  const [r, setR] = useState(null);
  const [error, setError] = useState('');
  const ir = useNavigate();
  useEffect(() => {
    if (!(limiteMB > 0)) return;
    let vivo = true;
    estimarEspacio({ hoy: hoyISO(), usoMB, limiteMB }).then(x => { if (vivo) setR(x); }).catch(e => { if (vivo) setError(e.message || 'No se pudo calcular la estimación.'); });
    return () => { vivo = false; };
  }, [usoMB, limiteMB]);
  if (error) return <section className="panel esp"><p className="rbd-nada">{error}</p></section>;
  if (!r) return <section className="panel esp"><p className="rbd-nada"><i className="fa-solid fa-spinner fa-spin"></i> Calculando cuándo se llenaría la base de datos…</p></section>;
  const p = r.proyeccion, top = p.tablas.slice(0, 6), resto = p.tablas.slice(6).reduce((s, t) => s + t.pct, 0);
  return (
    <section className={`panel esp esp-${p.nivel}`} aria-label="Estimación de espacio">
      <div className="panel-header"><div>
        <h2><i className="fa-solid fa-hourglass-half" style={{ color: 'var(--primary)', marginRight: 8 }}></i>¿Cuándo se llena la base de datos?</h2>
        <p>Se calcula con el ritmo real de datos nuevos de los últimos 60 días{p.aproximada ? ' (aproximado: falta la sección 31 del SQL para el detalle por tabla)' : ''}.</p>
      </div></div>
      <div className="esp-cabeza">
        <div className="esp-titular">
          <span className="esp-nivel">{TEXTO_NIVEL[p.nivel]}</span>
          {p.fechaLlenado
            ? <><strong>A este ritmo se llenaría hacia {mesAnio(p.fechaLlenado)}</strong><span>{textoPlazo(p)}{p.fechaPronto && p.fechaTarde ? ` · entre ${mesAnio(p.fechaPronto)} y ${mesAnio(p.fechaTarde)} según cómo varíe el ritmo` : ''}</span></>
            : <><strong>No se llenaría en los próximos 10 años</strong><span>El crecimiento medido es muy lento.</span></>}
        </div>
        <ul className="esp-datos">
          <li><b>{mb(p.usoMB)} MB</b><span>usados de {mb(p.limiteMB)} ({String(p.pct).replace('.', ',')} %)</span></li>
          <li><b>{mb(p.restanteMB)} MB</b><span>libres</span></li>
          <li><b>≈ {mb(p.mbPorMes)} MB</b><span>entran cada mes</span></li>
        </ul>
      </div>
      {top.length > 0 && (
        <div className="esp-tablas">
          <h3>Qué la llena</h3>
          <div className="esp-barra" role="img" aria-label="Reparto del espacio por tabla">{top.map((t, i) => <i key={t.tabla} style={{ width: `${t.pct * 100}%`, background: COLORES[i] }} title={`${t.hoja}: ${Math.round(t.pct * 100)} %`}></i>)}{resto > 0 && <i style={{ width: `${resto * 100}%`, background: '#C9CFCB' }}></i>}</div>
          <ul>{top.map((t, i) => <li key={t.tabla}><i style={{ background: COLORES[i] }}></i><span>{t.hoja}</span><b>{mb(t.mb)} MB</b><small>{Math.round(t.pct * 100)} %{t.mbPorMes > 0.05 ? ` · +${mb(t.mbPorMes)} MB/mes` : ''}</small></li>)}</ul>
        </div>
      )}
      <div className="esp-consejos">
        <h3>Consejos para no quedarse sin espacio</h3>
        {r.consejos.map(c => (
          <article key={c.titulo} className={`esp-consejo p${c.prioridad}`}>
            <span className="esp-consejo-icono"><i className={`fa-solid ${c.icono}`}></i></span>
            <div><strong>{c.titulo}</strong><p>{c.texto}</p></div>
            {c.ruta && c.ruta !== '/auditoria' && <button className="btn-secondary" onClick={() => ir(c.ruta)}>Ir</button>}
          </article>
        ))}
      </div>
    </section>
  );
}
