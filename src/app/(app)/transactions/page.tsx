import { TransactionsClient } from "@/components/transactions-client";
import { createClient } from "@/lib/supabase/server";
import { listJarsWithSpent } from "@/lib/queries/jars";
import { listTransactionsSince, monthWindow } from "@/lib/queries/transactions";
import { getMyHousehold } from "@/lib/queries/household";

export default async function TransactionsPage({ searchParams }: PageProps<"/transactions">) {
  const { month } = await searchParams;
  const window = monthWindow(typeof month === "string" ? month : undefined);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [transactions, jars, household] = user
    ? await Promise.all([listTransactionsSince(supabase, window.from, window.to), listJarsWithSpent(supabase), getMyHousehold(supabase, user.id)])
    : [[], [], null];

  return <TransactionsClient transactions={transactions} jars={jars} members={household?.members ?? []} month={window} userId={user?.id ?? ""} />;
}
