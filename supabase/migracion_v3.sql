-- =====================================================================
-- MIGRACIÓN v2 → v3
-- =====================================================================
-- Corre esto SOLO si ya tenías el esquema v2 (con hora_inicio/hora_fin
-- en rendimiento_historico). Cambia el Histórico de "una fila por bloque
-- de hora" a "un total por persona por día" (sumando los bloques que ya
-- tenías guardados), y agrega el campo de tiempo no productivo.
--
-- Ejecuta todo el bloque de una sola vez en el SQL Editor de Supabase.
-- =====================================================================

-- 1) Crear la tabla nueva con la estructura correcta
create table if not exists rendimiento_historico_v3 (
  id                          bigserial primary key,
  fecha                       date      not null,
  colaborador_id              integer   not null references personas(id),
  total_tallos                integer   not null default 0,
  total_ramos                 integer   not null default 0,
  tiempo_trabajado_min        smallint,
  tiempo_no_productivo_min    smallint default 0,
  semana                      integer,
  constraint historico_dia_unico unique (fecha, colaborador_id)
);

-- 2) Migrar los datos: sumar los bloques existentes por persona/día.
--    Si ya habías escrito tiempo_trabajado_min a mano en algún bloque,
--    se usa el mayor valor encontrado ese día como punto de partida
--    (revísalo y ajústalo si hace falta, ya que antes era por bloque).
insert into rendimiento_historico_v3
  (fecha, colaborador_id, total_tallos, total_ramos, tiempo_trabajado_min, semana)
select
  fecha,
  colaborador_id,
  sum(total_tallos)::integer,
  sum(total_ramos)::integer,
  max(tiempo_trabajado_min),
  max(semana)
from rendimiento_historico
group by fecha, colaborador_id
on conflict (fecha, colaborador_id) do nothing;

-- 3) Reemplazar la tabla vieja por la nueva
drop table rendimiento_historico;
alter table rendimiento_historico_v3 rename to rendimiento_historico;
alter index rendimiento_historico_v3_pkey rename to rendimiento_historico_pkey;

create index if not exists idx_historico_fecha on rendimiento_historico (fecha);

alter table rendimiento_historico enable row level security;
create policy "acceso_total_historico" on rendimiento_historico for all using (true) with check (true);

-- Listo. Verifica con:
-- select * from rendimiento_historico order by fecha desc limit 20;
