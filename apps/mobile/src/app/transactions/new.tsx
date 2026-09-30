import { router, Stack } from "expo-router";
import { EmptyState, ErrorState, TextButton } from "@/components/finance-ui";
import { LoadingScreen, Screen } from "@/components/screen";
import { useCreateTransaction, useJars } from "@/features/finance/hooks";
import { TransactionForm } from "@/features/finance/transaction-form";

export default function NewTransactionScreen() {
  const jars = useJars();
  const mutation = useCreateTransaction();
  if (jars.isLoading) return <LoadingScreen />;
  if (jars.error) return <Screen><ErrorState message={jars.error.message} retry={() => void jars.refetch()} /></Screen>;
  if (!jars.data?.length) return <Screen><EmptyState icon="account-balance-wallet" title="Cần có một chiếc hũ" message="Tạo hũ trước khi ghi giao dịch." action={<TextButton label="Tạo hũ" onPress={() => router.replace("/jars/new")} />} /></Screen>;
  return <><Stack.Screen options={{ title: "Ghi giao dịch" }} /><TransactionForm jars={jars.data} submitLabel="Lưu giao dịch" busy={mutation.isPending} serverError={mutation.error?.message} onSubmit={(value) => mutation.mutate(value, { onSuccess: () => router.back() })} /></>;
}
