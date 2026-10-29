import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Texto from '../components/TextoMd';
import Novedades from '../components/Novedades';
import Nuevo from '../components/Nuevo';
import PageHeader from '../components/PageHeader';
import manualMd from '../../MANUAL.md?raw';
import { extraerBloque, parsear, secciones, filtrar, versiones, subseccion, novedades } from '../lib/manualMarkdown';
import { marcarNovedadesVistas } from '../lib/novedades';
import { useSesion } from '../lib/useSesion';
import { puedeVer, puedeEditar } from '../lib/roles';
import { armarPasos } from '../lib/recorrido';
import Recorrido from '../components/recorrido/Recorrido';
const Aprende = lazy(() => import('../components/aprende/Aprende'));          // las lecciones y simuladores se cargan al abrir la pestaña Manual
import { armarLecciones } from '../lib/aprende';

// El manual se lee UNA vez: lo que se ve aquí es exactamente MANUAL.md (zonas USO y NOVEDADES).
const BLOQUES_USO = parsear(extraerBloque(manualMd, 'USO'));
const SEC_USO = secciones(BLOQUES_USO);
const NOVEDADES = novedades(manualMd);
const VERSION = versiones(manualMd)[0]?.version;

function Bloque({ b }) {
  if (b.tipo === 'h') return b.nivel >= 4 ? <h4 id={b.id}>{b.texto}</h4> : <h3 id={b.id}>{b.texto}</h3>;
  if (b.tipo === 'p') return <p><Texto t={b.texto} /></p>;
  if (b.tipo === 'ul') return <ul>{b.items.map((x, i) => <li key={i}><Texto t={x} /></li>)}</ul>;
  if (b.tipo === 'ol') return <ol>{b.items.map((x, i) => <li key={i}><Texto t={x} /></li>)}</ol>;
  if (b.tipo === 'cita') return <blockquote><Texto t={b.texto} /></blockquote>;
  if (b.tipo === 'codigo') return <pre><code>{b.texto}</code></pre>;
  if (b.tipo === 'hr') return <hr />;
  if (b.tipo === 'tabla') return (
    <div className="ay-tabla"><table>
      <thead><tr>{b.cabecera.map((c, i) => <th key={i}><Texto t={c} /></th>)}</tr></thead>
      <tbody>{b.filas.map((f, i) => <tr key={i}>{f.map((c, j) => <td key={j}><Texto t={c} /></td>)}</tr>)}</tbody>
    </table></div>
  );
  return null;
}

/** Cómo se usa: el MANUAL.md dentro de la app, con buscador, índice y las novedades de cada versión. */
export default function Ayuda() {
  const [params, setParams] = useSearchParams();
  const { sesion } = useSesion();
  const rol = sesion?.rol;
  const tab = params.get('tab') === 'novedades' ? 'novedades' : params.get('tab') === 'manual' ? 'manual' : 'recorrido';
  const texto = tab === 'manual' && params.get('ver') === 'texto';
  const [q, setQ] = useState('');
  const pasos = useMemo(() => armarPasos({ puedeVer: k => puedeVer(rol, k), puedeEditar: puedeEditar(sesion) }), [rol, sesion?.edicion]);
  const lecciones = useMemo(() => armarLecciones({ puedeVer: k => puedeVer(rol, k), puedeEditar: puedeEditar(sesion) }), [rol, sesion?.edicion]);
  const conLeccion = useMemo(() => new Set(lecciones.map(l => l.id)), [lecciones]);
  const lista = useMemo(() => filtrar(SEC_USO, q), [q]);
  useEffect(() => { if (tab === 'novedades') marcarNovedadesVistas(); }, [tab]);
  const ir = id => document.getElementById(`ay-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const titulos = lista.filter(s => s.titulo);
  const leyendo = texto;
  const guiaDe = l => { const b = subseccion(BLOQUES_USO, l.seccion); return b.length ? <details className="ap-guia"><summary><i className="fa-solid fa-book-open"></i> Leer la guía completa de este módulo</summary><div className="ay-guia">{b.map((x, i) => <Bloque key={i} b={x} />)}</div></details> : null; };
  return (
    <>
      <PageHeader title="Cómo se usa" subtitle={`La guía de TMControl dentro de la app${VERSION ? ` · versión ${VERSION}` : ''}`} />
      <div className="page ay-pagina">
        <div className="ay-barra">
          <div className="fuente-toggle" role="tablist" aria-label="Contenido de la guía">
            <button role="tab" aria-selected={tab === 'recorrido'} className={tab === 'recorrido' ? 'activo' : ''} onClick={() => setParams({})}><i className="fa-solid fa-route"></i> Recorrido</button>
            <button role="tab" aria-selected={tab === 'manual'} className={tab === 'manual' ? 'activo' : ''} onClick={() => setParams({ tab: 'manual' })}><i className="fa-solid fa-graduation-cap"></i> Manual<Nuevo id="lecciones-auto" /></button>
            <button role="tab" aria-selected={tab === 'novedades'} className={tab === 'novedades' ? 'activo' : ''} onClick={() => setParams({ tab: 'novedades' })}><i className="fa-solid fa-gift"></i> Novedades</button>
          </div>
          {texto && <button className="btn-secondary" onClick={() => setParams({ tab: 'manual' })}><i className="fa-solid fa-graduation-cap"></i> Volver a las lecciones</button>}
          {leyendo && <label className="ay-buscar"><i className="fa-solid fa-magnifying-glass"></i><input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar en el manual…" aria-label="Buscar en el manual" /></label>}
        </div>
        {tab === 'recorrido' && <Recorrido pasos={pasos} practica={conLeccion} onManual={() => setParams({ tab: 'manual' })} onNovedades={() => setParams({ tab: 'novedades' })} />}
        {tab === 'novedades' && <Novedades entradas={NOVEDADES} />}
        {tab === 'manual' && !texto && <Suspense fallback={<div className="pc" aria-busy="true"><div className="pc-barra"></div><div className="pc-bloque"></div></div>}><Aprende lecciones={lecciones} guiaDe={guiaDe} onReferencia={() => setParams({ tab: 'manual', ver: 'texto' })} inicial={{ leccion: params.get('leccion'), etapa: params.get('etapa') }} /></Suspense>}
        {leyendo && (
          <div className="ay-cuerpo">
            {titulos.length > 1 && (
              <nav className="ay-indice" aria-label="Contenido">
                <strong>Contenido</strong>
                {titulos.map(s => <button key={s.id} onClick={() => ir(s.id)}>{s.titulo}</button>)}
              </nav>
            )}
            <div className="ay-contenido">
              {lista.length === 0 && <div className="panel ay-vacio"><i className="fa-solid fa-magnifying-glass"></i><b>No encontré «{q}»</b><span>Prueba con otra palabra, por ejemplo el nombre de un módulo.</span></div>}
              {lista.map(s => (
                <section key={s.id} id={`ay-${s.id}`} className="panel ay-seccion">
                  {s.titulo && <h2>{s.titulo}</h2>}
                  {s.bloques.map((b, i) => <Bloque key={i} b={b} />)}
                </section>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
