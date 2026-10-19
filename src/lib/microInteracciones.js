/**
 * Micro-interacciones globales (sin dependencias, sin tocar la lógica de ninguna pantalla):
 *  1) La barra superior gana sombra y filo cuando la página se desplaza (la clase "elevado").
 *  2) Los botones principales y secundarios sueltan un pulso de luz en el punto exacto donde se toca.
 * Devuelve una función para desmontar todo (se usa desde el Layout).
 */
import { copiarTexto } from './avisos';

export function activarMicroInteracciones() {
  let pendiente = false;
  const alDesplazar = () => {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(() => {
      pendiente = false;
      const elevar = window.scrollY > 6;
      document.querySelectorAll('.topbar').forEach(t => t.classList.toggle('elevado', elevar));
    });
  };
  const alTocar = e => {
    const boton = e.target.closest?.('.btn-primary, .btn-secondary');
    if (!boton || boton.disabled) return;
    const r = boton.getBoundingClientRect();
    boton.style.setProperty('--rx', `${e.clientX - r.left}px`);
    boton.style.setProperty('--ry', `${e.clientY - r.top}px`);
    boton.classList.remove('pulso');
    void boton.offsetWidth;                       // reinicia la animación aunque se toque muy seguido
    boton.classList.add('pulso');
    setTimeout(() => boton.classList.remove('pulso'), 560);
  };
  // Controles segmentados (.fuente-toggle): una pastilla se DESLIZA hasta la opción elegida.
  // Solo se escriben variables CSS en el contenedor; los botones que dibuja React no se tocan.
  let medirPendiente = false;
  const colocarPastillas = () => {
    medirPendiente = false;
    document.querySelectorAll('.fuente-toggle').forEach(grupo => {
      const activo = grupo.querySelector('button.activo');
      if (!activo || !activo.offsetWidth) return;
      grupo.style.setProperty('--thumb-x', `${activo.offsetLeft}px`);
      grupo.style.setProperty('--thumb-y', `${activo.offsetTop}px`);
      grupo.style.setProperty('--thumb-w', `${activo.offsetWidth}px`);
      grupo.style.setProperty('--thumb-h', `${activo.offsetHeight}px`);
      grupo.classList.add('con-thumb');
    });
  };
  const pedirPastillas = () => { if (!medirPendiente) { medirPendiente = true; requestAnimationFrame(colocarPastillas); } };
  const observador = new MutationObserver(pedirPastillas);
  observador.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
  window.addEventListener('resize', pedirPastillas);
  pedirPastillas();
  // Avisos flotantes: se acomodan justo DEBAJO de la barra superior (aunque esta se vaya al desplazarse en el celular)
  const ubicarAvisos = () => {
    const t = document.querySelector('.topbar');
    document.documentElement.style.setProperty('--aviso-top', `${t ? Math.max(0, Math.round(t.getBoundingClientRect().bottom)) : 0}px`);
  };
  const alMover = () => { alDesplazar(); ubicarAvisos(); };
  // Clic en un código copiable: se copia y se avisa. Clic en una fila de una tabla: se marca (para no perder la línea al leer tablas anchas).
  const alClicar = e => {
    const cod = e.target.closest?.('[data-copiar]');
    if (cod && cod.dataset.copiar) { copiarTexto(cod.dataset.copiar, `Código ${cod.dataset.copiar} copiado`); return; }
    const td = e.target.closest?.('tbody td');
    if (!td || e.target.closest('button, a, input, select, textarea, label, summary')) return;
    const tr = td.parentElement;
    if (tr.classList.contains('fila-esqueleto') || tr.classList.contains('fila-clic')) return;
    tr.classList.toggle('fila-marcada');
  };
  document.addEventListener('click', alClicar);
  window.addEventListener('resize', ubicarAvisos);
  ubicarAvisos();
  window.addEventListener('scroll', alMover, { passive: true });
  document.addEventListener('pointerdown', alTocar, { passive: true });
  alDesplazar();
  return () => {
    observador.disconnect();
    window.removeEventListener('resize', pedirPastillas);
    window.removeEventListener('scroll', alMover);
    window.removeEventListener('resize', ubicarAvisos);
    document.removeEventListener('click', alClicar);
    document.removeEventListener('pointerdown', alTocar);
  };
}
