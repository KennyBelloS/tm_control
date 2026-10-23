/** DESCARGAR UN ARCHIVO GENERADO EN EL NAVEGADOR — infraestructura. */
export function descargarBlob(blob, nombre) {
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
}
