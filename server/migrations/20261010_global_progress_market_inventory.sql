-- Player-owned progress and commerce, shared market, and expandable inventory capacity.

create table if not exists public.player_inventory_capacity(
  user_id uuid primary key references auth.users(id) on delete cascade,
  extra_slots integer not null default 0 check(extra_slots in(0,4)),
  spent_skill_points integer not null default 0 check(spent_skill_points>=0),
  updated_at timestamptz not null default now()
);
alter table public.player_inventory_capacity enable row level security;
drop policy if exists "players read own inventory capacity" on public.player_inventory_capacity;
create policy "players read own inventory capacity" on public.player_inventory_capacity for select to authenticated using(user_id=auth.uid() or public.e3_is_teacher());
revoke all on table public.player_inventory_capacity from anon;
grant select on table public.player_inventory_capacity to authenticated;
grant select,insert,update,delete on table public.player_inventory_capacity to service_role;

create or replace function public.e3_player_state_class(requested_class_id uuid)
returns uuid language plpgsql stable security definer set search_path=public as $$
declare chosen uuid;
begin
  if not public.e3_can_access_class(requested_class_id) then raise exception 'Class access required' using errcode='42501';end if;
  if public.e3_is_teacher() then
    select stats.class_id into chosen from public.student_game_stats stats where stats.user_id=auth.uid() order by stats.experience_points desc,stats.updated_at desc limit 1;
  end if;
  return coalesce(chosen,requested_class_id);
end;
$$;

create or replace function public.e3_inventory_capacity_snapshot(requested_class_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare state_class uuid;earned integer;commerce_spent integer;cargo_spent integer;extra integer;
begin
  state_class:=public.e3_player_state_class(requested_class_id);
  select coalesce(sum(quantity),0)::integer into earned from public.inventories where user_id=auth.uid() and class_id=state_class and item_id in('progress_skill_geology','progress_skill_botany','progress_skill_zoology','progress_skill_chemistry','progress_skill_astrobiology');
  select coalesce(spent_skill_points,0) into commerce_spent from public.player_economy_skills where user_id=auth.uid() and class_id=state_class;
  select coalesce(extra_slots,0),coalesce(spent_skill_points,0) into extra,cargo_spent from public.player_inventory_capacity where user_id=auth.uid();
  return jsonb_build_object('slots',12+coalesce(extra,0),'extraSlots',coalesce(extra,0),'upgraded',coalesce(extra,0)=4,'cost',20,'availableSkillPoints',greatest(0,coalesce(earned,0)-coalesce(commerce_spent,0)-coalesce(cargo_spent,0)));
end;
$$;

create or replace function public.e3_upgrade_inventory_capacity(requested_class_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare snapshot jsonb;
begin
  snapshot:=public.e3_inventory_capacity_snapshot(requested_class_id);
  if (snapshot->>'upgraded')::boolean then raise exception 'Cargo Expansion is already owned.';end if;
  if (snapshot->>'availableSkillPoints')::integer<20 then raise exception 'You need 20 available skill points for Cargo Expansion.';end if;
  insert into public.player_inventory_capacity(user_id,extra_slots,spent_skill_points) values(auth.uid(),4,20)
  on conflict(user_id) do update set extra_slots=4,spent_skill_points=20,updated_at=now();
  return public.e3_inventory_capacity_snapshot(requested_class_id);
end;
$$;

create or replace function public.e3_inventory_can_add(requested_class_id uuid,requested_item_id text,requested_quantity integer)
returns boolean language plpgsql stable security definer set search_path=public as $$
declare state_class uuid;slots integer;used integer;existing integer;added_slots integer;
begin
  state_class:=public.e3_player_state_class(requested_class_id);slots:=(public.e3_inventory_capacity_snapshot(requested_class_id)->>'slots')::integer;
  select coalesce(sum(ceil(quantity/10.0)),0)::integer into used from public.inventories where user_id=auth.uid() and class_id=state_class and quantity>0 and item_id not like 'progress\_%' escape '\' and item_id not like 'comm_quest_token:%';
  select coalesce(quantity,0) into existing from public.inventories where user_id=auth.uid() and class_id=state_class and item_id=requested_item_id;
  added_slots:=ceil((coalesce(existing,0)+greatest(0,requested_quantity))/10.0)::integer-ceil(coalesce(existing,0)/10.0)::integer;
  return used+added_slots<=slots;
end;
$$;

create or replace function public.e3_inventory_snapshot(requested_class_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare state_class uuid;items jsonb;capacity jsonb;
begin
  state_class:=public.e3_player_state_class(requested_class_id);capacity:=public.e3_inventory_capacity_snapshot(requested_class_id);
  select coalesce(jsonb_object_agg(item_id,quantity),'{}'::jsonb) into items from public.inventories where user_id=auth.uid() and class_id=state_class and quantity>0;
  return jsonb_build_object('items',items,'slots',(capacity->>'slots')::integer,'capacity',capacity);
end;
$$;

create or replace function public.e3_market_skill_snapshot(requested_class_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare state_class uuid;rank integer;spent integer;earned integer;cargo_spent integer;next_cost integer;
begin
  state_class:=public.e3_player_state_class(requested_class_id);
  select coalesce(market_rank,0),coalesce(spent_skill_points,0) into rank,spent from public.player_economy_skills where user_id=auth.uid() and class_id=state_class;
  select coalesce(sum(quantity),0)::integer into earned from public.inventories where user_id=auth.uid() and class_id=state_class and item_id in('progress_skill_geology','progress_skill_botany','progress_skill_zoology','progress_skill_chemistry','progress_skill_astrobiology');
  select coalesce(spent_skill_points,0) into cargo_spent from public.player_inventory_capacity where user_id=auth.uid();
  rank:=coalesce(rank,0);spent:=coalesce(spent,0);next_cost:=case when rank>=5 then 0 else 5+rank*5 end;
  return jsonb_build_object('rank',rank,'maxRank',5,'spentSkillPoints',spent,'availableSkillPoints',greatest(0,earned-spent-coalesce(cargo_spent,0)),'nextCost',next_cost,'sellBonusPercent',rank*12,'buyDiscountPercent',rank*6);
end;
$$;

create or replace function public.e3_upgrade_market_skill(requested_class_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare state_class uuid;snapshot jsonb;rank integer;cost integer;
begin
  state_class:=public.e3_player_state_class(requested_class_id);snapshot:=public.e3_market_skill_snapshot(requested_class_id);rank:=(snapshot->>'rank')::integer;cost:=(snapshot->>'nextCost')::integer;
  if rank>=5 then raise exception 'Trading Post skill is already at maximum rank.';end if;
  if (snapshot->>'availableSkillPoints')::integer<cost then raise exception 'You need % available skill points for the next rank.',cost;end if;
  insert into public.player_economy_skills(user_id,class_id,market_rank,spent_skill_points) values(auth.uid(),state_class,1,cost)
  on conflict(user_id,class_id) do update set market_rank=player_economy_skills.market_rank+1,spent_skill_points=player_economy_skills.spent_skill_points+cost,updated_at=now();
  return public.e3_market_skill_snapshot(requested_class_id);
end;
$$;

create or replace function public.e3_game_overview(requested_class_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb;state_class uuid;capacity jsonb;
begin
  state_class:=public.e3_player_state_class(requested_class_id);capacity:=public.e3_inventory_capacity_snapshot(requested_class_id);
  select jsonb_build_object('experiencePoints',coalesce(stats.experience_points,0),'studyCompletions',coalesce(stats.study_completions,0),'plateMotionRuns',coalesce(stats.plate_motion_runs,0),'sphereCompletions',jsonb_build_object('Geosphere',coalesce(stats.geosphere_completions,0),'Atmosphere',coalesce(stats.atmosphere_completions,0),'Hydrosphere',coalesce(stats.hydrosphere_completions,0),'Biosphere',coalesce(stats.biosphere_completions,0)),'itemsSold',coalesce(stats.items_sold,0),'achievementCount',(select count(distinct achievement_key) from public.player_achievements where user_id=auth.uid()),'novaCredits',coalesce((select nova_credits from public.student_wallets where user_id=auth.uid() and class_id=state_class),0),'questTokens',coalesce((select sum(quantity) from public.inventories where user_id=auth.uid() and class_id=state_class and item_id like 'comm_quest_token:%'),0),'skillPoints',coalesce((select sum(quantity) from public.inventories where user_id=auth.uid() and class_id=state_class and item_id in('progress_skill_geology','progress_skill_botany','progress_skill_zoology','progress_skill_chemistry','progress_skill_astrobiology')),0),'inventorySlots',(capacity->>'slots')::integer,'marketSkill',public.e3_market_skill_snapshot(requested_class_id),'achievements',coalesce((select jsonb_agg(jsonb_build_object('key',achievement_key,'title',title,'detail',detail,'metal',metal,'earnedAt',earned_at) order by earned_at desc) from(select distinct on(achievement_key)* from public.player_achievements where user_id=auth.uid() order by achievement_key,earned_at desc limit 12) recent),'[]'::jsonb)) into result from(select * from public.student_game_stats where user_id=auth.uid() order by experience_points desc,updated_at desc limit 1) stats;
  return coalesce(result,jsonb_build_object('experiencePoints',0,'inventorySlots',(capacity->>'slots')::integer,'achievements','[]'::jsonb));
end;
$$;

create or replace function public.e3_grant_player_reward(target_user_id uuid,target_class_id uuid,target_reward_key text,target_xp integer,target_credits integer)
returns boolean language plpgsql security definer set search_path=public as $$
declare inserted_count integer;state_class uuid;
begin
  select class_id into state_class from public.student_game_stats where user_id=target_user_id order by experience_points desc,updated_at desc limit 1;state_class:=coalesce(state_class,target_class_id);
  insert into public.player_reward_events(user_id,class_id,reward_key,experience_points,nova_credits) values(target_user_id,state_class,target_reward_key,greatest(0,target_xp),greatest(0,target_credits)) on conflict(user_id,class_id,reward_key) do nothing;get diagnostics inserted_count=row_count;if inserted_count=0 then return false;end if;
  insert into public.student_game_stats(user_id,class_id,experience_points) values(target_user_id,state_class,greatest(0,target_xp)) on conflict(user_id,class_id) do update set experience_points=student_game_stats.experience_points+excluded.experience_points,updated_at=now();
  insert into public.student_wallets(user_id,class_id,nova_credits) values(target_user_id,state_class,greatest(0,target_credits)) on conflict(user_id,class_id) do update set nova_credits=student_wallets.nova_credits+excluded.nova_credits;return true;
end;
$$;

create or replace function public.e3_market_snapshot(requested_class_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb;skill jsonb;capacity jsonb;state_class uuid;rank integer;bucket bigint;rotation_end timestamptz;system_items jsonb;player_items jsonb;
begin
  state_class:=public.e3_player_state_class(requested_class_id);skill:=public.e3_market_skill_snapshot(requested_class_id);capacity:=public.e3_inventory_capacity_snapshot(requested_class_id);rank:=(skill->>'rank')::integer;bucket:=floor(extract(epoch from now())/600)::bigint;rotation_end:=to_timestamp((bucket+1)*600);
  select coalesce(jsonb_agg(jsonb_build_object('itemId',offers.item_id,'rarity',offers.rarity,'unitPrice',greatest(1,ceil(offers.base_price*(1-rank*.06))::integer),'baseUnitPrice',offers.base_price,'rotationBucket',offers.rotation_bucket,'purchased',purchases.item_id is not null) order by offers.item_id),'[]'::jsonb) into system_items from public.e3_system_market_rotation(requested_class_id,bucket) offers left join public.system_market_purchases purchases on purchases.user_id=auth.uid() and purchases.class_id=state_class and purchases.rotation_bucket=bucket and purchases.item_id=offers.item_id;
  select coalesce(jsonb_agg(jsonb_build_object('itemId',stack.item_id,'rarity',stack.rarity,'unitPrice',greatest(1,ceil(stack.price*(1-rank*.06))::integer),'baseUnitPrice',stack.price,'availableCount',stack.available_count) order by stack.rarity_rank desc,stack.item_id),'[]'::jsonb) into player_items from(select item_id,rarity,price,count(*)::integer available_count,case rarity when 'legendary' then 5 when 'epic' then 4 when 'rare' then 3 when 'uncommon' then 2 else 1 end rarity_rank from public.market_listings where status='available' group by item_id,rarity,price) stack;
  result:=jsonb_build_object('credits',coalesce((select nova_credits from public.student_wallets where user_id=auth.uid() and class_id=state_class),0),'skill',skill,'inventoryCapacity',capacity,'rotationEndsAt',rotation_end,'systemListings',system_items,'playerListings',player_items);return result;
end;
$$;

create or replace function public.e3_buy_system_market_item(requested_class_id uuid,requested_item_id text,requested_rotation_bucket bigint)
returns jsonb language plpgsql security definer set search_path=public as $$
declare state_class uuid;current_bucket bigint:=floor(extract(epoch from now())/600)::bigint;offer record;market_rank integer;total_price integer;remaining_balance integer;purchase_count integer;milestone integer;earned_milestones integer[]:='{}';
begin
  state_class:=public.e3_player_state_class(requested_class_id);if requested_rotation_bucket<>current_bucket then raise exception 'The market transmission changed. Refresh the Trading Post.';end if;
  select * into offer from public.e3_system_market_rotation(requested_class_id,current_bucket) where item_id=requested_item_id;if offer.item_id is null then raise exception 'This item is not part of the current Nova transmission.';end if;
  if not public.e3_inventory_can_add(requested_class_id,requested_item_id,1) then raise exception 'Inventory full. This purchase was cancelled and no Nova Credits were spent.';end if;
  market_rank:=(public.e3_market_skill_snapshot(requested_class_id)->>'rank')::integer;total_price:=greatest(1,ceil(offer.base_price*(1-market_rank*.06))::integer);
  insert into public.system_market_purchases(user_id,class_id,rotation_bucket,item_id,price_paid) values(auth.uid(),state_class,current_bucket,requested_item_id,total_price) on conflict do nothing;if not found then raise exception 'You already purchased this item during the current rotation.';end if;
  update public.student_wallets set nova_credits=nova_credits-total_price where user_id=auth.uid() and class_id=state_class and nova_credits>=total_price returning nova_credits into remaining_balance;if remaining_balance is null then raise exception 'Not enough Nova Credits for this item.';end if;
  insert into public.inventories(user_id,class_id,item_id,quantity) values(auth.uid(),state_class,requested_item_id,1) on conflict(user_id,class_id,item_id) do update set quantity=inventories.quantity+1;
  insert into public.student_game_stats(user_id,class_id,items_bought) values(auth.uid(),state_class,1) on conflict(user_id,class_id) do update set items_bought=student_game_stats.items_bought+1,updated_at=now() returning items_bought into purchase_count;
  foreach milestone in array array[1,10,100,1000] loop if purchase_count=milestone then perform public.e3_award_achievement(auth.uid(),state_class,'purchases:'||milestone,case when milestone=1 then 'First Market Purchase' else milestone||' Items Purchased' end,'Nova Trading Post milestone',case when milestone>=100 then 'gold' else 'silver' end);earned_milestones:=array_append(earned_milestones,milestone);end if;end loop;
  return jsonb_build_object('success',true,'itemId',requested_item_id,'quantity',1,'totalPrice',total_price,'credits',remaining_balance,'itemsBought',purchase_count,'purchaseMilestones',to_jsonb(earned_milestones));
end;
$$;

create or replace function public.e3_buy_market_stack(requested_class_id uuid,requested_item_id text,requested_quantity integer)
returns jsonb language plpgsql security definer set search_path=public as $$
declare state_class uuid;selected_ids uuid[];selected_count integer;total_price integer;remaining_balance integer;purchase_count integer;milestone integer;earned_milestones integer[]:='{}';market_rank integer;
begin
  state_class:=public.e3_player_state_class(requested_class_id);if requested_quantity is null or requested_quantity<1 or requested_quantity>100 then raise exception 'Choose a quantity from 1 to 100.';end if;
  if not public.e3_inventory_can_add(requested_class_id,requested_item_id,requested_quantity) then raise exception 'Inventory full. Reduce the quantity or free a slot. No Nova Credits were spent.';end if;
  market_rank:=(public.e3_market_skill_snapshot(requested_class_id)->>'rank')::integer;
  select array_agg(chosen.listing_id),count(*)::integer,coalesce(sum(greatest(1,ceil(chosen.price*(1-market_rank*.06))::integer)),0)::integer into selected_ids,selected_count,total_price from(select listing_id,price from public.market_listings where item_id=requested_item_id and status='available' order by created_at,listing_id for update skip locked limit requested_quantity) chosen;
  if coalesce(selected_count,0)<requested_quantity then raise exception 'Only % of this item remain available.',coalesce(selected_count,0);end if;
  update public.student_wallets set nova_credits=nova_credits-total_price where user_id=auth.uid() and class_id=state_class and nova_credits>=total_price returning nova_credits into remaining_balance;if remaining_balance is null then raise exception 'Not enough Nova Credits for this quantity.';end if;
  update public.market_listings set status='sold',buyer_id=auth.uid(),sold_at=now() where listing_id=any(selected_ids);
  insert into public.inventories(user_id,class_id,item_id,quantity) values(auth.uid(),state_class,requested_item_id,requested_quantity) on conflict(user_id,class_id,item_id) do update set quantity=inventories.quantity+excluded.quantity;
  insert into public.student_game_stats(user_id,class_id,items_bought) values(auth.uid(),state_class,requested_quantity) on conflict(user_id,class_id) do update set items_bought=student_game_stats.items_bought+excluded.items_bought,updated_at=now() returning items_bought into purchase_count;
  foreach milestone in array array[1,10,100,1000] loop if purchase_count>=milestone and purchase_count-requested_quantity<milestone then perform public.e3_award_achievement(auth.uid(),state_class,'purchases:'||milestone,case when milestone=1 then 'First Market Purchase' else milestone||' Items Purchased' end,'Nova Trading Post milestone',case when milestone>=100 then 'gold' else 'silver' end);earned_milestones:=array_append(earned_milestones,milestone);end if;end loop;
  return jsonb_build_object('success',true,'itemId',requested_item_id,'quantity',requested_quantity,'totalPrice',total_price,'credits',remaining_balance,'itemsBought',purchase_count,'purchaseMilestones',to_jsonb(earned_milestones));
end;
$$;

create or replace function public.e3_sell_inventory_item(requested_class_id uuid,requested_item_id text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare state_class uuid;item_rarity text;base_sell integer;market_price integer;payout integer;remaining integer;sale_count integer;market_rank integer;
begin
  state_class:=public.e3_player_state_class(requested_class_id);item_rarity:=coalesce(nullif(split_part(requested_item_id,':',2),''),'common');base_sell:=case item_rarity when 'legendary' then 70 when 'epic' then 30 when 'rare' then 12 when 'uncommon' then 5 else 2 end;market_price:=case item_rarity when 'legendary' then 360 when 'epic' then 150 when 'rare' then 60 when 'uncommon' then 24 else 10 end;market_rank:=(public.e3_market_skill_snapshot(requested_class_id)->>'rank')::integer;payout:=greatest(1,floor(base_sell*(1+market_rank*.12))::integer);
  update public.inventories set quantity=quantity-1 where user_id=auth.uid() and class_id=state_class and item_id=requested_item_id and quantity>0 returning quantity into remaining;if remaining is null then raise exception 'Item is not available';end if;delete from public.inventories where user_id=auth.uid() and class_id=state_class and item_id=requested_item_id and quantity<=0;
  insert into public.student_wallets(user_id,class_id,nova_credits) values(auth.uid(),state_class,payout) on conflict(user_id,class_id) do update set nova_credits=student_wallets.nova_credits+payout;
  insert into public.market_listings(class_id,seller_id,item_id,rarity,price) values(requested_class_id,auth.uid(),requested_item_id,item_rarity,market_price);
  insert into public.student_game_stats(user_id,class_id,items_sold) values(auth.uid(),state_class,1) on conflict(user_id,class_id) do update set items_sold=student_game_stats.items_sold+1,updated_at=now() returning items_sold into sale_count;
  if sale_count in(1,10,100,1000) then perform public.e3_award_achievement(auth.uid(),state_class,'sales:'||sale_count,case when sale_count=1 then 'First Market Sale' else sale_count||' Items Sold' end,'Nova Trading Post milestone',case when sale_count>=100 then 'gold' else 'silver' end);end if;
  return jsonb_build_object('success',true,'creditsEarned',payout,'marketPrice',market_price,'itemsSold',sale_count,'marketSkillRank',market_rank);
end;
$$;

create or replace function public.e3_answer_study_question(requested_class_id uuid,requested_question_id uuid,selected_index integer,selected_sphere text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare state_class uuid;answer_index integer;was_correct boolean;points integer;resource text;quality text;item_key text;roll float;completion_count integer;sphere_name text;skill_key text;skill_xp integer;skill_level integer:=1;level_cost integer:=20;mastery_steps integer;common_chance float;uncommon_chance float;rare_chance float;epic_chance float;inventory_full boolean:=false;
begin
  state_class:=public.e3_player_state_class(requested_class_id);
  select q.correct_index into answer_index from public.study_questions q join public.question_sets sets on sets.set_id=q.set_id join public.classes classes on classes.class_id=requested_class_id where q.question_id=requested_question_id and q.active and sets.active and sets.mission_position<=classes.mission_position;if answer_index is null then raise exception 'Question not found';end if;was_correct:=selected_index=answer_index;
  insert into public.student_question_progress(user_id,question_id,attempts,correct_count,wrong_count,last_seen_at) values(auth.uid(),requested_question_id,1,case when was_correct then 1 else 0 end,case when was_correct then 0 else 1 end,now()) on conflict(user_id,question_id) do update set attempts=student_question_progress.attempts+1,correct_count=student_question_progress.correct_count+case when was_correct then 1 else 0 end,wrong_count=student_question_progress.wrong_count+case when was_correct then 0 else 1 end,last_seen_at=now();
  insert into public.student_study_state(user_id,class_id,mastery_points) values(auth.uid(),requested_class_id,case when was_correct then 1 else 0 end) on conflict(user_id,class_id) do update set mastery_points=case when was_correct then least(10,student_study_state.mastery_points+1) else greatest(0,student_study_state.mastery_points-3) end returning mastery_points into points;if points<10 then return jsonb_build_object('correct',was_correct,'points',points,'reward',null);end if;
  update public.student_study_state set mastery_points=0 where user_id=auth.uid() and class_id=requested_class_id;sphere_name:=case when selected_sphere in('Geosphere','Atmosphere','Hydrosphere','Biosphere') then selected_sphere else 'Biosphere' end;
  roll:=random();resource:=case sphere_name when 'Geosphere' then case when roll<.4 then 'rock_sample' when roll<.8 then 'plant_sample' when roll<.9 then 'water_sample' else 'herbivore_specimen' end when 'Atmosphere' then case when roll<.4 then 'herbivore_specimen' when roll<.8 then 'water_sample' when roll<.9 then 'plant_sample' else 'rock_sample' end when 'Hydrosphere' then case when roll<.4 then 'water_sample' when roll<.8 then 'plant_sample' when roll<.9 then 'rock_sample' else 'herbivore_specimen' end else case when roll<.4 then 'plant_sample' when roll<.8 then 'herbivore_specimen' when roll<.9 then 'water_sample' else 'rock_sample' end end;
  skill_key:=case resource when 'rock_sample' then 'geology' when 'plant_sample' then 'botany' when 'herbivore_specimen' then 'zoology' else 'chemistry' end;select coalesce(quantity,0) into skill_xp from public.inventories where user_id=auth.uid() and class_id=state_class and item_id='progress_skill_'||skill_key;skill_xp:=coalesce(skill_xp,0);while skill_xp>=level_cost and skill_level<20 loop skill_xp:=skill_xp-level_cost;skill_level:=skill_level+1;level_cost:=level_cost*2;end loop;
  mastery_steps:=skill_level-1+case when exists(select 1 from public.inventories where user_id=auth.uid() and class_id=state_class and item_id='progress_special_'||skill_key||'_mastery' and quantity>0) then 3 else 0 end;common_chance:=greatest(.25,.60-mastery_steps*.001);uncommon_chance:=.25+mastery_steps*.00059;rare_chance:=.10+mastery_steps*.00030;epic_chance:=.04+mastery_steps*.00010;
  roll:=random();quality:=case when roll<common_chance then 'common' when roll<common_chance+uncommon_chance then 'uncommon' when roll<common_chance+uncommon_chance+rare_chance then 'rare' when roll<common_chance+uncommon_chance+rare_chance+epic_chance then 'epic' else 'legendary' end;item_key:=resource||':'||quality;
  inventory_full:=not public.e3_inventory_can_add(requested_class_id,item_key,1);if not inventory_full then insert into public.inventories(user_id,class_id,item_id,quantity) values(auth.uid(),state_class,item_key,1) on conflict(user_id,class_id,item_id) do update set quantity=inventories.quantity+1;end if;
  insert into public.student_game_stats(user_id,class_id,study_completions,geosphere_completions,atmosphere_completions,hydrosphere_completions,biosphere_completions) values(auth.uid(),state_class,1,case when sphere_name='Geosphere' then 1 else 0 end,case when sphere_name='Atmosphere' then 1 else 0 end,case when sphere_name='Hydrosphere' then 1 else 0 end,case when sphere_name='Biosphere' then 1 else 0 end) on conflict(user_id,class_id) do update set study_completions=student_game_stats.study_completions+1,geosphere_completions=student_game_stats.geosphere_completions+excluded.geosphere_completions,atmosphere_completions=student_game_stats.atmosphere_completions+excluded.atmosphere_completions,hydrosphere_completions=student_game_stats.hydrosphere_completions+excluded.hydrosphere_completions,biosphere_completions=student_game_stats.biosphere_completions+excluded.biosphere_completions,updated_at=now() returning study_completions into completion_count;
  if completion_count=1 then perform public.e3_award_achievement(auth.uid(),state_class,'study:1','First Archive Complete',sphere_name||' expedition completed','silver');end if;if completion_count in(10,25,50) or completion_count%100=0 then perform public.e3_award_achievement(auth.uid(),state_class,'study:'||completion_count,completion_count||' Archives Complete','Orbital Study Archive mastery milestone','gold');end if;
  return jsonb_build_object('correct',was_correct,'points',0,'reward',jsonb_build_object('itemKey',item_key,'quality',quality,'presentation','resource_wheel','resourceTier',1,'cooldownMs',2200,'lost',inventory_full),'inventoryFull',inventory_full,'studyCompletions',completion_count,'masterySteps',mastery_steps);
end;
$$;

revoke all on function public.e3_player_state_class(uuid),public.e3_inventory_capacity_snapshot(uuid),public.e3_upgrade_inventory_capacity(uuid),public.e3_inventory_can_add(uuid,text,integer),public.e3_inventory_snapshot(uuid) from public,anon;
grant execute on function public.e3_inventory_capacity_snapshot(uuid),public.e3_upgrade_inventory_capacity(uuid),public.e3_inventory_snapshot(uuid) to authenticated,service_role;
grant execute on function public.e3_player_state_class(uuid),public.e3_inventory_can_add(uuid,text,integer) to service_role;
grant execute on function public.e3_market_skill_snapshot(uuid),public.e3_upgrade_market_skill(uuid),public.e3_game_overview(uuid) to authenticated,service_role;
grant execute on function public.e3_market_snapshot(uuid),public.e3_buy_system_market_item(uuid,text,bigint),public.e3_buy_market_stack(uuid,text,integer),public.e3_sell_inventory_item(uuid,text) to authenticated,service_role;
grant execute on function public.e3_answer_study_question(uuid,uuid,integer,text) to authenticated,service_role;
notify pgrst,'reload schema';
