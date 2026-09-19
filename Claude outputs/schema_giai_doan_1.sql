-- ============================================================
-- App quan ly chi tieu - Schema Supabase cho Giai doan 1
-- Pham vi: tai khoan, hu ngan sach, thu nhap + phan bo,
--          giao dich, du lieu phuc vu dashboard/bao cao.
-- Chua bao gom: chatbot AI, hu quy chung gia dinh, gamification,
--          what-if simulator, ke hoach tra no, OCR (Giai doan 2/3).
-- ============================================================

-- ------------------------------------------------------------
-- 1. PROFILES
-- Mo rong auth.users (Supabase Auth) voi thong tin rieng cua app.
-- ------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  currency text not null default 'VND',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tu tao profile khi co user moi dang ky
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------
-- 2. JAR PRESETS (danh muc goi y, dung chung cho moi user)
-- Chi la du lieu tham khao hien thi khi tao hu moi.
-- ------------------------------------------------------------
create table public.jar_presets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text,
  default_color text,
  sort_order int not null default 0
);

insert into public.jar_presets (name, icon, default_color, sort_order) values
  ('An uong', 'utensils', '#F59E0B', 1),
  ('Mua sam', 'shopping-bag', '#EC4899', 2),
  ('Tiet kiem', 'piggy-bank', '#10B981', 3),
  ('Con cai', 'baby', '#3B82F6', 4),
  ('Hoa don', 'receipt', '#6366F1', 5),
  ('Giai tri', 'film', '#8B5CF6', 6),
  ('Du phong', 'shield', '#64748B', 7);

-- ------------------------------------------------------------
-- 3. JARS (hu ngan sach cua tung user)
-- ------------------------------------------------------------
create table public.jars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text,
  color text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index jars_user_id_idx on public.jars(user_id);

-- ------------------------------------------------------------
-- 4. INCOMES (moi lan nhap luong / thu nhap can phan bo)
-- period_month: ngay dau thang ma khoan thu nay thuoc ve,
-- dung de nhom du lieu theo thang cho dashboard/bao cao.
-- ------------------------------------------------------------
create table public.incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period_month date not null,
  amount numeric(14,2) not null check (amount >= 0),
  note text,
  created_at timestamptz not null default now()
);

create index incomes_user_period_idx on public.incomes(user_id, period_month);

-- ------------------------------------------------------------
-- 5. JAR_ALLOCATIONS (ket qua phan bo tung hu tu 1 khoan thu nhap)
-- Moi lan chay calculator phan bo luong se tao 1 dong / hu.
-- ------------------------------------------------------------
create table public.jar_allocations (
  id uuid primary key default gen_random_uuid(),
  income_id uuid not null references public.incomes(id) on delete cascade,
  jar_id uuid not null references public.jars(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  percent numeric(5,2) check (percent >= 0 and percent <= 100),
  amount numeric(14,2) not null check (amount >= 0),
  created_at timestamptz not null default now()
);

create index jar_allocations_income_idx on public.jar_allocations(income_id);
create index jar_allocations_jar_idx on public.jar_allocations(jar_id);

-- ------------------------------------------------------------
-- 6. TRANSACTIONS (chi tieu thuc te tru vao tung hu)
-- ------------------------------------------------------------
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  jar_id uuid not null references public.jars(id) on delete cascade,
  amount numeric(14,2) not null check (amount >= 0),
  note text,
  transaction_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index transactions_user_date_idx on public.transactions(user_id, transaction_date);
create index transactions_jar_idx on public.transactions(jar_id);

-- ------------------------------------------------------------
-- 7. VIEW: tinh trang tung hu theo thang (dung cho Dashboard)
-- allocated = tong da phan bo vao hu trong thang
-- spent     = tong da chi trong thang
-- remaining = allocated - spent
-- ------------------------------------------------------------
create view public.jar_status_by_month as
with alloc_by_month as (
  select
    ja.jar_id,
    ja.user_id,
    date_trunc('month', i.period_month)::date as period_month,
    sum(ja.amount) as allocated
  from public.jar_allocations ja
  join public.incomes i on i.id = ja.income_id
  group by ja.jar_id, ja.user_id, date_trunc('month', i.period_month)
),
spent_by_month as (
  select
    tx.jar_id,
    tx.user_id,
    date_trunc('month', tx.transaction_date)::date as period_month,
    sum(tx.amount) as spent
  from public.transactions tx
  group by tx.jar_id, tx.user_id, date_trunc('month', tx.transaction_date)
),
periods as (
  select jar_id, user_id, period_month from alloc_by_month
  union
  select jar_id, user_id, period_month from spent_by_month
)
select
  j.id as jar_id,
  j.user_id,
  j.name,
  j.icon,
  j.color,
  p.period_month,
  coalesce(a.allocated, 0) as allocated,
  coalesce(s.spent, 0) as spent,
  coalesce(a.allocated, 0) - coalesce(s.spent, 0) as remaining
from periods p
join public.jars j on j.id = p.jar_id
left join alloc_by_month a on a.jar_id = p.jar_id and a.period_month = p.period_month
left join spent_by_month s on s.jar_id = p.jar_id and s.period_month = p.period_month;

-- ------------------------------------------------------------
-- 8. ROW LEVEL SECURITY
-- Moi user chi doc/ghi duoc du lieu cua chinh minh.
-- ------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.jars enable row level security;
alter table public.incomes enable row level security;
alter table public.jar_allocations enable row level security;
alter table public.transactions enable row level security;

create policy "profiles: chi xem/sua chinh minh"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "jars: chi thao tac du lieu cua minh"
  on public.jars for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "incomes: chi thao tac du lieu cua minh"
  on public.incomes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "jar_allocations: chi thao tac du lieu cua minh"
  on public.jar_allocations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "transactions: chi thao tac du lieu cua minh"
  on public.transactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- jar_presets: du lieu chung, ai cung doc duoc, khong ai sua duoc tu client
alter table public.jar_presets enable row level security;
create policy "jar_presets: ai cung doc duoc"
  on public.jar_presets for select
  using (true);
