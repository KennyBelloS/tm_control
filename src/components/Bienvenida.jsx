import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSesion } from '../lib/useSesion';
import { puedeVer, puedeEditar, ROL_LABEL } from '../lib/roles';
import { armarPasos } from '../lib/recorrido';
import { armarLecciones } from '../lib/aprende';
import { nombreFestivo } from '../lib/festivosColombia';
import logoUrl from '../assets/logo-icon.png';

export const CLAVE_BIENVENIDA = 'tm_bienvenida_pendiente';
const hoyISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/**
 * Pantalla de bienvenida: aparece SIEMPRE que se inicia sesión (no al recargar la página) y lleva primero al recorrido.
 * Saluda según la hora, dice quién eres y cuántos pasos y lecciones tiene TU recorrido según tu rol.
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
  const opc = { puedeVer: k => puedeVer(rol, k), puedeEditar: puedeEditar(rol) };
  const pasos = armarPasos(opc).length, lecciones = armarLecciones(opc).length;
  return (
    <div className="bv" role="dialog" aria-modal="true" aria-labelledby="bv-titulo">
      <div className="bv-fondo" aria-hidden="true"><i></i><i></i><i></i></div>
      <div className="bv-caja">
        <div className="bv-logo"><img src={logoUrl} alt="" /></div>
        <p className="bv-saludo">{franja.e} {franja.t}</p>
        <h1 id="bv-titulo">¡Bienvenido{nombre ? `, ${nombre}` : ''}!</h1>
        <div className="bv-datos">
          {rol && <span className="bv-chip"><i className="fa-solid fa-id-badge"></i> {ROL_LABEL[rol] || rol}</span>}
          <span className="bv-chip"><i className="fa-regular fa-calendar"></i> {fecha}</span>
          {festivo && <span className="bv-chip bv-fest"><i className="fa-solid fa-star"></i> {festivo}</span>}
        </div>
        <p className="bv-txt">Vamos a recorrer <strong>TMControl</strong> juntos: un paso por pantalla, con dibujos que se mueven.</p>
        <div className="bv-cifras">
          <div><b>{pasos}</b><span>pasos en tu recorrido</span></div>
          <div><b>{lecciones}</b><span>lecciones para practicar</span></div>
          <div><b>1 min</b><span>para empezar</span></div>
        </div>
        <div className="bv-botones">
          <button ref={boton} className="btn-primary bv-empezar" onClick={() => { setVer(false); ir('/ayuda'); }}><i className="fa-solid fa-route"></i> Empezar el recorrido <i className="fa-solid fa-arrow-right"></i></button>
          <button className="bv-saltar" onClick={() => setVer(false)}>Ir directo a la app</button>
        </div>
      </div>
    </div>
  );
}
