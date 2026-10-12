-- Daily game rewards roll over at 3:00 PM in the Pacific time zone.
-- America/Los_Angeles follows the local daylight-saving transition automatically.
create or replace function public.e3_game_date()
returns date language sql stable set search_path=public as $$
  select (timezone('America/Los_Angeles',now())-interval '15 hours')::date;
$$;

revoke all on function public.e3_game_date() from public,anon;
grant execute on function public.e3_game_date() to authenticated,service_role;
notify pgrst,'reload schema';
