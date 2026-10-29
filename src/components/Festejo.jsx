import { useEffect, useRef, useState } from 'react';
import AvatarFlor from './AvatarFlor';
import { florAlAzar, florPorId } from '../lib/avatares';
import { useEfectos } from '../lib/efectos';
import { mensajeAmigable } from '../lib/mensajesError';

const PETALOS = ['#E0344D', '#F26B7C', '#FFC4CB', '#C81D3B', '#F7A1BC', '#FFFFFF', '#A50F2C', '#FF8FA3'];
const SIN_FESTEJO = /copiad|descart|cancelad/i;          // lo que no es un logro (ni un error) no festeja

/**
 * El festejo: cuando se guarda, se sube o se edita algo florece una ROSA con pétalos que se esparcen y una lluvia de pétalos, y debajo DICE QUÉ PASÓ
 * («Reporte subido: 120 registros»). Si algo falla, la rosa se marchita y dice el error (sin tecnicismos, con su «ref.» para el administrador).
 * Lo disparan los avisos y los mensajes verdes/rojos de cada pantalla; en «Efectos: apagado» (o «reducir movimiento») solo queda el aviso normal.
 */
export default function Festejo() {
  const { ajustes } = useEfectos();
  const [rafagas, setRafagas] = useState([]), ultima = useRef(0), inicio = useRef(performance.now()), n = useRef(0), nivel = useRef(ajustes.efectos);
  nivel.current = ajustes.efectos;
  useEffect(() => {
    const lanzar = (texto, tipo, flor) => {
      const ahora = performance.now(); if (nivel.current === 'apagado' || ahora - ultima.current < 1600 || ahora - inicio.current < 2500) return;
      ultima.current = ahora;
      const id = ++n.current, ok = tipo !== 'error', cant = !ok ? 0 : nivel.current === 'suave' ? 8 : 20;
      const petalos = Array.from({ length: cant }, (_, i) => { const a = (-Math.PI * (0.08 + 0.84 * Math.random())), d = 90 + Math.random() * 190; return { i, dx: Math.cos(a) * d, dy: Math.sin(a) * d * 0.9, g: Math.round(Math.random() * 540 - 270), c: PETALOS[i % PETALOS.length], t: 6 + Math.random() * 7, de: Math.random() * 0.18 }; });
      const lluvia = ok && nivel.current !== 'suave' ? Array.from({ length: 14 }, (_, i) => ({ i, x: Math.round(Math.random() * 100), c: PETALOS[(i * 3) % PETALOS.length], t: 7 + Math.random() * 6, de: Math.random() * 0.9, d: 1.8 + Math.random() * 1.4 })) : [];
      setRafagas(l => [...l.slice(-1), { id, ok, texto: String(texto || '').slice(0, 140), flor: (flor && florPorId(flor)) || florAlAzar(), petalos, lluvia }]);
      setTimeout(() => setRafagas(l => l.filter(x => x.id !== id)), ok ? 3300 : 4300);
    };
    const alFestejo = e => lanzar(e.detail?.texto, 'ok', e.detail?.flor);
    const alAviso = e => { const d = e.detail || {}, tipo = d.tipo === 'error' ? 'error' : (d.tipo || 'ok') === 'ok' ? 'ok' : null; if (tipo && !SIN_FESTEJO.test(d.texto || '')) lanzar(tipo === 'error' ? mensajeAmigable(d.texto).texto : d.texto, tipo, d.flor); };
    const texto = nodo => String(nodo.innerText || nodo.textContent || '').replace(/\s+/g, ' ').trim();
    const obs = new MutationObserver(m => { for (const x of m) for (const nodo of x.addedNodes) { if (nodo.nodeType !== 1) continue; const g = nodo.matches?.('.alert.ok') ? nodo : nodo.querySelector?.('.alert.ok'), e = nodo.matches?.('.alert.err') ? nodo : nodo.querySelector?.('.alert.err'); if (g) { lanzar(texto(g), 'ok'); return; } if (e) { lanzar(mensajeAmigable(texto(e)).texto, 'error'); return; } } });
    obs.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('tm-festejo', alFestejo); window.addEventListener('tm-aviso', alAviso);
    return () => { obs.disconnect(); window.removeEventListener('tm-festejo', alFestejo); window.removeEventListener('tm-aviso', alAviso); };
  }, []);
  if (!rafagas.length) return null;
  return (
    <div className="fest" aria-hidden="true">
      {rafagas.map(r => (
        <div key={r.id} className={`fest-rafaga ${r.ok ? '' : 'fest-mala'}`}>
          {r.lluvia.map(p => <i key={p.i} className="fest-lluvia" style={{ left: `${p.x}vw`, '--c': p.c, '--t': `${p.t}px`, '--d': `${p.d}s`, animationDelay: `${p.de}s` }}></i>)}
          <div className="fest-flor"><AvatarFlor id={r.flor.id} tam={r.ok ? 116 : 96} anim={r.ok} /></div>
          {r.petalos.map(p => <i key={p.i} className="fest-petalo" style={{ '--dx': `${p.dx}px`, '--dy': `${p.dy}px`, '--g': `${p.g}deg`, '--c': p.c, '--t': `${p.t}px`, animationDelay: `${p.de}s` }}></i>)}
          {r.texto && <div className={`fest-msg ${r.ok ? 'ok' : 'err'}`}><i className={`fa-solid ${r.ok ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i><span>{r.texto}</span></div>}
        </div>))}
    </div>
  );
}
