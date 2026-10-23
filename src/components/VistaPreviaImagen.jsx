import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { estiloFotoObjeto } from '../lib/imagenBase';

/**
 * Vista previa de una foto TAL CUAL se descargaría: dibuja el mismo HTML que usa la descarga, escalado al ancho disponible
 * (se agranda hasta `escalaMax` para aprovechar pantallas grandes). En pantallas angostas no se encoge más de `escalaMin`: se desliza para leerla.
 * (El HTML lo arman los módulos de imagen, que escapan todo texto de las personas.)
 */
export default function VistaPreviaImagen({ html, ancho = 1120, altoMax = null, escalaMin = 0.5, escalaMax = 1, etiqueta = 'Vista previa de la imagen' }) {
  const marco = useRef(null), interno = useRef(null);
  const [m, setM] = useState({ escala: 1, alto: 0 });
  useLayoutEffect(() => {
    const medir = () => {
      if (!marco.current || !interno.current) return;
      const e = Math.max(escalaMin, Math.min(escalaMax, marco.current.clientWidth / ancho));
      setM(a => { const alto = Math.ceil(interno.current.offsetHeight * e); return a.escala === e && a.alto === alto ? a : { escala: e, alto }; });
    };
    medir();
    const ro = new ResizeObserver(medir); ro.observe(marco.current); ro.observe(interno.current);
    return () => ro.disconnect();
  }, [html, ancho, escalaMin, escalaMax]);
  return (
    <div ref={marco} className="vp-marco" style={altoMax ? { maxHeight: altoMax } : undefined} role="img" aria-label={etiqueta}>
      <div style={{ height: m.alto, width: ancho * m.escala }}>
        <div ref={interno} className="vp-interno" style={{ ...estiloFotoObjeto, width: ancho, transform: `scale(${m.escala})` }} dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}

/** Ventana grande con la vista previa (de un HTML o de una imagen ya capturada) y sus acciones. Se puede pasar a PANTALLA COMPLETA. */
export function ModalVistaImagen({ titulo, html, src, ancho = 1120, acciones = [], pie, onCerrar, inicialCompleta = false }) {
  const [completa, setCompleta] = useState(inicialCompleta);
  useEffect(() => { const k = e => { if (e.key === 'Escape') onCerrar(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onCerrar]);
  return (
    <div className="vb-overlay vp-overlay" role="dialog" aria-modal="true" aria-label={titulo} onMouseDown={e => { if (e.target === e.currentTarget) onCerrar(); }}>
      <div className={`vb-modal vp-modal ${completa ? 'vp-completa' : ''}`}>
        <header>
          <h2><i className="fa-solid fa-eye"></i> {titulo}</h2>
          <div className="vp-cab-botones">
            <button className="vp-expandir" onClick={() => setCompleta(c => !c)} aria-pressed={completa}><i className={`fa-solid ${completa ? 'fa-compress' : 'fa-expand'}`}></i> {completa ? 'Reducir' : 'Pantalla completa'}</button>
            <button className="vb-cerrar" onClick={onCerrar} aria-label="Cerrar"><i className="fa-solid fa-xmark"></i></button>
          </div>
        </header>
        <p className="vp-aviso"><i className="fa-solid fa-circle-info"></i> Así se verá la imagen que descargues.</p>
        <div className="vp-ventana">
          {html ? <VistaPreviaImagen html={html} ancho={ancho} escalaMax={completa ? 3 : 1.7} />
            : src ? <img className="vp-foto" src={src} alt="Vista previa de la imagen" />
            : <p className="rbd-nada"><i className="fa-solid fa-spinner fa-spin"></i> Preparando la vista previa…</p>}
        </div>
        {pie}
        <div className="rs-acciones">
          {acciones.map(a => <button key={a.texto} className={a.primario ? 'btn-primary' : 'btn-secondary'} disabled={a.deshabilitado} onClick={a.onClick}><i className={`fa-solid ${a.icono}`}></i> {a.texto}</button>)}
          <button className="btn-secondary" onClick={onCerrar}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
