import { useId } from 'react';
import { florPorId } from '../lib/avatares';

const ruta = (forma, largo, ancho) => {
  if (forma === 'punta') return `M50 50 C${50 - ancho} ${50 - largo * 0.35} ${50 - ancho * 0.35} ${50 - largo * 0.85} 50 ${50 - largo} C${50 + ancho * 0.35} ${50 - largo * 0.85} ${50 + ancho} ${50 - largo * 0.35} 50 50Z`;
  if (forma === 'redondo') return `M50 50 C${50 - ancho * 1.05} ${50 - largo * 0.15} ${50 - ancho * 0.9} ${50 - largo} 50 ${50 - largo} C${50 + ancho * 0.9} ${50 - largo} ${50 + ancho * 1.05} ${50 - largo * 0.15} 50 50Z`;
  return `M50 50 C${50 - ancho} ${50 - largo * 0.3} ${50 - ancho} ${50 - largo * 0.8} 50 ${50 - largo} C${50 + ancho} ${50 - largo * 0.8} ${50 + ancho} ${50 - largo * 0.3} 50 50Z`;
};
function Capa({ p, fill, anim, base = 0 }) {
  return <g>{Array.from({ length: p.n }, (_, i) => <g key={i} className={anim ? 'af-g' : undefined} style={anim ? { animationDelay: `${(base + i * 0.035).toFixed(2)}s` } : undefined}><path d={ruta(p.forma, p.largo, p.ancho)} fill={fill} transform={`rotate(${(p.giro || 0) + (i * 360) / p.n} 50 50)`} stroke="rgba(0,0,0,.16)" strokeWidth=".5" /></g>)}</g>;
}

/** El avatar de una flor ilustrada (SVG). `anim` hace que florezca al aparecer. Sin flor válida, muestra las iniciales. */
export default function AvatarFlor({ id, nombre = '', tam = 40, anim = false, className = '' }) {
  const uid = useId().replace(/:/g, ''), f = florPorId(id);
  if (!f) { const ini = String(nombre || '?').trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase(); return <span className={`af-ini ${className}`} style={{ width: tam, height: tam, fontSize: tam * 0.38 }}>{ini}</span>; }
  const c = f.centro;
  return (
    <svg className={`af ${anim ? 'af-anim' : ''} ${className}`} viewBox="0 0 100 100" width={tam} height={tam} role="img" aria-label={`Rosa: ${f.nombre}`}>
      <defs>
        <linearGradient id={`${uid}f`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={f.fondo[0]} /><stop offset="1" stopColor={f.fondo[1]} /></linearGradient>
        {f.capas.map((p, k) => <radialGradient key={k} id={`${uid}p${k}`} cx="50" cy="50" r="44" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor={p.colores[1]} /><stop offset="1" stopColor={p.colores[0]} /></radialGradient>)}
        <radialGradient id={`${uid}c`}><stop offset="0" stopColor={c.color2 || c.color} /><stop offset="1" stopColor={c.color} /></radialGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill={`url(#${uid}f)`} />
      {f.capas.map((p, k) => <Capa key={k} p={p} fill={`url(#${uid}p${k})`} anim={anim} base={k * 0.18} />)}
      <g className={anim ? 'af-g af-centro' : undefined} style={anim ? { animationDelay: `${(f.capas.length * 0.18 + 0.1).toFixed(2)}s` } : undefined}>
        <circle cx="50" cy="50" r={c.r} fill={`url(#${uid}c)`} stroke="rgba(0,0,0,.2)" strokeWidth=".6" />
        {c.puntos && Array.from({ length: 10 }, (_, i) => <circle key={i} cx={50 + Math.cos((i * 2 * Math.PI) / 10) * c.r * 0.62} cy={50 + Math.sin((i * 2 * Math.PI) / 10) * c.r * 0.62} r="1.1" fill="rgba(255,255,255,.7)" />)}
        {f.espiral && <path d="M50 45 C55.5 45 57.5 50.5 53 53.2 C48.5 55.8 43.5 51.8 45.3 47.2 C47.2 42.2 55.6 41.6 58.4 47.6" fill="none" stroke={f.espiral} strokeWidth="1.5" strokeLinecap="round" opacity=".6" />}
      </g>
      <ellipse cx="42" cy="38" rx="11" ry="5.5" fill="#fff" opacity=".16" transform="rotate(-32 42 38)" />
    </svg>
  );
}
