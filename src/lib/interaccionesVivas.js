import { rafaga, celebrar } from './confeti';

/**
 * Interacciones que dan "peso" a la interfaz (solo con mouse y con los efectos en "alto"):
 *  - las tarjetas de indicadores se inclinan en 3D hacia el cursor;
 *  - los botones principales son magnéticos (se acercan un poquito al cursor);
 *  - al tocar un botón principal sale una ráfaga de pétalos/confeti;
 *  - tocar 3 veces seguidas el logo lanza una celebración (un guiño escondido).
 */
const OBJETIVOS_INCLINAR = '.cards > .card, .colab-kpi, .dev-kpi, [data-inclinar]';
const MAGNETICOS = '.btn-primary:not(:disabled)';

export function activarInteraccionesVivas() {
  const fino = typeof matchMedia === 'function' && matchMedia('(pointer: fine)').matches;
  const alto = () => document.documentElement.dataset.efectos === 'alto';
  let inclinada = null, ultimo = null, raf = 0, bucleMagnetos = 0;
  const magnetos = new Map();                      // botón → { x, y, tx, ty }

  const soltarInclinada = () => {
    if (!inclinada) return;
    inclinada.classList.remove('inclinando'); inclinada.style.removeProperty('--rx'); inclinada.style.removeProperty('--ry');
    inclinada = null;
  };
  let tPrevio = 0;
  const correrMagnetos = (t = performance.now()) => {
    bucleMagnetos = 0; let mueve = false;
    const dt = Math.min(0.12, Math.max(0.001, (t - (tPrevio || t - 16)) / 1000)); tPrevio = t;
    const k = 1 - Math.exp(-dt / 0.07);            // suavizado por TIEMPO (no por cuadro): se ve igual en equipos lentos y rápidos
    for (const [el, m] of magnetos) {
      m.x += (m.tx - m.x) * k; m.y += (m.ty - m.y) * k;
      if (Math.abs(m.x) < 0.08 && Math.abs(m.y) < 0.08 && m.tx === 0 && m.ty === 0) { el.style.translate = ''; magnetos.delete(el); continue; }
      el.style.translate = `${m.x.toFixed(2)}px ${m.y.toFixed(2)}px`; mueve = true;
    }
    if (mueve) bucleMagnetos = requestAnimationFrame(correrMagnetos);
  };
  const aflojarMagnetos = except => { for (const [el, m] of magnetos) if (el !== except) { m.tx = 0; m.ty = 0; } if (!bucleMagnetos && magnetos.size) bucleMagnetos = requestAnimationFrame(correrMagnetos); };

  const procesar = () => {
    raf = 0; const e = ultimo; if (!e) return;
    const t = e.target.closest?.(OBJETIVOS_INCLINAR);
    if (t !== inclinada) { soltarInclinada(); inclinada = t; if (t) t.classList.add('inclinando'); }
    if (t) {
      const r = t.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      t.style.setProperty('--rx', (-py * 9).toFixed(2)); t.style.setProperty('--ry', (px * 11).toFixed(2));
    }
    const b = e.target.closest?.(MAGNETICOS);
    aflojarMagnetos(b);
    if (b) {
      const r = b.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const m = magnetos.get(b) || { x: 0, y: 0, tx: 0, ty: 0 };
      m.tx = Math.max(-7, Math.min(7, dx * 0.2)); m.ty = Math.max(-5, Math.min(5, dy * 0.25)); magnetos.set(b, m);
      if (!bucleMagnetos) bucleMagnetos = requestAnimationFrame(correrMagnetos);
    }
  };
  const alMover = e => {
    if (!fino) return;
    if (!alto()) { soltarInclinada(); aflojarMagnetos(null); return; }
    ultimo = e; if (!raf) raf = requestAnimationFrame(procesar);
  };
  const alSalir = () => { soltarInclinada(); aflojarMagnetos(null); };

  let toquesLogo = [];
  const alClic = e => {
    const logo = e.target.closest?.('.sidebar .logo img');
    if (logo) {
      const t = Date.now(); toquesLogo = [...toquesLogo.filter(x => t - x < 1400), t];
      if (toquesLogo.length >= 3) { toquesLogo = []; celebrar(); }
      return;
    }
    if (alto() && e.target.closest?.('.btn-primary, [data-celebrar]')) rafaga(e.clientX, e.clientY);
  };

  document.addEventListener('pointermove', alMover, { passive: true });
  document.addEventListener('pointerleave', alSalir);
  document.addEventListener('click', alClic);
  return () => {
    document.removeEventListener('pointermove', alMover); document.removeEventListener('pointerleave', alSalir); document.removeEventListener('click', alClic);
    cancelAnimationFrame(raf); cancelAnimationFrame(bucleMagnetos); soltarInclinada();
    for (const el of magnetos.keys()) el.style.translate = '';
  };
}
