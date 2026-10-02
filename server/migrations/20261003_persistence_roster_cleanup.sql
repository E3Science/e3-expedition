-- Persistence grants and removal of pre-login Google roster entries.
-- Safe to run repeatedly in the Supabase SQL Editor.

grant select on table public.inventories to authenticated;
grant select on table public.student_quests to authenticated;
grant select on table public.player_achievements to authenticated;
grant select on table public.student_game_stats to authenticated;

create or replace function public.e3_remove_student_access(
  requested_class_id uuid,
  requested_user_id uuid default null,
  student_email text default null
)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare course_id text; resolved_email text;
begin
  if not public.e3_is_teacher() then raise exception 'Teacher access required' using errcode='42501'; end if;
  select google_course_id into course_id from public.classes where class_id=requested_class_id;
  if not found then raise exception 'Class not found'; end if;
  resolved_email:=lower(nullif(trim(student_email),''));
  if requested_user_id is not null then
    if resolved_email is null then select lower(email) into resolved_email from auth.users where id=requested_user_id; end if;
    delete from public.class_memberships where class_id=requested_class_id and user_id=requested_user_id;
  end if;
  if course_id is not null and resolved_email is not null then
    delete from public.google_classroom_roster where google_course_id=course_id and lower(email)=resolved_email;
  end if;
  return jsonb_build_object('success',true);
end;
$$;

revoke all on function public.e3_remove_student_access(uuid,uuid,text) from public,anon;
grant execute on function public.e3_remove_student_access(uuid,uuid,text) to authenticated,service_role;
notify pgrst,'reload schema';
