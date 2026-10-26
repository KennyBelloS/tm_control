import html2canvas from 'html2canvas';
import { htmlRankingParaImagen } from './imagenRankingDatos';
import { ESTILO_FOTO } from './imagenBase';
import { descargarBlob } from './descargas';

const ESTILO = `position:fixed;left:-9999px;top:0;min-width:1120px;width:max-content;${ESTILO_FOTO}`;
export async function exportarImagenProfesional({ tipo, filas, cfg, fecha, formato = 'png' }) {
  const contenedor = document.createElement('div');
  contenedor.style.cssText = ESTILO;
  contenedor.innerHTML = await htmlRankingParaImagen({ tipo, filas, cfg, fecha });
  document.body.appendChild(contenedor);
  try {
    const canvas = await html2canvas(contenedor, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
    const blob = await new Promise(ok => canvas.toBlob(ok, formato === 'jpg' ? 'image/jpeg' : 'image/png', 0.95));   // blob: sin el límite de ~2 MB de las direcciones data:
    if (!blob) throw new Error('No se pudo generar la imagen.');
    descargarBlob(blob, `torremolinos_ranking_${fecha || 'reporte'}.${formato}`);
  } finally { document.body.removeChild(contenedor); }
}
