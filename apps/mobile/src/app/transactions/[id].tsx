import { router, Stack, useLocalSearchParams } from "expo-router";
import { Alert } from "react-native";
import { vietnamToday } from "@hu/domain";
import { EmptyState, ErrorState, TextButton } from "@/components/finance-ui";
import { LoadingScreen, Screen } from "@/components/screen";
import { useDeleteTransaction, useJars, useTransactions, useUpdateTransaction } from "@/features/finance/hooks";
import { TransactionForm } from "@/features/finance/transaction-form";
import { useAuth } from "@/providers/auth-provider";

export default function EditTransactionScreen() {
  const params = useLocalSearchParams<{ id: string; ym?: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const ym = Array.isArray(params.ym) ? params.ym[0] : params.ym;
  const { session } = useAuth();
  const jars = useJars();
  const transactions = useTransactions(ym);
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

  // Chỉ người tạo mới xóa được (deleteTransaction lọc theo user_id) — giao dịch của thành viên khác trong hũ gia đình chỉ hiện nút khi là của mình.
  const canDelete = transaction.userId === session?.user.id;

  return (
    <>
      <Stack.Screen options={{ title: "Sửa giao dịch" }} />
      <TransactionForm jars={jars.data ?? []} initial={{ jarId: transaction.jarId, amount: transaction.amount, note: transaction.note ?? "", type: transaction.type, transactionDate: transaction.transactionDate || vietnamToday() }} submitLabel="Lưu thay đổi" busy={update.isPending} serverError={update.error?.message ?? remove.error?.message} footer={canDelete ? <TextButton label={remove.isPending ? "Đang xóa…" : "Xóa giao dịch"} icon="delete-outline" destructive onPress={confirmDelete} /> : undefined} onSubmit={(value) => update.mutate({ id: transaction.id, ...value, transactionDate: value.transactionDate ?? transaction.transactionDate }, { onSuccess: () => router.back() })} />
    </>
  );
}
