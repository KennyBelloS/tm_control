import { useEstadoConexion } from '../lib/useEstadoConexion';

export default function EstadoConexion() {
  const { enLinea, pendientes, sincronizando, ultimoResultado, reconectado } = useEstadoConexion();

  if (enLinea && pendientes === 0 && !sincronizando && !ultimoResultado && !reconectado) return null;

  if (!enLinea) {
    return (
      <div className="conexion-banda conexion-offline">
        <i className="fa-solid fa-cloud-arrow-up"></i>
        Sin conexión a internet — lo que subas se guarda en este dispositivo y se sube solo cuando vuelva la señal.
        {pendientes > 0 && <strong>&nbsp;({pendientes} pendiente{pendientes !== 1 ? 's' : ''})</strong>}
      </div>
    );
  }

  if (sincronizando) {
    return (
      <div className="conexion-banda conexion-sincronizando">
        <i className="fa-solid fa-arrows-rotate fa-spin"></i>
        Subiendo {pendientes} cambio{pendientes !== 1 ? 's' : ''} guardado{pendientes !== 1 ? 's' : ''} sin conexión...
      </div>
    );
  }

  if (pendientes > 0) {
    return (
      <div className="conexion-banda conexion-pendiente">
        <i className="fa-solid fa-triangle-exclamation"></i>
        {pendientes} cambio{pendientes !== 1 ? 's' : ''} sin subir todavía — se reintentará automáticamente.
      </div>
    );
  }

  if (ultimoResultado?.exitosas > 0) {
    return (
      <div className="conexion-banda conexion-ok">
        <i className="fa-solid fa-circle-check"></i>
        Todo al día — {ultimoResultado.exitosas} cambio{ultimoResultado.exitosas !== 1 ? 's' : ''} pendiente{ultimoResultado.exitosas !== 1 ? 's' : ''} ya se subió correctamente.
      </div>
    );
  }

  if (reconectado) {
    return (
      <div className="conexion-banda conexion-ok">
        <i className="fa-solid fa-wifi"></i>
        Conexión restablecida — no había cambios pendientes por subir.
      </div>
    );
  }

  return null;
}
