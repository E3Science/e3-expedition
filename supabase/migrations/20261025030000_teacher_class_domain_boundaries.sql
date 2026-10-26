-- Manual classes and school-domain enforcement for manually authorized students.
create or replace function public.e3_create_manual_class(requested_name text)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare result public.classes%rowtype;generated_code text;
begin
  if not public.e3_is_teacher() or public.e3_is_developer() then raise exception 'Teacher account required' using errcode='42501';end if;
  if nullif(trim(requested_name),'') is null then raise exception 'Enter a class name';end if;
  generated_code:='E3-'||upper(substr(md5(auth.uid()::text||clock_timestamp()::text),1,8));
  insert into public.classes(class_code,class_name,teacher_user_id,mission_position) values(generated_code,trim(requested_name),auth.uid(),0) returning * into result;
  return jsonb_build_object('id',result.class_id,'code',result.class_code,'name',coalesce(result.class_name,result.class_code));
end;$$;
create or replace function public.e3_authorize_student(requested_class_id uuid,student_email text,student_display_name text default '')
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare target_user auth.users%rowtype;target_class public.classes%rowtype;teacher_email text;teacher_domain text;student_domain text;normalized_email text;
begin
  if not public.e3_is_teacher() or public.e3_is_developer() then raise exception 'Teacher account required' using errcode='42501';end if;
  select * into target_class from public.classes where class_id=requested_class_id and teacher_user_id=auth.uid();if target_class.class_id is null then raise exception 'Class not found or access denied';end if;
  normalized_email:=lower(trim(student_email));if normalized_email!~'^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'Enter a valid school email address';end if;
  select lower(email) into teacher_email from auth.users where id=auth.uid();teacher_domain:=split_part(teacher_email,'@',2);student_domain:=split_part(normalized_email,'@',2);
  if teacher_domain='' or student_domain<>teacher_domain then raise exception 'Student email must use the same school domain as the teacher (@%).',teacher_domain using errcode='22023';end if;
  if target_class.google_course_id is not null then insert into public.google_classroom_roster(google_course_id,google_user_id,email,display_name) values(target_class.google_course_id,'manual:'||normalized_email,normalized_email,nullif(trim(student_display_name),'')) on conflict(google_course_id,google_user_id) do update set email=excluded.email,display_name=excluded.display_name,synced_at=now();end if;
  select * into target_user from auth.users where lower(email)=normalized_email limit 1;if target_user.id is null then return jsonb_build_object('success',true,'pendingGoogleSignIn',true,'schoolDomain',teacher_domain);end if;
  if nullif(trim(student_display_name),'') is not null then insert into public.profiles(user_id,display_name) values(target_user.id,trim(student_display_name)) on conflict(user_id) do update set display_name=excluded.display_name;end if;
  insert into public.class_memberships(user_id,class_id,role) values(target_user.id,requested_class_id,'student') on conflict(user_id) do update set class_id=excluded.class_id,role='student';return jsonb_build_object('success',true,'pendingGoogleSignIn',false,'schoolDomain',teacher_domain);
end;$$;
revoke all on function public.e3_create_manual_class(text),public.e3_authorize_student(uuid,text,text) from public,anon;
grant execute on function public.e3_create_manual_class(text),public.e3_authorize_student(uuid,text,text) to authenticated,service_role;
notify pgrst,'reload schema';
