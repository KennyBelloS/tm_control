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
