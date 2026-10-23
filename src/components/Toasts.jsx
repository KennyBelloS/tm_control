import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ICONO = { ok: 'fa-circle-check', error: 'fa-triangle-exclamation', info: 'fa-circle-info' };

/** Avisos flotantes abajo a la izquierda: tarjeta clara con ícono, texto, botón opcional y barra que muestra cuánto queda. */
export default function Toasts() {
  const [lista, setLista] = useState([]);
  const n = useRef(0);
  const ir = useNavigate();
  const cerrar = useCallback(id => setLista(l => l.filter(x => x.id !== id)), []);
  useEffect(() => {
    const alAvisar = e => {
      const id = ++n.current, d = e.detail, ms = d.tipo === 'error' ? (d.ruta ? 9000 : 6500) : 3200;
      setLista(l => [...l.slice(-3), { id, ms, ...d }]);
      setTimeout(() => cerrar(id), ms);
    };
    window.addEventListener('tm-aviso', alAvisar);
    return () => window.removeEventListener('tm-aviso', alAvisar);
  }, [cerrar]);
  if (!lista.length) return null;
  return (
    <div className="toasts" role="status" aria-live="polite">
      {lista.map(t => (
        <div key={t.id} className={`toast toast-${t.tipo || 'ok'}`} style={{ '--dur': `${t.ms}ms` }}>
          <span className="ti-icono"><i className={`fa-solid ${ICONO[t.tipo] || ICONO.ok}`}></i></span>
          <div className="ti-texto">{t.titulo && <strong>{t.titulo}</strong>}<span>{t.texto}</span></div>
          {t.ruta && <button className="ti-accion" onClick={() => { cerrar(t.id); ir(t.ruta); }}>{t.etiqueta || 'Ver'}</button>}
          <button className="ti-cerrar" aria-label="Cerrar aviso" onClick={() => cerrar(t.id)}><i className="fa-solid fa-xmark"></i></button>
        </div>
      ))}
    </div>
  );
}
