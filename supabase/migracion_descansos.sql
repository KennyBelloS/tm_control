-- =====================================================================
-- MIGRACIÓN: descuentos de tiempo (almuerzo, etc.)
-- =====================================================================
-- Corre esto en el SQL Editor de Supabase. No borra ni modifica ningún
-- dato existente. Queda DESACTIVADO por defecto (descansos_activos = false).
-- =====================================================================

alter table configuracion add column if not exists descansos_activos boolean not null default false;
alter table configuracion add column if not exists descansos jsonb not null default '[]'::jsonb;
