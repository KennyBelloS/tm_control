import { useEffect, useState } from 'react';

/** Botón flotante para volver al inicio de una pantalla larga; aparece al desplazarse. */
export default function VolverArriba() {
  const [ver, setVer] = useState(false);
  useEffect(() => {
    let pendiente = false;
    const medir = () => { pendiente = false; setVer(window.scrollY > 700); };
    const alMover = () => { if (!pendiente) { pendiente = true; requestAnimationFrame(medir); } };
    window.addEventListener('scroll', alMover, { passive: true });
    medir();
    return () => window.removeEventListener('scroll', alMover);
  }, []);
  return (
    <button className={`volver-arriba ${ver ? 'visible' : ''}`} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Volver arriba" title="Volver arriba" tabIndex={ver ? 0 : -1}>
      <i className="fa-solid fa-arrow-up"></i>
    </button>
  );
}
