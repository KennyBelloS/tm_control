import { DIAS_SEMANA } from '../devoluciones/util';
import { COLOR_ESTADO } from './GraficoDias';

const fmt = n => Math.round(n).toLocaleString('es-CO');
const diaTxt = iso => `${DIAS_SEMANA[new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10))).getUTCDay()]} ${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/** El detalle del día que se tocó (en el gráfico o en el mapa). */
export default function DetalleDia({ dia, metaHora, razonesNombre, ultimaDev, enModulo }) {
  if (!dia) return <section className="colab-detalle vacio"><i className="fa-regular fa-hand-pointer"></i><p>Toca un día del gráfico o del mapa para ver su detalle.</p></section>;
  const razones = Object.entries(dia.razones || {}).sort((a, b) => b[1] - a[1]);
  return (
    <section className="colab-detalle" key={dia.fecha}>
      {(dia.festivo || dia.tipoDia === 'domingo') && <p className="colab-detalle-especial"><i className="fa-solid fa-calendar-day"></i> {dia.festivo ? `Festivo en Colombia: ${dia.festivo}` : 'Domingo'} — día no laborable; solo cuenta si hubo reporte.</p>}
      {dia.via && <p className="colab-detalle-via"><i className="fa-solid fa-people-arrows"></i> Como clasificador de <b>{dia.via.nombre}</b>: este día toma su asistencia, rendimiento y devoluciones.</p>}
      <header><h4>{diaTxt(dia.fecha)}</h4>{dia.estado && <span className={`colab-nivel colab-nivel-${{ success: 'ok', warning: 'aviso', danger: 'mal' }[dia.estado.css]}`}>{dia.estado.label}</span>}</header>
      {dia.trabajo ? (
        <>
          <div className="colab-detalle-cifra" style={{ '--c': COLOR_ESTADO[dia.estado.css] }}><strong>{fmt(dia.rend)}</strong><span>tallos por hora · {dia.pct.toFixed(1).replace('.', ',')}% de la meta de {fmt(metaHora)}</span></div>
          <dl><div><dt>Tallos</dt><dd>{fmt(dia.tallos)}</dd></div><div><dt>Horas reales</dt><dd>{dia.horas.toFixed(1).replace('.', ',')}</dd></div><div><dt>Frente a la meta</dt><dd className={dia.rend >= metaHora ? 'dev-ok' : 'dev-mal'}>{dia.rend >= metaHora ? '+' : '−'}{fmt(Math.abs(dia.rend - metaHora))} t/h</dd></div></dl>
          <p className="colab-detalle-msg">{dia.estado.mensaje}</p>
        </>
      ) : <p className="colab-detalle-msg">No hay rendimiento registrado este día.</p>}
      <div className="colab-detalle-dev">
        <h5><i className="fa-solid fa-rotate-left"></i> Devoluciones</h5>
        {!enModulo ? <p className="dev-cero">La persona no aparece en el módulo de Devoluciones.</p>
          : dia.devol === null ? <p className="dev-cero">Este día todavía no está cargado{ultimaDev ? ` (último día cargado: ${ultimaDev.slice(8, 10)}/${ultimaDev.slice(5, 7)})` : ''}.</p>
          : dia.devol === 0 ? <p className="dev-ok">Sin devoluciones{dia.asistioDev === false ? ' (y no tiene asistencia registrada ese día)' : ''}.</p>
          : <><p><b>{dia.devol}</b> {dia.devol === 1 ? 'devolución' : 'devoluciones'}{dia.asistioDev === false ? ' — sin asistencia registrada ese día' : ''}</p>
            <div className="colab-chips">{razones.map(([k, v]) => <span key={k} className="dev-chip">{razonesNombre[k] || k.replace(/_/g, ' ')} · {v}</span>)}</div></>}
      </div>
    </section>
  );
}
