-- Database structure for Mini SOC Interviews. Run it in the Supabase SQL Editor.
-- Only emails listed in team_members can read or change data.

create table if not exists public.team_members (
  email text primary key
);

create table if not exists public.contacts (
  id text primary key default gen_random_uuid()::text,
  name text not null check (char_length(name) between 1 and 300),
  section text not null check (section in ('A','B','C','D','E','F','G')),
  status text not null default 'todo'
    check (status in ('todo','contacted','scheduled','done','declined')),
  why_en text,
  why_fr text,
  link text,
  sort_order integer not null default 500,
  created_at timestamptz not null default now()
);

create table if not exists public.interviews (
  id uuid primary key default gen_random_uuid(),
  section text not null check (section in ('A','B','C','D','E','F','G')),
  lang text not null default 'fr' check (lang in ('fr','en')),
  answers jsonb not null default '{}'::jsonb,
  notes text not null default '' check (char_length(notes) <= 20000),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create or replace function public.is_team_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_members
    where lower(email) = lower(auth.jwt() ->> 'email')
  );
$$;

revoke all on function public.is_team_member() from public, anon;
grant execute on function public.is_team_member() to authenticated;

alter table public.team_members enable row level security;
alter table public.contacts enable row level security;
alter table public.interviews enable row level security;

revoke all on public.team_members from anon, authenticated;
revoke all on public.contacts, public.interviews from anon;
grant select, insert, update, delete on public.contacts, public.interviews to authenticated;

drop policy if exists "Team manages contacts" on public.contacts;
create policy "Team manages contacts" on public.contacts
  for all to authenticated
  using (public.is_team_member())
  with check (public.is_team_member());

drop policy if exists "Team manages interviews" on public.interviews;
create policy "Team manages interviews" on public.interviews
  for all to authenticated
  using (public.is_team_member())
  with check (public.is_team_member());

-- Sends live updates to the other team member's open page.
do $$
begin
  alter publication supabase_realtime add table public.contacts, public.interviews;
exception when duplicate_object then null;
end $$;
