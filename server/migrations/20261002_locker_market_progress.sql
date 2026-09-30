-- Locker Room equipment, buyer achievements, and skill-weighted study rewards.
-- Run after 20261001_stacked_trading_post.sql. Safe to run repeatedly.

alter table public.student_game_stats add column if not exists items_bought integer not null default 0;
alter table public.student_game_stats drop constraint if exists student_game_stats_items_bought_check;
alter table public.student_game_stats add constraint student_game_stats_items_bought_check check (items_bought>=0);

create table if not exists public.player_equipment (
  user_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid not null references public.classes(class_id) on delete cascade,
  slot text not null check (slot in ('boots','helmet')),
  item_key text not null check (item_key in ('expedition_boots','expedition_helmet')),
  equipped_at timestamptz not null default now(),
  primary key(user_id,class_id,slot)
);
alter table public.player_equipment enable row level security;
drop policy if exists "players read own equipment" on public.player_equipment;
create policy "players read own equipment" on public.player_equipment for select to authenticated using(user_id=auth.uid() or public.e3_is_teacher());
revoke all on table public.player_equipment from anon;
grant select on table public.player_equipment to authenticated;
grant select,insert,update,delete on table public.player_equipment to service_role;

create or replace function public.e3_locker_snapshot(requested_class_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare equipment jsonb;
begin
  if not public.e3_can_access_class(requested_class_id) then raise exception 'Class access required' using errcode='42501'; end if;
  select coalesce(jsonb_object_agg(slot,item_key),'{}'::jsonb) into equipment from public.player_equipment where user_id=auth.uid() and class_id=requested_class_id;
  return jsonb_build_object('equipped',equipment);
end;
$$;

create or replace function public.e3_equip_locker_item(requested_class_id uuid,requested_slot text,requested_item_key text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if not public.e3_can_access_class(requested_class_id) then raise exception 'Class access required' using errcode='42501'; end if;
  if requested_slot not in ('boots','helmet') then raise exception 'Unknown equipment slot.'; end if;
  if requested_item_key is null or requested_item_key='' then
    delete from public.player_equipment where user_id=auth.uid() and class_id=requested_class_id and slot=requested_slot;
  else
    if (requested_slot='boots' and requested_item_key<>'expedition_boots') or (requested_slot='helmet' and requested_item_key<>'expedition_helmet') then raise exception 'That item does not fit this equipment slot.'; end if;
    insert into public.player_equipment(user_id,class_id,slot,item_key) values(auth.uid(),requested_class_id,requested_slot,requested_item_key)
    on conflict(user_id,class_id,slot) do update set item_key=excluded.item_key,equipped_at=now();
  end if;
  return public.e3_locker_snapshot(requested_class_id);
end;
$$;

create or replace function public.e3_buy_market_stack(requested_class_id uuid, requested_item_id text, requested_quantity integer)
returns jsonb language plpgsql security definer set search_path=public as $$
declare selected_ids uuid[]; selected_count integer; total_price integer; remaining_balance integer; purchase_count integer; milestone integer; earned_milestones integer[]:='{}';
begin
  if not public.e3_can_access_class(requested_class_id) then raise exception 'Class access required' using errcode='42501'; end if;
  if requested_quantity is null or requested_quantity<1 or requested_quantity>100 then raise exception 'Choose a quantity from 1 to 100.'; end if;
  select array_agg(chosen.listing_id),count(*)::integer,coalesce(sum(chosen.price),0)::integer into selected_ids,selected_count,total_price
  from (select listing_id,price from public.market_listings where class_id=requested_class_id and item_id=requested_item_id and status='available' order by created_at,listing_id for update skip locked limit requested_quantity) chosen;
  if coalesce(selected_count,0)<requested_quantity then raise exception 'Only % of this item remain available.',coalesce(selected_count,0); end if;
  update public.student_wallets set nova_credits=nova_credits-total_price where user_id=auth.uid() and class_id=requested_class_id and nova_credits>=total_price returning nova_credits into remaining_balance;
  if remaining_balance is null then raise exception 'Not enough Nova Credits for this quantity.'; end if;
  update public.market_listings set status='sold',buyer_id=auth.uid(),sold_at=now() where listing_id=any(selected_ids);
  insert into public.inventories(user_id,class_id,item_id,quantity) values(auth.uid(),requested_class_id,requested_item_id,requested_quantity) on conflict(user_id,class_id,item_id) do update set quantity=inventories.quantity+excluded.quantity;
  insert into public.student_game_stats(user_id,class_id,items_bought) values(auth.uid(),requested_class_id,requested_quantity)
  on conflict(user_id,class_id) do update set items_bought=student_game_stats.items_bought+excluded.items_bought,updated_at=now() returning items_bought into purchase_count;
  foreach milestone in array array[1,10,100,1000] loop
    if purchase_count>=milestone and purchase_count-requested_quantity<milestone then
      perform public.e3_award_achievement(auth.uid(),requested_class_id,'purchases:'||milestone,case when milestone=1 then 'First Market Purchase' else milestone||' Items Purchased' end,'Nova Trading Post milestone',case when milestone>=100 then 'gold' else 'silver' end);
      earned_milestones:=array_append(earned_milestones,milestone);
    end if;
  end loop;
  return jsonb_build_object('success',true,'itemId',requested_item_id,'quantity',requested_quantity,'totalPrice',total_price,'credits',remaining_balance,'itemsBought',purchase_count,'purchaseMilestones',to_jsonb(earned_milestones));
end;
$$;

create or replace function public.e3_answer_study_question(requested_class_id uuid, requested_question_id uuid, selected_index integer, selected_sphere text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare answer_index integer; was_correct boolean; points integer; resource text; quality text; item_key text; roll float; completion_count integer; sphere_name text; skill_key text; skill_xp integer; skill_level integer:=1; level_cost integer:=20; mastery_steps integer; common_chance float; uncommon_chance float; rare_chance float; epic_chance float;
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
  skill_key:=case resource when 'rock_sample' then 'geology' when 'plant_sample' then 'botany' when 'herbivore_specimen' then 'zoology' else 'chemistry' end;
  select coalesce(quantity,0) into skill_xp from public.inventories where user_id=auth.uid() and class_id=requested_class_id and item_id='progress_skill_'||skill_key;
  skill_xp:=coalesce(skill_xp,0);
  while skill_xp>=level_cost and skill_level<20 loop skill_xp:=skill_xp-level_cost; skill_level:=skill_level+1; level_cost:=level_cost*2; end loop;
  mastery_steps:=skill_level-1+case when exists(select 1 from public.inventories where user_id=auth.uid() and class_id=requested_class_id and item_id='progress_special_'||skill_key||'_mastery' and quantity>0) then 3 else 0 end;
  common_chance:=greatest(.25,.60-mastery_steps*.001); uncommon_chance:=.25+mastery_steps*.00059; rare_chance:=.10+mastery_steps*.00030; epic_chance:=.04+mastery_steps*.00010;
  roll:=random(); quality:=case when roll<common_chance then 'common' when roll<common_chance+uncommon_chance then 'uncommon' when roll<common_chance+uncommon_chance+rare_chance then 'rare' when roll<common_chance+uncommon_chance+rare_chance+epic_chance then 'epic' else 'legendary' end;
  item_key:=resource||':'||quality;
  insert into public.inventories(user_id,class_id,item_id,quantity) values(auth.uid(),requested_class_id,item_key,1) on conflict(user_id,class_id,item_id) do update set quantity=inventories.quantity+1;
  insert into public.student_game_stats(user_id,class_id,study_completions,geosphere_completions,atmosphere_completions,hydrosphere_completions,biosphere_completions) values(auth.uid(),requested_class_id,1,case when sphere_name='Geosphere' then 1 else 0 end,case when sphere_name='Atmosphere' then 1 else 0 end,case when sphere_name='Hydrosphere' then 1 else 0 end,case when sphere_name='Biosphere' then 1 else 0 end)
  on conflict(user_id,class_id) do update set study_completions=student_game_stats.study_completions+1,geosphere_completions=student_game_stats.geosphere_completions+excluded.geosphere_completions,atmosphere_completions=student_game_stats.atmosphere_completions+excluded.atmosphere_completions,hydrosphere_completions=student_game_stats.hydrosphere_completions+excluded.hydrosphere_completions,biosphere_completions=student_game_stats.biosphere_completions+excluded.biosphere_completions,updated_at=now() returning study_completions into completion_count;
  if completion_count=1 then perform public.e3_award_achievement(auth.uid(),requested_class_id,'study:1','First Archive Complete',sphere_name||' expedition completed','silver'); end if;
  if completion_count in (10,25,50) or completion_count%100=0 then perform public.e3_award_achievement(auth.uid(),requested_class_id,'study:'||completion_count,completion_count||' Archives Complete','Orbital Study Archive mastery milestone','gold'); end if;
  return jsonb_build_object('correct',was_correct,'points',0,'reward',jsonb_build_object('itemKey',item_key,'quality',quality,'presentation','resource_wheel','resourceTier',1,'cooldownMs',2200),'studyCompletions',completion_count,'masterySteps',mastery_steps);
end;
$$;

revoke all on function public.e3_locker_snapshot(uuid),public.e3_equip_locker_item(uuid,text,text),public.e3_buy_market_stack(uuid,text,integer) from public,anon;
grant execute on function public.e3_locker_snapshot(uuid),public.e3_equip_locker_item(uuid,text,text),public.e3_buy_market_stack(uuid,text,integer) to authenticated,service_role;
notify pgrst, 'reload schema';
