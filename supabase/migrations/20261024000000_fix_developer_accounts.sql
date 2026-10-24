-- PostgreSQL requires RETURN QUERY columns to exactly match RETURNS TABLE.
-- auth.users.email is varchar, so normalize every exposed value explicitly.
create or replace function public.e3_developer_accounts()
returns table(
  id uuid,
  email text,
  display_name text,
  role text,
  last_sign_in_at timestamptz,
  classes jsonb
)
language plpgsql
stable
security definer
set search_path=public
as $$
begin
  if not public.e3_is_developer() then
    raise exception 'Developer access required' using errcode='42501';
  end if;

  return query
  select
    u.id::uuid,
    u.email::text,
    coalesce(p.display_name::text, split_part(u.email::text, '@', 1))::text,
    coalesce(
      nullif(u.raw_app_meta_data->>'e3_role', ''),
      case
        when exists(select 1 from public.classes c where c.teacher_user_id=u.id) then 'teacher'
        else 'student'
      end
    )::text,
    u.last_sign_in_at::timestamptz,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', c.class_id,
            'name', coalesce(c.class_name, c.class_code),
            'code', c.class_code
          )
        )
        from public.classes c
        left join public.class_memberships cm on cm.class_id=c.class_id
        where c.teacher_user_id=u.id or cm.user_id=u.id
      ),
      '[]'::jsonb
    )::jsonb
  from auth.users u
  left join public.profiles p on p.user_id=u.id
  order by u.last_sign_in_at desc nulls last, u.email;
end;
$$;

revoke all on function public.e3_developer_accounts() from public,anon;
grant execute on function public.e3_developer_accounts() to authenticated,service_role;

-- Exercise the result conversion during deployment when the developer exists.
do $$
declare
  developer_id uuid;
  returned_accounts bigint;
begin
  select id into developer_id
  from auth.users
  where lower(email)=lower('mnelsen79@gmail.com')
  limit 1;

  if developer_id is not null then
    perform set_config('request.jwt.claim.sub', developer_id::text, true);
    select count(*) into returned_accounts from public.e3_developer_accounts();
  end if;
end;
$$;

notify pgrst,'reload schema';
