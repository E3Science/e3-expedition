-- Persistent Plate Motion simulation completions and milestone achievements.
-- Safe to run repeatedly in the Supabase SQL Editor.

alter table public.student_game_stats
  add column if not exists plate_motion_runs integer not null default 0
  check (plate_motion_runs >= 0);

create or replace function public.e3_complete_plate_motion_run(requested_class_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  run_count integer;
  earned integer[] := '{}';
begin
  if not public.e3_can_access_class(requested_class_id) then
    raise exception 'Class access required' using errcode='42501';
  end if;

  insert into public.student_game_stats(user_id,class_id,plate_motion_runs)
  values(auth.uid(),requested_class_id,1)
  on conflict(user_id,class_id) do update
    set plate_motion_runs=student_game_stats.plate_motion_runs+1,
        updated_at=now()
  returning plate_motion_runs into run_count;

  if run_count=1 then
    perform public.e3_award_achievement(auth.uid(),requested_class_id,'plate-motion:1','First Plate Motion Model','Completed the Plate Motion simulation','silver');
    earned:=array_append(earned,1);
  elsif run_count=10 then
    perform public.e3_award_achievement(auth.uid(),requested_class_id,'plate-motion:10','Plate Motion Investigator','Completed 10 Plate Motion model runs','silver');
    earned:=array_append(earned,10);
  elsif run_count=100 then
    perform public.e3_award_achievement(auth.uid(),requested_class_id,'plate-motion:100','Plate Motion Master','Rare achievement · completed 100 Plate Motion model runs','gold');
    earned:=array_append(earned,100);
  end if;

  return jsonb_build_object('success',true,'plateMotionRuns',run_count,'milestones',to_jsonb(earned));
end;
$$;

revoke all on function public.e3_complete_plate_motion_run(uuid) from public,anon;
grant execute on function public.e3_complete_plate_motion_run(uuid) to authenticated,service_role;

create or replace function public.e3_game_overview(requested_class_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb;
begin
  if not public.e3_can_access_class(requested_class_id) then raise exception 'Class access required' using errcode='42501'; end if;
  select jsonb_build_object(
    'studyCompletions',coalesce(stats.study_completions,0),
    'plateMotionRuns',coalesce(stats.plate_motion_runs,0),
    'sphereCompletions',jsonb_build_object('Geosphere',coalesce(stats.geosphere_completions,0),'Atmosphere',coalesce(stats.atmosphere_completions,0),'Hydrosphere',coalesce(stats.hydrosphere_completions,0),'Biosphere',coalesce(stats.biosphere_completions,0)),
    'itemsSold',coalesce(stats.items_sold,0),
    'achievementCount',(select count(*) from public.player_achievements where user_id=auth.uid() and class_id=requested_class_id),
    'novaCredits',coalesce((select nova_credits from public.student_wallets where user_id=auth.uid() and class_id=requested_class_id),0),
    'questTokens',coalesce((select sum(quantity) from public.inventories where user_id=auth.uid() and class_id=requested_class_id and item_id like 'comm_quest_token:%'),0),
    'skillPoints',coalesce((select sum(quantity) from public.inventories where user_id=auth.uid() and class_id=requested_class_id and item_id in ('progress_skill_geology','progress_skill_botany','progress_skill_zoology','progress_skill_chemistry','progress_skill_astrobiology')),0),
    'achievements',coalesce((select jsonb_agg(jsonb_build_object('key',achievement_key,'title',title,'detail',detail,'metal',metal,'earnedAt',earned_at) order by earned_at desc) from (select * from public.player_achievements where user_id=auth.uid() and class_id=requested_class_id order by earned_at desc limit 12) recent),'[]'::jsonb)
  ) into result from (select 1) seed left join public.student_game_stats stats on stats.user_id=auth.uid() and stats.class_id=requested_class_id;
  return result;
end;
$$;

grant execute on function public.e3_game_overview(uuid) to authenticated,service_role;
notify pgrst,'reload schema';
