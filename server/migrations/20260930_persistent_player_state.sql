-- Durable quests and database-first inventory actions.
-- Run after 20260929_game_overview_achievements.sql. Safe to run repeatedly.

create table if not exists public.student_quests (
  quest_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid not null references public.classes(class_id) on delete cascade,
  resource_key text not null check (resource_key in ('rock_sample','water_sample','plant_sample','herbivore_specimen')),
  resource_label text not null,
  minimum_quality text not null check (minimum_quality in ('common','uncommon','rare','epic','legendary')),
  required_count integer not null check (required_count between 1 and 20),
  reward_quality text not null check (reward_quality in ('common','uncommon','rare','epic','legendary')),
  created_at timestamptz not null default now()
);
create index if not exists student_quests_owner_class_idx on public.student_quests(user_id,class_id,created_at);
alter table public.student_quests enable row level security;
drop policy if exists "players read own quests" on public.student_quests;
create policy "players read own quests" on public.student_quests for select to authenticated
using (user_id=auth.uid() or public.e3_is_teacher());
revoke all on table public.student_quests from anon;
grant select on table public.student_quests to authenticated;
grant select,insert,update,delete on table public.student_quests to service_role;

create or replace function public.e3_quest_snapshot(requested_class_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb;
begin
  if not public.e3_can_access_class(requested_class_id) then raise exception 'Class access required' using errcode='42501'; end if;
  select jsonb_build_object(
    'maxQuests',5,
    'quests',coalesce(jsonb_agg(jsonb_build_object(
      'id',q.quest_id,
      'resourceKey',q.resource_key,
      'resourceLabel',q.resource_label,
      'minimumQuality',q.minimum_quality,
      'requiredCount',q.required_count,
      'rewardQuality',q.reward_quality,
      'createdAtEpochMs',floor(extract(epoch from q.created_at)*1000),
      'eligibleInventoryCount',q.eligible_count,
      'progress',least(q.required_count,q.eligible_count),
      'status',case when q.eligible_count>=q.required_count then 'ready' else 'active' end
    ) order by q.created_at),'[]'::jsonb)
  ) into result
  from (
    select quests.*,
      coalesce((select sum(i.quantity) from public.inventories i
        where i.user_id=auth.uid() and i.class_id=requested_class_id
          and split_part(i.item_id,':',1)=quests.resource_key
          and (case split_part(i.item_id,':',2) when 'legendary' then 4 when 'epic' then 3 when 'rare' then 2 when 'uncommon' then 1 else 0 end)
            >= (case quests.minimum_quality when 'legendary' then 4 when 'epic' then 3 when 'rare' then 2 when 'uncommon' then 1 else 0 end)),0)::integer eligible_count
    from public.student_quests quests where quests.user_id=auth.uid() and quests.class_id=requested_class_id
  ) q;
  return result;
end;
$$;

create or replace function public.e3_request_quest(requested_class_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  active_count integer; reward text; resource text; label text; minimum text; low_count integer; high_count integer; required integer; option_roll float; created public.student_quests%rowtype;
begin
  if not public.e3_can_access_class(requested_class_id) then raise exception 'Class access required' using errcode='42501'; end if;
  select count(*) into active_count from public.student_quests where user_id=auth.uid() and class_id=requested_class_id;
  if active_count>=5 then raise exception 'You already have the maximum of five active quests.'; end if;
  case floor(random()*4)::integer
    when 0 then resource:='rock_sample'; label:='mineral samples';
    when 1 then resource:='water_sample'; label:='water samples';
    when 2 then resource:='plant_sample'; label:='plant samples';
    else resource:='herbivore_specimen'; label:='animal specimens';
  end case;
  option_roll:=random();
  reward:=case when option_roll<.52 then 'common' when option_roll<.79 then 'uncommon' when option_roll<.93 then 'rare' when option_roll<.99 then 'epic' else 'legendary' end;
  option_roll:=random();
  if reward='common' then minimum:='common'; low_count:=3; high_count:=5;
  elsif reward='uncommon' then
    if option_roll<.34 then minimum:='uncommon'; low_count:=3; high_count:=5; elsif option_roll<.67 then minimum:='common'; low_count:=6; high_count:=8; else minimum:='rare'; low_count:=1; high_count:=2; end if;
  elsif reward='rare' then
    if option_roll<.34 then minimum:='rare'; low_count:=3; high_count:=5; elsif option_roll<.67 then minimum:='uncommon'; low_count:=6; high_count:=8; else minimum:='epic'; low_count:=1; high_count:=2; end if;
  elsif reward='epic' then
    if option_roll<.34 then minimum:='epic'; low_count:=3; high_count:=5; elsif option_roll<.67 then minimum:='rare'; low_count:=6; high_count:=8; else minimum:='legendary'; low_count:=1; high_count:=2; end if;
  else
    if option_roll<.5 then minimum:='legendary'; low_count:=3; high_count:=5; else minimum:='epic'; low_count:=6; high_count:=8; end if;
  end if;
  required:=low_count+floor(random()*(high_count-low_count+1))::integer;
  insert into public.student_quests(user_id,class_id,resource_key,resource_label,minimum_quality,required_count,reward_quality)
  values(auth.uid(),requested_class_id,resource,label,minimum,required,reward) returning * into created;
  return jsonb_build_object('success',true,'quest',jsonb_build_object('id',created.quest_id,'resourceKey',resource,'resourceLabel',label,'minimumQuality',minimum,'requiredCount',required,'rewardQuality',reward),'snapshot',public.e3_quest_snapshot(requested_class_id));
end;
$$;

create or replace function public.e3_discard_quest(requested_class_id uuid, requested_quest_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if not public.e3_can_access_class(requested_class_id) then raise exception 'Class access required' using errcode='42501'; end if;
  delete from public.student_quests where quest_id=requested_quest_id and user_id=auth.uid() and class_id=requested_class_id;
  if not found then raise exception 'That quest is not available.'; end if;
  return jsonb_build_object('success',true,'message','Quest discarded.','snapshot',public.e3_quest_snapshot(requested_class_id));
end;
$$;

create or replace function public.e3_delete_inventory_item(requested_class_id uuid, requested_item_id text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare remaining integer;
begin
  if not public.e3_can_access_class(requested_class_id) then raise exception 'Class access required' using errcode='42501'; end if;
  if requested_item_id like 'progress\_%' escape '\' or requested_item_id like 'comm_quest_token:%' then raise exception 'Progress items cannot be deleted.'; end if;
  update public.inventories set quantity=quantity-1 where user_id=auth.uid() and class_id=requested_class_id and item_id=requested_item_id and quantity>0 returning quantity into remaining;
  if remaining is null then raise exception 'Item is not available.'; end if;
  delete from public.inventories where user_id=auth.uid() and class_id=requested_class_id and item_id=requested_item_id and quantity<=0;
  return jsonb_build_object('success',true,'remaining',greatest(remaining,0),'message','One item deleted.');
end;
$$;

create or replace function public.e3_complete_quest(requested_class_id uuid, requested_quest_id uuid, selected_items jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  quest public.student_quests%rowtype; entry jsonb; item_key text; item_quantity integer; available integer; selected_count integer:=0; quality text; quality_rank integer; minimum_rank integer;
  skill text; skill_points integer; previous_completed integer; next_completed integer; old_special integer; new_special integer; artifact_awarded boolean:=false;
begin
  if not public.e3_can_access_class(requested_class_id) then raise exception 'Class access required' using errcode='42501'; end if;
  select * into quest from public.student_quests where quest_id=requested_quest_id and user_id=auth.uid() and class_id=requested_class_id for update;
  if quest.quest_id is null then raise exception 'That quest is not available for turn-in.'; end if;
  minimum_rank:=case quest.minimum_quality when 'legendary' then 4 when 'epic' then 3 when 'rare' then 2 when 'uncommon' then 1 else 0 end;
  for entry in select value from jsonb_array_elements(coalesce(selected_items,'[]'::jsonb)) loop
    item_key:=trim(coalesce(entry->>'itemId','')); item_quantity:=coalesce((entry->>'quantity')::integer,0); quality:=split_part(item_key,':',2);
    quality_rank:=case quality when 'legendary' then 4 when 'epic' then 3 when 'rare' then 2 when 'uncommon' then 1 when 'common' then 0 else -1 end;
    if item_quantity<=0 or split_part(item_key,':',1)<>quest.resource_key or quality_rank<minimum_rank then raise exception 'Selected items do not meet this quest requirement.'; end if;
    select quantity into available from public.inventories where user_id=auth.uid() and class_id=requested_class_id and item_id=item_key for update;
    if coalesce(available,0)<item_quantity then raise exception 'Selected inventory items are no longer available.'; end if;
    selected_count:=selected_count+item_quantity;
  end loop;
  if selected_count<>quest.required_count then raise exception 'Select exactly % eligible items.',quest.required_count; end if;
  for entry in select value from jsonb_array_elements(selected_items) loop
    item_key:=entry->>'itemId'; item_quantity:=(entry->>'quantity')::integer;
    update public.inventories set quantity=quantity-item_quantity where user_id=auth.uid() and class_id=requested_class_id and item_id=item_key;
    delete from public.inventories where user_id=auth.uid() and class_id=requested_class_id and item_id=item_key and quantity<=0;
  end loop;
  skill:=case quest.resource_key when 'rock_sample' then 'geology' when 'plant_sample' then 'botany' when 'herbivore_specimen' then 'zoology' else 'chemistry' end;
  skill_points:=case quest.reward_quality when 'legendary' then 20 when 'epic' then 10 when 'rare' then 5 when 'uncommon' then 2 else 1 end;
  insert into public.inventories(user_id,class_id,item_id,quantity) values(auth.uid(),requested_class_id,'comm_quest_token:'||quest.reward_quality,1) on conflict(user_id,class_id,item_id) do update set quantity=inventories.quantity+1;
  insert into public.inventories(user_id,class_id,item_id,quantity) values(auth.uid(),requested_class_id,'progress_skill_'||skill,skill_points) on conflict(user_id,class_id,item_id) do update set quantity=inventories.quantity+excluded.quantity;
  insert into public.inventories(user_id,class_id,item_id,quantity) values(auth.uid(),requested_class_id,'progress_skill_'||skill||'_'||quest.reward_quality,1) on conflict(user_id,class_id,item_id) do update set quantity=inventories.quantity+1;
  select coalesce(quantity,0) into previous_completed from public.inventories where user_id=auth.uid() and class_id=requested_class_id and item_id='progress_quests_completed';
  next_completed:=coalesce(previous_completed,0)+1;
  insert into public.inventories(user_id,class_id,item_id,quantity) values(auth.uid(),requested_class_id,'progress_quests_completed',next_completed) on conflict(user_id,class_id,item_id) do update set quantity=excluded.quantity;
  old_special:=case when previous_completed>=320 then 6 when previous_completed>=160 then 5 when previous_completed>=80 then 4 when previous_completed>=40 then 3 when previous_completed>=20 then 2 when previous_completed>=10 then 1 else 0 end;
  new_special:=case when next_completed>=320 then 6 when next_completed>=160 then 5 when next_completed>=80 then 4 when next_completed>=40 then 3 when next_completed>=20 then 2 when next_completed>=10 then 1 else 0 end;
  if new_special>old_special then
    insert into public.inventories(user_id,class_id,item_id,quantity) values(auth.uid(),requested_class_id,'progress_special_tokens_earned',new_special) on conflict(user_id,class_id,item_id) do update set quantity=greatest(inventories.quantity,excluded.quantity);
    insert into public.inventories(user_id,class_id,item_id,quantity) values(auth.uid(),requested_class_id,'progress_special_tokens_available',new_special-old_special) on conflict(user_id,class_id,item_id) do update set quantity=inventories.quantity+excluded.quantity;
  end if;
  if random()<.25 then
    artifact_awarded:=true;
    insert into public.inventories(user_id,class_id,item_id,quantity) values(auth.uid(),requested_class_id,'alien_artifact',1) on conflict(user_id,class_id,item_id) do update set quantity=inventories.quantity+1;
  end if;
  perform public.e3_award_achievement(auth.uid(),requested_class_id,'quest:'||quest.quest_id,'Quest Complete','Research samples transmitted','gold');
  delete from public.student_quests where quest_id=quest.quest_id;
  return jsonb_build_object('success',true,'questId',quest.quest_id,'message',initcap(quest.reward_quality)||' quest token awarded.','artifactAwarded',artifact_awarded,'artifactItemKey',case when artifact_awarded then 'alien_artifact' else '' end,'snapshot',public.e3_quest_snapshot(requested_class_id));
end;
$$;

revoke all on function public.e3_quest_snapshot(uuid),public.e3_request_quest(uuid),public.e3_discard_quest(uuid,uuid),public.e3_delete_inventory_item(uuid,text),public.e3_complete_quest(uuid,uuid,jsonb) from public,anon;
grant execute on function public.e3_quest_snapshot(uuid),public.e3_request_quest(uuid),public.e3_discard_quest(uuid,uuid),public.e3_delete_inventory_item(uuid,text),public.e3_complete_quest(uuid,uuid,jsonb) to authenticated,service_role;

-- Ask PostgREST to expose the newly created functions immediately.
notify pgrst, 'reload schema';
