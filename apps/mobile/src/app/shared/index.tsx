import { Stack } from "expo-router";
import { ErrorState } from "@/components/finance-ui";
import { LoadingScreen, Screen } from "@/components/screen";
import { useSharesOverview } from "@/features/finance/hooks";
import { SharedView } from "@/features/shared/shared-view";

export default function SharedScreen() {
  const overview = useSharesOverview();
  if (overview.isLoading) return <LoadingScreen />;
  if (overview.error || !overview.data) return <Screen><ErrorState message={overview.error?.message ?? "Có lỗi xảy ra."} retry={() => void overview.refetch()} /></Screen>;
  return (
    <>
      <Stack.Screen options={{ title: "Chia sẻ chi tiêu" }} />
      <SharedView overview={overview.data} />
    </>
  );
}
