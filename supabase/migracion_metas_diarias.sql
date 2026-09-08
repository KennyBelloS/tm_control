-- =====================================================================
-- MIGRACIÓN: agregar metas diarias
-- =====================================================================
-- Corre esto en el SQL Editor de Supabase si ya tenías el proyecto creado.
-- No borra ni modifica ningún dato existente.
-- =====================================================================

create table if not exists metas_diarias (
  fecha        date primary key,
  meta_tallos  integer not null
);

alter table metas_diarias enable row level security;
create policy "acceso_total_metas_dia" on metas_diarias for all using (true) with check (true);
