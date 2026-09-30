import { ReportsClient } from "@/components/reports-client";
import { createClient } from "@/lib/supabase/server";
import { listJarsWithSpent } from "@/lib/queries/jars";
import { reportsFetchSince } from "@/lib/queries/reports";
import { listTransactionsSince } from "@/lib/queries/transactions";

export default async function ReportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <ReportsClient allTransactions={[]} jars={[]} myUserId="" />;
  }

  const [jars, transactions] = await Promise.all([
    listJarsWithSpent(supabase),
    listTransactionsSince(supabase, reportsFetchSince()),
  ]);
  // Khoan nap (vao hu tiet kiem) khong phai "da chi" — loai khoi so lieu
  // bao cao tieu dung.
  const spendTx = transactions.filter((t) => t.type !== "deposit");

  return <ReportsClient allTransactions={spendTx} jars={jars} myUserId={user.id} />;
}
