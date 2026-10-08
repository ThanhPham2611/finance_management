import { Stack } from "expo-router";
import { vietnamToday } from "@hu/domain";
import { ErrorState } from "@/components/finance-ui";
import { LoadingScreen, Screen } from "@/components/screen";
import { DebtsView } from "@/features/debts/debts-view";
import { useDebts } from "@/features/finance/hooks";

export default function DebtsScreen() {
  const debts = useDebts();
  if (debts.isLoading) return <LoadingScreen />;
  if (debts.error || !debts.data) return <Screen><ErrorState message={`${debts.error?.message ?? "Có lỗi xảy ra."} Nếu chưa chạy migration 013_debts.sql trên Supabase thì chạy nó trước.`} retry={() => void debts.refetch()} /></Screen>;
  return (
    <>
      <Stack.Screen options={{ title: "Trả nợ" }} />
      <DebtsView debts={debts.data} today={vietnamToday()} />
    </>
  );
}
