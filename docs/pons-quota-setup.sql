begin;
create schema if not exists pons_private;
revoke all on schema pons_private from public, anon, authenticated;
grant usage on schema pons_private to service_role;
create table pons_private.monthly_quota (
 month date primary key,
 requests integer not null check(requests between 1 and 900)
);
alter table pons_private.monthly_quota enable row level security;
revoke all on pons_private.monthly_quota from public, anon, authenticated;
grant select,insert,update on pons_private.monthly_quota to service_role;
create function public.reserve_pons_query() returns integer
language plpgsql security invoker set search_path='' as $$
declare used integer;
begin
 insert into pons_private.monthly_quota(month,requests)
 values(date_trunc('month',now() at time zone 'UTC')::date,1)
 on conflict(month) do update set requests=pons_private.monthly_quota.requests+1
 where pons_private.monthly_quota.requests<900
 returning requests into used;
 return coalesce(used,-1);
end $$;
revoke all on function public.reserve_pons_query() from public,anon,authenticated;
grant execute on function public.reserve_pons_query() to service_role;
commit;
