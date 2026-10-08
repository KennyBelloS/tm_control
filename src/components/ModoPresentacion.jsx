import { useEffect, useMemo, useState } from 'react';
import logo from '../assets/logo-icon.png';
import Top3Podium from './Top3Podium';
import CarruselLista from './CarruselLista';
import AnilloProgreso from './AnilloProgreso';
import { getRankingRango, getUltimaFechaHistorico } from '../lib/db';
import { getDetalleRendimientoTurnoActual, getDetalleRendimientoAsignaciones } from '../lib/lineas';
import { etiquetaHora } from '../lib/clasificacionCalculos';

const SEGUNDOS_POR_SLIDE = 6 * 60;

function colorProgreso(pct) {
  if (pct >= 100) return '#22C55E';
  if (pct >= 60) return '#84CC16';
  if (pct >= 30) return '#F59E0B';
  return '#EF4444';
}
function emojiCumplimiento(pct) {
  if (pct >= 100) return '🤩';
  if (pct >= 60) return '🙂';
  if (pct >= 30) return '😐';
  return '😟';
}

// Fechas en hora LOCAL (Colombia). toISOString() usa UTC y después de las
// 7 p.m. ya marcaría el día siguiente — por eso no se usa aquí.
function fechaLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dia}`;
}
function formatoLargo(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
}
function rangoSemanaAnterior() {
  // Lunes a domingo de la semana que acaba de terminar.
  const hoy = new Date();
  const dia = hoy.getDay();
  const lunesActual = new Date(hoy);
  lunesActual.setDate(hoy.getDate() - (dia === 0 ? 6 : dia - 1));
  const inicio = new Date(lunesActual);
  inicio.setDate(lunesActual.getDate() - 7);
  const fin = new Date(lunesActual);
  fin.setDate(lunesActual.getDate() - 1);
  return { desde: fechaLocal(inicio), hasta: fechaLocal(fin) };
}
function rangoMesAnterior() {
  const hoy = new Date();
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  const fin = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
  const nombre = inicio.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  return { desde: fechaLocal(inicio), hasta: fechaLocal(fin), nombre };
}

/* ---------- Barra de meta: mismo estilo del Dashboard, pero a todo lo ancho ---------- */
function BarraMeta({ totalTallos, metaHoy, cumplimiento }) {
  const pct = Number(cumplimiento) || 0;
  const color = colorProgreso(pct);
  const faltan = Math.max(0, metaHoy - totalTallos);
  return (
    <div className="pbar-card">
      <div className="pbar-encabezado">
        <span className="pbar-badge"><i className="fa-solid fa-chart-line"></i> Avance de la meta</span>
        <span className="pbar-cifras"><strong>{totalTallos.toLocaleString()}</strong> de {metaHoy.toLocaleString()} tallos</span>
      </div>
      <div className="pbar-track">
        <div className="pbar-fill" style={{ width: `${Math.min(pct, 100)}%`, background: `linear-gradient(90deg, ${color}CC, ${color})` }}>
          <span className="pbar-brillo"></span>
        </div>
        {[25, 50, 75].map(m => <span key={m} className="pbar-marca" style={{ left: `${m}%` }}></span>)}
        <span className="pbar-emoji" style={{ left: `${Math.min(Math.max(pct, 3), 97)}%` }}>{emojiCumplimiento(pct)}</span>
      </div>
      <div className="pbar-pie">
        <span className="pbar-pct" style={{ color }}>{pct}%</span>
        <span className="pbar-texto">
          {pct >= 100 ? `¡Meta superada por ${(totalTallos - metaHoy).toLocaleString()} tallos!` : `Faltan ${faltan.toLocaleString()} tallos para la meta`}
        </span>
      </div>
    </div>
  );
}

function TarjetasResumen({ items }) {
  return (
    <div className="pres-tarjetas">
      {items.map(it => (
        <div key={it.label} className={`pres-tarjeta pres-tarjeta-${it.color}`}>
          <span className="pres-tarjeta-label"><i className={`fa-solid ${it.icono}`}></i> {it.label}</span>
          <span className="pres-tarjeta-numero">{it.valor}</span>
          {it.sub && <span className="pres-tarjeta-sub">{it.sub}</span>}
        </div>
      ))}
    </div>
  );
}

/* ---------- 1. Podio (estilo clásico) ---------- */
function SlidePodio({ totalTallos, metaHoy, cumplimiento, rendimientoPromedio, ranking }) {
  return (
    <div className="pres-grid-podio">
      <div className="pres-col-datos">
        <TarjetasResumen items={[
          { label: 'Producción de hoy', icono: 'fa-seedling', valor: totalTallos.toLocaleString(), sub: `Meta: ${metaHoy.toLocaleString()} tallos`, color: 'oro' },
          { label: 'Rendimiento promedio', icono: 'fa-gauge-high', valor: rendimientoPromedio, sub: 'tallos / hora', color: 'verde' }
        ]} />
        <BarraMeta totalTallos={totalTallos} metaHoy={metaHoy} cumplimiento={cumplimiento} />
      </div>
      {ranking.length > 0 && (
        <div className="pres-col-podio">
          <h3 className="pres-subtitulo"><i className="fa-solid fa-trophy"></i> Top 3 de hoy</h3>
          <Top3Podium lista={ranking} metaHora={470} />
        </div>
      )}
    </div>
  );
}

/* ---------- 1b. Podio (estilo oscuro) ---------- */
function SlidePodioOscuro({ totalTallos, metaHoy, cumplimiento, rendimientoPromedio, ranking }) {
  return (
    <div className="slide-oscuro">
      <AnilloProgreso pct={cumplimiento} tamano={220} grosor={16}>
        <span className="anillo-emoji">{emojiCumplimiento(cumplimiento)}</span>
        <span className="anillo-pct">{cumplimiento}%</span>
        <span className="anillo-label">de la meta</span>
      </AnilloProgreso>
      <div className="oscuro-stats-fila">
        <div className="oscuro-stat">
          <span className="oscuro-stat-label">Total de Tallos</span>
          <span className="oscuro-stat-numero">{totalTallos.toLocaleString()}</span>
          <span className="oscuro-stat-meta">Meta: {metaHoy.toLocaleString()}</span>
        </div>
        <div className="oscuro-stat">
          <span className="oscuro-stat-label">Rendimiento Promedio</span>
          <span className="oscuro-stat-numero oscuro-stat-oro">{rendimientoPromedio}</span>
          <span className="oscuro-stat-meta">tallos / hora</span>
        </div>
      </div>
      {ranking.length > 0 && (
        <div className="oscuro-top3-fila">
          {ranking.slice(0, 3).map((p, i) => (
            <div key={p.colaborador_id} className={`oscuro-top3-card oscuro-top3-${i + 1}`}>
              <span className="oscuro-top3-medalla">{['🥇', '🥈', '🥉'][i]}</span>
              <span className="oscuro-top3-nombre">{p.colaborador}</span>
              <span className="oscuro-top3-rend">{p.promedioRend} t/h</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- 2. Hora a hora ---------- */
function SlideHoraAHora({ ranking, metaHora }) {
  return (
    <div className="pres-slide-lista">
      <h2 className="slide-titulo"><i className="fa-solid fa-clock"></i> Rendimiento Hora a Hora — Todo el Equipo</h2>
      <div className="pres-carrusel">
        <CarruselLista personas={ranking} metaHora={metaHora} titulo="Turno actual" icono="fa-people-group" />
      </div>
    </div>
  );
}

/* ---------- 3. Histórico (diario / semanal / mensual) ---------- */
function SlideHistorico({ titulo, subtitulo, icono, desde, hasta, metaHora }) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let activo = true;
    if (!desde || !hasta) return;
    getRankingRango(desde, hasta)
      .then(r => { if (activo) setDatos(r); })
      .catch(() => { if (activo) setError(true); });
    return () => { activo = false; };
  }, [desde, hasta]);

  const totalTallos = datos ? datos.lista.reduce((s, p) => s + p.totalTallos, 0) : 0;
  return (
    <div className="pres-slide-lista">
      <h2 className="slide-titulo"><i className={`fa-solid ${icono}`}></i> {titulo}</h2>
      {subtitulo && <p className="pres-slide-sub">{subtitulo}</p>}
      {!datos && !error && <p className="pres-vacio">Cargando…</p>}
      {error && <p className="pres-vacio">No se pudo cargar el histórico.</p>}
      {datos && datos.lista.length === 0 && <p className="pres-vacio">Sin registros guardados para este período.</p>}
      {datos && datos.lista.length > 0 && (
        <>
          <TarjetasResumen items={[
            { label: 'Tallos totales', icono: 'fa-seedling', valor: totalTallos.toLocaleString(), sub: `${datos.lista.length} colaboradores`, color: 'oro' },
            { label: 'Rendimiento promedio', icono: 'fa-gauge-high', valor: datos.rendimientoPromedioGeneral, sub: 'tallos / hora', color: 'verde' },
            { label: 'Días con registro', icono: 'fa-calendar-check', valor: datos.diasConDatos, sub: 'en el período', color: 'oscuro' }
          ]} />
          <div className="pres-carrusel">
            <CarruselLista personas={datos.lista} metaHora={metaHora} titulo="Ranking del período" icono="fa-trophy" />
          </div>
        </>
      )}
    </div>
  );
}

const fmtN = n => (n ?? 0).toLocaleString('es-CO');
const flechaN = n => (n > 0 ? `▲ +${fmtN(n)}` : n < 0 ? `▼ −${fmtN(Math.abs(n))}` : '＝ igual');
const inicialesDe = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();

/* ---------- Resumen por formadora (datos reales: clasificación de su línea + boncheo) ---------- */
function SlideFormadoras({ datos, metaHora }) {
  const etiquetaFuente = datos.modo === 'turno' ? 'Turno actual' : 'Histórico';
  return (
    <div className="pres-slide-lista">
      <h2 className="slide-titulo"><i className="fa-solid fa-chalkboard-user"></i> Resumen por Formadora</h2>
      <p className="pres-slide-sub">{etiquetaFuente} · {datos.fecha.split('-').reverse().join('/')}</p>
      <div className="pres-form-grid">
        {datos.porFormadora.map(g => {
          const u = g.clasif?.ultima;
          const cumple = g.rendPromedio >= metaHora;
          return (
            <article key={g.id} className="pres-form-card">
              <header>
                <span className="pres-form-avatar">{inicialesDe(g.nombre)}</span>
                <div>
                  <h3>{g.nombre}</h3>
                  <small>{g.operarios.length} operarios{g.clasif?.disponible ? ` · ${g.clasif.lineas.map(n => `Línea ${n}`).join(' + ')}` : ''}</small>
                </div>
              </header>
              <div className="pres-form-cifras">
                <div>
                  <span>Tallos de clasificación</span>
                  <strong>{g.clasif?.disponible ? fmtN(g.clasif.tallos) : '—'}</strong>
                  {u && (
                    <em className={`pres-form-ultima pres-form-${u.estado}`}>
                      {etiquetaHora(u.hora)}{u.enCurso ? ' · en curso' : ''}: <b>{fmtN(u.tallos)}</b>
                      {!u.enCurso && u.hayAyer ? ` · ${flechaN(u.diferencia)} vs ayer` : ''}
                    </em>
                  )}
                </div>
                <div className={cumple ? 'pres-form-ok' : 'pres-form-mal'}>
                  <span>Rendimiento boncheo</span>
                  <strong>{g.rendPromedio.toLocaleString('es-CO', { minimumFractionDigits: 1 })}<small>/h</small></strong>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export default function ModoPresentacion({ ranking, metaHora, totalTallos, metaHoy, cumplimiento, onCerrar }) {
  const [estilo, setEstilo] = useState('clasico');
  const [ultimaFechaHistorico, setUltimaFechaHistorico] = useState(null);
  const [formadorasDatos, setFormadorasDatos] = useState(null);
  const rankingConPromedio = useMemo(() => ranking.map(p => ({ ...p, promedioRend: p.promedioRend ?? p.rendimiento })), [ranking]);

  useEffect(() => {
    getUltimaFechaHistorico().then(setUltimaFechaHistorico).catch(() => {});
  }, []);
  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const t = await getDetalleRendimientoTurnoActual(metaHora);
        if (t && !t.sinAsignaciones && t.porFormadora.length) { if (activo) setFormadorasDatos(t); return; }
        const h = await getDetalleRendimientoAsignaciones(metaHora);
        if (activo && h && !h.sinHistorico && h.porFormadora.length) setFormadorasDatos(h);
      } catch { /* sin datos de formadoras todavía: simplemente no se muestra esa diapositiva */ }
    })();
    return () => { activo = false; };
  }, [metaHora]);

  const rendimientoPromedio = useMemo(() => {
    if (rankingConPromedio.length === 0) return 0;
    return Math.round(rankingConPromedio.reduce((s, p) => s + p.promedioRend, 0) / rankingConPromedio.length);
  }, [rankingConPromedio]);

  // Qué históricos tocan HOY: diario siempre; semanal solo los lunes;
  // mensual solo los días 1, 2 y 3 del mes.
  const hoy = new Date();
  const esLunes = hoy.getDay() === 1;
  const esInicioDeMes = hoy.getDate() <= 3;
  const semana = rangoSemanaAnterior();
  const mes = rangoMesAnterior();

  const slides = [
    {
      id: 'podio', nombre: 'Podio',
      render: () => estilo === 'clasico'
        ? <SlidePodio totalTallos={totalTallos} metaHoy={metaHoy} cumplimiento={cumplimiento} rendimientoPromedio={rendimientoPromedio} ranking={rankingConPromedio} />
        : <SlidePodioOscuro totalTallos={totalTallos} metaHoy={metaHoy} cumplimiento={cumplimiento} rendimientoPromedio={rendimientoPromedio} ranking={rankingConPromedio} />
    },
    rankingConPromedio.length > 0 && {
      id: 'hora', nombre: 'Hora a hora',
      render: () => <SlideHoraAHora ranking={rankingConPromedio} metaHora={metaHora} />
    },
    formadorasDatos && { id: 'formadoras', nombre: 'Formadoras', render: () => <SlideFormadoras datos={formadorasDatos} metaHora={metaHora} /> },
    ultimaFechaHistorico && {
      id: 'hist-dia', nombre: 'Histórico diario',
      render: () => <SlideHistorico titulo="Histórico del Día" subtitulo={formatoLargo(ultimaFechaHistorico)} icono="fa-calendar-day" desde={ultimaFechaHistorico} hasta={ultimaFechaHistorico} metaHora={metaHora} />
    },
    esLunes && {
      id: 'hist-semana', nombre: 'Histórico semanal',
      render: () => <SlideHistorico titulo="Histórico de la Semana" subtitulo={`${formatoLargo(semana.desde)} — ${formatoLargo(semana.hasta)}`} icono="fa-calendar-week" desde={semana.desde} hasta={semana.hasta} metaHora={metaHora} />
    },
    esInicioDeMes && {
      id: 'hist-mes', nombre: 'Histórico mensual',
      render: () => <SlideHistorico titulo="Histórico del Mes" subtitulo={mes.nombre} icono="fa-calendar" desde={mes.desde} hasta={mes.hasta} metaHora={metaHora} />
    }
  ].filter(Boolean);

  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    if (indice >= slides.length) setIndice(0);
  }, [slides.length, indice]);

  useEffect(() => {
    if (pausado || slides.length <= 1) return;
    const t = setTimeout(() => setIndice(i => (i + 1) % slides.length), SEGUNDOS_POR_SLIDE * 1000);
    return () => clearTimeout(t);
  }, [indice, pausado, slides.length]);

  const slideActual = slides[indice] || slides[0];
  const fondoOscuro = estilo === 'oscuro' && slideActual.id === 'podio';

  return (
    <div className={`presentacion-overlay ${fondoOscuro ? 'presentacion-tema-oscuro' : ''}`}>
      <header className="presentacion-marca">
        <div className="presentacion-marca-id">
          <img src={logo} alt="Torremolinos" />
          <div>
            <div className="presentacion-marca-nombre">TORREMOLINOS</div>
            <div className="presentacion-marca-sub">{slideActual.nombre} · {indice + 1} de {slides.length}</div>
          </div>
        </div>
        <div className="presentacion-controles">
          {slides.length > 1 && (
            <button className="presentacion-cambiar-vista" onClick={() => setIndice(i => (i + 1) % slides.length)} title="Pasar a la siguiente vista">
              <i className="fa-solid fa-arrows-rotate"></i><span> Cambiar vista</span>
            </button>
          )}
          <button className="presentacion-pausa" onClick={() => setEstilo(e => e === 'clasico' ? 'oscuro' : 'clasico')} title="Cambiar estilo">
            <i className="fa-solid fa-palette"></i>
          </button>
          <button className="presentacion-pausa" onClick={() => setPausado(p => !p)} title={pausado ? 'Reanudar rotación' : 'Pausar rotación'}>
            <i className={`fa-solid ${pausado ? 'fa-play' : 'fa-pause'}`}></i>
          </button>
          <button className="presentacion-cerrar" onClick={onCerrar} title="Salir">
            <i className="fa-solid fa-compress"></i><span> Salir</span>
          </button>
        </div>
      </header>

      <main key={`${slideActual.id}-${estilo}`} className="presentacion-slide-contenido">
        {slideActual.render()}
      </main>

      {slides.length > 1 && (
        <nav className="presentacion-puntos-slides">
          {slides.map((s, i) => (
            <button key={s.id} className={`presentacion-punto-slide ${i === indice ? 'activo' : ''}`} onClick={() => setIndice(i)} title={s.nombre}></button>
          ))}
        </nav>
      )}
    </div>
  );
}
