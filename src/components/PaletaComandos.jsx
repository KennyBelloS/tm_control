import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSesion } from '../lib/useSesion';
import { puedeVer } from '../lib/roles';
import { MODULOS_PRINCIPALES, MODULOS_GESTION, MODULOS_TECNICOS } from './Sidebar';

const ACCIONES = [
  { to: '/clasificacion', icon: 'fa-file-arrow-up', label: 'Subir reporte de clasificación', clave: 'clasificacion', palabras: 'cargar movimiento excel hora' },
  { to: '/rendimientos', icon: 'fa-upload', label: 'Subir reporte de boncheo', clave: 'rendimientos', palabras: 'cargar turno histórico excel' },
  { to: '/lineas', icon: 'fa-user-plus', label: 'Asignar personas a una formadora', clave: 'lineas', palabras: 'asignación línea formadora' },
  { to: '/reportes', icon: 'fa-file-export', label: 'Descargar un reporte', clave: 'reportes', palabras: 'excel pdf imagen semana mes' }
];

/** Búsqueda rápida (Ctrl + K): escribe y salta a cualquier módulo o acción sin recorrer el menú. */
export default function PaletaComandos() {
  const { sesion } = useSesion();
  const navegar = useNavigate();
  const [abierta, setAbierta] = useState(false);
  const [texto, setTexto] = useState('');
  const [activo, setActivo] = useState(0);
  const inputRef = useRef(null);

  const opciones = useMemo(() => {
    const rol = sesion?.rol;
    const modulos = [...MODULOS_PRINCIPALES, ...MODULOS_GESTION, ...MODULOS_TECNICOS]
      .filter(m => puedeVer(rol, m.key)).map(m => ({ to: m.to, icon: m.icon, label: m.label, tipo: 'Ir a', palabras: '' }));
    const acciones = ACCIONES.filter(a => puedeVer(rol, a.clave)).map(a => ({ ...a, tipo: 'Acción' }));
    const q = texto.trim().toLowerCase();
    return [...modulos, ...acciones].filter(o => !q || `${o.label} ${o.palabras}`.toLowerCase().includes(q));
  }, [sesion, texto]);

  useEffect(() => {
    const alTeclear = e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setAbierta(a => !a); }
      else if (e.key === 'Escape') setAbierta(false);
    };
    const abrir = () => setAbierta(true);
    window.addEventListener('keydown', alTeclear);
    window.addEventListener('tm-abrir-paleta', abrir);
    return () => { window.removeEventListener('keydown', alTeclear); window.removeEventListener('tm-abrir-paleta', abrir); };
  }, []);
  useEffect(() => { if (abierta) { setTexto(''); setActivo(0); setTimeout(() => inputRef.current?.focus(), 30); } }, [abierta]);
  useEffect(() => { setActivo(0); }, [texto]);

  function ir(o) { setAbierta(false); navegar(o.to); }
  function alTeclearEnCaja(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActivo(a => Math.min(a + 1, opciones.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActivo(a => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && opciones[activo]) ir(opciones[activo]);
  }
  if (!abierta) return null;
  return (
    <div className="paleta-fondo" onClick={() => setAbierta(false)}>
      <div className="paleta" onClick={e => e.stopPropagation()} role="dialog" aria-label="Búsqueda rápida">
        <div className="paleta-caja">
          <i className="fa-solid fa-magnifying-glass"></i>
          <input ref={inputRef} value={texto} onChange={e => setTexto(e.target.value)} onKeyDown={alTeclearEnCaja} placeholder="¿A dónde quieres ir? (ej. clasificación, reportes, asignar…)" />
          <kbd>Esc</kbd>
        </div>
        <ul className="paleta-lista">
          {opciones.length === 0 && <li className="paleta-vacia">Nada coincide con "{texto}"</li>}
          {opciones.map((o, i) => (
            <li key={`${o.tipo}-${o.to}-${o.label}`}>
              <button className={i === activo ? 'activo' : ''} onMouseEnter={() => setActivo(i)} onClick={() => ir(o)}>
                <span className="paleta-icono"><i className={`fa-solid ${o.icon}`}></i></span>
                <span className="paleta-texto">{o.label}</span>
                <span className="paleta-tipo">{o.tipo}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="paleta-pie"><span><kbd>↑</kbd><kbd>↓</kbd> moverse</span><span><kbd>Enter</kbd> abrir</span><span><kbd>Ctrl</kbd>+<kbd>K</kbd> abrir/cerrar</span></div>
      </div>
    </div>
  );
}
