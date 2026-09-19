-- Migration 009: Ke hoach tra no
-- Chay trong SQL Editor cua Supabase SAU KHI da chay 002-008.
--
-- Bang moi luu cac khoan no (vay, the tin dung, tra gop...) cua user —
-- KHONG lien quan gi den jars/incomes, day la 1 module doc lap. Lich tra
-- no (avalanche/snowball) duoc TINH O CLIENT/SERVER ACTION tu du lieu
-- bang nay (xem src/lib/debt-plan.ts), khong luu san lich trinh trong DB
-- — vi lich trinh phu thuoc vao "so tien tra them moi thang" nguoi dung
-- tu nhap moi lan xem, khong phai 1 gia tri co dinh.

create table public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  principal numeric(14,2) not null check (principal >= 0),
  interest_rate numeric(6,3) not null default 0 check (interest_rate >= 0 and interest_rate <= 100),
  min_payment numeric(14,2) not null default 0 check (min_payment >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index debts_user_idx on public.debts(user_id) where is_active;

alter table public.debts enable row level security;

create policy "debts: chi thao tac du lieu cua minh"
  on public.debts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
