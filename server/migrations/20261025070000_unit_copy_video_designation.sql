-- Public unit copying and curriculum-linked interactive videos.
alter table public.video_labs add column if not exists unit_name text not null default '';
alter table public.video_labs add column if not exists chapter_name text not null default '';
alter table public.video_labs add column if not exists lesson_code text not null default '';
create index if not exists video_labs_owner_unit_idx on public.video_labs(owner_user_id,unit_name);

drop function if exists public.e3_public_curriculum_units();
create function public.e3_public_curriculum_units()
returns table(curriculum_id uuid,curriculum_name text,unit_name text,owner_name text,lesson_count integer,question_set_count integer,video_count integer)
language plpgsql stable security definer set search_path=public as $$
begin
  if not public.e3_is_teacher() then raise exception 'Teacher access required' using errcode='42501'; end if;
  return query
  select c.curriculum_id,c.name,l.unit_name,coalesce(p.display_name,split_part(u.email,'@',1),c.name),count(*)::integer,
    (select count(*)::integer from public.question_sets q where q.active and q.is_public and q.unit_name=l.unit_name and (q.owner_user_id=c.owner_user_id or q.owner_user_id is null)),
    (select count(*)::integer from public.video_labs v where v.active and v.is_public and v.unit_name=l.unit_name and v.owner_user_id=c.owner_user_id)
  from public.curricula c join public.lesson_records l on l.curriculum_id=c.curriculum_id
  left join auth.users u on u.id=c.owner_user_id left join public.profiles p on p.user_id=c.owner_user_id
  where c.is_public and length(trim(l.unit_name))>0
  group by c.curriculum_id,c.name,l.unit_name,p.display_name,u.email,c.owner_user_id
  order by c.name,l.unit_name;
end;$$;

create or replace function public.e3_copy_curriculum_unit(requested_class_id uuid,requested_curriculum_id uuid,requested_unit_name text,include_questions boolean default false,include_videos boolean default false)
returns jsonb language plpgsql security definer set search_path=public as $$
declare source public.curricula%rowtype;target_curriculum uuid;set_row record;video_row record;new_set uuid;new_video uuid;lessons_copied integer:=0;sets_copied integer:=0;videos_copied integer:=0;
begin
  if not exists(select 1 from public.classes c where c.class_id=requested_class_id and c.teacher_user_id=auth.uid()) then raise exception 'Class access required' using errcode='42501';end if;
  select * into source from public.curricula c where c.curriculum_id=requested_curriculum_id and (c.is_public or c.owner_user_id=auth.uid());
  if source.curriculum_id is null then raise exception 'Public curriculum not found';end if;
  select c.curriculum_id into target_curriculum from public.classes c where c.class_id=requested_class_id;
  if target_curriculum is null then
    insert into public.curricula(owner_user_id,name,grade_level,subject,is_public,is_template) select auth.uid(),coalesce(c.class_name,c.class_code)||' Curriculum',source.grade_level,source.subject,false,false from public.classes c where c.class_id=requested_class_id returning curriculum_id into target_curriculum;
    insert into public.curriculum_members(curriculum_id,user_id,role) values(target_curriculum,auth.uid(),'owner') on conflict do nothing;
    update public.classes set curriculum_id=target_curriculum where class_id=requested_class_id;
  end if;
  if not exists(select 1 from public.curricula c where c.curriculum_id=target_curriculum and c.owner_user_id=auth.uid()) then raise exception 'The class curriculum must be owned by this teacher';end if;
  insert into public.lesson_records(curriculum_id,lesson_code,title,unit_name,chapter_name,sort_order,status,estimated_periods,mission_position,presentation_url,guide_url,assignment_links,notebook_links,resource_links,prep_materials,teacher_notes,assignments,notebook_pages,lesson_notes)
  select target_curriculum,l.lesson_code,l.title,l.unit_name,l.chapter_name,l.sort_order,l.status,l.estimated_periods,l.mission_position,l.presentation_url,l.guide_url,l.assignment_links,l.notebook_links,l.resource_links,l.prep_materials,l.teacher_notes,l.assignments,l.notebook_pages,l.lesson_notes
  from public.lesson_records l where l.curriculum_id=source.curriculum_id and l.unit_name=requested_unit_name on conflict(curriculum_id,lesson_code) do nothing;
  get diagnostics lessons_copied=row_count;
  if include_questions then
    for set_row in select q.* from public.question_sets q where q.active and q.is_public and q.unit_name=requested_unit_name and (q.owner_user_id=source.owner_user_id or q.owner_user_id is null) loop
      insert into public.question_sets(unit_name,chapter_name,mission_position,active,owner_user_id,is_public,source_set_id) values(set_row.unit_name,set_row.chapter_name,set_row.mission_position,set_row.active,auth.uid(),false,set_row.set_id) returning set_id into new_set;
      insert into public.study_questions(set_id,prompt,answers,correct_index,active) select new_set,s.prompt,s.answers,s.correct_index,s.active from public.study_questions s where s.set_id=set_row.set_id;
      update public.question_sets set copy_count=copy_count+1 where set_id=set_row.set_id;sets_copied:=sets_copied+1;
    end loop;
  end if;
  if include_videos then
    for video_row in select v.* from public.video_labs v where v.active and v.is_public and v.unit_name=requested_unit_name and v.owner_user_id=source.owner_user_id loop
      insert into public.video_labs(class_id,owner_user_id,title,video_url,unit_name,chapter_name,lesson_code,active,start_seconds,end_seconds,cuts,is_public,source_lab_id)
      values(requested_class_id,auth.uid(),video_row.title||' Copy',video_row.video_url,video_row.unit_name,video_row.chapter_name,video_row.lesson_code,video_row.active,video_row.start_seconds,video_row.end_seconds,video_row.cuts,false,video_row.lab_id) returning lab_id into new_video;
      insert into public.video_lab_questions(lab_id,stop_seconds,prompt,answers,correct_index,time_limit) select new_video,q.stop_seconds,q.prompt,q.answers,q.correct_index,q.time_limit from public.video_lab_questions q where q.lab_id=video_row.lab_id;
      update public.video_labs set copy_count=copy_count+1 where lab_id=video_row.lab_id;videos_copied:=videos_copied+1;
    end loop;
  end if;
  update public.curricula set copy_count=copy_count+1 where curriculum_id=source.curriculum_id;
  return jsonb_build_object('lessons',lessons_copied,'questionSets',sets_copied,'videos',videos_copied);
end;$$;

create or replace function public.e3_add_video_lab_to_lesson(requested_lab_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare lab public.video_labs%rowtype;target_lesson public.lesson_records%rowtype;target_curriculum uuid;assignment jsonb;
begin
  select v.* into lab from public.video_labs v join public.classes c on c.class_id=v.class_id where v.lab_id=requested_lab_id and v.owner_user_id=auth.uid() and c.teacher_user_id=auth.uid();
  if lab.lab_id is null then raise exception 'Video lab not found or access denied';end if;
  if length(trim(lab.lesson_code))=0 then raise exception 'Add a lesson code to this video first';end if;
  select c.curriculum_id into target_curriculum from public.classes c where c.class_id=lab.class_id;
  select l.* into target_lesson from public.lesson_records l where l.curriculum_id=target_curriculum and lower(l.lesson_code)=lower(lab.lesson_code) and (lab.unit_name='' or l.unit_name=lab.unit_name) order by (l.chapter_name=lab.chapter_name) desc limit 1;
  if target_lesson.lesson_id is null then raise exception 'No lesson with code % was found in this class curriculum',lab.lesson_code;end if;
  if exists(select 1 from jsonb_array_elements(target_lesson.assignments) item where item->>'videoLabId'=lab.lab_id::text) then return jsonb_build_object('lessonId',target_lesson.lesson_id,'lessonCode',target_lesson.lesson_code,'alreadyAdded',true);end if;
  assignment=jsonb_build_object('title',lab.title,'url',lab.video_url,'description','Interactive Video Lab · '||concat_ws(' · ',nullif(lab.unit_name,''),nullif(lab.chapter_name,'')),'durationMinutes',null,'videoLabId',lab.lab_id);
  update public.lesson_records set assignments=assignments||jsonb_build_array(assignment),updated_at=now() where lesson_id=target_lesson.lesson_id;
  return jsonb_build_object('lessonId',target_lesson.lesson_id,'lessonCode',target_lesson.lesson_code,'alreadyAdded',false);
end;$$;

create or replace function public.e3_copy_video_lab(requested_lab_id uuid,requested_class_id uuid) returns uuid language plpgsql security definer set search_path=public as $$ declare source public.video_labs%rowtype;result uuid;begin if not exists(select 1 from public.classes where class_id=requested_class_id and teacher_user_id=auth.uid()) then raise exception 'Class access required';end if;select * into source from public.video_labs where lab_id=requested_lab_id and (owner_user_id=auth.uid() or is_public);if source.lab_id is null then raise exception 'Video lab not found or private';end if;insert into public.video_labs(class_id,owner_user_id,title,video_url,unit_name,chapter_name,lesson_code,active,start_seconds,end_seconds,cuts,is_public,source_lab_id) values(requested_class_id,auth.uid(),source.title||' Copy',source.video_url,source.unit_name,source.chapter_name,source.lesson_code,source.active,source.start_seconds,source.end_seconds,source.cuts,false,source.lab_id) returning lab_id into result;insert into public.video_lab_questions(lab_id,stop_seconds,prompt,answers,correct_index,time_limit) select result,stop_seconds,prompt,answers,correct_index,time_limit from public.video_lab_questions where lab_id=source.lab_id;update public.video_labs set copy_count=copy_count+1 where lab_id=source.lab_id;return result;end;$$;

revoke all on function public.e3_public_curriculum_units(),public.e3_copy_curriculum_unit(uuid,uuid,text,boolean,boolean),public.e3_add_video_lab_to_lesson(uuid) from public,anon;
grant execute on function public.e3_public_curriculum_units(),public.e3_copy_curriculum_unit(uuid,uuid,text,boolean,boolean),public.e3_add_video_lab_to_lesson(uuid) to authenticated,service_role;
notify pgrst,'reload schema';
