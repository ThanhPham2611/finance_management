import { router } from "expo-router";
import { RefreshControl, StyleSheet, Text, View } from "react-native";
import { calculateJarStats, formatMoney, vietnamNow } from "@hu/domain";
import { lightColors, radii, spacing, typography } from "@hu/design-tokens";
import { Amount, EmptyState, ErrorState, PageTitle, Surface, TextButton } from "@/components/finance-ui";
import { LoadingScreen, Screen } from "@/components/screen";
import { useJars, useTransactions } from "@/features/finance/hooks";
import { buildOverviewSummary } from "@/features/finance/model";

export default function OverviewScreen() {
  const jars = useJars();
  const transactions = useTransactions();
  const refreshing = jars.isRefetching || transactions.isRefetching;

  if (jars.isLoading || transactions.isLoading) return <LoadingScreen label="Đang gom số liệu tháng này…" />;
  if (jars.error || transactions.error) {
    return <Screen><ErrorState message={(jars.error ?? transactions.error)?.message ?? "Có lỗi xảy ra."} retry={() => void Promise.all([jars.refetch(), transactions.refetch()])} /></Screen>;
  }

  const summary = buildOverviewSummary(jars.data ?? []);
  const recent = (transactions.data ?? []).slice(0, 4);
  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void Promise.all([jars.refetch(), transactions.refetch()])} tintColor={lightColors.primary} />}>
      <PageTitle>Tổng quan tháng này</PageTitle>
      <Surface style={styles.hero}>
        <Text style={styles.eyebrow}>CÒN CÓ THỂ CHI</Text>
        <Amount value={summary.remaining} tone={summary.remaining < 0 ? "danger" : "default"} />
        <View style={styles.metrics}>
          <Metric label="Ngân sách" value={summary.budget} />
          <View style={styles.divider} />
          <Metric label="Đã chi" value={summary.spent} />
        </View>
      </Surface>
      {summary.savingsJarCount > 0 ? (
        <Surface style={styles.saving}><Text style={styles.savingLabel}>Đang dành cho tương lai</Text><Text style={styles.savingValue}>{formatMoney(summary.saved)} ₫</Text></Surface>
      ) : null}
      <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Nhịp chi tiêu</Text><TextButton label="Xem hũ" onPress={() => router.push("/jars")} /></View>
      {(jars.data ?? []).length === 0 ? (
        <EmptyState icon="account-balance-wallet" title="Bắt đầu với một chiếc hũ" message="Đặt ngân sách theo mục đích để biết tiền đang đi đâu." action={<TextButton label="Tạo hũ" icon="add" onPress={() => router.push("/jars/new")} />} />
      ) : (jars.data ?? []).filter((jar) => !jar.isSavings).slice(0, 4).map((jar) => {
        const stats = calculateJarStats(jar, vietnamNow());
        return (
          <Surface key={jar.id} style={styles.jarCard}>
            <View style={styles.jarTop}><View style={[styles.jarDot, { backgroundColor: jar.color }]} /><Text style={styles.jarName}>{jar.name}</Text><Text style={[styles.jarLeft, stats.over && styles.danger]}>{stats.over ? `Vượt ${formatMoney(-stats.left)} ₫` : `Còn ${formatMoney(stats.left)} ₫`}</Text></View>
            <View style={styles.track}><View style={[styles.fill, { width: `${stats.pct}%`, backgroundColor: stats.over || stats.near ? lightColors.warning : jar.color }]} /></View>
          </Surface>
        );
      })}
      <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Giao dịch gần đây</Text><TextButton label="Xem hết" onPress={() => router.push("/transactions")} /></View>
      {recent.length === 0 ? <Text style={styles.muted}>Chưa có giao dịch trong tháng này.</Text> : recent.map((item) => (
        <Surface key={item.id} style={styles.transaction}><View style={[styles.jarDot, { backgroundColor: item.jarColor }]} /><View style={styles.transactionCopy}><Text numberOfLines={1} style={styles.jarName}>{item.note || item.jarName}</Text><Text style={styles.muted}>{item.jarName}</Text></View><Text style={[styles.transactionAmount, item.type === "deposit" && styles.deposit]}>{item.type === "deposit" ? "+" : "−"}{formatMoney(item.amount)} ₫</Text></Surface>
      ))}
    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <View style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{formatMoney(value)} ₫</Text></View>;
}

const styles = StyleSheet.create({
  hero: { gap: spacing[3], backgroundColor: "#E5EEE9", borderColor: "#C4D8CF" },
  eyebrow: { color: lightColors.primary, fontSize: typography.size.caption, fontWeight: "800", letterSpacing: 1.2 },
  metrics: { flexDirection: "row", alignItems: "center", gap: spacing[4], paddingTop: spacing[2] },
  metric: { flex: 1, gap: spacing[1] }, metricLabel: { color: lightColors.textMuted, fontSize: typography.size.caption }, metricValue: { color: lightColors.text, fontSize: typography.size.body, fontWeight: "700", fontVariant: ["tabular-nums"] },
  divider: { width: 1, height: 34, backgroundColor: lightColors.border },
  saving: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#F4E9D8", borderColor: "#E5CEAA" }, savingLabel: { flex: 1, color: lightColors.accent, fontSize: typography.size.body, fontWeight: "700" }, savingValue: { color: lightColors.accent, fontSize: typography.size.bodyLarge, fontWeight: "800" },
  sectionHeader: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, sectionTitle: { color: lightColors.text, fontSize: typography.size.title, fontWeight: "800" },
  jarCard: { gap: spacing[3], padding: spacing[3] }, jarTop: { flexDirection: "row", alignItems: "center", gap: spacing[2] }, jarDot: { width: 12, height: 12, borderRadius: 6 }, jarName: { flex: 1, color: lightColors.text, fontSize: typography.size.body, fontWeight: "700" }, jarLeft: { color: lightColors.textMuted, fontSize: typography.size.caption, fontWeight: "600" }, danger: { color: lightColors.destructive },
  track: { height: 7, overflow: "hidden", borderRadius: radii.pill, backgroundColor: lightColors.surfaceSubtle }, fill: { height: "100%", borderRadius: radii.pill },
  transaction: { flexDirection: "row", alignItems: "center", gap: spacing[3], padding: spacing[3] }, transactionCopy: { flex: 1, gap: 2 }, muted: { color: lightColors.textMuted, fontSize: typography.size.body }, transactionAmount: { color: lightColors.text, fontSize: typography.size.body, fontWeight: "800", fontVariant: ["tabular-nums"] }, deposit: { color: lightColors.success },
});
