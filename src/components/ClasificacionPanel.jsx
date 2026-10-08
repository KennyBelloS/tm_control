import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import logo from '../assets/logo-icon.png';
import ClasificacionGrid from './ClasificacionGrid';
import { getComparacionClasificacion, getHistoricoClasificacion, limpiarClasificacionAntigua, etiquetaHora, formatoFecha, minutosAHora } from '../lib/clasificacion';
import { getContextoLineas } from '../lib/lineas';
import { exportarElemento } from '../lib/exportarElemento';
import { useRealtimeRefresco } from '../lib/useRealtimeRefresco';

const ClasificacionChart = lazy(() => import('./ClasificacionChart'));
let limpiezaHecha = false;
const fmt = n => (n ?? 0).toLocaleString('es-CO');

/**
 * Clasificación hora a hora de una fecha, contra el día anterior.
 * Se usa en la pantalla de Clasificación y en Reportes (con descarga).
 */
export default function ClasificacionPanel({ fecha, refresco = 0 }) {
  const [datos, setDatos] = useState(null);
  const [etiquetas, setEtiquetas] = useState({});
  const [respaldo, setRespaldo] = useState([]);
  const [error, setError] = useState(null);
  const [modo, setModo] = useState('hora');
  const [comparar, setComparar] = useState('');
  const [exportando, setExportando] = useState(null);
  const reporteRef = useRef(null);

  async function cargar() {
    try {
      setError(null);
      if (!limpiezaHecha) { limpiezaHecha = true; limpiarClasificacionAntigua().catch(() => {}); }
      const [d, e] = await Promise.all([getComparacionClasificacion(fecha, comparar || null), getContextoLineas(fecha).catch(() => ({}))]);
      setDatos(d);
      setEtiquetas(e);
      setRespaldo(d.vacio ? await getHistoricoClasificacion(fecha, fecha).catch(() => []) : []);
    } catch (err) {
      setError(err.message);
    }
  }
  useEffect(() => { setComparar(''); }, [fecha]);
  useEffect(() => { cargar(); }, [fecha, refresco, comparar]);
  useRealtimeRefresco(['clasificacion_hora', 'clasificacion_cargas'], cargar);

  const kpis = useMemo(() => {
    if (!datos || datos.vacio) return null;
    const t = datos.total;
    return {
      totalHoy: t.totalHoy, ayerCompletas: t.ayerCompletas, totalAyer: t.totalAyer, diferencia: t.diferencia, estado: t.estado,
      pct: t.ayerCompletas > 0 ? Math.round((t.diferencia / t.ayerCompletas) * 1000) / 10 : null,
      pico: t.pico, promedioHora: t.promedioHora, horas: t.horasTranscurridas
    };
  }, [datos]);

  async function descargar(formato) {
    setExportando(formato);
    try { await exportarElemento(reporteRef.current, `clasificacion_${fecha}`, formato); }
    catch (e) { setError(e.message); }
    finally { setExportando(null); }
  }

  if (error) return <div className="alert err"><i className="fa-solid fa-circle-exclamation"></i> {error}</div>;
  if (!datos) return (
    <div className="cls-cargando" aria-label="Cargando clasificación">
      <div className="esqueleto" style={{ height: 78 }}></div>
      <div className="esqueleto" style={{ height: 260, marginTop: 14 }}></div>
    </div>
  );

  if (datos.vacio) {
    return (
      <div className="empty-state" style={{ padding: 30 }}>
        <i className="fa-solid fa-boxes-stacked"></i>
        {respaldo.length > 0 ? (
          <>
            <p style={{ marginBottom: 10 }}><strong>{formatoFecha(fecha)}</strong> ya no tiene el detalle hora a hora (el detalle por hora se conserva 4 días). Esto quedó en el histórico diario:</p>
            {respaldo.map(r => <div key={r.linea}>Línea {r.linea}: <strong>{fmt(r.total_tallos)}</strong> tallos</div>)}
          </>
        ) : (
          <p>Todavía no hay clasificación cargada para {formatoFecha(fecha)}.</p>
        )}
      </div>
    );
  }

  const cargaHoy = datos.cargaHoy;
  const sinHoy = !cargaHoy;
  const hayBase = datos.ultimaCompletaHora >= datos.horas[0];
  const guion = valor => (sinHoy ? '—' : valor);
  return (
    <div className="cls-panel">
      <div className="cls-barra-acciones">
        <div className="fuente-toggle">
          <button className={modo === 'hora' ? 'activo' : ''} onClick={() => setModo('hora')}><i className="fa-solid fa-clock"></i> Por hora</button>
          <button className={modo === 'acumulado' ? 'activo' : ''} onClick={() => setModo('acumulado')}><i className="fa-solid fa-layer-group"></i> Acumulado</button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {datos.fechasPrevias?.length > 0 && (
            <label className="cls-comparar" title="Elige con cuál de los días guardados quieres comparar">
              Comparar con
              <select value={datos.fechaAyer || ''} onChange={e => setComparar(e.target.value)}>
                {datos.fechasPrevias.map(f => <option key={f} value={f}>{formatoFecha(f)}</option>)}
              </select>
            </label>
          )}
          <button className="btn-secondary" disabled={!!exportando} onClick={() => descargar('png')}><i className="fa-solid fa-file-image"></i> {exportando === 'png' ? 'Generando…' : 'Imagen'}</button>
          <button className="btn-secondary" disabled={!!exportando} onClick={() => descargar('pdf')}><i className="fa-solid fa-file-pdf"></i> {exportando === 'pdf' ? 'Generando…' : 'PDF'}</button>
        </div>
      </div>

      {sinHoy && (
        <div className="alert warn" style={{ marginBottom: 12 }}>
          <i className="fa-solid fa-triangle-exclamation"></i>
          <span>Todavía no hay clasificación cargada para el <strong>{formatoFecha(fecha)}</strong>. Se muestra solo el día anterior para que puedas compararlo cuando subas el reporte.</span>
        </div>
      )}
      <div ref={reporteRef} className="cls-reporte">
        <div className="cls-reporte-cabecera">
          <img src={logo} alt="" />
          <div>
            <h3>Clasificación hora a hora</h3>
            <p>
              {formatoFecha(datos.fechaHoy)}{datos.fechaAyer ? ` comparado con ${formatoFecha(datos.fechaAyer)}` : ' — sin día anterior para comparar'}{sinHoy && ' · todavía sin clasificación cargada'}
              {cargaHoy && ` · reporte de las ${minutosAHora(cargaHoy.corte_min)}${datos.parcial ? ` (${etiquetaHora(datos.ultimaHoy)} en curso)` : ''}`}
            </p>
          </div>
        </div>

        {kpis && (
          <div className="cls-kpis">
            <div className="cls-kpi"><span>Tallos movidos hoy</span><strong>{guion(fmt(kpis.totalHoy))}</strong>{!sinHoy && <small>lleva hasta ahora</small>}</div>
            <div className="cls-kpi"><span>Ayer (mismas horas completas)</span><strong>{datos.fechaAyer && !sinHoy && hayBase ? fmt(kpis.ayerCompletas) : '—'}</strong>{datos.fechaAyer && <small>total del día: {fmt(kpis.totalAyer)}</small>}</div>
            <div className={`cls-kpi cls-kpi-${sinHoy || !hayBase ? 'neutro' : kpis.estado}`}>
              <span>Diferencia</span>
              <strong>{datos.fechaAyer && !sinHoy && hayBase ? `${kpis.diferencia > 0 ? '▲ +' : kpis.diferencia < 0 ? '▼ −' : ''}${fmt(Math.abs(kpis.diferencia))}` : '—'}</strong>
              {kpis.pct != null && !sinHoy && hayBase && <small>{kpis.pct > 0 ? '+' : ''}{kpis.pct}% · hasta {etiquetaHora(datos.ultimaCompletaHora)}</small>}
            </div>
            <div className="cls-kpi"><span>Hora pico</span><strong>{kpis.pico ? etiquetaHora(kpis.pico.hora) : '—'}</strong>{kpis.pico && <small>{fmt(kpis.pico.tallos)} tallos</small>}</div>
            <div className="cls-kpi"><span>Promedio por hora</span><strong>{!sinHoy && kpis.promedioHora != null ? fmt(kpis.promedioHora) : '—'}</strong>{!sinHoy && <small>en {String(kpis.horas).replace('.', ',')} h de trabajo</small>}</div>
          </div>
        )}

        <ClasificacionGrid datos={datos} modo={modo} etiquetas={etiquetas} />

        <div className="cls-leyenda">
          <span><i className="cls-punto cls-mejor"></i> Movió más que ayer</span>
          <span><i className="cls-punto cls-peor"></i> Movió menos que ayer</span>
          <span><i className="cls-punto cls-parcial-leyenda"></i> Hora en curso: aún no termina, por eso todavía no se compara</span>
          <span>— Hora que todavía no llega</span>
          <span>Todos los números son datos reales guardados; la diferencia es <strong>hoy − ayer</strong> en las horas completas</span>
        </div>
      </div>

      <div className="cls-grafica">
        <h4><i className="fa-solid fa-chart-line"></i> Tallos movidos acumulados (todas las líneas)</h4>
        <Suspense fallback={<p style={{ color: 'var(--gray)' }}>Cargando gráfica…</p>}>
          <ClasificacionChart datos={datos} />
        </Suspense>
      </div>
    </div>
  );
}
