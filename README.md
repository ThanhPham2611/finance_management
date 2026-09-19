# Finance Management

App quan ly chi tieu / tiet kiem ca nhan va gia dinh. Xem tai lieu tinh nang, ke hoach build va thiet ke day du trong Claude Project "website":
- expense-app-features.md
- expense-app-build-plan.md
- expense-app-design-brief.md
- expense-app-schema.md

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase (Postgres + Auth) qua @supabase/ssr

## Setup

1. Tao project tren supabase.com (neu chua co).
2. Vao SQL Editor, chay file `supabase/schema.sql` de tao bang + RLS.
3. Copy `.env.local.example` thanh `.env.local`, dien `NEXT_PUBLIC_SUPABASE_URL` va `NEXT_PUBLIC_SUPABASE_ANON_KEY` tu Project Settings > API.
4. `npm install`
5. `npm run dev` roi mo http://localhost:3000

## Cau truc thu muc lien quan Supabase

- `src/lib/supabase/client.ts` — dung trong Client Components
- `src/lib/supabase/server.ts` — dung trong Server Components / Route Handlers
- `src/lib/supabase/middleware.ts` + `middleware.ts` — tu refresh session moi request

## Giai doan 1 (dang lam)

Dang nhap, Dashboard, Hu ngan sach, Calculator phan bo luong, Nhap giao dich, Bao cao. Xem chi tiet trong `expense-app-build-plan.md`.
# finance_management
