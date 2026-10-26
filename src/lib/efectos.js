import { useEffect, useState } from 'react';
import { fiestaDelDia, fiestaPorId } from './fiestas';
// (copia local: importarla de clasificacionCalculos arrastraba la librería de Excel al arranque)
export function fechaLocalISO(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Efectos visuales y festividades.
 *  - efectos: "alto" (todo), "suave" (pocos pétalos y aurora) o "apagado". Quien pide "reducir movimiento" en su sistema empieza en "apagado".
 *  - activo: ambiente festivo encendido o apagado (apagado por defecto: la app luce como siempre).
 *  - modo: "auto" (la festividad que toca hoy; si hoy no hay ninguna, se ve normal) o "manual" (la que se elija).
 * Todo se guarda en el navegador y se aplica a <html> con atributos que el CSS usa.
 */
const CLAVE = 'tm_efectos';
const reducirMovimiento = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const defecto = () => ({ activo: false, modo: 'auto', tema: 'halloween', efectos: reducirMovimiento() ? 'apagado' : 'alto' });

export function leerAjustesEfectos() {
  try {
    const j = JSON.parse(localStorage.getItem(CLAVE));
    const d = defecto();
    return {
      activo: typeof j?.activo === 'boolean' ? j.activo : d.activo,
      modo: j?.modo === 'manual' ? 'manual' : 'auto',
      tema: fiestaPorId(j?.tema) ? j.tema : d.tema,
      efectos: ['alto', 'suave', 'apagado'].includes(j?.efectos) ? j.efectos : d.efectos
    };
  } catch { return defecto(); }
}

/** La festividad que se ve ahora (o null si el ambiente festivo está apagado o hoy no toca ninguna). */
export function fiestaVigente(a = leerAjustesEfectos(), hoy = fechaLocalISO()) {
  if (!a.activo) return null;
  return a.modo === 'manual' ? fiestaPorId(a.tema) : fiestaDelDia(hoy);
}

/** Pone en <html> los atributos que usa el CSS (data-fiesta, data-efectos) y el adorno del logo. */
export function aplicarAjustesEfectos() {
  const a = leerAjustesEfectos(), f = fiestaVigente(a), h = document.documentElement;
  if (f) { h.dataset.fiesta = f.id; h.style.setProperty('--fiesta-emoji', `"${f.emoji}"`); } else { delete h.dataset.fiesta; h.style.removeProperty('--fiesta-emoji'); }
  h.dataset.efectos = a.efectos;
  window.dispatchEvent(new CustomEvent('tm-efectos', { detail: { ...a, fiesta: f } }));
  return a;
}

export function guardarAjustesEfectos(parcial) {
  const nuevo = { ...leerAjustesEfectos(), ...parcial };
  try { localStorage.setItem(CLAVE, JSON.stringify(nuevo)); } catch { /* sin almacenamiento */ }
  return aplicarAjustesEfectos();
}

/** Para los componentes: { ajustes, fiesta, cambiar(parcial) } y se actualiza solo cuando algo cambia. */
export function useEfectos() {
  const [ajustes, setAjustes] = useState(leerAjustesEfectos);
  useEffect(() => {
    const alCambiar = () => setAjustes(leerAjustesEfectos());
    window.addEventListener('tm-efectos', alCambiar);
    return () => window.removeEventListener('tm-efectos', alCambiar);
  }, []);
  return { ajustes, fiesta: fiestaVigente(ajustes), cambiar: guardarAjustesEfectos };
}

/** Abre el panel de "Efectos y festividades" (desde el menú de la persona, la paleta de comandos, etc.). */
export const abrirPanelEfectos = () => window.dispatchEvent(new Event('tm-abrir-efectos'));
