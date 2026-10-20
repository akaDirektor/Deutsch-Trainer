begin;
create table public.trainer_progress (
 user_id uuid primary key references auth.users(id),
 revision bigint not null default 0 check(revision >= 0),
 state jsonb not null check (state->>'schema' = '1' and jsonb_typeof(state->'stats')='object' and jsonb_typeof(state->'hidden')='array' and jsonb_typeof(state->'cycle')='object'),
 updated_at timestamptz not null default now()
);
alter table public.trainer_progress enable row level security;
revoke all on public.trainer_progress from anon, authenticated;
grant select on public.trainer_progress to authenticated;
create policy own_progress on public.trainer_progress for select to authenticated using ((select auth.uid()) = user_id);
-- Only this transaction can write. Missing rows have revision -1.
create function public.save_trainer_progress(expected_revision bigint, next_state jsonb)
returns setof public.trainer_progress language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if expected_revision = -1 then
  return query insert into public.trainer_progress(user_id,state) values(uid,next_state)
   on conflict do nothing returning *;
 else
  return query update public.trainer_progress set state=next_state, revision=revision+1, updated_at=now()
   where user_id=uid and revision=expected_revision returning *;
 end if;
end $$;
revoke all on function public.save_trainer_progress(bigint,jsonb) from public, anon;
grant execute on function public.save_trainer_progress(bigint,jsonb) to authenticated;
commit;
