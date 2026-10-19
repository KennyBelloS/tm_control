import { useEffect, useState } from 'react';

/**
 * Qué período de devoluciones se muestra en Líneas y en el Dashboard: "dia" (por defecto), "semana" o "mes".
 * Se recuerda en el navegador y se comparte entre pantallas. Por defecto SOLO se ve el día: la semana y el mes van aparte.
 */
const CLAVE = 'tm_dev_periodo';
const VALIDOS = ['dia', 'semana', 'mes'];
export const leerPeriodoDev = () => { try { const v = localStorage.getItem(CLAVE); return VALIDOS.includes(v) ? v : 'dia'; } catch { return 'dia'; } };

export function usePeriodoDev() {
  const [periodo, setPeriodo] = useState(leerPeriodoDev);
  useEffect(() => {
    const alCambiar = e => setPeriodo(e.detail);
    window.addEventListener('tm-periodo-dev', alCambiar);
    return () => window.removeEventListener('tm-periodo-dev', alCambiar);
  }, []);
  const cambiar = v => {
    if (!VALIDOS.includes(v)) return;
    try { localStorage.setItem(CLAVE, v); } catch { /* sin almacenamiento */ }
    setPeriodo(v);
    window.dispatchEvent(new CustomEvent('tm-periodo-dev', { detail: v }));
  };
  return [periodo, cambiar];
}

/**
 * Columnas EXTRA del Tablero de Formadoras. El Tablero siempre muestra las devoluciones del DÍA; aquí se elige si, además,
 * se quieren ver las de la SEMANA y/o las del MES (cada una se activa por separado y pueden verse las dos a la vez).
 */
const CLAVE_TAB = 'tm_dev_tablero';
const leerExtras = () => { try { const j = JSON.parse(localStorage.getItem(CLAVE_TAB)); return { semana: !!j?.semana, mes: !!j?.mes }; } catch { return { semana: false, mes: false }; } };
export function useExtrasTablero() {
  const [extras, setExtras] = useState(leerExtras);
  const cambiar = nuevo => {
    const v = { semana: !!nuevo.semana, mes: !!nuevo.mes };
    try { localStorage.setItem(CLAVE_TAB, JSON.stringify(v)); } catch { /* sin almacenamiento */ }
    setExtras(v);
  };
  return [extras, cambiar];
}

/**
 * "Mostrar colaborador por": Código, Nombre o Ambos (igual que el selector del Excel). Se recuerda en el navegador.
 */
const CLAVE_MOSTRAR = 'tm_dev_mostrar';
const MODOS = ['codigo', 'nombre', 'ambos'];
const leerModo = () => { try { const v = localStorage.getItem(CLAVE_MOSTRAR); return MODOS.includes(v) ? v : 'ambos'; } catch { return 'ambos'; } };
export function useMostrarColaborador() {
  const [modo, setModo] = useState(leerModo);
  const cambiar = v => { if (!MODOS.includes(v)) return; try { localStorage.setItem(CLAVE_MOSTRAR, v); } catch { /* sin almacenamiento */ } setModo(v); };
  return [modo, cambiar];
}
