import { crearClienteAdmin } from './_comun.js';
import { respaldoMensual } from './_respaldoServidor.js';

/**
 * TAREA PROGRAMADA (Vercel Cron, vercel.json): una vez al día, 9:00 a. m. de Colombia. Hace la copia mensual de la base de datos
 * (solo si todavía no hay una de este mes), aunque nadie abra la app.
 * Vercel manda "Authorization: Bearer <CRON_SECRET>"; sin ese secreto configurado o con otro valor, no se ejecuta nada.
 */
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const secreto = process.env.CRON_SECRET;
    if (!secreto) return res.status(500).json({ error: 'Falta configurar CRON_SECRET en Vercel.' });
    if (req.headers.authorization !== `Bearer ${secreto}`) return res.status(401).json({ error: 'No autorizado.' });
    const cliente = crearClienteAdmin();
    if (!cliente) return res.status(500).json({ error: 'Falta configurar SUPABASE_SERVICE_ROLE_KEY en Vercel.' });
    let respaldo; try { respaldo = await respaldoMensual(cliente); } catch (e) { console.error('respaldo mensual:', e); respaldo = { hecho: false, error: 'No se pudo hacer la copia mensual.' }; }
    return res.status(200).json({ respaldo });
  } catch (e) {
    console.error('cron-diario:', e);
    return res.status(500).json({ error: 'Error inesperado del servidor.' });
  }
}
