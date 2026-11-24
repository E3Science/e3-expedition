-- Keep voxel-world inventory with the player instead of a temporary room or class.
create table if not exists public.player_voxel_inventory (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  quantity integer not null default 0 check (quantity between 0 and 99),
  updated_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

alter table public.player_voxel_inventory enable row level security;
drop policy if exists "players read own voxel inventory" on public.player_voxel_inventory;
create policy "players read own voxel inventory" on public.player_voxel_inventory
  for select to authenticated using (user_id = auth.uid() or public.e3_is_teacher());
revoke all on public.player_voxel_inventory from anon;
grant select on public.player_voxel_inventory to authenticated;
grant select, insert, update, delete on public.player_voxel_inventory to service_role;

create or replace function public.e3_set_inventory_item_quantity(
  requested_class_id uuid,
  requested_item_id text,
  requested_quantity integer
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  state_class uuid;
  safe_item_id text := trim(coalesce(requested_item_id, ''));
  safe_quantity integer := greatest(0, least(99, coalesce(requested_quantity, 0)));
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if safe_item_id = '' or length(safe_item_id) > 160 then raise exception 'Invalid inventory item.'; end if;
  state_class := public.e3_player_state_class(requested_class_id);

  if safe_quantity = 0 then
    delete from public.inventories where user_id=auth.uid() and class_id=state_class and item_id=safe_item_id;
    delete from public.player_voxel_inventory where user_id=auth.uid() and item_id=safe_item_id;
  else
    insert into public.inventories(user_id,class_id,item_id,quantity)
      values(auth.uid(),state_class,safe_item_id,safe_quantity)
      on conflict(user_id,class_id,item_id) do update set quantity=excluded.quantity;
    insert into public.player_voxel_inventory(user_id,item_id,quantity,updated_at)
      values(auth.uid(),safe_item_id,safe_quantity,now())
      on conflict(user_id,item_id) do update set quantity=excluded.quantity,updated_at=now();
  end if;
  return jsonb_build_object('itemId',safe_item_id,'quantity',safe_quantity);
end;
$$;

create or replace function public.e3_inventory_snapshot(requested_class_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare state_class uuid;items jsonb;capacity jsonb;
begin
  state_class:=public.e3_player_state_class(requested_class_id);
  capacity:=public.e3_inventory_capacity_snapshot(requested_class_id);
  select coalesce(jsonb_object_agg(item_id,quantity),'{}'::jsonb) into items
  from (
    select item_id,max(quantity)::integer as quantity
    from (
      select item_id,quantity from public.inventories where user_id=auth.uid() and class_id=state_class and quantity>0
      union all
      select item_id,quantity from public.player_voxel_inventory where user_id=auth.uid() and quantity>0
    ) combined group by item_id
  ) merged;
  return jsonb_build_object('items',items,'slots',(capacity->>'slots')::integer,'capacity',capacity);
end;
$$;

revoke all on function public.e3_set_inventory_item_quantity(uuid,text,integer),public.e3_inventory_snapshot(uuid) from public,anon;
grant execute on function public.e3_set_inventory_item_quantity(uuid,text,integer),public.e3_inventory_snapshot(uuid) to authenticated,service_role;
