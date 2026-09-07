-- Health credentials are service-only; clients read only their normalized samples.
create table if not exists public.health_oauth_states (
 state_hash text primary key, user_id uuid not null references auth.users(id) on delete cascade,
 expires_at timestamptz not null, created_at timestamptz not null default now()
);
create table if not exists public.health_connections (
 user_id uuid primary key references auth.users(id) on delete cascade,
 encrypted_tokens text not null, expires_at timestamptz not null,
 scopes text not null, synced_at timestamptz, updated_at timestamptz not null default now()
);
create table if not exists public.health_samples (
 user_id uuid not null references auth.users(id) on delete cascade,
 source_id text not null, metric text not null check(metric in ('steps','sleep_minutes','heart_rate','resting_heart_rate')),
 value numeric not null check(value>=0), unit text not null,
 measured_at timestamptz not null, source text not null default 'huawei',
 imported_at timestamptz not null default now(), primary key(user_id,source_id,metric)
);
alter table public.health_oauth_states enable row level security;
alter table public.health_connections enable row level security;
alter table public.health_samples enable row level security;
revoke all on public.health_oauth_states,public.health_connections from anon, authenticated;
revoke all on public.health_samples from anon,authenticated;
grant select on public.health_samples to authenticated;
create policy "read own health samples" on public.health_samples for select to authenticated using(auth.uid()=user_id);
create index if not exists health_samples_date_idx on public.health_samples(user_id,measured_at);
