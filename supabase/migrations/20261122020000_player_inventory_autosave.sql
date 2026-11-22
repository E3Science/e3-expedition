create or replace function public.e3_set_inventory_item_quantity(
  requested_class_id uuid,
  requested_item_id text,
  requested_quantity integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  state_class uuid;
  safe_item_id text := trim(coalesce(requested_item_id, ''));
  safe_quantity integer := greatest(0, least(99, coalesce(requested_quantity, 0)));
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;
  if safe_item_id = '' or length(safe_item_id) > 160 then
    raise exception 'Invalid inventory item.';
  end if;

  state_class := public.e3_player_state_class(requested_class_id);
  if safe_quantity = 0 then
    delete from public.inventories
    where user_id = auth.uid() and class_id = state_class and item_id = safe_item_id;
  else
    insert into public.inventories(user_id, class_id, item_id, quantity)
    values(auth.uid(), state_class, safe_item_id, safe_quantity)
    on conflict(user_id, class_id, item_id)
    do update set quantity = excluded.quantity;
  end if;

  return jsonb_build_object('itemId', safe_item_id, 'quantity', safe_quantity);
end;
$$;

revoke all on function public.e3_set_inventory_item_quantity(uuid,text,integer) from public, anon;
grant execute on function public.e3_set_inventory_item_quantity(uuid,text,integer) to authenticated, service_role;
