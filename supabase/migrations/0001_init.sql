-- "היום שלי" - initial schema.
-- Single-user-per-account daily task manager. Every table is scoped by
-- user_id and protected by RLS; the client never sends user_id because the
-- column defaults to auth.uid().
--
-- This migration is written to be safely re-runnable.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enum types
-- ---------------------------------------------------------------------------

do $$ begin
  create type override_mode as enum ('skip_template', 'use_dow');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_status as enum ('pending', 'done', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_source as enum ('template', 'oneoff', 'ai');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists settings (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  timezone text not null default 'Asia/Jerusalem',
  morning_brief_enabled boolean not null default true,
  evening_review_time time not null default '20:00',
  created_at timestamptz not null default now()
);

-- The weekly template: recurring tasks.
create table if not exists templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  notes text,
  scheduled_time time,                 -- null = no specific time
  days_of_week smallint[] not null,    -- 0 = Sunday ... 6 = Saturday
  icon text,                           -- optional emoji
  sort_order int not null default 0,
  active_from date not null default current_date,
  active_until date,                   -- null = no end
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (
    days_of_week <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]
    and cardinality(days_of_week) > 0
  )
);

-- Special days that replace the template for a given date.
create table if not exists day_overrides (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  override_date date not null,
  label text not null,                 -- "ראש השנה", "חופש", "מילואים"
  mode override_mode not null,
  use_dow smallint check (use_dow between 0 and 6),
  source text not null default 'manual' check (source in ('manual', 'hebcal')),
  created_at timestamptz not null default now(),
  primary key (user_id, override_date),
  check ((mode = 'use_dow') = (use_dow is not null))
);

-- Task instances for a specific day (from the template and one-offs alike).
-- The client generates `id` with crypto.randomUUID() so an offline retry can
-- be de-duplicated with `on conflict (id) do nothing`.
create table if not exists daily_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  task_date date not null,
  template_id uuid references templates on delete set null,
  title text not null check (char_length(title) between 1 and 200),
  notes text,
  scheduled_time time,
  icon text,
  status task_status not null default 'pending',
  source task_source not null,
  sort_order int not null default 0,
  done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (template_id, task_date)      -- blocks duplicate instances of a template
);

create index if not exists daily_tasks_user_date_idx
  on daily_tasks (user_id, task_date);
create index if not exists daily_tasks_user_template_date_idx
  on daily_tasks (user_id, template_id, task_date);

-- Stored Claude summaries (morning / evening).
create table if not exists daily_briefs (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  brief_date date not null,
  kind text not null check (kind in ('morning', 'evening')),
  content text not null,
  refresh_count int not null default 0,
  completed_at timestamptz,            -- evening: the user pressed "סיים"
  created_at timestamptz not null default now(),
  primary key (user_id, brief_date, kind)
);

-- AI call counter, used for rate limiting.
create table if not exists ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null check (kind in ('parse', 'morning', 'evening')),
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_user_created_idx
  on ai_usage (user_id, created_at);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Keeps updated_at fresh and derives done_at from status.
-- apply_day_override() relies on `updated_at = created_at` meaning "never
-- edited", which holds because both default to the transaction timestamp.
create or replace function public.tg_daily_tasks_touch()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    new.updated_at := now();

    if new.status = 'done' and old.status is distinct from 'done' then
      new.done_at := now();
    elsif new.status <> 'done' then
      new.done_at := null;
    end if;
  elsif new.status = 'done' and new.done_at is null then
    new.done_at := now();
  end if;

  return new;
end $$;

drop trigger if exists daily_tasks_touch on daily_tasks;
create trigger daily_tasks_touch
  before insert or update on daily_tasks
  for each row execute function public.tg_daily_tasks_touch();

-- Give every new auth user a settings row with the defaults.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.settings (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'settings', 'templates', 'day_overrides',
    'daily_tasks', 'daily_briefs', 'ai_usage'
  ] loop
    execute format('alter table %I enable row level security', t);

    execute format('drop policy if exists %I on %I', t || '_select', t);
    execute format(
      'create policy %I on %I for select using (user_id = auth.uid())',
      t || '_select', t
    );

    execute format('drop policy if exists %I on %I', t || '_insert', t);
    execute format(
      'create policy %I on %I for insert with check (user_id = auth.uid())',
      t || '_insert', t
    );

    execute format('drop policy if exists %I on %I', t || '_update', t);
    execute format(
      'create policy %I on %I for update using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t || '_update', t
    );

    execute format('drop policy if exists %I on %I', t || '_delete', t);
    execute format(
      'create policy %I on %I for delete using (user_id = auth.uid())',
      t || '_delete', t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Day materialisation
-- ---------------------------------------------------------------------------

-- Creates the template instances for one day, honouring a special day.
-- Days are never generated ahead of time: a day materialises when it is first
-- opened, so template edits automatically apply to every day not yet created.
create or replace function public.ensure_day(p_user uuid, p_date date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dow smallint;
begin
  select case o.mode when 'skip_template' then null else o.use_dow end
    into v_dow
    from day_overrides o
   where o.user_id = p_user
     and o.override_date = p_date;

  if not found then
    v_dow := extract(dow from p_date)::smallint;
  end if;

  if v_dow is null then
    return;                            -- day off: no template tasks
  end if;

  insert into daily_tasks (
    user_id, task_date, template_id, title, notes,
    scheduled_time, icon, sort_order, source
  )
  select
    p_user, p_date, t.id, t.title, t.notes,
    t.scheduled_time, t.icon, t.sort_order, 'template'
    from templates t
   where t.user_id = p_user
     and t.is_active
     and v_dow = any (t.days_of_week)
     and p_date >= t.active_from
     and (t.active_until is null or p_date <= t.active_until)
  on conflict (template_id, task_date) do nothing;
end $$;

-- Client-facing wrappers. They pass auth.uid() so a caller can only ever
-- materialise their own days.
create or replace function public.ensure_my_day(p_date date)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  perform public.ensure_day(auth.uid(), p_date);
end $$;

create or replace function public.ensure_my_range(p_from date, p_to date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_day date;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if p_to < p_from then
    raise exception 'p_to must not be earlier than p_from';
  end if;

  if p_to - p_from > 90 then
    raise exception 'range is limited to 90 days';
  end if;

  for v_day in
    select generate_series(p_from, p_to, interval '1 day')::date
  loop
    perform public.ensure_day(v_uid, v_day);
  end loop;
end $$;

-- Called after a special day is added, changed or removed. Drops only the
-- template instances that are still pending and were never edited, then
-- rebuilds the day. Completed, edited and one-off tasks survive.
create or replace function public.apply_day_override(p_date date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  delete from daily_tasks t
   where t.user_id = v_uid
     and t.task_date = p_date
     and t.source = 'template'
     and t.status = 'pending'
     and t.updated_at = t.created_at;

  perform public.ensure_day(v_uid, p_date);
end $$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete
  on settings, templates, day_overrides, daily_tasks, daily_briefs, ai_usage
  to authenticated;

grant usage, select on all sequences in schema public to authenticated;

-- ensure_day bypasses RLS, so it must never be callable directly.
revoke execute on function public.ensure_day(uuid, date) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

revoke execute on function public.ensure_my_day(date) from public, anon;
revoke execute on function public.ensure_my_range(date, date) from public, anon;
revoke execute on function public.apply_day_override(date) from public, anon;

grant execute on function public.ensure_my_day(date) to authenticated;
grant execute on function public.ensure_my_range(date, date) to authenticated;
grant execute on function public.apply_day_override(date) to authenticated;
