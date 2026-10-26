import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificaciones } from '../lib/useNotificaciones';
import { tiempoRelativo } from '../lib/notificaciones';
import { useEfectos } from '../lib/efectos';
import { celebrar } from '../lib/confeti';

const FILTROS = [['todas', 'Todas'], ['importantes', 'Importantes'], ['leidas', 'Leídas']];
const ETIQUETA = { critica: 'Crítica', importante: 'Importante', info: 'Informativa' };
const GRUPOS = [['critica', 'Requieren atención'], ['importante', 'Importantes'], ['info', 'Informativas']];
const hora = iso => new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

/**
 * Campana de notificaciones: solo lo crítico interrumpe; lo demás espera aquí, ordenado por importancia y con un botón para resolverlo.
 * Las reglas (qué, a quién, cuándo) están en lib/notificaciones.js.
 */
export default function NotificationBell() {
  const n = useNotificaciones();
  const [abierto, setAbierto] = useState(false);
  const [menuSilencio, setMenuSilencio] = useState(false);
  const ref = useRef(null);
  const [abiertos, setAbiertos] = useState(() => new Set());                     // avisos abiertos (completos) ahora mismo
  const ir = useNavigate();
  const { cambiar } = useEfectos();
  useEffect(() => {
    const fuera = e => { if (ref.current && !ref.current.contains(e.target)) { setAbierto(false); setMenuSilencio(false); setAbiertos(new Set()); n.soltar(); } };
    document.addEventListener('mousedown', fuera); return () => document.removeEventListener('mousedown', fuera);
  }, []);
  const abrirCerrar = () => { setAbierto(o => !o); setMenuSilencio(false); if (!abierto) n.marcarVistas(); else { setAbiertos(new Set()); n.soltar(); } };
  const alternar = x => { setAbiertos(a => { const c = new Set(a); if (c.has(x.id)) c.delete(x.id); else { c.add(x.id); n.leer(x); } return c; }); };
  const accion = x => {
    if (x.accion.tipo === 'activar_fiesta') {                                  // la invitación festiva: se activa desde aquí y no se vuelve a ofrecer este año
      try { localStorage.setItem(x.accion.dato, '1'); } catch { /* sin almacenamiento */ }
      cambiar({ activo: true, modo: 'auto' }); n.eliminar(x.id); setAbierto(false); setTimeout(celebrar, 300); return;
    }
    n.leer(x); setAbierto(false); n.soltar(); ir(x.accion.ruta);
  };
  const descartar = x => { if (x.accion?.dato) { try { localStorage.setItem(x.accion.dato, '1'); } catch { /* sin almacenamiento */ } } n.eliminar(x.id); };

  return (
    <div className="notif-wrap" ref={ref}>
      <button className={`notif-bell ${n.noMolestarHasta ? 'silencio' : ''}`} onClick={abrirCerrar} aria-label={`Notificaciones${n.globo.cuenta ? `: ${n.globo.cuenta} pendientes` : ''}`} aria-expanded={abierto}>
        <i className={`fa-solid ${n.noMolestarHasta ? 'fa-bell-slash' : 'fa-bell'}`}></i>
        {n.globo.cuenta > 0 && <span className={`notif-badge nt-nivel-${n.globo.nivel}`}>{n.globo.cuenta}</span>}
      </button>
      {abierto && (
        <div className="notif-panel nt-panel" role="dialog" aria-label="Notificaciones">
          <div className="nt-cab">
            <div className="nt-titulo-panel">
              <span className="nt-campana"><i className="fa-solid fa-bell"></i></span>
              <div><h3>Notificaciones</h3><small>{n.lista.length ? `${n.lista.length} ${n.lista.length === 1 ? 'aviso' : 'avisos'}` : 'Todo al día'}</small></div>
            </div>
            <div className="nt-cab-acciones">
              <div className="nt-silencio">
                <button className={`nt-icono ${n.noMolestarHasta ? 'activo' : ''}`} onClick={() => setMenuSilencio(m => !m)} title="No molestar" aria-label="No molestar"><i className="fa-solid fa-moon"></i></button>
                {menuSilencio && <div className="nt-menu" role="menu">
                  <button role="menuitem" onClick={() => { n.noMolestar('hora'); setMenuSilencio(false); }}>Durante 1 hora</button>
                  <button role="menuitem" onClick={() => { n.noMolestar('manana'); setMenuSilencio(false); }}>Hasta mañana</button>
                  {n.noMolestarHasta && <button role="menuitem" onClick={() => { n.noMolestar(null); setMenuSilencio(false); }}>Quitar</button>}
                </div>}
              </div>
            </div>
          </div>
          {n.noMolestarHasta && <div className="nt-silencio-aviso"><i className="fa-solid fa-moon"></i> No molestar activo hasta las {hora(n.noMolestarHasta)} <button onClick={() => n.noMolestar(null)}>Quitar</button></div>}
          <div className="nt-filtros" role="tablist">{FILTROS.map(([k, t]) => <button key={k} role="tab" aria-selected={n.filtro === k} className={n.filtro === k ? 'activo' : ''} onClick={() => n.cambiarFiltro(k)}>{t}</button>)}</div>
          <div className="nt-lista">
            {n.lista.length === 0 ? <div className="nt-vacio"><i className="fa-regular fa-circle-check"></i><b>Todo al día</b><span>{n.filtro === 'todas' ? 'No hay nada que requiera tu atención.' : 'Nada en este filtro.'}</span></div>
              : GRUPOS.map(([sev, nombre]) => { const items = n.lista.filter(x => x.severidad === sev); return items.length > 0 && (
                <section key={sev} className="nt-grupo" aria-label={nombre}>
                  <h4 className={`nt-grupo-t nt-gt-${sev}`}>{nombre}<span>{items.length}</span></h4>
                  {items.map(x => (
                    <article key={x.id} className={`nt-item nt-${x.severidad} ${abiertos.has(x.id) ? 'abierto' : ''} ${n.leidas.has(x.id) && x.severidad !== 'critica' ? 'leida' : ''}`}>
                      <span className="nt-icono-sev"><i className={`fa-solid ${x.icono}`}></i></span>
                      <div className="nt-cuerpo">
                        <div className="nt-tocable" role="button" tabIndex={0} aria-expanded={abiertos.has(x.id)} onClick={() => alternar(x)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); alternar(x); } }}>
                          <div className="nt-titulo"><strong>{x.titulo}</strong>{x.severidad !== 'info' && <em>{ETIQUETA[x.severidad]}</em>}<i className={`fa-solid fa-chevron-down nt-flecha`}></i></div>
                          <p className="nt-desc">{x.descripcion}</p>
                          {abiertos.has(x.id) && (
                            <div className="nt-detalle">
                              {x.detalle?.length > 0 && <ul>{x.detalle.map((t, i) => <li key={i}>{t}</li>)}</ul>}
                              <div className="nt-leida"><i className="fa-solid fa-circle-check"></i> Leído: no volverá a aparecer mientras todo siga igual.</div>
                            </div>)}
                          {!abiertos.has(x.id) && <span className="nt-mas">Toca para ver todo</span>}
                        </div>
                        <div className="nt-pie">
                          <span className="nt-hora"><i className="fa-regular fa-clock"></i> {tiempoRelativo(x.fecha, n.ahora)}</span>
                          {x.accion && <button className="nt-accion" onClick={() => accion(x)}>{x.accion.etiqueta} <i className="fa-solid fa-arrow-right"></i></button>}
                          <span className="nt-sep"></span>
                          <button className="nt-mini" onClick={() => n.recordarManana(x.id)} title="Recordármelo mañana">Mañana</button>
                          <button className="nt-mini" onClick={() => descartar(x)} title="Descartar" aria-label="Descartar"><i className="fa-solid fa-xmark"></i></button>
                        </div>
                      </div>
                    </article>
                  ))}
                </section>); })}
          </div>
        </div>
      )}
    </div>
  );
}
