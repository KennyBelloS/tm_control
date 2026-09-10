import { useEffect, useMemo, useState } from 'react';
import { calcularPorcentajeMeta, clasificarEstado } from '../lib/calculos';

const SEGUNDOS_POR_PERSONA = 7;
const VUELTAS_ANTES_DE_CAMBIAR = 3;

function iniciales(nombre) {
  const partes = String(nombre || '?').trim().split(/\s+/);
  return ((partes[0]?.[0] || '') + (partes[1]?.[0] || '')).toUpperCase();
}

const COLOR_BARRA = {
  success: 'linear-gradient(90deg,#166534,#2F9E4F)',
  warning: 'linear-gradient(90deg,#D97706,#F59E0B)',
  danger: 'linear-gradient(90deg,#A91D3A,#DC2626)',
};

function Fila({ persona, metaHora }) {
  const rendimiento = persona.promedioRend ?? persona.rendimiento ?? 0;
  const pct = calcularPorcentajeMeta(rendimiento, metaHora);
  const estado = clasificarEstado(pct);
  const anchoBarra = Math.min(100, Math.max(4, pct));
  return (
    <div className="carrusel-fila">
      <div className="carrusel-fila-avatar" style={{ background: COLOR_BARRA[estado.css] }}>
        {iniciales(persona.colaborador)}
      </div>
      <div className="carrusel-fila-cuerpo">
        <div className="carrusel-fila-top">
          <span className="carrusel-fila-nombre">{persona.colaborador}</span>
          <span className={`status ${estado.css}`}>{estado.label}</span>
        </div>
        <div className="carrusel-fila-progreso-fila">
          <div className="carrusel-fila-barra-track">
            <div className="carrusel-fila-barra-fill" style={{ width: `${anchoBarra}%`, background: COLOR_BARRA[estado.css] }}></div>
          </div>
          <span className="carrusel-fila-rend"><strong>{rendimiento}</strong> t/h</span>
          <span className="carrusel-fila-pct">{pct.toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
}

export default function DashboardCarrusel({ personasHoy, personasAyer, metaHora }) {
  const grupos = useMemo(() => [
    { etiqueta: 'Turno Actual · Hoy', icono: 'fa-bolt', personas: personasHoy },
    { etiqueta: 'Histórico · Ayer', icono: 'fa-calendar-days', personas: personasAyer },
  ].filter(g => g.personas.length > 0), [personasHoy, personasAyer]);

  const [grupoIndex, setGrupoIndex] = useState(0);
  const [vuelta, setVuelta] = useState(0);

  useEffect(() => { setGrupoIndex(0); setVuelta(0); }, [grupos.length]);

  const grupoActual = grupos[grupoIndex];
  const duracion = grupoActual ? grupoActual.personas.length * SEGUNDOS_POR_PERSONA : 0;

  useEffect(() => {
    if (!grupoActual || duracion === 0) return;
    const t = setTimeout(() => {
      if (vuelta + 1 < VUELTAS_ANTES_DE_CAMBIAR) {
        setVuelta(v => v + 1);
      } else {
        setGrupoIndex(g => (g + 1) % grupos.length);
        setVuelta(0);
      }
    }, duracion * 1000);
    return () => clearTimeout(t);
  }, [grupoIndex, vuelta, duracion, grupos.length]);

  if (!grupoActual) return null;

  return (
    <section className="carrusel-panel">
      <div className="carrusel-header">
        <span className="carrusel-etiqueta"><i className={`fa-solid ${grupoActual.icono}`}></i> {grupoActual.etiqueta}</span>
        <span className="carrusel-contador">{grupoActual.personas.length} personas</span>
      </div>

      <div className="carrusel-ventana">
        <div
          key={`${grupoIndex}-${vuelta}`}
          className="carrusel-lista-scroll"
          style={{ animationDuration: `${duracion}s` }}
        >
          {grupoActual.personas.map((p, i) => (
            <Fila key={`a-${i}`} persona={p} metaHora={metaHora} />
          ))}
          {grupoActual.personas.map((p, i) => (
            <Fila key={`b-${i}`} persona={p} metaHora={metaHora} />
          ))}
        </div>
        <div className="carrusel-cursor-banda"></div>
        <div className="carrusel-degradado-arriba"></div>
        <div className="carrusel-degradado-abajo"></div>
      </div>

      <div className="carrusel-puntos">
        {grupos.map((g, gi) => (
          <span key={gi} className={`carrusel-punto-grupo ${gi === grupoIndex ? 'activo' : ''}`}></span>
        ))}
      </div>
    </section>
  );
}
