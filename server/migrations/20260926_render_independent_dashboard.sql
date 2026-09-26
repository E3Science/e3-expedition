-- Render-independent dashboard access. Safe to run repeatedly.

create or replace function public.e3_can_access_class(requested_class_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    coalesce(auth.jwt() -> 'app_metadata' ->> 'e3_role', '') = 'teacher'
    or lower(coalesce(auth.jwt() ->> 'email', '')) = 'mnelsen@susd.net'
    or exists (
      select 1 from public.class_memberships membership
      where membership.user_id = auth.uid()
        and membership.class_id = requested_class_id
    );
$$;

revoke all on function public.e3_can_access_class(uuid) from public, anon;
grant execute on function public.e3_can_access_class(uuid) to authenticated, service_role;

create or replace function public.e3_current_class()
returns table (id uuid, code text, name text)
language sql stable security definer set search_path = public as $$
  select classes.class_id, classes.class_code, coalesce(classes.class_name, classes.class_code)
  from public.class_memberships memberships
  join public.classes on classes.class_id = memberships.class_id
  where memberships.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.e3_teacher_classes()
returns table (id uuid, code text, name text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'e3_role', '') = 'teacher'
    or lower(coalesce(auth.jwt() ->> 'email', '')) = 'mnelsen@susd.net'
  ) then
    raise exception 'Teacher access required' using errcode = '42501';
  end if;
  return query
    select classes.class_id, classes.class_code, coalesce(classes.class_name, classes.class_code)
    from public.classes
    order by coalesce(classes.class_name, classes.class_code);
end;
$$;

revoke all on function public.e3_current_class() from public, anon;
revoke all on function public.e3_teacher_classes() from public, anon;
grant execute on function public.e3_current_class() to authenticated, service_role;
grant execute on function public.e3_teacher_classes() to authenticated, service_role;

alter table public.inventories enable row level security;
drop policy if exists "students can read their class inventory" on public.inventories;
create policy "students can read their class inventory"
  on public.inventories for select to authenticated
  using (
    user_id = auth.uid()
    and public.e3_can_access_class(class_id)
  );

revoke all on table public.inventories from authenticated;
grant select on table public.inventories to authenticated;
grant select, insert, update, delete on table public.inventories to service_role;
