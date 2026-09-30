import { router } from "expo-router";
import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { formatMoney, groupTransactionsByDay } from "@hu/domain";
import { lightColors, spacing, typography } from "@hu/design-tokens";
import { EmptyState, ErrorState, PageTitle, Surface, TextButton } from "@/components/finance-ui";
import { LoadingScreen, Screen } from "@/components/screen";
import { useTransactions } from "@/features/finance/hooks";

export default function TransactionsScreen() {
  const query = useTransactions();
  if (query.isLoading) return <LoadingScreen label="Đang đọc sổ giao dịch…" />;
  if (query.error) return <Screen><ErrorState message={query.error.message} retry={() => void query.refetch()} /></Screen>;
  const groups = groupTransactionsByDay(query.data ?? []);
  return (
    <Screen refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={lightColors.primary} />}>
      <PageTitle action={<TextButton label="Ghi giao dịch" icon="add" onPress={() => router.push("/transactions/new")} />}>Giao dịch</PageTitle>
      {groups.length === 0 ? <EmptyState icon="receipt-long" title="Sổ tháng này còn trống" message="Ghi khoản chi hoặc tiền nạp đầu tiên của bạn." action={<TextButton label="Thêm giao dịch" icon="add" onPress={() => router.push("/transactions/new")} />} /> : groups.map((group) => (
        <View key={group.date} style={styles.group}><View style={styles.dayHeader}><Text style={styles.day}>{group.dayLabel}</Text><Text style={styles.total}>{formatMoney(group.total)} ₫</Text></View>{group.items.map((item) => (
          <Pressable key={item.id} accessibilityRole="button" onPress={() => router.push({ pathname: "/transactions/[id]", params: { id: item.id } })} style={({ pressed }) => pressed && styles.pressed}>
            <Surface style={styles.item}><View style={[styles.dot, { backgroundColor: item.jarColor }]} /><View style={styles.copy}><Text numberOfLines={1} style={styles.note}>{item.note || (item.type === "deposit" ? "Nạp vào hũ" : "Chi tiêu")}</Text><Text style={styles.jar}>{item.jarName}</Text></View><Text style={[styles.amount, item.type === "deposit" && styles.deposit]}>{item.type === "deposit" ? "+" : "−"}{formatMoney(item.amount)} ₫</Text></Surface>
          </Pressable>
        ))}</View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing[2] }, dayHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing[1] }, day: { color: lightColors.text, fontSize: typography.size.body, fontWeight: "800" }, total: { color: lightColors.textMuted, fontSize: typography.size.caption, fontVariant: ["tabular-nums"] }, pressed: { opacity: 0.7 }, item: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: spacing[3], padding: spacing[3] }, dot: { width: 12, height: 12, borderRadius: 6 }, copy: { flex: 1, gap: 3 }, note: { color: lightColors.text, fontSize: typography.size.body, fontWeight: "700" }, jar: { color: lightColors.textMuted, fontSize: typography.size.caption }, amount: { color: lightColors.text, fontSize: typography.size.body, fontWeight: "800", fontVariant: ["tabular-nums"] }, deposit: { color: lightColors.success },
});
