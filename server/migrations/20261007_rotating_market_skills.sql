-- Dedicated skills page support and a synchronized, rarity-weighted Trading Post rotation.

create or replace function public.e3_market_rotation(requested_class_id uuid)
returns table(item_id text,rarity text,price integer,available_count integer,rarity_rank integer)
language sql stable security definer set search_path=public as $$
  with rotation as (select floor(extract(epoch from now())/600)::bigint bucket),
  stacks as (
    select ml.item_id,ml.rarity,ml.price,count(*)::integer available_count,
      case ml.rarity when 'legendary' then 5 when 'epic' then 4 when 'rare' then 3 when 'uncommon' then 2 else 1 end rarity_rank,
      case ml.rarity when 'legendary' then 1.0 when 'epic' then 4.0 when 'rare' then 10.0 when 'uncommon' then 25.0 else 60.0 end selection_weight
    from public.market_listings ml where ml.class_id=requested_class_id and ml.status='available'
    group by ml.item_id,ml.rarity,ml.price
  ), previous_items as (
    select prior.item_id from stacks prior cross join rotation
    order by -ln((abs(hashtextextended(requested_class_id::text||':'||(rotation.bucket-1)::text||':'||prior.item_id,0)%1000000)+1)::numeric/1000001)/prior.selection_weight
    limit 3
  )
  select stacks.item_id,stacks.rarity,stacks.price,stacks.available_count,stacks.rarity_rank
  from stacks cross join rotation
  order by case when stacks.item_id in(select previous_items.item_id from previous_items) then 1 else 0 end,
    -ln((abs(hashtextextended(requested_class_id::text||':'||rotation.bucket::text||':'||stacks.item_id,0)%1000000)+1)::numeric/1000001)/stacks.selection_weight
  limit 3;
$$;

create or replace function public.e3_market_snapshot(requested_class_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb;skill jsonb;rank integer;rotation_end timestamptz;
begin
  if not public.e3_can_access_class(requested_class_id) then raise exception 'Class access required' using errcode='42501';end if;
  skill:=public.e3_market_skill_snapshot(requested_class_id);rank:=(skill->>'rank')::integer;
  rotation_end:=to_timestamp((floor(extract(epoch from now())/600)+1)*600);
  select jsonb_build_object('credits',coalesce((select nova_credits from public.student_wallets where user_id=auth.uid() and class_id=requested_class_id),0),'skill',skill,'rotationEndsAt',rotation_end,'listings',coalesce(jsonb_agg(jsonb_build_object('itemId',stack.item_id,'rarity',stack.rarity,'unitPrice',greatest(1,ceil(stack.price*(1-rank*.06))::integer),'baseUnitPrice',stack.price,'availableCount',stack.available_count) order by stack.rarity_rank desc,stack.item_id),'[]'::jsonb)) into result
  from public.e3_market_rotation(requested_class_id) stack;
  return result;
end;
$$;

create or replace function public.e3_buy_market_stack(requested_class_id uuid,requested_item_id text,requested_quantity integer)
returns jsonb language plpgsql security definer set search_path=public as $$
declare selected_ids uuid[];selected_count integer;total_price integer;remaining_balance integer;purchase_count integer;milestone integer;earned_milestones integer[]:='{}';market_rank integer;
begin
  if not public.e3_can_access_class(requested_class_id) then raise exception 'Class access required' using errcode='42501';end if;
  if requested_quantity is null or requested_quantity<1 or requested_quantity>100 then raise exception 'Choose a quantity from 1 to 100.';end if;
  if not exists(select 1 from public.e3_market_rotation(requested_class_id) rotation where rotation.item_id=requested_item_id) then raise exception 'The market transmission changed. Refresh the Trading Post to see the new items.';end if;
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

revoke all on function public.e3_market_rotation(uuid) from public,anon,authenticated;
grant execute on function public.e3_market_rotation(uuid) to service_role;
grant execute on function public.e3_market_snapshot(uuid),public.e3_buy_market_stack(uuid,text,integer) to authenticated,service_role;
notify pgrst,'reload schema';
