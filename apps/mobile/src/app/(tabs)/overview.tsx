import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { previousMonthLabel } from "@hu/data";
import { budgetShare, calculateJarStats, calculateSpendingPace, formatMoney, vietnamNow, vietnamToday, withDistinctJarColors } from "@hu/domain";
import { lightColors, radii, spacing, typography } from "@hu/design-tokens";
import { Amount, EmptyState, ErrorState, PageTitle, Surface, TextButton } from "@/components/finance-ui";
import { LoadingScreen, Screen } from "@/components/screen";
import { DebtsOverviewCard } from "@/features/debts/debts-overview-card";
import { useAutoRollover, useDebts, useJars, useMarkTourSeen, usePendingLeftovers, useProfile, useRecentTransactions, useResolveLeftovers, useTransactionsSince } from "@/features/finance/hooks";
import { daysLeftInMonth } from "@/features/finance/jar-stats";
import { buildOverviewSummary, jarLabel } from "@/features/finance/model";
import { LeftoverBanner } from "@/features/overview/leftover-banner";
import { overviewAlert, weekSpend, weekStart } from "@/features/overview/model";
import { BudgetSplitChart, WeekTrendChart } from "@/features/overview/overview-charts";
import { SpendingPaceCard } from "@/features/overview/spending-pace-card";
import { ProductTour } from "@/features/tour/product-tour";

const vnd = (value: number) => `${formatMoney(value)} ₫`;

export default function OverviewScreen() {
  const now = vietnamNow();
  useAutoRollover();
  const jars = useJars();
  const recent = useRecentTransactions(4);
  const last7 = useTransactionsSince(weekStart(now));
  const leftovers = usePendingLeftovers();
  // Khoản nợ là tính năng phụ: không chờ và không làm hỏng Tổng quan khi chưa chạy migration 013.
  const debts = useDebts();
  const resolve = useResolveLeftovers();
  // Hướng dẫn: tự mở lần đầu (chưa xem), hoặc mở lại từ tab Thêm qua ?tour=<mã> (mỗi lần bấm một mã mới). Chỉ lần đầu mới ghi "đã xem".
  const params = useLocalSearchParams<{ tour?: string }>();
  const replayToken = Array.isArray(params.tour) ? params.tour[0] : params.tour;
  const profile = useProfile();
  const markSeen = useMarkTourSeen();
  const [closedReplay, setClosedReplay] = useState<string | undefined>();
  const [firstTourClosed, setFirstTourClosed] = useState(false);
  const replaying = !!replayToken && replayToken !== closedReplay;
  const firstTime = profile.data?.hasSeenTour === false && !firstTourClosed;
  const closeTour = () => {
    if (replaying) setClosedReplay(replayToken);
    if (firstTime) {
      setFirstTourClosed(true);
      markSeen.mutate();
    }
  };
  const queries = [jars, recent, last7];
  const refetchAll = () => Promise.all([...queries, leftovers].map((query) => query.refetch()));

  if (queries.some((query) => query.isLoading)) return <LoadingScreen label="Đang gom số liệu tháng này…" />;
  const failed = queries.find((query) => query.error);
  if (failed?.error) return <Screen><ErrorState message={failed.error.message} retry={() => void refetchAll()} /></Screen>;

  // Hũ cũ có thể trùng màu (hũ tùy chỉnh trước đây đều nhận cùng một màu): chỉ đổi màu lúc hiển thị để biểu đồ tách được từng hũ.
  const jarList = withDistinctJarColors(jars.data ?? []);
  const summary = buildOverviewSummary(jarList);
  const spendable = jarList.filter((jar) => !jar.isSavings);
  const week = weekSpend(last7.data ?? [], now);
  const alert = overviewAlert(jarList, now);
  // Tỉ trọng tính trên tổng ngân sách MỌI hũ (kể cả hũ tiết kiệm), cùng quy tắc với web.
  const allBudget = jarList.reduce((sum, jar) => sum + jar.monthlyBudget, 0);
  const pending = leftovers.data ?? [];
  return (
    <Screen refreshControl={<RefreshControl refreshing={queries.some((query) => query.isRefetching)} onRefresh={() => void refetchAll()} tintColor={lightColors.primary} />}>
      <PageTitle>Tổng quan tháng này</PageTitle>
      {jarList.length === 0 ? (
        <EmptyState icon="account-balance-wallet" title="Bắt đầu với một chiếc hũ" message="Đặt ngân sách theo mục đích để biết tiền đang đi đâu." action={<TextButton label="Tạo hũ" icon="add" onPress={() => router.push("/jars/new")} />} />
      ) : (
        <>
          <Surface style={styles.hero}>
            <Text style={styles.eyebrow}>CÒN CÓ THỂ CHI</Text>
            <Amount value={summary.remaining} tone={summary.remaining < 0 ? "danger" : "default"} />
            <Text style={styles.muted}>{`Ngân sách ${vnd(summary.budget)} chia vào ${summary.spendableJarCount} hũ · còn ${daysLeftInMonth(now)} ngày`}</Text>
            <View style={styles.metrics}>
              <Metric label="Ngân sách" value={summary.budget} />
              <View style={styles.divider} />
              <Metric label="Đã chi" value={summary.spent} />
            </View>
            <BudgetSplitChart jars={spendable} budgetSum={summary.budget} />
          </Surface>
          <SpendingPaceCard pace={calculateSpendingPace(jarList, now)} />
          <DebtsOverviewCard debts={debts.data ?? []} today={vietnamToday()} />
          {summary.savingsJarCount > 0 ? (
            <Surface style={styles.saving}><Text style={styles.savingLabel}>{`Đang dành cho tương lai · ${summary.savingsJarCount} hũ`}</Text><Text style={styles.savingValue}>{vnd(Math.max(0, summary.saved))}</Text></Surface>
          ) : null}
          {alert ? <View accessibilityRole="alert" style={styles.alert}><MaterialIcons accessibilityElementsHidden importantForAccessibility="no" name="warning-amber" size={20} color={lightColors.destructive} /><Text style={styles.alertText}>{alert}</Text></View> : null}
          <LeftoverBanner items={pending} monthLabel={previousMonthLabel(now)} busy={resolve.isPending ? (resolve.variables ?? null) : null} error={resolve.error?.message} onResolve={(action) => resolve.mutate(action)} />

          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Tình trạng các hũ</Text><TextButton label="Xem hũ" onPress={() => router.push("/jars")} /></View>
          {jarList.map((jar) => {
            const stats = calculateJarStats(jar, now);
            return (
              <Pressable key={jar.id} accessibilityRole="button" onPress={() => router.push({ pathname: "/jars/[id]", params: { id: jar.id } })} style={({ pressed }) => pressed && styles.pressed}>
                <Surface style={styles.jarCard}>
                  <View style={styles.jarTop}><View style={[styles.jarDot, { backgroundColor: jar.color }]} /><Text numberOfLines={1} style={styles.jarName}>{jarLabel(jar)}</Text><Text accessibilityLabel={`Chiếm ${budgetShare(jar, allBudget)}% tổng ngân sách các hũ`} style={styles.share}>{`${budgetShare(jar, allBudget)}% tổng`}</Text><Text style={[styles.jarLeft, stats.over && !jar.isSavings && styles.danger]}>{jar.isSavings ? `Đã tiết kiệm ${vnd(Math.max(0, stats.left))}` : stats.over ? `Vượt ${vnd(-stats.left)}` : `Còn ${vnd(stats.left)}`}</Text></View>
                  <View style={styles.track}><View style={[styles.fill, { width: `${stats.pct}%`, backgroundColor: !jar.isSavings && stats.over ? lightColors.destructive : stats.near || stats.willExceed ? lightColors.warning : jar.color }]} /></View>
                </Surface>
              </Pressable>
            );
          })}

          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Chi 7 ngày qua</Text><Text style={styles.muted}>{`TB ${vnd(week.reduce((sum, day) => sum + day.value, 0) / 7)}/ngày`}</Text></View>
          <WeekTrendChart week={week} />
        </>
      )}
      {replaying || firstTime ? <ProductTour hasJars={jarList.length > 0} onClose={closeTour} /> : null}
      <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Giao dịch gần đây</Text><TextButton label="Xem hết" onPress={() => router.push("/transactions")} /></View>
      {(recent.data ?? []).length === 0 ? <Text style={styles.muted}>Chưa có giao dịch nào.</Text> : (recent.data ?? []).map((item) => (
        <Pressable key={item.id} accessibilityRole="button" onPress={() => router.push({ pathname: "/transactions/[id]", params: { id: item.id, ym: item.transactionDate.slice(0, 7) } })} style={({ pressed }) => pressed && styles.pressed}>
          <Surface style={styles.transaction}><View style={[styles.jarDot, { backgroundColor: item.jarColor }]} /><View style={styles.transactionCopy}><Text numberOfLines={1} style={styles.jarName}>{item.note || item.jarName}</Text><Text style={styles.muted}>{item.jarName}</Text></View><Text style={[styles.transactionAmount, item.type === "deposit" && styles.deposit]}>{item.type === "deposit" ? "+" : "−"}{formatMoney(item.amount)} ₫</Text></Surface>
        </Pressable>
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
  metric: { flex: 1, gap: spacing[1] },
  metricLabel: { color: lightColors.textMuted, fontSize: typography.size.caption },
  metricValue: { color: lightColors.text, fontSize: typography.size.body, fontWeight: "700", fontVariant: ["tabular-nums"] },
  divider: { width: 1, height: 34, backgroundColor: lightColors.border },
  saving: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#F4E9D8", borderColor: "#E5CEAA" },
  savingLabel: { flex: 1, color: lightColors.accent, fontSize: typography.size.body, fontWeight: "700" },
  savingValue: { color: lightColors.accent, fontSize: typography.size.bodyLarge, fontWeight: "800" },
  alert: { flexDirection: "row", alignItems: "flex-start", gap: spacing[2], padding: spacing[3], borderRadius: radii.control, backgroundColor: "#FDECEA" },
  alertText: { flex: 1, color: lightColors.destructive, fontSize: typography.size.body, fontWeight: "600", lineHeight: 22 },
  sectionHeader: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { color: lightColors.text, fontSize: typography.size.title, fontWeight: "800" },
  pressed: { opacity: 0.7 },
  jarCard: { gap: spacing[3], padding: spacing[3] },
  jarTop: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  jarDot: { width: 12, height: 12, borderRadius: 6 },
  jarName: { flex: 1, color: lightColors.text, fontSize: typography.size.body, fontWeight: "700" },
  jarLeft: { color: lightColors.textMuted, fontSize: typography.size.caption, fontWeight: "600", fontVariant: ["tabular-nums"] },
  share: { color: lightColors.textMuted, fontSize: 11, fontVariant: ["tabular-nums"] },
  danger: { color: lightColors.destructive },
  track: { height: 7, overflow: "hidden", borderRadius: radii.pill, backgroundColor: lightColors.surfaceSubtle },
  fill: { height: "100%", borderRadius: radii.pill },
  transaction: { flexDirection: "row", alignItems: "center", gap: spacing[3], padding: spacing[3] },
  transactionCopy: { flex: 1, gap: 2 },
  muted: { color: lightColors.textMuted, fontSize: typography.size.caption },
  transactionAmount: { color: lightColors.text, fontSize: typography.size.body, fontWeight: "800", fontVariant: ["tabular-nums"] },
  deposit: { color: lightColors.success },
});
