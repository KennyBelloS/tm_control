import { useEffect, useMemo, useState } from 'react';
import Texto from './TextoMd';
import { vigente, isoDeFecha } from '../lib/nuevo';
import { INICIO_PROYECTO } from '../lib/proyecto';
import { novedadesQuitadas, restaurarNovedades } from './NovedadesInicio';
import { avisar } from '../lib/avisos';

const cap = t => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);
const ETQ = { nuevo: 'Nuevo', mejora: 'Mejora', arreglo: 'Arreglo' };
const hoyISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const haceTxt = f => { const iso = isoDeFecha(f); if (!iso) return ''; const d = Math.round((Date.UTC(+hoyISO().slice(0, 4), +hoyISO().slice(5, 7) - 1, +hoyISO().slice(8, 10)) - Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10))) / 864e5); return d <= 0 ? 'hoy' : d === 1 ? 'ayer' : d < 30 ? `hace ${d} días` : `hace ${Math.round(d / 30)} ${Math.round(d / 30) === 1 ? 'mes' : 'meses'}`; };
const fechaLarga = iso => new Date(`${iso}T12:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
const dias = n => (n == null ? '' : `≈ ${String(n).replace('.', ',')} ${n === 1 ? 'día' : 'días'} de trabajo`);
const Tarjeta = ({ it, i }) => (
  <article className={`nv-item nv-${it.tipo}`} style={{ '--i': i }}>
    <span className="nv-ic"><i className={`fa-solid ${it.icono}`}></i></span>
    <div><div className="nv-tit">{it.titulo && <strong>{it.titulo}</strong>}<em>{ETQ[it.tipo]}</em></div><p><Texto t={cap(it.texto)} /></p></div>
  </article>
);

/** Novedades: la versión más reciente destacada y, debajo, la línea de tiempo con todas las anteriores (con fecha y esfuerzo). Se filtra por tipo. */
export default function Novedades({ entradas }) {
  const [quitada, setQuitada] = useState(() => !!novedadesQuitadas());
  useEffect(() => { const f = () => setQuitada(!!novedadesQuitadas()); window.addEventListener('tm-nvi-cambio', f); return () => window.removeEventListener('tm-nvi-cambio', f); }, []);
  const [filtro, setFiltro] = useState('todas');
  const cuenta = useMemo(() => { const c = { todas: 0, nuevo: 0, mejora: 0, arreglo: 0 }; for (const e of entradas) for (const it of e.items) { c.todas++; c[it.tipo]++; } return c; }, [entradas]);
  const ver = it => filtro === 'todas' || it.tipo === filtro;
  const [ultima, ...antes] = entradas;
  if (!ultima) return <div className="panel ay-vacio"><i className="fa-solid fa-gift"></i><b>Aún no hay novedades</b></div>;
  const totalDias = entradas.reduce((s, e) => s + (e.esfuerzo || 0), 0), primera = entradas.at(-1);
  const itemsUltima = ultima.items.filter(ver), nuevaUltima = vigente(isoDeFecha(ultima.fecha), hoyISO());
  return (
    <div className="nv">
      {quitada && <button className="nv-volver" onClick={() => { restaurarNovedades(); avisar('Las novedades vuelven a mostrarse en el inicio.'); }}><i className="fa-solid fa-rotate-left"></i> Volver a mostrar las novedades en el inicio</button>}
      <section className="nv-hero">
        <div className="nv-hero-cab">
          <span className="nv-ultima"><i className="fa-solid fa-sparkles"></i> Lo último</span>
          <div className="nv-ver"><small>Versión</small><b>{ultima.version}</b></div>
          <div className="nv-hero-txt"><h2>{ultima.titulo || 'Novedades'}</h2><p>{ultima.fecha} · {haceTxt(ultima.fecha)} · {ultima.items.length} novedades{ultima.esfuerzo ? ` · ${dias(ultima.esfuerzo)}` : ''}{nuevaUltima ? ' · ' : ''}{nuevaUltima && <span className="nv-reciente">Reciente</span>}</p></div>
        </div>
        <div className="nv-filtros" role="tablist" aria-label="Filtrar por tipo">
          {[['todas', 'Todas'], ['nuevo', 'Nuevo'], ['mejora', 'Mejoras'], ['arreglo', 'Arreglos']].map(([k, t]) => (cuenta[k] > 0 || k === 'todas') && <button key={k} role="tab" aria-selected={filtro === k} className={filtro === k ? 'on' : ''} onClick={() => setFiltro(k)}>{t} <b>{cuenta[k]}</b></button>)}
        </div>
        <div className="nv-grid">{itemsUltima.length ? itemsUltima.map((it, i) => <Tarjeta key={`${filtro}${i}`} it={it} i={i} />) : <p className="nv-vacio">Esta versión no trae novedades de ese tipo.</p>}</div>
      </section>
      {antes.length > 0 && (
        <section className="nv-linea" aria-label="Versiones anteriores">
          <h3><i className="fa-solid fa-clock-rotate-left"></i> Todas las versiones <small>{entradas.length} versiones · {cuenta.todas} novedades · {dias(totalDias)}</small><span className="nv-inicio"><i className="fa-solid fa-flag-checkered"></i> Proyecto iniciado el {fechaLarga(INICIO_PROYECTO)} · {haceTxt(INICIO_PROYECTO.split('-').reverse().join('/'))}</span></h3>
          {antes.map(e => { const lista = e.items.filter(ver); if (!lista.length) return null; return (
            <details key={e.version} className="nv-prev">
              <summary><span className="nv-punto"></span><b>Versión {e.version}</b><span>{e.titulo}</span><em>{e.fecha ? `${e.fecha} · ${haceTxt(e.fecha)}` : ''}{e.esfuerzo ? ` · ${dias(e.esfuerzo)}` : ''}</em></summary>
              <div className="nv-grid nv-chico">{lista.map((it, i) => <Tarjeta key={i} it={it} i={i} />)}</div>
            </details>); })}
        </section>
      )}
    </div>
  );
}
