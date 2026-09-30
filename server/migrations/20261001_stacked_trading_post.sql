-- Anonymous, stacked Trading Post listings with atomic quantity purchases.
-- Run after 20260929_game_overview_achievements.sql. Safe to run repeatedly.

create or replace function public.e3_market_snapshot(requested_class_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb;
begin
  if not public.e3_can_access_class(requested_class_id) then raise exception 'Class access required' using errcode='42501'; end if;
  select jsonb_build_object(
    'credits',coalesce((select nova_credits from public.student_wallets where user_id=auth.uid() and class_id=requested_class_id),0),
    'listings',coalesce(jsonb_agg(jsonb_build_object(
      'itemId',stack.item_id,
      'rarity',stack.rarity,
      'unitPrice',stack.price,
      'availableCount',stack.available_count
    ) order by stack.rarity_rank desc,stack.item_id),'[]'::jsonb)
  ) into result
  from (
    select item_id,rarity,price,count(*)::integer available_count,max(created_at) newest,
      case rarity when 'legendary' then 5 when 'epic' then 4 when 'rare' then 3 when 'uncommon' then 2 else 1 end rarity_rank
    from public.market_listings
    where class_id=requested_class_id and status='available'
    group by item_id,rarity,price
  ) stack;
  return result;
end;
$$;

create or replace function public.e3_buy_market_stack(requested_class_id uuid, requested_item_id text, requested_quantity integer)
returns jsonb language plpgsql security definer set search_path=public as $$
declare selected_ids uuid[]; selected_count integer; total_price integer; remaining_balance integer;
begin
  if not public.e3_can_access_class(requested_class_id) then raise exception 'Class access required' using errcode='42501'; end if;
  if requested_quantity is null or requested_quantity<1 or requested_quantity>100 then raise exception 'Choose a quantity from 1 to 100.'; end if;

  select array_agg(chosen.listing_id),count(*)::integer,coalesce(sum(chosen.price),0)::integer
  into selected_ids,selected_count,total_price
  from (
    select listing_id,price from public.market_listings
    where class_id=requested_class_id and item_id=requested_item_id and status='available'
    order by created_at,listing_id
    for update skip locked
    limit requested_quantity
  ) chosen;

  if coalesce(selected_count,0)<requested_quantity then raise exception 'Only % of this item remain available.',coalesce(selected_count,0); end if;
  update public.student_wallets set nova_credits=nova_credits-total_price
  where user_id=auth.uid() and class_id=requested_class_id and nova_credits>=total_price
  returning nova_credits into remaining_balance;
  if remaining_balance is null then raise exception 'Not enough Nova Credits for this quantity.'; end if;

  update public.market_listings set status='sold',buyer_id=auth.uid(),sold_at=now()
  where listing_id=any(selected_ids);
  insert into public.inventories(user_id,class_id,item_id,quantity)
  values(auth.uid(),requested_class_id,requested_item_id,requested_quantity)
  on conflict(user_id,class_id,item_id) do update set quantity=inventories.quantity+excluded.quantity;

  return jsonb_build_object('success',true,'itemId',requested_item_id,'quantity',requested_quantity,'totalPrice',total_price,'credits',remaining_balance);
end;
$$;

revoke all on function public.e3_market_snapshot(uuid),public.e3_buy_market_stack(uuid,text,integer) from public,anon;
grant execute on function public.e3_market_snapshot(uuid),public.e3_buy_market_stack(uuid,text,integer) to authenticated,service_role;
notify pgrst, 'reload schema';
