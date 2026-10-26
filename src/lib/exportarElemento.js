/**
 * Descarga como PNG o PDF lo que se ve en pantalla en un bloque, COMPLETO.
 *
 * Por qué una copia: si el bloque tiene una tabla ancha dentro de un contenedor con
 * scroll horizontal (o un ancho fijo), una captura directa solo "ve" la parte visible
 * y corta los costados. Aquí se hace una copia fuera de pantalla con el ancho que
 * realmente necesita el contenido, con margen alrededor (para que no se corten
 * sombras ni bordes), y de esa copia sale la imagen.
 */
import { descargarBlob } from './descargas';

export async function capturarElemento(nodo, fondo = '#ffffff', { anchoMinimo = 900, relleno = 28 } = {}) {
  if (!nodo) throw new Error('No hay nada para descargar todavía.');
  const { default: html2canvas } = await import('html2canvas');

  const envoltura = document.createElement('div');
  Object.assign(envoltura.style, {
    position: 'fixed', left: '-100000px', top: '0', zIndex: '-1', pointerEvents: 'none',
    width: 'max-content', minWidth: `${anchoMinimo}px`, maxWidth: 'none', padding: `${relleno}px`, background: fondo, boxSizing: 'content-box'
  });
  const copia = nodo.cloneNode(true);
  Object.assign(copia.style, { width: 'auto', maxWidth: 'none', minWidth: '0', margin: '0' });
  envoltura.appendChild(copia);
  document.body.appendChild(envoltura);
  // Todo lo que tenía scroll se despliega completo
  envoltura.querySelectorAll('*').forEach(el => {
    const estilo = getComputedStyle(el);
    if (['auto', 'scroll', 'hidden'].includes(estilo.overflowX) && el.scrollWidth > el.clientWidth) el.style.overflowX = 'visible';
    if (['auto', 'scroll'].includes(estilo.overflowY) && el.scrollHeight > el.clientHeight) { el.style.overflowY = 'visible'; el.style.maxHeight = 'none'; }
  });
  if (document.fonts?.ready) await document.fonts.ready;
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  try {
    const ancho = Math.ceil(envoltura.scrollWidth), alto = Math.ceil(envoltura.scrollHeight);
    return await html2canvas(envoltura, {
      backgroundColor: fondo, scale: 2, useCORS: true, logging: false,
      width: ancho, height: alto, windowWidth: ancho + 40, windowHeight: alto + 40, scrollX: 0, scrollY: 0
    });
  } finally {
    envoltura.remove();
  }
}

export async function exportarElemento(nodo, nombreBase, formato = 'png', fondo = '#ffffff', opciones = {}) {
  const canvas = await capturarElemento(nodo, fondo, opciones);
  if (formato === 'pdf') {
    const { default: jsPDF } = await import('jspdf');
    const w = canvas.width / 2, h = canvas.height / 2;
    const pdf = new jsPDF({ orientation: w >= h ? 'l' : 'p', unit: 'pt', format: [w, h] });
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, w, h, undefined, 'FAST');       // JPEG: el mismo PDF pesa ~30 veces menos que con PNG sin comprimir
    pdf.save(`${nombreBase}.pdf`);
    return;
  }
  // Como archivo en memoria (blob): una dirección data: de más de ~2 MB la rechaza Chrome y la descarga fallaría en silencio con imágenes grandes.
  const blob = await new Promise(ok => canvas.toBlob(ok, 'image/png'));
  if (!blob) throw new Error('No se pudo generar la imagen.');
  descargarBlob(blob, `${nombreBase}.png`);
}

/** La foto que se descargaría, lista para mostrarla en pantalla (data-URL del PNG). */
export async function vistaPreviaElemento(nodo, fondo = '#ffffff') {
  return (await capturarElemento(nodo, fondo)).toDataURL('image/png');
}
