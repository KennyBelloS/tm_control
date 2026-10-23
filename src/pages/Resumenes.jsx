import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { avisar } from '../lib/avisos';
import { descargarBlob } from '../lib/descargas';
import { svgAPngNavegador } from '../lib/resumenImagenNavegador';
import { periodoResumen, periodoRango } from '../lib/resumenGeneral';
import { armarResumenPantalla, listarFormadoras } from '../lib/resumenesDatos';
import { ModalVistaImagen } from '../components/VistaPreviaImagen';

const hoyISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const sumar = (iso, n) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const CLAVE_FIRMA = 'tm_resumen_firma';
const leerFirma = () => { try { return { remitente: '', finca: 'Finca Torremolinos', ...JSON.parse(localStorage.getItem(CLAVE_FIRMA) || '{}') }; } catch { return { remitente: '', finca: 'Finca Torremolinos' }; } };
const PERIODOS = [['semanal', 'Semana anterior'], ['mensual', 'Mes anterior'], ['ultimos7', 'Últimos 7 días'], ['rango', 'Elegir fechas']];

/** Resúmenes: el resumen general de la finca o el de cada equipo, con imagen y texto, para ver, descargar y copiar. */
export default function Resumenes() {
  const [firma, setFirma] = useState(leerFirma);
  const [formadoras, setFormadoras] = useState([]);
  const [quien, setQuien] = useState('general');                       // 'general' o el id de una formadora
  const [tipo, setTipo] = useState('semanal');
  const [desde, setDesde] = useState(sumar(hoyISO(), -7)), [hasta, setHasta] = useState(sumar(hoyISO(), -1));
  const [res, setRes] = useState(null), [error, setError] = useState(''), [cargando, setCargando] = useState(true), [ampliada, setAmpliada] = useState(false);
  useEffect(() => { listarFormadoras().then(setFormadoras); }, []);
  const periodo = useMemo(() => (tipo === 'mensual' ? periodoResumen('mensual', hoyISO()) : tipo === 'ultimos7' ? periodoRango(sumar(hoyISO(), -7), sumar(hoyISO(), -1), 'Resumen de los últimos 7 días') : tipo === 'rango' ? periodoRango(desde, hasta, 'Resumen') : periodoResumen('semanal', hoyISO())), [tipo, desde, hasta]);
  const destino = useMemo(() => { const f = quien === 'general' ? null : formadoras.find(x => String(x.id) === String(quien)); return f ? { formadora_id: f.id, nombre: f.nombre } : null; }, [quien, formadoras]);
  useEffect(() => {
    if (tipo === 'rango' && (!desde || !hasta || desde > hasta)) { setError('Elige un rango de fechas válido.'); return undefined; }
    let vivo = true; setCargando(true); setError('');
    armarResumenPantalla({ destino, periodo, remitente: firma.remitente, finca: firma.finca })
      .then(r => { if (vivo) setRes(r); }).catch(e => { if (vivo) setError(e.message || 'No se pudo armar el resumen.'); }).finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, [periodo, destino, firma, tipo, desde, hasta]);
  const cambiarFirma = cambio => setFirma(f => { const n = { ...f, ...cambio }; try { localStorage.setItem(CLAVE_FIRMA, JSON.stringify(n)); } catch { /* sin almacenamiento */ } return n; });
  const imagenSvg = res ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(res.svg)}` : '';
  const nombreArchivo = `Resumen TMControl ${periodo.desde}_${periodo.hasta}${destino ? ` ${destino.nombre}` : ''}.png`;
  const descargar = async () => { try { descargarBlob(await svgAPngNavegador(res.svg, res.ancho, res.alto), nombreArchivo); } catch (e) { avisar(e.message, 'error'); } };
  const copiar = async () => { try { await navigator.clipboard.writeText(res.texto); avisar('Texto copiado.'); } catch { avisar('No se pudo copiar.', 'error'); } };

  return (
    <>
      <PageHeader title="Resúmenes" subtitle="El resumen de la finca o de cada equipo: con imagen y texto, para ver, descargar y copiar." />
      <div className="page rs-pagina">
        <section className="panel">
          <div className="rs-controles">
            <label>Resumen de
              <select className="vb-input" value={quien} onChange={e => setQuien(e.target.value)} aria-label="Resumen de">
                <option value="general">General de la finca</option>
                {formadoras.map(f => <option key={f.id} value={f.id}>Equipo de {f.nombre}</option>)}
              </select>
            </label>
            <div className="rs-periodos" role="tablist" aria-label="Período">{PERIODOS.map(([k, t]) => <button key={k} role="tab" aria-selected={tipo === k} className={tipo === k ? 'activo' : ''} onClick={() => setTipo(k)}>{t}</button>)}</div>
          </div>
          {tipo === 'rango' && <div className="rs-fechas"><label>Desde<input type="date" value={desde} max={hoyISO()} onChange={e => setDesde(e.target.value)} /></label><label>Hasta<input type="date" value={hasta} max={hoyISO()} onChange={e => setHasta(e.target.value)} /></label></div>}
          <details className="rs-firma">
            <summary>Firma del resumen (opcional)</summary>
            <div className="rs-form">
              <label>De parte de<input className="vb-input" value={firma.remitente} maxLength={80} placeholder="Ej. Kenny Bello · Gerencia" onChange={e => cambiarFirma({ remitente: e.target.value })} /></label>
              <label>Finca<input className="vb-input" value={firma.finca} maxLength={80} onChange={e => cambiarFirma({ finca: e.target.value })} /></label>
            </div>
            <small className="rs-nota">Se guarda en este equipo y aparece al pie de la imagen y del texto.</small>
          </details>
        </section>
        <section className="panel">
          {error && <div className="alert err"><i className="fa-solid fa-circle-exclamation"></i> {error}</div>}
          {cargando && !res ? <p className="rbd-nada"><i className="fa-solid fa-spinner fa-spin"></i> Armando el resumen…</p> : res && (
            <>
              <img className="rs-imagen ampliable" alt={`Resumen: ${periodo.etiqueta}`} onClick={() => setAmpliada(true)} title="Clic para verla en pantalla completa" src={imagenSvg} />
              <details className="rs-texto" open><summary>Texto del resumen</summary><pre>{res.texto}</pre></details>
              <div className="rs-acciones">
                <button className="btn-primary" onClick={descargar}><i className="fa-solid fa-image"></i> Descargar imagen</button>
                <button className="btn-secondary" onClick={() => setAmpliada(true)}><i className="fa-solid fa-expand"></i> Pantalla completa</button>
                <button className="btn-secondary" onClick={copiar}><i className="fa-solid fa-copy"></i> Copiar texto</button>
              </div>
            </>
          )}
        </section>
      </div>
      {ampliada && res && <ModalVistaImagen titulo={`Resumen — ${periodo.etiqueta}`} src={imagenSvg} inicialCompleta onCerrar={() => setAmpliada(false)} acciones={[{ texto: 'Descargar imagen', icono: 'fa-image', primario: true, onClick: descargar }]} />}
    </>
  );
}
