-- Let students build an exact study pool from chapters through the class's current chapter.
create or replace function public.e3_next_study_question_for_chapters(
  requested_class_id uuid,
  requested_mission_positions integer[]
)
returns jsonb
language plpgsql
volatile
security definer
set search_path=public
as $$
declare
  selected record;
  points integer;
  pool_mastered boolean;
begin
  if not public.e3_can_access_class(requested_class_id) then
    raise exception 'Class access required' using errcode='42501';
  end if;
  if coalesce(cardinality(requested_mission_positions),0)=0 then
    raise exception 'Select at least one chapter' using errcode='22023';
  end if;

  select coalesce(state.mastery_points,0) into points
  from public.student_study_state state
  where state.user_id=auth.uid() and state.class_id=requested_class_id;

  select coalesce(bool_and(coalesce(progress.correct_count,0)>0),false) into pool_mastered
  from public.study_questions q
  join public.question_sets sets on sets.set_id=q.set_id
  join public.classes classes on classes.class_id=requested_class_id
  left join public.student_question_progress progress on progress.question_id=q.question_id and progress.user_id=auth.uid()
  where q.active and sets.active
    and sets.mission_position=any(requested_mission_positions)
    and sets.mission_position<=classes.mission_position;

  select q.question_id,q.prompt,q.answers,sets.unit_name,sets.chapter_name into selected
  from public.study_questions q
  join public.question_sets sets on sets.set_id=q.set_id
  join public.classes classes on classes.class_id=requested_class_id
  left join public.student_question_progress progress on progress.question_id=q.question_id and progress.user_id=auth.uid()
  where q.active and sets.active
    and sets.mission_position=any(requested_mission_positions)
    and sets.mission_position<=classes.mission_position
  order by case when pool_mastered then random() else (-ln(greatest(random(),0.000001))/greatest(1,6-coalesce(progress.attempts,0)+coalesce(progress.wrong_count,0)*2)) end
  limit 1;

  if selected.question_id is null then
    return jsonb_build_object('question',null,'points',coalesce(points,0));
  end if;
  return jsonb_build_object(
    'points',coalesce(points,0),
    'question',jsonb_build_object('id',selected.question_id,'prompt',selected.prompt,'answers',selected.answers,'unit',selected.unit_name,'chapter',selected.chapter_name)
  );
end;
$$;

create or replace function public.e3_study_flashcards(
  requested_class_id uuid,
  requested_mission_positions integer[]
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare cards jsonb;
begin
  if not public.e3_can_access_class(requested_class_id) then
    raise exception 'Class access required' using errcode='42501';
  end if;
  if coalesce(cardinality(requested_mission_positions),0)=0 then
    return '[]'::jsonb;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',q.question_id,
    'prompt',q.prompt,
    'answers',q.answers,
    'correctIndex',q.correct_index,
    'unit',sets.unit_name,
    'chapter',sets.chapter_name,
    'missionPosition',sets.mission_position
  ) order by sets.mission_position,q.created_at),'[]'::jsonb) into cards
  from public.study_questions q
  join public.question_sets sets on sets.set_id=q.set_id
  join public.classes classes on classes.class_id=requested_class_id
  where q.active and sets.active
    and sets.mission_position=any(requested_mission_positions)
    and sets.mission_position<=classes.mission_position;
  return cards;
end;
$$;

revoke all on function public.e3_next_study_question_for_chapters(uuid,integer[]) from public,anon;
revoke all on function public.e3_study_flashcards(uuid,integer[]) from public,anon;
grant execute on function public.e3_next_study_question_for_chapters(uuid,integer[]) to authenticated,service_role;
grant execute on function public.e3_study_flashcards(uuid,integer[]) to authenticated,service_role;
notify pgrst,'reload schema';
