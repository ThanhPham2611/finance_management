-- Migration 012: Hu tiet kiem (savings jar) + khoan nap tien.
--
-- 1) is_savings: co pho thong, cho phep NHIEU hu tiet kiem doc lap moi
-- user (vd "Mua nha", "Du lich", "Quy du phong"). KHAC voi is_default_savings
-- — cot do chi danh dau DUY NHAT 1 hu "Quy du" he thong (unique partial
-- index), dung boi getOrCreateSavingsJar() de tim/tao no. Khong dung lai
-- is_default_savings vi se pha logic singleton hien co.
alter table public.jars
  add column if not exists is_savings boolean not null default false;

-- Hu tiet kiem PHAI luon bat rollover — do la co che duy nhat khien tien
-- cong don qua cac thang thay vi bi "spent" tinh lai tu dau moi thang.
alter table public.jars
  add constraint jars_savings_requires_rollover check (not is_savings or rollover);

-- Backfill: hu "Quy du" mac dinh (is_default_savings) ve ban chat da la 1
-- hu tiet kiem — cho no huong luon UX/nhan dien moi nay. Ep rollover=true
-- cung luc de thoa CHECK constraint o tren.
update public.jars
  set is_savings = true, rollover = true
  where is_default_savings = true;

-- 2) type tren transactions: phan biet khoan CHI (rut/tieu, mac dinh, giu
-- nguyen hanh vi cu) voi khoan NAP (gop them vao hu tiet kiem ngoai chu ky
-- /allocate hang thang). Khong rang buoc "deposit chi cho hu is_savings"
-- bang CHECK o day (Postgres CHECK khong query duoc bang khac) — chan o
-- tang server action (createTransaction).
alter table public.transactions
  add column if not exists type text not null default 'expense' check (type in ('expense', 'deposit'));
