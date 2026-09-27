-- Game-only overview statistics and milestone achievements.
-- Run after 20260927_learning_market_moderation.sql. Safe to run repeatedly.

create table if not exists public.student_game_stats (
  user_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid not null references public.classes(class_id) on delete cascade,
  study_completions integer not null default 0 check (study_completions >= 0),
  geosphere_completions integer not null default 0 check (geosphere_completions >= 0),
  atmosphere_completions integer not null default 0 check (atmosphere_completions >= 0),
  hydrosphere_completions integer not null default 0 check (hydrosphere_completions >= 0),
  biosphere_completions integer not null default 0 check (biosphere_completions >= 0),
  items_sold integer not null default 0 check (items_sold >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id,class_id)
);

create table if not exists public.player_achievements (
  achievement_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid not null references public.classes(class_id) on delete cascade,
  achievement_key text not null,
  title text not null,
  detail text not null default '',
  metal text not null default 'silver' check (metal in ('silver','gold')),
  earned_at timestamptz not null default now(),
  unique(user_id,class_id,achievement_key)
);

alter table public.student_game_stats enable row level security;
alter table public.player_achievements enable row level security;
drop policy if exists "players read own game stats" on public.student_game_stats;
create policy "players read own game stats" on public.student_game_stats for select to authenticated
using (user_id=auth.uid() or public.e3_is_teacher());
drop policy if exists "players read own achievements" on public.player_achievements;
create policy "players read own achievements" on public.player_achievements for select to authenticated
using (user_id=auth.uid() or public.e3_is_teacher());
revoke all on table public.student_game_stats,public.player_achievements from anon;
grant select on table public.student_game_stats,public.player_achievements to authenticated;
grant select,insert,update,delete on table public.student_game_stats,public.player_achievements to service_role;

create or replace function public.e3_award_achievement(target_user_id uuid,target_class_id uuid,target_key text,target_title text,target_detail text,target_metal text default 'silver')
returns void language sql security definer set search_path=public as $$
  insert into public.player_achievements(user_id,class_id,achievement_key,title,detail,metal)
  values(target_user_id,target_class_id,target_key,target_title,target_detail,case when target_metal='gold' then 'gold' else 'silver' end)
  on conflict(user_id,class_id,achievement_key) do nothing;
$$;
revoke all on function public.e3_award_achievement(uuid,uuid,text,text,text,text) from public,anon,authenticated;

create or replace function public.e3_game_overview(requested_class_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb;
begin
  if not public.e3_can_access_class(requested_class_id) then raise exception 'Class access required' using errcode='42501'; end if;
  select jsonb_build_object(
    'studyCompletions',coalesce(stats.study_completions,0),
    'sphereCompletions',jsonb_build_object(
      'Geosphere',coalesce(stats.geosphere_completions,0),
      'Atmosphere',coalesce(stats.atmosphere_completions,0),
      'Hydrosphere',coalesce(stats.hydrosphere_completions,0),
      'Biosphere',coalesce(stats.biosphere_completions,0)
    ),
    'itemsSold',coalesce(stats.items_sold,0),
    'achievementCount',(select count(*) from public.player_achievements where user_id=auth.uid() and class_id=requested_class_id),
    'novaCredits',coalesce((select nova_credits from public.student_wallets where user_id=auth.uid() and class_id=requested_class_id),0),
    'questTokens',coalesce((select sum(quantity) from public.inventories where user_id=auth.uid() and class_id=requested_class_id and item_id like 'comm_quest_token:%'),0),
    'skillPoints',coalesce((select sum(quantity) from public.inventories where user_id=auth.uid() and class_id=requested_class_id and item_id in ('progress_skill_geology','progress_skill_botany','progress_skill_zoology','progress_skill_chemistry','progress_skill_astrobiology')),0),
    'achievements',coalesce((select jsonb_agg(jsonb_build_object('key',achievement_key,'title',title,'detail',detail,'metal',metal,'earnedAt',earned_at) order by earned_at desc) from (select * from public.player_achievements where user_id=auth.uid() and class_id=requested_class_id order by earned_at desc limit 12) recent),'[]'::jsonb)
  ) into result
  from (select 1) seed left join public.student_game_stats stats on stats.user_id=auth.uid() and stats.class_id=requested_class_id;
  return result;
end;
$$;

create or replace function public.e3_answer_study_question(requested_class_id uuid, requested_question_id uuid, selected_index integer, selected_sphere text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare answer_index integer; was_correct boolean; points integer; resource text; quality text; item_key text; roll float; completion_count integer; sphere_name text;
begin
  if not public.e3_can_access_class(requested_class_id) then raise exception 'Class access required' using errcode='42501'; end if;
  select q.correct_index into answer_index from public.study_questions q join public.question_sets sets on sets.set_id=q.set_id join public.classes classes on classes.class_id=requested_class_id where q.question_id=requested_question_id and q.active and sets.active and sets.mission_position<=classes.mission_position;
  if answer_index is null then raise exception 'Question not found'; end if;
  was_correct:=selected_index=answer_index;
  insert into public.student_question_progress(user_id,question_id,attempts,correct_count,wrong_count,last_seen_at) values(auth.uid(),requested_question_id,1,case when was_correct then 1 else 0 end,case when was_correct then 0 else 1 end,now())
  on conflict(user_id,question_id) do update set attempts=student_question_progress.attempts+1,correct_count=student_question_progress.correct_count+case when was_correct then 1 else 0 end,wrong_count=student_question_progress.wrong_count+case when was_correct then 0 else 1 end,last_seen_at=now();
  insert into public.student_study_state(user_id,class_id,mastery_points) values(auth.uid(),requested_class_id,case when was_correct then 1 else 0 end)
  on conflict(user_id,class_id) do update set mastery_points=case when was_correct then least(10,student_study_state.mastery_points+1) else greatest(0,student_study_state.mastery_points-3) end returning mastery_points into points;
  if points<10 then return jsonb_build_object('correct',was_correct,'points',points,'reward',null); end if;
  update public.student_study_state set mastery_points=0 where user_id=auth.uid() and class_id=requested_class_id;
  sphere_name:=case when selected_sphere in ('Geosphere','Atmosphere','Hydrosphere','Biosphere') then selected_sphere else 'Biosphere' end;
  roll:=random(); resource:=case sphere_name when 'Geosphere' then case when roll<.4 then 'rock_sample' when roll<.8 then 'plant_sample' when roll<.9 then 'water_sample' else 'herbivore_specimen' end when 'Atmosphere' then case when roll<.4 then 'herbivore_specimen' when roll<.8 then 'water_sample' when roll<.9 then 'plant_sample' else 'rock_sample' end when 'Hydrosphere' then case when roll<.4 then 'water_sample' when roll<.8 then 'plant_sample' when roll<.9 then 'rock_sample' else 'herbivore_specimen' end else case when roll<.4 then 'plant_sample' when roll<.8 then 'herbivore_specimen' when roll<.9 then 'water_sample' else 'rock_sample' end end;
  roll:=random(); quality:=case when roll<.60 then 'common' when roll<.85 then 'uncommon' when roll<.95 then 'rare' when roll<.99 then 'epic' else 'legendary' end; item_key:=resource||':'||quality;
  insert into public.inventories(user_id,class_id,item_id,quantity) values(auth.uid(),requested_class_id,item_key,1) on conflict(user_id,class_id,item_id) do update set quantity=inventories.quantity+1;
  insert into public.student_game_stats(user_id,class_id,study_completions,geosphere_completions,atmosphere_completions,hydrosphere_completions,biosphere_completions)
  values(auth.uid(),requested_class_id,1,case when sphere_name='Geosphere' then 1 else 0 end,case when sphere_name='Atmosphere' then 1 else 0 end,case when sphere_name='Hydrosphere' then 1 else 0 end,case when sphere_name='Biosphere' then 1 else 0 end)
  on conflict(user_id,class_id) do update set study_completions=student_game_stats.study_completions+1,geosphere_completions=student_game_stats.geosphere_completions+excluded.geosphere_completions,atmosphere_completions=student_game_stats.atmosphere_completions+excluded.atmosphere_completions,hydrosphere_completions=student_game_stats.hydrosphere_completions+excluded.hydrosphere_completions,biosphere_completions=student_game_stats.biosphere_completions+excluded.biosphere_completions,updated_at=now() returning study_completions into completion_count;
  if completion_count=1 then perform public.e3_award_achievement(auth.uid(),requested_class_id,'study:1','First Archive Complete',sphere_name||' expedition completed','silver'); end if;
  if completion_count in (10,25,50) or completion_count%100=0 then perform public.e3_award_achievement(auth.uid(),requested_class_id,'study:'||completion_count,completion_count||' Archives Complete','Orbital Study Archive mastery milestone','gold'); end if;
  return jsonb_build_object('correct',was_correct,'points',0,'reward',jsonb_build_object('itemKey',item_key,'quality',quality,'presentation','resource_wheel','resourceTier',1,'cooldownMs',2200),'studyCompletions',completion_count);
end;
$$;

create or replace function public.e3_sell_inventory_item(requested_class_id uuid, requested_item_id text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare item_rarity text; item_price integer; remaining integer; sale_count integer;
begin
  if not public.e3_can_access_class(requested_class_id) then raise exception 'Class access required' using errcode='42501'; end if;
  item_rarity:=coalesce(nullif(split_part(requested_item_id,':',2),''),'common'); item_price:=case item_rarity when 'legendary' then 180 when 'epic' then 75 when 'rare' then 30 when 'uncommon' then 12 else 5 end;
  update public.inventories set quantity=quantity-1 where user_id=auth.uid() and class_id=requested_class_id and item_id=requested_item_id and quantity>0 returning quantity into remaining;
  if remaining is null then raise exception 'Item is not available'; end if;
  delete from public.inventories where user_id=auth.uid() and class_id=requested_class_id and item_id=requested_item_id and quantity<=0;
  insert into public.student_wallets(user_id,class_id,nova_credits) values(auth.uid(),requested_class_id,item_price) on conflict(user_id,class_id) do update set nova_credits=student_wallets.nova_credits+item_price;
  insert into public.market_listings(class_id,seller_id,item_id,rarity,price) values(requested_class_id,auth.uid(),requested_item_id,item_rarity,item_price);
  insert into public.student_game_stats(user_id,class_id,items_sold) values(auth.uid(),requested_class_id,1) on conflict(user_id,class_id) do update set items_sold=student_game_stats.items_sold+1,updated_at=now() returning items_sold into sale_count;
  if sale_count in (1,10,100,1000) then perform public.e3_award_achievement(auth.uid(),requested_class_id,'sales:'||sale_count,case when sale_count=1 then 'First Market Sale' else sale_count||' Items Sold' end,'Nova Trading Post milestone',case when sale_count>=100 then 'gold' else 'silver' end); end if;
  return jsonb_build_object('success',true,'creditsEarned',item_price,'itemsSold',sale_count);
end;
$$;

create or replace function public.e3_set_mission_position(requested_class_id uuid, requested_position integer)
returns jsonb language plpgsql security definer set search_path=public as $$
declare next_position integer; previous_position integer; award_title text; award_detail text; award_kind text; member record;
begin
  if not public.e3_is_teacher() then raise exception 'Teacher access required' using errcode='42501'; end if;
  select mission_position into previous_position from public.classes where class_id=requested_class_id for update;
  if previous_position is null then raise exception 'Class not found'; end if;
  next_position:=greatest(0,least(36,requested_position)); update public.classes set mission_position=next_position where class_id=requested_class_id;
  if next_position>previous_position and previous_position>0 then
    award_kind:=case when previous_position in (4,8,13,18,23,28,32,36) then 'unit' else 'chapter' end;
    award_title:=case previous_position when 4 then 'Science 101 Complete' when 8 then 'Geology of Mars Complete' when 13 then 'Plate Motion Complete' when 18 then 'Rock Transformation Complete' when 23 then 'Phase Change Complete' when 28 then 'Chemical Reaction Complete' when 32 then 'Population & Resources Complete' when 36 then 'Matter & Energy in Ecosystems Complete' else 'Chapter Complete' end;
    award_detail:=case previous_position when 1 then 'Science 101 · Chapter 1' when 2 then 'Science 101 · Chapter 2' when 3 then 'Science 101 · Chapter 3' when 5 then 'Geology of Mars · Chapter 1' when 6 then 'Geology of Mars · Chapter 2' when 7 then 'Geology of Mars · Chapter 3' when 9 then 'Plate Motion · Chapter 1' when 10 then 'Plate Motion · Chapter 2' when 11 then 'Plate Motion · Chapter 3' when 12 then 'Plate Motion · Chapter 4' when 14 then 'Rock Transformation · Chapter 1' when 15 then 'Rock Transformation · Chapter 2' when 16 then 'Rock Transformation · Chapter 3' when 17 then 'Rock Transformation · Chapter 4' when 19 then 'Phase Change · Chapter 1' when 20 then 'Phase Change · Chapter 2' when 21 then 'Phase Change · Chapter 3' when 22 then 'Phase Change · Chapter 4' when 24 then 'Chemical Reaction · Chapter 1' when 25 then 'Chemical Reaction · Chapter 2' when 26 then 'Chemical Reaction · Chapter 3' when 27 then 'Chemical Reaction · Chapter 4' when 29 then 'Population & Resources · Chapter 1' when 30 then 'Population & Resources · Chapter 2' when 31 then 'Population & Resources · Chapter 3' when 33 then 'Matter & Energy in Ecosystems · Chapter 1' when 34 then 'Matter & Energy in Ecosystems · Chapter 2' when 35 then 'Matter & Energy in Ecosystems · Chapter 3' else award_title end;
    if award_kind='unit' then award_detail:='Voyage unit completed'; end if;
    for member in select user_id from public.class_memberships where class_id=requested_class_id loop perform public.e3_award_achievement(member.user_id,requested_class_id,award_kind||':'||previous_position,award_title,award_detail,case when award_kind='unit' then 'gold' else 'silver' end); end loop;
  end if;
  return jsonb_build_object('success',true,'missionPosition',next_position);
end;
$$;

revoke all on function public.e3_game_overview(uuid) from public,anon;
grant execute on function public.e3_game_overview(uuid) to authenticated,service_role;
grant execute on function public.e3_answer_study_question(uuid,uuid,integer,text),public.e3_sell_inventory_item(uuid,text),public.e3_set_mission_position(uuid,integer) to authenticated,service_role;
