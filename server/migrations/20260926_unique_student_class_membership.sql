-- Each E3 student account belongs to at most one active class.
-- Required by every class-membership upsert that uses onConflict: "user_id".
-- Safe to run repeatedly.

create unique index if not exists class_memberships_user_id_key
  on public.class_memberships (user_id);

grant select, insert, update, delete
  on table public.class_memberships
  to service_role;
