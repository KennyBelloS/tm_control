import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { VISUAL } from './Visuales';

const DURACION = 8500;                                     // ms que dura cada paso antes de pasar solo al siguiente
const sinMovimiento = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * El recorrido animado: un paso por pantalla, pocas palabras y un dibujo que se mueve.
 * La barra de arriba avanza sola (un tramo por paso); se puede pausar, ir atrás/adelante, saltar a un paso, usar ← → y espacio, o deslizar en el celular.
 */
export default function Recorrido({ pasos, onManual, onNovedades, practica = new Set() }) {
  const [i, setI] = useState(0);
  const [pausa, setPausa] = useState(sinMovimiento);
  const toque = useRef(null), inicio = useRef(0);
  useEffect(() => { inicio.current = performance.now(); }, [i]);              // cuándo empezó este paso
  const ultimo = i === pasos.length - 1, p = pasos[i], V = VISUAL[p.visual];
  const sig = useCallback(() => setI(x => Math.min(pasos.length - 1, x + 1)), [pasos.length]);
  const ant = useCallback(() => setI(x => Math.max(0, x - 1)), []);
  useEffect(() => {
    const tecla = e => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.target?.closest?.('input, textarea, select')) return;
      if (e.key === 'ArrowRight') sig(); else if (e.key === 'ArrowLeft') ant(); else if (e.key === ' ' && !e.target?.closest?.('button, a')) { e.preventDefault(); setPausa(x => !x); }
    };
    window.addEventListener('keydown', tecla); return () => window.removeEventListener('keydown', tecla);
  }, [sig, ant]);
  const alTocar = e => { toque.current = e.touches[0].clientX; };
  const alSoltar = e => { if (toque.current === null) return; const dx = e.changedTouches[0].clientX - toque.current; toque.current = null; if (Math.abs(dx) > 55) (dx < 0 ? sig : ant)(); };
  return (
    <div className="rc" onTouchStart={alTocar} onTouchEnd={alSoltar}>
      <div className="rc-progreso" role="tablist" aria-label="Pasos del recorrido">
        {pasos.map((s, k) => (
          <button key={s.id} role="tab" aria-selected={k === i} aria-label={`Paso ${k + 1}: ${s.titulo}`} className={`rc-seg ${k < i ? 'hecho' : k === i ? 'actual' : ''} ${pausa ? 'en-pausa' : ''}`} style={{ '--dur': `${DURACION}ms` }} onClick={() => setI(k)}>
            <i onAnimationEnd={k === i && !ultimo ? () => { if (performance.now() - inicio.current > 1500) sig(); } : undefined}></i>
          </button>
        ))}
      </div>
      <div className="rc-paso" key={p.id} aria-live="polite">
        <div className="rc-info">
          <span className="rc-num">{p.emoji} Paso {i + 1} de {pasos.length}</span>
          <h2>{p.titulo}</h2>
          <p className="rc-sub">{p.subtitulo}</p>
          <ol className="rc-puntos">{p.puntos.map((t, k) => <li key={k} style={{ '--i': k }}><span>{k + 1}</span>{t}</li>)}</ol>
          {(p.ruta || practica.has(p.id)) && (
            <div className="rc-botones">
              {p.ruta && <Link className="rc-ir" to={p.ruta}>{p.boton} <i className="fa-solid fa-arrow-right"></i></Link>}
              {practica.has(p.id) && <Link className="rc-practica" to={`/ayuda?tab=manual&leccion=${p.id}`}><i className="fa-solid fa-hand-pointer"></i> Practícalo</Link>}
            </div>
          )}
          {ultimo && (
            <div className="rc-fin">
              <button className="btn-primary" onClick={onManual}><i className="fa-solid fa-book-open"></i> Ver el manual</button>
              <button className="btn-secondary" onClick={onNovedades}><i className="fa-solid fa-gift"></i> Novedades</button>
              <button className="btn-secondary" onClick={() => setI(0)}><i className="fa-solid fa-rotate-left"></i> Repetir</button>
            </div>
          )}
        </div>
        <div className="rc-visual"><V /></div>
      </div>
      <div className="rc-pie">
        <button className="rc-pausa" onClick={() => setPausa(x => !x)} aria-pressed={pausa}><i className={`fa-solid ${pausa ? 'fa-play' : 'fa-pause'}`}></i> {pausa ? 'Reanudar' : 'Pausar'}</button>
        <div className="rc-flechas">
          <button className="rc-flecha" onClick={ant} disabled={i === 0} aria-label="Paso anterior"><i className="fa-solid fa-chevron-left"></i></button>
          <button className="rc-flecha rc-sig" onClick={sig} disabled={ultimo} aria-label="Paso siguiente"><i className="fa-solid fa-chevron-right"></i></button>
        </div>
      </div>
    </div>
  );
}
