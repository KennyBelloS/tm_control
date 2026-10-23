/** RESÚMENES — infraestructura del navegador: lee los datos con la sesión y arma el resumen con las reglas puras. */
import { supabase } from './supabaseClient';
import { cargarDatos } from './resumenCarga';
import { periodoPrevio, calcularResumen, comparar, insights, textoResumen } from './resumenGeneral';
import { svgResumen } from './resumenImagen';
import { logoBase64 } from './logoBase64';

export async function listarFormadoras() { const r = await supabase.from('formadoras').select('id, nombre').order('nombre'); return r.error ? [] : r.data || []; }

/** destino: null = general de la finca · { formadora_id, nombre } = equipo de una formadora. */
export async function armarResumenPantalla({ destino, periodo, remitente, finca }) {
  const datos = await cargarDatos(supabase, { desde: periodoPrevio(periodo).desde, hasta: periodo.hasta });
  const dest = destino ? { tipo: 'formadora', formadoraId: destino.formadora_id, nombre: datos.formadoras.get(destino.formadora_id) || destino.nombre } : { tipo: 'general' };
  const r = calcularResumen(datos, periodo, dest), c = comparar(r, calcularResumen(datos, periodoPrevio(periodo), dest)), frases = insights(r, c);
  const generado = new Date().toLocaleString('es-CO', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  const para = destino?.nombre;
  const { svg, ancho, alto } = svgResumen({ r, c, frases, para, remitente, finca, generado, logo: await logoBase64() });
  return { r, c, frases, svg, ancho, alto, texto: textoResumen(r, c, { para, remitente, finca, generado }) };
}
