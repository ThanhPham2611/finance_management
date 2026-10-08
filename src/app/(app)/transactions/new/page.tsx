import { Suspense } from "react";
import { suggestTransactions, type TransactionSuggestion } from "@hu/domain";
import { TransactionEntry } from "@/components/transaction-entry";
import { vnNow } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { listJarsWithSpent } from "@/lib/queries/jars";
import { listTransactionsSince, toYMD } from "@/lib/queries/transactions";

/** Gợi ý nhập nhanh lấy từ các giao dịch CỦA CHÍNH MÌNH trong 90 ngày qua; lỗi thì bỏ qua (tính năng phụ). */
const SUGGESTION_WINDOW_DAYS = 90;

export default async function NewTransactionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const since = vnNow();
  since.setDate(since.getDate() - SUGGESTION_WINDOW_DAYS);
  const [jars, recent] = user
    ? await Promise.all([listJarsWithSpent(supabase), listTransactionsSince(supabase, toYMD(since)).catch(() => [])])
    : [[], []];
  const suggestions: TransactionSuggestion[] = suggestTransactions(recent.filter((t) => t.userId === user?.id));

  return (
    <Suspense fallback={null}>
      <TransactionEntry jars={jars} suggestions={suggestions} />
    </Suspense>
  );
}
