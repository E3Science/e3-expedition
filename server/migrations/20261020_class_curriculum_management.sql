-- Teacher-facing class and curriculum management.

create or replace function public.e3_teacher_class_details()
returns table(id uuid,code text,name text,curriculum_id uuid,curriculum_name text)
language plpgsql stable security definer set search_path=public as $$
begin
  if not public.e3_is_teacher() then raise exception 'Teacher access required' using errcode='42501'; end if;
  return query
  select c.class_id,c.class_code,coalesce(c.class_name,c.class_code),c.curriculum_id,cu.name
  from public.classes c left join public.curricula cu on cu.curriculum_id=c.curriculum_id
  where c.teacher_user_id=auth.uid()
  order by coalesce(c.class_name,c.class_code);
end;
$$;

create or replace function public.e3_curriculum_options()
returns table(id uuid,name text,grade_level text,subject text,is_template boolean,owned boolean)
language plpgsql stable security definer set search_path=public as $$
begin
  if not public.e3_is_teacher() then raise exception 'Teacher access required' using errcode='42501'; end if;
  return query
  select c.curriculum_id,c.name,c.grade_level,c.subject,c.is_template,(c.owner_user_id=auth.uid())
  from public.curricula c
  where c.owner_user_id=auth.uid() or c.is_template
  order by c.grade_level desc,c.name;
end;
$$;

create or replace function public.e3_set_class_curriculum(requested_class_id uuid, requested_curriculum_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from public.classes where class_id=requested_class_id and teacher_user_id=auth.uid()) then raise exception 'Class not found or access denied'; end if;
  if not exists(select 1 from public.curricula where curriculum_id=requested_curriculum_id and (owner_user_id=auth.uid() or is_template)) then raise exception 'Curriculum not found or access denied'; end if;
  insert into public.curriculum_members(curriculum_id,user_id,role) values(requested_curriculum_id,auth.uid(),'editor') on conflict(curriculum_id,user_id) do nothing;
  update public.classes set curriculum_id=requested_curriculum_id where class_id=requested_class_id;
  return requested_curriculum_id;
end;
$$;

create or replace function public.e3_copy_class_curriculum(requested_class_id uuid, source_curriculum_id uuid, new_name text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare result uuid; source public.curricula%rowtype;
begin
  if not exists(select 1 from public.classes where class_id=requested_class_id and teacher_user_id=auth.uid()) then raise exception 'Class not found or access denied'; end if;
  select * into source from public.curricula where curriculum_id=source_curriculum_id and (owner_user_id=auth.uid() or is_template);
  if source.curriculum_id is null then raise exception 'Source curriculum not found or access denied'; end if;
  insert into public.curricula(owner_user_id,name,grade_level,subject,description,source_document_url)
  values(auth.uid(),coalesce(nullif(trim(new_name),''),source.name||' Copy'),source.grade_level,source.subject,source.description,source.source_document_url)
  returning curriculum_id into result;
  insert into public.curriculum_members(curriculum_id,user_id,role) values(result,auth.uid(),'owner');
  insert into public.lesson_records(curriculum_id,lesson_code,title,unit_name,chapter_name,sort_order,status,estimated_periods,mission_position,presentation_url,guide_url,assignment_links,notebook_links,resource_links,prep_materials,teacher_notes,assignments,notebook_pages,lesson_notes)
  select result,lesson_code,title,unit_name,chapter_name,sort_order,status,estimated_periods,mission_position,presentation_url,guide_url,assignment_links,notebook_links,resource_links,prep_materials,teacher_notes,assignments,notebook_pages,lesson_notes
  from public.lesson_records where curriculum_id=source_curriculum_id;
  update public.classes set curriculum_id=result where class_id=requested_class_id;
  return result;
end;
$$;

create or replace function public.e3_new_class_curriculum(requested_class_id uuid, curriculum_name text, requested_grade_level text default '')
returns uuid language plpgsql security definer set search_path=public as $$
declare result uuid;
begin
  if not exists(select 1 from public.classes where class_id=requested_class_id and teacher_user_id=auth.uid()) then raise exception 'Class not found or access denied'; end if;
  if nullif(trim(curriculum_name),'') is null then raise exception 'Enter a curriculum name'; end if;
  insert into public.curricula(owner_user_id,name,grade_level,subject) values(auth.uid(),trim(curriculum_name),trim(coalesce(requested_grade_level,'')),'Science') returning curriculum_id into result;
  insert into public.curriculum_members(curriculum_id,user_id,role) values(result,auth.uid(),'owner');
  update public.classes set curriculum_id=result where class_id=requested_class_id;
  return result;
end;
$$;

revoke all on function public.e3_teacher_class_details(),public.e3_curriculum_options(),public.e3_set_class_curriculum(uuid,uuid),public.e3_copy_class_curriculum(uuid,uuid,text),public.e3_new_class_curriculum(uuid,text,text) from public,anon;
grant execute on function public.e3_teacher_class_details(),public.e3_curriculum_options(),public.e3_set_class_curriculum(uuid,uuid),public.e3_copy_class_curriculum(uuid,uuid,text),public.e3_new_class_curriculum(uuid,text,text) to authenticated,service_role;
notify pgrst,'reload schema';
