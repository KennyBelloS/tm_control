import { useEffect, useState } from 'react';
import VistaPreviaImagen, { ModalVistaImagen } from './VistaPreviaImagen';
import { htmlRankingParaImagen } from '../lib/imagenRankingDatos';

/** La foto del ranking tal cual se descarga (PNG/JPG), dentro de la app y grande: mismo encabezado, tarjetas, estados y tabla. */
export default function PreviaRanking({ tipo, filas, cfg, fecha, titulo }) {
  const [html, setHtml] = useState(null), [ampliada, setAmpliada] = useState(false);
  useEffect(() => { let vivo = true; htmlRankingParaImagen({ tipo, filas, cfg, fecha }).then(h => { if (vivo) setHtml(h); }); return () => { vivo = false; }; }, [tipo, filas, cfg, fecha]);
  return (
    <div className="vp-seccion">
      <div className="vp-seccion-cab">
        <div>
          <h2 style={{ marginBottom: 4 }}><i className="fa-solid fa-image" style={{ color: 'var(--primary)', marginRight: 8 }}></i>{titulo}</h2>
          <p className="vp-nota"><i className="fa-solid fa-circle-info"></i> Así se verá la imagen que descargues (PNG o JPG). Cada estado se ve igual aquí y en la foto.</p>
        </div>
        <button className="btn-secondary" onClick={() => setAmpliada(true)} disabled={!html}><i className="fa-solid fa-expand"></i> Pantalla completa</button>
      </div>
      {html ? <VistaPreviaImagen html={html} etiqueta={titulo} escalaMax={1.6} /> : <p style={{ color: 'var(--gray)' }}><i className="fa-solid fa-spinner fa-spin"></i> Armando la vista previa…</p>}
      {ampliada && <ModalVistaImagen titulo={titulo} html={html} inicialCompleta onCerrar={() => setAmpliada(false)} />}
    </div>
  );
}
