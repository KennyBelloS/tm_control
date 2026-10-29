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
    if (!secreto) { console.error('Falta configurar CRON_SECRET.'); return res.status(500).json({ error: 'Las tareas automáticas todavía no están configuradas en el servidor.' }); }
    if (req.headers.authorization !== `Bearer ${secreto}`) return res.status(401).json({ error: 'No autorizado.' });
    const cliente = crearClienteAdmin();
    if (!cliente) { console.error('Falta configurar la llave de servicio (SUPABASE_SERVICE_ROLE_KEY).'); return res.status(500).json({ error: 'Las tareas automáticas todavía no están configuradas en el servidor.' }); }
    // 6:00 a. m. de Colombia: el Turno Actual del día anterior se reinicia (solo el Turno Actual). También se repasa en la corrida de las 9:00.
    let turno = 0; try { const r = await cliente.rpc('limpiar_turno_actual'); turno = r.error ? 0 : Number(r.data) || 0; } catch { /* sin el SQL 34 todavía */ }
    if (req.query?.tarea === 'turno') return res.status(200).json({ turno: { borrados: turno } });
    let respaldo; try { respaldo = await respaldoMensual(cliente); } catch (e) { console.error('respaldo mensual:', e); respaldo = { hecho: false, error: 'No se pudo hacer la copia mensual.' }; }
    return res.status(200).json({ respaldo, turno: { borrados: turno } });
  } catch (e) {
    console.error('cron-diario:', e);
    return res.status(500).json({ error: 'Error inesperado del servidor.' });
  }
}
