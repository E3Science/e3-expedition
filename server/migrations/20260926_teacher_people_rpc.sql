-- Render-independent teacher roster and account administration.
-- Run in the Supabase SQL Editor. Safe to run repeatedly.

create or replace function public.e3_is_teacher()
returns boolean language sql stable as $$
  select
    coalesce(auth.jwt() -> 'app_metadata' ->> 'e3_role', '') = 'teacher'
    or lower(coalesce(auth.jwt() ->> 'email', '')) = 'mnelsen@susd.net';
$$;

revoke all on function public.e3_is_teacher() from public, anon;
grant execute on function public.e3_is_teacher() to authenticated, service_role;

create or replace function public.e3_teacher_people()
returns jsonb language plpgsql stable security definer set search_path = public, auth as $$
declare result jsonb;
begin
  if not public.e3_is_teacher() then raise exception 'Teacher access required' using errcode = '42501'; end if;
  select jsonb_build_object('accounts', coalesce(jsonb_agg(jsonb_build_object(
    'userId', users.id,
    'email', users.email,
    'displayName', coalesce(profiles.display_name, users.raw_user_meta_data ->> 'display_name', split_part(users.email, '@', 1)),
    'role', case when lower(users.email) = 'mnelsen@susd.net' or users.raw_app_meta_data ->> 'e3_role' = 'teacher' then 'teacher' else 'student' end,
    'classId', memberships.class_id,
    'classCode', classes.class_code,
    'className', classes.class_name,
    'createdAt', users.created_at,
    'lastSignInAt', users.last_sign_in_at
  ) order by users.created_at desc), '[]'::jsonb)) into result
  from auth.users users
  left join public.profiles profiles on profiles.user_id = users.id
  left join public.class_memberships memberships on memberships.user_id = users.id
  left join public.classes classes on classes.class_id = memberships.class_id;
  return result;
end;
$$;

create or replace function public.e3_class_roster(requested_class_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public, auth as $$
declare result jsonb;
begin
  if not public.e3_is_teacher() then raise exception 'Teacher access required' using errcode = '42501'; end if;
  select jsonb_build_object(
    'class', jsonb_build_object('id', classes.class_id, 'code', classes.class_code, 'name', coalesce(classes.class_name, classes.class_code)),
    'students', coalesce((
      select jsonb_agg(student order by student ->> 'displayName') from (
        select distinct jsonb_build_object(
          'userId', users.id,
          'email', coalesce(users.email, roster.email),
          'displayName', coalesce(profiles.display_name, roster.display_name, split_part(users.email, '@', 1), 'Student'),
          'inClass', memberships.user_id is not null
        ) student
        from public.google_classroom_roster roster
        left join auth.users users on lower(users.email) = lower(roster.email)
        left join public.profiles profiles on profiles.user_id = users.id
        left join public.class_memberships memberships on memberships.user_id = users.id and memberships.class_id = classes.class_id
        where roster.google_course_id = classes.google_course_id
        union
        select jsonb_build_object(
          'userId', users.id,
          'email', users.email,
          'displayName', coalesce(profiles.display_name, split_part(users.email, '@', 1), 'Student'),
          'inClass', true
        )
        from public.class_memberships memberships
        join auth.users users on users.id = memberships.user_id
        left join public.profiles profiles on profiles.user_id = users.id
        where memberships.class_id = classes.class_id
      ) combined
    ), '[]'::jsonb)
  ) into result
  from public.classes classes where classes.class_id = requested_class_id;
  if result is null then raise exception 'Class not found'; end if;
  return result;
end;
$$;

create or replace function public.e3_authorize_student(requested_class_id uuid, student_email text, student_display_name text default '')
returns jsonb language plpgsql security definer set search_path = public, auth as $$
declare target_user auth.users%rowtype; target_class public.classes%rowtype;
begin
  if not public.e3_is_teacher() then raise exception 'Teacher access required' using errcode = '42501'; end if;
  select * into target_class from public.classes where class_id = requested_class_id;
  if target_class.class_id is null then raise exception 'Class not found'; end if;
  if target_class.google_course_id is not null then
    insert into public.google_classroom_roster(google_course_id, google_user_id, email, display_name)
    values(target_class.google_course_id, 'manual:' || lower(trim(student_email)), lower(trim(student_email)), nullif(trim(student_display_name), ''))
    on conflict (google_course_id, google_user_id) do update set email = excluded.email, display_name = excluded.display_name, synced_at = now();
  end if;
  select * into target_user from auth.users where lower(email) = lower(trim(student_email)) limit 1;
  if target_user.id is null then return jsonb_build_object('success', true, 'pendingGoogleSignIn', true); end if;
  if nullif(trim(student_display_name), '') is not null then
    insert into public.profiles(user_id, display_name) values(target_user.id, trim(student_display_name))
    on conflict (user_id) do update set display_name = excluded.display_name;
  end if;
  insert into public.class_memberships(user_id, class_id, role) values(target_user.id, requested_class_id, 'student')
  on conflict (user_id) do update set class_id = excluded.class_id, role = 'student';
  return jsonb_build_object('success', true, 'pendingGoogleSignIn', false);
end;
$$;

create or replace function public.e3_remove_student(requested_class_id uuid, requested_user_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.e3_is_teacher() then raise exception 'Teacher access required' using errcode = '42501'; end if;
  delete from public.class_memberships where class_id = requested_class_id and user_id = requested_user_id;
  return jsonb_build_object('success', true);
end;
$$;

create or replace function public.e3_student_overview(requested_class_id uuid, requested_user_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public, auth as $$
declare result jsonb;
begin
  if not public.e3_is_teacher() then raise exception 'Teacher access required' using errcode = '42501'; end if;
  select jsonb_build_object('student', jsonb_build_object(
    'userId', users.id, 'email', users.email,
    'displayName', coalesce(profiles.display_name, split_part(users.email, '@', 1), 'Student'),
    'online', false,
    'inventoryItems', coalesce((select sum(quantity) from public.inventories where user_id = users.id and class_id = requested_class_id), 0),
    'inventoryTypes', coalesce((select count(*) from public.inventories where user_id = users.id and class_id = requested_class_id and quantity > 0), 0)
  )) into result
  from auth.users users left join public.profiles profiles on profiles.user_id = users.id
  where users.id = requested_user_id;
  if result is null then raise exception 'Student not found'; end if;
  return result;
end;
$$;

create or replace function public.e3_update_person(requested_user_id uuid, requested_role text, requested_class_id uuid default null)
returns jsonb language plpgsql security definer set search_path = public, auth as $$
declare target_email text; normalized_role text;
begin
  if not public.e3_is_teacher() then raise exception 'Teacher access required' using errcode = '42501'; end if;
  normalized_role := case when requested_role = 'teacher' then 'teacher' else 'student' end;
  select email into target_email from auth.users where id = requested_user_id;
  if target_email is null then raise exception 'Account not found'; end if;
  if lower(target_email) = 'mnelsen@susd.net' and normalized_role <> 'teacher' then raise exception 'The primary E3 administrator cannot be demoted.'; end if;
  update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('e3_role', normalized_role)
  where id = requested_user_id;
  if normalized_role = 'teacher' or requested_class_id is null then
    delete from public.class_memberships where user_id = requested_user_id;
  else
    insert into public.class_memberships(user_id, class_id, role) values(requested_user_id, requested_class_id, 'student')
    on conflict (user_id) do update set class_id = excluded.class_id, role = 'student';
  end if;
  return jsonb_build_object('success', true, 'role', normalized_role, 'classId', requested_class_id, 'requiresRelogin', true);
end;
$$;

revoke all on function public.e3_teacher_people() from public, anon;
revoke all on function public.e3_class_roster(uuid) from public, anon;
revoke all on function public.e3_authorize_student(uuid, text, text) from public, anon;
revoke all on function public.e3_remove_student(uuid, uuid) from public, anon;
revoke all on function public.e3_student_overview(uuid, uuid) from public, anon;
revoke all on function public.e3_update_person(uuid, text, uuid) from public, anon;
grant execute on function public.e3_teacher_people() to authenticated, service_role;
grant execute on function public.e3_class_roster(uuid) to authenticated, service_role;
grant execute on function public.e3_authorize_student(uuid, text, text) to authenticated, service_role;
grant execute on function public.e3_remove_student(uuid, uuid) to authenticated, service_role;
grant execute on function public.e3_student_overview(uuid, uuid) to authenticated, service_role;
grant execute on function public.e3_update_person(uuid, text, uuid) to authenticated, service_role;
