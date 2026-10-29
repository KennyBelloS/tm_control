import { createClient } from '@supabase/supabase-js';
import { prepararRespuesta, origenValido, excedeTasa, extraerToken } from './_comun.js';

// Dice SOLO si el servidor está bien configurado (sí/no), nunca los valores. Solo lo puede pedir un Administrador con sesión.
export default async function handler(req, res) {
  prepararRespuesta(res);
  try {
    if (req.method !== 'GET' && req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ error: 'Método no permitido' }); }
    if (!origenValido(req)) return res.status(403).json({ error: 'Origen no permitido.' });
    if (excedeTasa(req, 'estado-servidor', 20)) return res.status(429).json({ error: 'Demasiadas solicitudes. Espera un minuto.' });
    const token = extraerToken(req); if (!token) return res.status(401).json({ error: 'Debes iniciar sesión.' });
    const url = process.env.VITE_SUPABASE_URL, anon = process.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !anon) return res.status(200).json({ servicioUsuarios: false, tareasProgramadas: false, entorno: process.env.VERCEL_ENV || 'local', incompleto: true });
    const cli = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data: u } = await cli.auth.getUser(token); if (!u?.user) return res.status(401).json({ error: 'Sesión no válida.' });
    const { data: p } = await cli.from('perfiles').select('rol, activo').eq('id', u.user.id).single();
    if (!p?.activo || p.rol !== 'administrador') return res.status(403).json({ error: 'Solo el Administrador puede ver esto.' });
    return res.status(200).json({ servicioUsuarios: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY), tareasProgramadas: Boolean(process.env.CRON_SECRET), entorno: process.env.VERCEL_ENV || 'local' });
  } catch (e) {
    console.error('estado-servidor:', e);
    return res.status(500).json({ error: 'No se pudo revisar el servidor.' });
  }
}
