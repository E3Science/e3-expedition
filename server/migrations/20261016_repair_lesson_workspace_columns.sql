-- Repair migration for lesson workspaces that applied later migrations out of order.
-- Safe to run repeatedly in the Supabase SQL editor.

alter table public.lesson_records
  add column if not exists assignments jsonb not null default '[]'::jsonb;

alter table public.lesson_records
  add column if not exists notebook_pages jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'lesson_records_assignments_is_array'
  ) then
    alter table public.lesson_records
      add constraint lesson_records_assignments_is_array
      check (jsonb_typeof(assignments) = 'array');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'lesson_records_notebook_pages_is_array'
  ) then
    alter table public.lesson_records
      add constraint lesson_records_notebook_pages_is_array
      check (jsonb_typeof(notebook_pages) = 'array');
  end if;
end $$;

grant select, insert, update, delete on public.lesson_records to authenticated, service_role;

-- Ask PostgREST to discover the new columns immediately.
notify pgrst, 'reload schema';
