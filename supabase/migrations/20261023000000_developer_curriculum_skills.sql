-- Developer console, curriculum sharing, class deletion, and teacher-selected NGSS skills.

create or replace function public.e3_is_developer()
returns boolean language sql stable security definer set search_path=public as $$
  select lower(coalesce((select email from auth.users where id=auth.uid()),''))='mnelsen79@gmail.com';
$$;

create or replace function public.e3_is_teacher()
returns boolean language sql stable security definer set search_path=public as $$
  select public.e3_is_developer() or exists(
    select 1 from auth.users
    where id=auth.uid() and (
      lower(coalesce(email,''))='mnelsen@susd.net'
      or coalesce(raw_app_meta_data->>'e3_role','') in ('teacher','developer')
    )
  );
$$;

revoke all on function public.e3_is_developer() from public,anon;
grant execute on function public.e3_is_developer(),public.e3_is_teacher() to authenticated,service_role;

alter table public.curricula add column if not exists is_public boolean not null default false;
alter table public.curricula add column if not exists copy_count integer not null default 0 check(copy_count>=0);
alter table public.curricula add column if not exists source_curriculum_id uuid references public.curricula(curriculum_id) on delete set null;
update public.curricula set is_public=true where is_template=true;

create table if not exists public.teacher_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_key text not null,
  title text not null,
  detail text not null default '',
  metal text not null default 'silver' check(metal in ('silver','gold')),
  earned_at timestamptz not null default now(),
  primary key(user_id,achievement_key)
);

create table if not exists public.ngss_skills (
  skill_id text primary key,
  category text not null,
  title text not null,
  description text not null,
  source_url text not null default 'https://www.nextgenscience.org/'
);

create table if not exists public.teacher_selected_skills (
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_id text not null references public.ngss_skills(skill_id) on delete cascade,
  selected_at timestamptz not null default now(),
  primary key(user_id,skill_id)
);

insert into public.ngss_skills(skill_id,category,title,description,source_url) values
('SEP-1','Science and Engineering Practice','Ask Questions and Define Problems','Ask testable questions and define problems that can be investigated or solved.','https://www.nextgenscience.org/'),
('SEP-2','Science and Engineering Practice','Develop and Use Models','Develop, use, and revise models to describe, test, and predict phenomena.','https://www.nextgenscience.org/'),
('SEP-3','Science and Engineering Practice','Plan and Carry Out Investigations','Plan and conduct investigations that produce reliable evidence.','https://www.nextgenscience.org/'),
('SEP-4','Science and Engineering Practice','Analyze and Interpret Data','Organize, analyze, and interpret data to identify patterns and relationships.','https://www.nextgenscience.org/'),
('SEP-5','Science and Engineering Practice','Use Mathematics and Computational Thinking','Use mathematics and computational representations to describe and solve scientific problems.','https://www.nextgenscience.org/'),
('SEP-6','Science and Engineering Practice','Construct Explanations and Design Solutions','Construct evidence-based explanations and design solutions that meet criteria and constraints.','https://www.nextgenscience.org/'),
('SEP-7','Science and Engineering Practice','Argue from Evidence','Evaluate evidence and construct or critique scientific arguments.','https://www.nextgenscience.org/'),
('SEP-8','Science and Engineering Practice','Obtain, Evaluate, and Communicate Information','Gather, evaluate, and communicate scientific and technical information.','https://www.nextgenscience.org/'),
('CCC-1','Crosscutting Concept','Patterns','Use observed patterns to organize data and explain relationships.','https://www.nextgenscience.org/'),
('CCC-2','Crosscutting Concept','Cause and Effect','Investigate and explain causal relationships and mechanisms.','https://www.nextgenscience.org/'),
('CCC-3','Crosscutting Concept','Scale, Proportion, and Quantity','Reason about size, time, energy, and proportional relationships across scales.','https://www.nextgenscience.org/'),
('CCC-4','Crosscutting Concept','Systems and System Models','Define systems, their boundaries, components, interactions, and models.','https://www.nextgenscience.org/'),
('CCC-5','Crosscutting Concept','Energy and Matter','Track flows, cycles, and conservation of energy and matter.','https://www.nextgenscience.org/'),
('CCC-6','Crosscutting Concept','Structure and Function','Relate the structure of an object or system to how it functions.','https://www.nextgenscience.org/'),
('CCC-7','Crosscutting Concept','Stability and Change','Explain conditions that produce stability and the processes that cause change.','https://www.nextgenscience.org/')
on conflict(skill_id) do update set category=excluded.category,title=excluded.title,description=excluded.description,source_url=excluded.source_url;

alter table public.teacher_achievements enable row level security;
alter table public.ngss_skills enable row level security;
alter table public.teacher_selected_skills enable row level security;
create policy "teachers read own achievements" on public.teacher_achievements for select to authenticated using(user_id=auth.uid() or public.e3_is_developer());
create policy "authenticated read ngss skills" on public.ngss_skills for select to authenticated using(true);
create policy "teachers manage selected skills" on public.teacher_selected_skills for all to authenticated using(user_id=auth.uid() and public.e3_is_teacher()) with check(user_id=auth.uid() and public.e3_is_teacher());
grant select on public.teacher_achievements,public.ngss_skills,public.teacher_selected_skills to authenticated;
grant select,insert,update,delete on public.teacher_achievements,public.ngss_skills,public.teacher_selected_skills to service_role;

create or replace function public.e3_can_view_curriculum(requested_curriculum_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.curricula c where c.curriculum_id=requested_curriculum_id and (c.owner_user_id=auth.uid() or c.is_public))
    or exists(select 1 from public.curriculum_members where curriculum_id=requested_curriculum_id and user_id=auth.uid())
    or public.e3_is_developer();
$$;

drop function if exists public.e3_curriculum_options();
create or replace function public.e3_curriculum_options()
returns table(id uuid,name text,grade_level text,subject text,is_template boolean,owned boolean,is_public boolean,copy_count integer)
language plpgsql stable security definer set search_path=public as $$
begin
  if not public.e3_is_teacher() then raise exception 'Teacher access required' using errcode='42501'; end if;
  return query
  select c.curriculum_id,c.name,c.grade_level,c.subject,c.is_template,(c.owner_user_id=auth.uid()),c.is_public,c.copy_count
  from public.curricula c
  where c.owner_user_id=auth.uid() or c.is_public or public.e3_is_developer()
  order by (c.owner_user_id=auth.uid()) desc,c.grade_level desc,c.name;
end;
$$;

create or replace function public.e3_set_curriculum_visibility(requested_curriculum_id uuid, requested_public boolean)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  update public.curricula set is_public=coalesce(requested_public,false),is_template=coalesce(requested_public,false),updated_at=now()
  where curriculum_id=requested_curriculum_id and (owner_user_id=auth.uid() or public.e3_is_developer());
  if not found then raise exception 'Curriculum not found or access denied'; end if;
  return coalesce(requested_public,false);
end;
$$;

create or replace function public.e3_copy_class_curriculum(requested_class_id uuid, source_curriculum_id uuid, new_name text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare result uuid; source public.curricula%rowtype; next_count integer; milestone integer;
begin
  if not exists(select 1 from public.classes where class_id=requested_class_id and (teacher_user_id=auth.uid() or public.e3_is_developer())) then raise exception 'Class not found or access denied'; end if;
  select * into source from public.curricula where curriculum_id=source_curriculum_id and (owner_user_id=auth.uid() or is_public or public.e3_is_developer());
  if source.curriculum_id is null then raise exception 'Source curriculum not found or access denied'; end if;
  insert into public.curricula(owner_user_id,name,grade_level,subject,description,source_document_url,source_curriculum_id,is_public,is_template)
  values(auth.uid(),coalesce(nullif(trim(new_name),''),source.name||' Copy'),source.grade_level,source.subject,source.description,source.source_document_url,source.curriculum_id,false,false)
  returning curriculum_id into result;
  insert into public.curriculum_members(curriculum_id,user_id,role) values(result,auth.uid(),'owner');
  insert into public.lesson_records(curriculum_id,lesson_code,title,unit_name,chapter_name,sort_order,status,estimated_periods,mission_position,presentation_url,guide_url,assignment_links,notebook_links,resource_links,prep_materials,teacher_notes,assignments,notebook_pages,lesson_notes)
  select result,lesson_code,title,unit_name,chapter_name,sort_order,status,estimated_periods,mission_position,presentation_url,guide_url,assignment_links,notebook_links,resource_links,prep_materials,teacher_notes,assignments,notebook_pages,lesson_notes
  from public.lesson_records where curriculum_id=source_curriculum_id;
  update public.classes set curriculum_id=result where class_id=requested_class_id;
  update public.curricula set copy_count=copy_count+1 where curriculum_id=source.curriculum_id returning copy_count into next_count;
  foreach milestone in array array[1,5,10,20,50,100,200,500,1000] loop
    if next_count>=milestone and next_count-1<milestone then
      insert into public.teacher_achievements(user_id,achievement_key,title,detail,metal)
      values(source.owner_user_id,'curriculum-copies:'||milestone,case when milestone=1 then 'First Curriculum Copy' else milestone||' Curriculum Copies' end,'Teachers have copied your curriculum '||milestone||case when milestone=1 then ' time.' else ' times.' end,case when milestone>=20 then 'gold' else 'silver' end)
      on conflict(user_id,achievement_key) do nothing;
    end if;
  end loop;
  return result;
end;
$$;

create or replace function public.e3_delete_class(requested_class_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  delete from public.classes where class_id=requested_class_id and (teacher_user_id=auth.uid() or public.e3_is_developer());
  if not found then raise exception 'Class not found or access denied'; end if;
  return true;
end;
$$;

create or replace function public.e3_teacher_classes()
returns table(id uuid,code text,name text)
language plpgsql stable security definer set search_path=public as $$
begin
  if not public.e3_is_teacher() then raise exception 'Teacher access required' using errcode='42501'; end if;
  return query select c.class_id,c.class_code,coalesce(c.class_name,c.class_code)
  from public.classes c where c.teacher_user_id=auth.uid() or public.e3_is_developer()
  order by coalesce(c.class_name,c.class_code);
end;
$$;

create or replace function public.e3_teacher_class_details()
returns table(id uuid,code text,name text,curriculum_id uuid,curriculum_name text)
language plpgsql stable security definer set search_path=public as $$
begin
  if not public.e3_is_teacher() then raise exception 'Teacher access required' using errcode='42501'; end if;
  return query
  select c.class_id,c.class_code,coalesce(c.class_name,c.class_code),c.curriculum_id,cu.name
  from public.classes c left join public.curricula cu on cu.curriculum_id=c.curriculum_id
  where c.teacher_user_id=auth.uid() or public.e3_is_developer()
  order by coalesce(c.class_name,c.class_code);
end;
$$;

create or replace function public.e3_class_curriculum(requested_class_id uuid)
returns uuid language plpgsql stable security definer set search_path=public as $$
declare result uuid;
begin
  if not public.e3_is_teacher() then raise exception 'Teacher access required' using errcode='42501'; end if;
  select curriculum_id into result from public.classes
  where class_id=requested_class_id and (teacher_user_id=auth.uid() or public.e3_is_developer());
  if result is null then raise exception 'Class curriculum not found or access denied'; end if;
  return result;
end;
$$;

create or replace function public.e3_teacher_skill_options()
returns table(id text,category text,title text,description text,selected boolean,source_url text)
language plpgsql stable security definer set search_path=public as $$
begin
  if not public.e3_is_teacher() then raise exception 'Teacher access required'; end if;
  return query select s.skill_id,s.category,s.title,s.description,exists(select 1 from public.teacher_selected_skills t where t.user_id=auth.uid() and t.skill_id=s.skill_id),s.source_url
  from public.ngss_skills s order by s.category desc,s.skill_id;
end;
$$;

create or replace function public.e3_set_teacher_skill(requested_skill_id text, requested_selected boolean)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  if not public.e3_is_teacher() then raise exception 'Teacher access required'; end if;
  if requested_selected then insert into public.teacher_selected_skills(user_id,skill_id) values(auth.uid(),requested_skill_id) on conflict do nothing;
  else delete from public.teacher_selected_skills where user_id=auth.uid() and skill_id=requested_skill_id; end if;
  return requested_selected;
end;
$$;

create or replace function public.e3_teacher_achievements()
returns table(key text,title text,detail text,metal text,earned_at timestamptz)
language sql stable security definer set search_path=public as $$
  select achievement_key,title,detail,metal,earned_at from public.teacher_achievements where user_id=auth.uid() order by earned_at desc;
$$;

create or replace function public.e3_developer_accounts()
returns table(id uuid,email text,display_name text,role text,last_sign_in_at timestamptz,classes jsonb)
language plpgsql stable security definer set search_path=public as $$
begin
  if not public.e3_is_developer() then raise exception 'Developer access required' using errcode='42501'; end if;
  return query select u.id,u.email,coalesce(p.display_name,split_part(u.email,'@',1)),coalesce(nullif(u.raw_app_meta_data->>'e3_role',''),case when exists(select 1 from public.classes c where c.teacher_user_id=u.id) then 'teacher' else 'student' end),u.last_sign_in_at,
    coalesce((select jsonb_agg(jsonb_build_object('id',c.class_id,'name',coalesce(c.class_name,c.class_code),'code',c.class_code)) from public.classes c left join public.class_memberships cm on cm.class_id=c.class_id where c.teacher_user_id=u.id or cm.user_id=u.id),'[]'::jsonb)
  from auth.users u left join public.profiles p on p.user_id=u.id order by u.last_sign_in_at desc nulls last,u.email;
end;
$$;

create or replace function public.e3_developer_user_snapshot(requested_user_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb;
begin
  if not public.e3_is_developer() then raise exception 'Developer access required' using errcode='42501'; end if;
  select jsonb_build_object('userId',u.id,'email',u.email,'displayName',coalesce(p.display_name,split_part(u.email,'@',1)),'lastSignInAt',u.last_sign_in_at,'createdAt',u.created_at,
    'classes',coalesce((select jsonb_agg(jsonb_build_object('id',c.class_id,'name',coalesce(c.class_name,c.class_code),'code',c.class_code,'teacher',c.teacher_user_id=requested_user_id)) from public.classes c left join public.class_memberships cm on cm.class_id=c.class_id where c.teacher_user_id=requested_user_id or cm.user_id=requested_user_id),'[]'::jsonb),
    'inventoryItems',coalesce((select sum(quantity) from public.inventories where user_id=requested_user_id),0),
    'achievements',coalesce((select count(*) from public.player_achievements where user_id=requested_user_id),0),
    'studyCompletions',coalesce((select sum(study_completions) from public.student_game_stats where user_id=requested_user_id),0)) into result
  from auth.users u left join public.profiles p on p.user_id=u.id where u.id=requested_user_id;
  return result;
end;
$$;

revoke all on function public.e3_curriculum_options(),public.e3_set_curriculum_visibility(uuid,boolean),public.e3_copy_class_curriculum(uuid,uuid,text),public.e3_delete_class(uuid),public.e3_teacher_classes(),public.e3_teacher_class_details(),public.e3_class_curriculum(uuid),public.e3_teacher_skill_options(),public.e3_set_teacher_skill(text,boolean),public.e3_teacher_achievements(),public.e3_developer_accounts(),public.e3_developer_user_snapshot(uuid) from public,anon;
grant execute on function public.e3_curriculum_options(),public.e3_set_curriculum_visibility(uuid,boolean),public.e3_copy_class_curriculum(uuid,uuid,text),public.e3_delete_class(uuid),public.e3_teacher_classes(),public.e3_teacher_class_details(),public.e3_class_curriculum(uuid),public.e3_teacher_skill_options(),public.e3_set_teacher_skill(text,boolean),public.e3_teacher_achievements(),public.e3_developer_accounts(),public.e3_developer_user_snapshot(uuid) to authenticated,service_role;
notify pgrst,'reload schema';
