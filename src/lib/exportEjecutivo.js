/** DESCARGAR EL RESUMEN EJECUTIVO — infraestructura: lo que se ve en pantalla, completo, como PNG o PDF (sin animaciones a medias). */
import { exportarElemento } from './exportarElemento';

export async function exportarEjecutivo(nodo, nombreBase, formato = 'png') {
  nodo.classList.add('ej-captura');                                          // ancho fijo de "correo", todo desplegado y sin animaciones
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  try { await exportarElemento(nodo, nombreBase, formato, '#ffffff', { anchoMinimo: 0, relleno: 0 }); /* ancho exacto de un correo, sin márgenes sobrantes */ }
  finally { nodo.classList.remove('ej-captura'); }
}
