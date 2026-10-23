import { useState } from 'react';
import { fmt, fFecha, fCorta } from './util';
import { BarrasVerticales, COLORES } from './Graficos';
import { NombreCodigo, etiquetaGrafico } from './NombreCodigo';
import { exportarImagenTop5, htmlTop5Vista } from '../../lib/exportImagenDevoluciones';
import { ModalVistaImagen } from '../VistaPreviaImagen';
import { serieDevoluciones, topCausas } from '../../lib/devolucionesAnalisis';
import { avisar } from '../../lib/avisos';

const NOMBRES = { dia: 'Día', semana: 'Semana', mes: 'Mes', historico: 'Histórico' };
const TITULO = { dia: 'día seleccionado', semana: 'semana seleccionada', mes: 'mes seleccionado', historico: 'histórico' };

function Tabla({ filas, tipo, vacio, modo, onVer }) {
  if (!filas.length) return <p className="dev-vacio-mini">{vacio}</p>;
  return (
    <div className="dev-tabla-scroll"><table className="dev-tabla dev-top">
      <thead><tr><th>#</th>{modo !== 'codigo' && <th>Colaborador</th>}{modo !== 'nombre' && <th className="num">Código</th>}<th className="num">Devol.</th>{tipo === 'menos' && <th className="num">Días</th>}</tr></thead>
      <tbody>
        {filas.map((e, i) => (
          <tr key={e.id} className={onVer ? 'fila-clic' : ''} onClick={onVer ? () => onVer(e) : undefined} title={onVer ? 'Clic para ver el seguimiento de esta persona' : undefined}>
            <td><span className={`dev-puesto dev-puesto-${tipo}`}>{i + 1}</span></td>
            {modo !== 'codigo' && <td className="dev-nombre">{e.nombre}</td>}
            {modo !== 'nombre' && <td className="num"><NombreCodigo codigo={e.codigo} modo="codigo" copiable={false} /></td>}
            <td className="num"><b>{fmt(e.devol)}</b></td>
            {tipo === 'menos' && <td className="num">{e.diasTrab}</td>}
          </tr>
        ))}
      </tbody>
    </table></div>
  );
}

/** Quién más y quién menos devuelve, por período: la barra de cada uno (como en el Excel) y su tabla. */
export default function TopDev({ rankings, periodos, minimos, diaSinCargar, ultima, modo = 'ambos', onVer, datosCrudos, razones }) {
  const [p, setP] = useState('semana');
  const [bajando, setBajando] = useState(false);
  const r = rankings[p];
  const P = periodos[p];
  const rango = p === 'dia' ? fFecha(P.desde) : p === 'historico' ? 'todo el historial' : `${fCorta(P.desde)} al ${fCorta(P.hasta)}`;
  const datos = lista => lista.map(e => ({ ...etiquetaGrafico(e.nombre, e.codigo, modo), valor: e.devol, titulo: `${e.nombre} (código ${e.codigo ?? '—'})` }));
  const sinDato = p === 'dia' && diaSinCargar;
  const armar = () => {
    const c = datosCrudos ? topCausas(datosCrudos, razones || [], P.desde, P.hasta, 6) : null;
    const grafico = datosCrudos ? { serie: serieDevoluciones(datosCrudos, P.desde, P.hasta), causas: c.filas } : null;
    // En la imagen: MÁS devoluciones solo con el código; MENOS devoluciones con el nombre (sin importar "Mostrar colaborador por").
    return { periodo: p, periodoNombre: NOMBRES[p], desde: P.desde, hasta: P.hasta, rango, mas: r.mas.map(e => ({ codigo: e.codigo, devol: e.devol })), menos: r.menos.map(e => ({ nombre: e.nombre, codigo: e.codigo, devol: e.devol, diasTrab: e.diasTrab })), personasConDevoluciones: r.personasConDevoluciones, minDias: r.minDias ?? minimos?.[p] ?? 1, grafico };
  };
  const [previa, setPrevia] = useState(null);                                   // null = cerrada · { html } = abierta (html null mientras se arma)
  const verPrevia = async () => { setPrevia({ html: null }); try { setPrevia({ html: await htmlTop5Vista(armar()) }); } catch (e) { setPrevia(null); avisar(e.message || 'No se pudo armar la vista previa.', 'error'); } };
  const descargar = async () => {
    setBajando(true);
    try {
      await exportarImagenTop5(armar());
      avisar('Imagen del Top 5 descargada.');
    } catch (e) { avisar(e.message || 'No se pudo generar la imagen.', 'error'); } finally { setBajando(false); }
  };
  return (
    <div className="dev-panel">
      <div className="dev-sub">
        <div className="fuente-toggle" role="tablist" aria-label="Período">
          {Object.entries(NOMBRES).map(([k, n]) => <button key={k} className={p === k ? 'activo' : ''} onClick={() => setP(k)} role="tab" aria-selected={p === k}>{n}</button>)}
        </div>
        <button className="btn-secondary dev-descargar" onClick={verPrevia} disabled={bajando || sinDato} title="Mira cómo quedará la imagen antes de descargarla"><i className="fa-solid fa-eye"></i> Vista previa</button>
        <button className="btn-secondary dev-descargar" onClick={descargar} disabled={bajando || sinDato} title="Descarga una imagen con gráficos: más devoluciones solo con el código, menos devoluciones con el nombre"><i className={`fa-solid ${bajando ? 'fa-spinner fa-spin' : 'fa-image'}`}></i> Descargar imagen</button>
        <span className="dev-rango">{rango} · en las barras: {modo === 'codigo' ? 'el código' : modo === 'nombre' ? 'el nombre' : 'el código y el nombre'} de cada persona</span>
      </div>
      {p === 'dia' && diaSinCargar
        ? <p className="dev-vacio-mini"><i className="fa-solid fa-calendar-xmark"></i> El {fFecha(P.desde)} todavía no tiene devoluciones cargadas (último día cargado: {fFecha(ultima)}). Elige otro día o el período «Semana», «Mes» o «Histórico».</p>
        : <div className="dev-dos">
        <section className="dev-caja dev-caja-mas">
          <h4><i className="fa-solid fa-arrow-trend-up"></i> Más devoluciones</h4>
          {r.mas.length > 0 && <BarrasVerticales titulo={`MÁS — ${TITULO[p]}`} datos={datos(r.mas)} color={COLORES.mas} />}
          <Tabla filas={r.mas} tipo="mas" modo={modo} onVer={onVer} vacio="Nadie tuvo devoluciones en este período." />
          <p className="dev-pie">Personas con devoluciones: <b>{r.personasConDevoluciones}</b></p>
        </section>
        <section className="dev-caja dev-caja-menos">
          <h4><i className="fa-solid fa-arrow-trend-down"></i> Menos devoluciones</h4>
          {r.menos.length > 0 && <BarrasVerticales titulo={`MENOS — ${TITULO[p]}`} datos={datos(r.menos)} color={COLORES.menos} />}
          <Tabla filas={r.menos} tipo="menos" modo={modo} onVer={onVer} vacio={`Nadie cumple el mínimo de ${minimos[p]} día(s) trabajados en este período.`} />
          <p className="dev-pie">
            Elegibles: <b>{r.elegibles}</b> (mínimo {minimos[p]} día{minimos[p] === 1 ? '' : 's'} trabajados y fuera del Top 5 de “más”)
            {r.empatadosFuera > 0 && <> · <b>{r.empatadosFuera}</b> más empatan con {r.quintoDevol} devol. en el 5.º puesto (desempate: más días trabajados, luego código)</>}
          </p>
        </section>
      </div>}
      {previa && <ModalVistaImagen titulo="Vista previa — Top 5 de devoluciones" html={previa.html} onCerrar={() => setPrevia(null)} acciones={[
        { texto: 'Descargar imagen', icono: 'fa-image', onClick: descargar, deshabilitado: bajando || !previa.html }]} />}
    </div>
  );
}
