/**
 * SERVICIO DE ENVÍOS: programa los resúmenes del día, los envía y hace la copia mensual. Todo con dependencias inyectadas (cliente, fetch, reloj,
 * dibujo de la imagen) para poder probarlo sin WhatsApp ni base de datos reales.
 */
import { periodoResumen } from '../src/lib/resumenGeneral.js';
import { debeRespaldoMensual } from '../src/lib/respaldoBD.js';
import { armarResumen, renderPng } from './_resumenServidor.js';
import { configuracionWhatsapp, whatsappConfigurado, enviarResumenWhatsapp } from './_whatsapp.js';
import { crearBackupServidor } from './_respaldoServidor.js';

const DESFASE_COLOMBIA_H = 5;                                      // Colombia es UTC−5 todo el año
const ddmm = iso => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const sumarDias = (iso, n) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export function crearServicio({ cliente, env = process.env, fetchFn = globalThis.fetch, ahora = () => new Date(), png = renderPng, respaldo = crearBackupServidor }) {
  const local = () => new Date(ahora().getTime() - DESFASE_COLOMBIA_H * 3600e3);
  const hoyISO = () => local().toISOString().slice(0, 10);
  const generado = () => { const l = local(), h = l.getUTCHours(), m = String(l.getUTCMinutes()).padStart(2, '0'); return `${DIAS[l.getUTCDay()]} ${ddmm(hoyISO())}/${hoyISO().slice(0, 4)}, ${h % 12 || 12}:${m} ${h < 12 ? 'a. m.' : 'p. m.'}`; };

  async function configuracion() {
    const { data } = await cliente.from('resumen_config').select('*').eq('id', 1).maybeSingle();
    return { remitente: data?.remitente || '', finca: data?.finca || 'Finca Torremolinos', avisoPrevio: data?.aviso_previo !== false };
  }
  /** Fase "aviso" (8:00): deja programados los envíos de hoy en estado "aviso", para que se puedan revisar y CANCELAR antes de las 9:00. */
  async function programar() {
    const hoy = hoyISO(), dow = local().getUTCDay(), dia = Number(hoy.slice(8)), cfg = await configuracion();
    const { data: destinos, error } = await cliente.from('resumen_destinos').select('*').eq('activo', true);
    if (error) throw new Error(error.message);
    const filas = [];
    for (const d of destinos || []) for (const [freq, toca] of [['semanal', dow === 1 && d.semanal], ['mensual', dia === 1 && d.mensual]]) if (toca) {
      const p = periodoResumen(freq, hoy);
      filas.push({ destino_id: d.id, frecuencia: freq, desde: p.desde, hasta: p.hasta, programado_para: `${hoy}T14:00:00Z`, estado: 'aviso', detalle: { sin_aviso: !cfg.avisoPrevio } });
    }
    if (filas.length) { const r = await cliente.from('resumen_envios').upsert(filas, { onConflict: 'destino_id,frecuencia,desde', ignoreDuplicates: true }); if (r.error) throw new Error(r.error.message); }
    return { programados: filas.length };
  }
  const marcar = (envio, estado, detalle) => cliente.from('resumen_envios').update({ estado, detalle: { ...(envio.detalle || {}), ...detalle } }).eq('id', envio.id);

  /** Envía UN resumen programado. Devuelve el estado final: 'enviado' | 'error' | 'cancelado'. */
  async function enviarUno(envio) {
    const { data: destino } = await cliente.from('resumen_destinos').select('*').eq('id', envio.destino_id).maybeSingle();
    if (!destino || !destino.activo) { await marcar(envio, 'cancelado', { motivo: 'el destinatario está inactivo o ya no existe' }); return 'cancelado'; }
    const cfgW = configuracionWhatsapp(env);
    if (!whatsappConfigurado(cfgW)) { await marcar(envio, 'error', { error: 'WhatsApp no está configurado en el servidor (faltan WHATSAPP_TOKEN y WHATSAPP_PHONE_ID en Vercel).' }); return 'error'; }
    try {
      const cfg = await configuracion();
      const periodo = envio.frecuencia === 'mensual' ? periodoResumen('mensual', sumarDias(envio.hasta, 1))
        : { tipo: 'semanal', desde: envio.desde, hasta: envio.hasta, etiqueta: `${envio.frecuencia === 'manual' ? 'del' : 'semana del'} ${ddmm(envio.desde)} al ${ddmm(envio.hasta)}`, titulo: envio.frecuencia === 'manual' ? 'Resumen' : 'Resumen semanal' };
      const res = await armarResumen(cliente, { destino, periodo, remitente: cfg.remitente, finca: cfg.finca, generado: generado(), maxTexto: 900 });
      const id = await enviarResumenWhatsapp({ cfg: cfgW, numero: destino.numero, png: png(res.svg, res.ancho), texto: res.texto, fetchFn });
      await marcar(envio, 'enviado', { mensaje_id: id, enviado_en: ahora().toISOString(), para: destino.nombre });
      return 'enviado';
    } catch (e) { await marcar(envio, 'error', { error: String(e.message || e).slice(0, 300) }); return 'error'; }
  }
  /** Fase "envío" (9:00): envía todo lo que sigue en "aviso" y ya es la hora (lo cancelado no se envía). */
  async function enviarPendientes() {
    const { data, error } = await cliente.from('resumen_envios').select('*').eq('estado', 'aviso').lte('programado_para', ahora().toISOString());
    if (error) throw new Error(error.message);
    const resultado = { enviados: 0, errores: 0, cancelados: 0 };
    for (const e of data || []) { const s = await enviarUno(e); if (s === 'enviado') resultado.enviados++; else if (s === 'error') resultado.errores++; else resultado.cancelados++; }
    return resultado;
  }
  /** Copia mensual desde el servidor (solo si todavía no hay una de este mes). */
  async function respaldoMensual() {
    const { data } = await cliente.from('respaldo_eventos').select('fecha').eq('accion', 'backup_mensual').order('fecha', { ascending: false }).limit(1);
    if (!debeRespaldoMensual({ hoy: hoyISO(), ultimoAutomatico: data?.[0]?.fecha || null })) return { hecho: false };
    return { hecho: true, ...(await respaldo(cliente, hoyISO())) };
  }
  return { programar, enviarUno, enviarPendientes, respaldoMensual, configuracion, hoyISO };
}
