-- Weighed database schema
-- Run this once in Supabase: SQL Editor > New query > paste > Run.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  credential text,               -- RD, MD, PharmD ...
  role_title text,               -- "Clinical pharmacist"
  role text not null default 'viewer' check (role in ('viewer', 'panelist', 'admin')),
  verified_at timestamptz,       -- when the license was confirmed with the issuing board
  created_at timestamptz not null default now()
);

-- Private credential details: visible only to the expert and to admins.
create table if not exists public.expert_private (
  id uuid primary key references public.profiles (id) on delete cascade,
  license_number text,
  issuing_board text,
  verification_notes text,
  updated_at timestamptz not null default now()
);

-- Brands each expert has financial ties to. They can never score these brands.
create table if not exists public.conflicts (
  id uuid primary key default gen_random_uuid(),
  expert_id uuid not null references public.profiles (id) on delete cascade,
  brand text not null,
  tie_type text,
  created_at timestamptz not null default now(),
  unique (expert_id, brand)
);

-- New sign-ups get a viewer profile automatically.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.current_role_name()
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'anon');
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_role_name() = 'admin';
$$;

-- ---------------------------------------------------------------------------
-- Products, ballots, settings, press
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text not null,
  category text not null,
  tags text[] not null default '{}',
  summary text,
  review_count integer not null default 0 check (review_count >= 0),
  avg_rating numeric(3,2) check (avg_rating between 1 and 5),
  filtered_count integer not null default 0 check (filtered_count >= 0),
  image_path text,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ballots (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  expert_id uuid references public.profiles (id) on delete set null,
  expert_name text not null,
  credential text,
  role_title text,
  evidence numeric(3,1) not null check (evidence between 0 and 10),
  dosing numeric(3,1) not null check (dosing between 0 and 10),
  transparency numeric(3,1) not null check (transparency between 0 and 10),
  safety numeric(3,1) not null check (safety between 0 and 10),
  value numeric(3,1) not null check (value between 0 and 10),
  rationale text,
  no_conflicts boolean not null check (no_conflicts),
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists ballots_product_idx on public.ballots (product_id);
-- One ballot per expert per product.
create unique index if not exists ballots_one_per_expert on public.ballots (product_id, expert_id) where expert_id is not null;

create table if not exists public.settings (
  id integer primary key default 1 check (id = 1),
  base_expert_weight numeric not null default 0.6,
  max_expert_weight numeric not null default 0.8,
  full_weight_reviews integer not null default 500,
  min_weight_reviews integer not null default 100,
  disagreement_gap numeric not null default 1.5,
  min_ballots integer not null default 3,
  updated_at timestamptz not null default now()
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.press (
  id uuid primary key default gen_random_uuid(),
  outlet text not null,
  headline text not null,
  url text not null check (url ~* '^https?://'),
  published_on date not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Public corrections log: every change that can move a score is recorded.
-- ---------------------------------------------------------------------------
create table if not exists public.score_log (
  id bigserial primary key,
  product_id uuid,
  product_name text,
  kind text not null,
  detail text not null,
  changed_at timestamptz not null default now()
);

create or replace function public.log_ballot_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare pname text; b record;
begin
  b := coalesce(new, old);
  select name into pname from public.products where id = b.product_id;
  if b.is_sample then return b; end if;
  if tg_op = 'INSERT' then
    insert into public.score_log (product_id, product_name, kind, detail)
    values (b.product_id, pname, 'Ballot added',
      format('%s%s scored it %s.', b.expert_name, coalesce(', ' || b.credential, ''),
        round((b.evidence + b.dosing + b.transparency + b.safety + b.value) / 5, 1)));
  elsif tg_op = 'DELETE' then
    insert into public.score_log (product_id, product_name, kind, detail)
    values (b.product_id, pname, 'Ballot withdrawn', format('The ballot from %s was withdrawn.', b.expert_name));
  end if;
  return b;
end $$;

drop trigger if exists ballots_log on public.ballots;
create trigger ballots_log after insert or delete on public.ballots
  for each row execute function public.log_ballot_change();

create or replace function public.log_product_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_sample then return new; end if;
  if tg_op = 'INSERT' then
    insert into public.score_log (product_id, product_name, kind, detail)
    values (new.id, new.name, 'Product added', format('Added to %s.', new.category));
  elsif (old.review_count, old.avg_rating) is distinct from (new.review_count, new.avg_rating) then
    insert into public.score_log (product_id, product_name, kind, detail)
    values (new.id, new.name, 'Customer data updated',
      format('Verified reviews %s → %s; average rating %s → %s.',
        old.review_count, new.review_count, coalesce(old.avg_rating::text, '–'), coalesce(new.avg_rating::text, '–')));
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists products_log_ins on public.products;
create trigger products_log_ins after insert on public.products
  for each row execute function public.log_product_change();
drop trigger if exists products_log_upd on public.products;
create trigger products_log_upd before update on public.products
  for each row execute function public.log_product_change();

create or replace function public.log_settings_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.score_log (kind, detail)
  values ('Method changed', format('Expert share %s%% (max %s%%); standard split at %s reviews; disagreement flag at %s points; %s ballots to rank.',
    round(new.base_expert_weight * 100), round(new.max_expert_weight * 100), new.full_weight_reviews, new.disagreement_gap, new.min_ballots));
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists settings_log on public.settings;
create trigger settings_log before update on public.settings
  for each row execute function public.log_settings_change();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.expert_private enable row level security;
alter table public.conflicts enable row level security;
alter table public.products enable row level security;
alter table public.ballots enable row level security;
alter table public.settings enable row level security;
alter table public.press enable row level security;
alter table public.score_log enable row level security;

-- Public reads
drop policy if exists "public read profiles" on public.profiles;
create policy "public read profiles" on public.profiles for select using (true);
drop policy if exists "public read products" on public.products;
create policy "public read products" on public.products for select using (true);
drop policy if exists "public read ballots" on public.ballots;
create policy "public read ballots" on public.ballots for select using (true);
drop policy if exists "public read settings" on public.settings;
create policy "public read settings" on public.settings for select using (true);
drop policy if exists "public read press" on public.press;
create policy "public read press" on public.press for select using (true);
drop policy if exists "public read log" on public.score_log;
create policy "public read log" on public.score_log for select using (true);

-- Profiles: people edit their own name and credential; only admins change roles.
drop policy if exists "self update profile" on public.profiles;
create policy "self update profile" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid() and role = public.current_role_name());
drop policy if exists "admin manage profiles" on public.profiles;
create policy "admin manage profiles" on public.profiles for all using (public.is_admin()) with check (public.is_admin());

-- Private credential details
drop policy if exists "self or admin read private" on public.expert_private;
create policy "self or admin read private" on public.expert_private for select using (id = auth.uid() or public.is_admin());
drop policy if exists "self write private" on public.expert_private;
create policy "self write private" on public.expert_private for insert with check (id = auth.uid());
drop policy if exists "self update private" on public.expert_private;
create policy "self update private" on public.expert_private for update using (id = auth.uid() or public.is_admin());

-- Conflicts: experts can add (never remove) their own; admins manage all. Public can see them.
drop policy if exists "public read conflicts" on public.conflicts;
create policy "public read conflicts" on public.conflicts for select using (true);
drop policy if exists "self add conflicts" on public.conflicts;
create policy "self add conflicts" on public.conflicts for insert with check (expert_id = auth.uid());
drop policy if exists "admin manage conflicts" on public.conflicts;
create policy "admin manage conflicts" on public.conflicts for all using (public.is_admin()) with check (public.is_admin());

-- Admin writes
drop policy if exists "admin write products" on public.products;
create policy "admin write products" on public.products for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin write ballots" on public.ballots;
create policy "admin write ballots" on public.ballots for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin write settings" on public.settings;
create policy "admin write settings" on public.settings for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin write press" on public.press;
create policy "admin write press" on public.press for all using (public.is_admin()) with check (public.is_admin());

-- Panelists submit their own ballots, never for a brand they have ties to.
drop policy if exists "panelist submit ballot" on public.ballots;
create policy "panelist submit ballot" on public.ballots for insert with check (
  public.current_role_name() in ('panelist', 'admin')
  and expert_id = auth.uid()
  and is_sample = false
  and not exists (
    select 1 from public.conflicts c join public.products p on p.id = product_id
    where c.expert_id = auth.uid() and lower(c.brand) = lower(p.brand)
  )
);

-- ---------------------------------------------------------------------------
-- Product photos (public bucket; only admins upload)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "public read product images" on storage.objects;
create policy "public read product images" on storage.objects for select using (bucket_id = 'product-images');
drop policy if exists "admin upload product images" on storage.objects;
create policy "admin upload product images" on storage.objects for insert with check (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "admin delete product images" on storage.objects;
create policy "admin delete product images" on storage.objects for delete using (bucket_id = 'product-images' and public.is_admin());
