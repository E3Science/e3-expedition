-- A developer-only class for isolated teacher/student interface testing.
alter table public.classes add column if not exists is_developer_sandbox boolean not null default false;
create or replace function public.e3_developer_sandbox_context(requested_role text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare sandbox public.classes%rowtype;context jsonb;mode text;
begin
  if not public.e3_is_developer() then raise exception 'Developer access required' using errcode='42501';end if;
  mode:=case when requested_role='student' then 'student' else 'teacher' end;
  select * into sandbox from public.classes where teacher_user_id=auth.uid() and is_developer_sandbox order by class_name limit 1;
  if sandbox.class_id is null then insert into public.classes(class_code,class_name,teacher_user_id,mission_position,is_developer_sandbox) values('DEV-'||upper(substr(md5(auth.uid()::text),1,8)),'Developer Test Class',auth.uid(),1,true) returning * into sandbox;end if;
  context:=public.e3_developer_account_context(auth.uid(),sandbox.class_id);
  return context||jsonb_build_object('role',mode,'displayName',case when mode='student' then 'Developer · Student Test' else 'Developer · Teacher Test' end,'selectedClassId',sandbox.class_id,'classes',jsonb_build_array(jsonb_build_object('id',sandbox.class_id,'name',sandbox.class_name,'code',sandbox.class_code,'missionPosition',sandbox.mission_position)));
end;$$;
revoke all on function public.e3_developer_sandbox_context(text) from public,anon;
grant execute on function public.e3_developer_sandbox_context(text) to authenticated,service_role;
notify pgrst,'reload schema';
