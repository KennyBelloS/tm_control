import { useEffect, useMemo, useRef, useState } from 'react';
import PageHeader from '../components/PageHeader';
import ResumenEjecutivo from '../components/resumen/ResumenEjecutivo';
import { avisar } from '../lib/avisos';
import { periodoResumen, periodoRango } from '../lib/resumenGeneral';
import { armarEjecutivo } from '../lib/resumenesDatos';
import { FIRMA_DEFECTO, normalizarFirma, textoEjecutivo } from '../lib/resumenEjecutivo';
import { exportarEjecutivo } from '../lib/exportEjecutivo';

const hoyISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const sumar = (iso, n) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const CLAVE_FIRMA = 'tm_resumen_firma';
const leerFirma = () => { try { const f = JSON.parse(localStorage.getItem(CLAVE_FIRMA) || '{}'); return f && typeof f === 'object' ? f : {}; } catch { return {}; } };      // tal cual se escribió: se limpia solo al dibujar
const PERIODOS = [['semanal', 'Semana anterior'], ['mensual', 'Mes anterior'], ['ultimos7', 'Últimos 7 días'], ['rango', 'Elegir fechas']];
const CAMPOS = [['nombre', 'Nombre'], ['cargo', 'Cargo'], ['correo', 'Correo (opcional)'], ['telefono', 'Teléfono (opcional)'], ['ubicacion', 'Ubicación']];

/** Resúmenes: el resumen EJECUTIVO de todo (finca, equipos, calidad, clasificación y pendientes), como un correo, con firma. Sale solo y se puede descargar. */
export default function Resumenes() {
  const [firma, setFirma] = useState(leerFirma);
  const [tipo, setTipo] = useState('semanal');
  const [desde, setDesde] = useState(sumar(hoyISO(), -7)), [hasta, setHasta] = useState(sumar(hoyISO(), -1));
  const [doc, setDoc] = useState(null), [error, setError] = useState(''), [cargando, setCargando] = useState(true), [bajando, setBajando] = useState(null), [vez, setVez] = useState(0);
  const ref = useRef(null);
  const periodo = useMemo(() => (tipo === 'mensual' ? periodoResumen('mensual', hoyISO()) : tipo === 'ultimos7' ? periodoRango(sumar(hoyISO(), -7), sumar(hoyISO(), -1), 'Resumen de los últimos 7 días') : tipo === 'rango' ? periodoRango(desde, hasta, 'Resumen') : periodoResumen('semanal', hoyISO())), [tipo, desde, hasta]);
  useEffect(() => {
    if (tipo === 'rango' && (!desde || !hasta || desde > hasta)) { setError('Elige un rango de fechas válido.'); return undefined; }
    let vivo = true; setCargando(true); setError('');
    armarEjecutivo({ periodo }).then(d => { if (vivo) setDoc(d); }).catch(e => { if (vivo) setError(e.message || 'No se pudo armar el resumen.'); }).finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, [periodo, tipo, desde, hasta, vez]);
  const cambiarFirma = (k, v) => setFirma(f => { const n = { ...f, [k]: v }; try { localStorage.setItem(CLAVE_FIRMA, JSON.stringify(n)); } catch { /* sin almacenamiento */ } return n; });
  const modelo = useMemo(() => (doc ? { ...doc.modelo, firma: normalizarFirma(firma) } : null), [doc, firma]);
  const nombre = `Resumen ejecutivo TMControl ${periodo.desde}_${periodo.hasta}`;
  const bajar = async formato => { setBajando(formato); try { await exportarEjecutivo(ref.current, nombre, formato); } catch (e) { avisar(e.message || 'No se pudo descargar.', 'error'); } finally { setBajando(null); } };
  const copiar = async () => { try { await navigator.clipboard.writeText(textoEjecutivo(modelo)); avisar('Texto copiado.'); } catch { avisar('No se pudo copiar.', 'error'); } };

  return (
    <>
      <PageHeader title="Resúmenes" subtitle="El resumen ejecutivo de todo: finca, equipos, calidad y pendientes." />
      <div className="page rs-pagina">
        <section className="panel rs-barra">
          <div className="rs-periodos" role="tablist" aria-label="Período">{PERIODOS.map(([k, t]) => <button key={k} role="tab" aria-selected={tipo === k} className={tipo === k ? 'activo' : ''} onClick={() => setTipo(k)}>{t}</button>)}</div>
          {tipo === 'rango' && <div className="rs-fechas"><label>Desde<input type="date" value={desde} max={hoyISO()} onChange={e => setDesde(e.target.value)} /></label><label>Hasta<input type="date" value={hasta} max={hoyISO()} onChange={e => setHasta(e.target.value)} /></label></div>}
          <div className="rs-acciones-barra">
            <button className="btn-primary" disabled={!doc || !!bajando} onClick={() => bajar('png')}><i className="fa-solid fa-image"></i> {bajando === 'png' ? 'Generando…' : 'Descargar imagen'}</button>
            <button className="btn-secondary" disabled={!doc || !!bajando} onClick={() => bajar('pdf')}><i className="fa-solid fa-file-pdf"></i> {bajando === 'pdf' ? 'Generando…' : 'Descargar PDF'}</button>
            <button className="btn-secondary" disabled={!doc} onClick={copiar}><i className="fa-solid fa-copy"></i> Copiar texto</button>
            <button className="btn-secondary" disabled={cargando} onClick={() => setVez(v => v + 1)} title="Volver a leer los datos"><i className={`fa-solid fa-rotate ${cargando ? 'fa-spin' : ''}`}></i> Actualizar</button>
          </div>
          <details className="rs-firma">
            <summary>Firma del resumen</summary>
            <div className="rs-form">{CAMPOS.map(([k, t]) => <label key={k}>{t}<input className="vb-input" value={firma[k] ?? ''} maxLength={k === 'ubicacion' ? 100 : 80} placeholder={FIRMA_DEFECTO[k] || ''} onChange={e => cambiarFirma(k, e.target.value)} /></label>)}</div>
            <small className="rs-nota">Se guarda en este equipo y aparece al final del resumen, como en un correo.</small>
          </details>
        </section>
        {error && <div className="alert err"><i className="fa-solid fa-circle-exclamation"></i> {error}</div>}
        {cargando && !doc ? <div className="ej-cargando"><i className="fa-solid fa-spinner fa-spin"></i> Armando el resumen ejecutivo…</div> : doc && <div className={cargando ? 'rs-actualizando' : ''}><ResumenEjecutivo modelo={modelo} logo={doc.logo} refDoc={ref} /></div>}
      </div>
    </>
  );
}
