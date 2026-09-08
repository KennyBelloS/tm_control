-- =====================================================================
-- MIGRACIÓN v1 → v2
-- =====================================================================
-- Corre esto SOLO si ya habías ejecutado el schema.sql anterior y ya
-- tienes datos guardados. Agrega: edición/eliminación por registro
-- individual (columna "id") y el campo de tiempo trabajado manual.
-- Ejecuta todo el bloque de una sola vez en el SQL Editor de Supabase.
-- =====================================================================

-- --- rendimiento_historico -------------------------------------------
alter table rendimiento_historico add column if not exists tiempo_trabajado_min smallint;
alter table rendimiento_historico add column if not exists id bigserial;

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'rendimiento_historico_pkey'
      and conrelid = 'rendimiento_historico'::regclass
      and pg_get_constraintdef(oid) not like '%(id)%'
  ) then
    alter table rendimiento_historico drop constraint rendimiento_historico_pkey;
    alter table rendimiento_historico add constraint historico_bloque_unico
      unique (fecha, colaborador_id, hora_inicio, hora_fin);
    alter table rendimiento_historico add primary key (id);
  end if;
end $$;

-- --- rendimiento_actual -----------------------------------------------
alter table rendimiento_actual add column if not exists tiempo_trabajado_min smallint;

-- Listo. Puedes verificar con:
-- select column_name, data_type from information_schema.columns where table_name = 'rendimiento_historico';
