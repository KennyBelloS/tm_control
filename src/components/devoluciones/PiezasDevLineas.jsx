import { fFecha, fCorta } from './util';

const NOMBRE = { dia: 'Día', semana: 'Semana', mes: 'Mes' };

/** Filtro "Devoluciones: Día · Semana · Mes". Por defecto solo el día; la semana y el mes se ven aparte, al elegirlos. */
export function FiltroDevoluciones({ periodo, onCambio, className = '' }) {
  return (
    <div className={`dev-filtro ${className}`}>
      <span>Devoluciones</span>
      <div className="fuente-toggle" role="tablist" aria-label="Período de las devoluciones">
        {Object.entries(NOMBRE).map(([k, n]) => (
          <button key={k} className={periodo === k ? 'activo' : ''} onClick={() => onCambio(k)} role="tab" aria-selected={periodo === k}
            title={k === 'dia' ? 'Solo las devoluciones del día' : k === 'semana' ? 'Las de la semana (domingo a sábado)' : 'Las del mes'}>{n}</button>
        ))}
      </div>
    </div>
  );
}

/**
 * El valor del período elegido para una persona/formadora. Cada fila de Líneas pertenece a UN DÍA: si ese día todavía no está
 * cargado (es posterior al último que se subió), no se muestra ningún número —ni el del día, ni el de la semana, ni el del mes—.
 */
export function valorPeriodo(d, periodo, hayDia) {
  if (!d || !hayDia) return null;
  return periodo === 'dia' ? d.dia : periodo === 'semana' ? d.semana : d.mes;
}

/** Texto corto que dice QUÉ se está mostrando y hasta cuándo hay datos. */
export function etiquetaPeriodo(periodo, fecha, ultima) {
  const hasta = ultima ? ` · datos hasta el ${fCorta(ultima)}` : '';
  if (periodo === 'dia') return fecha ? `del día ${fCorta(fecha)}` : 'del día';
  return periodo === 'semana' ? `de la semana${hasta}` : `del mes${hasta}`;
}

/** Una cifra de devoluciones: rojo si hubo, verde si no, y "—" (gris) si ese día aún no está cargado. */
export function CifraDev({ valor, ultima, periodo, fecha, claseBase = '' }) {
  if (valor == null) {
    return <span className={`dev-gris ${claseBase}`} title={`El ${fecha ? fFecha(fecha) : 'día'} todavía no tiene devoluciones cargadas${ultima ? ` (último día cargado: ${fFecha(ultima)})` : ''}. Elige un día ya cargado.`}>—</span>;
  }
  return <b className={`${valor > 0 ? 'dev-rojo' : 'dev-verde'} ${claseBase}`}>{valor.toLocaleString('es-CO')}</b>;
}

/** Filtro del Tablero: el DÍA siempre se ve; aquí se activan, aparte, la SEMANA y/o el MES. */
export function FiltroExtrasTablero({ extras, onCambio }) {
  const caja = (clave, texto, ayuda) => (
    <label className={`dev-chip-check ${extras[clave] ? 'on' : ''}`} title={ayuda}>
      <input type="checkbox" checked={extras[clave]} onChange={e => onCambio({ ...extras, [clave]: e.target.checked })} />
      <i className={`fa-solid ${extras[clave] ? 'fa-square-check' : 'fa-square'}`}></i> {texto}
    </label>
  );
  return (
    <div className="dev-filtro-tablero">
      <span className="dev-filtro-et"><i className="fa-solid fa-rotate-left"></i> Devoluciones: el <b>día</b> siempre se ve. Mostrar además:</span>
      {caja('semana', 'Semana', 'Agrega la columna con las devoluciones de la semana (domingo a sábado) de cada fila')}
      {caja('mes', 'Mes', 'Agrega la columna con las devoluciones del mes de cada fila')}
    </div>
  );
}
