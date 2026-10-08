-- Migration 013: Tra no (tra gop, vay nguoi quen...).
--
-- Module doc lap, KHONG lien quan jars/transactions: tien tra no khong tru vao
-- hu nao. `principal` la TONG so tien phai tra (da gom lai neu co); moi thang
-- can tra bao nhieu duoc tinh o code tu principal, term_months va cac lan da tra.
--
-- Idempotent: neu truoc day da chay "Claude outputs/migration_009_debts.sql"
-- (bang debts cu co interest_rate/min_payment) thi chi them cot con thieu va
-- giu nguyen du lieu cu; chua chay thi tao moi.
create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  principal numeric(14,2) not null check (principal >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.debts
  add column if not exists term_months integer not null default 12 check (term_months between 1 and 600),
  add column if not exists start_date date not null default current_date;

create index if not exists debts_user_idx on public.debts(user_id) where is_active;

create table if not exists public.debt_payments (
  id uuid primary key default gen_random_uuid(),
  debt_id uuid not null references public.debts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  paid_on date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists debt_payments_debt_idx on public.debt_payments(debt_id);

alter table public.debts enable row level security;
alter table public.debt_payments enable row level security;

drop policy if exists "debts: chi thao tac du lieu cua minh" on public.debts;
create policy "debts: chi thao tac du lieu cua minh"
  on public.debts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Lan tra phai thuoc 1 khoan no cua chinh minh (chan ghi vao no cua nguoi khac
-- du biet debt_id).
drop policy if exists "debt_payments: chi thao tac du lieu cua minh" on public.debt_payments;
create policy "debt_payments: chi thao tac du lieu cua minh"
  on public.debt_payments for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.debts d where d.id = debt_id and d.user_id = auth.uid())
  );
