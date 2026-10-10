import { lazy, Suspense, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getComparacionClasificacion, getUltimaFechaClasificacion, limpiarClasificacionAntigua, etiquetaHora, formatoFecha, nombreLineaClasificacion, LINEA_SUPPORT, minutosAHora, fechaLocalISO } from '../lib/clasificacion';
import { getContextoLineas } from '../lib/lineas';
import { useRealtimeRefresco } from '../lib/useRealtimeRefresco';

const ClasificacionChart = lazy(() => import('./ClasificacionChart'));
const fmt = n => (n ?? 0).toLocaleString('es-CO');
const flecha = n => n > 0 ? `▲ +${fmt(n)}` : n < 0 ? `▼ −${fmt(Math.abs(n))}` : '＝ igual';

/** Barras por hora con su número de hora debajo, el color contra ayer y la marca de la meta por hora. */
function Barras({ celdas, escala, meta }) {
  return (
    <div className="clsd-barras-wrap">
      <div className="clsd-barras">
        {meta ? <span className="clsd-meta-linea" style={{ bottom: `${Math.min(meta / escala, 1) * 100}%` }} title={`Meta: ${fmt(meta)} por hora`}></span> : null}
        {celdas.map(c => (
          <span key={c.hora}
            className={`clsd-barra clsd-${c.estado}`}
            style={{ height: c.estado === 'futuro' ? 3 : `${Math.max(6, (c.hoy / escala) * 100)}%` }}
            title={`${etiquetaHora(c.hora)}: ${c.estado === 'futuro' ? 'todavía no llega' : `${fmt(c.hoy)} tallos${c.estado === 'curso' ? ' (en curso)' : ''} · ayer ${fmt(c.ayer)}`}`}></span>
        ))}
      </div>
      <div className="clsd-etiquetas">{celdas.map(c => <span key={c.hora}>{c.hora}</span>)}</div>
    </div>
  );
}

function Indicador({ icono, etiqueta, valor, sub, chip, estado }) {
  return (
    <div className="clsd-ind">
      <span className="clsd-ind-etiqueta"><i className={`fa-solid ${icono}`}></i> {etiqueta}</span>
      <strong className="clsd-ind-valor">{valor}</strong>
      {sub && <small>{sub}</small>}
      {chip && <span className={`clsd-chip clsd-chip-${estado}`}>{chip}</span>}
    </div>
  );
}

/**
 * Resumen de Clasificación en el Dashboard: cómo va todo el día contra ayer,
 * quién mueve más, y cada línea con su formadora, su ritmo y su meta por hora.
 */
export default function ClasificacionLineasDashboard() {
  const [datos, setDatos] = useState(null);
  const [etiquetas, setEtiquetas] = useState({});
  const [fecha, setFecha] = useState(null);
  const [vacio, setVacio] = useState(false);

  async function cargar() {
    try {
      limpiarClasificacionAntigua().catch(() => {});
      const hoy = fechaLocalISO();
      let f = hoy;
      let d = await getComparacionClasificacion(hoy);
      if (d.vacio) {
        // Si todavía no se subió el de hoy, muestra el último día que sí tenga datos.
        const ultima = await getUltimaFechaClasificacion();
        if (ultima && ultima !== hoy) { f = ultima; d = await getComparacionClasificacion(ultima); }
      }
      setFecha(f); setDatos(d); setVacio(!!d.vacio);
      setEtiquetas(await getContextoLineas(f).catch(() => ({})));
    } catch {
      setVacio(true); // si las tablas aún no existen, el Dashboard sigue normal
    }
  }
  useEffect(() => { cargar(); }, []);
  useRealtimeRefresco(['clasificacion_hora', 'clasificacion_cargas', 'lineas', 'asignaciones_diarias'], cargar);

  if (!datos && !vacio) return null;
  if (vacio || !datos || datos.vacio) {
    return (
      <section className="panel clsd-vacio">
        <i className="fa-solid fa-boxes-stacked"></i>
        <div>
          <strong>Clasificación hora a hora</strong>
          <p>Todavía no hay reportes de clasificación. <Link to="/clasificacion">Sube el reporte</Link> para ver aquí cómo va cada línea contra el día anterior.</p>
        </div>
      </section>
    );
  }

  const t = datos.total;
  const esHoy = fecha === fechaLocalISO();
  const hayAyer = !!datos.fechaAyer;
  const escala = Math.max(1, ...datos.porLinea.flatMap(l => l.celdas.map(c => c.hoy)));
  const hayBase = datos.ultimaCompletaHora >= datos.horas[0];
  const pct = hayAyer && hayBase && t.ayerCompletas > 0 ? Math.round((t.diferencia / t.ayerCompletas) * 1000) / 10 : null;
  const ranking = [...datos.porLinea].sort((a, b) => b.totalHoy - a.totalHoy);
  const competidoras = ranking.filter(l => l.linea !== LINEA_SUPPORT && l.totalHoy > 0);
  const lider = competidoras[0] || null;
  const segunda = competidoras[1] || null;
  const infoLider = lider ? (etiquetas[lider.linea] || {}) : {};
  const iniciales = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase();
  const mejor = lider;

  return (
    <section className="clsd">
      <div className="clsd-cabecera">
        <div>
          <h4><i className="fa-solid fa-boxes-stacked"></i> Clasificación hora a hora</h4>
          <p>
            {esHoy ? 'Hoy' : `Último registro: ${formatoFecha(fecha)}`}
            {datos.cargaHoy && ` · reporte de las ${minutosAHora(datos.cargaHoy.corte_min)}`}
            {datos.parcial && ` · ${etiquetaHora(datos.ultimaHoy)} en curso`}
            {hayAyer ? ` · comparado con ${formatoFecha(datos.fechaAyer)} (horas completas)` : ' · sin día anterior para comparar'}
          </p>
        </div>
        <Link to="/clasificacion" className="btn-secondary"><i className="fa-solid fa-up-right-from-square"></i> Ver detalle</Link>
      </div>

      <div className="clsd-indicadores">
        <Indicador icono="fa-boxes-stacked" etiqueta="Tallos movidos" valor={fmt(t.totalHoy)}
          sub={hayAyer ? `ayer, mismas horas: ${fmt(t.ayerCompletas)} · total del día ${fmt(t.totalAyer)}` : null}
          chip={hayAyer && hayBase ? `${flecha(t.diferencia)}${pct != null ? ` · ${pct > 0 ? '+' : ''}${pct}%` : ''}` : null} estado={t.estado} />
        <Indicador icono="fa-gauge-high" etiqueta="Promedio por hora"
          valor={t.promedioHora != null ? fmt(t.promedioHora) : '—'} sub={`en ${String(t.horasTranscurridas).replace('.', ',')} h de trabajo`} />
        <Indicador icono="fa-bolt" etiqueta="Hora pico" valor={t.pico ? etiquetaHora(t.pico.hora) : '—'} sub={t.pico ? `${fmt(t.pico.tallos)} tallos` : null} />
        <Indicador icono="fa-clock" etiqueta="Última hora completa"
          valor={t.ultimaCompleta ? fmt(t.ultimaCompleta.hoy) : '—'}
          sub={t.ultimaCompleta ? `${etiquetaHora(t.ultimaCompleta.hora)}${hayAyer ? ` · ayer ${fmt(t.ultimaCompleta.ayer)}` : ''}` : 'aún no termina una hora'}
          chip={t.ultimaCompleta && hayAyer ? flecha(t.ultimaCompleta.hoy - t.ultimaCompleta.ayer) : null}
          estado={t.ultimaCompleta ? (t.ultimaCompleta.hoy > t.ultimaCompleta.ayer ? 'mejor' : t.ultimaCompleta.hoy < t.ultimaCompleta.ayer ? 'peor' : 'igual') : 'neutro'} />
      </div>

      {lider && (
        <div className="clsd-lider">
          <span className="clsd-lider-corona" aria-hidden="true">👑</span>
          <div className="clsd-lider-info">
            <small>Línea líder en clasificación</small>
            <h3>{infoLider.nombre || nombreLineaClasificacion(lider.linea)}</h3>
            {infoLider.formadora
              ? <div className="clsd-lider-formadora"><span className="clsd-lider-avatar">{iniciales(infoLider.formadora)}</span><span>Formadora <strong>{infoLider.formadora}</strong></span></div>
              : <div className="clsd-lider-formadora"><span>Sin formadora asignada · asígnala en Líneas</span></div>}
          </div>
          <div className="clsd-lider-cifras">
            <strong>{fmt(lider.totalHoy)}</strong>
            <span>tallos movidos hoy</span>
            {segunda && <em>+{fmt(lider.totalHoy - segunda.totalHoy)} sobre {(etiquetas[segunda.linea] || {}).nombre || nombreLineaClasificacion(segunda.linea)}</em>}
          </div>
          <div className="clsd-lider-cifras clsd-lider-ritmo">
            <strong>{lider.promedioHora != null ? fmt(lider.promedioHora) : '—'}</strong>
            <span>tallos por hora</span>
            {hayAyer && hayBase && <em className={`clsd-lider-chip clsd-chip-${lider.estado}`}>{flecha(lider.diferencia)} vs ayer</em>}
          </div>
        </div>
      )}

      <div className="clsd-cuerpo">
        <div className="clsd-grafica panel">
          <h5><i className="fa-solid fa-chart-line"></i> Tallos acumulados: hoy vs ayer</h5>
          <Suspense fallback={<p style={{ color: 'var(--gray)' }}>Cargando gráfica…</p>}>
            <ClasificacionChart datos={datos} height={230} />
          </Suspense>
        </div>
        <div className="clsd-ranking panel">
          <h5><i className="fa-solid fa-ranking-star"></i> Qué línea mueve más</h5>
          {ranking.map((l, i) => {
            const info = etiquetas[l.linea] || {};
            const parte = t.totalHoy > 0 ? (l.totalHoy / t.totalHoy) * 100 : 0;
            return (
              <div key={l.linea} className={`clsd-rank-fila ${l === lider ? 'clsd-rank-lider' : ''}`}>
                <div className="clsd-rank-top">
                  <span className="clsd-rank-puesto">{l === lider ? '👑' : i + 1}</span>
                  <span className="clsd-rank-nombre">{info.nombre || nombreLineaClasificacion(l.linea)}{info.formadora && <small>{info.formadora}</small>}</span>
                  <strong>{fmt(l.totalHoy)}</strong>
                </div>
                <div className="clsd-rank-barra"><span style={{ width: `${parte}%` }}></span></div>
                <div className="clsd-rank-pie">
                  <span>{Math.round(parte)}% del total</span>
                  {hayAyer && hayBase && <span className={`clsd-chip clsd-chip-${l.estado}`}>{flecha(l.diferencia)} vs ayer</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="clsd-grid">
        {datos.porLinea.map(l => {
          const info = etiquetas[l.linea] || {};
          const metaDia = info.meta_dia;          // meta de TODO el día de esa línea (informativa)
          const uc = l.ultimaCompleta;
          return (
            <Link to="/clasificacion" key={l.linea} className={`clsd-card clsd-card-${l.estado} ${l === lider ? 'clsd-card-lider' : ''}`}>
              {l === lider && <span className="clsd-cinta-lider">👑 Líder</span>}
              <div className="clsd-linea-cab">
                <span className="clsd-card-titulo">{info.nombre || nombreLineaClasificacion(l.linea)}</span>
                {info.formadora && <span className="clsd-formadora"><i className="fa-solid fa-chalkboard-user"></i> {info.formadora}</span>}
              </div>
              <strong className="clsd-numero">{fmt(l.totalHoy)}</strong>
              <span className="clsd-unidad">tallos movidos{l.linea === LINEA_SUPPORT ? ' · mesa sin número' : ''}</span>
              {hayAyer && hayBase && <span className={`clsd-chip clsd-chip-${l.estado}`}>{flecha(l.diferencia)} vs ayer · horas completas</span>}
              <Barras celdas={l.celdas} escala={escala} meta={null} />
              <div className="clsd-meta">
                {uc && <span>Última hora completa ({etiquetaHora(uc.hora)}): <strong>{fmt(uc.hoy)}</strong>{hayAyer ? ` · ayer ${fmt(uc.ayer)}` : ''}</span>}
                <span>Promedio <strong>{l.promedioHora != null ? fmt(l.promedioHora) : '—'}</strong> por hora</span>
                {metaDia > 0 && (
                  <>
                    <span>Meta del día <strong>{fmt(metaDia)}</strong> · lleva <strong>{Math.round((l.totalHoy / metaDia) * 100)}%</strong></span>
                    <div className="clsd-rank-barra"><span style={{ width: `${Math.min((l.totalHoy / metaDia) * 100, 100)}%` }}></span></div>
                  </>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
