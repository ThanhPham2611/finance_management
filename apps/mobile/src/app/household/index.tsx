import { Stack } from "expo-router";
import { ErrorState } from "@/components/finance-ui";
import { LoadingScreen, Screen } from "@/components/screen";
import { useHouseholdOverview } from "@/features/finance/hooks";
import { HouseholdView } from "@/features/household/household-view";
import { useAuth } from "@/providers/auth-provider";

export default function HouseholdScreen() {
  const overview = useHouseholdOverview();
  const myUserId = useAuth().session?.user.id;
  if (overview.isLoading || !myUserId) return <LoadingScreen />;
  if (overview.error || !overview.data) return <Screen><ErrorState message={overview.error?.message ?? "Có lỗi xảy ra."} retry={() => void overview.refetch()} /></Screen>;
  return (
    <>
      <Stack.Screen options={{ title: "Gia đình" }} />
      <HouseholdView overview={overview.data} myUserId={myUserId} />
    </>
  );
}
