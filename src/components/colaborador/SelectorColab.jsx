import { useEffect, useMemo, useRef, useState } from 'react';
import { coincidePersona } from '../../lib/personasUtil';

const CLAVE = 'tm_colab_recientes';
export const leerRecientes = () => { try { const v = JSON.parse(localStorage.getItem(CLAVE)); return Array.isArray(v) ? v.slice(0, 6) : []; } catch { return []; } };
export const guardarReciente = p => { try { localStorage.setItem(CLAVE, JSON.stringify([{ id: p.id, nombre: p.nombre, mesa: p.mesa ?? null }, ...leerRecientes().filter(x => x.id !== p.id)].slice(0, 6))); } catch { /* sin almacenamiento */ } };

/** Buscador de colaborador: por código (mesa) o por nombre, con teclado (↑ ↓ Enter) y los últimos consultados. */
export default function SelectorColab({ personas, elegido, onElegir, enfocar = false }) {
  const [texto, setTexto] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const caja = useRef(null);
  const resultados = useMemo(() => {
    const t = texto.trim();
    const base = t ? personas.filter(p => coincidePersona({ nombre: p.nombre, mesa: p.mesa }, t)) : leerRecientes().map(r => personas.find(p => p.id === r.id) || r);
    return base.slice(0, 8);
  }, [personas, texto, abierto]);
  useEffect(() => setActivo(0), [texto]);
  useEffect(() => {
    const fuera = e => { if (caja.current && !caja.current.contains(e.target)) setAbierto(false); };
    document.addEventListener('pointerdown', fuera);
    return () => document.removeEventListener('pointerdown', fuera);
  }, []);
  const elegir = p => { onElegir(p); setTexto(''); setAbierto(false); };
  const tecla = e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setAbierto(true); setActivo(a => Math.min(a + 1, resultados.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActivo(a => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && abierto && resultados[activo]) { e.preventDefault(); elegir(resultados[activo]); }
    else if (e.key === 'Escape') setAbierto(false);
  };
  return (
    <div className="colab-selector" ref={caja}>
      <div className="search colab-buscar">
        <i className="fa-solid fa-magnifying-glass"></i>
        <input type="text" value={texto} maxLength={60} placeholder={elegido ? `${elegido.nombre} — buscar a otra persona…` : 'Busca por código (ej. 4) o por nombre…'} autoFocus={enfocar}
          onChange={e => { setTexto(e.target.value); setAbierto(true); }} onFocus={() => setAbierto(true)} onKeyDown={tecla} role="combobox" aria-expanded={abierto} aria-label="Buscar colaborador" />
      </div>
      {abierto && (
        <div className="colab-lista" role="listbox">
          {!texto.trim() && resultados.length > 0 && <small>Consultados recientemente</small>}
          {resultados.length === 0 && <p className="colab-sin">{texto.trim() ? `No encontré a nadie con “${texto}”.` : 'Escribe un código o un nombre.'}</p>}
          {resultados.map((p, i) => (
            <button key={p.id} role="option" aria-selected={i === activo} className={i === activo ? 'activo' : ''} onMouseEnter={() => setActivo(i)} onClick={() => elegir(p)}>
              <span className="dev-codigo">{p.mesa ?? '—'}</span><strong>{p.nombre}</strong>{p.rol && <em>{p.rol}</em>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
