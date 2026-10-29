import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { estiloFotoObjeto } from '../lib/imagenBase';

const ZMIN = 0.5, ZMAX = 4;
const limitar = z => Math.max(ZMIN, Math.min(ZMAX, Math.round(z * 100) / 100));

/** Zoom de una vista previa: botones (− Ajustar +), pellizco con dos dedos y Ctrl + rueda. zoom 1 = "ajustada al ancho" (se ve entera, sin mover nada). */
function useZoom(ref) {
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const el = ref.current; if (!el) return undefined;
    let d0 = 0, z0 = 1;
    const dist = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const ini = e => { if (e.touches.length === 2) { d0 = dist(e.touches); z0 = zRef.current; } };
    const mov = e => { if (e.touches.length === 2 && d0 > 0) { e.preventDefault(); setZoom(limitar(z0 * (dist(e.touches) / d0))); } };
    const fin = e => { if (e.touches.length < 2) d0 = 0; };
    const rueda = e => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); setZoom(z => limitar(z * (e.deltaY < 0 ? 1.12 : 1 / 1.12))); } };
    el.addEventListener('touchstart', ini, { passive: true }); el.addEventListener('touchmove', mov, { passive: false });
    el.addEventListener('touchend', fin, { passive: true }); el.addEventListener('wheel', rueda, { passive: false });
    return () => { el.removeEventListener('touchstart', ini); el.removeEventListener('touchmove', mov); el.removeEventListener('touchend', fin); el.removeEventListener('wheel', rueda); };
  }, [ref]);
  const zRef = useRef(1); zRef.current = zoom;
  return [zoom, setZoom];
}
function ControlesZoom({ zoom, setZoom }) {
  return (
    <div className="vp-zoom" role="group" aria-label="Zoom de la imagen">
      <button onClick={() => setZoom(z => limitar(z / 1.25))} disabled={zoom <= ZMIN} aria-label="Achicar"><i className="fa-solid fa-minus"></i></button>
      <button className="vp-zoom-pct" onClick={() => setZoom(1)} title="Ajustar al ancho de la pantalla" aria-label="Ajustar a la pantalla">{zoom === 1 ? 'Ajustada' : `${Math.round(zoom * 100)} %`}</button>
      <button onClick={() => setZoom(z => limitar(z * 1.25))} disabled={zoom >= ZMAX} aria-label="Agrandar"><i className="fa-solid fa-plus"></i></button>
    </div>
  );
}

/**
 * Vista previa de una foto TAL CUAL se descargaría: dibuja el mismo HTML que usa la descarga, ajustado al ancho disponible
 * (se ve ENTERA, sin mover nada). Se puede agrandar o achicar con los botones, pellizcando o con Ctrl + rueda.
 * (El HTML lo arman los módulos de imagen, que escapan todo texto de las personas.)
 */
export default function VistaPreviaImagen({ html, ancho = 1120, altoMax = null, escalaMin = 0.2, escalaMax = 1, etiqueta = 'Vista previa de la imagen', zoomable = true }) {
  const marco = useRef(null), interno = useRef(null);
  const [zoom, setZoom] = useZoom(marco);
  const [m, setM] = useState({ ajuste: 1, alto: 0 });
  useLayoutEffect(() => {
    const medir = () => {
      if (!marco.current || !interno.current) return;
      const ajuste = Math.max(escalaMin, Math.min(escalaMax, marco.current.clientWidth / ancho));
      setM(a => (a.ajuste === ajuste && a.alto === interno.current.offsetHeight ? a : { ajuste, alto: interno.current.offsetHeight }));
    };
    medir();
    const ro = new ResizeObserver(medir); ro.observe(marco.current); ro.observe(interno.current);
    return () => ro.disconnect();
  }, [html, ancho, escalaMin, escalaMax]);
  const escala = m.ajuste * zoom;
  return (
    <div className="vp-zona">
      <div ref={marco} className="vp-marco" style={altoMax ? { maxHeight: altoMax } : undefined} role="img" aria-label={etiqueta}>
        <div style={{ height: Math.ceil(m.alto * escala), width: Math.ceil(ancho * escala) }}>
          <div ref={interno} className="vp-interno" style={{ ...estiloFotoObjeto, width: ancho, transform: `scale(${escala})` }} dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </div>
      {zoomable && <ControlesZoom zoom={zoom} setZoom={setZoom} />}
    </div>
  );
}

/** Una imagen ya capturada (PNG o SVG) con el mismo zoom. */
export function ImagenZoom({ src, alt = 'Vista previa de la imagen' }) {
  const marco = useRef(null);
  const [zoom, setZoom] = useZoom(marco);
  return (
    <div className="vp-zona vp-zona-img">
      <div ref={marco} className="vp-marco vp-marco-img"><img className="vp-foto" src={src} alt={alt} style={{ width: `${zoom * 100}%`, maxWidth: 'none' }} /></div>
      <ControlesZoom zoom={zoom} setZoom={setZoom} />
    </div>
  );
}

/** Ventana grande con la vista previa (de un HTML o de una imagen ya capturada) y sus acciones. Se puede pasar a PANTALLA COMPLETA. */
export function ModalVistaImagen({ titulo, html, src, ancho = 1120, acciones = [], pie, onCerrar, inicialCompleta = false }) {
  const [completa, setCompleta] = useState(inicialCompleta);
  useEffect(() => { const k = e => { if (e.key === 'Escape') onCerrar(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onCerrar]);
  useEffect(() => { const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = prev; }; }, []);   // el fondo no se mueve mientras se mira la imagen
  return (
    <div className="vb-overlay vp-overlay" role="dialog" aria-modal="true" aria-label={titulo} onMouseDown={e => { if (e.target === e.currentTarget) onCerrar(); }}>
      <div className={`vb-modal vp-modal ${completa ? 'vp-completa' : ''}`}>
        <header>
          <h2><i className="fa-solid fa-eye"></i> {titulo}</h2>
          <div className="vp-cab-botones">
            <button className="vp-expandir" onClick={() => setCompleta(c => !c)} aria-pressed={completa}><i className={`fa-solid ${completa ? 'fa-compress' : 'fa-expand'}`}></i> <span>{completa ? 'Reducir' : 'Pantalla completa'}</span></button>
            <button className="vb-cerrar" onClick={onCerrar} aria-label="Cerrar"><i className="fa-solid fa-xmark"></i></button>
          </div>
        </header>
        <p className="vp-aviso"><i className="fa-solid fa-circle-info"></i> <span>Así se verá la imagen. Pellizca o usa + y − para acercar.</span></p>
        <div className="vp-ventana">
          {html ? <VistaPreviaImagen html={html} ancho={ancho} escalaMax={completa ? 3 : 1.7} />
            : src ? <ImagenZoom src={src} />
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
