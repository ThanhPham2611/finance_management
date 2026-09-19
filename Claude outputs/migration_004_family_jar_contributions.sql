-- Migration 004: Dong gop rieng cho hu gia dinh (chay SAU migration 003)
--
-- Van de giai quyet: truoc day 1 hu quy chung chi co 1 con so ngan sach
-- do 1 nguoi dat, de gay cam giac trung lap/lech so voi hu ca nhan cung
-- ten cua nguoi con lai. Tu migration nay: ngan sach cua 1 hu gia dinh
-- (jars.household_id khong null) la TONG dong gop rieng cua tung thanh
-- vien trong thang, moi nguoi tu nhap phan cua minh (khong can nguoi kia
-- duyet). `jars.monthly_budget` van la cot duy nhat app doc de hien thi —
-- server action se tu dong tinh lai va ghi vao cot nay moi khi co ai do
-- doi dong gop, nen phan con lai cua ung dung (dashboard, allocate,
-- reports...) khong can sua gi them.

create table public.jar_contributions (
  jar_id uuid not null references public.jars(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  period_month date not null,
  amount numeric(14,2) not null default 0 check (amount >= 0),
  updated_at timestamptz not null default now(),
  primary key (jar_id, user_id, period_month)
);

create index jar_contributions_jar_period_idx on public.jar_contributions(jar_id, period_month);

alter table public.jar_contributions enable row level security;

create policy "jar_contributions: xem duoc neu la thanh vien ho gia dinh cua hu"
  on public.jar_contributions for select
  using (
    exists (
      select 1 from public.jars j
      where j.id = jar_contributions.jar_id
        and j.household_id is not null
        and public.is_household_member(j.household_id)
    )
  );

create policy "jar_contributions: tu tao dong gop cua chinh minh"
  on public.jar_contributions for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.jars j
      where j.id = jar_contributions.jar_id
        and j.household_id is not null
        and public.is_household_member(j.household_id)
    )
  );

create policy "jar_contributions: tu sua dong gop cua chinh minh"
  on public.jar_contributions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
