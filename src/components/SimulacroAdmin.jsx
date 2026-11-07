import { useEffect, useState } from 'react';
import { CelebracionHito } from './presentacion/FestivoPresentacion';
import EventoPresentacion from './presentacion/EventoPresentacion';
import Nuevo from './Nuevo';
import { gruposDeEscenas, escenaPorId, eventosDeEscena, datosHito, AVISO_MUESTRA } from '../lib/simulacros';
import { avisar } from '../lib/avisos';
import { useEfectos } from '../lib/efectos';

const ICONO = { hito: 'fa-seedling', evento: 'fa-trophy', festejo: 'fa-circle-check', error: 'fa-triangle-exclamation', aviso: 'fa-bell' };
const silenciarMedidor = () => { window.__tmSimulacroHasta = Date.now() + 8000; };      // mientras se usa el simulacro, el medidor de lentitud no anota nada
const espera = (ms, v) => new Promise(r => setTimeout(() => r(v), ms));

/** Simulacro (solo Administrador): ver, sin tocar ningún dato, cómo se ve cada situación especial (la meta del día, una línea que supera a otra, un cambio brusco, un aviso…). */
export default function SimulacroAdmin() {
  const [activa, setActiva] = useState(null), [cola, setCola] = useState([]), [nota, setNota] = useState('');
  const { ajustes } = useEfectos();
  const escena = activa ? escenaPorId(activa.id) : null;
  useEffect(() => { if (!activa) return undefined; const k = e => { if (e.key === 'Escape') { silenciarMedidor(); setActiva(null); } }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [activa]);

  const avisoDeMuestra = async () => {
    try {
      if (!('Notification' in window)) { setNota('Este navegador no permite avisos fuera de la app.'); return; }
      let permiso = Notification.permission; if (permiso === 'default') permiso = await Notification.requestPermission();
      if (permiso !== 'granted') { setNota('Para ver el aviso hay que permitir las notificaciones de este aparato (en los ajustes del navegador o del celular).'); return; }
      const opciones = { body: AVISO_MUESTRA.cuerpo, icon: '/icons/icon-192.png', badge: '/icons/favicon-32.png', tag: 'simulacro', data: { ruta: AVISO_MUESTRA.ruta } };
      const reg = 'serviceWorker' in navigator ? await Promise.race([navigator.serviceWorker.ready, espera(2500, null)]) : null;
      if (reg) await reg.showNotification(AVISO_MUESTRA.titulo, opciones); else new Notification(AVISO_MUESTRA.titulo, opciones);
      setNota('Listo: mira la notificación en la pantalla de este aparato. Es solo una muestra; no se envió a nadie.');
    } catch { setNota('No se pudo mostrar el aviso de muestra en este aparato.'); }
  };
  const lanzar = id => {
    const e = escenaPorId(id); if (!e) return; setNota(''); silenciarMedidor();
    if (e.tipo === 'hito') { setCola([]); setActiva({ id, v: Date.now() }); }
    else if (e.tipo === 'evento') { setCola(eventosDeEscena(id)); setActiva({ id, v: Date.now() }); }
    else if (e.tipo === 'festejo') { avisar('Simulacro: Reporte subido (120 registros).'); if (ajustes.efectos === 'apagado') setNota('Tus efectos están apagados, por eso no florece la rosa: se encienden en el menú de tu perfil → Efectos.'); }
    else if (e.tipo === 'error') avisar('Simulacro: No hay conexión con el servidor. Revisa tu internet y vuelve a intentarlo.', 'error');
    else if (e.tipo === 'aviso') avisoDeMuestra();
  };
  const repetir = () => lanzar(activa.id);

  return (
    <section className="panel sim" aria-label="Simulacro">
      <header className="sim-cab"><div><h2><i className="fa-solid fa-flask"></i> Simulacro de situaciones <Nuevo id="simulacro" /></h2><p>Mira cómo se ve cada situación especial <b>sin tocar ningún dato</b>: es solo una muestra, con datos inventados, para que sepas qué verán las personas. Solo lo ve el Administrador.</p></div></header>
      {gruposDeEscenas().map(g => (
        <div key={g.grupo} className="sim-grupo"><h3>{g.grupo}</h3>
          <div className="sim-rejilla">{g.escenas.map(e => (
            <article key={e.id} className={`sim-tarjeta sim-t-${e.tipo}`}><span className="sim-ic"><i className={`fa-solid ${ICONO[e.tipo]}`}></i></span><div><b>{e.titulo}</b><p>{e.descripcion}</p></div><button type="button" className="btn-secondary" onClick={() => lanzar(e.id)}><i className="fa-solid fa-play"></i> Ver</button></article>))}</div>
        </div>))}
      {nota && <p className="sim-nota" role="status"><i className="fa-solid fa-circle-info"></i> {nota}</p>}
      {escena && (
        <div className="sim-escena" role="dialog" aria-label={`Simulacro: ${escena.titulo}`}>
          <div className="sim-fondo" aria-hidden="true"><small>TORREMOLINOS · PRESENTACIÓN</small><h2>Producción del Turno Actual</h2><div className="sim-fake"><i style={{ width: `${escena.tipo === 'hito' ? escena.hito : 55}%` }}></i></div><div className="sim-kpis"><span>Línea 1</span><span>Línea 2</span><span>Línea 3</span></div></div>
          <div className="sim-barra"><span><i className="fa-solid fa-flask"></i> SIMULACRO · {escena.titulo} · no cambia ningún dato</span><div><button type="button" onClick={repetir}><i className="fa-solid fa-rotate-right"></i> Ver otra vez</button><button type="button" onClick={() => { silenciarMedidor(); setActiva(null); }}><i className="fa-solid fa-xmark"></i> Cerrar</button></div></div>
          {escena.tipo === 'hito' && <CelebracionHito key={activa.v} {...datosHito(escena.hito)} fiesta={null} conConfeti onFin={() => {}} />}
          {escena.tipo === 'evento' && cola[0] && <EventoPresentacion key={`${activa.v}${cola[0].clave}`} evento={cola[0]} conConfeti onFin={() => setCola(c => c.slice(1))} />}
        </div>)}
    </section>
  );
}
