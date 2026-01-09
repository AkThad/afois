-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- 1. User Profiles Table
create table public.user_profiles (
  id uuid references auth.users not null primary key,
  company_name text,
  ue_id text,
  bonding_capacity bigint DEFAULT 10000000,
  target_naics text [],
  target_states text [],
  qualified_set_asides text [],
  -- e.g. ['8A', 'HUBZone', 'SDVOSB']
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
-- 2. Opportunities Table
create type opportunity_source as enum ('SAM', 'SUB', 'USA');
create type opportunity_status as enum ('BID', 'NO_BID', 'POSSIBLE', 'HOLD');
create table public.opportunities (
  id uuid default uuid_generate_v4() primary key,
  source opportunity_source not null,
  notice_id text not null,
  title text not null,
  agency text,
  solicitation_number text,
  naics_code text,
  set_aside text,
  posted_date timestamp with time zone,
  response_deadline timestamp with time zone,
  site_visit_date timestamp with time zone,
  place_of_performance_state text,
  status opportunity_status DEFAULT 'POSSIBLE',
  raw_json jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(notice_id)
);
-- 3. AI Analysis Table
create table public.ai_analysis (
  id uuid default uuid_generate_v4() primary key,
  opportunity_id uuid references public.opportunities(id) on delete cascade not null,
  pwin_score integer check (
    pwin_score >= 0
    and pwin_score <= 100
  ),
  recommendation text,
  summary text,
  incumbent_data jsonb,
  bonding_status text check (bonding_status in ('OK', 'EXCEEDS', 'N/A')),
  notification_sent boolean default false,
  analyzed_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(opportunity_id)
);
-- RLS Policies (Basic)
alter table public.user_profiles enable row level security;
alter table public.opportunities enable row level security;
alter table public.ai_analysis enable row level security;
-- Policy: Users can only see their own profile
create policy "Users can view own profile" on public.user_profiles for
select using (auth.uid() = id);
create policy "Users can update own profile" on public.user_profiles for
update using (auth.uid() = id);
-- Policy: Opportunities are visible to everyone (Public Read)
create policy "Enable read access for all users" on public.opportunities for
select using (true);
-- Policy: Authenticated users can update opportunites (e.g. changing status)
create policy "Authenticated users can update opportunities" on public.opportunities for
update using (auth.role() = 'authenticated');
create policy "Authenticated users can view analysis" on public.ai_analysis for
select using (auth.role() = 'authenticated');