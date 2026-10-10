import { useEffect, useState } from 'react';
import { getRankingFormadoras, getDetalleRendimientoTurnoActual } from '../lib/lineas';
import { etiquetaCortaLinea } from '../lib/clasificacionCalculos';

const fmt = n => (n ?? 0).toLocaleString('es-CO');
const MEDALLAS = ['🥇', '🥈', '🥉'];
const iniciales = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();

/** Ranking de formadoras del período elegido: rendimiento de su gente (contra la meta) y lo que movió su línea (contra la líder). */
export default function RankingFormadoras({ fuente, desde, hasta, metaHora = 470 }) {
  const [lista, setLista] = useState(null);
  const [orden, setOrden] = useState('rend');
  useEffect(() => {
    let activo = true;
    setLista(null);
    const cargar = fuente === 'actual'
      ? getDetalleRendimientoTurnoActual(metaHora).then(t => (t && !t.sinAsignaciones ? t.porFormadora.map(g => ({
          id: g.id, nombre: g.nombre, rendPromedio: g.rendPromedio, operarios: g.operarios.length,
          clasifTallos: g.clasif?.disponible ? g.clasif.tallos : null, lineas: g.clasif?.lineas || []
        })) : []))
      : getRankingFormadoras(desde, hasta);
    cargar.then(r => { if (activo) setLista(r); }).catch(() => { if (activo) setLista([]); });
    return () => { activo = false; };
  }, [fuente, desde, hasta, metaHora]);

  if (lista === null) return <div className="esqueleto" style={{ height: 120, marginTop: 4 }}></div>;
  if (lista.length === 0) return null;

  const ordenada = [...lista].sort((a, b) => orden === 'clasif'
    ? ((b.clasifTallos ?? -1) - (a.clasifTallos ?? -1)) || (b.rendPromedio - a.rendPromedio)
    : (b.rendPromedio - a.rendPromedio));
  const maxClasif = Math.max(1, ...lista.map(g => g.clasifTallos ?? 0));
  const escala = metaHora * 1.3;
  const liderClasif = [...lista].filter(g => g.clasifTallos > 0).sort((a, b) => b.clasifTallos - a.clasifTallos)[0];

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2><i className="fa-solid fa-chalkboard-user" style={{ color: 'var(--primary)', marginRight: 8 }}></i>Ranking de formadoras</h2>
          <p>Rendimiento de su gente contra la meta, y lo que movió su línea en clasificación contra la líder.</p>
        </div>
        <div className="fuente-toggle">
          <button className={orden === 'rend' ? 'activo' : ''} onClick={() => setOrden('rend')}><i className="fa-solid fa-gauge-high"></i> Rendimiento</button>
          <button className={orden === 'clasif' ? 'activo' : ''} onClick={() => setOrden('clasif')}><i className="fa-solid fa-boxes-stacked"></i> Clasificación</button>
        </div>
      </div>
      <div className="fl2-lista">
        {ordenada.map((g, i) => {
          const cumple = g.rendPromedio >= metaHora;
          const esLiderClasif = liderClasif && g.id === liderClasif.id;
          return (
            <div key={g.id} className={`fl2-card ${i === 0 ? 'fl2-card-lider' : ''}`} style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}>
              <div className="fl2-cab fl2-fija">
                <span className="fl2-puesto">{i < 3 ? MEDALLAS[i] : `#${i + 1}`}</span>
                <span className={`fl2-avatar ${cumple ? 'fl2-avatar-ok' : 'fl2-avatar-mal'}`}>{iniciales(g.nombre)}</span>
                <span className="fl2-titulo">
                  <strong>{g.nombre}{esLiderClasif && <i className="fl2-corona-mini" title="Lidera la clasificación"> 👑</i>}</strong>
                  <small>{g.operarios} personas{g.dias ? ` · ${g.dias} día(s)` : ''}{g.lineas.length ? ` · ${g.lineas.map(etiquetaCortaLinea).join(' + ')}` : ''}</small>
                </span>
                <span className="fl2-barras">
                  <span className="fl2-barra-fila">
                    <em>Rendimiento</em>
                    <span className="fl2-barra">
                      <i className={`fl2-relleno ${cumple ? 'fl2-relleno-ok' : 'fl2-relleno-mal'}`} style={{ width: `${Math.min((g.rendPromedio / escala) * 100, 100)}%` }}></i>
                      <s className="fl2-meta-marca" style={{ left: `${(metaHora / escala) * 100}%` }}></s>
                    </span>
                    <b className={cumple ? 'fl-ok' : 'fl-mal'}>{g.rendPromedio.toLocaleString('es-CO', { minimumFractionDigits: 1 })}<small>/h · {Math.round((g.rendPromedio / metaHora) * 100)}%</small></b>
                  </span>
                  <span className="fl2-barra-fila">
                    <em>Clasificación</em>
                    <span className="fl2-barra"><i className="fl2-relleno fl2-relleno-clasif" style={{ width: `${g.clasifTallos ? Math.max(3, (g.clasifTallos / maxClasif) * 100) : 0}%` }}></i></span>
                    <b>{g.clasifTallos != null ? fmt(g.clasifTallos) : 'sin datos'}</b>
                  </span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
