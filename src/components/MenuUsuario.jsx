import { useEffect, useRef, useState } from 'react';
import { useSesion } from '../lib/useSesion';
import { ROL_LABEL, cerrarSesion } from '../lib/roles';
import { alternarTema, obtenerTema } from '../lib/tema';
import { alternarDensidad, obtenerAjuste } from '../lib/ajustesUI';
import { abrirPanelEfectos, useEfectos } from '../lib/efectos';
import AvatarFlor from './AvatarFlor';
import Nuevo from './Nuevo';

const iniciales = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();

/**
 * Menú de la persona: junta en un solo lugar lo que antes ocupaba media barra superior
 * (usuario, tema, densidad, atajos y cerrar sesión).
 */
export default function MenuUsuario() {
  const { sesion } = useSesion();
  const [abierto, setAbierto] = useState(false);
  const [oscuro, setOscuro] = useState(() => obtenerTema() === 'oscuro');
  const [compacta, setCompacta] = useState(() => obtenerAjuste('densidad') === 'compacta');
  const caja = useRef(null);
  const { ajustes, fiesta } = useEfectos();

  useEffect(() => {
    const tema = e => setOscuro(e.detail === 'oscuro');
    const ajustes = e => { if (e.detail.densidad) setCompacta(e.detail.densidad === 'compacta'); };
    window.addEventListener('tm-tema', tema); window.addEventListener('tm-ajustes', ajustes);
    return () => { window.removeEventListener('tm-tema', tema); window.removeEventListener('tm-ajustes', ajustes); };
  }, []);
  useEffect(() => {
    if (!abierto) return;
    const fuera = e => { if (caja.current && !caja.current.contains(e.target)) setAbierto(false); };
    const tecla = e => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('pointerdown', fuera); document.addEventListener('keydown', tecla);
    return () => { document.removeEventListener('pointerdown', fuera); document.removeEventListener('keydown', tecla); };
  }, [abierto]);
  if (!sesion) return null;
  const rolTexto = ROL_LABEL[sesion.rol] || sesion.rol;

  return (
    <div className="menu-usuario" ref={caja}>
      <button className={`cab-avatar ${sesion.avatar ? 'con-flor' : ''}`} onClick={() => setAbierto(a => !a)} aria-haspopup="menu" aria-expanded={abierto} aria-label={`Menú de ${sesion.nombre}`} title={`${sesion.nombre} · ${rolTexto}`}>
        {sesion.avatar ? <AvatarFlor id={sesion.avatar} tam={34} /> : <span>{iniciales(sesion.nombre)}</span>}<i className="fa-solid fa-chevron-down"></i>
      </button>
      {abierto && (
        <div className="menu-usuario-panel" role="menu">
          <div className="menu-usuario-cab">
            {sesion.avatar ? <span className="usuario-avatar con-flor"><AvatarFlor id={sesion.avatar} tam={46} /></span> : <span className="usuario-avatar">{iniciales(sesion.nombre)}</span>}
            <div><strong>{sesion.nombre}</strong><span className={`rol-pill rol-${sesion.rol}`}>{rolTexto}</span><small>{new Date().toLocaleDateString('es-CO')}</small></div>
          </div>
          <button role="menuitem" onClick={() => { setAbierto(false); window.dispatchEvent(new Event('tm-abrir-perfil')); }}><i className="fa-solid fa-seedling"></i><span>Mi perfil <Nuevo id="rosas" /></span><small className="menu-estado">Nombre y rosa</small></button>
          <button role="menuitemcheckbox" aria-checked={oscuro} onClick={alternarTema}><i className={`fa-solid ${oscuro ? 'fa-sun' : 'fa-moon'}`}></i><span>Tema oscuro</span><b className={`menu-interruptor ${oscuro ? 'on' : ''}`}></b></button>
          <button role="menuitemcheckbox" aria-checked={compacta} onClick={alternarDensidad}><i className="fa-solid fa-grip-lines"></i><span>Tablas compactas</span><b className={`menu-interruptor ${compacta ? 'on' : ''}`}></b></button>
          <button role="menuitem" onClick={() => { setAbierto(false); abrirPanelEfectos(); }}><i className="fa-solid fa-wand-magic-sparkles"></i><span>Efectos y festividades</span><small className="menu-estado">{fiesta ? fiesta.emoji : ajustes.efectos === 'apagado' ? 'Apagado' : ajustes.efectos === 'suave' ? 'Suave' : 'Alto'}</small></button>
          <button role="menuitem" onClick={() => { setAbierto(false); window.dispatchEvent(new Event('tm-abrir-atajos')); }}><i className="fa-solid fa-keyboard"></i><span>Atajos de teclado</span><kbd>?</kbd></button>
          <button role="menuitem" className="menu-salir" onClick={() => { if (confirm('¿Cerrar sesión?')) cerrarSesion(); }}><i className="fa-solid fa-right-from-bracket"></i><span>Cerrar sesión</span></button>
        </div>
      )}
    </div>
  );
}
