import { useEffect, useState } from 'react';
import { getUltimaFechaHistorico } from '../lib/db';

const SEGUNDOS_VISIBLE = 20;
const KEY_CERRADA = 'tm_aviso_historico_cerrado';

function diasDeDiferencia(fechaISO) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fecha = new Date(fechaISO + 'T00:00:00');
  return Math.round((hoy - fecha) / 86400000);
}

export default function AvisoHistoricoDesactualizado() {
  const [visible, setVisible] = useState(false);
  const [dias, setDias] = useState(0);
  const [fechaAviso, setFechaAviso] = useState(null);

  useEffect(() => {
    let activo = true;
    getUltimaFechaHistorico()
      .then(ultimaFecha => {
        if (!activo || !ultimaFecha) return;
        const diferencia = diasDeDiferencia(ultimaFecha);
        if (diferencia <= 1) return;

        const yaCerrado = localStorage.getItem(KEY_CERRADA);
        if (yaCerrado === ultimaFecha) return;

        setDias(diferencia);
        setFechaAviso(ultimaFecha);
        setVisible(true);
      })
      .catch(() => {});
    return () => { activo = false; };
  }, []);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setVisible(false), SEGUNDOS_VISIBLE * 1000);
    return () => clearTimeout(t);
  }, [visible]);

  function cerrar() {
    if (fechaAviso) localStorage.setItem(KEY_CERRADA, fechaAviso);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="aviso-historico-flotante">
      <i className="fa-solid fa-triangle-exclamation"></i>
      <span>
        El último Histórico registrado lleva <strong>{dias} días</strong> sin modificarse ({fechaAviso}) —
        revisa si falta cargar un día o ajustar tiempos muertos.
      </span>
      <button onClick={cerrar} title="Cerrar aviso">
        <i className="fa-solid fa-xmark"></i>
      </button>
    </div>
  );
}
