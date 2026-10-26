-- Keep question-set RLS independent of direct access to the protected classes table.
-- Student gameplay reads class-scoped questions through security-definer RPCs.
drop policy if exists "owned or public question sets" on public.question_sets;
create policy "owned or public question sets" on public.question_sets
for select to authenticated
using(is_public or owner_user_id=auth.uid() or owner_user_id is null);

notify pgrst,'reload schema';
