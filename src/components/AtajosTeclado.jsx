import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSesion } from '../lib/useSesion';
import { puedeVer } from '../lib/roles';
import { alternarMenu, alternarDensidad } from '../lib/ajustesUI';
import { alternarTema } from '../lib/tema';
import { MODULOS_PRINCIPALES, MODULOS_GESTION, MODULOS_TECNICOS } from './Sidebar';

// "g" y luego una letra = ir a esa pantalla (como en las herramientas profesionales)
const IR_A = { d: 'dashboard', p: 'personas', r: 'rendimientos', e: 'reportes', k: 'ranking', l: 'lineas', c: 'clasificacion', o: 'devoluciones', b: 'colaborador', t: 'tableros', i: 'indirectos', h: 'gerencia', u: 'usuarios', a: 'ayuda' };
const NOMBRE = { d: 'Dashboard', p: 'Personas', r: 'Rendimientos', e: 'Reportes', k: 'Ranking', l: 'Líneas', c: 'Clasificación', o: 'Devoluciones', b: 'TIC · Tablero Integrado del Colaborador', t: 'Tableros', a: 'Cómo se usa' };

const escribiendo = el => !!el && (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable);

/** Atajos de teclado globales + la hoja de ayuda (tecla "?"). No actúan mientras se escribe ni durante la presentación. */
export default function AtajosTeclado() {
  const { sesion } = useSesion();
  const navegar = useNavigate();
  const [ayuda, setAyuda] = useState(false);
  const armado = useRef(null);
  const rol = sesion?.rol;

  useEffect(() => {
    const todos = [...MODULOS_PRINCIPALES, ...MODULOS_GESTION, ...MODULOS_TECNICOS];
    const alTeclear = e => {
      if (e.key === 'Escape') { setAyuda(false); return; }
      if (e.ctrlKey || e.metaKey || e.altKey || escribiendo(e.target) || document.querySelector('.presentacion-overlay')) return;
      if (armado.current) {                                              // venía una "g"
        const m = todos.find(x => x.key === IR_A[e.key]);
        clearTimeout(armado.current); armado.current = null;
        if (m && puedeVer(rol, m.key)) { e.preventDefault(); window.dispatchEvent(new Event('tm-navegando')); navegar(m.to); }
        return;
      }
      if (e.key === 'g') { armado.current = setTimeout(() => { armado.current = null; }, 1200); }
      else if (e.key === '?') { e.preventDefault(); setAyuda(a => !a); }
      else if (e.key === '/') { e.preventDefault(); window.dispatchEvent(new Event('tm-abrir-paleta')); }
      else if (e.key === '[') alternarMenu();
      else if (e.key === 'v') alternarDensidad();
      else if (e.key === 'x') alternarTema();
    };
    const abrir = () => setAyuda(true);
    window.addEventListener('keydown', alTeclear); window.addEventListener('tm-abrir-atajos', abrir);
    return () => { window.removeEventListener('keydown', alTeclear); window.removeEventListener('tm-abrir-atajos', abrir); clearTimeout(armado.current); };
  }, [rol, navegar]);

  if (!ayuda) return null;
  const visibles = Object.keys(NOMBRE).filter(l => puedeVer(rol, IR_A[l]));
  return (
    <div className="atajos-fondo" onClick={() => setAyuda(false)}>
      <div className="atajos" role="dialog" aria-label="Atajos de teclado" onClick={e => e.stopPropagation()}>
        <header><h3><i className="fa-solid fa-keyboard"></i> Atajos de teclado</h3><button onClick={() => setAyuda(false)} aria-label="Cerrar"><i className="fa-solid fa-xmark"></i></button></header>
        <div className="atajos-cuerpo">
          <section>
            <h4>Moverse</h4>
            {visibles.map(l => <p key={l}><span>Ir a {NOMBRE[l]}</span><span className="atajos-teclas"><kbd>g</kbd><em>luego</em><kbd>{l}</kbd></span></p>)}
            <p><span>Búsqueda rápida</span><span className="atajos-teclas"><kbd>/</kbd><em>o</em><kbd>Ctrl</kbd><kbd>K</kbd></span></p>
          </section>
          <section>
            <h4>Vista</h4>
            <p><span>Contraer / expandir el menú</span><span className="atajos-teclas"><kbd>[</kbd></span></p>
            <p><span>Tablas cómodas / compactas</span><span className="atajos-teclas"><kbd>v</kbd></span></p>
            <p><span>Tema claro / oscuro</span><span className="atajos-teclas"><kbd>x</kbd></span></p>
            <p><span>Esta ayuda</span><span className="atajos-teclas"><kbd>?</kbd></span></p>
            <h4>Presentación</h4>
            <p><span>Tamaño más grande / pequeño</span><span className="atajos-teclas"><kbd>+</kbd><kbd>−</kbd></span></p>
          </section>
        </div>
        <footer>Los atajos no actúan mientras escribes en un campo.</footer>
      </div>
    </div>
  );
}
