-- Migration 010: Danh dau da xem huong dan (product tour) tren Dashboard
-- Chay trong SQL Editor cua Supabase SAU KHI da chay 002-009.

alter table public.profiles
  add column has_seen_tour boolean not null default false;

-- User da co it nhat 1 hu duoc coi la user cu, khong can xem tour nua —
-- chi user THUC SU moi (chua tung tao hu) moi thay tour tu dong hien ra.
update public.profiles p
set has_seen_tour = true
where exists (select 1 from public.jars j where j.user_id = p.id);
