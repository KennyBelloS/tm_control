/** RESUMEN EN EL SERVIDOR: lee los datos con la llave de servicio, calcula con las MISMAS reglas puras que la app y dibuja la imagen. */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { periodoPrevio, calcularResumen, comparar, insights, textoResumen } from '../src/lib/resumenGeneral.js';
import { svgResumen } from '../src/lib/resumenImagen.js';
import { cargarDatos } from '../src/lib/resumenCarga.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
export const FUENTES = ['DejaVuSans.ttf', 'DejaVuSans-Bold.ttf'].map(f => path.join(dir, '_fuentes', f));

/** Todo lo que necesita un envío: cifras, frases, texto e imagen (SVG). destino: fila de resumen_destinos. */
export async function armarResumen(cliente, { destino, periodo, remitente, finca, generado, maxTexto = null }) {
  const datos = await cargarDatos(cliente, { desde: periodoPrevio(periodo).desde, hasta: periodo.hasta });
  const dest = destino.tipo === 'formadora' ? { tipo: 'formadora', formadoraId: destino.formadora_id, nombre: datos.formadoras.get(destino.formadora_id) || destino.nombre } : { tipo: 'general' };
  const r = calcularResumen(datos, periodo, dest), c = comparar(r, calcularResumen(datos, periodoPrevio(periodo), dest)), frases = insights(r, c);
  const { svg, ancho, alto } = svgResumen({ r, c, frases, para: destino.nombre, remitente, finca, generado });
  return { r, c, frases, texto: textoResumen(r, c, { para: destino.nombre, remitente, finca, generado, max: maxTexto }), svg, ancho, alto };
}

export function renderPng(svg, ancho = 1080) {
  return Buffer.from(new Resvg(svg, { fitTo: { mode: 'width', value: ancho }, font: { fontFiles: FUENTES, loadSystemFonts: false, defaultFontFamily: 'DejaVu Sans' } }).render().asPng());
}
