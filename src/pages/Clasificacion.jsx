import { useEffect, useMemo, useRef, useState } from 'react';
import PageHeader from '../components/PageHeader';
import ClasificacionPanel from '../components/ClasificacionPanel';
import { useSesion } from '../lib/useSesion';
import { puedeEditar } from '../lib/roles';
import {
  fechaLocalISO, formatoFecha, etiquetaHora, minutosAHora, horaAMinutos, etiquetaCortaLinea, nombreLineaClasificacion,
  parsearMovimientosClasificacion, resumirMovimientos,
  getCargaDia, guardarClasificacionDia, getHistoricoClasificacion
} from '../lib/clasificacion';

const fmt = n => (n ?? 0).toLocaleString('es-CO');

export default function Clasificacion() {
  const { sesion } = useSesion();
  const puedeSubir = puedeEditar(sesion?.rol);
  const hoy = fechaLocalISO();
  const fileRef = useRef(null);

  const [fecha, setFecha] = useState(hoy);
  const [archivo, setArchivo] = useState(null);
  const [parseado, setParseado] = useState(null);
  const [modoCorte, setModoCorte] = useState('todo'); // todo | completas | manual
  const [corteManual, setCorteManual] = useState('07:00');
  const [cargaExistente, setCargaExistente] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [refresco, setRefresco] = useState(0);
  const [historico, setHistorico] = useState([]);

  useEffect(() => { getCargaDia(fecha).then(setCargaExistente).catch(() => setCargaExistente(null)); }, [fecha, refresco]);
  useEffect(() => {
    const d = new Date(); d.setDate(d.getDate() - 20);
    getHistoricoClasificacion(fechaLocalISO(d), hoy).then(setHistorico).catch(() => setHistorico([]));
  }, [refresco]);

  const corteMin = useMemo(() => {
    if (!parseado) return null;
    const max = Math.max(...parseado.movimientos.map(m => m.minutos));
    if (modoCorte === 'completas') return Math.floor(max / 60) * 60;
    if (modoCorte === 'manual') return horaAMinutos(corteManual);
    return null;
  }, [parseado, modoCorte, corteManual]);

  const resumen = useMemo(() => {
    if (!parseado) return null;
    const r = resumirMovimientos(parseado.movimientos, corteMin);
    return r.movimientosIncluidos > 0 ? r : { ...r, vacio: true };
  }, [parseado, corteMin]);

  async function elegirArchivo(file) {
    setMensaje(null); setParseado(null); setArchivo(null);
    if (!file) return;
    try {
      setParseado(parsearMovimientosClasificacion(await file.arrayBuffer()));
      setArchivo(file);
      setModoCorte('todo');
    } catch (e) {
      setMensaje({ tipo: 'err', texto: e.message });
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  // Aviso anti-reproceso: subir un reporte MÁS VIEJO que el ya guardado haría perder avance.
  const masViejoQueLoGuardado = cargaExistente && resumen && !resumen.vacio && resumen.corteMin < cargaExistente.corte_min;

  async function guardar() {
    setGuardando(true); setMensaje(null);
    try {
      await guardarClasificacionDia({ fecha, resumen });
      setMensaje({ tipo: 'ok', texto: `Guardado: ${fmt(resumen.totalTallos)} tallos de ${resumen.lineas.length} línea(s) para el ${formatoFecha(fecha)}. El histórico diario se actualizó solo.` });
      setArchivo(null); setParseado(null);
      if (fileRef.current) fileRef.current.value = '';
      setRefresco(k => k + 1);
    } catch (e) {
      setMensaje({ tipo: 'err', texto: e.message });
    } finally {
      setGuardando(false);
    }
  }

  const fechasHistorico = [...new Set(historico.map(h => h.fecha))];
  const lineasHistorico = [...new Set(historico.map(h => h.linea))].sort((a, b) => a - b);

  return (
    <>
      <PageHeader title="Clasificación" subtitle="Tallos movidos hora a hora por línea, comparados con el día anterior." />
      <div className="page">
        {puedeSubir && (
          <section className="step-panel">
            <h3><i className="fa-solid fa-file-arrow-up"></i> Subir reporte de movimiento de clasificación</h3>
            <p style={{ fontSize: 12.5, color: 'var(--gray)', marginBottom: 14 }}>
              Sube el reporte cuantas veces quieras durante el día: cada carga <strong>reemplaza</strong> la anterior de esa fecha (no se suma ni se duplica).
            </p>
            <div className="form-row" style={{ gridTemplateColumns: '1fr 2fr' }}>
              <div>
                <label>Fecha del reporte</label>
                <input type="date" value={fecha} max={hoy} onChange={e => setFecha(e.target.value)} />
              </div>
              <div>
                <label>Archivo (.xls / .xlsx)</label>
                <input ref={fileRef} type="file" accept=".xls,.xlsx" onChange={e => elegirArchivo(e.target.files?.[0])} />
              </div>
            </div>

            {cargaExistente && (
              <div className="alert-inline" style={{ marginTop: 12 }}>
                <i className="fa-solid fa-circle-info"></i>
                Ya hay una carga del {formatoFecha(fecha)}: llega hasta las <strong>{minutosAHora(cargaExistente.corte_min)}</strong> ({cargaExistente.movimientos} movimientos). Al guardar una nueva se reemplaza.
              </div>
            )}

            {parseado && resumen && (
              <>
                <div className="cls-corte">
                  <label>Hora del reporte</label>
                  <div className="fuente-toggle" style={{ marginBottom: 10 }}>
                    <button className={modoCorte === 'todo' ? 'activo' : ''} onClick={() => setModoCorte('todo')}>Todo el archivo</button>
                    <button className={modoCorte === 'completas' ? 'activo' : ''} onClick={() => setModoCorte('completas')}>Solo horas completas</button>
                    <button className={modoCorte === 'manual' ? 'activo' : ''} onClick={() => setModoCorte('manual')}>Elegir hora</button>
                  </div>
                  {modoCorte === 'manual' && (
                    <input type="time" value={corteManual} onChange={e => setCorteManual(e.target.value)} style={{ maxWidth: 160, marginBottom: 8 }} />
                  )}
                  <p className="cls-corte-ayuda">
                    Se registra todo lo que salió <strong>antes</strong> de la hora del reporte. Si el reporte es de las 7:00, se registra hasta las 6:59 y la última hora queda <strong>6 a 7 am</strong> (así un movimiento de las 7:00 no se cuenta como si fuera de la hora anterior).
                  </p>
                </div>

                {resumen.vacio ? (
                  <div className="alert err"><i className="fa-solid fa-circle-exclamation"></i> Con esa hora no queda ningún movimiento. Elige una hora más tarde.</div>
                ) : (
                  <div className="cls-previa">
                    <div><span>Líneas</span><strong>{resumen.lineas.map(etiquetaCortaLinea).join(' · ')}</strong></div>
                    <div><span>Horas</span><strong>{etiquetaHora(resumen.horaInicial)} → {etiquetaHora(resumen.ultimaHora)}</strong></div>
                    <div><span>Tallos</span><strong>{fmt(resumen.totalTallos)}</strong></div>
                    <div><span>Movimientos</span><strong>{resumen.movimientosIncluidos}{resumen.excluidos > 0 ? ` (${resumen.excluidos} quedan fuera)` : ''}</strong></div>
                    <div><span>Última hora</span><strong>{resumen.parcial ? `en curso (${resumen.corteMin % 60} min)` : 'completa'}</strong></div>
                  </div>
                )}

                {parseado?.sinNumero > 0 && !resumen.vacio && (
                  <div className="alert ok" style={{ marginTop: 12 }}>
                    <i className="fa-solid fa-circle-info"></i>
                    {parseado.sinNumero} movimiento(s) vienen de una <strong>mesa sin número</strong> (por ejemplo "supportTable"). Se cuentan como <strong>Support Table</strong>, así el total coincide con el reporte.
                  </div>
                )}

                {masViejoQueLoGuardado && !resumen.vacio && (
                  <div className="alert warn" style={{ marginTop: 12 }}>
                    <i className="fa-solid fa-triangle-exclamation"></i>
                    Este reporte llega hasta las {minutosAHora(resumen.corteMin)}, pero lo guardado llega hasta las {minutosAHora(cargaExistente.corte_min)}. Si lo guardas, <strong>pierdes ese avance</strong>. ¿Seguro que es el archivo correcto?
                  </div>
                )}

                <div style={{ marginTop: 14 }}>
                  <button className="btn-primary" disabled={guardando || resumen.vacio} onClick={guardar}>
                    <i className="fa-solid fa-floppy-disk"></i> {guardando ? 'Guardando…' : masViejoQueLoGuardado ? 'Reemplazar de todos modos' : cargaExistente ? 'Reemplazar carga del día' : 'Guardar clasificación'}
                  </button>
                </div>
              </>
            )}
            {mensaje && <div className={`alert ${mensaje.tipo === 'ok' ? 'ok' : 'err'}`} style={{ marginTop: 14 }}><i className={`fa-solid ${mensaje.tipo === 'ok' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i> {mensaje.texto}</div>}
          </section>
        )}

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2><i className="fa-solid fa-boxes-stacked" style={{ color: 'var(--primary)', marginRight: 8 }}></i>Hora a hora — {formatoFecha(fecha)}</h2>
              <p>El detalle por hora se guarda 4 días (se borra solo a las 5 a.m. del cuarto día siguiente) y puedes compararlo con cualquiera de esos días. El total de cada día queda guardado para siempre en el histórico de abajo.</p>
            </div>
            {!puedeSubir && <input type="date" value={fecha} max={hoy} onChange={e => setFecha(e.target.value)} style={{ maxWidth: 170 }} />}
          </div>
          <ClasificacionPanel fecha={fecha} refresco={refresco} />
        </section>

        {fechasHistorico.length > 0 && (
          <section className="table-panel">
            <div className="panel-header">
              <div>
                <h2><i className="fa-solid fa-clock-rotate-left" style={{ color: 'var(--accent)', marginRight: 8 }}></i>Histórico diario de clasificación</h2>
                <p>Se arma solo con cada carga — tallos movidos por línea en cada día (últimos 20 días).</p>
              </div>
            </div>
            <div className="table-scroll">
              <table>
                <thead><tr><th>Fecha</th>{lineasHistorico.map(l => <th key={l}>{nombreLineaClasificacion(l)}</th>)}<th>Total</th></tr></thead>
                <tbody>
                  {fechasHistorico.map(f => {
                    const filas = historico.filter(h => h.fecha === f);
                    return (
                      <tr key={f}>
                        <td>{formatoFecha(f)}</td>
                        {lineasHistorico.map(l => <td key={l}>{fmt(filas.find(x => x.linea === l)?.total_tallos ?? 0)}</td>)}
                        <td><strong>{fmt(filas.reduce((s, x) => s + x.total_tallos, 0))}</strong></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
