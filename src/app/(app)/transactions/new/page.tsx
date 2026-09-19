import { Suspense } from "react";
import { TransactionEntry } from "@/components/transaction-entry";
import { createClient } from "@/lib/supabase/server";
import { listJarsWithSpent } from "@/lib/queries/jars";

export default async function NewTransactionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const jars = user ? await listJarsWithSpent(supabase) : [];

  return (
    <Suspense fallback={null}>
      <TransactionEntry jars={jars} />
    </Suspense>
  );
}
