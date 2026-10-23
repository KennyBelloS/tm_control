import html2canvas from 'html2canvas';
import { htmlRankingParaImagen } from './imagenRankingDatos';
import { ESTILO_FOTO } from './imagenBase';

const ESTILO = `position:fixed;left:-9999px;top:0;min-width:1120px;width:max-content;${ESTILO_FOTO}`;
export async function exportarImagenProfesional({ tipo, filas, cfg, fecha, formato = 'png' }) {
  const contenedor = document.createElement('div');
  contenedor.style.cssText = ESTILO;
  contenedor.innerHTML = await htmlRankingParaImagen({ tipo, filas, cfg, fecha });
  document.body.appendChild(contenedor);
  try {
    const canvas = await html2canvas(contenedor, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
    const a = document.createElement('a');
    a.href = canvas.toDataURL(formato === 'jpg' ? 'image/jpeg' : 'image/png', 0.95);
    a.download = `torremolinos_ranking_${fecha || 'reporte'}.${formato}`;
    document.body.appendChild(a); a.click(); a.remove();
  } finally { document.body.removeChild(contenedor); }
}
