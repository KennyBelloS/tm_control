import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn(
    '[Supabase] Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en tu archivo .env. ' +
    'Copia .env.example a .env y coloca las credenciales de tu proyecto "tm-control". ' +
    'Revisa el manual (MANUAL.md) sección "Conectar Supabase".'
  );
}

export const supabase = createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder');
export const supabaseConfigurado = Boolean(url && anonKey);
