import { useEffect, useMemo, useRef, useState } from 'react';
import FlorMeta from '../FlorMeta';

const ESPACIO_IZQ = 322, ESPACIO_DER = 590;       // píxeles del lienzo ocupados por el logo (izquierda) y por los botones (derecha, con el de la decoración)
const MARCA = ['#34A35A', '#C9932B', '#A91D3A', '#FFFFFF'];                          // colores de la marca cuando no hay festividad
const paleta = fiesta => fiesta?.confeti || MARCA;

/** Lluvia de confeti hecha solo con CSS (ligera, sin canvas): piezas de colores y algunos emojis de la festividad. */
export function ConfetiCss({ fiesta, cantidad = 70 }) {
  const colores = paleta(fiesta), emojis = fiesta?.particulas || null;
  const piezas = useMemo(() => Array.from({ length: cantidad }, (_, i) => ({
    x0: Math.random() * 100, x1: Math.random() * 100, rot: 360 + Math.random() * 900, d: Math.random() * 1.6, t: 3.6 + Math.random() * 2.8,
    c: colores[i % colores.length], w: 9 + Math.random() * 9, h: 14 + Math.random() * 14, emoji: emojis && i % 7 === 0 ? emojis[Math.floor(i / 7) % emojis.length] : null
  })), [cantidad]);                                                                  // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="pf-confeti" aria-hidden="true">
      {piezas.map((p, i) => p.emoji
        ? <b key={i} className="pf-conf-emoji" style={{ '--x0': `${p.x0}vw`, '--x1': `${p.x1}vw`, '--r': `${p.rot}deg`, animationDelay: `${p.d}s`, animationDuration: `${p.t}s` }}>{p.emoji}</b>
        : <i key={i} style={{ '--x0': `${p.x0}vw`, '--x1': `${p.x1}vw`, '--r': `${p.rot}deg`, animationDelay: `${p.d}s`, animationDuration: `${p.t}s`, width: p.w, height: p.h, background: p.c }} />)}
    </div>
  );
}

/** Tira de luces que cuelga del borde de la cabecera (SVG, del ancho real del lienzo): cada bombillo parpadea con su propio ritmo. */
function TiraLuces({ colores, ancho }) {
  const luces = useMemo(() => {
    const seg = Math.max(4, Math.round(ancho / 120)), a = ancho / seg, por = 3, sag = 7, out = [];
    for (let s = 0; s < seg; s++) for (let k = 0; k < por; k++) {
      const t = (k + 0.5) / por, x0 = s * a, x1 = x0 + a, xm = (x0 + x1) / 2;
      const x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * xm + t * t * x1, y = (1 - t) * (1 - t) * 3 + 2 * (1 - t) * t * (3 + sag * 2) + t * t * 3;
      out.push({ x, y, i: s * por + k });
    }
    const cable = Array.from({ length: seg }, (_, s) => `${s === 0 ? 'M0,3 ' : ''}Q${s * a + a / 2},${3 + sag * 2} ${(s + 1) * a},3`).join(' ');
    return { out, cable };
  }, [ancho]);
  return (
    <svg className="pf-luces" width={ancho} height="34" viewBox={`0 0 ${ancho} 34`} aria-hidden="true">
      <path d={luces.cable} className="pf-cable" />
      {luces.out.map(l => (
        <g key={l.i} className="pf-bombillo" style={{ color: colores[l.i % colores.length], animationDelay: `${(l.i % 5) * 0.37}s` }}>
          <rect x={l.x - 2} y={l.y} width="4" height="5" rx="1.2" className="pf-casquillo" />
          <ellipse cx={l.x} cy={l.y + 10} rx="4.2" ry="6" fill="currentColor" />
          <ellipse cx={l.x - 1.4} cy={l.y + 8} rx="1.2" ry="2" fill="#fff" opacity=".7" />
        </g>
      ))}
    </svg>
  );
}

/** Todo lo festivo que va DENTRO del lienzo de Presentar. No recibe clics y deja libre el centro: nunca tapa datos. */
export function CapaFestiva({ fiesta, quieto, ancho = 1185 }) {
  const colores = paleta(fiesta), em = fiesta.particulas;
  const hueco = ancho - ESPACIO_IZQ - ESPACIO_DER;                                  // el hueco libre entre el logo y los botones de la cabecera
  const lluvia = useMemo(() => Array.from({ length: 14 }, (_, i) => ({ lado: i % 2, x: 6 + ((i * 17) % 40), d: (i * 1.7) % 11, t: 11 + (i * 3) % 7, e: em[i % em.length], s: 16 + (i * 5) % 10 })), [em]);
  return (
    <div className={`pf-capa pf-${fiesta.id} ${quieto ? 'pf-quieto' : ''}`} aria-hidden="true">
      <div className="pf-marco" />
      <TiraLuces colores={colores} ancho={ancho} />
      <div className="pf-lluvia">
        {lluvia.map((l, i) => <span key={i} style={{ [l.lado ? 'right' : 'left']: l.x, animationDelay: `-${l.d}s`, animationDuration: `${l.t}s`, fontSize: l.s }}>{l.e}</span>)}
      </div>
      <div className="pf-esquina pf-esq-izq"><b>{em[0]}</b><i>{em[1] || em[0]}</i><u>{em[2] || em[0]}</u></div>
      <div className="pf-esquina pf-esq-der"><b>{em[1] || em[0]}</b><i>{em[0]}</i><u>{em[3] || em[0]}</u></div>
      {hueco >= 150 && <div className="pf-pildora" style={{ width: Math.min(380, hueco) }}><span className="pf-pildora-emoji">{fiesta.emoji}</span>{hueco >= 250 && <span className="pf-pildora-texto">{fiesta.saludo}</span>}<span className="pf-pildora-emoji">{fiesta.emoji}</span></div>}
    </div>
  );
}

/** Bienvenida al abrir Presentar: pantalla completa, con la festividad. Se cierra sola o con un clic/tecla. */
export function IntroFestiva({ fiesta, onFin }) {
  const [saliendo, setSaliendo] = useState(false);
  const fin = useRef(onFin); fin.current = onFin;               // el temporizador no se reinicia cuando Presentar se vuelve a dibujar
  useEffect(() => {
    const t1 = setTimeout(() => setSaliendo(true), 4200), t2 = setTimeout(() => fin.current(), 4900);
    const saltar = () => setSaliendo(true);
    window.addEventListener('keydown', saltar);
    return () => { clearTimeout(t1); clearTimeout(t2); window.removeEventListener('keydown', saltar); };
  }, []);
  useEffect(() => { if (saliendo) { const t = setTimeout(() => fin.current(), 600); return () => clearTimeout(t); } return undefined; }, [saliendo]);
  return (
    <div className={`pf-intro pf-${fiesta.id} ${saliendo ? 'saliendo' : ''}`} onClick={() => setSaliendo(true)} role="presentation">
      <ConfetiCss fiesta={fiesta} cantidad={80} />
      <div className="pf-intro-centro">
        <div className="pf-intro-emoji">{fiesta.emoji}</div>
        <h2>{fiesta.saludo}</h2>
        <p>Del equipo de Finca Torremolinos, con cariño</p>
      </div>
    </div>
  );
}

/** Celebración de un hito de la meta (25, 50, 75 o 100 %): la flor, el porcentaje y confeti. */
export function CelebracionHito({ hito, tallos, meta, fiesta, onFin, conConfeti = true }) {
  const fin = useRef(onFin); fin.current = onFin;               // un hito nuevo reinicia el tiempo; un simple redibujado no
  useEffect(() => { const t = setTimeout(() => fin.current(), 7500); return () => clearTimeout(t); }, [hito]);
  const faltan = Math.max(0, meta - tallos), fmt = n => Number(n).toLocaleString('es-CO');
  const total = hito >= 100;
  return (
    <div className={`pf-hito ${total ? 'total' : ''}`} role="status" aria-live="polite">
      {conConfeti && <ConfetiCss fiesta={fiesta} cantidad={total ? 110 : 60} />}
      <div className="pf-hito-tarjeta">
        <FlorMeta pct={hito} tamano={250}><span className="pf-hito-pct">{hito}%</span></FlorMeta>
        <div className="pf-hito-texto">
          <small>{fiesta ? `${fiesta.emoji} ${fiesta.nombre}` : '🌸 Meta del día'}</small>
          <h2>{total ? '¡Meta cumplida!' : `¡${hito}% de la meta!`}</h2>
          <p>{total ? (tallos > meta ? `Superada por ${fmt(tallos - meta)} tallos. ¡Gran trabajo de todo el equipo!` : `Llegaron a los ${fmt(meta)} tallos de la meta. ¡Gran trabajo de todo el equipo!`) : `${fmt(tallos)} tallos hasta ahora · faltan ${fmt(faltan)} para la meta`}</p>
        </div>
      </div>
    </div>
  );
}
