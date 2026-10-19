/** Avisos flotantes (toasts) de la app. Uso: avisar('Guardado'), avisar('Algo falló', 'error'). */
export function avisar(texto, tipo = 'ok') {
  window.dispatchEvent(new CustomEvent('tm-aviso', { detail: { texto: String(texto), tipo } }));
}
/** Copia un texto al portapapeles (con respaldo para navegadores sin permiso) y avisa. */
export async function copiarTexto(texto, aviso) {
  try {
    await navigator.clipboard.writeText(texto);
  } catch {
    const t = document.createElement('textarea');
    t.value = texto; t.style.position = 'fixed'; t.style.opacity = '0';
    document.body.appendChild(t); t.select();
    try { document.execCommand('copy'); } finally { t.remove(); }
  }
  avisar(aviso || `Copiado: ${texto}`);
}
