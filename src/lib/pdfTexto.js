/** PDF → renglones de texto — infraestructura: lee el PDF en el navegador (el lector se carga solo cuando se elige un PDF). */
import { agruparLineas } from './personasPdf';

export async function validarArchivoPdf(file) {
  if (!file) throw new Error('No se eligió ningún archivo.');
  if (file.size > 15 * 1024 * 1024) throw new Error('El PDF pesa más de 15 MB.');
  const cab = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  if (String.fromCharCode(...cab) !== '%PDF-') throw new Error('Ese archivo no es un PDF válido.');
}

export async function extraerLineasPdf(arrayBuffer) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.min.mjs');
  const worker = (await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer), isEvalSupported: false }).promise;
  const lineas = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const tc = await (await doc.getPage(p)).getTextContent();
    lineas.push(...agruparLineas(tc.items.filter(i => 'str' in i).map(i => ({ str: i.str, x: i.transform[4], y: i.transform[5] }))));
  }
  return lineas;
}
