import { useEffect, useState } from 'react';
import logo from '../assets/logo-icon.png';
import Top3Podium from './Top3Podium';
import CarruselLista from './CarruselLista';
import { calcularPorcentajeMeta, clasificarEstado } from '../lib/calculos';

const SEGUNDOS_POR_SLIDE = 12;

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

function SlideProduccion({ totalTallos, metaHoy, cumplimiento, ranking }) {
  return (
    <div className="slide-produccion">
      <h1>Producción de Hoy</h1>
      <div className="presentacion-numero">{totalTallos.toLocaleString()} <span>/ {metaHoy.toLocaleString()} tallos</span></div>
      <div className="presentacion-barra">
        <div className="progress" style={{ height: 26 }}>
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

function SlideFormadoras({ resumenPorFormadora }) {
  const max = Math.max(1, ...resumenPorFormadora.map(f => f.rendimientoPromedio));
  return (
    <div className="slide-full">
      <h2 className="slide-titulo"><i className="fa-solid fa-chalkboard-user"></i> Resumen por Formadora</h2>
      <div className="slide-barras">
        {resumenPorFormadora.map(f => {
          const estado = clasificarEstado(calcularPorcentajeMeta(f.rendimientoPromedio, 470));
          return (
            <div key={f.formadora_id} className="slide-barra-fila">
              <div className="slide-barra-info">
                <span className="slide-barra-nombre">{f.formadora}</span>
                <span className={`status ${estado.css}`}>{estado.label}</span>
              </div>
              <div className="progress" style={{ height: 20 }}>
                <div style={{ width: `${(f.rendimientoPromedio / max) * 100}%`, background: colorProgreso(calcularPorcentajeMeta(f.rendimientoPromedio, 470)) }}></div>
              </div>
              <div className="slide-barra-numeros">
                <strong>{f.rendimientoPromedio}</strong> t/h · {f.operarios} operarios · {f.totalTallos.toLocaleString()} tallos
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ModoPresentacion({ ranking, metaHora, totalTallos, metaHoy, cumplimiento, resumenPorLinea = [], resumenPorFormadora = [], onCerrar }) {
  const rankingConPromedio = ranking.map(p => ({ ...p, promedioRend: p.promedioRend ?? p.rendimiento }));

  const slides = [
    { id: 'produccion', render: () => <SlideProduccion totalTallos={totalTallos} metaHoy={metaHoy} cumplimiento={cumplimiento} ranking={rankingConPromedio} /> },
    rankingConPromedio.length > 0 && { id: 'ranking', render: () => <SlideRanking ranking={rankingConPromedio} metaHora={metaHora} /> },
    resumenPorLinea.length > 0 && { id: 'lineas', render: () => <SlideLineas resumenPorLinea={resumenPorLinea} /> },
    resumenPorFormadora.length > 0 && { id: 'formadoras', render: () => <SlideFormadoras resumenPorFormadora={resumenPorFormadora} /> },
  ].filter(Boolean);

  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    if (pausado || slides.length <= 1) return;
    const t = setTimeout(() => setIndice(i => (i + 1) % slides.length), SEGUNDOS_POR_SLIDE * 1000);
    return () => clearTimeout(t);
  }, [indice, pausado, slides.length]);

  const slideActual = slides[indice] || slides[0];

  return (
    <div className="presentacion-overlay">
      <div className="presentacion-marca">
        <img src={logo} alt="Torremolinos" />
        <div>
          <div className="presentacion-marca-nombre">TORREMOLINOS</div>
          <div className="presentacion-marca-sub">TMControl · Producción en vivo</div>
        </div>
        <button className="presentacion-pausa" onClick={() => setPausado(p => !p)} title={pausado ? 'Reanudar rotación' : 'Pausar rotación'}>
          <i className={`fa-solid ${pausado ? 'fa-play' : 'fa-pause'}`}></i>
        </button>
        <button className="presentacion-cerrar" onClick={onCerrar} title="Salir">
          <i className="fa-solid fa-compress"></i> Salir
        </button>
      </div>

      <div key={slideActual.id} className="presentacion-slide-contenido">
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
