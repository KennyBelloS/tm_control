/** Resumen — infraestructura del NAVEGADOR: convierte el SVG (armado en resumenImagen.js) a PNG con un canvas. */
import { COLOR_FONDO } from './resumenImagen';

/** Navegador: convierte el SVG a PNG con un canvas (2× para que se vea nítido en el celular). */
export async function svgAPngNavegador(svg, ancho, alto, escala = 2) {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = await new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => mal(new Error('No se pudo dibujar la imagen.')); i.src = url; });
    const cv = document.createElement('canvas'); cv.width = ancho * escala; cv.height = alto * escala;
    const g = cv.getContext('2d'); g.fillStyle = COLOR_FONDO; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(img, 0, 0, cv.width, cv.height);
    return await new Promise(ok => cv.toBlob(ok, 'image/png'));
  } finally { URL.revokeObjectURL(url); }
}
