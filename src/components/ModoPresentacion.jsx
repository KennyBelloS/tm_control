import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import './presentacion.css';
import logo from '../assets/logo-icon.png';
import Top3Podium from './Top3Podium';
import CarruselLista from './CarruselLista';
import AnilloProgreso from './AnilloProgreso';
import FlorMeta from './FlorMeta';
import { CapaFestiva, IntroFestiva, CelebracionHito } from './presentacion/FestivoPresentacion';
import { useEfectos } from '../lib/efectos';
import { hitoAlcanzado, hitoNuevo, leerHito, guardarHito } from '../lib/hitos';
import { getRankingRango, getUltimaFechaHistorico } from '../lib/db';
import { getDetalleRendimientoTurnoActual, getDetalleRendimientoAsignaciones } from '../lib/lineas';
import { etiquetaHora, nombreLineaClasificacion, etiquetaCortaLinea, LINEA_SUPPORT } from '../lib/clasificacionCalculos';
import { getComparacionClasificacion } from '../lib/clasificacion';
import { getContextoLineas } from '../lib/lineas';
import { useRealtimeRefresco } from '../lib/useRealtimeRefresco';
import { entrarPantallaCompleta, salirPantallaCompleta, enPantallaCompleta } from '../lib/pantallaCompleta';

// Cuánto dura cada vista: el hora a hora y los históricos 10 minutos; todo lo demás 5.
const MINUTOS_POR_VISTA = { podio: 5, hora: 10, lineas: 5, formadoras: 5, 'hist-dia': 10, 'hist-semana': 10, 'hist-mes': 10 };
// El lienzo se dibuja siempre en 1600 x 900 y se escala para llenar la pantalla (TV, zoom, lo que sea).
const LIENZO_ANCHO = 1600, LIENZO_ALTO = 900;
// "Tamaño": cuánto se agranda todo. El lienzo lógico mide 1600x900 dividido entre este factor, así que con 1,35 todo se ve
// 35 % más grande en la pantalla (lo que importa en un televisor). Se recuerda por navegador y se cambia con A−/A+ o las teclas + y −.
const PASOS_TAMANO = [1, 1.15, 1.35, 1.55];
const TAMANO_DEFECTO = 1.35;
const leerTamano = () => { try { const v = Number(localStorage.getItem('tm_pres_tamano')); return PASOS_TAMANO.includes(v) ? v : TAMANO_DEFECTO; } catch { return TAMANO_DEFECTO; } };

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
      <FlorMeta pct={cumplimiento} tamano={250} className="flor-oscuro">
        <span className="flor-oscuro-centro"><b>{cumplimiento}%</b><small>de la meta</small></span>
      </FlorMeta>
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
    <div className="pres-slide-lista pres-slide-hora">
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
    <div className="pres-slide-lista pres-slide-hist">
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
const MEDALLAS = ['🥇', '🥈', '🥉'];

/* ---------- Línea líder en clasificación (con su formadora) ---------- */
const SEGUNDOS_POR_PAGINA = 15;
/** Cuántos elementos caben GRANDES a la vez: con tamaño grande, menos por página (y rotan solos). */
const porPaginaLineas = tamano => (tamano > 1.1 ? 4 : 6);
const porPaginaFormadoras = tamano => (tamano > 1.1 ? 3 : 6);

function SlideLineas({ datos, etiquetas, porPagina }) {
  const t = datos.total;
  const hayAyer = !!datos.fechaAyer;
  const hayBase = datos.ultimaCompletaHora >= datos.horas[0];
  const ranking = [...datos.porLinea].sort((a, b) => b.totalHoy - a.totalHoy);
  const competidoras = ranking.filter(l => l.linea !== LINEA_SUPPORT && l.totalHoy > 0);
  const lider = competidoras[0] || null;
  const segunda = competidoras[1] || null;
  const nombre = n => (etiquetas[n]?.nombre || nombreLineaClasificacion(n));
  const maxTallos = Math.max(1, ...ranking.map(l => l.totalHoy));
  const paginas = Math.max(1, Math.ceil(ranking.length / porPagina));
  const [pagina, setPagina] = useState(0);
  useEffect(() => {
    if (paginas <= 1) { setPagina(0); return; }
    const t = setInterval(() => setPagina(p => (p + 1) % paginas), SEGUNDOS_POR_PAGINA * 1000);
    return () => clearInterval(t);
  }, [paginas]);
  const visibles = ranking.slice(pagina * porPagina, (pagina + 1) * porPagina);
  return (
    <div className="pres-lineas">
      <h2 className="slide-titulo"><i className="fa-solid fa-boxes-stacked"></i> Clasificación por línea</h2>
      <p className="pres-slide-sub">{formatoLargo(datos.fechaHoy)}{datos.parcial ? ` · ${etiquetaHora(datos.ultimaHoy)} en curso` : ''}{hayAyer && hayBase ? ' · comparado con ayer en las horas completas' : ''}</p>
      <div className="pres-lineas-cuerpo">
        {lider ? (
          <div className="pres-lider">
            <span className="pres-lider-corona" aria-hidden="true">👑</span>
            <small>Línea líder</small>
            <h3>{nombre(lider.linea)}</h3>
            {etiquetas[lider.linea]?.formadora && (
              <div className="pres-lider-formadora"><span className="pres-lider-avatar">{inicialesDe(etiquetas[lider.linea].formadora)}</span><span>Formadora <strong>{etiquetas[lider.linea].formadora}</strong></span></div>
            )}
            <div className="pres-lider-cifra">{fmtN(lider.totalHoy)}</div>
            <span className="pres-lider-etq">tallos movidos hoy</span>
            <div className="pres-lider-chips">
              {segunda && <span className="pres-chip pres-chip-oro">+{fmtN(lider.totalHoy - segunda.totalHoy)} sobre {nombre(segunda.linea)}</span>}
              {lider.promedioHora != null && <span className="pres-chip">{fmtN(lider.promedioHora)} por hora</span>}
              {hayAyer && hayBase && <span className={`pres-chip pres-chip-${lider.estado}`}>{flechaN(lider.diferencia)} vs ayer</span>}
            </div>
          </div>
        ) : <div className="pres-lider pres-lider-vacio">Todavía no hay tallos en las líneas</div>}
        <div className="pres-lineas-lista">
          {visibles.map((l, k) => {
            const i = pagina * porPagina + k;
            const esLider = lider && l.linea === lider.linea;
            return (
              <div key={l.linea} className={`pres-linea-fila ${esLider ? 'pres-linea-lider' : ''}`}>
                <span className="pres-linea-puesto">{esLider ? '👑' : l.linea === LINEA_SUPPORT ? '·' : i + 1}</span>
                <div className="pres-linea-nombre"><strong>{nombre(l.linea)}</strong><small>{etiquetas[l.linea]?.formadora || (l.linea === LINEA_SUPPORT ? 'mesa sin número' : 'sin formadora')}</small></div>
                <div className="pres-linea-barra"><i style={{ width: `${Math.max(3, (l.totalHoy / maxTallos) * 100)}%` }}></i></div>
                <strong className="pres-linea-tallos">{fmtN(l.totalHoy)}</strong>
                {hayAyer && hayBase ? <span className={`pres-chip pres-chip-${l.estado}`}>{flechaN(l.diferencia)}</span> : <span></span>}
              </div>
            );
          })}
          {paginas > 1 && <div className="pres-paginas">{Array.from({ length: paginas }, (_, k) => <i key={k} className={k === pagina ? 'activo' : ''}></i>)}</div>}
        </div>
      </div>
      <TarjetasResumen items={[
        { label: 'Tallos movidos hoy', icono: 'fa-boxes-stacked', valor: fmtN(t.totalHoy), sub: hayAyer ? `total de ayer: ${fmtN(t.totalAyer)}` : 'sin día anterior', color: 'verde' },
        { label: 'Promedio por hora', icono: 'fa-gauge-high', valor: t.promedioHora != null ? fmtN(t.promedioHora) : '—', sub: `en ${String(t.horasTranscurridas).replace('.', ',')} h de trabajo`, color: 'oro' },
        { label: 'Hora pico', icono: 'fa-bolt', valor: t.pico ? etiquetaHora(t.pico.hora) : '—', sub: t.pico ? `${fmtN(t.pico.tallos)} tallos` : null, color: 'oscuro' },
        { label: 'Última hora completa', icono: 'fa-clock', valor: t.ultimaCompleta ? fmtN(t.ultimaCompleta.hoy) : '—', sub: t.ultimaCompleta ? `${etiquetaHora(t.ultimaCompleta.hora)}${hayAyer ? ` · ayer ${fmtN(t.ultimaCompleta.ayer)}` : ''}` : 'aún no termina una hora', color: 'verde' }
      ]} />
    </div>
  );
}

/* ---------- Resumen por formadora: quién lidera, con barras ---------- */
function SlideFormadoras({ datos, metaHora, porPagina }) {
  const etiquetaFuente = datos.modo === 'turno' ? 'Turno actual' : 'Histórico';
  const grupos = useMemo(() => [...datos.porFormadora].sort((a, b) => ((b.clasif?.disponible ? b.clasif.tallos : -1) - (a.clasif?.disponible ? a.clasif.tallos : -1)) || (b.rendPromedio - a.rendPromedio)), [datos]);
  const paginas = Math.max(1, Math.ceil(grupos.length / porPagina));
  const [pagina, setPagina] = useState(0);
  useEffect(() => {
    if (paginas <= 1) return;
    const t = setInterval(() => setPagina(p => (p + 1) % paginas), SEGUNDOS_POR_PAGINA * 1000);
    return () => clearInterval(t);
  }, [paginas]);
  const lider = grupos.find(g => g.clasif?.disponible && g.clasif.tallos > 0) || null;
  const segundo = lider ? grupos.filter(g => g.clasif?.disponible && g.id !== lider.id)[0] : null;
  const maxTallos = lider ? lider.clasif.tallos : 1;
  const escalaRend = metaHora * 1.3;
  const visibles = grupos.slice(pagina * porPagina, (pagina + 1) * porPagina);
  return (
    <div className="pres-slide-lista">
      <h2 className="slide-titulo"><i className="fa-solid fa-chalkboard-user"></i> Resumen por Formadora</h2>
      <p className="pres-slide-sub">{etiquetaFuente} · {datos.fecha.split('-').reverse().join('/')}</p>
      {lider && (
        <div className="pres-form-lider">
          <span className="pres-form-lider-corona" aria-hidden="true">👑</span>
          <div><small>Lidera la clasificación</small><strong>{lider.nombre}</strong></div>
          <div className="pres-form-lider-dato"><b>{fmtN(lider.clasif.tallos)}</b><span>tallos</span></div>
          {segundo && <div className="pres-form-lider-dato"><b>+{fmtN(lider.clasif.tallos - segundo.clasif.tallos)}</b><span>sobre {segundo.nombre}</span></div>}
        </div>
      )}
      <div className="pres-form-grid" style={{ gridTemplateColumns: `repeat(${Math.min(3, Math.max(1, visibles.length))}, minmax(0, 1fr))` }}>
        {visibles.map((g, k) => {
          const i = pagina * porPagina + k;
          const u = g.clasif?.ultima;
          const cumple = g.rendPromedio >= metaHora;
          const esLider = lider && g.id === lider.id;
          return (
            <article key={g.id} className={`pres-form-card ${esLider ? 'pres-form-card-lider' : ''}`}>
              <header>
                <span className="pres-form-puesto">{i < 3 && g.clasif?.disponible ? MEDALLAS[i] : `#${i + 1}`}</span>
                <span className={`pres-form-avatar ${cumple ? '' : 'pres-form-avatar-mal'}`}>{inicialesDe(g.nombre)}</span>
                <div>
                  <h3>{g.nombre}{esLider ? ' 👑' : ''}</h3>
                  <small>{g.operarios.length} operarios{g.clasif?.disponible ? ` · ${g.clasif.lineas.map(etiquetaCortaLinea).join(' + ')}` : ''}</small>
                </div>
              </header>
              <div className="pres-form-fila">
                <em>Clasificación</em>
                <span className="pres-form-barra"><i className="pres-form-rel-clasif" style={{ width: `${g.clasif?.disponible ? Math.max(3, (g.clasif.tallos / maxTallos) * 100) : 0}%` }}></i></span>
                <b>{g.clasif?.disponible ? fmtN(g.clasif.tallos) : '—'}</b>
              </div>
              <div className="pres-form-fila">
                <em>Rendimiento</em>
                <span className="pres-form-barra">
                  <i className={cumple ? 'pres-form-rel-ok' : 'pres-form-rel-mal'} style={{ width: `${Math.min((g.rendPromedio / escalaRend) * 100, 100)}%` }}></i>
                  <s style={{ left: `${(metaHora / escalaRend) * 100}%` }}></s>
                </span>
                <b className={cumple ? 'pres-ok' : 'pres-mal'}>{g.rendPromedio.toLocaleString('es-CO', { minimumFractionDigits: 1 })}<small>/h</small></b>
              </div>
              {u && (
                <span className={`pres-form-ultima pres-form-${u.estado}`}>
                  {etiquetaHora(u.hora)}{u.enCurso ? ' · en curso' : ''}: <b>{fmtN(u.tallos)}</b>
                  {!u.enCurso && u.hayAyer ? ` · ${flechaN(u.diferencia)} vs ayer` : ''}
                </span>
              )}
            </article>
          );
        })}
      </div>
      {paginas > 1 && <div className="pres-paginas">{Array.from({ length: paginas }, (_, k) => <i key={k} className={k === pagina ? 'activo' : ''}></i>)}</div>}
    </div>
  );
}

/* ---------- Escala el lienzo para llenar la pantalla, sin importar su tamaño ni el zoom del navegador ---------- */
function useEscalaLienzo(tamano) {
  const ancho = LIENZO_ANCHO / tamano, alto = LIENZO_ALTO / tamano;
  const [m, setM] = useState({ escala: 1, x: 0, y: 0, vertical: false });
  useLayoutEffect(() => {
    const calcular = () => {
      const w = window.innerWidth, h = window.innerHeight;
      const escala = Math.min(w / ancho, h / alto);
      setM({ escala, x: (w - ancho * escala) / 2, y: (h - alto * escala) / 2, vertical: w / h < 0.9 });
    };
    calcular();
    window.addEventListener('resize', calcular);
    document.addEventListener('fullscreenchange', calcular);
    return () => { window.removeEventListener('resize', calcular); document.removeEventListener('fullscreenchange', calcular); };
  }, [ancho, alto]);
  return { ...m, ancho, alto };
}

/*
 * Ajusta el contenido de cada vista al espacio disponible, para que SE VEA TODO:
 *  - si es más alto o más ancho que el espacio, lo achica lo justo (nunca queda cortado);
 *  - si sobra espacio y la vista lo permite ("crecer"), lo agranda (hasta 1,6 veces) para aprovechar el televisor.
 */
function AjusteVertical({ children, reinicio, crecer = false }) {
  const caja = useRef(null);
  const interno = useRef(null);
  const [ajuste, setAjuste] = useState({ f: 1, dy: 0 });
  useLayoutEffect(() => {
    const medir = () => {
      const c = caja.current, el = interno.current;
      if (!c || !el) return;
      const est = getComputedStyle(c);
      const alto = c.clientHeight - parseFloat(est.paddingTop) - parseFloat(est.paddingBottom);
      const ancho = c.clientWidth - parseFloat(est.paddingLeft) - parseFloat(est.paddingRight);
      const transformPrevio = el.style.transform, anchoPrevio = el.style.width;
      el.style.transform = 'none'; el.style.width = '100%';
      const naturalAlto = el.scrollHeight, naturalAncho = el.scrollWidth;
      let f = 1, dy = 0;
      const reduccion = Math.min(naturalAlto > alto + 1 ? alto / naturalAlto : 1, naturalAncho > ancho + 1 ? ancho / naturalAncho : 1);
      if (reduccion < 1) f = Math.max(reduccion, 0.4);
      else if (crecer && naturalAlto > 0) f = Math.min(1.6, alto / naturalAlto);
      if (f > 1.02) {                                   // al agrandar, el ancho de trabajo se achica: se comprueba que no se pase de alto ni de ancho
        el.style.width = `${100 / f}%`;
        const pasoAlto = el.scrollHeight * f, pasoAncho = el.scrollWidth * f;
        f = Math.max(1, f * Math.min(pasoAlto > alto ? alto / pasoAlto : 1, pasoAncho > ancho + 1 ? ancho / pasoAncho : 1));
        el.style.width = `${100 / f}%`;
        dy = Math.max(0, (alto - el.scrollHeight * f) / 2);   // centrado vertical ya con el tamaño final
      }
      el.style.transform = transformPrevio; el.style.width = anchoPrevio;
      setAjuste(prev => (Math.abs(prev.f - f) > 0.004 || Math.abs(prev.dy - dy) > 1 ? { f, dy } : prev));
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(interno.current);
    return () => ro.disconnect();
  }, [reinicio, crecer]);
  return (
    <div ref={caja} className="pres-ajuste-caja">
      <div ref={interno} className="pres-ajuste" style={ajuste.f === 1 ? undefined
        : ajuste.f > 1 ? { transform: `translateY(${ajuste.dy}px) scale(${ajuste.f})`, width: `${100 / ajuste.f}%`, transformOrigin: '0 0', margin: 0 }
        : { transform: `scale(${ajuste.f})`, transformOrigin: '50% 0' }}>{children}</div>
    </div>
  );
}

export default function ModoPresentacion({ ranking, metaHora, totalTallos, metaHoy, cumplimiento, onCerrar }) {
  const [estilo, setEstilo] = useState('clasico');
  const { ajustes, fiesta } = useEfectos();
  const quieto = ajustes.efectos === 'apagado';
  // Decoración festiva de Presentar: se puede apagar con el botón o con la tecla F (se recuerda)
  const [festivo, setFestivo] = useState(() => { try { return localStorage.getItem('tm_pres_festivo') !== '0'; } catch { return true; } });
  const alternarFestivo = () => setFestivo(f => { const n = !f; try { localStorage.setItem('tm_pres_festivo', n ? '1' : '0'); } catch { /* sin almacenamiento */ } return n; });
  const [intro, setIntro] = useState(() => !!fiesta && !quieto && !(typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches));
  const [hito, setHito] = useState(null);
  const [guiaTeclas, setGuiaTeclas] = useState(true);
  useEffect(() => { const t = setTimeout(() => setGuiaTeclas(false), 7600); return () => clearTimeout(t); }, []);
  // Hitos de la meta (25 · 50 · 75 · 100 %): se celebran EN VIVO al cruzarlos. Al abrir no se celebra lo que ya estaba (sería viejo).
  const refHito = useRef(null);
  useEffect(() => {
    const hoy = fechaLocal(new Date()), h = hitoAlcanzado(cumplimiento);
    if (refHito.current === null) { refHito.current = h; guardarHito('pres', hoy, Math.max(leerHito('pres', hoy), h)); return; }
    const nuevo = hitoNuevo(cumplimiento, Math.max(refHito.current, leerHito('pres', hoy)));
    refHito.current = h;
    if (nuevo) { guardarHito('pres', hoy, nuevo); setHito(nuevo); }
  }, [cumplimiento]);
  const [ultimaFechaHistorico, setUltimaFechaHistorico] = useState(null);
  const [formadorasDatos, setFormadorasDatos] = useState(null);
  const [clasif, setClasif] = useState(null);
  const [completa, setCompleta] = useState(enPantallaCompleta());
  const rankingConPromedio = useMemo(() => ranking.map(p => ({ ...p, promedioRend: p.promedioRend ?? p.rendimiento })), [ranking]);
  const [tamano, setTamano] = useState(leerTamano);
  const [avisoTamano, setAvisoTamano] = useState(false);
  const lienzo = useEscalaLienzo(tamano);
  function cambiarTamano(delta) {
    setTamano(actual => {
      const i = PASOS_TAMANO.indexOf(actual);
      const nuevo = PASOS_TAMANO[Math.min(Math.max(i + delta, 0), PASOS_TAMANO.length - 1)];
      try { localStorage.setItem('tm_pres_tamano', String(nuevo)); } catch { /* sin almacenamiento */ }
      return nuevo;
    });
    setAvisoTamano(true);
  }
  useEffect(() => {
    if (!avisoTamano) return;
    const t = setTimeout(() => setAvisoTamano(false), 1600);
    return () => clearTimeout(t);
  }, [avisoTamano, tamano]);
  useEffect(() => {
    const tecla = e => {
      if (e.key === '+' || e.key === '=') cambiarTamano(1);
      else if (e.key === '-' || e.key === '_') cambiarTamano(-1);
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, []);

  useEffect(() => { entrarPantallaCompleta(); }, []);
  useEffect(() => {
    const alCambiar = () => setCompleta(enPantallaCompleta());
    document.addEventListener('fullscreenchange', alCambiar);
    return () => document.removeEventListener('fullscreenchange', alCambiar);
  }, []);
  useEffect(() => {
    getUltimaFechaHistorico().then(setUltimaFechaHistorico).catch(() => {});
  }, []);

  async function recargarDatos() {
    try {
      const t = await getDetalleRendimientoTurnoActual(metaHora);
      if (t && !t.sinAsignaciones && t.porFormadora.length) setFormadorasDatos(t);
      else {
        const h = await getDetalleRendimientoAsignaciones(metaHora);
        setFormadorasDatos(h && !h.sinHistorico && h.porFormadora.length ? h : null);
      }
    } catch { /* sin datos de formadoras todavía: simplemente no se muestra esa vista */ }
    try {
      const hoyIso = fechaLocal(new Date());
      const d = await getComparacionClasificacion(hoyIso);
      if (!d.vacio && d.cargaHoy) setClasif({ datos: d, etiquetas: await getContextoLineas(hoyIso).catch(() => ({})) });
      else setClasif(null);
    } catch { setClasif(null); }
  }
  useEffect(() => { recargarDatos(); }, [metaHora]);
  useEffect(() => { const t = setInterval(recargarDatos, 5 * 60 * 1000); return () => clearInterval(t); }, [metaHora]);
  useRealtimeRefresco(['clasificacion_hora', 'clasificacion_cargas', 'asignaciones_diarias', 'formadora_linea', 'rendimiento_actual'], recargarDatos);

  const rendimientoPromedio = useMemo(() => {
    if (rankingConPromedio.length === 0) return 0;
    return Math.round(rankingConPromedio.reduce((s, p) => s + p.promedioRend, 0) / rankingConPromedio.length);
  }, [rankingConPromedio]);

  // Qué históricos tocan HOY: diario siempre; semanal solo los lunes; mensual solo los días 1, 2 y 3 del mes.
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
    clasif && { id: 'lineas', nombre: 'Líneas', render: () => <SlideLineas datos={clasif.datos} etiquetas={clasif.etiquetas} porPagina={porPaginaLineas(tamano)} /> },
    formadorasDatos && { id: 'formadoras', nombre: 'Formadoras', render: () => <SlideFormadoras datos={formadorasDatos} metaHora={metaHora} porPagina={porPaginaFormadoras(tamano)} /> },
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

  const slideActual = slides[indice] || slides[0];
  const minutos = MINUTOS_POR_VISTA[slideActual.id] || 5;

  useEffect(() => {
    if (pausado || slides.length <= 1) return;
    const t = setTimeout(() => setIndice(i => (i + 1) % slides.length), minutos * 60 * 1000);
    return () => clearTimeout(t);
  }, [indice, pausado, slides.length, minutos]);

  useEffect(() => {
    const tecla = e => {
      if (e.target?.closest?.('input, textarea, select')) return;
      if (e.key === 'ArrowRight') setIndice(i => (i + 1) % slides.length);
      else if (e.key === 'ArrowLeft') setIndice(i => (i - 1 + slides.length) % slides.length);
      else if (e.key === ' ') { e.preventDefault(); setPausado(p => !p); }
      else if ((e.key === 'f' || e.key === 'F') && fiesta) alternarFestivo();
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [slides.length, fiesta]);                                  // eslint-disable-line react-hooks/exhaustive-deps

  const fondoOscuro = estilo === 'oscuro' && slideActual.id === 'podio';
  function alternarPantallaCompleta() { if (enPantallaCompleta()) salirPantallaCompleta(); else entrarPantallaCompleta(); }

  return (
    <div className={`presentacion-overlay ${fondoOscuro ? 'presentacion-tema-oscuro' : ''}`}>
      <div className="pres-lienzo" style={{ width: lienzo.ancho, height: lienzo.alto, '--pres-alto': `${lienzo.alto}px`, transform: `translate(${lienzo.x}px, ${lienzo.y}px) scale(${lienzo.escala})` }}>
        <header className="presentacion-marca">
          <div className="presentacion-marca-id">
            <img src={logo} alt="Torremolinos" />
            <div>
              <div className="presentacion-marca-nombre">TORREMOLINOS</div>
              <div className="presentacion-marca-sub">{slideActual.nombre} · {indice + 1} de {slides.length} · cambia cada {minutos} min</div>
            </div>
          </div>
          <div className="presentacion-controles">
            {slides.length > 1 && (
              <button className="presentacion-cambiar-vista" onClick={() => setIndice(i => (i + 1) % slides.length)} title="Pasar a la siguiente vista">
                <i className="fa-solid fa-arrows-rotate"></i><span> Cambiar vista</span>
              </button>
            )}
            <button className="presentacion-pausa" onClick={() => cambiarTamano(-1)} disabled={tamano === PASOS_TAMANO[0]} title="Hacer todo más pequeño (tecla −)"><b className="pres-aa">A−</b></button>
            <button className="presentacion-pausa" onClick={() => cambiarTamano(1)} disabled={tamano === PASOS_TAMANO[PASOS_TAMANO.length - 1]} title="Hacer todo más grande (tecla +)"><b className="pres-aa">A+</b></button>
            {fiesta && <button className={`presentacion-pausa pf-boton ${festivo ? 'activo' : ''}`} onClick={alternarFestivo} aria-pressed={festivo} title={`Decoración de ${fiesta.nombre} (tecla F)`}><span aria-hidden="true">{fiesta.emoji}</span></button>}
            <button className="presentacion-pausa" onClick={() => setEstilo(e => e === 'clasico' ? 'oscuro' : 'clasico')} title="Cambiar estilo">
              <i className="fa-solid fa-palette"></i>
            </button>
            <button className="presentacion-pausa" onClick={() => setPausado(p => !p)} title={pausado ? 'Reanudar rotación' : 'Pausar rotación'}>
              <i className={`fa-solid ${pausado ? 'fa-play' : 'fa-pause'}`}></i>
            </button>
            <button className="presentacion-pausa" onClick={alternarPantallaCompleta} title={completa ? 'Salir de pantalla completa' : 'Pantalla completa'}>
              <i className={`fa-solid ${completa ? 'fa-down-left-and-up-right-to-center' : 'fa-up-right-and-down-left-from-center'}`}></i>
            </button>
            <button className="presentacion-cerrar" onClick={onCerrar} title="Salir">
              <i className="fa-solid fa-compress"></i><span> Salir</span>
            </button>
          </div>
        </header>

        <div className="pres-progreso"><i key={`${slideActual.id}-${indice}`} style={{ animationDuration: `${minutos * 60}s`, animationPlayState: pausado ? 'paused' : 'running' }}></i></div>

        <main key={`${slideActual.id}-${estilo}`} className="presentacion-slide-contenido">
          <AjusteVertical reinicio={`${slideActual.id}-${estilo}`} crecer={['podio', 'lineas', 'formadoras'].includes(slideActual.id)}>{slideActual.render()}</AjusteVertical>
        </main>

        {fiesta && festivo && <CapaFestiva fiesta={fiesta} quieto={quieto} ancho={Math.round(lienzo.ancho)} />}
        {slides.length > 1 && (
          <nav className="presentacion-puntos-slides">
            {slides.map((s, i) => (
              <button key={s.id} className={`presentacion-punto-slide ${i === indice ? 'activo' : ''}`} onClick={() => setIndice(i)} title={s.nombre}></button>
            ))}
          </nav>
        )}
      </div>
      {intro && fiesta && festivo && <IntroFestiva fiesta={fiesta} onFin={() => setIntro(false)} />}
      {hito && <CelebracionHito hito={hito} tallos={totalTallos} meta={metaHoy} fiesta={fiesta && festivo ? fiesta : null} conConfeti={!quieto} onFin={() => setHito(null)} />}
      {guiaTeclas && !intro && <div className="pf-atajos" aria-hidden="true"><span><kbd>←</kbd><kbd>→</kbd>cambiar vista</span><span><kbd>Espacio</kbd>pausa</span><span><kbd>+</kbd><kbd>−</kbd>tamaño</span>{fiesta && <span><kbd>F</kbd>decoración</span>}</div>}
      {avisoTamano && <div className="pres-aviso-tamano">Tamaño {Math.round(tamano * 100)} %</div>}
      {lienzo.vertical && <div className="pres-aviso-giro"><i className="fa-solid fa-rotate"></i> Gira el celular para ver mejor la presentación</div>}
    </div>
  );
}
