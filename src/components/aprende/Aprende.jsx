import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { VISUAL } from '../recorrido/Visuales';
import { LAB } from './Laboratorios';
import { nivel, progresoDe, siguiente } from '../../lib/aprende';
import { leerDominadas, guardarDominadas } from '../../lib/aprendeProgreso';
import { normalizar } from '../../lib/manualMarkdown';
import { celebrar } from '../../lib/confeti';

const ETAPAS = [['mira', 'Mira', 'fa-eye'], ['prueba', 'Pruébalo', 'fa-hand-pointer'], ['reto', 'Demuéstralo', 'fa-trophy']];

function Reto({ reto, dominada, onCorrecta }) {
  const [sel, setSel] = useState(null);
  const ok = sel === reto.c || (dominada && sel === null);
  return (
    <div className="ap-reto">
      <h4>{reto.t}</h4>
      <div className="ap-opciones">{reto.o.map((t, i) => {
        const marca = sel === i ? (i === reto.c ? 'bien' : 'mal') : (dominada && sel === null && i === reto.c ? 'bien' : '');
        return <button key={t} className={`ap-opcion ${marca}`} disabled={sel === reto.c} onClick={() => { setSel(i); if (i === reto.c) onCorrecta(); }}><span>{'ABC'[i]}</span>{t}</button>;
      })}</div>
      {sel !== null && sel !== reto.c && <p className="ap-casi"><i className="fa-solid fa-lightbulb"></i> Casi. Revisa «Mira» o «Pruébalo» e inténtalo de nuevo.</p>}
      {(sel === reto.c || (dominada && sel === null)) && <p className="ap-bien"><i className="fa-solid fa-circle-check"></i> {reto.x}</p>}
      {ok && null}
    </div>
  );
}

function Leccion({ l, dominada, onDominar, onVolver, guia, etapaInicial }) {
  const [etapa, setEtapa] = useState(etapaInicial || 'mira'), [probado, setProbado] = useState(false);
  const V = VISUAL[l.visual], Lab = LAB[l.lab];
  return (
    <div className="ap-leccion">
      <button className="ap-volver" onClick={onVolver}><i className="fa-solid fa-chevron-left"></i> Todas las lecciones</button>
      <header className="ap-cab"><span className="ap-emoji">{l.emoji}</span><div><h2>{l.titulo}</h2><p>{l.subtitulo}</p></div>{dominada && <span className="ap-dominada"><i className="fa-solid fa-circle-check"></i> Dominada</span>}</header>
      <div className="ap-etapas" role="tablist">{ETAPAS.map(([k, t, ic], n) => (
        <button key={k} role="tab" aria-selected={etapa === k} className={`${etapa === k ? 'on' : ''} ${(k === 'prueba' && probado) || (k === 'reto' && dominada) || (k === 'mira' && (probado || dominada)) ? 'hecha' : ''}`} onClick={() => setEtapa(k)}><span>{n + 1}</span><i className={`fa-solid ${ic}`}></i> {t}</button>))}</div>
      <div className="ap-cuerpo" key={etapa}>
        {etapa === 'mira' && (
          <div className="ap-mira">
            <ol className="ap-puntos">{l.puntos.map((t, i) => <li key={i} style={{ '--i': i }}><span>{i + 1}</span>{t}</li>)}</ol>
            <div className="rc-visual ap-visual"><V /></div>
          </div>)}
        {etapa === 'prueba' && <Lab leccion={l} onHecho={() => setProbado(true)} />}
        {etapa === 'reto' && <Reto reto={l.reto} dominada={dominada} onCorrecta={() => onDominar(l.id)} />}
      </div>
      <div className="ap-pie">
        {etapa !== 'reto' ? <button className="btn-primary" onClick={() => setEtapa(etapa === 'mira' ? 'prueba' : 'reto')}>{etapa === 'mira' ? 'Ahora pruébalo' : 'Ir al reto'} <i className="fa-solid fa-arrow-right"></i></button> : <button className="btn-secondary" onClick={onVolver}>Ver todas las lecciones</button>}
        {l.ruta && <Link className="btn-secondary" to={l.ruta}>{l.boton} <i className="fa-solid fa-arrow-up-right-from-square"></i></Link>}
      </div>
      {guia}
    </div>
  );
}

/** El manual interactivo: tu progreso, las lecciones por módulo y, dentro de cada una, Mira → Pruébalo → Demuéstralo. */
export default function Aprende({ lecciones, guiaDe, onReferencia, inicial }) {
  const [dominadas, setDominadas] = useState(leerDominadas);
  const [abierta, setAbierta] = useState(inicial?.leccion || null);
  const [q, setQ] = useState('');
  const prog = progresoDe(dominadas, lecciones), niv = nivel(prog.hechas, prog.total), sig = siguiente(lecciones, dominadas);
  const dominar = id => setDominadas(d => {
    if (d.includes(id)) return d;
    const n = [...d, id]; guardarDominadas(n); celebrar();
    if (progresoDe(n, lecciones).hechas === lecciones.length) setTimeout(celebrar, 900);
    return n;
  });
  useEffect(() => { window.scrollTo?.({ top: 0 }); }, [abierta]);
  const visibles = useMemo(() => { const n = normalizar(q).trim(); return n ? lecciones.filter(l => normalizar(`${l.titulo} ${l.subtitulo} ${l.puntos.join(' ')} ${(l.cartas || []).map(c => c.titulo + c.texto).join(' ')}`).includes(n)) : lecciones; }, [lecciones, q]);
  const actual = lecciones.find(l => l.id === abierta);
  if (actual) return <Leccion key={actual.id} l={actual} dominada={dominadas.includes(actual.id)} onDominar={dominar} onVolver={() => setAbierta(null)} etapaInicial={inicial?.etapa} guia={guiaDe(actual)} />;
  return (
    <div className="ap">
      <section className="ap-progreso">
        <div className="ap-anillo" style={{ '--p': prog.pct }}><b>{prog.pct}%</b></div>
        <div className="ap-prog-txt"><span className="ap-nivel">{niv.emoji} {niv.nombre}</span><h2>Dominas {prog.hechas} de {prog.total} lecciones</h2><p>{prog.hechas === prog.total ? '¡Ya eres experto en TMControl! 🎉' : 'Cada lección: mira, pruébalo con un simulador real y demuéstralo con un reto.'}</p></div>
        {sig && <button className="btn-primary ap-seguir" onClick={() => setAbierta(sig.id)}><i className="fa-solid fa-play"></i> {prog.hechas === 0 ? 'Empezar' : 'Continuar'}: {sig.titulo}</button>}
      </section>
      <div className="ap-herramientas">
        <label className="ay-buscar"><i className="fa-solid fa-magnifying-glass"></i><input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar una lección…" aria-label="Buscar una lección" /></label>
        <button className="btn-secondary" onClick={onReferencia}><i className="fa-solid fa-book"></i> Ver todo el texto (referencia)</button>
      </div>
      <div className="ap-rejilla">
        {visibles.map((l, i) => {
          const ok = dominadas.includes(l.id);
          return (
            <button key={l.id} className={`ap-tarjeta ${ok ? 'ok' : ''}`} style={{ '--i': i }} onClick={() => setAbierta(l.id)}>
              <span className="ap-t-emoji">{l.emoji}</span>
              <strong>{l.titulo}</strong><em>{l.subtitulo}</em>
              <span className="ap-t-pie">{ok ? <><i className="fa-solid fa-circle-check"></i> Dominada</> : <><i className="fa-regular fa-clock"></i> {l.minutos} min</>}</span>
            </button>);
        })}
        {visibles.length === 0 && <div className="panel ay-vacio"><i className="fa-solid fa-magnifying-glass"></i><b>No encontré «{q}»</b><span>Prueba con el nombre de un módulo.</span></div>}
      </div>
    </div>
  );
}
