-- E3 explicit Supabase Data API grants.
-- Safe to run repeatedly in the Supabase SQL Editor.
--
-- Browser-accessible tables:
--   profiles     Signed-in users load/create their own profile (RLS remains required).
--   room_layouts The signed-in teacher can save layouts (RLS remains required).
--
-- Server-only tables:
--   All class, roster, inventory, Classroom-token, and editor metadata access
--   is performed by the trusted multiplayer server with the service-role key.

do $migration$
declare
  table_name text;
begin
  -- These tables must never be directly available to unauthenticated clients.
  foreach table_name in array array[
    'profiles',
    'room_layouts',
    'tileset_frame_metadata',
    'classes',
    'class_memberships',
    'inventories',
    'google_classroom_connections',
    'google_classroom_roster'
  ] loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('revoke all on table public.%I from anon', table_name);
    end if;
  end loop;

  -- Tables containing student data or Google credentials are server-only.
  foreach table_name in array array[
    'classes',
    'class_memberships',
    'inventories',
    'google_classroom_connections',
    'google_classroom_roster',
    'tileset_frame_metadata'
  ] loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('revoke all on table public.%I from authenticated', table_name);
      execute format(
        'grant select, insert, update, delete on table public.%I to service_role',
        table_name
      );
    end if;
  end loop;

  -- Profiles are used directly by signed-in clients. RLS must restrict each
  -- student to their own row.
  if to_regclass('public.profiles') is not null then
    revoke all on table public.profiles from authenticated;
    grant select, insert, update on table public.profiles to authenticated;
    grant select, insert, update, delete on table public.profiles to service_role;
  end if;

  -- The browser-based teacher editor upserts room layouts. Existing RLS must
  -- continue to restrict writes to the teacher account.
  if to_regclass('public.room_layouts') is not null then
    revoke all on table public.room_layouts from authenticated;
    grant select, insert, update on table public.room_layouts to authenticated;
    grant select, insert, update, delete on table public.room_layouts to service_role;
  end if;
end
$migration$;

-- Confirm the resulting privileges after the migration runs.
select
  table_name,
  grantee,
  string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'profiles',
    'room_layouts',
    'tileset_frame_metadata',
    'classes',
    'class_memberships',
    'inventories',
    'google_classroom_connections',
    'google_classroom_roster'
  )
  and grantee in ('anon', 'authenticated', 'service_role')
group by table_name, grantee
order by table_name, grantee;
