/** COMPARTIR UNA IMAGEN POR WHATSAPP — infraestructura (navegador). */
export function descargarBlob(blob, nombre) {
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
}
/**
 * En el celular abre la hoja de compartir con la imagen YA adjunta (ahí se elige WhatsApp y el chat).
 * En el computador descarga la imagen y abre WhatsApp con el texto listo (la imagen se adjunta desde lo descargado).
 * Devuelve 'compartido' | 'cancelado' | 'whatsapp-web'.
 */
export async function compartirImagen({ blob, nombre, texto, numero }) {
  try {
    const file = new File([blob], nombre, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], text: texto, title: 'TMControl' }); return 'compartido'; }
  } catch (e) { if (e?.name === 'AbortError') return 'cancelado'; }
  descargarBlob(blob, nombre);
  const tel = numero ? String(numero).replace(/\D/g, '') : '';
  window.open(`https://wa.me/${tel}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
  return 'whatsapp-web';
}
