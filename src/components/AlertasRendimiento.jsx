import { useEffect, useState } from 'react';
import { getAlertasBajoRendimiento } from '../lib/db';

export default function AlertasRendimiento() {
  const [alertas, setAlertas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let activo = true;
    getAlertasBajoRendimiento({ dias: 7, minimoDiasSeguidos: 3 })
      .then(r => { if (activo) setAlertas(r); })
      .catch(e => { if (activo) setError(e.message); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, []);

  if (cargando) return null;
  if (error) return null; // no interrumpir la pantalla si esto falla, es informativo

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2><i className="fa-solid fa-triangle-exclamation" style={{ color: 'var(--warning)', marginRight: 8 }}></i>Notificaciones y Advertencias</h2>
          <p>Personas con rendimiento bajo (menos del 90% de la meta) durante varios días seguidos.</p>
        </div>
      </div>

      {alertas.length === 0 ? (
        <div className="empty-state">
          <i className="fa-solid fa-circle-check" style={{ color: 'var(--success)' }}></i>
          Sin alertas activas — nadie lleva 3 o más días seguidos por debajo del rendimiento esperado.
        </div>
      ) : (
        <div className="alertas-lista">
          {alertas.map(a => (
            <div key={a.colaborador_id} className="alerta-item">
              <div className="alerta-icono"><i className="fa-solid fa-arrow-trend-down"></i></div>
              <div className="alerta-info">
                <strong>{a.colaborador}</strong>
                <span>Rendimiento bajo durante <strong>{a.diasSeguidos} días seguidos</strong> (hasta el {a.ultimaFecha}) · promedio {a.promedioRend} tallos/h</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
