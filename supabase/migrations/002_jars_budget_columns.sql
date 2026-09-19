-- Migration: bo sung cot con thieu cho bang jars (Giai doan 1 - man Hu ngan sach)
-- Chay trong SQL Editor cua Supabase sau khi da co schema_giai_doan_1.sql

alter table public.jars
  add column if not exists monthly_budget numeric(14,2) not null default 0,
  add column if not exists alert_at_80 boolean not null default true,
  add column if not exists rollover boolean not null default false,
  add column if not exists is_shared boolean not null default false;
