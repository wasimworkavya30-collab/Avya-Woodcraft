-- Avya Woodcraft LLP - Attendance database schema (PostgreSQL / Supabase)
-- Safe to run more than once: every statement uses IF NOT EXISTS.
-- Run it in Supabase: SQL Editor > New query > paste > Run.

create extension if not exists pgcrypto;

create sequence if not exists employee_code_seq start 101;

-- Employees. The Main Admin is not stored here; it comes from environment variables.
create table if not exists employees (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,
  name            text not null,
  role_title      text not null default '',
  hourly_rate     numeric(10,2) not null check (hourly_rate >= 0),
  pin_hash        text not null,
  active          boolean not null default true,
  failed_attempts int not null default 0,
  locked_until    timestamptz,
  created_at      timestamptz not null default now()
);

-- The authorized company mobile. Only one row can be active at a time.
create table if not exists devices (
  id          uuid primary key default gen_random_uuid(),
  label       text not null default 'Company mobile',
  user_agent  text,
  active      boolean not null default true,
  paired_at   timestamptz not null default now(),
  last_seen   timestamptz,
  revoked_at  timestamptz
);
create unique index if not exists devices_one_active on devices (active) where active;

-- One-time codes the Main Admin creates to pair a phone.
create table if not exists pairing_codes (
  id          uuid primary key default gen_random_uuid(),
  code_hash   text not null,
  expires_at  timestamptz not null,
  used        boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Every attempt to punch from a phone that is not authorized.
create table if not exists blocked_attempts (
  id           uuid primary key default gen_random_uuid(),
  employee_id  uuid references employees(id) on delete set null,
  reason       text not null,
  user_agent   text,
  ip           text,
  created_at   timestamptz not null default now()
);
create index if not exists blocked_attempts_created on blocked_attempts (created_at desc);

-- One row per employee per day.
create table if not exists attendance (
  id               uuid primary key default gen_random_uuid(),
  employee_id      uuid not null references employees(id) on delete cascade,
  work_date        date not null,
  check_in_at      timestamptz not null,
  check_out_at     timestamptz,
  in_lat           double precision,
  in_lng           double precision,
  in_distance_m    int,
  out_lat          double precision,
  out_lng          double precision,
  out_distance_m   int,
  in_selfie_path   text,
  out_selfie_path  text,
  device_id        uuid references devices(id) on delete set null,
  worked_minutes   int,
  suggested_hours  numeric(5,2),
  approved_hours   numeric(5,2),
  approved_rate    numeric(10,2),
  status           text not null default 'open' check (status in ('open','pending','approved','rejected')),
  approved_at      timestamptz,
  note             text,
  created_at       timestamptz not null default now(),
  unique (employee_id, work_date)
);
create index if not exists attendance_date on attendance (work_date);
create index if not exists attendance_status on attendance (status);

-- What each employee worked on, every day.
create table if not exists work_entries (
  id           uuid primary key default gen_random_uuid(),
  employee_id  uuid not null references employees(id) on delete cascade,
  work_date    date not null,
  task_type    text not null,
  item         text not null,
  hours        numeric(5,2) not null check (hours > 0 and hours <= 12),
  note         text not null default '',
  created_at   timestamptz not null default now()
);
create index if not exists work_entries_date on work_entries (work_date, employee_id);

create table if not exists task_types (
  id      serial primary key,
  name    text not null unique,
  active  boolean not null default true
);

create table if not exists work_items (
  id      serial primary key,
  name    text not null unique,
  active  boolean not null default true
);

create table if not exists leave_requests (
  id            uuid primary key default gen_random_uuid(),
  employee_id   uuid not null references employees(id) on delete cascade,
  leave_type    text not null check (leave_type in ('Casual','Sick','Unpaid')),
  from_date     date not null,
  to_date       date not null,
  reason        text not null,
  status        text not null default 'pending' check (status in ('pending','approved','rejected')),
  decided_at    timestamptz,
  created_at    timestamptz not null default now(),
  check (to_date >= from_date)
);
create index if not exists leave_dates on leave_requests (from_date, to_date);

-- Company settings (key / value).
create table if not exists settings (
  key    text primary key,
  value  jsonb not null
);

-- Security: the app talks to the database only through the backend.
-- Turning on row level security with no policies blocks Supabase's public
-- API (anon key) from reading or writing any of these tables.
alter table employees        enable row level security;
alter table devices          enable row level security;
alter table pairing_codes    enable row level security;
alter table blocked_attempts enable row level security;
alter table attendance       enable row level security;
alter table work_entries     enable row level security;
alter table task_types       enable row level security;
alter table work_items       enable row level security;
alter table leave_requests   enable row level security;
alter table settings         enable row level security;
