import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useEfectos } from '../../lib/efectos';
import { FIESTAS, fiestaDelDia, proximaFiesta } from '../../lib/fiestas';
import { fechaLocalISO } from '../../lib/efectos';
import { celebrar } from '../../lib/confeti';

const NIVELES = [
  { k: 'alto', t: 'Alto', d: 'Aurora, pétalos que huyen del cursor, brillo, tarjetas en 3D y botones magnéticos.' },
  { k: 'suave', t: 'Suave', d: 'Aurora y unas pocas partículas, sin efectos que sigan al cursor.' },
  { k: 'apagado', t: 'Apagado', d: 'Sin animaciones decorativas. Ideal si prefieres una pantalla más tranquila o tu equipo es lento.' }
];
const fCorta = iso => `${Number(iso.slice(8))} ${['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][Number(iso.slice(5, 7)) - 1]}`;

/** Panel "Efectos y festividades": el interruptor del ambiente festivo, el modo (automático o manual), las 10 festividades y la intensidad de los efectos. */
export default function PanelEfectos() {
  const [abierto, setAbierto] = useState(false);
  const { ajustes, fiesta, cambiar } = useEfectos();
  const cierre = useRef(null);
  useEffect(() => {
    const abrir = () => setAbierto(true);
    window.addEventListener('tm-abrir-efectos', abrir);
    return () => window.removeEventListener('tm-abrir-efectos', abrir);
  }, []);
  useEffect(() => {
    if (!abierto) return undefined;
    const tecla = e => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('keydown', tecla); cierre.current?.focus();
    return () => document.removeEventListener('keydown', tecla);
  }, [abierto]);
  if (!abierto) return null;

  const hoy = fechaLocalISO(), deHoy = fiestaDelDia(hoy), prox = proximaFiesta(hoy);
  const nota = ajustes.modo === 'auto'
    ? (deHoy ? `Hoy toca ${deHoy.nombre} ${deHoy.emoji}.` : `Hoy no hay festividad. La próxima es ${prox.fiesta.nombre} ${prox.fiesta.emoji}, desde el ${fCorta(prox.desde)} (en ${prox.dias} días).`)
    : `Mostrando ${fiesta ? fiesta.nombre : '—'} sin importar la fecha.`;

  return createPortal(
    <div className="efx-fondo" onClick={() => setAbierto(false)}>
      <div className="efx-panel" role="dialog" aria-modal="true" aria-label="Efectos y festividades" onClick={e => e.stopPropagation()}>
        <header>
          <h3><i className="fa-solid fa-wand-magic-sparkles"></i> Efectos y festividades</h3>
          <button ref={cierre} className="efx-cerrar" onClick={() => setAbierto(false)} aria-label="Cerrar"><i className="fa-solid fa-xmark"></i></button>
        </header>

        <section>
          <h4>Efectos visuales</h4>
          <div className="fuente-toggle" role="tablist" aria-label="Intensidad de los efectos">
            {NIVELES.map(n => <button key={n.k} className={ajustes.efectos === n.k ? 'activo' : ''} onClick={() => cambiar({ efectos: n.k })} role="tab" aria-selected={ajustes.efectos === n.k}>{n.t}</button>)}
          </div>
          <p className="efx-nota">{NIVELES.find(n => n.k === ajustes.efectos).d}</p>
        </section>

        <section>
          <div className="efx-maestro">
            <div><h4>Ambiente festivo</h4><small>{ajustes.activo ? (fiesta ? `Activo: ${fiesta.nombre} ${fiesta.emoji}` : 'Activo, esperando la próxima festividad') : 'Apagado: la aplicación luce como siempre'}</small></div>
            <button className={`efx-interruptor ${ajustes.activo ? 'on' : ''}`} role="switch" aria-checked={ajustes.activo} aria-label="Ambiente festivo" onClick={() => { const nuevo = !ajustes.activo; cambiar({ activo: nuevo }); if (nuevo) setTimeout(celebrar, 250); }}><span></span></button>
          </div>
          <div className={`efx-festivas ${ajustes.activo ? '' : 'inactivo'}`}>
            <div className="fuente-toggle" role="tablist" aria-label="Modo">
              <button className={ajustes.modo === 'auto' ? 'activo' : ''} onClick={() => cambiar({ modo: 'auto' })} role="tab" aria-selected={ajustes.modo === 'auto'}>Automático por fecha</button>
              <button className={ajustes.modo === 'manual' ? 'activo' : ''} onClick={() => cambiar({ modo: 'manual' })} role="tab" aria-selected={ajustes.modo === 'manual'}>Elegir yo</button>
            </div>
            <p className="efx-nota">{nota}</p>
            <div className="efx-grid">
              {FIESTAS.map(f => (
                <button key={f.id} className={`efx-fiesta ${fiesta?.id === f.id ? 'sel' : ''} ${deHoy?.id === f.id ? 'hoy' : ''}`} onClick={() => cambiar({ activo: true, modo: 'manual', tema: f.id })} title={`Ver ${f.nombre}`} style={{ '--f1': f.colores['primary-dark'], '--f2': f.colores.primary, '--f3': f.colores.gold }}>
                  <span className="efx-emoji">{f.emoji}</span>
                  <strong>{f.nombre}</strong>
                  <small>{f.fecha}</small>
                  <i className="efx-muestra"></i>
                  {deHoy?.id === f.id && <em>Hoy</em>}
                </button>
              ))}
            </div>
          </div>
        </section>

        <footer>
          <button className="btn-secondary" onClick={celebrar}><i className="fa-solid fa-champagne-glasses"></i> Probar celebración</button>
          <button className="btn-secondary" onClick={() => cambiar({ activo: false, modo: 'auto', efectos: 'alto' })}><i className="fa-solid fa-rotate-left"></i> Restablecer</button>
        </footer>
      </div>
    </div>, document.body);
}
