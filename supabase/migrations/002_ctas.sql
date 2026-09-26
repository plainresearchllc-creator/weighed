-- Adds "where to buy" links and email sign-ups.
-- Run once in Supabase: SQL Editor > New query > paste > Run. Safe to run twice.

alter table public.products add column if not exists retailer text;
alter table public.products add column if not exists buy_url text check (buy_url is null or buy_url ~* '^https?://');

create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 254),
  product_id uuid references public.products (id) on delete cascade,
  source text not null default 'newsletter' check (source in ('newsletter', 'score-alert')),
  created_at timestamptz not null default now()
);
create unique index if not exists subscribers_unique on public.subscribers (lower(email), coalesce(product_id, '00000000-0000-0000-0000-000000000000'::uuid));

alter table public.subscribers enable row level security;
-- Anyone can sign up; only admins can see the list.
drop policy if exists "anyone subscribes" on public.subscribers;
create policy "anyone subscribes" on public.subscribers for insert with check (true);
drop policy if exists "admin reads subscribers" on public.subscribers;
create policy "admin reads subscribers" on public.subscribers for select using (public.is_admin());
drop policy if exists "admin deletes subscribers" on public.subscribers;
create policy "admin deletes subscribers" on public.subscribers for delete using (public.is_admin());
