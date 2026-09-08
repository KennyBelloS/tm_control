-- =====================================================================
-- MIGRACIÓN: descuentos de tiempo (almuerzo, etc.)
-- =====================================================================
-- Corre esto en el SQL Editor de Supabase. No borra ni modifica ningún
-- otro dato existente.
--
-- Queda ACTIVADO por defecto con la media hora de almuerzo (12:00, 30 min)
-- ya configurada — como pediste. Si ya lo habías tocado antes y quieres
-- otro valor, ajústalo después desde Configuración.
-- =====================================================================

alter table configuracion add column if not exists descansos_activos boolean not null default true;
alter table configuracion add column if not exists descansos jsonb not null default '[{"horaCorte":"12:00","minutos":30}]'::jsonb;

-- Si la columna ya existía pero seguía vacía/desactivada (por ejemplo,
-- porque el guardado automático todavía no existía), la dejamos con el
-- valor por defecto de una vez:
update configuracion
set descansos_activos = true,
    descansos = '[{"horaCorte":"12:00","minutos":30}]'::jsonb
where id = 1 and (descansos is null or descansos = '[]'::jsonb);
