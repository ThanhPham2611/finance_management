-- Migration 011: Chia se chi tieu ca nhan cho 1 nguoi khac xem (read-only).
-- Nguoi moi go email nguoi nhan (phai da co tai khoan) -> tao 1 dong pending.
-- Nguoi nhan accept/decline. Khi accepted, nguoi nhan xem duoc (chi xem,
-- khong sua/xoa duoc) toan bo hu + giao dich CA NHAN cua nguoi moi.
--
-- Theo dung bai hoc cua migration 005: moi RLS policy phu thuoc bang
-- expense_shares deu inline EXISTS truc tiep, KHONG goi qua 1 ham
-- security definer dung chung nhieu bang.

-- ------------------------------------------------------------
-- 1. BANG
-- ------------------------------------------------------------
create table public.expense_shares (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  viewer_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'revoked')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (owner_id <> viewer_id),
  unique (owner_id, viewer_id)
);

create index expense_shares_owner_idx on public.expense_shares(owner_id);
create index expense_shares_viewer_idx on public.expense_shares(viewer_id);

alter table public.expense_shares enable row level security;

-- Chi 1 policy SELECT — khong co policy insert/update/delete nao het:
-- moi thay doi deu phai di qua cac ham security definer ben duoi (giong
-- cach lam voi households/household_members/household_invites).
create policy "expense_shares: lien quan duoc xem"
  on public.expense_shares for select
  using (auth.uid() = owner_id or auth.uid() = viewer_id);

-- ------------------------------------------------------------
-- 2. HAM: tao loi moi chia se (owner goi, nhap email nguoi nhan)
-- ------------------------------------------------------------
create or replace function public.create_share_request(p_viewer_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_viewer_id uuid;
  v_existing_status text;
begin
  select id into v_viewer_id
  from auth.users
  where lower(email) = lower(trim(p_viewer_email))
  limit 1;

  if v_viewer_id is null then
    raise exception 'Khong tim thay nguoi dung voi email nay.';
  end if;

  if v_viewer_id = auth.uid() then
    raise exception 'Ban khong the tu chia se cho chinh minh.';
  end if;

  select status into v_existing_status
  from public.expense_shares
  where owner_id = auth.uid() and viewer_id = v_viewer_id;

  if v_existing_status in ('pending', 'accepted') then
    raise exception 'Da co loi moi dang cho hoac da duoc chap nhan voi nguoi nay.';
  elsif v_existing_status in ('declined', 'revoked') then
    -- Moi lai: dung lai dong cu (tranh vi pham unique(owner_id, viewer_id)).
    update public.expense_shares
      set status = 'pending', created_at = now(), responded_at = null
      where owner_id = auth.uid() and viewer_id = v_viewer_id;
  else
    insert into public.expense_shares (owner_id, viewer_id)
    values (auth.uid(), v_viewer_id);
  end if;
end;
$$;

grant execute on function public.create_share_request(text) to authenticated;

-- ------------------------------------------------------------
-- 3. HAM: nguoi nhan (viewer) chap nhan/tu choi loi moi dang pending
-- ------------------------------------------------------------
create or replace function public.respond_to_share_request(p_share_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.expense_shares;
begin
  select * into v_row from public.expense_shares where id = p_share_id;

  if not found then
    raise exception 'Khong tim thay loi moi nay.';
  end if;

  if v_row.viewer_id <> auth.uid() then
    raise exception 'Ban khong co quyen phan hoi loi moi nay.';
  end if;

  if v_row.status <> 'pending' then
    raise exception 'Loi moi nay khong con cho phan hoi.';
  end if;

  update public.expense_shares
    set status = case when p_accept then 'accepted' else 'declined' end,
        responded_at = now()
    where id = p_share_id;
end;
$$;

grant execute on function public.respond_to_share_request(uuid, boolean) to authenticated;

-- ------------------------------------------------------------
-- 4. HAM: chu so huu (owner) huy 1 chia se dang pending/accepted
-- ------------------------------------------------------------
create or replace function public.revoke_share(p_share_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.expense_shares;
begin
  select * into v_row from public.expense_shares where id = p_share_id;

  if not found then
    raise exception 'Khong tim thay chia se nay.';
  end if;

  if v_row.owner_id <> auth.uid() then
    raise exception 'Ban khong co quyen huy chia se nay.';
  end if;

  if v_row.status not in ('pending', 'accepted') then
    raise exception 'Chia se nay khong the huy o trang thai hien tai.';
  end if;

  update public.expense_shares set status = 'revoked', responded_at = now() where id = p_share_id;
end;
$$;

grant execute on function public.revoke_share(uuid) to authenticated;

-- ------------------------------------------------------------
-- 5. RLS bo sung: cho phep viewer duoc chap nhan XEM (chi select) du lieu
-- cua owner. Day la policy THEM VAO — khong dong/sua policy nao co san,
-- nen quyen insert/update/delete cua chinh chu van nguyen ven.
-- ------------------------------------------------------------

-- profiles: hien ten cho ca 2 chieu cua BAT KY dong expense_shares nao (ke
-- ca pending/declined/revoked) — de nguoi nhan thay TEN nguoi moi ngay o
-- man hinh "Loi moi dang cho ban" (truoc khi accept), va vi full_name la
-- thong tin it nhay cam: 1 khi da co dong lien ket (du trang thai gi) thi
-- 2 ben da biet nhau qua email, khong lo lot them thong tin moi.
create policy "profiles: nguoi co lien ket chia se duoc xem ten"
  on public.profiles for select
  using (
    exists (
      select 1 from public.expense_shares es
      where (es.owner_id = auth.uid() and es.viewer_id = profiles.id)
         or (es.viewer_id = auth.uid() and es.owner_id = profiles.id)
    )
  );

-- jars: viewer duoc xem (khong sua/xoa) hu CA NHAN cua owner khi accepted.
create policy "jars: nguoi duoc chia se (accepted) duoc xem hu cua chu"
  on public.jars for select
  using (
    exists (
      select 1 from public.expense_shares es
      where es.owner_id = jars.user_id
        and es.viewer_id = auth.uid()
        and es.status = 'accepted'
    )
  );

-- transactions: viewer duoc xem (khong sua/xoa) giao dich cua owner khi accepted.
create policy "transactions: nguoi duoc chia se (accepted) duoc xem giao dich cua chu"
  on public.transactions for select
  using (
    exists (
      select 1 from public.expense_shares es
      where es.owner_id = transactions.user_id
        and es.viewer_id = auth.uid()
        and es.status = 'accepted'
    )
  );
