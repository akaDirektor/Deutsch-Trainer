begin;
create table public.translation_feedback_reports (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 word_key text not null check (length(word_key) between 1 and 200),
 german text not null check (length(german) between 1 and 200),
 translation text not null check (length(translation) <= 4000),
 reason text not null default '' check (length(reason) <= 600),
 suggestion text not null default '' check (length(suggestion) <= 200),
 created_at timestamptz not null default now(),
 status text not null default 'pending' check (status in ('pending','dispatched')),
 issue_url text check (issue_url is null or issue_url ~ '^https://github.com/akaDirektor/Deutsch-Trainer/issues/[0-9]+$'),
 delivered_at timestamptz
);
alter table public.translation_feedback_reports enable row level security;
revoke all on public.translation_feedback_reports from public,anon,authenticated;
grant select on public.translation_feedback_reports to authenticated,service_role;
grant insert(id,user_id,word_key,german,translation,reason,suggestion) on public.translation_feedback_reports to authenticated;
grant update(status,issue_url,delivered_at) on public.translation_feedback_reports to service_role;
create policy own_feedback_read on public.translation_feedback_reports for select to authenticated using ((select auth.uid()) = user_id);
create policy own_feedback_submit on public.translation_feedback_reports for insert to authenticated with check (
 (select auth.uid()) = user_id and exists(select 1 from public.trainer_progress p where p.user_id=(select auth.uid()))
);
create index translation_feedback_pending on public.translation_feedback_reports(created_at) where status='pending';
create index translation_feedback_owner on public.translation_feedback_reports(user_id);
notify pgrst,'reload schema';
commit;
