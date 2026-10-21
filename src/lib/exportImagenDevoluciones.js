/** IMÁGENES DE DEVOLUCIONES — infraestructura: captura el HTML (armado en devolucionesImagen.js) y lo descarga como PNG. */
import logoUrl from '../assets/logo-icon.png';
import { htmlImagenTop5, htmlImagenPorCausa, nombreArchivoImagen } from './devolucionesImagen';

async function logoBase64() {
  try {
    const blob = await fetch(logoUrl).then(r => r.blob());
    return await new Promise((ok, mal) => { const l = new FileReader(); l.onload = () => ok(l.result); l.onerror = mal; l.readAsDataURL(blob); });
  } catch { return null; }
}

async function descargarComoPng(html, nombreArchivo, ancho = 1120) {
  const { default: html2canvas } = await import('html2canvas');
  const c = document.createElement('div');
  c.style.cssText = `position:fixed;left:-99999px;top:0;width:${ancho}px;background:#fff;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;`;
  c.innerHTML = html; document.body.appendChild(c);
  try {
    if (document.fonts?.ready) await document.fonts.ready;
    const canvas = await html2canvas(c, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
    const a = document.createElement('a'); a.href = canvas.toDataURL('image/png'); a.download = nombreArchivo; document.body.appendChild(a); a.click(); a.remove();
    return { nombre: nombreArchivo, ancho: canvas.width, alto: canvas.height };
  } finally { c.remove(); }
}

/** datos: { periodo, periodoNombre, desde, hasta, rango, mas, menos, personasConDevoluciones, minDias } */
export async function exportarImagenTop5(d) {
  const html = htmlImagenTop5({ ...d, generado: new Date().toLocaleString('es-CO'), logo: await logoBase64() });
  return descargarComoPng(html, nombreArchivoImagen('top5', d.periodo, d.desde, d.hasta));
}
/** datos: { periodo, periodoNombre, desde, hasta, rango, causas } con causas[].personas = [{ codigo, cantidad }] */
export async function exportarImagenPorCausa(d) {
  const html = htmlImagenPorCausa({ ...d, generado: new Date().toLocaleString('es-CO'), logo: await logoBase64() });
  return descargarComoPng(html, nombreArchivoImagen('por_causa', d.periodo, d.desde, d.hasta));
}
