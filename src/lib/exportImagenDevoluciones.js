/** IMÁGENES DE DEVOLUCIONES — infraestructura: captura el HTML (armado en devolucionesImagen.js) y lo descarga como PNG. */
import { htmlImagenTop5, htmlImagenPorCausa, nombreArchivoImagen } from './devolucionesImagen';
import { logoBase64 } from './logoBase64';
import { ESTILO_FOTO } from './imagenBase';
import { descargarBlob } from './descargas';

async function generarPng(html, ancho = 1120) {
  const { default: html2canvas } = await import('html2canvas');
  const c = document.createElement('div');
  c.style.cssText = `position:fixed;left:-99999px;top:0;width:${ancho}px;${ESTILO_FOTO}`;
  c.innerHTML = html; document.body.appendChild(c);
  try {
    if (document.fonts?.ready) await document.fonts.ready;
    const canvas = await html2canvas(c, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
    const blob = await new Promise(ok => canvas.toBlob(ok, 'image/png'));
    return { blob, ancho: canvas.width, alto: canvas.height };
  } finally { c.remove(); }
}
async function descargar(html, nombre) {
  const r = await generarPng(html);
  descargarBlob(r.blob, nombre);
  return { nombre, ancho: r.ancho, alto: r.alto };
}

/** datos: { periodo, periodoNombre, desde, hasta, rango, mas, menos, personasConDevoluciones, minDias, grafico } */
export async function exportarImagenTop5(d) {
  const html = htmlImagenTop5({ ...d, generado: new Date().toLocaleString('es-CO'), logo: await logoBase64() });
  return descargar(html, nombreArchivoImagen('top5', d.periodo, d.desde, d.hasta));
}
/** datos: { modo, periodo, periodoNombre, desde, hasta, rango, causas } con causas[].personas = [{ codigo, nombre, cantidad }] */
export async function exportarImagenPorCausa(d) {
  const html = htmlImagenPorCausa({ ...d, generado: new Date().toLocaleString('es-CO'), logo: await logoBase64() });
  return descargar(html, nombreArchivoImagen('por_causa', d.periodo, d.desde, d.hasta, d.modo && d.modo !== 'codigo' ? d.modo : ''));
}

/** El HTML de cada foto (el mismo que se descarga) para mostrarlo como vista previa en la app. */
export async function htmlTop5Vista(d) { return htmlImagenTop5({ ...d, generado: new Date().toLocaleString('es-CO'), logo: await logoBase64() }); }
export async function htmlPorCausaVista(d) { return htmlImagenPorCausa({ ...d, generado: new Date().toLocaleString('es-CO'), logo: await logoBase64() }); }
