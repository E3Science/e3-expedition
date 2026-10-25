alter table public.video_labs add column if not exists start_seconds integer not null default 0;
alter table public.video_labs add column if not exists end_seconds integer;
alter table public.video_labs add column if not exists cuts jsonb not null default '[]'::jsonb;

create table if not exists public.learning_lab_access(
  access_id uuid primary key default gen_random_uuid(),
  lab_key text not null check(lab_key in('original','archive','flashcards','video','plate-motion')),
  class_id uuid references public.classes(class_id) on delete cascade,
  enabled boolean not null default true,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
create unique index if not exists learning_lab_global_unique on public.learning_lab_access(lab_key) where class_id is null;
create unique index if not exists learning_lab_class_unique on public.learning_lab_access(lab_key,class_id) where class_id is not null;
alter table public.learning_lab_access enable row level security;
drop policy if exists "authenticated read lab access" on public.learning_lab_access;
create policy "authenticated read lab access" on public.learning_lab_access for select to authenticated using(true);
grant select on public.learning_lab_access to authenticated;

create or replace function public.e3_learning_lab_access(requested_class_id uuid)
returns jsonb language sql stable security definer set search_path=public as $$
  select jsonb_build_object(
    'global',coalesce((select jsonb_object_agg(lab_key,enabled) from public.learning_lab_access where class_id is null),'{}'::jsonb),
    'class',coalesce((select jsonb_object_agg(lab_key,enabled) from public.learning_lab_access where class_id=requested_class_id),'{}'::jsonb)
  );
$$;

create or replace function public.e3_set_learning_lab_access(requested_class_id uuid,requested_lab_key text,requested_enabled boolean,requested_scope text default 'class')
returns jsonb language plpgsql security definer set search_path=public as $$
declare target_class uuid;
begin
  if requested_lab_key not in('original','archive','flashcards','video','plate-motion') then raise exception 'Unknown learning lab';end if;
  if requested_scope='global' then
    if not public.e3_is_developer() then raise exception 'Developer access required' using errcode='42501';end if;target_class:=null;
  else
    if not exists(select 1 from public.classes where class_id=requested_class_id and (teacher_user_id=auth.uid() or public.e3_is_developer())) then raise exception 'Teacher access required' using errcode='42501';end if;target_class:=requested_class_id;
  end if;
  update public.learning_lab_access set enabled=requested_enabled,updated_by=auth.uid(),updated_at=now() where lab_key=requested_lab_key and class_id is not distinct from target_class;
  if not found then insert into public.learning_lab_access(lab_key,class_id,enabled,updated_by) values(requested_lab_key,target_class,requested_enabled,auth.uid());end if;
  return public.e3_learning_lab_access(requested_class_id);
end;$$;

revoke all on function public.e3_learning_lab_access(uuid),public.e3_set_learning_lab_access(uuid,text,boolean,text) from public,anon;
grant execute on function public.e3_learning_lab_access(uuid),public.e3_set_learning_lab_access(uuid,text,boolean,text) to authenticated,service_role;
notify pgrst,'reload schema';
