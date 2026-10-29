import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSesion } from '../lib/useSesion';
import { MODULOS, puedeVer, puedeEditar, ROL_LABEL } from '../lib/roles';
import { armarPasos } from '../lib/recorrido';
import { armarLecciones } from '../lib/aprende';
import { nombreFestivo } from '../lib/festivosColombia';
import logoUrl from '../assets/logo-icon.png';

export const CLAVE_BIENVENIDA = 'tm_bienvenida_pendiente';
const hoyISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/**
 * Bienvenida al iniciar sesión (no al recargar): una tarjeta integrada con la app —mismos colores y tipografía, claro u oscuro—
 * que saluda, dice qué puede hacer tu rol y lleva primero al recorrido.
 */
export default function Bienvenida() {
  const { sesion } = useSesion();
  const ir = useNavigate();
  const [ver, setVer] = useState(false);
  const boton = useRef(null);
  useEffect(() => {
    if (!sesion) return;
    let hay = false;
    try { hay = localStorage.getItem(CLAVE_BIENVENIDA) === '1'; if (hay) localStorage.removeItem(CLAVE_BIENVENIDA); } catch { /* sin almacenamiento */ }
    if (hay) setVer(true);
  }, [sesion]);
  useEffect(() => {
    if (!ver) return undefined;
    boton.current?.focus();
    const k = e => { if (e.key === 'Escape') setVer(false); };
    window.addEventListener('keydown', k); const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = prev; };
  }, [ver]);
  if (!ver) return null;
  const rol = sesion?.rol, h = new Date().getHours();
  const franja = h < 12 ? { t: 'Buenos días', e: '☀️' } : h < 19 ? { t: 'Buenas tardes', e: '🌤️' } : { t: 'Buenas noches', e: '🌙' };
  const nombre = String(sesion?.nombre || '').trim().split(/\s+/)[0];
  const fecha = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
  const festivo = nombreFestivo(hoyISO());
  const opc = { puedeVer: k => puedeVer(rol, k), puedeEditar: puedeEditar(sesion) };
  const pasos = armarPasos(opc).length, lecciones = armarLecciones(opc).length, modulos = Object.keys(MODULOS).filter(k => puedeVer(rol, k)).length;
  const minutos = Math.max(1, Math.round((pasos * 8.5) / 60)), edita = puedeEditar(sesion);
  return (
    <div className="bv" role="dialog" aria-modal="true" aria-labelledby="bv-titulo" onMouseDown={e => { if (e.target === e.currentTarget) setVer(false); }}>
      <div className="bv-caja">
        <aside className="bv-lado">
          <img className="bv-logo" src={logoUrl} alt="" />
          <div className="bv-lado-txt">
            <p className="bv-saludo">{franja.e} {franja.t}</p>
            <h1 id="bv-titulo">¡Bienvenido{nombre ? `, ${nombre}` : ''}!</h1>
            <p className="bv-marca">TMControl · Finca Torremolinos</p>
          </div>
        </aside>
        <div className="bv-cuerpo">
          <div className="bv-datos">
            {rol && <span className="bv-chip"><i className="fa-solid fa-id-badge"></i> {ROL_LABEL[rol] || rol}</span>}
            <span className="bv-chip"><i className="fa-regular fa-calendar"></i> {fecha}</span>
            {festivo && <span className="bv-chip bv-fest"><i className="fa-solid fa-star"></i> {festivo}</span>}
            <span className={`bv-chip ${edita ? 'bv-edita' : ''}`}><i className={`fa-solid ${edita ? 'fa-pen-to-square' : 'fa-eye'}`}></i> {edita ? 'Puedes cargar y editar' : 'Solo visualización'}</span>
          </div>
          <p className="bv-txt">Tu cuenta ve <b>{modulos} módulos</b>. Empecemos con un recorrido corto: un paso por pantalla, con dibujos que se mueven, y después practicas con simuladores.</p>
          <div className="bv-cifras">
            <div><b>{pasos}</b><span>pasos en tu recorrido</span></div>
            <div><b>{lecciones}</b><span>lecciones para practicar</span></div>
            <div><b>{minutos} min</b><span>para empezar</span></div>
          </div>
          <div className="bv-botones">
            <button ref={boton} className="btn-primary bv-empezar" onClick={() => { setVer(false); ir('/ayuda'); }}><i className="fa-solid fa-route"></i> Empezar el recorrido <i className="fa-solid fa-arrow-right"></i></button>
            <button className="bv-saltar" onClick={() => setVer(false)}>Ir directo a la app</button>
          </div>
        </div>
      </div>
    </div>
  );
}
