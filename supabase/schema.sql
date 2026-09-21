-- =====================================================================
-- TORREMOLINOS CONTROL — Esquema de base de datos (proyecto "tm-control")
-- VERSIÓN 3 — usa este archivo si vas a crear el proyecto DESDE CERO.
-- Si ya habías corrido una versión anterior, usa el script de migración
-- correspondiente en la carpeta supabase/ (no vuelvas a correr este
-- archivo sobre una base existente).
-- =====================================================================
-- Ejecuta este archivo completo en Supabase → SQL Editor → New query → Run.
--
-- Principios de diseño:
--   1. NUNCA se guarda el archivo Excel: solo los campos ya calculados.
--   2. Los nombres de colaboradores se normalizan en la tabla "personas".
--   3. Tipos de dato reducidos (smallint) donde el rango lo permite.
--   4. rendimiento_historico guarda UN registro por persona por día
--      (los bloques de hora del Excel se suman al guardar). El tiempo
--      trabajado / no productivo se ingresa manualmente y con eso se
--      calcula el rendimiento real:
--        Tiempo Real (h) = (Tiempo Trabajado − Tiempo No Productivo) / 60
--        Rendimiento     = Total Tallos / Tiempo Real (h)
--      (fórmula verificada contra el archivo maestro original).
--   5. rendimiento_actual guarda el detalle por bloque de hora de la
--      ÚLTIMA carga (se vacía y se vuelve a llenar en cada subida).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. PERSONAS
-- ---------------------------------------------------------------------
create table if not exists personas (
  id                integer primary key,
  nombre            text not null,
  codigo_empleado   text,
  rol               text,
  activo            boolean not null default true
);

-- ---------------------------------------------------------------------
-- 2. CONFIGURACIÓN
-- ---------------------------------------------------------------------
create table if not exists configuracion (
  id                  smallint primary key default 1,
  meta_hora           smallint not null default 470,
  meta_global_dia     integer  not null default 25000,
  hora_inicio_default time     not null default '06:00',
  hora_fin_default    time     not null default '23:00',
  descansos_activos   boolean  not null default true,    -- media hora de almuerzo activada por defecto
  descansos           jsonb    not null default '[{"horaCorte":"12:00","minutos":30}]'::jsonb,
  descansos_activos_historico boolean not null default true,
  descansos_historico jsonb    not null default '[{"horaCorte":"12:00","minutos":30}]'::jsonb,
  descansos_activos_actual    boolean not null default true,
  descansos_actual    jsonb    not null default '[{"horaCorte":"12:00","minutos":30}]'::jsonb,
  constraint solo_una_fila check (id = 1)
);
insert into configuracion (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 3. RENDIMIENTO HISTÓRICO (permanente) — UN registro por persona/día
-- ---------------------------------------------------------------------
create table if not exists rendimiento_historico (
  id                          bigserial primary key,
  fecha                       date      not null,
  colaborador_id              integer   not null references personas(id),
  total_tallos                integer   not null default 0,
  total_ramos                 integer   not null default 0,
  tiempo_trabajado_min        smallint,   -- editable manualmente (ej: 8h -> 480)
  tiempo_no_productivo_min    smallint default 0,
  semana                      integer,
  codigos                     text,       -- mesas usadas ese día, ej: "4, 10"
  constraint historico_dia_unico unique (fecha, colaborador_id)
);

create index if not exists idx_historico_fecha on rendimiento_historico (fecha);

-- Bloques de hora originales de cada carga al Histórico (permite recalcular
-- el tiempo trabajado en vivo si cambia la configuración de descansos).
create table if not exists historico_bloques (
  id              bigserial primary key,
  fecha           date not null,
  colaborador_id  integer not null,
  hora_inicio     time not null,
  hora_fin        time not null
);
create index if not exists idx_historico_bloques_fecha_persona on historico_bloques (fecha, colaborador_id);

-- ---------------------------------------------------------------------
-- 4. RENDIMIENTO ACTUAL (snapshot temporal — solo la ÚLTIMA carga, por bloque)
-- ---------------------------------------------------------------------
create table if not exists rendimiento_actual (
  id                     bigserial primary key,
  fecha                  date      not null,
  colaborador_id         integer   not null references personas(id),
  hora_inicio            time      not null,
  hora_fin               time      not null,
  mesa                   smallint,
  total_tallos           smallint  not null default 0,
  total_ramos            smallint  not null default 0,
  rend_tallos            smallint  not null default 0,
  rend_ramos             smallint  not null default 0,
  tiempo_trabajado_min   smallint,
  semana                 integer
);

create index if not exists idx_actual_fecha on rendimiento_actual (fecha);

-- ---------------------------------------------------------------------
-- 5. METAS DIARIAS (la meta de tallos del día se define cada día, no es
--    un valor fijo para siempre — "meta_global_dia" en Configuración
--    queda solo como sugerencia/valor por defecto si no defines una
--    meta puntual para ese día).
-- ---------------------------------------------------------------------
create table if not exists metas_diarias (
  fecha        date primary key,
  meta_tallos  integer not null
);

-- =====================================================================
-- SEGURIDAD (RLS)
-- =====================================================================
alter table personas               enable row level security;
alter table configuracion          enable row level security;
alter table rendimiento_historico  enable row level security;
alter table historico_bloques      enable row level security;
alter table rendimiento_actual     enable row level security;
alter table metas_diarias          enable row level security;

create policy "acceso_total_personas"     on personas               for all using (true) with check (true);
create policy "acceso_total_config"       on configuracion          for all using (true) with check (true);
create policy "acceso_total_historico"    on rendimiento_historico  for all using (true) with check (true);
create policy "acceso_total_actual"       on rendimiento_actual     for all using (true) with check (true);
create policy "acceso_total_metas_dia"    on metas_diarias          for all using (true) with check (true);
create policy "acceso_total_historico_bloques" on historico_bloques  for all using (true) with check (true);

-- Módulo Líneas: líneas de producción, formadoras, asignación diaria
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
create policy "acceso_total_lineas" on lineas for all using (true) with check (true);
create policy "acceso_total_formadoras" on formadoras for all using (true) with check (true);
create policy "acceso_total_asignaciones" on asignaciones_diarias for all using (true) with check (true);
insert into lineas (nombre, activa) values
  ('Línea 1', true), ('Línea 2', true), ('Línea 3', true), ('Línea 4', true)
on conflict (nombre) do nothing;
