import { AllocateClient } from "@/components/allocate-client";
import { createClient } from "@/lib/supabase/server";
import { currentMonthStart, listJarsWithSpent } from "@/lib/queries/jars";
import { getMyFamilyContributionTotal } from "@/lib/queries/household";

export default async function AllocatePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <AllocateClient jars={[]} familyContribution={0} familyJarCount={0} />;
  }

  const [allJars, familyContribution] = await Promise.all([
    listJarsWithSpent(supabase),
    getMyFamilyContributionTotal(supabase, user.id, currentMonthStart()),
  ]);
  const personalJars = allJars.filter((j) => !j.isShared);
  const familyJarCount = allJars.filter((j) => j.isShared).length;

  return <AllocateClient jars={personalJars} familyContribution={familyContribution} familyJarCount={familyJarCount} />;
}
