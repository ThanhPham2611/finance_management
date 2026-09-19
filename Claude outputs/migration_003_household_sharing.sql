-- Migration 003: Hu quy chung gia dinh (2 nguoi dung chung)
-- Chay trong SQL Editor cua Supabase SAU KHI da chay schema_giai_doan_1.sql
-- va migration_jars_columns.sql (002).
--
-- Y tuong: 1 user thuoc toi da 1 "household" (gia dinh, gioi han 2 nguoi
-- cho ban dau). Hu nao danh dau is_shared=true se gan them household_id;
-- ca 2 thanh vien trong household deu xem/sua/xoa duoc hu do va cac giao
-- dich trong hu do, du ai la nguoi tao ra hu/giao dich.
--
-- Moi thao tac tao/tham gia household deu di qua RPC (security definer)
-- thay vi insert truc tiep, nen khong can policy insert rieng cho 3 bang
-- households/household_members/household_invites.

-- ------------------------------------------------------------
-- 1. BANG
-- ------------------------------------------------------------
create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create index household_members_user_idx on public.household_members(user_id);

create table public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  code text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at timestamptz,
  used_by uuid references auth.users(id)
);

alter table public.jars
  add column if not exists household_id uuid references public.households(id) on delete set null;

-- ------------------------------------------------------------
-- 2. HAM HO TRO (security definer de tranh de quy RLS)
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

-- Lay household hien tai cua caller, tu tao neu chua co. Idempotent.
create or replace function public.get_or_create_my_household()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
begin
  select household_id into hid from public.household_members where user_id = auth.uid() limit 1;
  if hid is not null then
    return hid;
  end if;

  insert into public.households (created_by) values (auth.uid()) returning id into hid;
  insert into public.household_members (household_id, user_id) values (hid, auth.uid());
  return hid;
end;
$$;

-- Tao ma moi 8 ky tu, gan voi household cua caller (tu tao household neu chua co).
create or replace function public.create_household_invite()
returns table (code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
  member_count int;
  new_code text;
begin
  hid := public.get_or_create_my_household();

  select count(*) into member_count from public.household_members where household_id = hid;
  if member_count >= 2 then
    raise exception 'Gia dinh da du 2 thanh vien, khong the tao them ma moi.';
  end if;

  new_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));

  insert into public.household_invites (household_id, code, created_by)
  values (hid, new_code, auth.uid());

  return query select new_code, now() + interval '7 days';
end;
$$;

-- Tham gia household bang ma moi.
create or replace function public.join_household(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inv record;
  member_count int;
  already_in_it boolean;
begin
  select * into inv from public.household_invites
    where code = upper(trim(p_code)) and used_at is null and expires_at > now()
    limit 1;

  if inv is null then
    raise exception 'Ma moi khong hop le hoac da het han.';
  end if;

  if inv.created_by = auth.uid() then
    raise exception 'Ban khong the tu dung ma moi cua chinh minh.';
  end if;

  select exists (
    select 1 from public.household_members where household_id = inv.household_id and user_id = auth.uid()
  ) into already_in_it;

  if already_in_it then
    return inv.household_id;
  end if;

  -- Neu caller dang thuoc mot household khac (vi du household rong tu
  -- get_or_create_my_household truoc do ma chua moi ai), roi khoi household do truoc.
  delete from public.household_members where user_id = auth.uid();

  select count(*) into member_count from public.household_members where household_id = inv.household_id;
  if member_count >= 2 then
    raise exception 'Gia dinh nay da du 2 thanh vien.';
  end if;

  insert into public.household_members (household_id, user_id) values (inv.household_id, auth.uid());
  update public.household_invites set used_at = now(), used_by = auth.uid() where id = inv.id;

  return inv.household_id;
end;
$$;

-- Cho phep user dang nhap (role authenticated) goi cac ham tren qua RPC.
grant execute on function public.is_household_member(uuid) to authenticated;
grant execute on function public.get_or_create_my_household() to authenticated;
grant execute on function public.create_household_invite() to authenticated;
grant execute on function public.join_household(text) to authenticated;

-- ------------------------------------------------------------
-- 3. RLS cho bang moi
-- ------------------------------------------------------------
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;

create policy "households: thanh vien duoc xem"
  on public.households for select
  using (public.is_household_member(id));

create policy "household_members: xem thanh vien cung nha"
  on public.household_members for select
  using (user_id = auth.uid() or public.is_household_member(household_id));

create policy "household_invites: nguoi tao duoc xem ma cua minh"
  on public.household_invites for select
  using (created_by = auth.uid());

-- Khong co policy insert/update/delete cho 3 bang tren: moi thay doi
-- deu phai di qua cac ham security definer o tren.

-- ------------------------------------------------------------
-- 4. Cap nhat RLS cho jars/transactions de ho tro hu quy chung
-- ------------------------------------------------------------
drop policy if exists "jars: chi thao tac du lieu cua minh" on public.jars;

create policy "jars: chu so huu hoac thanh vien ho gia dinh"
  on public.jars for all
  using (auth.uid() = user_id or (household_id is not null and public.is_household_member(household_id)))
  with check (auth.uid() = user_id or (household_id is not null and public.is_household_member(household_id)));

drop policy if exists "transactions: chi thao tac du lieu cua minh" on public.transactions;

create policy "transactions: xem duoc neu cua minh hoac hu chung"
  on public.transactions for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.jars j
      where j.id = transactions.jar_id
        and j.household_id is not null
        and public.is_household_member(j.household_id)
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
      where j.id = transactions.jar_id
        and j.household_id is not null
        and public.is_household_member(j.household_id)
    )
  )
  with check (
    auth.uid() = user_id
    or exists (
      select 1 from public.jars j
      where j.id = transactions.jar_id
        and j.household_id is not null
        and public.is_household_member(j.household_id)
    )
  );

create policy "transactions: xoa duoc neu cua minh hoac hu chung"
  on public.transactions for delete
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.jars j
      where j.id = transactions.jar_id
        and j.household_id is not null
        and public.is_household_member(j.household_id)
    )
  );
