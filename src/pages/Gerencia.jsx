import { useEffect, useRef, useState } from 'react';
import PageHeader from '../components/PageHeader';

const URL_CALCULADORA = 'https://calculadora-costo-tallo.vercel.app/';
const TIEMPO_SOSPECHA_MS = 8000; // si a los 8s sigue "cargando" desde nuestro lado, avisamos

function BarraNavegador({ onCerrar, onRecargar }) {
  return (
    <div className="app-embed-barra">
      <span className="app-embed-punto app-embed-punto-r" onClick={onCerrar} style={onCerrar ? { cursor: 'pointer' } : undefined}></span>
      <span className="app-embed-punto app-embed-punto-a"></span>
      <span className="app-embed-punto app-embed-punto-v"></span>
      <span className="app-embed-url"><i className="fa-solid fa-lock"></i> calculadora-costo-tallo.vercel.app</span>
      <button className="app-embed-recargar" onClick={onRecargar} title="Recargar la vista previa">
        <i className="fa-solid fa-rotate-right"></i>
      </button>
      <span className="app-embed-live"><span className="app-embed-live-dot"></span>EN VIVO</span>
      {onCerrar && (
        <button className="app-embed-salir" onClick={onCerrar} title="Salir de pantalla completa (Esc)">
          <i className="fa-solid fa-compress"></i> Salir
        </button>
      )}
    </div>
  );
}

export default function Gerencia() {
  const [cargando, setCargando] = useState(true);
  const [sospecha, setSospecha] = useState(false);
  const [pantallaCompleta, setPantallaCompleta] = useState(false);
  const [claveRecarga, setClaveRecarga] = useState(0);
  const timeoutRef = useRef(null);

  useEffect(() => {
    setCargando(true);
    setSospecha(false);
    timeoutRef.current = setTimeout(() => setSospecha(true), TIEMPO_SOSPECHA_MS);
    return () => clearTimeout(timeoutRef.current);
  }, [claveRecarga]);

  useEffect(() => {
    function onEsc(e) { if (e.key === 'Escape') setPantallaCompleta(false); }
    if (pantallaCompleta) {
      document.addEventListener('keydown', onEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', onEsc);
      document.body.style.overflow = '';
    };
  }, [pantallaCompleta]);

  function alCargar() {
    setCargando(false);
  }

  function recargar() {
    setClaveRecarga(k => k + 1);
  }

  const contenidoEmbed = (
    <div className="app-embed-body">
      {cargando && !sospecha && (
        <div className="app-embed-loading">
          <div className="app-embed-spinner"></div>
          <span>Cargando Costo por Tallo…</span>
        </div>
      )}
      <iframe
        key={claveRecarga}
        src={URL_CALCULADORA}
        title="Calculadora Costo por Tallo"
        className="app-embed-iframe"
        onLoad={alCargar}
      />
    </div>
  );

  return (
    <>
      <PageHeader title="Gerencia" subtitle="Vista ejecutiva: indicadores consolidados y herramientas conectadas de toda la operación." />
      <div className="page">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Costo por Tallo</h2>
              <p>Herramienta conectada — calcula el costo de producción por tallo sin salir de Torremolinos Control.</p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-secondary" onClick={() => setPantallaCompleta(true)}>
                <i className="fa-solid fa-expand"></i> Pantalla completa
              </button>
              <a className="btn-primary" href={URL_CALCULADORA} target="_blank" rel="noopener noreferrer">
                <i className="fa-solid fa-arrow-up-right-from-square"></i> Abrir en pestaña nueva
              </a>
            </div>
          </div>

          {sospecha && (
            <div className="alert warn">
              <i className="fa-solid fa-triangle-exclamation"></i>
              Si la ves pegada en el logo de carga: algunos navegadores (Firefox con protección contra rastreo, o bloqueadores de anuncios) bloquean el almacenamiento de esta app cuando está embebida dentro de otra página, y por eso no termina de iniciar aquí — aunque funcione perfecto al abrirla directo.
              <button className="btn-secondary" style={{ marginLeft: 'auto', flexShrink: 0 }} onClick={recargar}>
                <i className="fa-solid fa-rotate-right"></i> Reintentar
              </button>
            </div>
          )}

          <div className={pantallaCompleta ? 'app-embed-overlay' : 'app-embed-glow-wrap'}>
            <div className={`app-embed-frame ${pantallaCompleta ? 'app-embed-frame-overlay' : ''}`}>
              <BarraNavegador onCerrar={pantallaCompleta ? () => setPantallaCompleta(false) : undefined} onRecargar={recargar} />
              {contenidoEmbed}
            </div>
          </div>

          <div className="alert-inline">
            <i className="fa-solid fa-circle-info"></i>
            Esta vista muestra la app real en vivo (no es una copia) — cualquier cambio que hagas ahí se guarda en esa app, no en Torremolinos Control. Si no carga bien aquí por restricciones del navegador, usa "Abrir en pestaña nueva" — ahí siempre funciona sin restricciones.
          </div>
        </section>
      </div>
    </>
  );
}
