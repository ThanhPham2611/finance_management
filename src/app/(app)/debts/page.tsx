import { DebtsClient } from "@/components/debts-client";
import { createClient } from "@/lib/supabase/server";
import { listDebts } from "@/lib/queries/debts";

export default async function DebtsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <DebtsClient debts={[]} />;

  // Nuot loi neu bang debts chua ton tai (chua chay migration_009) — trang
  // van hien duoc (rong), khong lam sap app.
  const debts = await listDebts(supabase).catch(() => []);

  return <DebtsClient debts={debts} />;
}
