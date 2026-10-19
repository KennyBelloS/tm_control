import { useEffect, useRef } from 'react';
import { useEfectos } from '../../lib/efectos';

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const FUENTE_EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const PETALOS = ['#F6C9D0', '#FFFFFF', '#F9E3A8', '#C8E6C9', '#F4B6C2'];

/**
 * La capa ambiental: una aurora suave, pétalos (o las partículas de la festividad) que flotan y se apartan del cursor,
 * un brillo que sigue al mouse y las celebraciones de confeti. Va DETRÁS del contenido y no recibe clics.
 * Se pausa con la pestaña oculta y baja sola la cantidad de partículas si el equipo va justo.
 */
export default function CapaAmbiente() {
  const { ajustes, fiesta } = useEfectos();
  const cv = useRef(null), aura = useRef(null);
  const nivel = ajustes.efectos;

  useEffect(() => {
    if (nivel === 'apagado' || !cv.current) return undefined;
    const canvas = cv.current, ctx = canvas.getContext('2d');
    let W = 0, H = 0, dpr = 1, raf = 0, ultimo = 0, vivo = true, lentos = 0, frames = 0, acum = 0;
    const alto = nivel === 'alto';
    const puntero = { x: -999, y: -999 };
    const sprites = new Map();
    const emojis = fiesta?.particulas || null;
    const sube = fiesta?.id === 'san_valentin' || fiesta?.id === 'ano_nuevo';        // corazones y chispas suben; lo demás cae
    const colorConfeti = fiesta?.confeti || ['#34A35A', '#C9932B', '#A91D3A', '#FFFFFF'];

    const sprite = e => {
      if (sprites.has(e)) return sprites.get(e);
      const s = document.createElement('canvas'); s.width = s.height = 72;
      const c = s.getContext('2d'); c.font = `52px ${FUENTE_EMOJI}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(e, 36, 40);
      sprites.set(e, s); return s;
    };
    const medir = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2); W = window.innerWidth; H = window.innerHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const objetivo = () => Math.round(clamp((W * H) / (alto ? 52000 : 115000), alto ? 14 : 7, alto ? 40 : 15)) * (W < 700 ? 0.6 : 1);
    const nueva = inicial => {
      const z = rand(0.45, 1.25);
      return {
        x: rand(0, W), y: inicial ? rand(0, H) : (sube ? H + 40 : -40), z, fase: rand(0, 6.28), giro: rand(0, 6.28), vg: rand(-1.2, 1.2),
        vy: (14 + 34 * z) * (sube ? -1 : 1), vx: rand(-6, 6), ox: 0, oy: 0, alfa: clamp(0.4 + z * 0.4, 0.45, 0.9),
        tam: (emojis ? 15 : 12) * z + (emojis ? 6 : 4), emoji: emojis ? emojis[Math.floor(Math.random() * emojis.length)] : null, color: PETALOS[Math.floor(Math.random() * PETALOS.length)]
      };
    };
    let parts = [], extras = [];
    medir(); parts = Array.from({ length: Math.round(objetivo()) }, () => nueva(true));

    const petalo = (p) => {
      const w = p.tam, h = p.tam * 0.6;
      ctx.beginPath(); ctx.moveTo(0, -h); ctx.bezierCurveTo(w, -h, w, h, 0, h); ctx.bezierCurveTo(-w * 0.4, h * 0.4, -w * 0.4, -h * 0.4, 0, -h);
      ctx.fillStyle = p.color; ctx.fill();
    };
    const dibujarConfeti = e => {
      ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.rot); ctx.globalAlpha = clamp((e.fin - performance.now()) / 700, 0, 1);
      if (e.emoji) { const s = e.w * 2.2; ctx.drawImage(sprite(e.emoji), -s / 2, -s / 2, s, s); }
      else { ctx.fillStyle = e.color; if (e.forma) { ctx.beginPath(); ctx.arc(0, 0, e.w / 2, 0, 6.28); ctx.fill(); } else ctx.fillRect(-e.w / 2, -e.h / 2, e.w, e.h); }
      ctx.restore();
    };
    const lanzarConfeti = () => {
      const n = alto ? 150 : 80;
      for (let i = 0; i < n; i++) {
        const izq = i % 2 === 0, ang = (izq ? -62 : -118) * Math.PI / 180 + rand(-0.38, 0.38), v = rand(520, 1050);
        extras.push({ x: izq ? W * 0.04 : W * 0.96, y: H + 10, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, rot: rand(0, 6.28), vr: rand(-9, 9), w: rand(6, 11), h: rand(10, 16), forma: Math.random() < 0.3,
          color: colorConfeti[i % colorConfeti.length], fin: performance.now() + rand(2600, 4000), emoji: emojis && Math.random() < 0.18 ? emojis[Math.floor(Math.random() * emojis.length)] : null });
      }
    };
    const lanzarRafaga = (x, y) => {
      for (let i = 0; i < 14; i++) {
        const a = rand(0, 6.28), v = rand(120, 360);
        extras.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 90, rot: rand(0, 6.28), vr: rand(-8, 8), w: emojis ? rand(7, 11) : rand(4, 8), h: rand(6, 10), forma: Math.random() < 0.5,
          color: emojis ? colorConfeti[i % 4] : PETALOS[i % PETALOS.length], fin: performance.now() + rand(800, 1400), emoji: emojis && i % 3 === 0 ? emojis[i % emojis.length] : null });
      }
    };

    const cuadro = t => {
      if (!vivo) return;
      raf = requestAnimationFrame(cuadro);
      const dt = Math.min(0.05, (t - (ultimo || t)) / 1000); ultimo = t;
      if (document.hidden) return;
      // si el equipo va justo, se reducen las partículas (una sola vez por tramo)
      frames++; acum += dt;
      if (frames >= 90) { if (acum / frames > 0.026 && parts.length > 6 && lentos < 3) { parts.length = Math.round(parts.length * 0.65); lentos++; } frames = 0; acum = 0; }
      ctx.clearRect(0, 0, W, H);
      for (const p of parts) {
        p.fase += dt * (0.7 + p.z * 0.5); p.giro += p.vg * dt;
        p.x += (p.vx + Math.sin(p.fase) * 20 * p.z) * dt; p.y += p.vy * dt;
        const dx = p.x - puntero.x, dy = p.y - puntero.y, d2 = dx * dx + dy * dy;            // se apartan del cursor
        if (alto && d2 < 16900) { const d = Math.sqrt(d2) || 1, f = (1 - d / 130) * 520 * dt; p.ox += (dx / d) * f; p.oy += (dy / d) * f; }
        p.ox *= 0.94; p.oy *= 0.94;
        if (sube ? p.y < -50 : p.y > H + 50) Object.assign(p, nueva(false));
        if (p.x < -50) p.x = W + 40; else if (p.x > W + 50) p.x = -40;
        ctx.save(); ctx.translate(p.x + p.ox, p.y + p.oy); ctx.rotate(p.giro); ctx.globalAlpha = p.alfa;
        if (p.emoji) { const s = p.tam * 2; ctx.drawImage(sprite(p.emoji), -s / 2, -s / 2, s, s); } else petalo(p);
        ctx.restore();
      }
      const ahora = performance.now();
      extras = extras.filter(e => e.fin > ahora);
      for (const e of extras) {
        e.vy += 860 * dt; e.vx *= 0.992; e.vy *= 0.992; e.x += e.vx * dt; e.y += e.vy * dt; e.rot += e.vr * dt;
        dibujarConfeti(e);
      }
    };
    raf = requestAnimationFrame(cuadro);

    const alMover = e => { puntero.x = e.clientX; puntero.y = e.clientY; };
    const alSalir = () => { puntero.x = puntero.y = -999; };
    const alCelebrar = () => lanzarConfeti();
    const alRafaga = e => lanzarRafaga(e.detail.x, e.detail.y);
    const alVisible = () => { ultimo = 0; };
    window.addEventListener('resize', medir); window.addEventListener('pointermove', alMover, { passive: true }); document.addEventListener('pointerleave', alSalir);
    window.addEventListener('tm-celebrar', alCelebrar); window.addEventListener('tm-rafaga', alRafaga); document.addEventListener('visibilitychange', alVisible);
    return () => {
      vivo = false; cancelAnimationFrame(raf);
      window.removeEventListener('resize', medir); window.removeEventListener('pointermove', alMover); document.removeEventListener('pointerleave', alSalir);
      window.removeEventListener('tm-celebrar', alCelebrar); window.removeEventListener('tm-rafaga', alRafaga); document.removeEventListener('visibilitychange', alVisible);
    };
  }, [nivel, fiesta?.id]);

  // brillo que sigue al cursor (solo con mouse y en el nivel "alto")
  useEffect(() => {
    if (nivel !== 'alto' || !aura.current || !matchMedia('(pointer: fine)').matches) return undefined;
    const el = aura.current; let tx = -400, ty = -400, x = -400, y = -400, raf = 0, vivo = true;
    const alMover = e => { tx = e.clientX; ty = e.clientY; el.style.opacity = '1'; };
    const alSalir = () => { el.style.opacity = '0'; };
    let previo = 0;
    const bucle = t => { if (!vivo) return; const dt = Math.min(0.12, (t - (previo || t)) / 1000); previo = t; const k = 1 - Math.exp(-dt / 0.09); x += (tx - x) * k; y += (ty - y) * k; el.style.transform = `translate3d(${x - 190}px, ${y - 190}px, 0)`; raf = requestAnimationFrame(bucle); };
    raf = requestAnimationFrame(bucle);
    window.addEventListener('pointermove', alMover, { passive: true }); document.addEventListener('pointerleave', alSalir);
    return () => { vivo = false; cancelAnimationFrame(raf); window.removeEventListener('pointermove', alMover); document.removeEventListener('pointerleave', alSalir); };
  }, [nivel]);

  if (nivel === 'apagado') return null;
  return (
    <>
      <div className="aurora" aria-hidden="true"><i></i></div>
      <canvas ref={cv} className="ambiente-canvas" aria-hidden="true" />
      {nivel === 'alto' && <div ref={aura} className="aura-cursor" aria-hidden="true" />}
    </>
  );
}
