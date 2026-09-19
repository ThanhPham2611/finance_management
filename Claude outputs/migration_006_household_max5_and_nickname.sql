-- Migration 006: Gia dinh toi da 5 nguoi + biet danh cho thanh vien
-- Chay trong SQL Editor cua Supabase SAU KHI da chay migration 003, 004, 005.
--
-- 1) Nang gioi han thanh vien/gia dinh tu 2 len 5 (create_household_invite,
--    join_household).
-- 2) Them cot household_members.nickname + RPC set_member_nickname() de
--    BAT KY thanh vien nao cung dat duoc biet danh cho BAT KY thanh vien
--    khac trong cung gia dinh (vd "vo", "chong", "bo") — de biet ai la ai
--    thay vi chi hien "Nguoi than" chung chung. Hien thi dang "Ten (biet danh)".

-- ------------------------------------------------------------
-- 1. Cot moi
-- ------------------------------------------------------------
alter table public.household_members
  add column if not exists nickname text;

-- ------------------------------------------------------------
-- 2. RPC: dat/doi biet danh cho 1 thanh vien BAT KY trong cung gia dinh
-- voi caller (ke ca dat cho chinh minh) — chi can ca hai cung 1 household.
-- ------------------------------------------------------------
create or replace function public.set_member_nickname(p_user_id uuid, p_nickname text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  my_hid uuid;
  target_hid uuid;
begin
  select household_id into my_hid from public.household_members where user_id = auth.uid() limit 1;
  if my_hid is null then
    raise exception 'Ban chua thuoc gia dinh nao.';
  end if;

  select household_id into target_hid from public.household_members where user_id = p_user_id limit 1;
  if target_hid is null or target_hid <> my_hid then
    raise exception 'Nguoi nay khong thuoc gia dinh cua ban.';
  end if;

  update public.household_members
  set nickname = nullif(trim(p_nickname), '')
  where user_id = p_user_id and household_id = my_hid;
end;
$$;

grant execute on function public.set_member_nickname(uuid, text) to authenticated;

-- ------------------------------------------------------------
-- 3. Nang gioi han thanh vien: 2 -> 5
-- ------------------------------------------------------------
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
  if member_count >= 5 then
    raise exception 'Gia dinh da du 5 thanh vien, khong the tao them ma moi.';
  end if;

  new_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));

  insert into public.household_invites (household_id, code, created_by)
  values (hid, new_code, auth.uid());

  return query select new_code, now() + interval '7 days';
end;
$$;

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
  if member_count >= 5 then
    raise exception 'Gia dinh nay da du 5 thanh vien.';
  end if;

  insert into public.household_members (household_id, user_id) values (inv.household_id, auth.uid());
  update public.household_invites set used_at = now(), used_by = auth.uid() where id = inv.id;

  return inv.household_id;
end;
$$;

grant execute on function public.create_household_invite() to authenticated;
grant execute on function public.join_household(text) to authenticated;
