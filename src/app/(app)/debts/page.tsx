import { redirect } from "next/navigation";
import { listDebts, type DebtWithPayments } from "@hu/data";
import { Banner } from "@/components/ui";
import { DebtsClient } from "@/components/debts-client";
import { vnToday } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export default async function DebtsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let debts: DebtWithPayments[] = [];
  let loadError: string | null = null;
  try {
    debts = await listDebts(supabase);
  } catch (error) {
    // Thuong gap nhat: chua chay supabase/migrations/013_debts.sql nen bang chua ton tai.
    loadError = error instanceof Error ? error.message : (error as { message?: string })?.message ?? "Không tải được dữ liệu.";
  }

  if (loadError) {
    return (
      <div className="page-stack">
        <header className="page-header"><div><p className="eyebrow">KHOẢN PHẢI TRẢ</p><h1>Trả nợ</h1></div></header>
        <Banner icon="triangle-alert" tone="accent">
          Không tải được các khoản nợ: {loadError}. Nếu bạn chưa chạy migration <code>supabase/migrations/013_debts.sql</code> trong SQL Editor của Supabase thì chạy nó trước.
        </Banner>
      </div>
    );
  }

  return <DebtsClient debts={debts} today={vnToday()} />;
}
