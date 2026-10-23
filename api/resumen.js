import { prepararRespuesta, origenValido, excedeTasa, crearClienteAdmin, exigirAdministrador, cuerpoObjeto } from './_comun.js';
import { crearServicio } from './_envios.js';

/** ENVÍO MANUAL de un resumen por WhatsApp (solo administradores): POST { destinoId, desde, hasta } → lo envía ahora y devuelve el estado. */
export default async function handler(req, res) {
  prepararRespuesta(res);
  try {
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Método no permitido' }); }
    if (!origenValido(req)) return res.status(403).json({ error: 'Origen no permitido.' });
    if (excedeTasa(req, 'resumen', 10)) return res.status(429).json({ error: 'Demasiadas solicitudes. Espera un minuto.' });
    const admin = crearClienteAdmin();
    if (!admin) return res.status(500).json({ error: 'Falta configurar SUPABASE_SERVICE_ROLE_KEY en Vercel.' });
    const auth = await exigirAdministrador(req, admin);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
    const b = cuerpoObjeto(req); const fecha = /^\d{4}-\d{2}-\d{2}$/;
    if (!b || !Number.isInteger(b.destinoId) || !fecha.test(String(b.desde)) || !fecha.test(String(b.hasta)) || b.desde > b.hasta) return res.status(400).json({ error: 'Datos inválidos.' });
    const { data, error } = await admin.from('resumen_envios').upsert({ destino_id: b.destinoId, frecuencia: 'manual', desde: b.desde, hasta: b.hasta, programado_para: new Date().toISOString(), estado: 'aviso', detalle: { manual: true } }, { onConflict: 'destino_id,frecuencia,desde' }).select('*').single();
    if (error || !data) return res.status(400).json({ error: 'No se pudo preparar el envío.' });
    const estado = await crearServicio({ cliente: admin }).enviarUno(data);
    const { data: final } = await admin.from('resumen_envios').select('estado, detalle').eq('id', data.id).single();
    return res.status(200).json({ estado, detalle: final?.detalle?.error ? { error: final.detalle.error } : {} });
  } catch (e) {
    console.error('resumen:', e);
    return res.status(500).json({ error: 'Error inesperado del servidor.' });
  }
}
