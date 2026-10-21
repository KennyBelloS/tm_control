import { useMemo, useState } from 'react';
import { topPersonasPorCausa } from '../../lib/devolucionesAnalisis';
import { NombreCodigo } from './NombreCodigo';
import { exportarImagenPorCausa } from '../../lib/exportImagenDevoluciones';
import { avisar } from '../../lib/avisos';
import { fmt, fCorta } from './util';

const NOMBRES = { dia: 'Día', semana: 'Semana', mes: 'Mes', historico: 'Histórico' };
const MEDALLA = ['#C9932B', '#8E9BA3', '#B5703B'];

/**
 * Para cada causa (fitosanidad, descabece, maltrato…): las 3 personas con más devoluciones por ESA causa.
 * Se filtra por día, semana, mes o histórico, y los colaboradores se ven según "Mostrar colaborador por".
 */
export default function TopCausas({ datos, razones, periodos, diaSinCargar, modo }) {
  const [p, setP] = useState(() => { try { return localStorage.getItem('tm_dev_topcausas') || 'mes'; } catch { return 'mes'; } });
  const elegir = v => { setP(v); try { localStorage.setItem('tm_dev_topcausas', v); } catch { /* sin almacenamiento */ } };
  const P = periodos[p];
  const causas = useMemo(() => topPersonasPorCausa(datos, razones, P.desde, P.hasta, 3), [datos, razones, P.desde, P.hasta]);
  const rango = p === 'dia' ? fCorta(P.desde) : p === 'historico' ? 'todo el historial' : `${fCorta(P.desde)} al ${fCorta(P.hasta)}`;
  const sinDato = p === 'dia' && diaSinCargar;
  const [bajando, setBajando] = useState(false);
  const descargar = async () => {
    setBajando(true);
    try {
      // En la imagen las personas salen SOLO con su código (son las que más devoluciones tienen por esa causa).
      await exportarImagenPorCausa({ periodo: p, periodoNombre: NOMBRES[p], desde: P.desde, hasta: P.hasta, rango, causas: causas.map(c => ({ nombre: c.nombre, total: c.total, personasConCausa: c.personasConCausa, empatadosFuera: c.empatadosFuera, personas: c.personas.map(x => ({ codigo: datos.personas.get(x.id)?.codigo ?? null, cantidad: x.cantidad })) })) });
      avisar('Imagen del Top 3 por causa descargada.');
    } catch (e) { avisar(e.message || 'No se pudo generar la imagen.', 'error'); } finally { setBajando(false); }
  };
  return (
    <section className="dev-topcausas" aria-label="Top 3 de personas por causa de devolución">
      <header>
        <div><h4><i className="fa-solid fa-ranking-star"></i> Top 3 de personas por causa</h4><small>{rango} · quién tiene más devoluciones en cada causa</small></div>
        <button className="btn-secondary dev-descargar" onClick={descargar} disabled={bajando || sinDato || causas.length === 0} title="Descarga una imagen con el código de las 3 personas de cada causa"><i className={`fa-solid ${bajando ? 'fa-spinner fa-spin' : 'fa-image'}`}></i> Descargar imagen</button>
        <div className="fuente-toggle" role="tablist" aria-label="Período">
          {Object.entries(NOMBRES).map(([k, n]) => <button key={k} className={p === k ? 'activo' : ''} onClick={() => elegir(k)} role="tab" aria-selected={p === k}>{n}</button>)}
        </div>
      </header>
      {sinDato ? <p className="dev-vacio-mini">Ese día todavía no tiene devoluciones cargadas.</p>
        : causas.length === 0 ? <p className="dev-vacio-mini">Sin devoluciones en este período 🎉</p>
        : (
          <div className="dev-topcausas-lista">
            {causas.map(c => (
              <article key={c.k} className="dev-causa-card" data-causa={c.k}>
                <header><strong>{c.nombre}</strong><span>{fmt(c.total)} en total · {fmt(c.personasConCausa)} persona{c.personasConCausa === 1 ? '' : 's'}</span></header>
                <ol>
                  {c.personas.map((x, i) => {
                    const per = datos.personas.get(x.id) || { nombre: `ID ${x.id}`, codigo: null };
                    return (
                      <li key={x.id} style={{ '--medalla': MEDALLA[i] }}>
                        <span className="dev-causa-puesto">{i + 1}</span>
                        <span className="dev-causa-quien"><NombreCodigo nombre={per.nombre} codigo={per.codigo} modo={modo} negrita /></span>
                        <span className="dev-causa-barra"><i style={{ width: `${(x.cantidad / c.personas[0].cantidad) * 100}%` }}></i></span>
                        <b>{fmt(x.cantidad)}</b>
                      </li>
                    );
                  })}
                </ol>
                {c.empatadosFuera > 0 && <small className="dev-causa-empate">+{c.empatadosFuera} persona{c.empatadosFuera === 1 ? '' : 's'} más con {fmt(c.personas[2].cantidad)}</small>}
              </article>
            ))}
          </div>
        )}
    </section>
  );
}
