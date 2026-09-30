import { router, Stack, useLocalSearchParams } from "expo-router";
import { Alert } from "react-native";
import { vietnamToday } from "@hu/domain";
import { EmptyState, ErrorState, TextButton } from "@/components/finance-ui";
import { LoadingScreen, Screen } from "@/components/screen";
import { useDeleteTransaction, useJars, useTransactions, useUpdateTransaction } from "@/features/finance/hooks";
import { TransactionForm } from "@/features/finance/transaction-form";

export default function EditTransactionScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const jars = useJars();
  const transactions = useTransactions();
  const update = useUpdateTransaction();
  const remove = useDeleteTransaction();
  if (jars.isLoading || transactions.isLoading) return <LoadingScreen />;
  if (jars.error || transactions.error) return <Screen><ErrorState message={(jars.error ?? transactions.error)?.message ?? "Có lỗi xảy ra."} retry={() => void Promise.all([jars.refetch(), transactions.refetch()])} /></Screen>;
  const transaction = transactions.data?.find((item) => item.id === id);
  if (!transaction) return <Screen><EmptyState icon="search-off" title="Không tìm thấy giao dịch" message="Giao dịch có thể đã bị xóa." /></Screen>;

  function confirmDelete() {
    Alert.alert("Xóa giao dịch?", "Thao tác này không thể hoàn tác.", [
      { text: "Hủy", style: "cancel" },
      { text: "Xóa", style: "destructive", onPress: () => remove.mutate(transaction!.id, { onSuccess: () => router.replace("/transactions") }) },
    ]);
  }

  return (
    <>
      <Stack.Screen options={{ title: "Sửa giao dịch" }} />
      <TransactionForm jars={jars.data ?? []} initial={{ jarId: transaction.jarId, amount: transaction.amount, note: transaction.note ?? "", type: transaction.type }} submitLabel="Lưu thay đổi" busy={update.isPending} serverError={update.error?.message ?? remove.error?.message} footer={<TextButton label={remove.isPending ? "Đang xóa…" : "Xóa giao dịch"} icon="delete-outline" destructive onPress={confirmDelete} />} onSubmit={(value) => update.mutate({ id: transaction.id, transactionDate: transaction.transactionDate || vietnamToday(), ...value }, { onSuccess: () => router.back() })} />
    </>
  );
}
