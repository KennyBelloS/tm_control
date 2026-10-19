import { useEffect, useRef, useState } from 'react';

const ICONO = { ok: 'fa-circle-check', error: 'fa-circle-exclamation', info: 'fa-circle-info' };

/** Pila de avisos flotantes abajo a la izquierda; cada uno desaparece solo. */
export default function Toasts() {
  const [lista, setLista] = useState([]);
  const n = useRef(0);
  useEffect(() => {
    const alAvisar = e => {
      const id = ++n.current;
      setLista(l => [...l.slice(-3), { id, ...e.detail }]);
      setTimeout(() => setLista(l => l.filter(x => x.id !== id)), e.detail.tipo === 'error' ? 5000 : 2600);
    };
    window.addEventListener('tm-aviso', alAvisar);
    return () => window.removeEventListener('tm-aviso', alAvisar);
  }, []);
  if (!lista.length) return null;
  return (
    <div className="toasts" role="status" aria-live="polite">
      {lista.map(t => <div key={t.id} className={`toast toast-${t.tipo || 'ok'}`}><i className={`fa-solid ${ICONO[t.tipo] || ICONO.ok}`}></i><span>{t.texto}</span></div>)}
    </div>
  );
}
