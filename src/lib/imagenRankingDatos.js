/** Foto del ranking — arma el HTML con los datos y el logo (sin html2canvas: se usa también para la vista previa en pantalla). */
import { agregarRankingPorPersona } from './calculos';
import { htmlRankingImagen } from './imagenRanking';
import { logoBase64 } from './logoBase64';
import { rangoHoras } from './horario';

export async function htmlRankingParaImagen({ tipo, filas, cfg, fecha, fechaISO = null }) {
  return htmlRankingImagen({ tipo, ranking: agregarRankingPorPersona(filas), metaHora: cfg?.metaHora || 470, horas: rangoHoras(filas, cfg || {}, { fecha: fechaISO, historico: tipo === 'historico' }).texto, fecha, generado: new Date().toLocaleString('es-CO'), logo: await logoBase64() });
}
