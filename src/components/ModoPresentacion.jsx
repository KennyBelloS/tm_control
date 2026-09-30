import { useEffect, useMemo, useState } from 'react';
import logo from '../assets/logo-icon.png';
import Top3Podium from './Top3Podium';
import CarruselLista from './CarruselLista';
import { calcularPorcentajeMeta, clasificarEstado } from '../lib/calculos';

const SEGUNDOS_POR_SLIDE = 20 * 60;

function colorProgreso(pct) {
  if (pct >= 100) return 'linear-gradient(90deg,#16A34A,#22C55E)';
  if (pct >= 60) return 'linear-gradient(90deg,#65A30D,#84CC16)';
  if (pct >= 30) return 'linear-gradient(90deg,#D97706,#F59E0B)';
  return 'linear-gradient(90deg,#B91C1C,#EF4444)';
}
function colorSolido(pct) {
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

/* ---------- Estilo CLÁSICO (claro, con barra) ---------- */
function SlideProduccionClasico({ totalTallos, metaHoy, cumplimiento, rendimientoPromedio, ranking }) {
  return (
    <div className="slide-produccion">
      <div className="presentacion-stats-fila">
        <div className="presentacion-stat-card presentacion-stat-oro">
          <span className="presentacion-stat-label"><i className="fa-solid fa-seedling"></i> Producción de Hoy</span>
          <div className="presentacion-stat-numero">{totalTallos.toLocaleString()}<small>/ {metaHoy.toLocaleString()} tallos</small></div>
        </div>
        <div className="presentacion-stat-card presentacion-stat-verde">
          <span className="presentacion-stat-label"><i className="fa-solid fa-gauge-high"></i> Rendimiento Promedio</span>
          <div className="presentacion-stat-numero">{rendimientoPromedio}<small>tallos / hora</small></div>
        </div>
      </div>

      <div className="presentacion-barra">
        <div className="progress" style={{ height: 28 }}>
          <div style={{ width: `${Math.min(cumplimiento, 100)}%`, background: colorProgreso(cumplimiento) }}></div>
        </div>
        <span className="presentacion-emoji">{emojiCumplimiento(cumplimiento)} {cumplimiento}%</span>
      </div>

      {ranking.length > 0 && (
        <div className="presentacion-podio-wrap">
          <Top3Podium lista={ranking} metaHora={470} />
        </div>
      )}
    </div>
  );
}

/* ---------- Estilo OSCURO (fondo oscuro, anillo circular) ---------- */
function AnilloProgreso({ pct }) {
  const radio = 82;
  const circunferencia = 2 * Math.PI * radio;
  const avance = Math.min(pct, 100) / 100;
  return (
    <svg viewBox="0 0 200 200" className="anillo-progreso-svg">
      <circle cx="100" cy="100" r={radio} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="14" />
      <circle
        cx="100" cy="100" r={radio} fill="none" stroke={colorSolido(pct)} strokeWidth="14" strokeLinecap="round"
        strokeDasharray={circunferencia} strokeDashoffset={circunferencia * (1 - avance)}
        transform="rotate(-90 100 100)"
      />
    </svg>
  );
}
function SlideProduccionOscuro({ totalTallos, metaHoy, cumplimiento, rendimientoPromedio, ranking }) {
  return (
    <div className="slide-oscuro">
      <div className="anillo-progreso-wrap">
        <AnilloProgreso pct={cumplimiento} />
        <div className="anillo-progreso-centro">
          <span className="anillo-emoji">{emojiCumplimiento(cumplimiento)}</span>
          <span className="anillo-pct">{cumplimiento}%</span>
          <span className="anillo-label">de la meta</span>
        </div>
      </div>

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

function SlideRanking({ ranking, metaHora }) {
  return (
    <div className="slide-full">
      <h2 className="slide-titulo"><i className="fa-solid fa-ranking-star"></i> Rendimiento de Todo el Equipo</h2>
      <div className="slide-carrusel-full">
        <CarruselLista personas={ranking} metaHora={metaHora} titulo="Todos los operarios" icono="fa-people-group" />
      </div>
    </div>
  );
}

function SlideLineas({ resumenPorLinea }) {
  const max = Math.max(1, ...resumenPorLinea.map(l => l.rendimientoPromedio));
  return (
    <div className="slide-full">
      <h2 className="slide-titulo"><i className="fa-solid fa-industry"></i> Resumen por Línea</h2>
      <div className="slide-barras">
        {resumenPorLinea.map(l => {
          const estado = clasificarEstado(calcularPorcentajeMeta(l.rendimientoPromedio, 470));
          return (
            <div key={l.linea_id} className="slide-barra-fila">
              <div className="slide-barra-info">
                <span className="slide-barra-nombre">{l.linea}</span>
                <span className={`status ${estado.css}`}>{estado.label}</span>
              </div>
              <div className="progress" style={{ height: 20 }}>
                <div style={{ width: `${(l.rendimientoPromedio / max) * 100}%`, background: colorProgreso(calcularPorcentajeMeta(l.rendimientoPromedio, 470)) }}></div>
              </div>
              <div className="slide-barra-numeros">
                <strong>{l.rendimientoPromedio}</strong> t/h · {l.operarios} operarios · {l.totalTallos.toLocaleString()} tallos
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ModoPresentacion({ ranking, metaHora, totalTallos, metaHoy, cumplimiento, resumenPorLinea = [], onCerrar }) {
  const [estilo, setEstilo] = useState('clasico');
  const rankingConPromedio = useMemo(() => ranking.map(p => ({ ...p, promedioRend: p.promedioRend ?? p.rendimiento })), [ranking]);

  const rendimientoPromedio = useMemo(() => {
    if (rankingConPromedio.length === 0) return 0;
    return Math.round(rankingConPromedio.reduce((s, p) => s + p.promedioRend, 0) / rankingConPromedio.length);
  }, [rankingConPromedio]);

  const slides = [
    {
      id: 'produccion',
      render: () => estilo === 'clasico'
        ? <SlideProduccionClasico totalTallos={totalTallos} metaHoy={metaHoy} cumplimiento={cumplimiento} rendimientoPromedio={rendimientoPromedio} ranking={rankingConPromedio} />
        : <SlideProduccionOscuro totalTallos={totalTallos} metaHoy={metaHoy} cumplimiento={cumplimiento} rendimientoPromedio={rendimientoPromedio} ranking={rankingConPromedio} />
    },
    rankingConPromedio.length > 0 && { id: 'ranking', render: () => <SlideRanking ranking={rankingConPromedio} metaHora={metaHora} /> },
    resumenPorLinea.length > 0 && { id: 'lineas', render: () => <SlideLineas resumenPorLinea={resumenPorLinea} /> },
  ].filter(Boolean);

  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    if (pausado || slides.length <= 1) return;
    const t = setTimeout(() => setIndice(i => (i + 1) % slides.length), SEGUNDOS_POR_SLIDE * 1000);
    return () => clearTimeout(t);
  }, [indice, pausado, slides.length]);

  const slideActual = slides[indice] || slides[0];

  const fondoOscuro = estilo === 'oscuro' && slideActual.id === 'produccion';
  return (
    <div className={`presentacion-overlay ${fondoOscuro ? 'presentacion-tema-oscuro' : ''}`}>
      <div className="presentacion-marca">
        <img src={logo} alt="Torremolinos" />
        <div>
          <div className="presentacion-marca-nombre">TORREMOLINOS</div>
          <div className="presentacion-marca-sub">TMControl · Producción en vivo</div>
        </div>
        <button className="presentacion-pausa" onClick={() => setEstilo(e => e === 'clasico' ? 'oscuro' : 'clasico')} title="Cambiar estilo de visualización">
          <i className="fa-solid fa-palette"></i>
        </button>
        <button className="presentacion-pausa" onClick={() => setPausado(p => !p)} title={pausado ? 'Reanudar rotación' : 'Pausar rotación'}>
          <i className={`fa-solid ${pausado ? 'fa-play' : 'fa-pause'}`}></i>
        </button>
        <button className="presentacion-cerrar" onClick={onCerrar} title="Salir">
          <i className="fa-solid fa-compress"></i> Salir
        </button>
      </div>

      <div key={`${slideActual.id}-${estilo}`} className="presentacion-slide-contenido">
        {slideActual.render()}
      </div>

      {slides.length > 1 && (
        <div className="presentacion-puntos-slides">
          {slides.map((s, i) => (
            <button key={s.id} className={`presentacion-punto-slide ${i === indice ? 'activo' : ''}`} onClick={() => setIndice(i)} title={s.id}></button>
          ))}
        </div>
      )}
    </div>
  );
}
