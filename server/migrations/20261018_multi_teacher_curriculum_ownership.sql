-- Multi-teacher curriculum ownership foundation.
-- Backfills the existing SCI7 library and classes to the primary E3 teacher.

create table if not exists public.curricula (
  curriculum_id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  grade_level text not null default '',
  subject text not null default 'Science',
  description text not null default '',
  source_document_url text,
  is_template boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_user_id, name)
);

create table if not exists public.curriculum_members (
  curriculum_id uuid not null references public.curricula(curriculum_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner','editor','viewer')),
  created_at timestamptz not null default now(),
  primary key (curriculum_id, user_id)
);

alter table public.lesson_records add column if not exists curriculum_id uuid references public.curricula(curriculum_id) on delete cascade;
alter table public.classes add column if not exists teacher_user_id uuid references auth.users(id) on delete set null;
alter table public.classes add column if not exists curriculum_id uuid references public.curricula(curriculum_id) on delete set null;

do $$
declare
  primary_teacher uuid;
  sci7_curriculum uuid;
begin
  select id into primary_teacher from auth.users
  where lower(email)='mnelsen@susd.net'
  order by created_at limit 1;

  if primary_teacher is null then
    select id into primary_teacher from auth.users
    where raw_app_meta_data ->> 'e3_role'='teacher'
    order by created_at limit 1;
  end if;

  if primary_teacher is not null then
    insert into public.curricula(owner_user_id,name,grade_level,subject,description,source_document_url,is_template)
    values(primary_teacher,'SCI7 Science 2026-2027','7','Science','Seventh-grade E3 master curriculum.','https://docs.google.com/document/d/1929KQNzkt4nDMRVyfo7chrFLDWvGRWUVD1T_cBuaj10/edit',true)
    on conflict(owner_user_id,name) do update set
      grade_level=excluded.grade_level, subject=excluded.subject,
      source_document_url=excluded.source_document_url, is_template=true, updated_at=now()
    returning curriculum_id into sci7_curriculum;

    insert into public.curriculum_members(curriculum_id,user_id,role)
    values(sci7_curriculum,primary_teacher,'owner')
    on conflict(curriculum_id,user_id) do update set role='owner';

    update public.lesson_records set curriculum_id=sci7_curriculum where curriculum_id is null;
    update public.classes set teacher_user_id=primary_teacher where teacher_user_id is null;
    update public.classes set curriculum_id=sci7_curriculum where curriculum_id is null;
  end if;
end $$;

alter table public.curricula enable row level security;
alter table public.curriculum_members enable row level security;

create or replace function public.e3_can_view_curriculum(requested_curriculum_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.curriculum_members
    where curriculum_id=requested_curriculum_id and user_id=auth.uid()
  );
$$;

create or replace function public.e3_can_edit_curriculum(requested_curriculum_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.curriculum_members
    where curriculum_id=requested_curriculum_id and user_id=auth.uid() and role in ('owner','editor')
  );
$$;

revoke all on function public.e3_can_view_curriculum(uuid) from public,anon;
revoke all on function public.e3_can_edit_curriculum(uuid) from public,anon;
grant execute on function public.e3_can_view_curriculum(uuid),public.e3_can_edit_curriculum(uuid) to authenticated,service_role;

drop policy if exists "curriculum members read curricula" on public.curricula;
create policy "curriculum members read curricula" on public.curricula for select to authenticated
using(public.e3_can_view_curriculum(curriculum_id));
drop policy if exists "owners update curricula" on public.curricula;
create policy "owners update curricula" on public.curricula for update to authenticated
using(owner_user_id=auth.uid()) with check(owner_user_id=auth.uid());
drop policy if exists "teachers create curricula" on public.curricula;
create policy "teachers create curricula" on public.curricula for insert to authenticated
with check(public.e3_is_teacher() and owner_user_id=auth.uid());

drop policy if exists "members read curriculum membership" on public.curriculum_members;
create policy "members read curriculum membership" on public.curriculum_members for select to authenticated
using(public.e3_can_view_curriculum(curriculum_id));
drop policy if exists "owners manage curriculum membership" on public.curriculum_members;
create policy "owners manage curriculum membership" on public.curriculum_members for all to authenticated
using(exists(select 1 from public.curricula c where c.curriculum_id=curriculum_members.curriculum_id and c.owner_user_id=auth.uid()))
with check(exists(select 1 from public.curricula c where c.curriculum_id=curriculum_members.curriculum_id and c.owner_user_id=auth.uid()));

drop policy if exists "teachers manage lessons" on public.lesson_records;
drop policy if exists "curriculum members read lessons" on public.lesson_records;
drop policy if exists "curriculum editors manage lessons" on public.lesson_records;
create policy "curriculum members read lessons" on public.lesson_records for select to authenticated
using(public.e3_can_view_curriculum(curriculum_id));
create policy "curriculum editors manage lessons" on public.lesson_records for all to authenticated
using(public.e3_can_edit_curriculum(curriculum_id)) with check(public.e3_can_edit_curriculum(curriculum_id));

alter table public.lesson_records drop constraint if exists lesson_records_lesson_code_key;
create unique index if not exists lesson_records_curriculum_code_key on public.lesson_records(curriculum_id,lesson_code);

create or replace function public.e3_teacher_classes()
returns table(id uuid,code text,name text)
language plpgsql stable security definer set search_path=public as $$
begin
  if not public.e3_is_teacher() then raise exception 'Teacher access required' using errcode='42501'; end if;
  return query select c.class_id,c.class_code,coalesce(c.class_name,c.class_code)
  from public.classes c where c.teacher_user_id=auth.uid()
  order by coalesce(c.class_name,c.class_code);
end;
$$;

create or replace function public.e3_class_curriculum(requested_class_id uuid)
returns uuid language plpgsql stable security definer set search_path=public as $$
declare result uuid;
begin
  if not public.e3_is_teacher() then raise exception 'Teacher access required' using errcode='42501'; end if;
  select curriculum_id into result from public.classes
  where class_id=requested_class_id and teacher_user_id=auth.uid();
  if result is null then raise exception 'Class curriculum not found or access denied'; end if;
  return result;
end;
$$;

revoke all on function public.e3_class_curriculum(uuid) from public,anon;
grant execute on function public.e3_class_curriculum(uuid) to authenticated,service_role;

grant select,insert,update,delete on public.curricula,public.curriculum_members to authenticated,service_role;
notify pgrst,'reload schema';
