import { SimulatorClient } from "@/components/simulator-client";
import { createClient } from "@/lib/supabase/server";
import { listJarsWithSpent } from "@/lib/queries/jars";
import { listDebts } from "@/lib/queries/debts";

export default async function SimulatorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <SimulatorClient jars={[]} hasDebts={false} />;
  }

  const allJars = await listJarsWithSpent(supabase);
  const personalJars = allJars.filter((j) => !j.isShared);
  // Nuot loi neu bang debts chua ton tai (chua chay migration_009) — chi
  // dung de quyet dinh co hien goi y lien qua trang /debts hay khong.
  const debts = await listDebts(supabase).catch(() => []);

  return <SimulatorClient jars={personalJars} hasDebts={debts.length > 0} />;
}
