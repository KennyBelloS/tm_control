/**
 * ADAPTADOR DE WHATSAPP (WhatsApp Business Cloud API de Meta). Solo habla HTTP; no sabe nada del resumen.
 * Un mensaje que ENVÍA LA EMPRESA primero (sin que la persona haya escrito en las últimas 24 h) debe ser una PLANTILLA aprobada por Meta.
 * La plantilla necesaria está descrita en docs/WHATSAPP.md: encabezado con IMAGEN y un cuerpo con una sola variable {{1}}.
 */
export const configuracionWhatsapp = (env = process.env) => ({ token: env.WHATSAPP_TOKEN || '', phoneId: env.WHATSAPP_PHONE_ID || '', plantilla: env.WHATSAPP_PLANTILLA || 'resumen_tmcontrol', idioma: env.WHATSAPP_IDIOMA || 'es', version: env.WHATSAPP_VERSION || 'v20.0' });
export const whatsappConfigurado = c => !!(c.token && c.phoneId);

/** Solo dígitos; un celular colombiano de 10 dígitos (3xx…) recibe el indicativo 57. */
export function normalizarNumero(n) { let d = String(n || '').replace(/\D/g, ''); if (/^3\d{9}$/.test(d)) d = `57${d}`; return d; }
/** Las variables de una plantilla no admiten saltos de línea, tabulaciones ni más de 4 espacios seguidos. */
export function textoParaPlantilla(t, max = 900) { return String(t || '').replace(/[*_~`]/g, '').replace(/\r?\n+/g, ' | ').replace(/\t/g, ' ').replace(/ {2,}/g, ' ').trim().slice(0, max); }

async function leerJson(r) { try { return await r.json(); } catch { return null; } }
const errorSeguro = (j, que) => new Error(j?.error?.message ? `WhatsApp rechazó ${que}: ${String(j.error.message).slice(0, 200)}` : `WhatsApp no respondió bien al ${que}.`);   // nunca incluye el token

/** Sube la imagen y envía la plantilla con la imagen en el encabezado y el texto en el cuerpo. Devuelve el id del mensaje. */
export async function enviarResumenWhatsapp({ cfg, numero, png, texto, fetchFn = globalThis.fetch }) {
  const base = `https://graph.facebook.com/${cfg.version}/${cfg.phoneId}`, auth = { Authorization: `Bearer ${cfg.token}` };
  const form = new FormData();
  form.append('messaging_product', 'whatsapp'); form.append('type', 'image/png');
  form.append('file', new Blob([png], { type: 'image/png' }), 'resumen.png');
  const r1 = await fetchFn(`${base}/media`, { method: 'POST', headers: auth, body: form });
  const j1 = await leerJson(r1);
  if (!r1.ok || !j1?.id) throw errorSeguro(j1, 'la imagen');
  const r2 = await fetchFn(`${base}/messages`, {
    method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: normalizarNumero(numero), type: 'template', template: { name: cfg.plantilla, language: { code: cfg.idioma }, components: [
      { type: 'header', parameters: [{ type: 'image', image: { id: j1.id } }] },
      { type: 'body', parameters: [{ type: 'text', text: textoParaPlantilla(texto) }] }] } })
  });
  const j2 = await leerJson(r2);
  if (!r2.ok || !j2?.messages?.[0]?.id) throw errorSeguro(j2, 'el mensaje');
  return j2.messages[0].id;
}
