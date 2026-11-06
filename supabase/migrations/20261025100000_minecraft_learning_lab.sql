-- Phase 1 Minecraft prototype: teacher-configured launcher and student session tracking.
alter table public.learning_lab_access drop constraint if exists learning_lab_access_lab_key_check;
alter table public.learning_lab_access add constraint learning_lab_access_lab_key_check
  check (lab_key in ('original','archive','flashcards','video','plate-motion','minecraft'));

create table if not exists public.minecraft_lab_configs (
  class_id uuid primary key references public.classes(class_id) on delete cascade,
  launch_url text not null,
  mission_title text not null default 'Minecraft Expedition',
  mission_instructions text not null default 'Open the classroom world and complete the mission provided by your teacher.',
  enabled boolean not null default false,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  constraint minecraft_lab_launch_url_https check (launch_url ~* '^https://[^[:space:]]+$'),
  constraint minecraft_lab_title_length check (char_length(mission_title) between 1 and 120),
  constraint minecraft_lab_instructions_length check (char_length(mission_instructions) between 1 and 2000)
);

create table if not exists public.minecraft_lab_sessions (
  session_id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(class_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  mission_title text not null,
  launched_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'launched' check (status in ('launched','completed'))
);
create index if not exists minecraft_lab_sessions_user_class_idx
  on public.minecraft_lab_sessions(user_id,class_id,launched_at desc);

alter table public.minecraft_lab_configs enable row level security;
alter table public.minecraft_lab_sessions enable row level security;
revoke all on public.minecraft_lab_configs,public.minecraft_lab_sessions from public,anon,authenticated;

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
  if requested_lab_key not in('original','archive','flashcards','video','plate-motion','minecraft') then raise exception 'Unknown learning lab';end if;
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

create or replace function public.e3_set_teacher_learning_lab_access(requested_teacher_user_id uuid,requested_lab_key text,requested_enabled boolean)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if not public.e3_is_developer() then raise exception 'Developer access required' using errcode='42501';end if;
  if requested_lab_key not in('original','archive','flashcards','video','plate-motion','minecraft') then raise exception 'Unknown learning lab';end if;
  update public.learning_lab_access set enabled=requested_enabled,updated_by=auth.uid(),updated_at=now() where lab_key=requested_lab_key and class_id is null and teacher_user_id=requested_teacher_user_id;
  if not found then insert into public.learning_lab_access(lab_key,class_id,teacher_user_id,enabled,updated_by) values(requested_lab_key,null,requested_teacher_user_id,requested_enabled,auth.uid());end if;
  return public.e3_teacher_learning_lab_access(requested_teacher_user_id);
end;$$;

create or replace function public.e3_minecraft_lab_config(requested_class_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare config public.minecraft_lab_configs%rowtype; latest public.minecraft_lab_sessions%rowtype; class_teacher uuid; access_enabled boolean;
begin
  if not public.e3_can_access_class(requested_class_id) and not public.e3_is_developer() then raise exception 'Class access required' using errcode='42501';end if;
  select teacher_user_id into class_teacher from public.classes where class_id=requested_class_id;
  select * into config from public.minecraft_lab_configs where class_id=requested_class_id;
  select * into latest from public.minecraft_lab_sessions where class_id=requested_class_id and user_id=auth.uid() order by launched_at desc limit 1;
  access_enabled:=not exists(select 1 from public.learning_lab_access where lab_key='minecraft' and class_id is null and teacher_user_id is null and not enabled)
    and not exists(select 1 from public.learning_lab_access where lab_key='minecraft' and class_id is null and teacher_user_id=class_teacher and not enabled)
    and not exists(select 1 from public.learning_lab_access where lab_key='minecraft' and class_id=requested_class_id and not enabled);
  return jsonb_build_object(
    'configured',config.class_id is not null,
    'launchUrl',case when public.e3_is_teacher() or public.e3_is_developer() or (coalesce(config.enabled,false) and access_enabled) then coalesce(config.launch_url,'') else '' end,
    'missionTitle',coalesce(config.mission_title,'Minecraft Expedition'),
    'missionInstructions',coalesce(config.mission_instructions,'Open the classroom world and complete the mission provided by your teacher.'),
    'enabled',coalesce(config.enabled,false) and access_enabled,
    'latestSession',case when latest.session_id is null then null else jsonb_build_object('id',latest.session_id,'status',latest.status,'launchedAt',latest.launched_at,'completedAt',latest.completed_at) end
  );
end;$$;

create or replace function public.e3_save_minecraft_lab_config(requested_class_id uuid,requested_launch_url text,requested_mission_title text,requested_mission_instructions text,requested_enabled boolean)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from public.classes where class_id=requested_class_id and (teacher_user_id=auth.uid() or public.e3_is_developer())) then raise exception 'Teacher access required' using errcode='42501';end if;
  requested_launch_url:=btrim(requested_launch_url);requested_mission_title:=btrim(requested_mission_title);requested_mission_instructions:=btrim(requested_mission_instructions);
  if requested_launch_url !~* '^https://[^[:space:]]+$' then raise exception 'Use a secure https:// launch URL';end if;
  if char_length(requested_mission_title) not between 1 and 120 then raise exception 'Mission title must be 1 to 120 characters';end if;
  if char_length(requested_mission_instructions) not between 1 and 2000 then raise exception 'Mission instructions must be 1 to 2000 characters';end if;
  insert into public.minecraft_lab_configs(class_id,launch_url,mission_title,mission_instructions,enabled,updated_by)
  values(requested_class_id,requested_launch_url,requested_mission_title,requested_mission_instructions,requested_enabled,auth.uid())
  on conflict(class_id) do update set launch_url=excluded.launch_url,mission_title=excluded.mission_title,mission_instructions=excluded.mission_instructions,enabled=excluded.enabled,updated_by=auth.uid(),updated_at=now();
  return public.e3_minecraft_lab_config(requested_class_id);
end;$$;

create or replace function public.e3_start_minecraft_lab_session(requested_class_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare config public.minecraft_lab_configs%rowtype; new_session uuid; class_teacher uuid;
begin
  if not public.e3_can_access_class(requested_class_id) then raise exception 'Class access required' using errcode='42501';end if;
  select teacher_user_id into class_teacher from public.classes where class_id=requested_class_id;
  if exists(select 1 from public.learning_lab_access where lab_key='minecraft' and class_id is null and teacher_user_id is null and not enabled)
    or exists(select 1 from public.learning_lab_access where lab_key='minecraft' and class_id is null and teacher_user_id=class_teacher and not enabled)
    or exists(select 1 from public.learning_lab_access where lab_key='minecraft' and class_id=requested_class_id and not enabled)
  then raise exception 'Minecraft Lab access is disabled' using errcode='42501';end if;
  select * into config from public.minecraft_lab_configs where class_id=requested_class_id and enabled;
  if config.class_id is null then raise exception 'Minecraft Lab is not configured for this class';end if;
  insert into public.minecraft_lab_sessions(class_id,user_id,mission_title) values(requested_class_id,auth.uid(),config.mission_title) returning session_id into new_session;
  return jsonb_build_object('sessionId',new_session,'launchUrl',config.launch_url,'missionTitle',config.mission_title,'missionInstructions',config.mission_instructions);
end;$$;

create or replace function public.e3_complete_minecraft_lab_session(requested_session_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare completed public.minecraft_lab_sessions%rowtype;
begin
  update public.minecraft_lab_sessions set status='completed',completed_at=coalesce(completed_at,now()) where session_id=requested_session_id and user_id=auth.uid() returning * into completed;
  if completed.session_id is null then raise exception 'Minecraft Lab session not found' using errcode='42501';end if;
  return jsonb_build_object('sessionId',completed.session_id,'status',completed.status,'completedAt',completed.completed_at);
end;$$;

revoke all on function public.e3_minecraft_lab_config(uuid),public.e3_save_minecraft_lab_config(uuid,text,text,text,boolean),public.e3_start_minecraft_lab_session(uuid),public.e3_complete_minecraft_lab_session(uuid) from public,anon;
grant execute on function public.e3_minecraft_lab_config(uuid),public.e3_save_minecraft_lab_config(uuid,text,text,text,boolean),public.e3_start_minecraft_lab_session(uuid),public.e3_complete_minecraft_lab_session(uuid) to authenticated,service_role;
notify pgrst,'reload schema';
