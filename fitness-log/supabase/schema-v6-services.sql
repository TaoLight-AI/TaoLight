create table if not exists public.expert_cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('safety_review','training_adjustment')),
  status text not null default 'open' check (status in ('open','assigned','responded','closed','breached')),
  priority text not null check (priority in ('normal','high')),
  summary text not null,
  roster_id text not null,
  sla_deadline timestamptz not null,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.expert_cases enable row level security;
create policy "users read own expert cases" on public.expert_cases for select using (auth.uid() = user_id);
create index if not exists expert_cases_sla_idx on public.expert_cases(status,sla_deadline);

-- 由服务端定时任务调用；红旗急症不进入SLA队列，前端直接提示线下就医。
create or replace function public.mark_breached_expert_cases()
returns integer language plpgsql security definer set search_path=public as $$
declare affected integer;
begin
  update public.expert_cases set status='breached',updated_at=now()
  where status in ('open','assigned') and sla_deadline < now();
  get diagnostics affected = row_count;
  return affected;
end;
$$;
