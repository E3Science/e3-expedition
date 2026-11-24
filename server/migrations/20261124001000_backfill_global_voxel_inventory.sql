insert into public.player_voxel_inventory(user_id,item_id,quantity,updated_at)
select inventory.user_id,inventory.item_id,least(99,max(inventory.quantity))::integer,now()
from public.inventories inventory
join auth.users account on account.id=inventory.user_id
where inventory.quantity>0
group by inventory.user_id,inventory.item_id
on conflict(user_id,item_id) do update
set quantity=greatest(player_voxel_inventory.quantity,excluded.quantity),updated_at=now();
