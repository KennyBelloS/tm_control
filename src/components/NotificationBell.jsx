import { useEffect, useRef, useState } from 'react';
import { getAlertasBajoRendimiento } from '../lib/db';

const KEY_LEIDAS = 'tm_notif_leidas';
const KEY_ELIMINADAS = 'tm_notif_eliminadas';

function leerSet(key) {
  try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')); } catch { return new Set(); }
}
function guardarSet(key, set) {
  localStorage.setItem(key, JSON.stringify([...set]));
}

function formatoFechaHora(fecha) {
  return new Date(fecha).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function NotificationBell() {
  const [abierto, setAbierto] = useState(false);
  const [notificaciones, setNotificaciones] = useState([]);
  const [leidas, setLeidas] = useState(() => leerSet(KEY_LEIDAS));
  const [eliminadas, setEliminadas] = useState(() => leerSet(KEY_ELIMINADAS));
  const ref = useRef(null);

  useEffect(() => {
    let activo = true;
    getAlertasBajoRendimiento({ dias: 7, minimoDiasSeguidos: 3 })
      .then(alertas => {
        if (!activo) return;
        const items = alertas.map(a => ({
          id: `bajo-rendimiento-${a.colaborador_id}-${a.ultimaFecha}`,
          tipo: 'warning',
          icono: 'fa-triangle-exclamation',
          titulo: 'Rendimiento bajo sostenido',
          descripcion: `${a.colaborador} lleva ${a.diasSeguidos} días seguidos por debajo del 90% de la meta (promedio ${a.promedioRend} tallos/h).`,
          fecha: a.ultimaFecha,
        }));
        setNotificaciones(items);
      })
      .catch(() => {});
    return () => { activo = false; };
  }, []);

  useEffect(() => {
    function fuera(e) { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); }
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, []);

  const visibles = notificaciones.filter(n => !eliminadas.has(n.id));
  const noLeidas = visibles.filter(n => !leidas.has(n.id)).length;

  function marcarLeida(id) {
    const nuevas = new Set(leidas); nuevas.add(id);
    setLeidas(nuevas); guardarSet(KEY_LEIDAS, nuevas);
  }
  function marcarTodasLeidas() {
    const nuevas = new Set(leidas);
    visibles.forEach(n => nuevas.add(n.id));
    setLeidas(nuevas); guardarSet(KEY_LEIDAS, nuevas);
  }
  function eliminar(id) {
    const nuevas = new Set(eliminadas); nuevas.add(id);
    setEliminadas(nuevas); guardarSet(KEY_ELIMINADAS, nuevas);
  }

  return (
    <div className="notif-wrap" ref={ref}>
      <button className="notif-bell" onClick={() => { setAbierto(o => !o); if (!abierto) visibles.forEach(n => marcarLeida(n.id)); }}>
        <i className="fa-solid fa-bell"></i>
        {noLeidas > 0 && <span className="notif-badge">{noLeidas}</span>}
      </button>

      {abierto && (
        <div className="notif-panel">
          <div className="notif-panel-header">
            <h3>Notificaciones</h3>
            {visibles.length > 0 && (
              <button className="notif-marcar-todas" onClick={marcarTodasLeidas}>
                <i className="fa-solid fa-check-double"></i> Marcar todas leídas
              </button>
            )}
          </div>

          <div className="notif-lista">
            {visibles.length === 0 ? (
              <div className="notif-vacio">
                <i className="fa-solid fa-bell-slash"></i>
                Sin notificaciones nuevas.
              </div>
            ) : (
              visibles.map(n => (
                <div key={n.id} className={`notif-item notif-${n.tipo}`}>
                  <div className={`notif-icono notif-icono-${n.tipo}`}>
                    <i className={`fa-solid ${n.icono}`}></i>
                  </div>
                  <div className="notif-cuerpo">
                    <strong>{n.titulo}</strong>
                    <p>{n.descripcion}</p>
                    <div className="notif-pie">
                      <span className="notif-fecha">{formatoFechaHora(n.fecha)}</span>
                      {leidas.has(n.id) && <span className="notif-leido"><i className="fa-solid fa-check"></i> Leído al abrir</span>}
                    </div>
                  </div>
                  <button className="notif-borrar" onClick={() => eliminar(n.id)} title="Eliminar">
                    <i className="fa-solid fa-trash"></i>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
