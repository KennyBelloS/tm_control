import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import manualMd from '../../MANUAL.md?raw';
import { novedades } from '../lib/manualMarkdown';
import { novedadesPendientes, novedadesRecientes } from '../lib/novedades';
import { avisar } from '../lib/avisos';

const ULTIMA = novedades(manualMd)[0];
const CLAVE = 'tm_nvi_abierta', QUITADA = 'tm_nvi_quitada', SEG = 5;
/** La persona puede quitar la tarjeta del inicio (queda quitada para esta versión). Se vuelve a mostrar desde Cómo se usa → Novedades. */
export const novedadesQuitadas = () => { try { return localStorage.getItem(QUITADA); } catch { return null; } };
export const restaurarNovedades = () => { try { localStorage.removeItem(QUITADA); } catch { /* sin almacenamiento */ } window.dispatchEvent(new Event('tm-nvi-cambio')); };
const ETQ = { nuevo: 'Nuevo', mejora: 'Mejora', arreglo: 'Arreglo' };
const cap = t => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);
const limpio = t => String(t || '').replace(/\*\*|`|\*/g, '');

/** Las novedades de la versión, a la vista en el inicio: un carrusel animado que cambia solo (o con las flechas). A los 2 días de la versión se retira sola. */
export default function NovedadesInicio() {
  const pendiente = !!novedadesPendientes(), items = ULTIMA?.items || [];
  const [abierta, setAbierta] = useState(() => { try { const v = localStorage.getItem(CLAVE); return v === null ? true : v === '1'; } catch { return true; } });
  const [i, setI] = useState(0), [pausa, setPausa] = useState(false), [quitada, setQuitada] = useState(() => novedadesQuitadas() === ULTIMA?.version);
  useEffect(() => { const f = () => setQuitada(novedadesQuitadas() === ULTIMA?.version); window.addEventListener('tm-nvi-cambio', f); return () => window.removeEventListener('tm-nvi-cambio', f); }, []);
  const quitar = () => { try { localStorage.setItem(QUITADA, ULTIMA.version); } catch { /* sin almacenamiento */ } setQuitada(true); avisar('Novedades quitadas del inicio. Las vuelves a ver en Cómo se usa → Novedades.'); };
  const alternar = () => setAbierta(a => { const n = !a; try { localStorage.setItem(CLAVE, n ? '1' : '0'); } catch { /* sin almacenamiento */ } return n; });
  useEffect(() => {
    if (!abierta || pausa || items.length < 2 || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches)) return undefined;
    const t = setTimeout(() => setI(x => (x + 1) % items.length), SEG * 1000);
    return () => clearTimeout(t);
  }, [abierta, pausa, i, items.length]);
  if (!ULTIMA || !novedadesRecientes() || quitada) return null;                           // pasados 2 días de la versión, la tarjeta se retira sola
  const it = items[i % Math.max(1, items.length)];
  const ir = d => setI(x => (x + d + items.length) % items.length);
  return (
    <section className={`nvi ${abierta ? 'abierta' : ''}`} aria-label={`Novedades de la versión ${ULTIMA.version}`} onMouseEnter={() => setPausa(true)} onMouseLeave={() => setPausa(false)} onFocus={() => setPausa(true)} onBlur={() => setPausa(false)}>
      <div className="nvi-cab">
        <span className="nvi-ver"><i className="fa-solid fa-gift"></i> v{ULTIMA.version}</span>
        <div className="nvi-tit"><b>Novedades</b>{ULTIMA.titulo && <span>{ULTIMA.titulo}</span>}</div>
        {pendiente && <em className="nvi-nuevo">Nuevo</em>}
        <Link className="nvi-ver-todas" to="/ayuda?tab=novedades">Ver todas <i className="fa-solid fa-arrow-right"></i></Link>
        <button className="nvi-x" onClick={quitar} aria-label="Quitar las novedades del inicio" title="Quitar del inicio"><i className="fa-solid fa-xmark"></i></button>
        <button className="nvi-alt" onClick={alternar} aria-expanded={abierta} aria-label={abierta ? 'Plegar las novedades' : 'Mostrar las novedades'}><i className="fa-solid fa-chevron-down"></i></button>
      </div>
      {abierta && it && (
        <div className="nvi-escena">
          <button className="nvi-flecha" onClick={() => ir(-1)} aria-label="Novedad anterior"><i className="fa-solid fa-chevron-left"></i></button>
          <article key={i} className={`nvi-slide nvi-t-${it.tipo}`} aria-live="polite">
            <span className="nvi-ic"><i className={`fa-solid ${it.icono}`}></i></span>
            <div className="nvi-txt"><div className="nvi-fila"><b>{it.titulo || 'Novedad'}</b><em>{ETQ[it.tipo]}</em></div><p>{cap(limpio(it.texto))}</p></div>
          </article>
          <button className="nvi-flecha" onClick={() => ir(1)} aria-label="Novedad siguiente"><i className="fa-solid fa-chevron-right"></i></button>
          <div className="nvi-pie">
            <div className="nvi-dots" role="tablist" aria-label="Novedades">{items.map((_, k) => <button key={k} role="tab" aria-selected={k === i} className={k === i ? 'on' : ''} onClick={() => setI(k)} aria-label={`Novedad ${k + 1} de ${items.length}`}></button>)}</div>
            <span className="nvi-cuenta">{i + 1} / {items.length}</span>
          </div>
          {!pausa && items.length > 1 && <i key={`b${i}`} className="nvi-barra" style={{ animationDuration: `${SEG}s` }}></i>}
        </div>
      )}
    </section>
  );
}
