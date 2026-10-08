-- =====================================================================
-- AUTENTICACIÓN REAL CON ROLES
-- =====================================================================
-- Corre esto completo en el SQL Editor de Supabase.
-- Reemplaza el "selector de rol" temporal por login real: el Administrador
-- entra con correo, los demás con usuario y contraseña que él les asigne.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tabla de perfiles (nombre + rol de cada cuenta real de Supabase Auth)
-- ---------------------------------------------------------------------
create table if not exists perfiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nombre      text not null,
  rol         text not null check (rol in ('administrador','ingeniero','supervisor','formador')),
  activo      boolean not null default true,
  creado_en   timestamptz not null default now()
);

-- Función auxiliar (evita recursión en las políticas de seguridad)
create or replace function es_administrador()
returns boolean
language sql
security definer
stable
as $$
  select exists (select 1 from perfiles where id = auth.uid() and rol = 'administrador' and activo = true);
$$;

alter table perfiles enable row level security;

-- Cualquier usuario que inició sesión puede ver la lista de perfiles
-- (para mostrar nombre/rol en la barra superior y en Usuarios)
drop policy if exists "leer_perfiles" on perfiles;
create policy "leer_perfiles" on perfiles for select using (auth.role() = 'authenticated');

-- Solo un administrador puede crear, editar o desactivar perfiles
drop policy if exists "admin_gestiona_perfiles" on perfiles;
create policy "admin_gestiona_perfiles" on perfiles for all
  using (es_administrador())
  with check (es_administrador());

-- ---------------------------------------------------------------------
-- 2. Función para saber cuánto espacio real se está usando en Supabase
--    (se usa en Auditoría para la barra de almacenamiento)
-- ---------------------------------------------------------------------
create or replace function almacenamiento_usado_mb()
returns numeric
language sql
security definer
stable
as $$
  select round(pg_database_size(current_database()) / 1024.0 / 1024.0, 2);
$$;

-- ---------------------------------------------------------------------
-- 3. Actualiza las políticas de las tablas de datos para que respeten
--    roles reales (antes cualquiera podía hacer cualquier cosa).
--    Regla: todos los que iniciaron sesión pueden LEER; escribir/borrar
--    requiere administrador o ingeniero (no supervisor ni formador).
-- ---------------------------------------------------------------------
create or replace function puede_editar()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from perfiles
    where id = auth.uid() and activo = true and rol in ('administrador','ingeniero')
  );
$$;

-- Histórico
drop policy if exists "acceso_total_historico" on rendimiento_historico;
create policy "leer_historico" on rendimiento_historico for select using (auth.role() = 'authenticated');
create policy "escribir_historico" on rendimiento_historico for insert with check (puede_editar());
create policy "actualizar_historico" on rendimiento_historico for update using (puede_editar());
create policy "borrar_historico" on rendimiento_historico for delete using (puede_editar());

-- Turno actual
drop policy if exists "acceso_total_actual" on rendimiento_actual;
create policy "leer_actual" on rendimiento_actual for select using (auth.role() = 'authenticated');
create policy "escribir_actual" on rendimiento_actual for insert with check (puede_editar());
create policy "actualizar_actual" on rendimiento_actual for update using (puede_editar());
create policy "borrar_actual" on rendimiento_actual for delete using (puede_editar());

-- Personas, configuración y metas: mismo criterio
drop policy if exists "acceso_total_personas" on personas;
create policy "leer_personas" on personas for select using (auth.role() = 'authenticated');
create policy "escribir_personas" on personas for all using (puede_editar()) with check (puede_editar());

drop policy if exists "acceso_total_config" on configuracion;
create policy "leer_config" on configuracion for select using (auth.role() = 'authenticated');
create policy "escribir_config" on configuracion for update using (puede_editar());

drop policy if exists "acceso_total_metas_dia" on metas_diarias;
create policy "leer_metas" on metas_diarias for select using (auth.role() = 'authenticated');
create policy "escribir_metas" on metas_diarias for all using (puede_editar()) with check (puede_editar());

-- ---------------------------------------------------------------------
-- 4. Límite de almacenamiento configurable (para la barra de Auditoría;
--    500 MB es el límite del plan gratuito de Supabase — ajústalo si
--    tienes un plan pago con más espacio).
-- ---------------------------------------------------------------------
alter table configuracion add column if not exists almacenamiento_limite_mb integer not null default 500;

-- ---------------------------------------------------------------------
-- 5. Guarda qué Códigos (mesas) usó cada persona ese día en el Histórico,
--    para que los reportes siempre puedan mostrar el Código, incluso en
--    el Histórico (antes no se guardaba porque el histórico solo tenía
--    el total del día, no el detalle de mesa).
-- ---------------------------------------------------------------------
alter table rendimiento_historico add column if not exists codigos text;

-- ---------------------------------------------------------------------
-- 6. Marca de "super admin" — esta cuenta NO se puede editar, cambiar de
--    rol, desactivar ni borrar desde el módulo Usuarios (protección para
--    que nadie se quede sin acceso de administrador por accidente).
--    Después de correr esto, marca a TU cuenta como super admin así:
--    update perfiles set es_super_admin = true where id = 'TU-ID-AQUI';
-- ---------------------------------------------------------------------
alter table perfiles add column if not exists es_super_admin boolean not null default false;

-- ---------------------------------------------------------------------
-- 7. Guarda los bloques de hora ORIGINALES de cada carga al Histórico,
--    para poder recalcular el tiempo trabajado en vivo cuando cambies la
--    configuración de descansos (antes quedaba fijo desde que se subía
--    el Excel y no se actualizaba con cambios posteriores).
-- ---------------------------------------------------------------------
create table if not exists historico_bloques (
  id              bigserial primary key,
  fecha           date not null,
  colaborador_id  integer not null,
  hora_inicio     time not null,
  hora_fin        time not null
);
create index if not exists idx_historico_bloques_fecha_persona on historico_bloques (fecha, colaborador_id);
alter table historico_bloques enable row level security;
drop policy if exists "leer_historico_bloques" on historico_bloques;
create policy "leer_historico_bloques" on historico_bloques for select using (auth.role() = 'authenticated');
drop policy if exists "escribir_historico_bloques" on historico_bloques;
create policy "escribir_historico_bloques" on historico_bloques for all using (puede_editar()) with check (puede_editar());

-- ---------------------------------------------------------------------
-- 8. Día en que termina la semana para el Ranking "por semana"
--    (0=domingo, 1=lunes ... 6=sábado). Por defecto: sábado, así la
--    semana corre de domingo a sábado.
-- ---------------------------------------------------------------------
alter table configuracion add column if not exists dia_fin_semana smallint not null default 6;

-- ---------------------------------------------------------------------
-- 9. Activa Supabase Realtime en las tablas principales — esto es lo que
--    permite que la app se actualice sola en todas las pantallas cuando
--    alguien sube o edita algo, sin que nadie tenga que recargar la página.
-- ---------------------------------------------------------------------
do $$
declare
  tabla text;
begin
  foreach tabla in array array['rendimiento_historico', 'rendimiento_actual', 'metas_diarias', 'configuracion']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and tablename = tabla
    ) then
      execute format('alter publication supabase_realtime add table %I', tabla);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 10. Módulo Personas: información adicional de cada colaborador
--     (código de empleado, rol, si está activo o no).
-- ---------------------------------------------------------------------
alter table personas add column if not exists codigo_empleado text;
alter table personas add column if not exists rol text;
alter table personas add column if not exists activo boolean not null default true;

-- ---------------------------------------------------------------------
-- 11. Módulo Líneas: líneas de producción, formadoras, y la asignación
--     diaria de cada persona a una formadora dentro de una línea.
-- ---------------------------------------------------------------------
create table if not exists lineas (
  id          bigserial primary key,
  nombre      text not null unique,
  supervisor  text,
  activa      boolean not null default true,
  creado_en   timestamptz not null default now()
);

create table if not exists formadoras (
  id          bigserial primary key,
  nombre      text not null unique,
  activa      boolean not null default true,
  creado_en   timestamptz not null default now()
);

create table if not exists asignaciones_diarias (
  id              bigserial primary key,
  fecha           date not null,
  linea_id        bigint not null references lineas(id) on delete cascade,
  formadora_id    bigint not null references formadoras(id) on delete cascade,
  colaborador_id  integer not null references personas(id) on delete cascade,
  creado_en       timestamptz not null default now(),
  constraint asignacion_persona_dia_unica unique (fecha, colaborador_id)
);
create index if not exists idx_asignaciones_fecha on asignaciones_diarias (fecha);
create index if not exists idx_asignaciones_linea on asignaciones_diarias (linea_id);

alter table lineas enable row level security;
alter table formadoras enable row level security;
alter table asignaciones_diarias enable row level security;

drop policy if exists "acceso_total_lineas" on lineas;
create policy "acceso_total_lineas" on lineas for all using (true) with check (true);
drop policy if exists "acceso_total_formadoras" on formadoras;
create policy "acceso_total_formadoras" on formadoras for all using (true) with check (true);
drop policy if exists "acceso_total_asignaciones" on asignaciones_diarias;
create policy "acceso_total_asignaciones" on asignaciones_diarias for all using (true) with check (true);

-- 4 líneas predefinidas de ejemplo (puedes editarlas o agregar más desde la app)
insert into lineas (nombre, activa) values
  ('Línea 1', true), ('Línea 2', true), ('Línea 3', true), ('Línea 4', true)
on conflict (nombre) do nothing;

-- ---------------------------------------------------------------------
-- 12. Descuentos de tiempo (almuerzo) SEPARADOS: uno para el Histórico y
--     otro para el Turno Actual, en vez de compartir la misma config.
--     Se copia lo que ya tenías configurado a ambos, para no perder nada.
-- ---------------------------------------------------------------------
alter table configuracion add column if not exists descansos_activos_historico boolean;
alter table configuracion add column if not exists descansos_historico jsonb;
alter table configuracion add column if not exists descansos_activos_actual boolean;
alter table configuracion add column if not exists descansos_actual jsonb;

update configuracion
set descansos_activos_historico = coalesce(descansos_activos_historico, descansos_activos),
    descansos_historico = coalesce(descansos_historico, descansos),
    descansos_activos_actual = coalesce(descansos_activos_actual, descansos_activos),
    descansos_actual = coalesce(descansos_actual, descansos)
where id = 1;

alter table configuracion alter column descansos_activos_historico set default true;
alter table configuracion alter column descansos_historico set default '[{"horaCorte":"12:00","minutos":30}]'::jsonb;
alter table configuracion alter column descansos_activos_actual set default true;
alter table configuracion alter column descansos_actual set default '[{"horaCorte":"12:00","minutos":30}]'::jsonb;

-- ---------------------------------------------------------------------
-- 13. Descuentos de tiempo por día puntual — permite cambiar el almuerzo
--     solo para un día específico (ej. hoy), sin afectar la configuración
--     general de los demás días. Si un día no tiene fila aquí, se usa la
--     configuración general de Configuración.
-- ---------------------------------------------------------------------
create table if not exists descansos_diarios (
  fecha       date not null,
  tipo        text not null check (tipo in ('historico', 'actual')),
  activos     boolean not null default true,
  descansos   jsonb not null default '[]'::jsonb,
  primary key (fecha, tipo)
);
alter table descansos_diarios enable row level security;
drop policy if exists "acceso_total_descansos_diarios" on descansos_diarios;
create policy "acceso_total_descansos_diarios" on descansos_diarios for all using (true) with check (true);

-- ---------------------------------------------------------------------
-- 14. Tablero Integrado de Formadoras — una fila por formadora/día.
--     Formadora, fecha y rendimiento promedio se llenan solos; el resto
--     (meta, resultado de clasificación, devoluciones) se llena a mano.
-- ---------------------------------------------------------------------
create table if not exists tablero_formadoras (
  id                       bigserial primary key,
  fecha                    date not null,
  formadora_id             bigint not null references formadoras(id) on delete cascade,
  semana                   text,
  meta_clasificacion       numeric,
  resultado_clasificacion  numeric,
  devoluciones             integer,
  constraint tablero_formadora_dia_unico unique (fecha, formadora_id)
);
create index if not exists idx_tablero_formadoras_fecha on tablero_formadoras (fecha);
alter table tablero_formadoras enable row level security;
drop policy if exists "acceso_total_tablero_formadoras" on tablero_formadoras;
create policy "acceso_total_tablero_formadoras" on tablero_formadoras for all using (true) with check (true);

-- ---------------------------------------------------------------------
-- 15. Dos roles nuevos: "profesional" (mismos permisos que Ingeniero) y
--     "digitador" (todo lo del Administrador, excepto Auditoría).
-- ---------------------------------------------------------------------
alter table perfiles drop constraint if exists perfiles_rol_check;
alter table perfiles add constraint perfiles_rol_check
  check (rol in ('administrador','ingeniero','profesional','digitador','supervisor','formador'));

-- ---------------------------------------------------------------------
-- 16. Clasificación hora a hora
--     - clasificacion_hora: tallos movidos por línea y hora (se conserva
--       solo 2 días; se borra a las 5 a.m. del segundo día siguiente).
--     - clasificacion_cargas: una fila por día (hasta qué hora llega el reporte).
--     - clasificacion_historico: total diario por línea, PERMANENTE y automático.
--     - lineas.meta_hora: meta de tallos/hora de clasificación por línea.
-- ---------------------------------------------------------------------
alter table lineas add column if not exists meta_hora integer;

create table if not exists clasificacion_hora (
  fecha        date     not null,
  linea        smallint not null,
  hora         smallint not null check (hora between 0 and 23),
  tallos       integer  not null default 0,
  movimientos  integer  not null default 0,
  primary key (fecha, linea, hora)
);
create index if not exists idx_clasificacion_hora_fecha on clasificacion_hora (fecha);

create table if not exists clasificacion_cargas (
  fecha        date primary key,
  corte_min    smallint not null,
  ultima_hora  smallint not null,
  parcial      boolean  not null default false,
  movimientos  integer  not null default 0,
  cargado_en   timestamptz not null default now()
);

create table if not exists clasificacion_historico (
  fecha          date     not null,
  linea          smallint not null,
  total_tallos   integer  not null default 0,
  movimientos    integer  not null default 0,
  actualizado_en timestamptz not null default now(),
  primary key (fecha, linea)
);

alter table clasificacion_hora enable row level security;
alter table clasificacion_cargas enable row level security;
alter table clasificacion_historico enable row level security;
drop policy if exists "acceso_total_clasificacion_hora" on clasificacion_hora;
create policy "acceso_total_clasificacion_hora" on clasificacion_hora for all using (true) with check (true);
drop policy if exists "acceso_total_clasificacion_cargas" on clasificacion_cargas;
create policy "acceso_total_clasificacion_cargas" on clasificacion_cargas for all using (true) with check (true);
drop policy if exists "acceso_total_clasificacion_historico" on clasificacion_historico;
create policy "acceso_total_clasificacion_historico" on clasificacion_historico for all using (true) with check (true);

do $$
declare tabla text;
begin
  foreach tabla in array array['clasificacion_hora', 'clasificacion_cargas']
  loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = tabla) then
      execute format('alter publication supabase_realtime add table %I', tabla);
    end if;
  end loop;
end $$;

NOTIFY pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- 17. Personas: el identificador es el Emp.Cod (el "Colaborador Id" que trae
--     el reporte de boncheo). La mesa pasa a ser un dato más (es el "código"
--     que se ve en pantalla). Corrige a quienes quedaron guardados con la
--     mesa como id, para que las asignaciones crucen con los rendimientos.
-- ---------------------------------------------------------------------
alter table personas add column if not exists mesa integer;

insert into personas (id, nombre, codigo_empleado, rol, activo, mesa)
select p.codigo_empleado::integer, p.nombre, p.codigo_empleado, p.rol, p.activo, p.id
from personas p
where p.codigo_empleado ~ '^[0-9]{1,9}$' and p.codigo_empleado::integer <> p.id
on conflict (id) do update set
  codigo_empleado = excluded.codigo_empleado,
  rol    = coalesce(excluded.rol, personas.rol),
  mesa   = coalesce(excluded.mesa, personas.mesa),
  activo = excluded.activo;

update asignaciones_diarias a
set colaborador_id = p.codigo_empleado::integer
from personas p
where a.colaborador_id = p.id
  and p.codigo_empleado ~ '^[0-9]{1,9}$' and p.codigo_empleado::integer <> p.id
  and not exists (select 1 from asignaciones_diarias b where b.fecha = a.fecha and b.colaborador_id = p.codigo_empleado::integer);

delete from personas p
where p.codigo_empleado ~ '^[0-9]{1,9}$' and p.codigo_empleado::integer <> p.id
  and not exists (select 1 from rendimiento_historico h where h.colaborador_id = p.id)
  and not exists (select 1 from rendimiento_actual r where r.colaborador_id = p.id);

NOTIFY pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- 18. Meta de tallos/hora por línea, POR MES (se reinicia cada mes).
--     Lo que ya tenías definido pasa a ser la meta del mes actual.
-- ---------------------------------------------------------------------
create table if not exists metas_linea_mes (
  mes        text   not null check (mes ~ '^[0-9]{4}-[0-9]{2}$'),
  linea_id   bigint not null references lineas(id) on delete cascade,
  meta_hora  integer not null check (meta_hora >= 0),
  primary key (mes, linea_id)
);
alter table metas_linea_mes enable row level security;
drop policy if exists "acceso_total_metas_linea_mes" on metas_linea_mes;
create policy "acceso_total_metas_linea_mes" on metas_linea_mes for all using (true) with check (true);
insert into metas_linea_mes (mes, linea_id, meta_hora)
select to_char((now() at time zone 'America/Bogota'), 'YYYY-MM'), id, meta_hora
from lineas where meta_hora is not null
on conflict (mes, linea_id) do nothing;

-- ---------------------------------------------------------------------
-- 19. Formadora a cargo de cada línea, por fecha (se elige a mano).
-- ---------------------------------------------------------------------
create table if not exists formadora_linea (
  fecha        date   not null,
  linea_id     bigint not null references lineas(id) on delete cascade,
  formadora_id bigint not null references formadoras(id) on delete cascade,
  primary key (fecha, linea_id)
);
alter table formadora_linea enable row level security;
drop policy if exists "acceso_total_formadora_linea" on formadora_linea;
create policy "acceso_total_formadora_linea" on formadora_linea for all using (true) with check (true);

-- ---------------------------------------------------------------------
-- 20. Notas privadas de módulos (la contraseña del tablero). Solo la leen
--     Administrador, Ingeniero y Supervisor; solo el Administrador la cambia.
--     Así NO queda escrita en el código de la app (que se descarga en el navegador).
-- ---------------------------------------------------------------------
create table if not exists notas_modulo (
  clave          text primary key,
  valor          text not null,
  actualizado_en timestamptz not null default now()
);
alter table notas_modulo enable row level security;
drop policy if exists "notas_leer_roles" on notas_modulo;
create policy "notas_leer_roles" on notas_modulo for select using (
  exists (select 1 from perfiles p where p.id = auth.uid() and p.activo and p.rol in ('administrador', 'ingeniero', 'supervisor'))
);
drop policy if exists "notas_admin_escribe" on notas_modulo;
create policy "notas_admin_escribe" on notas_modulo for all using (es_administrador()) with check (es_administrador());
insert into notas_modulo (clave, valor) values ('tableros_clave', 'miClave2026')
on conflict (clave) do update set valor = excluded.valor, actualizado_en = now();

do $$
declare tabla text;
begin
  foreach tabla in array array['metas_linea_mes', 'formadora_linea']
  loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = tabla) then
      execute format('alter publication supabase_realtime add table %I', tabla);
    end if;
  end loop;
end $$;

NOTIFY pgrst, 'reload schema';
