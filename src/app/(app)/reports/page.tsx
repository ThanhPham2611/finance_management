import { ReportsClient } from "@/components/reports-client";
import { createClient } from "@/lib/supabase/server";
import { listJarsWithSpent } from "@/lib/queries/jars";
import { buildJarSpendRows, buildRanges, reportsFetchSince } from "@/lib/queries/reports";
import { listTransactionsSince } from "@/lib/queries/transactions";

export default async function ReportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <ReportsClient ranges={[]} jarRows={[]} recentTransactions={[]} allTransactions={[]} jars={[]} />;
  }

  const [jars, transactions] = await Promise.all([
    listJarsWithSpent(supabase),
    listTransactionsSince(supabase, reportsFetchSince()),
  ]);

  const ranges = buildRanges(transactions);
  const jarRows = buildJarSpendRows(jars, transactions);
  const recentTransactions = transactions.slice(0, 5);

  return <ReportsClient ranges={ranges} jarRows={jarRows} recentTransactions={recentTransactions} allTransactions={transactions} jars={jars} />;
}
