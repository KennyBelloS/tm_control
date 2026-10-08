import { Fragment, useState } from 'react';
import { etiquetaHora, formatoFecha } from '../lib/clasificacionCalculos';

const fmt = n => (n ?? 0).toLocaleString('es-CO');
const signo = n => (n > 0 ? `▲ +${fmt(n)}` : n < 0 ? `▼ −${fmt(Math.abs(n))}` : '＝ igual');

/**
 * La cuadrícula hora a hora: por línea una fila de HOY y una de AYER, y al final el total de todas las líneas.
 * Todo son datos reales guardados (nada estimado). Verde = hoy movió más que ayer en esa hora, rojo = menos.
 * La hora que todavía no termina se ve con su valor real, con borde punteado y sin veredicto.
 */
export default function ClasificacionGrid({ datos, modo = 'hora', etiquetas = {} }) {
  const [horaActiva, setHoraActiva] = useState(null);
  const { horas, porLinea, total, fechaHoy, fechaAyer, ultimaCompletaHora } = datos;
  const sinAyer = !fechaAyer;
  const sinHoy = !datos.cargaHoy;
  const hayBase = ultimaCompletaHora >= horas[0];
  const encima = h => ({ onMouseEnter: () => setHoraActiva(h), onMouseLeave: () => setHoraActiva(null) });

  const grupo = (resumen, titulo, subtitulo, esTotal) => (
    <Fragment key={esTotal ? 'total' : resumen.linea}>
      <tr className={`cls-fila-hoy ${esTotal ? 'cls-fila-total' : ''}`}>
        <td className={`cls-celda-linea ${sinAyer ? '' : 'cls-celda-linea-1'}`}>
          <strong>{titulo}</strong>
          {subtitulo && <small>{subtitulo}</small>}
        </td>
        <td className="cls-celda-fecha">{formatoFecha(fechaHoy)} <span className="cls-tag">Hoy</span></td>
        {resumen.celdas.map(c => {
          const estado = modo === 'acumulado' ? c.acumEstado : c.estado;
          const valor = modo === 'acumulado' ? c.acumHoy : c.hoy;
          const diff = modo === 'acumulado' ? c.acumDiferencia : c.diferencia;
          const futuro = estado === 'futuro', curso = estado === 'curso';
          return (
            <td key={c.hora} className={`cls-n cls-${estado} ${horaActiva === c.hora ? 'cls-activa' : ''}`} {...encima(c.hora)}
              title={futuro ? `${etiquetaHora(c.hora)}: todavía no llega`
                : curso ? `${etiquetaHora(c.hora)} (en curso): lleva ${fmt(c.hoy)} tallos. Ayer en esa hora, completa: ${fmt(c.ayer)}. Se compara cuando termine la hora.`
                : `${etiquetaHora(c.hora)}\\nHoy: ${fmt(c.hoy)}${sinAyer ? '' : `\\nAyer: ${fmt(c.ayer)}\\nDiferencia: ${signo(c.diferencia)}`}`}>
              {futuro ? '—' : (
                <>
                  {fmt(valor)}
                  {curso ? <small>en curso</small> : !sinAyer && <small>{signo(diff)}</small>}
                </>
              )}
            </td>
          );
        })}
        {sinHoy ? (
          <td className="cls-n cls-futuro" title="Todavía no hay clasificación cargada para esta fecha">—</td>
        ) : (
          <td className={`cls-n cls-acum cls-${resumen.estado}`}
            title={sinAyer ? 'Sin día anterior para comparar' : 'Lo que lleva hoy. La diferencia compara solo las horas completas de hoy contra esas mismas horas de ayer (datos reales).'}>
            <strong>{fmt(resumen.totalHoy)}</strong>
            {!sinAyer && hayBase ? <small>{signo(resumen.diferencia)} · horas completas</small> : <small>lleva hoy</small>}
          </td>
        )}
      </tr>
      {!sinAyer && (
        <tr className={`cls-fila-ayer ${esTotal ? 'cls-fila-total' : ''}`}>
          <td className="cls-celda-linea cls-celda-linea-2"></td>
          <td className="cls-celda-fecha">{formatoFecha(fechaAyer)} <span className="cls-tag cls-tag-ayer">Ayer</span></td>
          {resumen.celdas.map(c => (
            <td key={c.hora} className={`cls-n cls-ayer ${horaActiva === c.hora ? 'cls-activa' : ''}`} {...encima(c.hora)}>
              {fmt(modo === 'acumulado' ? c.acumAyer : c.ayer)}
            </td>
          ))}
          <td className="cls-n cls-acum-ayer" title="Total real de ese día">
            <strong>{fmt(resumen.totalAyer)}</strong>
            <small>total del día</small>
          </td>
        </tr>
      )}
    </Fragment>
  );

  return (
    <div className="cls-scroll">
      <table className="cls-tabla">
        <thead>
          <tr>
            <th>Línea</th><th>Fecha</th>
            {horas.map(h => (
              <th key={h} className={`${horaActiva === h ? 'cls-activa-th' : ''} ${datos.parcial && h === datos.ultimaHoy ? 'cls-th-parcial' : ''}`} {...encima(h)}>
                {etiquetaHora(h)}
              </th>
            ))}
            <th>Acum. día</th>
          </tr>
        </thead>
        <tbody>
          {porLinea.map(l => grupo(l, etiquetas[l.linea]?.nombre || `Línea ${l.linea}`, etiquetas[l.linea]?.formadora, false))}
          {porLinea.length > 1 && grupo(total, 'Total', 'todas las líneas', true)}
        </tbody>
      </table>
    </div>
  );
}
