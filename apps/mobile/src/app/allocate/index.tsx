import { useState } from "react";
import { Stack } from "expo-router";
import { vietnamNow } from "@hu/domain";
import { ErrorState } from "@/components/finance-ui";
import { LoadingScreen, Screen } from "@/components/screen";
import { AllocateForm } from "@/features/allocate/allocate-form";
import { useApplyAllocation, useFamilyContribution, useJars } from "@/features/finance/hooks";

/** Chia lương theo tỷ lệ cho các hũ cá nhân (không có đề xuất AI ở bản mobile). */
export default function AllocateScreen() {
  const jars = useJars();
  const family = useFamilyContribution();
  const apply = useApplyAllocation();
  const [applied, setApplied] = useState(false);
  if (jars.isLoading || family.isLoading) return <LoadingScreen />;
  const failure = jars.error ?? family.error;
  if (failure) return <Screen><ErrorState message={failure.message} retry={() => void Promise.all([jars.refetch(), family.refetch()])} /></Screen>;

  const all = jars.data ?? [];
  return (
    <>
      <Stack.Screen options={{ title: "Chia lương" }} />
      <AllocateForm
        jars={all.filter((jar) => !jar.isShared)}
        familyContribution={family.data ?? 0}
        familyJarCount={all.filter((jar) => jar.isShared).length}
        now={vietnamNow()}
        busy={apply.isPending}
        error={apply.error?.message}
        applied={applied}
        onEdit={() => setApplied(false)}
        onApply={(input) => apply.mutate(input, { onSuccess: () => setApplied(true) })}
      />
    </>
  );
}
