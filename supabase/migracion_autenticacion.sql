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

-- ---------------------------------------------------------------------
-- 21. Líneas que trabajan cada día (ajuste por fecha sobre lo general de la línea).
-- ---------------------------------------------------------------------
create table if not exists lineas_dia (
  fecha    date   not null,
  linea_id bigint not null references lineas(id) on delete cascade,
  activa   boolean not null,
  primary key (fecha, linea_id)
);
alter table lineas_dia enable row level security;
drop policy if exists "acceso_total_lineas_dia" on lineas_dia;
create policy "acceso_total_lineas_dia" on lineas_dia for all using (true) with check (true);
NOTIFY pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- 22. Contraseña de Gerencia (TM2026) y permisos POR NOTA:
--     - tablero:  Administrador, Ingeniero y Supervisor
--     - gerencia: Administrador e Ingeniero (el Supervisor NO la puede leer, ni siquiera por la API)
-- ---------------------------------------------------------------------
drop policy if exists "notas_leer_roles" on notas_modulo;
create policy "notas_leer_roles" on notas_modulo for select using (
  exists (
    select 1 from perfiles p
    where p.id = auth.uid() and p.activo and (
      (notas_modulo.clave = 'tableros_clave' and p.rol in ('administrador', 'ingeniero', 'supervisor'))
      or (notas_modulo.clave = 'gerencia_clave' and p.rol in ('administrador', 'ingeniero'))
    )
  )
);
insert into notas_modulo (clave, valor) values ('gerencia_clave', 'TM2026')
on conflict (clave) do update set valor = excluded.valor, actualizado_en = now();
NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- 23. SEGURIDAD DE LA BASE DE DATOS (córrelo al final; es seguro repetirlo)
--     - Cierra las políticas abiertas "for all using (true)" de los módulos de Líneas, Clasificación, etc.:
--       antes cualquiera con la llave pública del navegador, SIN iniciar sesión, podía leer, cambiar o borrar esos datos.
--     - Leer: cualquier usuario con sesión.  Escribir: solo quien puede editar (Administrador, Ingeniero, Profesional, Digitador).
--     - La función puede_editar() ahora coincide con los permisos que muestra la app.
--     - Quita todo acceso al usuario anónimo (sin sesión).
-- =====================================================================

-- a) Funciones de permisos: mismo criterio que la app y con la ruta de búsqueda fija (evita suplantación de funciones)
create or replace function es_administrador()
returns boolean language sql security definer stable set search_path = public, pg_temp
as $$ select exists (select 1 from public.perfiles where id = auth.uid() and rol = 'administrador' and activo = true); $$;

create or replace function puede_editar()
returns boolean language sql security definer stable set search_path = public, pg_temp
as $$ select exists (select 1 from public.perfiles where id = auth.uid() and activo = true and rol in ('administrador', 'ingeniero', 'profesional', 'digitador')); $$;

revoke all on function es_administrador() from public, anon;
revoke all on function puede_editar() from public, anon;
grant execute on function es_administrador() to authenticated;
grant execute on function puede_editar() to authenticated;
do $$ begin
  if to_regprocedure('public.almacenamiento_usado_mb()') is not null then
    alter function almacenamiento_usado_mb() set search_path = public, pg_temp;
    revoke all on function almacenamiento_usado_mb() from public, anon;
    grant execute on function almacenamiento_usado_mb() to authenticated;
  end if;
end $$;

-- b) Tablas de los módulos: se borran TODAS sus políticas anteriores y se crean las correctas
do $$
declare t text; pol record;
begin
  foreach t in array array['lineas', 'formadoras', 'asignaciones_diarias', 'descansos_diarios', 'tablero_formadoras',
                           'clasificacion_hora', 'clasificacion_cargas', 'clasificacion_historico',
                           'metas_linea_mes', 'formadora_linea', 'lineas_dia']
  loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('alter table public.%I enable row level security', t);
    for pol in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', pol.policyname, t);
    end loop;
    execute format('create policy %I on public.%I for select to authenticated using (true)', 'leer_' || t, t);
    execute format('create policy %I on public.%I for insert to authenticated with check (puede_editar())', 'insertar_' || t, t);
    execute format('create policy %I on public.%I for update to authenticated using (puede_editar()) with check (puede_editar())', 'actualizar_' || t, t);
    execute format('create policy %I on public.%I for delete to authenticated using (puede_editar())', 'borrar_' || t, t);
  end loop;
end $$;

-- c) El usuario anónimo (sin sesión) no necesita NADA de las tablas ni de las funciones
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke execute on all functions in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke execute on functions from anon;

NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- 24. MÓDULO DE DEVOLUCIONES (almacenamiento mínimo + carga incremental)
--   - devoluciones_dia:        UNA fila por persona y día; solo guarda las razones con valor (jsonb) y el total.
--   - devoluciones_asistencia: UNA fila por persona y MES; los días trabajados van en un número (bit 0 = día 1 … bit 30 = día 31).
--   - devoluciones_personas:   el nombre y código de cada persona, UNA sola vez.
--   - devoluciones_meta:       hasta qué día ya se cargó (así la próxima vez solo entra lo nuevo) y el orden de las razones.
--   Leer: cualquier usuario con sesión. Escribir: quien puede editar. El usuario sin sesión no ve nada.
-- =====================================================================
create table if not exists devoluciones_personas (
  colaborador_id bigint primary key,
  nombre text not null check (char_length(nombre) between 1 and 160),
  codigo integer
);
create table if not exists devoluciones_dia (
  fecha date not null,
  colaborador_id bigint not null,
  codigo integer,
  razones jsonb not null default '{}'::jsonb,
  total integer not null check (total >= 0),
  filas smallint not null default 1,
  primary key (fecha, colaborador_id)
);
create index if not exists devoluciones_dia_persona_idx on devoluciones_dia (colaborador_id);
create table if not exists devoluciones_asistencia (
  colaborador_id bigint not null,
  mes date not null check (mes = date_trunc('month', mes)::date),
  dias integer not null check (dias >= 0),
  primary key (colaborador_id, mes)
);
create table if not exists devoluciones_meta (
  id smallint primary key default 1 check (id = 1),
  ultima_fecha_registro date,
  ultima_fecha_asistencia date,
  razones jsonb not null default '[]'::jsonb,
  actualizado_en timestamptz not null default now()
);
insert into devoluciones_meta (id) values (1) on conflict (id) do nothing;

do $$
declare t text; pol record;
begin
  foreach t in array array['devoluciones_personas', 'devoluciones_dia', 'devoluciones_asistencia', 'devoluciones_meta'] loop
    execute format('alter table public.%I enable row level security', t);
    for pol in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', pol.policyname, t);
    end loop;
    execute format('create policy %I on public.%I for select to authenticated using (true)', 'leer_' || t, t);
    execute format('create policy %I on public.%I for insert to authenticated with check (puede_editar())', 'insertar_' || t, t);
    execute format('create policy %I on public.%I for update to authenticated using (puede_editar()) with check (puede_editar())', 'actualizar_' || t, t);
    execute format('create policy %I on public.%I for delete to authenticated using (puede_editar())', 'borrar_' || t, t);
  end loop;
end $$;
revoke all on devoluciones_personas, devoluciones_dia, devoluciones_asistencia, devoluciones_meta from anon;

/*
 * Importación en UNA sola operación (si algo falla, no queda nada a medias).
 *   p_desde_reg / p_desde_asis: desde qué día se reemplaza lo guardado (la carga incremental). Nulo = es la primera carga.
 *   p_reemplazar: borra TODO antes de cargar (para recargar desde cero tras corregir datos viejos).
 * Corre con los permisos de quien la llama (security invoker): las políticas de arriba siguen mandando.
 */
create or replace function devoluciones_importar(
  p_personas jsonb, p_dias jsonb, p_asistencia jsonb, p_razones jsonb,
  p_desde_reg date, p_desde_asis date, p_reemplazar boolean default false
) returns jsonb
language plpgsql security invoker set search_path = public, pg_temp
as $$
declare n_dias int := 0; n_asis int := 0; n_pers int := 0; max_reg date; max_asis date; mes_desde date;
begin
  if not puede_editar() then raise exception 'No tienes permiso para cargar devoluciones.' using errcode = '42501'; end if;

  if p_reemplazar then
    delete from devoluciones_dia where true;
    delete from devoluciones_asistencia where true;
    p_desde_reg := null; p_desde_asis := null;
  end if;

  insert into devoluciones_personas (colaborador_id, nombre, codigo)
  select (x->>'i')::bigint, left(x->>'n', 160), nullif(x->>'c', '')::int from jsonb_array_elements(coalesce(p_personas, '[]'::jsonb)) x
  on conflict (colaborador_id) do update set nombre = excluded.nombre, codigo = coalesce(excluded.codigo, devoluciones_personas.codigo);
  get diagnostics n_pers = row_count;

  -- Registro: se reemplaza desde el último día guardado (ese día pudo estar incompleto) y se inserta lo recibido
  if p_desde_reg is not null then delete from devoluciones_dia where fecha >= p_desde_reg; end if;
  insert into devoluciones_dia (fecha, colaborador_id, codigo, razones, total, filas)
  select (x->>'f')::date, (x->>'i')::bigint, nullif(x->>'c', '')::int, coalesce(x->'r', '{}'::jsonb), (x->>'t')::int, coalesce((x->>'n')::smallint, 1)
  from jsonb_array_elements(coalesce(p_dias, '[]'::jsonb)) x
  on conflict (fecha, colaborador_id) do update set codigo = excluded.codigo, razones = excluded.razones, total = excluded.total, filas = excluded.filas;
  get diagnostics n_dias = row_count;

  -- Asistencia: los meses anteriores al de "desde" no se tocan; en el mes de "desde" se conservan los días anteriores a esa fecha
  if p_desde_asis is not null then
    mes_desde := date_trunc('month', p_desde_asis)::date;
    delete from devoluciones_asistencia where mes > mes_desde;
  end if;
  insert into devoluciones_asistencia (colaborador_id, mes, dias)
  select (x->>'i')::bigint, (x->>'m')::date, (x->>'d')::int from jsonb_array_elements(coalesce(p_asistencia, '[]'::jsonb)) x
  on conflict (colaborador_id, mes) do update set dias = case
    when p_desde_asis is not null and excluded.mes = date_trunc('month', p_desde_asis)::date
      then (devoluciones_asistencia.dias & ((1 << (extract(day from p_desde_asis)::int - 1)) - 1)) | excluded.dias
    else excluded.dias end;
  get diagnostics n_asis = row_count;

  -- hasta qué día hay datos: el último registro, y para la asistencia el bit más alto encendido del último mes
  select max(fecha) into max_reg from devoluciones_dia;
  select max(mes + floor(log(2::numeric, dias::numeric))::int) into max_asis from devoluciones_asistencia where dias > 0;
  update devoluciones_meta set
    ultima_fecha_registro = max_reg,
    ultima_fecha_asistencia = max_asis,
    razones = case when jsonb_array_length(coalesce(p_razones, '[]'::jsonb)) > 0 then p_razones else razones end,
    actualizado_en = now()
  where id = 1;
  return jsonb_build_object('dias', n_dias, 'asistencia', n_asis, 'personas', n_pers);
end $$;
revoke all on function devoluciones_importar(jsonb, jsonb, jsonb, jsonb, date, date, boolean) from public, anon;
grant execute on function devoluciones_importar(jsonb, jsonb, jsonb, jsonb, date, date, boolean) to authenticated;

do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table devoluciones_dia; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table devoluciones_meta; exception when duplicate_object then null; end;
  end if;
end $$;
NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- 25. El FORMADOR ve lo mismo que el SUPERVISOR, pero SOLO PARA VISUALIZAR.
--     - Escribir/cargar/borrar ya lo impide puede_editar() (solo Administrador, Ingeniero, Profesional y Digitador).
--     - Leer los módulos ya está abierto a cualquier usuario con sesión.
--     - Lo único que faltaba: que el Formador pueda leer la contraseña de los Tableros (igual que el Supervisor).
--       La de Gerencia sigue siendo solo para Administrador e Ingeniero.
-- =====================================================================
drop policy if exists "notas_leer_roles" on notas_modulo;
create policy "notas_leer_roles" on notas_modulo for select using (
  exists (
    select 1 from perfiles p
    where p.id = auth.uid() and p.activo and (
      (notas_modulo.clave = 'tableros_clave' and p.rol in ('administrador', 'ingeniero', 'supervisor', 'formador'))
      or (notas_modulo.clave = 'gerencia_clave' and p.rol in ('administrador', 'ingeniero'))
    )
  )
);
NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- 26. DEVOLUCIONES: los "mínimos de días" (lo que antes se guardaba solo en cada navegador) ahora se guardan EN LA BASE y quedan
--     como predeterminados para todos. Todos los usuarios con sesión los LEEN; solo el ADMINISTRADOR los puede cambiar.
-- =====================================================================
create table if not exists devoluciones_ajustes (
  id             smallint primary key default 1 check (id = 1),
  minimos        jsonb not null default '{"semana": 5, "mes": 22, "historico": 25}'::jsonb,
  actualizado_en timestamptz not null default now()
);
insert into devoluciones_ajustes (id) values (1) on conflict (id) do nothing;
alter table devoluciones_ajustes enable row level security;
do $$ declare pol record; begin
  for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'devoluciones_ajustes' loop
    execute format('drop policy %I on public.devoluciones_ajustes', pol.policyname);
  end loop;
end $$;
create policy "leer_devoluciones_ajustes" on devoluciones_ajustes for select to authenticated using (true);
create policy "insertar_devoluciones_ajustes" on devoluciones_ajustes for insert to authenticated with check (es_administrador());
create policy "actualizar_devoluciones_ajustes" on devoluciones_ajustes for update to authenticated using (es_administrador()) with check (es_administrador());
create policy "borrar_devoluciones_ajustes" on devoluciones_ajustes for delete to authenticated using (es_administrador());
revoke all on devoluciones_ajustes from anon;
NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- 27. DEVOLUCIONES: la carga SOLO ESCRIBE LO NUEVO O LO QUE CAMBIÓ (antes reescribía personas y el último día completos en cada carga,
--     y cada reescritura deja versiones muertas de las filas que ocupan espacio en la base).
--       · Personas: solo si es nueva o cambió de nombre/código.
--       · Registro: se borra únicamente lo que YA NO está en el archivo (desde el último día guardado) y se escribe solo lo nuevo o distinto.
--       · Asistencia: solo los meses cuyos días cambiaron.
--     Si el archivo no trae nada nuevo, no se escribe NADA (la respuesta trae todo en cero).
-- =====================================================================
create or replace function devoluciones_importar(
  p_personas jsonb, p_dias jsonb, p_asistencia jsonb, p_razones jsonb,
  p_desde_reg date, p_desde_asis date, p_reemplazar boolean default false
) returns jsonb
language plpgsql security invoker set search_path = public, pg_temp
as $$
declare n_dias int := 0; n_borrados int := 0; n_asis int := 0; n_pers int := 0; max_reg date; max_asis date;
begin
  if not puede_editar() then raise exception 'No tienes permiso para cargar devoluciones.' using errcode = '42501'; end if;

  if p_reemplazar then
    delete from devoluciones_dia where true;
    delete from devoluciones_asistencia where true;
    p_desde_reg := null; p_desde_asis := null;
  end if;

  -- Personas: solo la que es nueva o cambió
  insert into devoluciones_personas (colaborador_id, nombre, codigo)
  select (x->>'i')::bigint, left(x->>'n', 160), nullif(x->>'c', '')::int from jsonb_array_elements(coalesce(p_personas, '[]'::jsonb)) x
  on conflict (colaborador_id) do update set nombre = excluded.nombre, codigo = coalesce(excluded.codigo, devoluciones_personas.codigo)
  where (devoluciones_personas.nombre, devoluciones_personas.codigo) is distinct from (excluded.nombre, coalesce(excluded.codigo, devoluciones_personas.codigo));
  get diagnostics n_pers = row_count;

  -- Registro: se borra lo que ya no está en el archivo (desde el último día guardado) …
  if p_desde_reg is not null then
    delete from devoluciones_dia d
    where d.fecha >= p_desde_reg
      and not exists (select 1 from jsonb_array_elements(coalesce(p_dias, '[]'::jsonb)) x where (x->>'f')::date = d.fecha and (x->>'i')::bigint = d.colaborador_id);
    get diagnostics n_borrados = row_count;
  end if;
  -- … y se escribe solo lo nuevo o distinto
  insert into devoluciones_dia (fecha, colaborador_id, codigo, razones, total, filas)
  select (x->>'f')::date, (x->>'i')::bigint, nullif(x->>'c', '')::int, coalesce(x->'r', '{}'::jsonb), (x->>'t')::int, coalesce((x->>'n')::smallint, 1)
  from jsonb_array_elements(coalesce(p_dias, '[]'::jsonb)) x
  on conflict (fecha, colaborador_id) do update set codigo = excluded.codigo, razones = excluded.razones, total = excluded.total, filas = excluded.filas
  where (devoluciones_dia.codigo, devoluciones_dia.razones, devoluciones_dia.total, devoluciones_dia.filas) is distinct from (excluded.codigo, excluded.razones, excluded.total, excluded.filas);
  get diagnostics n_dias = row_count;

  -- Asistencia: los meses anteriores al de "desde" no se tocan; en el mes de "desde" se conservan los días anteriores a esa fecha; solo se escribe si cambió
  insert into devoluciones_asistencia (colaborador_id, mes, dias)
  select (x->>'i')::bigint, (x->>'m')::date, (x->>'d')::int from jsonb_array_elements(coalesce(p_asistencia, '[]'::jsonb)) x
  on conflict (colaborador_id, mes) do update set dias = case
      when p_desde_asis is not null and excluded.mes = date_trunc('month', p_desde_asis)::date
        then (devoluciones_asistencia.dias & ((1 << (extract(day from p_desde_asis)::int - 1)) - 1)) | excluded.dias
      else excluded.dias end
  where devoluciones_asistencia.dias is distinct from (case
      when p_desde_asis is not null and excluded.mes = date_trunc('month', p_desde_asis)::date
        then (devoluciones_asistencia.dias & ((1 << (extract(day from p_desde_asis)::int - 1)) - 1)) | excluded.dias
      else excluded.dias end);
  get diagnostics n_asis = row_count;

  select max(fecha) into max_reg from devoluciones_dia;
  select max(mes + floor(log(2::numeric, dias::numeric))::int) into max_asis from devoluciones_asistencia where dias > 0;
  if n_dias + n_borrados + n_asis + n_pers > 0 or jsonb_array_length(coalesce(p_razones, '[]'::jsonb)) > 0 then
    update devoluciones_meta set
      ultima_fecha_registro = max_reg,
      ultima_fecha_asistencia = max_asis,
      razones = case when jsonb_array_length(coalesce(p_razones, '[]'::jsonb)) > 0 then p_razones else razones end,
      actualizado_en = now()
    where id = 1
      and (ultima_fecha_registro, ultima_fecha_asistencia, razones) is distinct from (max_reg, max_asis, case when jsonb_array_length(coalesce(p_razones, '[]'::jsonb)) > 0 then p_razones else razones end);
  end if;
  return jsonb_build_object('dias', n_dias, 'borrados', n_borrados, 'asistencia', n_asis, 'personas', n_pers);
end $$;
revoke all on function devoluciones_importar(jsonb, jsonb, jsonb, jsonb, date, date, boolean) from public, anon;
grant execute on function devoluciones_importar(jsonb, jsonb, jsonb, jsonb, date, date, boolean) to authenticated;
NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- 28. RESPALDO GLOBAL: vaciar los datos OPERATIVOS de la base (lo que se acumula día a día y la llena).
--     · SOLO el Administrador puede ejecutarla, y exige la confirmación literal (la app además pide transcribir una frase y
--       haber descargado antes el respaldo en Excel).
--     · Se CONSERVAN: usuarios y roles, configuración, personas, líneas, formadoras, el código de las personas de devoluciones,
--       los mínimos de devoluciones y las notas/contraseñas. Todo lo demás se vacía con TRUNCATE (devuelve el espacio de inmediato).
--     · Sin CASCADE a propósito: si alguna tabla que se conserva dependiera de una que se vacía, la función se detiene en vez de borrarla.
--     · Deja un registro (quién y cuándo) en respaldo_eventos, que no se borra nunca.
-- =====================================================================
create table if not exists respaldo_eventos (
  id             bigint generated always as identity primary key,
  fecha          timestamptz not null default now(),
  usuario        uuid,
  usuario_nombre text,
  accion         text not null,
  detalle        jsonb not null default '{}'::jsonb
);
alter table respaldo_eventos enable row level security;
drop policy if exists "leer_respaldo_eventos" on respaldo_eventos;
create policy "leer_respaldo_eventos" on respaldo_eventos for select to authenticated using (es_administrador());
revoke all on respaldo_eventos from anon;

create or replace function vaciar_datos_operativos(p_confirmacion text)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  tablas text[] := array['rendimiento_historico', 'historico_bloques', 'rendimiento_actual', 'metas_diarias', 'descansos_diarios',
    'clasificacion_cargas', 'clasificacion_hora', 'clasificacion_historico', 'devoluciones_dia', 'devoluciones_asistencia',
    'asignaciones_diarias', 'asignaciones_clasificador', 'tablero_formadoras', 'lineas_dia', 'formadora_linea', 'metas_linea_mes'];
  t text; n bigint; conteos jsonb := '{}'::jsonb; total bigint := 0; existentes text[] := '{}'; quien text;
begin
  if not es_administrador() then raise exception 'Solo un administrador puede vaciar la base de datos.' using errcode = '42501'; end if;
  if p_confirmacion is distinct from 'VACIAR_DATOS_OPERATIVOS' then raise exception 'Confirmación inválida: no se eliminó nada.' using errcode = '22023'; end if;

  foreach t in array tablas loop
    if to_regclass('public.' || t) is null then continue; end if;          -- una tabla que aún no existe se omite
    execute format('select count(*) from public.%I', t) into n;
    conteos := conteos || jsonb_build_object(t, n); total := total + n; existentes := existentes || t;
  end loop;

  if array_length(existentes, 1) is not null then
    execute 'truncate table ' || (select string_agg(format('public.%I', x), ', ') from unnest(existentes) x) || ' restart identity';
  end if;
  if to_regclass('public.devoluciones_meta') is not null then
    update devoluciones_meta set ultima_fecha_registro = null, ultima_fecha_asistencia = null, actualizado_en = now() where id = 1;
  end if;

  select nombre into quien from perfiles where id = auth.uid();
  insert into respaldo_eventos (usuario, usuario_nombre, accion, detalle) values (auth.uid(), quien, 'vaciar_datos_operativos', jsonb_build_object('filas', total, 'tablas', conteos));
  return jsonb_build_object('filas', total, 'tablas', conteos);
end $$;
revoke all on function vaciar_datos_operativos(text) from public, anon;
grant execute on function vaciar_datos_operativos(text) to authenticated;
NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- 29. LÍNEAS: "Asigna un clasificador a un bonchador". Cada DÍA se asigna a un clasificador (una persona del módulo Personas)
--     con un bonchador. Ese día el clasificador toma, para el Tablero Integrado del Colaborador, la ASISTENCIA (cuenta como si hubiera
--     venido), el RENDIMIENTO y las DEVOLUCIONES (calidad) del bonchador asignado. Si cambia de bonchador, cada día guarda el suyo.
--     · Un clasificador tiene un solo bonchador por día (si se cambia el mismo día, se reemplaza).
--     · Todos los usuarios con sesión LEEN; solo quien puede editar (Administrador, Ingeniero, Profesional, Digitador) asigna o quita.
--       Supervisor y Formador son solo lectura.
-- =====================================================================
create table if not exists asignaciones_clasificador (
  id               bigint generated always as identity primary key,
  fecha            date   not null,
  clasificador_id  bigint not null references personas(id) on delete cascade,
  bonchador_id     bigint not null references personas(id) on delete cascade,
  creado_por       uuid   default auth.uid(),
  creado_en        timestamptz not null default now(),
  unique (fecha, clasificador_id),
  check (clasificador_id <> bonchador_id)
);
create index if not exists idx_asig_clasif_fecha on asignaciones_clasificador (fecha);
create index if not exists idx_asig_clasif_bonchador on asignaciones_clasificador (bonchador_id, fecha);
alter table asignaciones_clasificador enable row level security;
do $$ declare pol record; begin
  for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'asignaciones_clasificador' loop
    execute format('drop policy %I on public.asignaciones_clasificador', pol.policyname);
  end loop;
end $$;
create policy "leer_asig_clasificador" on asignaciones_clasificador for select to authenticated using (true);
create policy "insertar_asig_clasificador" on asignaciones_clasificador for insert to authenticated with check (puede_editar());
create policy "actualizar_asig_clasificador" on asignaciones_clasificador for update to authenticated using (puede_editar()) with check (puede_editar());
create policy "borrar_asig_clasificador" on asignaciones_clasificador for delete to authenticated using (puede_editar());
revoke all on asignaciones_clasificador from anon;
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table asignaciones_clasificador; exception when duplicate_object then null; end;
  end if;
end $$;
NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- 30. COPIA DE SEGURIDAD DE LA BASE DE DATOS (archivo .tmbackup que la app exporta e importa) y DEPURACIÓN SEMESTRAL.
--     Todo es SOLO para el Administrador.
--     · restaurar_tabla: inserta filas de una copia en una tabla de la lista (sin pisar las que ya existen; respeta los ID originales).
--       La lista NO incluye "perfiles": los usuarios nunca se restauran desde una copia.
--     · restablecer_secuencias: deja los contadores (ID automáticos) por encima del mayor ID restaurado.
--     · depurar_datos_anteriores: elimina lo anterior a una fecha de corte, que debe tener al menos 6 meses de antigüedad.
--     · registrar_respaldo: deja constancia (quién y cuándo) de una copia manual, mensual o importada.
--     · Bucket privado "respaldos" en Storage para las copias automáticas mensuales (no ocupa espacio de la base de datos).
-- =====================================================================
create or replace function restaurar_tabla(p_tabla text, p_filas jsonb)
returns integer
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  permitidas text[] := array['configuracion', 'personas', 'lineas', 'formadoras', 'devoluciones_personas', 'devoluciones_meta', 'devoluciones_ajustes',
    'rendimiento_historico', 'historico_bloques', 'rendimiento_actual', 'metas_diarias', 'descansos_diarios', 'clasificacion_cargas', 'clasificacion_hora',
    'clasificacion_historico', 'devoluciones_dia', 'devoluciones_asistencia', 'asignaciones_diarias', 'asignaciones_clasificador', 'tablero_formadoras',
    'lineas_dia', 'formadora_linea', 'metas_linea_mes'];
  n integer := 0;
begin
  if not es_administrador() then raise exception 'Solo un administrador puede restaurar una copia de seguridad.' using errcode = '42501'; end if;
  if not (p_tabla = any(permitidas)) then raise exception 'La tabla "%" no se puede restaurar.', p_tabla using errcode = '22023'; end if;
  if to_regclass('public.' || p_tabla) is null then raise exception 'La tabla "%" no existe en esta base de datos.', p_tabla using errcode = '42P01'; end if;
  if p_filas is null or jsonb_typeof(p_filas) <> 'array' or jsonb_array_length(p_filas) = 0 then return 0; end if;
  execute format('insert into public.%I overriding system value select * from jsonb_populate_recordset(null::public.%I, $1) on conflict do nothing', p_tabla, p_tabla) using p_filas;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function restaurar_tabla(text, jsonb) from public, anon;
grant execute on function restaurar_tabla(text, jsonb) to authenticated;

create or replace function restablecer_secuencias()
returns integer
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  tablas text[] := array['configuracion', 'personas', 'lineas', 'formadoras', 'devoluciones_meta', 'devoluciones_ajustes', 'rendimiento_historico', 'historico_bloques',
    'rendimiento_actual', 'asignaciones_diarias', 'asignaciones_clasificador', 'tablero_formadoras'];
  t text; sec text; n integer := 0;
begin
  if not es_administrador() then raise exception 'Solo un administrador puede hacer esto.' using errcode = '42501'; end if;
  foreach t in array tablas loop
    if to_regclass('public.' || t) is null then continue; end if;
    sec := pg_get_serial_sequence(format('public.%I', t), 'id');
    if sec is null then continue; end if;
    execute format('select setval(%L, greatest(coalesce((select max(id) from public.%I), 0), 1), (select max(id) is not null from public.%I))', sec, t, t);
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function restablecer_secuencias() from public, anon;
grant execute on function restablecer_secuencias() to authenticated;

create or replace function depurar_datos_anteriores(p_corte date, p_confirmacion text)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  tablas text[] := array['rendimiento_historico', 'historico_bloques', 'rendimiento_actual', 'metas_diarias', 'descansos_diarios', 'clasificacion_cargas',
    'clasificacion_hora', 'clasificacion_historico', 'devoluciones_dia', 'asignaciones_diarias', 'asignaciones_clasificador', 'tablero_formadoras',
    'lineas_dia', 'formadora_linea'];
  t text; n bigint; conteos jsonb := '{}'::jsonb; total bigint := 0; quien text;
begin
  if not es_administrador() then raise exception 'Solo un administrador puede depurar la base de datos.' using errcode = '42501'; end if;
  if p_confirmacion is distinct from 'DEPURAR_DATOS_ANTIGUOS' then raise exception 'Confirmación inválida: no se eliminó nada.' using errcode = '22023'; end if;
  if p_corte is null or p_corte > (current_date - interval '6 months')::date then
    raise exception 'La fecha de corte debe tener al menos 6 meses de antigüedad. No se eliminó nada.' using errcode = '22023';
  end if;
  foreach t in array tablas loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('delete from public.%I where fecha < $1', t) using p_corte;
    get diagnostics n = row_count;
    conteos := conteos || jsonb_build_object(t, n); total := total + n;
  end loop;
  if to_regclass('public.devoluciones_asistencia') is not null then
    delete from devoluciones_asistencia where mes < date_trunc('month', p_corte)::date;
    get diagnostics n = row_count;
    conteos := conteos || jsonb_build_object('devoluciones_asistencia', n); total := total + n;
  end if;
  select nombre into quien from perfiles where id = auth.uid();
  insert into respaldo_eventos (usuario, usuario_nombre, accion, detalle) values (auth.uid(), quien, 'depuracion_semestral', jsonb_build_object('corte', p_corte, 'filas', total, 'tablas', conteos));
  return jsonb_build_object('corte', p_corte, 'filas', total, 'tablas', conteos);
end $$;
revoke all on function depurar_datos_anteriores(date, text) from public, anon;
grant execute on function depurar_datos_anteriores(date, text) to authenticated;

create or replace function registrar_respaldo(p_accion text, p_detalle jsonb default '{}'::jsonb)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
declare quien text;
begin
  if not es_administrador() then raise exception 'Solo un administrador puede registrar copias de seguridad.' using errcode = '42501'; end if;
  if p_accion not in ('backup_manual', 'backup_mensual', 'backup_importado') then raise exception 'Acción no válida.' using errcode = '22023'; end if;
  select nombre into quien from perfiles where id = auth.uid();
  insert into respaldo_eventos (usuario, usuario_nombre, accion, detalle) values (auth.uid(), quien, p_accion, coalesce(p_detalle, '{}'::jsonb));
end $$;
revoke all on function registrar_respaldo(text, jsonb) from public, anon;
grant execute on function registrar_respaldo(text, jsonb) to authenticated;

-- Bucket privado para las copias automáticas mensuales (solo si existe Storage en este proyecto)
do $$ begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public) values ('respaldos', 'respaldos', false) on conflict (id) do nothing;
  end if;
  if to_regclass('storage.objects') is not null then
    execute 'drop policy if exists "respaldos_admin_leer" on storage.objects';
    execute 'drop policy if exists "respaldos_admin_subir" on storage.objects';
    execute 'drop policy if exists "respaldos_admin_actualizar" on storage.objects';
    execute 'drop policy if exists "respaldos_admin_borrar" on storage.objects';
    execute $p$create policy "respaldos_admin_leer" on storage.objects for select to authenticated using (bucket_id = 'respaldos' and public.es_administrador())$p$;
    execute $p$create policy "respaldos_admin_subir" on storage.objects for insert to authenticated with check (bucket_id = 'respaldos' and public.es_administrador())$p$;
    execute $p$create policy "respaldos_admin_actualizar" on storage.objects for update to authenticated using (bucket_id = 'respaldos' and public.es_administrador()) with check (bucket_id = 'respaldos' and public.es_administrador())$p$;
    execute $p$create policy "respaldos_admin_borrar" on storage.objects for delete to authenticated using (bucket_id = 'respaldos' and public.es_administrador())$p$;
  end if;
end $$;
NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- 31. ESPACIO: cuánto ocupa cada tabla (para estimar cuándo se llena la base de datos y qué la llena).
--     Solo el Administrador. Devuelve, por tabla, el tamaño en bytes (con índices) y el número de filas.
-- =====================================================================
create or replace function uso_por_tabla()
returns table (tabla text, bytes bigint, filas bigint)
language plpgsql security definer stable set search_path = public, pg_temp
as $$
declare
  t text;
  tablas text[] := array['rendimiento_historico', 'historico_bloques', 'rendimiento_actual', 'metas_diarias', 'descansos_diarios', 'clasificacion_cargas', 'clasificacion_hora', 'clasificacion_historico', 'devoluciones_dia', 'devoluciones_asistencia', 'asignaciones_diarias', 'asignaciones_clasificador', 'tablero_formadoras', 'lineas_dia', 'formadora_linea', 'metas_linea_mes', 'personas', 'lineas', 'formadoras', 'devoluciones_personas', 'devoluciones_meta', 'devoluciones_ajustes', 'configuracion', 'perfiles'];
begin
  if not es_administrador() then raise exception 'Solo un administrador puede ver el uso de espacio.' using errcode = '42501'; end if;
  foreach t in array tablas loop
    if to_regclass('public.' || t) is null then continue; end if;
    tabla := t;
    bytes := pg_total_relation_size(format('public.%I', t)::regclass);
    execute format('select count(*) from public.%I', t) into filas;
    return next;
  end loop;
end $$;
revoke all on function uso_por_tabla() from public, anon;
grant execute on function uso_por_tabla() to authenticated;
NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- 32. RESÚMENES AUTOMÁTICOS POR WHATSAPP. Todo es SOLO para el Administrador (hay números de teléfono).
-- (YA NO SE USA: los resúmenes ahora solo se ven, descargan y copian desde la app, sin envíos por WhatsApp. Esta sección se puede omitir.)
--     · resumen_config: quién envía ("de parte de"), el nombre de la finca y si se avisa antes de enviar.
--     · resumen_destinos: a quién se envía (nombre + número), qué resumen (general o el de una formadora) y cada cuánto (semanal / mensual).
--     · resumen_envios: el registro de cada envío. Antes de enviar queda en estado "aviso" (se puede CANCELAR); luego "enviado", "cancelado" o "error".
--     Lo envían las tareas programadas del servidor (vercel.json → /api/cron-diario) con la llave de servicio, que no depende de estas políticas.
-- =====================================================================
create table if not exists resumen_config (
  id             smallint primary key default 1 check (id = 1),
  remitente      text not null default '',
  finca          text not null default 'Finca Torremolinos',
  aviso_previo   boolean not null default true,
  actualizado_en timestamptz not null default now()
);
insert into resumen_config (id) values (1) on conflict (id) do nothing;
create table if not exists resumen_destinos (
  id           bigint generated always as identity primary key,
  nombre       text not null check (length(trim(nombre)) > 0),
  numero       text not null check (numero ~ '^\+?[0-9]{8,15}$'),
  tipo         text not null default 'general' check (tipo in ('general', 'formadora')),
  formadora_id bigint references formadoras(id) on delete cascade,
  semanal      boolean not null default true,
  mensual      boolean not null default false,
  activo       boolean not null default true,
  creado_en    timestamptz not null default now(),
  check (tipo <> 'formadora' or formadora_id is not null)
);
create table if not exists resumen_envios (
  id             bigint generated always as identity primary key,
  destino_id     bigint not null references resumen_destinos(id) on delete cascade,
  frecuencia     text not null check (frecuencia in ('semanal', 'mensual', 'manual')),
  desde          date not null,
  hasta          date not null,
  programado_para timestamptz,
  estado         text not null default 'aviso' check (estado in ('aviso', 'cancelado', 'enviado', 'error')),
  detalle        jsonb not null default '{}'::jsonb,
  creado_en      timestamptz not null default now(),
  unique (destino_id, frecuencia, desde)
);
do $$ declare t text; pol record; begin
  foreach t in array array['resumen_config', 'resumen_destinos', 'resumen_envios'] loop
    execute format('alter table public.%I enable row level security', t);
    for pol in select policyname from pg_policies where schemaname = 'public' and tablename = t loop execute format('drop policy %I on public.%I', pol.policyname, t); end loop;
    execute format('create policy "admin_leer_%s" on public.%I for select to authenticated using (es_administrador())', t, t);
    execute format('create policy "admin_insertar_%s" on public.%I for insert to authenticated with check (es_administrador())', t, t);
    execute format('create policy "admin_actualizar_%s" on public.%I for update to authenticated using (es_administrador()) with check (es_administrador())', t, t);
    execute format('create policy "admin_borrar_%s" on public.%I for delete to authenticated using (es_administrador())', t, t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table resumen_envios; exception when duplicate_object then null; end;
  end if;
end $$;
NOTIFY pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- 33) SOLO Administrador, Ingeniero y Digitador pueden editar
--     Profesional, Supervisor y Formador quedan en SOLO VISUALIZACIÓN: la base de datos
--     también lo impide (todas las políticas de escritura usan puede_editar()).
-- ---------------------------------------------------------------------
create or replace function puede_editar()
returns boolean language sql security definer stable set search_path = public, pg_temp
as $$ select exists (select 1 from public.perfiles where id = auth.uid() and activo = true and rol in ('administrador', 'ingeniero', 'digitador')); $$;

revoke all on function puede_editar() from public, anon;
grant execute on function puede_editar() to authenticated;

-- ---------------------------------------------------------------------
-- 34) TURNO ACTUAL: las horas se guardan y todo se reinicia solo a las 6 a. m.
--     · turno_actual_horas conserva cada bloque horario de cada persona del día, aunque un reporte nuevo reemplace al anterior
--       (de ahí sale la evaluación "cómo mejoró o empeoró hora por hora").
--     · limpiar_turno_actual() borra SOLO lo del Turno Actual (rendimiento_actual y turno_actual_horas) de días anteriores.
--       El "día del turno" cambia a las 6:00 a. m. (hora de Colombia). No toca el Histórico.
-- ---------------------------------------------------------------------
create table if not exists turno_actual_horas (
  fecha                 date    not null,
  colaborador_id        integer not null references personas(id) on delete cascade,
  hora_inicio           time    not null,
  hora_fin              time    not null,
  total_tallos          integer not null default 0,
  tiempo_trabajado_min  numeric,
  rend_tallos           integer not null default 0,
  guardado_en           timestamptz not null default now(),
  primary key (fecha, colaborador_id, hora_inicio)
);
create index if not exists idx_turno_horas_fecha on turno_actual_horas (fecha);
alter table turno_actual_horas enable row level security;
drop policy if exists "leer_turno_horas" on turno_actual_horas;
drop policy if exists "escribir_turno_horas" on turno_actual_horas;
drop policy if exists "actualizar_turno_horas" on turno_actual_horas;
drop policy if exists "borrar_turno_horas" on turno_actual_horas;
create policy "leer_turno_horas" on turno_actual_horas for select using (auth.role() = 'authenticated');
create policy "escribir_turno_horas" on turno_actual_horas for insert with check (puede_editar());
create policy "actualizar_turno_horas" on turno_actual_horas for update using (puede_editar());
create policy "borrar_turno_horas" on turno_actual_horas for delete using (puede_editar());

create or replace function turno_fecha() returns date language sql stable
as $$ select ((now() at time zone 'America/Bogota') - interval '6 hours')::date $$;

create or replace function limpiar_turno_actual() returns integer language plpgsql security definer set search_path = public, pg_temp
as $$
declare a integer := 0; b integer := 0;
begin
  delete from rendimiento_actual where fecha < turno_fecha();   get diagnostics a = row_count;
  delete from turno_actual_horas where fecha < turno_fecha();   get diagnostics b = row_count;
  return a + b;
end;
$$;
revoke all on function limpiar_turno_actual() from public, anon;
grant execute on function limpiar_turno_actual() to authenticated;

-- ---------------------------------------------------------------------
-- 35) TABLERO DE SEGURIDAD (solo Administrador)
--     seguridad_estado() junta lo que la app no puede leer sola: el último acceso de cada cuenta (auth.users) y si cada tabla
--     tiene la seguridad por filas (RLS) activa. Si quien llama no es Administrador, falla con "permiso denegado".
-- ---------------------------------------------------------------------
create or replace function seguridad_estado()
returns jsonb
language plpgsql security definer stable set search_path = public, auth, pg_temp
as $$
declare r jsonb;
begin
  if not es_administrador() then
    raise exception 'Solo el Administrador puede ver el tablero de seguridad.' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'ahora', now(),
    'usuarios', coalesce((select jsonb_agg(jsonb_build_object(
        'id', p.id, 'nombre', p.nombre, 'rol', p.rol, 'activo', p.activo,
        'ultimo_acceso', u.last_sign_in_at, 'creado', u.created_at) order by p.nombre)
      from public.perfiles p left join auth.users u on u.id = p.id), '[]'::jsonb),
    'tablas', coalesce((select jsonb_agg(jsonb_build_object(
        'tabla', c.relname, 'rls', c.relrowsecurity,
        'politicas', (select count(*) from pg_policies pp where pp.schemaname = 'public' and pp.tablename = c.relname)) order by c.relname)
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'), '[]'::jsonb)
  ) into r;
  return r;
end;
$$;
revoke all on function seguridad_estado() from public, anon;
grant execute on function seguridad_estado() to authenticated;

-- ---------------------------------------------------------------------
-- 36) MI PERFIL: cada persona puede cambiar SU propio nombre (nada más: ni el rol ni si está activa)
--     El avatar de flores se guarda en los datos de la cuenta (user_metadata), no necesita SQL.
-- ---------------------------------------------------------------------
create or replace function actualizar_mi_nombre(p_nombre text)
returns text
language plpgsql security definer set search_path = public, pg_temp
as $$
declare n text := regexp_replace(btrim(coalesce(p_nombre, '')), '\s+', ' ', 'g');
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión.' using errcode = '42501'; end if;
  if char_length(n) < 2 or char_length(n) > 60 then raise exception 'El nombre debe tener entre 2 y 60 letras.' using errcode = '22023'; end if;
  if n ~ '[<>]' then raise exception 'El nombre no puede llevar los signos < ni >.' using errcode = '22023'; end if;
  update public.perfiles set nombre = n where id = auth.uid() and activo = true;
  if not found then raise exception 'No se encontró tu perfil.' using errcode = 'P0002'; end if;
  return n;
end;
$$;
revoke all on function actualizar_mi_nombre(text) from public, anon;
grant execute on function actualizar_mi_nombre(text) to authenticated;

-- ---------------------------------------------------------------------
-- 37) ACTIVIDAD DE LAS CUENTAS, REGISTRO DE ERRORES Y PERMISO DE EDICIÓN POR PERSONA
--     · perfiles.edicion: el Administrador decide por persona si SOLO VE ('ver'), si PUEDE EDITAR ('editar') o si vale el de su rol ('rol').
--       El Administrador siempre edita. Nadie más puede cambiar este permiso (lo impide un candado en la base).
--     · accesos: cada entrada a la app (una cada 20 minutos por persona) → ranking de quién entra más y menos.
--     · errores_app: los errores que ven las personas (sin datos personales) → el Administrador los ve por persona en Seguridad.
--     Estas tablas no se leen directo (sin políticas): solo las funciones de abajo, y las de lectura son solo del Administrador.
-- ---------------------------------------------------------------------
alter table perfiles add column if not exists edicion text not null default 'rol';
alter table perfiles drop constraint if exists perfiles_edicion_valida;
alter table perfiles add constraint perfiles_edicion_valida check (edicion in ('rol', 'ver', 'editar'));

create or replace function puede_editar()
returns boolean
language sql security definer stable set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.perfiles
    where id = auth.uid() and activo = true
      and (rol = 'administrador' or edicion = 'editar' or (edicion = 'rol' and rol in ('administrador', 'ingeniero', 'digitador')))
  );
$$;
revoke all on function puede_editar() from public, anon;
grant execute on function puede_editar() to authenticated;

create or replace function proteger_edicion() returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if new.edicion is distinct from old.edicion and auth.uid() is not null and not coalesce(es_administrador(), false) then
    raise exception 'Solo el Administrador puede cambiar el permiso de edición.' using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_proteger_edicion on perfiles;
create trigger trg_proteger_edicion before update on perfiles for each row execute function proteger_edicion();

create or replace function cambiar_edicion(p_id uuid, p_edicion text) returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not coalesce(es_administrador(), false) then raise exception 'Solo el Administrador puede cambiar este permiso.' using errcode = '42501'; end if;
  if p_edicion not in ('rol', 'ver', 'editar') then raise exception 'Valor no válido.' using errcode = '22023'; end if;
  update public.perfiles set edicion = p_edicion where id = p_id;
  if not found then raise exception 'No se encontró esa cuenta.' using errcode = 'P0002'; end if;
end;
$$;
revoke all on function cambiar_edicion(uuid, text) from public, anon;
grant execute on function cambiar_edicion(uuid, text) to authenticated;

create table if not exists accesos (
  id bigint generated always as identity primary key,
  usuario_id uuid not null,
  fecha timestamptz not null default now(),
  dispositivo text
);
create index if not exists idx_accesos_usuario_fecha on accesos (usuario_id, fecha desc);
create index if not exists idx_accesos_fecha on accesos (fecha);
alter table accesos enable row level security;
drop policy if exists "admin_lee_accesos" on accesos;
create policy "admin_lee_accesos" on accesos for select using (coalesce(es_administrador(), false));    -- solo el Administrador las puede leer; se escribe únicamente con las funciones de abajo

create table if not exists errores_app (
  id bigint generated always as identity primary key,
  usuario_id uuid,
  fecha timestamptz not null default now(),
  ruta text, dispositivo text, mensaje text, ref text, origen text
);
create index if not exists idx_errores_fecha on errores_app (fecha desc);
create index if not exists idx_errores_usuario on errores_app (usuario_id, fecha desc);
alter table errores_app enable row level security;
drop policy if exists "admin_lee_errores" on errores_app;
create policy "admin_lee_errores" on errores_app for select using (coalesce(es_administrador(), false));

create or replace function registrar_acceso(p_dispositivo text default null) returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then return; end if;
  if exists (select 1 from accesos where usuario_id = auth.uid() and fecha > now() - interval '20 minutes') then return; end if;
  insert into accesos (usuario_id, dispositivo) values (auth.uid(), left(coalesce(p_dispositivo, ''), 12));
  delete from accesos where fecha < now() - interval '120 days';
end;
$$;
revoke all on function registrar_acceso(text) from public, anon;
grant execute on function registrar_acceso(text) to authenticated;

create or replace function registrar_error(p_ruta text, p_mensaje text, p_ref text default null, p_dispositivo text default null, p_origen text default null) returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then return; end if;
  if (select count(*) from errores_app where usuario_id = auth.uid() and fecha > now() - interval '1 hour') >= 40 then return; end if;
  insert into errores_app (usuario_id, ruta, dispositivo, mensaje, ref, origen)
  values (auth.uid(), left(coalesce(p_ruta, ''), 120), left(coalesce(p_dispositivo, ''), 12), left(coalesce(p_mensaje, ''), 300), left(coalesce(p_ref, ''), 8), left(coalesce(p_origen, ''), 20));
  delete from errores_app where fecha < now() - interval '60 days';
end;
$$;
revoke all on function registrar_error(text, text, text, text, text) from public, anon;
grant execute on function registrar_error(text, text, text, text, text) to authenticated;

create or replace function seguridad_actividad(p_dias integer default 30) returns jsonb
language plpgsql security definer stable set search_path = public, pg_temp
as $$
declare d integer := greatest(1, least(coalesce(p_dias, 30), 120)); r jsonb;
begin
  if not coalesce(es_administrador(), false) then raise exception 'Solo el Administrador puede ver la actividad.' using errcode = '42501'; end if;
  select jsonb_build_object(
    'dias', d, 'ahora', now(),
    'accesos', coalesce((select jsonb_agg(x) from (
        select usuario_id, count(*) as entradas, count(distinct (fecha at time zone 'America/Bogota')::date) as dias_activos, max(fecha) as ultimo,
               count(*) filter (where dispositivo = 'movil') as movil, count(*) filter (where dispositivo = 'pc') as pc
        from accesos where fecha > now() - make_interval(days => d) group by usuario_id) x), '[]'::jsonb),
    'ultimos', coalesce((select jsonb_agg(x) from (select usuario_id, max(fecha) as ultimo from accesos group by usuario_id) x), '[]'::jsonb),
    'errores', coalesce((select jsonb_agg(x) from (
        select usuario_id, count(*) as total, max(fecha) as ultimo, count(distinct ref) as distintos
        from errores_app where fecha > now() - make_interval(days => d) group by usuario_id) x), '[]'::jsonb),
    'recientes', coalesce((select jsonb_agg(x) from (
        select fecha, usuario_id, ruta, dispositivo, mensaje, ref, origen from errores_app order by fecha desc limit 25) x), '[]'::jsonb)
  ) into r;
  return r;
end;
$$;
revoke all on function seguridad_actividad(integer) from public, anon;
grant execute on function seguridad_actividad(integer) to authenticated;

-- seguridad_estado() (sección 35) ahora también dice el permiso de edición de cada cuenta
create or replace function seguridad_estado()
returns jsonb
language plpgsql security definer stable set search_path = public, auth, pg_temp
as $$
declare r jsonb;
begin
  if not coalesce(es_administrador(), false) then
    raise exception 'Solo el Administrador puede ver el tablero de seguridad.' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'ahora', now(),
    'usuarios', coalesce((select jsonb_agg(jsonb_build_object(
        'id', p.id, 'nombre', p.nombre, 'rol', p.rol, 'activo', p.activo, 'edicion', p.edicion,
        'ultimo_acceso', u.last_sign_in_at, 'creado', u.created_at) order by p.nombre)
      from public.perfiles p left join auth.users u on u.id = p.id), '[]'::jsonb),
    'tablas', coalesce((select jsonb_agg(jsonb_build_object(
        'tabla', c.relname, 'rls', c.relrowsecurity,
        'politicas', (select count(*) from pg_policies pp where pp.schemaname = 'public' and pp.tablename = c.relname)) order by c.relname)
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'), '[]'::jsonb)
  ) into r;
  return r;
end;
$$;
revoke all on function seguridad_estado() from public, anon;
grant execute on function seguridad_estado() to authenticated;

