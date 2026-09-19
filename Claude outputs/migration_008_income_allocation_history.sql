-- Migration 008: Cho phep ghi lich su thu nhap/phan bo luong theo thang
-- Chay trong SQL Editor cua Supabase SAU KHI da chay 002-007.
--
-- Bang public.incomes va public.jar_allocations da co san tu
-- schema_giai_doan_1.sql nhung /allocate CHUA TUNG ghi vao 2 bang nay —
-- moi lan "Ap dung" chi update thang jars.monthly_budget (1 con so hien
-- tai, ghi de moi thang). Migration nay chi bo sung 1 unique constraint
-- de code co the "upsert" (ghi hoac ghi de) dung 1 dong income/thang/user
-- thay vi cong don moi lan bam Ap dung nhieu lan trong cung thang.
--
-- Sau migration nay, /allocate se luu lai: (1) tong thu nhap da nhap cho
-- thang do (bang incomes), (2) % + so tien da chia cho tung hu (bang
-- jar_allocations). Muc dich: lam nen cho tinh nang "tien du cuoi thang"
-- (migration 007) tinh CHINH XAC TUYET DOI ngan sach da ap dung cho thang
-- truoc, thay vi xap xi bang jars.monthly_budget HIEN TAI nhu truoc day
-- (se sai neu doi ngan sach hu giua thang sau khi da chia luong). Cung la
-- nen cho tinh nang What-if simulator sau nay.

-- ------------------------------------------------------------
-- 1 nguoi chi co DUNG 1 ban ghi thu nhap / thang — bam "Ap dung" lai
-- trong cung thang se GHI DE (upsert), khong tao them dong moi.
-- ------------------------------------------------------------
create unique index if not exists incomes_user_period_unique_idx
  on public.incomes(user_id, period_month);
