import { useState } from 'react';
import { Link } from 'react-router-dom';
import manualMd from '../../MANUAL.md?raw';
import { novedades } from '../lib/manualMarkdown';
import { novedadesPendientes } from '../lib/novedades';

const ULTIMA = novedades(manualMd)[0];
const CLAVE = 'tm_nvi_abierta';

/** Las novedades de la versión actual, SIEMPRE a la vista en el inicio: abiertas (con sus tarjetas) o plegadas en una barra delgada. */
export default function NovedadesInicio() {
  const pendiente = !!novedadesPendientes();
  const [abierta, setAbierta] = useState(() => { try { const v = localStorage.getItem(CLAVE); return v === null ? true : v === '1'; } catch { return true; } });
  const alternar = () => setAbierta(a => { const n = !a; try { localStorage.setItem(CLAVE, n ? '1' : '0'); } catch { /* sin almacenamiento */ } return n; });
  if (!ULTIMA) return null;
  const mostrar = ULTIMA.items.slice(0, 4);
  return (
    <section className={`nvi ${abierta ? 'abierta' : ''}`} aria-label={`Novedades de la versión ${ULTIMA.version}`}>
      <div className="nvi-cab">
        <span className="nvi-ver"><i className="fa-solid fa-gift"></i> v{ULTIMA.version}</span>
        <div className="nvi-tit"><b>Novedades</b>{ULTIMA.titulo && <span>{ULTIMA.titulo}</span>}</div>
        {pendiente && <em className="nvi-nuevo">Nuevo</em>}
        <Link className="nvi-ver-todas" to="/ayuda?tab=novedades">Ver todas <i className="fa-solid fa-arrow-right"></i></Link>
        <button className="nvi-alt" onClick={alternar} aria-expanded={abierta} aria-label={abierta ? 'Plegar las novedades' : 'Mostrar las novedades'}><i className="fa-solid fa-chevron-down"></i></button>
      </div>
      {abierta && <ul className="nvi-lista">{mostrar.map((it, i) => <li key={i} style={{ '--i': i }}><span className="nvi-ic"><i className={`fa-solid ${it.icono}`}></i></span><div><b>{it.titulo || 'Novedad'}</b></div></li>)}{ULTIMA.items.length > mostrar.length && <li className="nvi-mas" style={{ '--i': mostrar.length }}><Link to="/ayuda?tab=novedades">+{ULTIMA.items.length - mostrar.length} más</Link></li>}</ul>}
    </section>
  );
}
