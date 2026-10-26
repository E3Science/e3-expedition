-- Teacher ownership, visibility, and independent-copy semantics for learning assets.
alter table public.question_sets add column if not exists owner_user_id uuid references auth.users(id) on delete cascade;
alter table public.question_sets add column if not exists is_public boolean not null default false;
alter table public.question_sets add column if not exists source_set_id uuid references public.question_sets(set_id) on delete set null;
alter table public.question_sets add column if not exists copy_count integer not null default 0;
update public.question_sets set is_public=true where owner_user_id is null;
alter table public.question_sets drop constraint if exists question_sets_unit_name_chapter_name_key;
create index if not exists question_sets_owner_idx on public.question_sets(owner_user_id,mission_position);

alter table public.video_labs add column if not exists is_public boolean not null default false;
alter table public.video_labs add column if not exists source_lab_id uuid references public.video_labs(lab_id) on delete set null;
alter table public.video_labs add column if not exists copy_count integer not null default 0;

drop policy if exists "signed in users read question sets" on public.question_sets;
create policy "owned or public question sets" on public.question_sets for select to authenticated using(is_public or owner_user_id=auth.uid() or owner_user_id is null or exists(select 1 from public.classes c where c.teacher_user_id=question_sets.owner_user_id and public.e3_can_access_class(c.class_id)));
drop policy if exists "teachers manage question sets" on public.question_sets;
create policy "teachers manage own question sets" on public.question_sets for all to authenticated using(owner_user_id=auth.uid()) with check(owner_user_id=auth.uid());
drop policy if exists "signed in users read questions" on public.study_questions;
create policy "users read accessible questions" on public.study_questions for select to authenticated using(exists(select 1 from public.question_sets s where s.set_id=study_questions.set_id));
drop policy if exists "teachers manage questions" on public.study_questions;
create policy "teachers manage own questions" on public.study_questions for all to authenticated using(exists(select 1 from public.question_sets s where s.set_id=study_questions.set_id and s.owner_user_id=auth.uid())) with check(exists(select 1 from public.question_sets s where s.set_id=study_questions.set_id and s.owner_user_id=auth.uid()));

create or replace function public.e3_set_question_set_visibility(requested_set_id uuid,requested_public boolean) returns boolean language plpgsql security definer set search_path=public as $$ begin update public.question_sets set is_public=coalesce(requested_public,false) where set_id=requested_set_id and owner_user_id=auth.uid();if not found then raise exception 'Question set not found or access denied';end if;return requested_public;end;$$;
create or replace function public.e3_copy_question_set(requested_set_id uuid) returns uuid language plpgsql security definer set search_path=public as $$ declare source public.question_sets%rowtype;result uuid;begin if not public.e3_is_teacher() or public.e3_is_developer() then raise exception 'Teacher account required';end if;select * into source from public.question_sets where set_id=requested_set_id and (owner_user_id=auth.uid() or is_public or owner_user_id is null);if source.set_id is null then raise exception 'Question set not found or private';end if;insert into public.question_sets(unit_name,chapter_name,mission_position,active,owner_user_id,is_public,source_set_id) values(source.unit_name,source.chapter_name,source.mission_position,source.active,auth.uid(),false,source.set_id) returning set_id into result;insert into public.study_questions(set_id,prompt,answers,correct_index,active) select result,prompt,answers,correct_index,active from public.study_questions where set_id=source.set_id;update public.question_sets set copy_count=copy_count+1 where set_id=source.set_id;return result;end;$$;
create or replace function public.e3_set_video_lab_visibility(requested_lab_id uuid,requested_public boolean) returns boolean language plpgsql security definer set search_path=public as $$ begin update public.video_labs set is_public=coalesce(requested_public,false),updated_at=now() where lab_id=requested_lab_id and owner_user_id=auth.uid();if not found then raise exception 'Video lab not found or access denied';end if;return requested_public;end;$$;
create or replace function public.e3_copy_video_lab(requested_lab_id uuid,requested_class_id uuid) returns uuid language plpgsql security definer set search_path=public as $$ declare source public.video_labs%rowtype;result uuid;begin if not exists(select 1 from public.classes where class_id=requested_class_id and teacher_user_id=auth.uid()) then raise exception 'Class access required';end if;select * into source from public.video_labs where lab_id=requested_lab_id and (owner_user_id=auth.uid() or is_public);if source.lab_id is null then raise exception 'Video lab not found or private';end if;insert into public.video_labs(class_id,owner_user_id,title,video_url,active,start_seconds,end_seconds,cuts,is_public,source_lab_id) values(requested_class_id,auth.uid(),source.title||' Copy',source.video_url,source.active,source.start_seconds,source.end_seconds,source.cuts,false,source.lab_id) returning lab_id into result;insert into public.video_lab_questions(lab_id,stop_seconds,prompt,answers,correct_index,time_limit) select result,stop_seconds,prompt,answers,correct_index,time_limit from public.video_lab_questions where lab_id=source.lab_id;update public.video_labs set copy_count=copy_count+1 where lab_id=source.lab_id;return result;end;$$;

revoke all on function public.e3_set_question_set_visibility(uuid,boolean),public.e3_copy_question_set(uuid),public.e3_set_video_lab_visibility(uuid,boolean),public.e3_copy_video_lab(uuid,uuid) from public,anon;
grant execute on function public.e3_set_question_set_visibility(uuid,boolean),public.e3_copy_question_set(uuid),public.e3_set_video_lab_visibility(uuid,boolean),public.e3_copy_video_lab(uuid,uuid) to authenticated,service_role;

create or replace function public.e3_study_flashcards(requested_class_id uuid,requested_mission_positions integer[])
returns jsonb language plpgsql stable security definer set search_path=public as $$declare cards jsonb;begin
  if not public.e3_can_access_class(requested_class_id) then raise exception 'Class access required' using errcode='42501';end if;
  if coalesce(cardinality(requested_mission_positions),0)=0 then return '[]'::jsonb;end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',q.question_id,'prompt',q.prompt,'answers',q.answers,'correctIndex',q.correct_index,'unit',sets.unit_name,'chapter',sets.chapter_name,'missionPosition',sets.mission_position) order by sets.mission_position,q.created_at),'[]'::jsonb) into cards
  from public.study_questions q join public.question_sets sets on sets.set_id=q.set_id join public.classes classes on classes.class_id=requested_class_id
  where q.active and sets.active and (sets.owner_user_id=classes.teacher_user_id or sets.owner_user_id is null) and sets.mission_position=any(requested_mission_positions) and sets.mission_position<=classes.mission_position;
  return cards;
end;$$;

create or replace function public.e3_next_study_question_for_chapters(requested_class_id uuid,requested_mission_positions integer[])
returns jsonb language plpgsql volatile security definer set search_path=public as $$declare selected record;points integer;pool_mastered boolean;begin
  if not public.e3_can_access_class(requested_class_id) then raise exception 'Class access required' using errcode='42501';end if;
  if coalesce(cardinality(requested_mission_positions),0)=0 then raise exception 'Select at least one chapter' using errcode='22023';end if;
  select coalesce(state.mastery_points,0) into points from public.student_study_state state where state.user_id=auth.uid() and state.class_id=requested_class_id;
  select coalesce(bool_and(coalesce(progress.correct_count,0)>0),false) into pool_mastered from public.study_questions q join public.question_sets sets on sets.set_id=q.set_id join public.classes classes on classes.class_id=requested_class_id left join public.student_question_progress progress on progress.question_id=q.question_id and progress.user_id=auth.uid() where q.active and sets.active and (sets.owner_user_id=classes.teacher_user_id or sets.owner_user_id is null) and sets.mission_position=any(requested_mission_positions) and sets.mission_position<=classes.mission_position;
  select q.question_id,q.prompt,q.answers,sets.unit_name,sets.chapter_name into selected from public.study_questions q join public.question_sets sets on sets.set_id=q.set_id join public.classes classes on classes.class_id=requested_class_id left join public.student_question_progress progress on progress.question_id=q.question_id and progress.user_id=auth.uid() where q.active and sets.active and (sets.owner_user_id=classes.teacher_user_id or sets.owner_user_id is null) and sets.mission_position=any(requested_mission_positions) and sets.mission_position<=classes.mission_position order by case when pool_mastered then random() else (-ln(greatest(random(),0.000001))/greatest(1,6-coalesce(progress.attempts,0)+coalesce(progress.wrong_count,0)*2)) end limit 1;
  if selected.question_id is null then return jsonb_build_object('question',null,'points',coalesce(points,0));end if;
  return jsonb_build_object('points',coalesce(points,0),'question',jsonb_build_object('id',selected.question_id,'prompt',selected.prompt,'answers',selected.answers,'unit',selected.unit_name,'chapter',selected.chapter_name));
end;$$;
notify pgrst,'reload schema';
