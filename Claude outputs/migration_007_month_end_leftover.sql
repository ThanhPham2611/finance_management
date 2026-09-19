-- Migration 007: Xu ly tien du cuoi thang cho hu ca nhan (rollover + Quy du)
-- Chay trong SQL Editor cua Supabase SAU KHI da chay 002-006.
--
-- Bo sung ha tang con thieu de lam tinh nang "xu ly tien du cuoi thang"
-- (da chot huong trong claude/expense-app-features.md nhung chua trien
-- khai vi jars.monthly_budget chi luu 1 con so hien tai, khong co lich
-- su theo tung thang). Pham vi migration nay: CHI ap dung cho HU CA NHAN
-- (is_shared = false) — hu gia dinh (nhieu nguoi cung gop) chua nam trong
-- pham vi nay, se can thiet ke rieng.
--
-- Gioi han da biet: "budget" cua thang truoc duoc xap xi bang
-- jars.monthly_budget TAI THOI DIEM xu ly (khong co snapshot lich su that
-- su) — chi dung neu user khong doi ngan sach hu do giua chung voi luc xu
-- ly. Neu can chinh xac tuyet doi, nen lam truoc phan luu lich su phan bo
-- theo thang (dung bang incomes/jar_allocations da co san trong schema)
-- roi doi migration nay sang doc tu do. Giao dich duoc them/sua NGUOC
-- LAI vao thang da xu ly (backdated) se KHONG lam tinh lai leftover da
-- chot — day la gioi han chap nhan duoc o pham vi nay.

-- ------------------------------------------------------------
-- 1. Hu "Quy du" mac dinh: danh dau bang 1 cot rieng thay vi doi theo
-- ten, de user doi ten hu thoai mai ma khong lam gay logic tim hu nay.
-- ------------------------------------------------------------
alter table public.jars
  add column if not exists is_default_savings boolean not null default false;

create unique index if not exists jars_one_default_savings_per_user_idx
  on public.jars(user_id) where is_default_savings;

-- ------------------------------------------------------------
-- 2. Lich su xu ly tien du cuoi thang — 1 dong / hu / thang da xu ly.
-- Chi tao dong khi leftover > 0 (co tien du that su can quyet dinh/ghi
-- nhan). unique(jar_id, period_month) dong vai tro "khoa" chong xu ly
-- trung (vd bam nut 2 lan, hoac Dashboard render 2 request gan nhau).
-- ------------------------------------------------------------
create table public.jar_leftover_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  jar_id uuid not null references public.jars(id) on delete cascade,
  period_month date not null,
  budget numeric(14,2) not null,
  spent numeric(14,2) not null,
  leftover numeric(14,2) not null check (leftover > 0),
  status text not null check (status in ('confirmed', 'declined', 'rolled_over')),
  created_at timestamptz not null default now(),
  unique (jar_id, period_month)
);

create index jar_leftover_events_user_period_idx on public.jar_leftover_events(user_id, period_month);

alter table public.jar_leftover_events enable row level security;

create policy "jar_leftover_events: chi thao tac du lieu cua minh"
  on public.jar_leftover_events for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
