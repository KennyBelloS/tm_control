import { useEffect, useRef } from 'react';
import { useSesion } from '../lib/useSesion';
import { useEfectos } from '../lib/efectos';
import { celebrarUnaVez, celebrar } from '../lib/confeti';
import { avisar } from '../lib/avisos';
import { hitoAlcanzado, hitoNuevo, leerHito, guardarHito } from '../lib/hitos';
import FlorMeta from './FlorMeta';
import { fechaLocalISO } from '../lib/clasificacionCalculos';
import NumeroAnimado from './NumeroAnimado';

const cap = t => t.charAt(0).toUpperCase() + t.slice(1);

/** El saludo del Dashboard: cambia con la hora del día, la festividad y cómo va el turno; y celebra una vez al día si se cumple la meta. */
export default function SaludoDia({ tallos = 0, cumplimiento = 0, meta = 0, bloques = 0 }) {
  const { sesion } = useSesion();
  const { fiesta } = useEfectos();
  const ahora = new Date(), h = ahora.getHours();
  const franja = h < 12 ? { t: 'Buenos días', e: '☀️' } : h < 19 ? { t: 'Buenas tardes', e: '🌤️' } : { t: 'Buenas noches', e: '🌙' };
  const nombre = String(sesion?.nombre || '').trim().split(/\s+/)[0];
  const fecha = cap(ahora.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }));
  const faltan = Math.max(0, meta - tallos);
  const cumplida = bloques > 0 && cumplimiento >= 100;
  const mensaje = bloques === 0 ? 'Todavía no hay un turno cargado hoy. Cuando subas el reporte, aquí verás cómo va la jornada.'
    : cumplida ? '¡Meta de hoy cumplida! Gran trabajo de todo el equipo.'
    : cumplimiento >= 70 ? `Muy buen ritmo: faltan ${faltan.toLocaleString('es-CO')} tallos para la meta.`
    : `El turno va en marcha: ${tallos.toLocaleString('es-CO')} tallos hasta ahora. Faltan ${faltan.toLocaleString('es-CO')} para la meta.`;
  useEffect(() => { if (cumplida) celebrarUnaVez(`tm_confeti_meta_${fechaLocalISO()}`); }, [cumplida]);
  // Hitos en vivo: al cruzar 25, 50, 75 o 100 % de la meta aparece un aviso (y confeti si los efectos están activos). Al abrir no se celebra lo viejo.
  const refHito = useRef(null);
  useEffect(() => {
    if (bloques === 0) return;
    const hoy = fechaLocalISO(), h = hitoAlcanzado(cumplimiento);
    if (refHito.current === null) { refHito.current = h; guardarHito('dash', hoy, Math.max(leerHito('dash', hoy), h)); return; }
    const nuevo = hitoNuevo(cumplimiento, Math.max(refHito.current, leerHito('dash', hoy)));
    refHito.current = h;
    if (!nuevo) return;
    guardarHito('dash', hoy, nuevo);
    if (nuevo >= 100) avisar('🏆 ¡Meta del día cumplida! Gran trabajo de todo el equipo.');
    else { avisar(`${fiesta ? fiesta.emoji : '🌸'} ¡${nuevo}% de la meta del día!`); celebrar(); }
  }, [cumplimiento, bloques]);                                  // eslint-disable-line react-hooks/exhaustive-deps
  const pct = Math.max(0, Math.min(100, Math.round(cumplimiento)));
  return (
    <section className={`saludo-dia ${cumplida ? 'cumplida' : ''}`} aria-label="Resumen del día">
      <div className="saludo-emoji" aria-hidden="true">{cumplida ? '🏆' : fiesta ? fiesta.emoji : franja.e}</div>
      <div className="saludo-texto">
        <h2>{franja.t}{nombre ? <>, <span>{nombre}</span></> : null}</h2>
        <p className="saludo-fecha">{fecha}{fiesta && <b className="saludo-fiesta">{fiesta.emoji} {fiesta.saludo}</b>}</p>
        <p className="saludo-msg">{mensaje}</p>
      </div>
      <div className="saludo-anillo" role="img" aria-label={`Cumplimiento ${pct}%`} title="La flor se abre a medida que avanza la meta del día">
        <FlorMeta pct={pct} tamano={104}><strong><NumeroAnimado valor={pct} formato={n => `${n}%`} /></strong></FlorMeta>
      </div>
    </section>
  );
}
