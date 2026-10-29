import webpush from 'web-push';
import { prepararRespuesta, origenValido, excedeTasa, extraerToken, crearClienteAdmin, cuerpoObjeto } from './_comun.js';
import { procesarAviso } from './_push.js';

// Se llama justo después de una carga (turno, clasificación, histórico): guarda el aviso para la campana y lo manda fuera de la app a quien corresponda.
export default async function handler(req, res) {
  prepararRespuesta(res);
  try {
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Método no permitido' }); }
    if (!origenValido(req)) return res.status(403).json({ error: 'Origen no permitido.' });
    if (excedeTasa(req, 'notificar', 60)) return res.status(429).json({ error: 'Demasiadas solicitudes. Espera un minuto.' });
    const admin = crearClienteAdmin();
    if (!admin) return res.status(200).json({ ok: true, omitido: true });                     // sin configurar: la carga no se estorba
    const pub = process.env.VITE_VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY, asunto = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';
    let enviar = null;
    if (pub && priv) { webpush.setVapidDetails(asunto, pub, priv); enviar = (sub, carga) => webpush.sendNotification(sub, carga, { TTL: 6 * 3600, urgency: 'high' }); }
    const r = await procesarAviso({ admin, enviar, token: extraerToken(req), cuerpo: cuerpoObjeto(req) });
    const { status, ...resto } = r;
    return res.status(status).json(resto);
  } catch (e) {
    console.error('notificar:', e?.message || e);
    return res.status(500).json({ error: 'No se pudo enviar el aviso.' });
  }
}
