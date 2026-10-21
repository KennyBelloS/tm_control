import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { EstadoVacio, BloqueCargando } from '../components/Estados';
import SelectorColab, { guardarReciente, leerRecientes } from '../components/colaborador/SelectorColab';
import Indice from '../components/colaborador/Indice';
import KpisColab from '../components/colaborador/KpisColab';
import GraficoDias from '../components/colaborador/GraficoDias';
import MapaMes from '../components/colaborador/MapaMes';
import DetalleDia from '../components/colaborador/DetalleDia';
import Comparativa from '../components/colaborador/Comparativa';
import Lectura from '../components/colaborador/Lectura';
import { BarrasHorizontales, COLORES } from '../components/devoluciones/Graficos';
import { cargarTableroColaborador, listarColaboradores, sugeridosColaborador } from '../lib/colaborador';
import { TIPOS_PERIODO, PESOS_DEFECTO } from '../lib/colaboradorCalculos';
import { getUltimaFechaHistorico } from '../lib/db';
import { fechaLocalISO } from '../lib/clasificacionCalculos';
import { avisar } from '../lib/avisos';
import { celebrarUnaVez } from '../lib/confeti';

const leer = (clave, defecto) => { try { const v = JSON.parse(localStorage.getItem(clave)); return v ?? defecto; } catch { return defecto; } };
const iniciales = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();

export default function TableroColaborador() {
  const [params, setParams] = useSearchParams();
  const [personas, setPersonas] = useState([]);
  const [ref, setRef] = useState('');
  const [tipo, setTipo] = useState(() => (leer('tm_colab_tipo', 'mes') in TIPOS_PERIODO ? leer('tm_colab_tipo', 'mes') : 'mes'));
  const [pesos, setPesos] = useState(() => {
    const g = leer('tm_colab_pesos', {});
    if (g.constancia != null && g.presentismo == null) g.presentismo = g.constancia;       // el peso que alguien ya había puesto a "constancia" pasa a "presentismo"
    return { ...PESOS_DEFECTO, ...g };
  });
  const [t, setT] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [diaSel, setDiaSel] = useState(null);
  const [sugeridos, setSugeridos] = useState([]);

  const idParam = Number(params.get('id')) || null;
  const persona = useMemo(() => (idParam ? personas.find(p => p.id === idParam) || null : null), [personas, idParam]);

  // lista de personas y fecha de referencia (el último día con datos de boncheo)
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const [lista, ultima] = await Promise.all([listarColaboradores(), getUltimaFechaHistorico().catch(() => null)]);
        if (!vivo) return;
        setPersonas(lista);
        setRef(r => r || (ultima && ultima < fechaLocalISO() ? ultima : fechaLocalISO()));
      } catch (e) { if (vivo) setError(e.message || 'No se pudo leer la lista de personas.'); }
    })();
    return () => { vivo = false; };
  }, []);
  useEffect(() => { try { localStorage.setItem('tm_colab_tipo', JSON.stringify(tipo)); } catch { /* sin almacenamiento */ } }, [tipo]);
  useEffect(() => { try { localStorage.setItem('tm_colab_pesos', JSON.stringify(pesos)); } catch { /* sin almacenamiento */ } }, [pesos]);

  // sugeridos para cuando no hay nadie elegido
  useEffect(() => {
    if (persona || !ref) return;
    sugeridosColaborador(`${ref.slice(0, 8)}01`, ref).then(setSugeridos).catch(() => setSugeridos([]));
  }, [persona, ref]);

  const cargar = useCallback(async () => {
    if (!persona || !ref) return;
    setCargando(true); setError('');
    try {
      const r = await cargarTableroColaborador({ persona, ref, tipo, pesos: PESOS_DEFECTO });
      setT(r);
      if (r.indice.score != null && r.indice.score >= 85) celebrarUnaVez(`tm_confeti_tic_${persona.id}`, { sesion: true });      // un índice sobresaliente se celebra (una vez por sesión)
      const trabajados = r.dias.filter(d => d.trabajo);
      setDiaSel(trabajados.length ? trabajados[trabajados.length - 1].fecha : null);
    } catch (e) { setError(e.message || 'No se pudo armar el tablero.'); setT(null); }
    setCargando(false);
  }, [persona, ref, tipo]);
  useEffect(() => { setT(null); cargar(); }, [cargar]);

  const elegir = p => { guardarReciente(p); setParams({ id: String(p.id) }, { replace: false }); };
  const dia = t?.dias.find(d => d.fecha === diaSel) || null;
  const razonesLista = t ? Object.entries(t.resumen.razones).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => ({ etq: t.devolucion.razonesNombre[k] || k.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase()), valores: [v] })) : [];
  const recientes = leerRecientes();

  return (
    <>
      <PageHeader title="Tablero Integrado del Colaborador" subtitle="TIC · productividad, calidad y presentismo de una persona, juntas en un solo lugar">
        {persona && t?.devolucion.enModulo && <Link className="btn-secondary" to={`/devoluciones?buscar=${encodeURIComponent(t.devolucion.codigoDev ?? persona.nombre)}`}><i className="fa-solid fa-rotate-left"></i> Sus devoluciones</Link>}
      </PageHeader>
      <div className="page colab-pagina">
        <section className="tic-banner" aria-label="Tablero Integrado del Colaborador">
          <div className="tic-sigla" aria-hidden="true">TIC</div>
          <div>
            <h2>Tablero <em>Integrado</em> del Colaborador</h2>
            <p>Productividad, calidad y presentismo de una persona, juntas en un solo lugar.</p>
          </div>
          <div className="tic-claves" aria-hidden="true"><span>Rendimiento</span><span>Devoluciones</span><span>Presentismo</span><span>Equipo</span></div>
        </section>
        <div className="colab-barra">
          <SelectorColab personas={personas} elegido={persona} onElegir={elegir} enfocar={!idParam} />
          <div className="fuente-toggle" role="tablist" aria-label="Período">
            {Object.entries(TIPOS_PERIODO).map(([k, n]) => <button key={k} className={tipo === k ? 'activo' : ''} onClick={() => setTipo(k)} role="tab" aria-selected={tipo === k}>{n}</button>)}
          </div>
          <label className="colab-ref" title="El período se cuenta alrededor de esta fecha">Hasta <input type="date" value={ref} max={fechaLocalISO()} onChange={e => e.target.value && setRef(e.target.value)} /></label>
        </div>

        {error && <div className="alert err"><i className="fa-solid fa-circle-exclamation"></i> {error}</div>}

        {!persona && !error && (
          <div className="colab-inicio">
            <EstadoVacio icono="fa-id-card-clip" titulo="Elige a un colaborador" texto="Busca por código o por nombre. El tablero junta su rendimiento, sus devoluciones, su presentismo y cómo le va frente a su equipo." />
            {(recientes.length > 0 || sugeridos.length > 0) && (
              <div className="colab-atajos">
                {recientes.length > 0 && <div><small>Consultados recientemente</small>{recientes.map(r => <button key={r.id} className="colab-atajo" onClick={() => elegir(r)}><span className="dev-codigo">{r.codigo ?? r.mesa ?? '—'}</span>{r.nombre}</button>)}</div>}
                {sugeridos.length > 0 && <div><small>Mejor rendimiento del período</small>{sugeridos.map(s => { const p = personas.find(x => x.id === s.id) || { id: s.id, nombre: s.nombre, mesa: null, codigo: null }; return <button key={s.id} className="colab-atajo" onClick={() => elegir(p)}><b>{s.rend}</b> t/h · {s.nombre}</button>; })}</div>}
              </div>
            )}
          </div>
        )}

        {persona && cargando && !t && <BloqueCargando alto={320} etiqueta="Armando el tablero…" />}

        {persona && t && (
          <div className={`colab-tablero ${cargando ? 'recargando' : ''}`}>
            <div className="colab-hero">
              <section className="colab-identidad">
                <div className="colab-avatar">{iniciales(persona.nombre)}</div>
                <div className="colab-id-info">
                  <h2>{persona.nombre}</h2>
                  <div className="colab-chips">
                    <span className="dev-codigo codigo-copiable" title="Clic para copiar el código" data-copiar={persona.codigo ?? persona.mesa ?? ''}>Código {persona.codigo ?? persona.mesa ?? '—'}</span>
                    {persona.rol && <span className="colab-chip"><i className="fa-solid fa-user-tag"></i> {persona.rol}</span>}
                    {t.asignacion ? <Link className="colab-chip colab-chip-enlace" to="/lineas" title={`Asignación del ${t.asignacion.fecha.slice(8)}/${t.asignacion.fecha.slice(5, 7)}`}><i className="fa-solid fa-people-group"></i> {t.asignacion.formadora}{t.asignacion.linea ? ` · ${t.asignacion.linea}` : ''}</Link> : <span className="colab-chip colab-chip-gris">Sin formadora asignada</span>}
                    <span className={`colab-chip ${t.devolucion.enModulo ? '' : 'colab-chip-gris'}`}><i className="fa-solid fa-rotate-left"></i> {t.devolucion.enModulo ? `En Devoluciones (código ${t.devolucion.codigoDev ?? '—'})` : 'No está en Devoluciones'}</span>
                  </div>
                  {t.turno && <div className="colab-vivo"><span className="en-vivo-punto"></span> Turno en vivo: <b>{t.turno.rend} t/h</b> · {t.turno.tallos.toLocaleString('es-CO')} tallos{t.turno.hasta ? ` hasta las ${String(t.turno.hasta).slice(0, 5)}` : ''}</div>}
                  <p className="colab-periodo">Período: <b>{t.periodo.desde.slice(8)}/{t.periodo.desde.slice(5, 7)}</b> al <b>{t.periodo.hasta.slice(8)}/{t.periodo.hasta.slice(5, 7)}/{t.periodo.hasta.slice(0, 4)}</b> · comparado con el período anterior</p>
                </div>
              </section>
              <Indice componentes={t.componentes} pesos={pesos} onPesos={setPesos} />
            </div>

            <KpisColab t={t} />

            <div className="colab-dos colab-dos-grafico">
              <GraficoDias dias={t.dias} metaHora={t.metaHora} promedio={t.resumen.promedioRend} seleccionado={diaSel} onElegir={setDiaSel} />
              <Lectura lecturas={t.lecturas} />
            </div>

            <div className="colab-dos">
              <MapaMes dias={t.dias} mesDe={`${t.periodo.hasta.slice(0, 8)}01`} seleccionado={diaSel} onElegir={setDiaSel} hoy={fechaLocalISO()} />
              <DetalleDia dia={dia} metaHora={t.metaHora} razonesNombre={t.devolucion.razonesNombre} ultimaDev={t.devolucion.ultima} enModulo={t.devolucion.enModulo} />
            </div>

            <div className="colab-tres">
              <Comparativa titulo="Rendimiento (tallos por hora)" datos={t.comparativa.rendimiento} unidad="t/h" masEsMejor equipoNombre={t.asignacion?.formadora} />
              <Comparativa titulo="Devoluciones por día trabajado" datos={t.comparativa.devolPorDia} unidad="" decimales={2} masEsMejor={false} equipoNombre={t.asignacion?.formadora} />
              <section className="colab-causas">
                <BarrasHorizontales titulo="Causas de sus devoluciones" filas={razonesLista} series={[{ nombre: 'Devoluciones', color: COLORES.causas }]} anchoEtiqueta={130} />
                {razonesLista.length === 0 && <p className="dev-cero">{t.devolucion.enModulo ? 'Sin devoluciones en el período.' : 'No hay datos de devoluciones.'}</p>}
              </section>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
