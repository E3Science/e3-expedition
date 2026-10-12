-- Persistent experience, daily rewards, weekly login streaks, and Trading Post skill pricing.
-- Run after 20261004_plate_motion_achievements.sql. Safe to run repeatedly.

alter table public.student_game_stats add column if not exists experience_points integer not null default 0;
alter table public.student_game_stats drop constraint if exists student_game_stats_experience_points_check;
alter table public.student_game_stats add constraint student_game_stats_experience_points_check check(experience_points>=0);

create table if not exists public.player_reward_events (
  reward_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid not null references public.classes(class_id) on delete cascade,
  reward_key text not null,
  experience_points integer not null default 0 check(experience_points>=0),
  nova_credits integer not null default 0 check(nova_credits>=0),
  awarded_at timestamptz not null default now(),
  unique(user_id,class_id,reward_key)
);

create table if not exists public.player_login_streaks (
  user_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid not null references public.classes(class_id) on delete cascade,
  week_started_on date not null,
  last_claimed_on date not null,
  streak_day integer not null default 1 check(streak_day between 1 and 7),
  primary key(user_id,class_id)
);

create table if not exists public.player_daily_activity (
  user_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid not null references public.classes(class_id) on delete cascade,
  activity_date date not null,
  plate_motion_runs integer not null default 0 check(plate_motion_runs>=0),
  plate_motion_rewarded boolean not null default false,
  primary key(user_id,class_id,activity_date)
);

create table if not exists public.player_economy_skills (
  user_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid not null references public.classes(class_id) on delete cascade,
  market_rank integer not null default 0 check(market_rank between 0 and 5),
  spent_skill_points integer not null default 0 check(spent_skill_points>=0),
  updated_at timestamptz not null default now(),
  primary key(user_id,class_id)
);

-- Normalize unsold legacy listings to the new buyer-facing price scale.
update public.market_listings set price=case rarity when 'legendary' then 360 when 'epic' then 150 when 'rare' then 60 when 'uncommon' then 24 else 10 end where status='available';

alter table public.player_reward_events enable row level security;
alter table public.player_login_streaks enable row level security;
alter table public.player_daily_activity enable row level security;
alter table public.player_economy_skills enable row level security;
drop policy if exists "players read own rewards" on public.player_reward_events;
create policy "players read own rewards" on public.player_reward_events for select to authenticated using(user_id=auth.uid() or public.e3_is_teacher());
drop policy if exists "players read own login streak" on public.player_login_streaks;
create policy "players read own login streak" on public.player_login_streaks for select to authenticated using(user_id=auth.uid() or public.e3_is_teacher());
drop policy if exists "players read own daily activity" on public.player_daily_activity;
create policy "players read own daily activity" on public.player_daily_activity for select to authenticated using(user_id=auth.uid() or public.e3_is_teacher());
drop policy if exists "players read own economy skills" on public.player_economy_skills;
create policy "players read own economy skills" on public.player_economy_skills for select to authenticated using(user_id=auth.uid() or public.e3_is_teacher());
revoke all on table public.player_reward_events,public.player_login_streaks,public.player_daily_activity,public.player_economy_skills from anon;
grant select on table public.player_reward_events,public.player_login_streaks,public.player_daily_activity,public.player_economy_skills to authenticated;
grant select,insert,update,delete on table public.player_reward_events,public.player_login_streaks,public.player_daily_activity,public.player_economy_skills to service_role;

create or replace function public.e3_game_date()
returns date language sql stable set search_path=public as $$
  select (timezone('America/Los_Angeles',now())-interval '15 hours')::date;
$$;

create or replace function public.e3_grant_player_reward(target_user_id uuid,target_class_id uuid,target_reward_key text,target_xp integer,target_credits integer)
returns boolean language plpgsql security definer set search_path=public as $$
declare inserted_count integer;
begin
  insert into public.player_reward_events(user_id,class_id,reward_key,experience_points,nova_credits)
  values(target_user_id,target_class_id,target_reward_key,greatest(0,target_xp),greatest(0,target_credits))
  on conflict(user_id,class_id,reward_key) do nothing;
  get diagnostics inserted_count=row_count;
  if inserted_count=0 then return false; end if;
  insert into public.student_game_stats(user_id,class_id,experience_points) values(target_user_id,target_class_id,greatest(0,target_xp))
  on conflict(user_id,class_id) do update set experience_points=student_game_stats.experience_points+excluded.experience_points,updated_at=now();
  insert into public.student_wallets(user_id,class_id,nova_credits) values(target_user_id,target_class_id,greatest(0,target_credits))
  on conflict(user_id,class_id) do update set nova_credits=student_wallets.nova_credits+excluded.nova_credits;
  return true;
end;
$$;
revoke all on function public.e3_grant_player_reward(uuid,uuid,text,integer,integer) from public,anon,authenticated;

create or replace function public.e3_award_achievement(target_user_id uuid,target_class_id uuid,target_key text,target_title text,target_detail text,target_metal text default 'silver')
returns void language plpgsql security definer set search_path=public as $$
declare inserted_count integer; is_gold boolean:=target_metal='gold';
begin
  insert into public.player_achievements(user_id,class_id,achievement_key,title,detail,metal)
  values(target_user_id,target_class_id,target_key,target_title,target_detail,case when is_gold then 'gold' else 'silver' end)
  on conflict(user_id,class_id,achievement_key) do nothing;
  get diagnostics inserted_count=row_count;
  if inserted_count>0 then
    perform public.e3_grant_player_reward(target_user_id,target_class_id,'achievement:'||target_key,case when is_gold then 25 else 10 end,case when is_gold then 5 else 2 end);
  end if;
end;
$$;
revoke all on function public.e3_award_achievement(uuid,uuid,text,text,text,text) from public,anon,authenticated;

create or replace function public.e3_claim_daily_login(requested_class_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare today date:=public.e3_game_date(); week_start date; previous public.player_login_streaks%rowtype; next_day integer; xp integer; credits integer; claimed boolean;
begin
  if not public.e3_can_access_class(requested_class_id) then raise exception 'Class access required' using errcode='42501'; end if;
  week_start:=today-(extract(isodow from today)::integer-1);
  select * into previous from public.player_login_streaks where user_id=auth.uid() and class_id=requested_class_id for update;
  if previous.last_claimed_on=today then
    return jsonb_build_object('claimed',false,'streakDay',previous.streak_day,'weekStartedOn',previous.week_started_on,'experienceAwarded',0,'creditsAwarded',0);
  end if;
  next_day:=case when previous.user_id is not null and previous.week_started_on=week_start and previous.last_claimed_on=today-1 then least(7,previous.streak_day+1) else 1 end;
  insert into public.player_login_streaks(user_id,class_id,week_started_on,last_claimed_on,streak_day)
  values(auth.uid(),requested_class_id,week_start,today,next_day)
  on conflict(user_id,class_id) do update set week_started_on=excluded.week_started_on,last_claimed_on=excluded.last_claimed_on,streak_day=excluded.streak_day;
  xp:=next_day*5; credits:=greatest(1,ceil(next_day/2.0)::integer);
  claimed:=public.e3_grant_player_reward(auth.uid(),requested_class_id,'login:'||today,xp,credits);
  return jsonb_build_object('claimed',claimed,'streakDay',next_day,'weekStartedOn',week_start,'experienceAwarded',case when claimed then xp else 0 end,'creditsAwarded',case when claimed then credits else 0 end);
end;
$$;

create or replace function public.e3_complete_plate_motion_run(requested_class_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare run_count integer; daily_count integer; daily_reward boolean:=false; earned integer[]:='{}'; today date:=public.e3_game_date();
begin
  if not public.e3_can_access_class(requested_class_id) then raise exception 'Class access required' using errcode='42501'; end if;
  insert into public.student_game_stats(user_id,class_id,plate_motion_runs) values(auth.uid(),requested_class_id,1)
  on conflict(user_id,class_id) do update set plate_motion_runs=student_game_stats.plate_motion_runs+1,updated_at=now() returning plate_motion_runs into run_count;
  if run_count=1 then perform public.e3_award_achievement(auth.uid(),requested_class_id,'plate-motion:1','First Plate Motion Model','Completed the Plate Motion simulation','silver');earned:=array_append(earned,1);
  elsif run_count=10 then perform public.e3_award_achievement(auth.uid(),requested_class_id,'plate-motion:10','Plate Motion Investigator','Completed 10 Plate Motion model runs','silver');earned:=array_append(earned,10);
  elsif run_count=100 then perform public.e3_award_achievement(auth.uid(),requested_class_id,'plate-motion:100','Plate Motion Master','Rare achievement · completed 100 Plate Motion model runs','gold');earned:=array_append(earned,100);end if;
  insert into public.player_daily_activity(user_id,class_id,activity_date,plate_motion_runs) values(auth.uid(),requested_class_id,today,1)
  on conflict(user_id,class_id,activity_date) do update set plate_motion_runs=player_daily_activity.plate_motion_runs+1 returning plate_motion_runs into daily_count;
  if daily_count>=10 then
    update public.player_daily_activity set plate_motion_rewarded=true where user_id=auth.uid() and class_id=requested_class_id and activity_date=today and not plate_motion_rewarded;
    if found then daily_reward:=public.e3_grant_player_reward(auth.uid(),requested_class_id,'plate-motion-daily:'||today,20,4); end if;
  end if;
  return jsonb_build_object('success',true,'plateMotionRuns',run_count,'dailyRuns',daily_count,'dailyRewardEarned',daily_reward,'dailyReward',case when daily_reward then jsonb_build_object('experience',20,'credits',4) else null end,'milestones',to_jsonb(earned));
end;
$$;

create or replace function public.e3_market_skill_snapshot(requested_class_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare rank integer; spent integer; earned integer; next_cost integer;
begin
  if not public.e3_can_access_class(requested_class_id) then raise exception 'Class access required' using errcode='42501'; end if;
  select coalesce(market_rank,0),coalesce(spent_skill_points,0) into rank,spent from public.player_economy_skills where user_id=auth.uid() and class_id=requested_class_id;
  rank:=coalesce(rank,0);spent:=coalesce(spent,0);
  select coalesce(sum(quantity),0)::integer into earned from public.inventories where user_id=auth.uid() and class_id=requested_class_id and item_id in('progress_skill_geology','progress_skill_botany','progress_skill_zoology','progress_skill_chemistry','progress_skill_astrobiology');
  next_cost:=case when rank>=5 then 0 else 5+rank*5 end;
  return jsonb_build_object('rank',rank,'maxRank',5,'spentSkillPoints',spent,'availableSkillPoints',greatest(0,earned-spent),'nextCost',next_cost,'sellBonusPercent',rank*12,'buyDiscountPercent',rank*6);
end;
$$;

create or replace function public.e3_upgrade_market_skill(requested_class_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare rank integer; spent integer; earned integer; available integer; cost integer;
begin
  if not public.e3_can_access_class(requested_class_id) then raise exception 'Class access required' using errcode='42501'; end if;
  insert into public.player_economy_skills(user_id,class_id) values(auth.uid(),requested_class_id) on conflict(user_id,class_id) do nothing;
  select market_rank,spent_skill_points into rank,spent from public.player_economy_skills where user_id=auth.uid() and class_id=requested_class_id for update;
  select coalesce(sum(quantity),0)::integer into earned from public.inventories where user_id=auth.uid() and class_id=requested_class_id and item_id in('progress_skill_geology','progress_skill_botany','progress_skill_zoology','progress_skill_chemistry','progress_skill_astrobiology');
  available:=greatest(0,earned-spent);cost:=case when rank>=5 then 0 else 5+rank*5 end;
  if rank>=5 then raise exception 'Trading Post skill is already at maximum rank.'; end if;
  if available<cost then raise exception 'You need % available skill points for the next rank.',cost; end if;
  update public.player_economy_skills set market_rank=market_rank+1,spent_skill_points=spent_skill_points+cost,updated_at=now() where user_id=auth.uid() and class_id=requested_class_id;
  return public.e3_market_skill_snapshot(requested_class_id);
end;
$$;

create or replace function public.e3_sell_inventory_item(requested_class_id uuid,requested_item_id text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare item_rarity text; base_sell integer; market_price integer; payout integer; remaining integer; sale_count integer; market_rank integer;
begin
  if not public.e3_can_access_class(requested_class_id) then raise exception 'Class access required' using errcode='42501'; end if;
  item_rarity:=coalesce(nullif(split_part(requested_item_id,':',2),''),'common');
  base_sell:=case item_rarity when 'legendary' then 70 when 'epic' then 30 when 'rare' then 12 when 'uncommon' then 5 else 2 end;
  market_price:=case item_rarity when 'legendary' then 360 when 'epic' then 150 when 'rare' then 60 when 'uncommon' then 24 else 10 end;
  select coalesce(es.market_rank,0) into market_rank from (select 1) seed left join public.player_economy_skills es on es.user_id=auth.uid() and es.class_id=requested_class_id;
  payout:=greatest(1,floor(base_sell*(1+coalesce(market_rank,0)*.12))::integer);
  update public.inventories set quantity=quantity-1 where user_id=auth.uid() and class_id=requested_class_id and item_id=requested_item_id and quantity>0 returning quantity into remaining;
  if remaining is null then raise exception 'Item is not available'; end if;
  delete from public.inventories where user_id=auth.uid() and class_id=requested_class_id and item_id=requested_item_id and quantity<=0;
  insert into public.student_wallets(user_id,class_id,nova_credits) values(auth.uid(),requested_class_id,payout) on conflict(user_id,class_id) do update set nova_credits=student_wallets.nova_credits+payout;
  insert into public.market_listings(class_id,seller_id,item_id,rarity,price) values(requested_class_id,auth.uid(),requested_item_id,item_rarity,market_price);
  insert into public.student_game_stats(user_id,class_id,items_sold) values(auth.uid(),requested_class_id,1) on conflict(user_id,class_id) do update set items_sold=student_game_stats.items_sold+1,updated_at=now() returning items_sold into sale_count;
  if sale_count in(1,10,100,1000) then perform public.e3_award_achievement(auth.uid(),requested_class_id,'sales:'||sale_count,case when sale_count=1 then 'First Market Sale' else sale_count||' Items Sold' end,'Nova Trading Post milestone',case when sale_count>=100 then 'gold' else 'silver' end);end if;
  return jsonb_build_object('success',true,'creditsEarned',payout,'marketPrice',market_price,'itemsSold',sale_count,'marketSkillRank',coalesce(market_rank,0));
end;
$$;

create or replace function public.e3_market_snapshot(requested_class_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb; skill jsonb; rank integer;
begin
  if not public.e3_can_access_class(requested_class_id) then raise exception 'Class access required' using errcode='42501'; end if;
  skill:=public.e3_market_skill_snapshot(requested_class_id);rank:=(skill->>'rank')::integer;
  select jsonb_build_object('credits',coalesce((select nova_credits from public.student_wallets where user_id=auth.uid() and class_id=requested_class_id),0),'skill',skill,'listings',coalesce(jsonb_agg(jsonb_build_object('itemId',stack.item_id,'rarity',stack.rarity,'unitPrice',greatest(1,ceil(stack.price*(1-rank*.06))::integer),'baseUnitPrice',stack.price,'availableCount',stack.available_count) order by stack.rarity_rank desc,stack.item_id),'[]'::jsonb)) into result
  from(select item_id,rarity,price,count(*)::integer available_count,case rarity when 'legendary' then 5 when 'epic' then 4 when 'rare' then 3 when 'uncommon' then 2 else 1 end rarity_rank from public.market_listings where class_id=requested_class_id and status='available' group by item_id,rarity,price) stack;
  return result;
end;
$$;

create or replace function public.e3_buy_market_stack(requested_class_id uuid,requested_item_id text,requested_quantity integer)
returns jsonb language plpgsql security definer set search_path=public as $$
declare selected_ids uuid[];selected_count integer;total_price integer;remaining_balance integer;purchase_count integer;milestone integer;earned_milestones integer[]:='{}';market_rank integer;
begin
  if not public.e3_can_access_class(requested_class_id) then raise exception 'Class access required' using errcode='42501'; end if;
  if requested_quantity is null or requested_quantity<1 or requested_quantity>100 then raise exception 'Choose a quantity from 1 to 100.';end if;
  select coalesce(es.market_rank,0) into market_rank from(select 1) seed left join public.player_economy_skills es on es.user_id=auth.uid() and es.class_id=requested_class_id;
  select array_agg(chosen.listing_id),count(*)::integer,coalesce(sum(greatest(1,ceil(chosen.price*(1-coalesce(market_rank,0)*.06))::integer)),0)::integer into selected_ids,selected_count,total_price from(select listing_id,price from public.market_listings where class_id=requested_class_id and item_id=requested_item_id and status='available' order by created_at,listing_id for update skip locked limit requested_quantity) chosen;
  if coalesce(selected_count,0)<requested_quantity then raise exception 'Only % of this item remain available.',coalesce(selected_count,0);end if;
  update public.student_wallets set nova_credits=nova_credits-total_price where user_id=auth.uid() and class_id=requested_class_id and nova_credits>=total_price returning nova_credits into remaining_balance;
  if remaining_balance is null then raise exception 'Not enough Nova Credits for this quantity.';end if;
  update public.market_listings set status='sold',buyer_id=auth.uid(),sold_at=now() where listing_id=any(selected_ids);
  insert into public.inventories(user_id,class_id,item_id,quantity) values(auth.uid(),requested_class_id,requested_item_id,requested_quantity) on conflict(user_id,class_id,item_id) do update set quantity=inventories.quantity+excluded.quantity;
  insert into public.student_game_stats(user_id,class_id,items_bought) values(auth.uid(),requested_class_id,requested_quantity) on conflict(user_id,class_id) do update set items_bought=student_game_stats.items_bought+excluded.items_bought,updated_at=now() returning items_bought into purchase_count;
  foreach milestone in array array[1,10,100,1000] loop if purchase_count>=milestone and purchase_count-requested_quantity<milestone then perform public.e3_award_achievement(auth.uid(),requested_class_id,'purchases:'||milestone,case when milestone=1 then 'First Market Purchase' else milestone||' Items Purchased' end,'Nova Trading Post milestone',case when milestone>=100 then 'gold' else 'silver' end);earned_milestones:=array_append(earned_milestones,milestone);end if;end loop;
  return jsonb_build_object('success',true,'itemId',requested_item_id,'quantity',requested_quantity,'totalPrice',total_price,'credits',remaining_balance,'itemsBought',purchase_count,'purchaseMilestones',to_jsonb(earned_milestones),'marketSkillRank',coalesce(market_rank,0));
end;
$$;

create or replace function public.e3_game_overview(requested_class_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb;
begin
  if not public.e3_can_access_class(requested_class_id) then raise exception 'Class access required' using errcode='42501'; end if;
  select jsonb_build_object('experiencePoints',coalesce(stats.experience_points,0),'studyCompletions',coalesce(stats.study_completions,0),'plateMotionRuns',coalesce(stats.plate_motion_runs,0),'sphereCompletions',jsonb_build_object('Geosphere',coalesce(stats.geosphere_completions,0),'Atmosphere',coalesce(stats.atmosphere_completions,0),'Hydrosphere',coalesce(stats.hydrosphere_completions,0),'Biosphere',coalesce(stats.biosphere_completions,0)),'itemsSold',coalesce(stats.items_sold,0),'achievementCount',(select count(*) from public.player_achievements where user_id=auth.uid() and class_id=requested_class_id),'novaCredits',coalesce((select nova_credits from public.student_wallets where user_id=auth.uid() and class_id=requested_class_id),0),'questTokens',coalesce((select sum(quantity) from public.inventories where user_id=auth.uid() and class_id=requested_class_id and item_id like 'comm_quest_token:%'),0),'skillPoints',coalesce((select sum(quantity) from public.inventories where user_id=auth.uid() and class_id=requested_class_id and item_id in('progress_skill_geology','progress_skill_botany','progress_skill_zoology','progress_skill_chemistry','progress_skill_astrobiology')),0),'marketSkill',public.e3_market_skill_snapshot(requested_class_id),'achievements',coalesce((select jsonb_agg(jsonb_build_object('key',achievement_key,'title',title,'detail',detail,'metal',metal,'earnedAt',earned_at) order by earned_at desc) from(select * from public.player_achievements where user_id=auth.uid() and class_id=requested_class_id order by earned_at desc limit 12) recent),'[]'::jsonb)) into result from(select 1) seed left join public.student_game_stats stats on stats.user_id=auth.uid() and stats.class_id=requested_class_id;
  return result;
end;
$$;

revoke all on function public.e3_game_date(),public.e3_claim_daily_login(uuid),public.e3_complete_plate_motion_run(uuid),public.e3_market_skill_snapshot(uuid),public.e3_upgrade_market_skill(uuid),public.e3_sell_inventory_item(uuid,text),public.e3_market_snapshot(uuid),public.e3_buy_market_stack(uuid,text,integer),public.e3_game_overview(uuid) from public,anon;
grant execute on function public.e3_claim_daily_login(uuid),public.e3_complete_plate_motion_run(uuid),public.e3_market_skill_snapshot(uuid),public.e3_upgrade_market_skill(uuid),public.e3_sell_inventory_item(uuid,text),public.e3_market_snapshot(uuid),public.e3_buy_market_stack(uuid,text,integer),public.e3_game_overview(uuid) to authenticated,service_role;
notify pgrst,'reload schema';
