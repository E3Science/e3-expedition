-- Developer global/per-teacher gates layered above teacher per-class student gates.
alter table public.learning_lab_access add column if not exists teacher_user_id uuid references auth.users(id) on delete cascade;
drop index if exists public.learning_lab_global_unique;
create unique index learning_lab_global_unique on public.learning_lab_access(lab_key) where class_id is null and teacher_user_id is null;
create unique index if not exists learning_lab_teacher_unique on public.learning_lab_access(lab_key,teacher_user_id) where class_id is null and teacher_user_id is not null;

create or replace function public.e3_learning_lab_access(requested_class_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare class_teacher uuid;
begin
  if requested_class_id is not null and not public.e3_can_access_class(requested_class_id) and not public.e3_is_developer() then raise exception 'Class access required' using errcode='42501';end if;
  select c.teacher_user_id into class_teacher from public.classes c where c.class_id=requested_class_id;
  return jsonb_build_object(
    'global',coalesce((select jsonb_object_agg(a.lab_key,a.enabled) from public.learning_lab_access a where a.class_id is null and a.teacher_user_id is null),'{}'::jsonb),
    'teacher',coalesce((select jsonb_object_agg(a.lab_key,a.enabled) from public.learning_lab_access a where a.class_id is null and a.teacher_user_id=class_teacher),'{}'::jsonb),
    'class',coalesce((select jsonb_object_agg(a.lab_key,a.enabled) from public.learning_lab_access a where a.class_id=requested_class_id),'{}'::jsonb)
  );
end;$$;

create or replace function public.e3_set_learning_lab_access(requested_class_id uuid,requested_lab_key text,requested_enabled boolean,requested_scope text default 'class')
returns jsonb language plpgsql security definer set search_path=public as $$
declare target_class uuid;
begin
  if requested_lab_key not in('original','archive','flashcards','video','plate-motion') then raise exception 'Unknown learning lab';end if;
  if requested_scope='global' then
    if not public.e3_is_developer() then raise exception 'Developer access required' using errcode='42501';end if;target_class:=null;
    update public.learning_lab_access set enabled=requested_enabled,updated_by=auth.uid(),updated_at=now() where lab_key=requested_lab_key and class_id is null and teacher_user_id is null;
    if not found then insert into public.learning_lab_access(lab_key,class_id,teacher_user_id,enabled,updated_by) values(requested_lab_key,null,null,requested_enabled,auth.uid());end if;
  else
    if not exists(select 1 from public.classes where class_id=requested_class_id and teacher_user_id=auth.uid()) then raise exception 'Teacher access required' using errcode='42501';end if;target_class:=requested_class_id;
    update public.learning_lab_access set enabled=requested_enabled,updated_by=auth.uid(),updated_at=now() where lab_key=requested_lab_key and class_id=target_class;
    if not found then insert into public.learning_lab_access(lab_key,class_id,teacher_user_id,enabled,updated_by) values(requested_lab_key,target_class,null,requested_enabled,auth.uid());end if;
  end if;
  return public.e3_learning_lab_access(requested_class_id);
end;$$;

create or replace function public.e3_teacher_learning_lab_access(requested_teacher_user_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
  if not public.e3_is_developer() then raise exception 'Developer access required' using errcode='42501';end if;
  return coalesce((select jsonb_object_agg(a.lab_key,a.enabled) from public.learning_lab_access a where a.class_id is null and a.teacher_user_id=requested_teacher_user_id),'{}'::jsonb);
end;$$;

create or replace function public.e3_set_teacher_learning_lab_access(requested_teacher_user_id uuid,requested_lab_key text,requested_enabled boolean)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if not public.e3_is_developer() then raise exception 'Developer access required' using errcode='42501';end if;
  if requested_lab_key not in('original','archive','flashcards','video','plate-motion') then raise exception 'Unknown learning lab';end if;
  update public.learning_lab_access set enabled=requested_enabled,updated_by=auth.uid(),updated_at=now() where lab_key=requested_lab_key and class_id is null and teacher_user_id=requested_teacher_user_id;
  if not found then insert into public.learning_lab_access(lab_key,class_id,teacher_user_id,enabled,updated_by) values(requested_lab_key,null,requested_teacher_user_id,requested_enabled,auth.uid());end if;
  return public.e3_teacher_learning_lab_access(requested_teacher_user_id);
end;$$;

revoke all on function public.e3_teacher_learning_lab_access(uuid),public.e3_set_teacher_learning_lab_access(uuid,text,boolean) from public,anon;
grant execute on function public.e3_teacher_learning_lab_access(uuid),public.e3_set_teacher_learning_lab_access(uuid,text,boolean) to authenticated,service_role;
notify pgrst,'reload schema';
