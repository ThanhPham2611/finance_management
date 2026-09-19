-- Migration 005: Fix loi RLS "new row violates row-level security policy
-- for table jar_contributions" khi luu dong gop hu gia dinh.
--
-- Nguyen nhan nghi ngo nhat: ham public.is_household_member(uuid) (tao o
-- migration 003) khong tra ve true nhu mong doi khi duoc goi tu ben trong
-- policy cua bang khac — day la lan dau tien ham nay thuc su duoc kiem tra
-- (o jars/transactions, ve on cua chinh minh luon dung truoc, nen chua bao
-- gio "bat buoc" phai dung is_household_member de qua duoc policy).
--
-- Cach xu ly: (1) tao lai ham + cap lai quyen execute (an toan de chay lai
-- nhieu lan), va (2) viet lai TOAN BO cac policy dang phu thuoc vao ham
-- nay (jars, transactions, jar_contributions) bang dieu kien EXISTS truc
-- tiep vao bang household_members — khong goi ham nua — de loai bo hoan
-- toan diem nghi ngo nay.
--
-- Chay migration nay SAU migration 003 va 004.

-- ------------------------------------------------------------
-- 1. Tao lai ham + quyen (idempotent, khong hai gi neu da dung)
-- ------------------------------------------------------------
create or replace function public.is_household_member(hid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.household_members hm
    where hm.household_id = hid and hm.user_id = auth.uid()
  );
$$;

grant execute on function public.is_household_member(uuid) to authenticated;
grant execute on function public.get_or_create_my_household() to authenticated;
grant execute on function public.create_household_invite() to authenticated;
grant execute on function public.join_household(text) to authenticated;

-- ------------------------------------------------------------
-- 2. jars: viet lai policy, khong goi ham nua
-- ------------------------------------------------------------
drop policy if exists "jars: chu so huu hoac thanh vien ho gia dinh" on public.jars;

create policy "jars: chu so huu hoac thanh vien ho gia dinh"
  on public.jars for all
  using (
    auth.uid() = user_id
    or (
      household_id is not null
      and exists (
        select 1 from public.household_members hm
        where hm.household_id = jars.household_id and hm.user_id = auth.uid()
      )
    )
  )
  with check (
    auth.uid() = user_id
    or (
      household_id is not null
      and exists (
        select 1 from public.household_members hm
        where hm.household_id = jars.household_id and hm.user_id = auth.uid()
      )
    )
  );

-- ------------------------------------------------------------
-- 3. transactions: viet lai 4 policy, khong goi ham nua
-- ------------------------------------------------------------
drop policy if exists "transactions: xem duoc neu cua minh hoac hu chung" on public.transactions;
drop policy if exists "transactions: chi tao giao dich cho chinh minh" on public.transactions;
drop policy if exists "transactions: sua duoc neu cua minh hoac hu chung" on public.transactions;
drop policy if exists "transactions: xoa duoc neu cua minh hoac hu chung" on public.transactions;

create policy "transactions: xem duoc neu cua minh hoac hu chung"
  on public.transactions for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.jars j
      join public.household_members hm on hm.household_id = j.household_id
      where j.id = transactions.jar_id
        and j.household_id is not null
        and hm.user_id = auth.uid()
    )
  );

create policy "transactions: chi tao giao dich cho chinh minh"
  on public.transactions for insert
  with check (auth.uid() = user_id);

create policy "transactions: sua duoc neu cua minh hoac hu chung"
  on public.transactions for update
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.jars j
      join public.household_members hm on hm.household_id = j.household_id
      where j.id = transactions.jar_id
        and j.household_id is not null
        and hm.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    or exists (
      select 1 from public.jars j
      join public.household_members hm on hm.household_id = j.household_id
      where j.id = transactions.jar_id
        and j.household_id is not null
        and hm.user_id = auth.uid()
    )
  );

create policy "transactions: xoa duoc neu cua minh hoac hu chung"
  on public.transactions for delete
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.jars j
      join public.household_members hm on hm.household_id = j.household_id
      where j.id = transactions.jar_id
        and j.household_id is not null
        and hm.user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- 4. jar_contributions: viet lai 3 policy, khong goi ham nua
-- ------------------------------------------------------------
drop policy if exists "jar_contributions: xem duoc neu la thanh vien ho gia dinh cua hu" on public.jar_contributions;
drop policy if exists "jar_contributions: tu tao dong gop cua chinh minh" on public.jar_contributions;
drop policy if exists "jar_contributions: tu sua dong gop cua chinh minh" on public.jar_contributions;

create policy "jar_contributions: xem duoc neu la thanh vien ho gia dinh cua hu"
  on public.jar_contributions for select
  using (
    exists (
      select 1 from public.jars j
      join public.household_members hm on hm.household_id = j.household_id
      where j.id = jar_contributions.jar_id
        and j.household_id is not null
        and hm.user_id = auth.uid()
    )
  );

create policy "jar_contributions: tu tao dong gop cua chinh minh"
  on public.jar_contributions for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.jars j
      join public.household_members hm on hm.household_id = j.household_id
      where j.id = jar_contributions.jar_id
        and j.household_id is not null
        and hm.user_id = auth.uid()
    )
  );

create policy "jar_contributions: tu sua dong gop cua chinh minh"
  on public.jar_contributions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
