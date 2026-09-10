import { calcularPorcentajeMeta, clasificarEstado } from '../lib/calculos';

const SEGUNDOS_POR_PERSONA = 7;

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
  const totalTallos = persona.totalTallos ?? persona.total_tallos ?? 0;
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
        {totalTallos > 0 && <div className="carrusel-fila-total">{totalTallos.toLocaleString()} tallos totales</div>}
      </div>
    </div>
  );
}

export default function CarruselLista({ personas, metaHora, titulo, icono = 'fa-list' }) {
  if (!personas || personas.length === 0) return null;
  const duracion = personas.length * SEGUNDOS_POR_PERSONA;

  return (
    <section className="carrusel-panel">
      <div className="carrusel-header">
        <span className="carrusel-etiqueta"><i className={`fa-solid ${icono}`}></i> {titulo}</span>
        <span className="carrusel-contador">{personas.length} personas</span>
      </div>

      <div className="carrusel-ventana">
        <div className="carrusel-lista-scroll" style={{ animationDuration: `${duracion}s` }}>
          {personas.map((p, i) => <Fila key={`a-${i}`} persona={p} metaHora={metaHora} />)}
          {personas.map((p, i) => <Fila key={`b-${i}`} persona={p} metaHora={metaHora} />)}
        </div>
        <div className="carrusel-cursor-banda"></div>
        <div className="carrusel-degradado-arriba"></div>
        <div className="carrusel-degradado-abajo"></div>
      </div>
    </section>
  );
}
