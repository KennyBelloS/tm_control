/* Lee el Excel de devoluciones en un hilo aparte: tarda unos segundos y así la pantalla no se congela. */
import { parsearDevoluciones } from './devolucionesExcel.js';

self.onmessage = e => {
  try {
    self.postMessage({ ok: true, resultado: parsearDevoluciones(e.data.buffer, e.data.hoy) });
  } catch (err) {
    self.postMessage({ ok: false, error: err?.message || 'No se pudo leer el Excel.' });
  }
};
