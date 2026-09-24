import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyHousehold, getJarContributions, getMemberLastSpendTimes, memberLabel } from "@/lib/queries/household";
import { currentMonthStart, listJarsWithSpent } from "@/lib/queries/jars";
import { formatDateTimeVN } from "@/lib/format";
import { HouseholdClient, type FamilyJarView } from "@/components/household-client";

export default async function HouseholdPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const household = await getMyHousehold(supabase, user.id);

  let familyJars: FamilyJarView[] = [];
  let memberLastSpend: Record<string, string> = {};
  if (household) {
    const [lastSpendTimes, allJars] = await Promise.all([getMemberLastSpendTimes(supabase, household.id), listJarsWithSpent(supabase)]);
    memberLastSpend = Object.fromEntries([...lastSpendTimes].map(([userId, iso]) => [userId, formatDateTimeVN(iso)]));

    const periodMonth = currentMonthStart();
    const shared = allJars.filter((j) => j.isShared);
    familyJars = await Promise.all(
      shared.map(async (jar) => {
        const contributions = await getJarContributions(supabase, jar.id, periodMonth);
        return {
          jar,
          contributions: household.members.map((m) => ({
            userId: m.userId,
            name: memberLabel(m),
            amount: contributions.find((c) => c.userId === m.userId)?.amount ?? 0,
          })),
        };
      })
    );
  }

  return <HouseholdClient household={household} familyJars={familyJars} myUserId={user.id} memberLastSpend={memberLastSpend} />;
}
