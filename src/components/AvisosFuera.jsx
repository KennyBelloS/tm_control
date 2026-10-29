import { useEffect, useState } from 'react';
import { EVENTOS } from '../lib/eventosApp';
import { misAvisosFuera, estadoPush, activarPush, desactivarPush } from '../lib/push';
import { mensajeAmigable } from '../lib/mensajesError';
import { avisar } from '../lib/avisos';

/** En «Mi perfil»: aceptar (o quitar) los avisos fuera de la app en ESTE aparato. Solo si el Administrador te activó alguno. */
export default function AvisosFuera() {
  const [lista, setLista] = useState(null), [est, setEst] = useState(null), [ocupado, setOcupado] = useState(false), [error, setError] = useState('');
  const cargar = async () => { misAvisosFuera().then(setLista); setEst(await estadoPush()); };           // lo que activó el Administrador sale primero; el estado del aparato, cuando llegue
  useEffect(() => { cargar(); }, []);
  if (lista === null) return <section className="avf" aria-label="Avisos fuera de la app"><div className="avf-cab"><b><i className="fa-solid fa-bell"></i> Avisos fuera de la app</b></div><p className="avf-txt">Revisando tus avisos…</p></section>;
  const nombres = EVENTOS.filter(e => lista.includes(e.id));
  const cambiar = async () => {
    setOcupado(true); setError('');
    try { if (est.activo) { await desactivarPush(); avisar('Avisos fuera de la app desactivados en este aparato.'); } else { await activarPush(); avisar('¡Listo! Los avisos importantes te llegarán a este aparato aunque la app esté cerrada.'); } await cargar(); }
    catch (e) { setError(mensajeAmigable(e).texto); } finally { setOcupado(false); }
  };
  return (
    <section className="avf" aria-label="Avisos fuera de la app">
      <div className="avf-cab"><b><i className="fa-solid fa-bell"></i> Avisos fuera de la app</b>{est?.activo && <span className="avf-on"><i className="fa-solid fa-circle-check"></i> Activos aquí</span>}</div>
      {nombres.length === 0 ? <p className="avf-txt">El Administrador todavía no te activó avisos fuera de la app. En la campana ves todos los avisos importantes igual.</p> : (
        <>
          <p className="avf-txt">Te avisamos en la pantalla del celular, <b>aunque la app esté cerrada</b>, cuando: {nombres.map(n => n.nombre.toLowerCase()).join(', ')}.</p>
          {!est ? <p className="avf-txt"><i className="fa-solid fa-spinner fa-spin"></i> Revisando este aparato…</p> : !est.soportado ? <p className="avf-nota">Este navegador no permite avisos fuera de la app. Prueba con Chrome (Android) o con la app instalada (iPhone).</p>
            : est.iosSinInstalar ? <p className="avf-nota"><i className="fa-brands fa-apple"></i> En iPhone primero instala la app: toca <b>Compartir</b> → <b>Añadir a pantalla de inicio</b> y ábrela desde ahí. Luego vuelve aquí.</p>
            : !est.configurado ? <p className="avf-nota">Los avisos fuera de la app todavía no están listos en el servidor. Avísale al Administrador.</p>
            : est.permiso === 'denied' ? <p className="avf-nota">Tienes las notificaciones bloqueadas para esta app. Actívalas en los ajustes del aparato y vuelve aquí.</p>
            : <button type="button" className={est.activo ? 'btn-secondary' : 'btn-primary'} disabled={ocupado} onClick={cambiar}><i className={`fa-solid ${ocupado ? 'fa-spinner fa-spin' : est.activo ? 'fa-bell-slash' : 'fa-bell'}`}></i> {est.activo ? 'Desactivar en este aparato' : 'Activar en este aparato'}</button>}
          {error && <p className="pf-error"><i className="fa-solid fa-circle-exclamation"></i> {error}</p>}
        </>)}
    </section>
  );
}
