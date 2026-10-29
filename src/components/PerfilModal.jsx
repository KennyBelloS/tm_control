import { useEffect, useRef, useState } from 'react';
import { useSesion } from '../lib/useSesion';
import { ROL_LABEL } from '../lib/roles';
import { FLORES, florPorId, validarNombre } from '../lib/avatares';
import { guardarPerfil } from '../lib/perfil';
import { avisar } from '../lib/avisos';
import AvatarFlor from './AvatarFlor';
import AvisosFuera from './AvisosFuera';

/** Mi perfil: cambiar el nombre y elegir una flor como avatar. Se abre desde el menú de la persona. */
export default function PerfilModal() {
  const { sesion } = useSesion();
  const [abierto, setAbierto] = useState(false), [nombre, setNombre] = useState(''), [flor, setFlor] = useState(null), [guardando, setGuardando] = useState(false), [error, setError] = useState('');
  const campo = useRef(null);
  useEffect(() => { const f = () => { setNombre(sesion?.nombre || ''); setFlor(sesion?.avatar || null); setError(''); setAbierto(true); }; window.addEventListener('tm-abrir-perfil', f); return () => window.removeEventListener('tm-abrir-perfil', f); }, [sesion]);
  useEffect(() => {
    if (!abierto) return undefined;
    campo.current?.focus(); const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const k = e => { if (e.key === 'Escape') setAbierto(false); };
    window.addEventListener('keydown', k); return () => { window.removeEventListener('keydown', k); document.body.style.overflow = prev; };
  }, [abierto]);
  if (!abierto || !sesion) return null;
  const v = validarNombre(nombre), cambiaNombre = v.ok && v.valor !== sesion.nombre, cambiaAvatar = (flor || null) !== (sesion.avatar || null), hayCambios = cambiaNombre || cambiaAvatar;
  const guardar = async () => {
    if (!v.ok) { setError(v.error); return; }
    setGuardando(true); setError('');
    try { await guardarPerfil({ nombre: v.valor, avatar: flor, cambiaNombre, cambiaAvatar }); avisar(cambiaNombre && cambiaAvatar ? '¡Perfil actualizado: nombre y rosa!' : cambiaAvatar ? `¡Listo! Tu avatar ahora es la ${(florPorId(flor)?.nombre || 'rosa').toLowerCase()}.` : '¡Nombre actualizado!', 'ok', { flor }); setAbierto(false); }
    catch (e) { setError(e.message || 'No se pudo guardar.'); } finally { setGuardando(false); }
  };
  return (
    <div className="pf" role="dialog" aria-modal="true" aria-labelledby="pf-titulo" onMouseDown={e => { if (e.target === e.currentTarget) setAbierto(false); }}>
      <div className="pf-caja">
        <header className="pf-cab">
          <div className="pf-previa" key={flor || 'ini'}><AvatarFlor id={flor} nombre={nombre} tam={96} anim /></div>
          <div className="pf-cab-txt"><h2 id="pf-titulo">Mi perfil</h2><span className={`rol-pill rol-${sesion.rol}`}>{ROL_LABEL[sesion.rol] || sesion.rol}</span><small>{sesion.email}</small></div>
          <button className="pf-cerrar" onClick={() => setAbierto(false)} aria-label="Cerrar"><i className="fa-solid fa-xmark"></i></button>
        </header>
        <label className="pf-campo">Tu nombre<input ref={campo} className="vb-input" value={nombre} maxLength={60} onChange={e => { setNombre(e.target.value); setError(''); }} onKeyDown={e => { if (e.key === 'Enter' && hayCambios) guardar(); }} placeholder="Nombre y apellido" /></label>
        <div className="pf-flores-t"><b>Elige tu rosa</b><button className="pf-sin" onClick={() => setFlor(null)} disabled={!flor}>Usar mis iniciales</button></div>
        <div className="pf-flores" role="radiogroup" aria-label="Rosa del avatar">
          {FLORES.map((f, i) => <button key={f.id} role="radio" aria-checked={flor === f.id} className={`pf-flor ${flor === f.id ? 'on' : ''}`} style={{ '--i': i }} onClick={() => setFlor(f.id)} title={f.nombre}><AvatarFlor id={f.id} tam={58} /><span>{f.nombre}</span>{flor === f.id && <i className="pf-ok fa-solid fa-circle-check"></i>}</button>)}
        </div>
        <AvisosFuera />
        {(error || (!v.ok && nombre !== sesion.nombre)) && <p className="pf-error"><i className="fa-solid fa-circle-exclamation"></i> {error || v.error}</p>}
        <footer className="pf-pie"><button className="btn-secondary" onClick={() => setAbierto(false)}>Cancelar</button><button className="btn-primary" onClick={guardar} disabled={!hayCambios || !v.ok || guardando}><i className={`fa-solid ${guardando ? 'fa-spinner fa-spin' : 'fa-seedling'}`}></i> {guardando ? 'Guardando…' : 'Guardar mi perfil'}</button></footer>
      </div>
    </div>
  );
}
