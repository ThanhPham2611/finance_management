import { useMemo, useState } from "react";
import { router } from "expo-router";
import { RefreshControl, Share, StyleSheet, Text, View } from "react-native";
import { vietnamToday } from "@hu/domain";
import { lightColors, spacing, typography } from "@hu/design-tokens";
import { EmptyState, ErrorState, PageTitle, SegmentedControl, TextButton } from "@/components/finance-ui";
import { LoadingScreen, Screen } from "@/components/screen";
import { useJars, useReportTransactions } from "@/features/finance/hooks";
import { jarLabel } from "@/features/finance/model";
import { buildCsv, csvFileName } from "@/features/reports/export";
import { buildReport, type ReportRangeId } from "@/features/reports/model";
import { JarShareChart, SpendingBarChart } from "@/features/reports/report-charts";
import { ReportRangeSelector, ReportSummary } from "@/features/reports/report-sections";
import { TransactionRow } from "@/features/transactions/transaction-row";

type Scope = "all" | "personal" | "family";
const SCOPES: readonly { id: Scope; label: string }[] = [{ id: "all", label: "Tất cả" }, { id: "personal", label: "Cá nhân" }, { id: "family", label: "Gia đình" }];

export default function ReportsScreen() {
  const [rangeId, setRangeId] = useState<ReportRangeId>("month");
  const [scope, setScope] = useState<Scope>("all");
  const transactions = useReportTransactions();
  const jars = useJars();

  // Báo cáo chỉ tính khoản chi: khoản nạp không phải "đã chi". Phạm vi Cá nhân/Gia đình lọc theo hũ quỹ chung.
  const familyJarIds = useMemo(() => new Set((jars.data ?? []).filter((jar) => jar.isShared).map((jar) => jar.id)), [jars.data]);
  const scoped = useMemo(
    () => (transactions.data ?? []).filter((t) => t.type !== "deposit" && (scope === "all" || (scope === "family") === familyJarIds.has(t.jarId))),
    [transactions.data, scope, familyJarIds],
  );
  const activeJarIds = useMemo(() => new Set((jars.data ?? []).filter((jar) => scope === "all" || (scope === "family") === jar.isShared).map((jar) => jar.id)), [jars.data, scope]);
  const report = useMemo(() => buildReport(scoped, activeJarIds, rangeId), [scoped, activeJarIds, rangeId]);
  const jarsById = useMemo(() => new Map((jars.data ?? []).map((jar) => [jar.id, jar])), [jars.data]);
  const refetch = () => void Promise.all([transactions.refetch(), jars.refetch()]);

  if (transactions.isLoading || jars.isLoading) return <LoadingScreen label="Đang tổng hợp báo cáo…" />;
  const error = transactions.error ?? jars.error;
  if (error) return <Screen><ErrorState message={error.message} retry={refetch} /></Screen>;

  // ponytail: chia sẻ CSV dạng văn bản qua share sheet; muốn gửi thành file .csv thật thì thêm expo-file-system + expo-sharing (cần build native lại).
  const exportCsv = () => void Share.share({ title: csvFileName(vietnamToday()), message: buildCsv(scoped) });
  const recent = scoped.slice(0, 5);

  return (
    <Screen testID="reports-screen" refreshControl={<RefreshControl refreshing={transactions.isRefetching || jars.isRefetching} onRefresh={refetch} tintColor={lightColors.primary} />}>
      <PageTitle action={scoped.length > 0 ? <TextButton label="Xuất CSV" icon="file-download" onPress={exportCsv} /> : undefined}>Báo cáo</PageTitle>
      <Text style={styles.description}>Theo dõi nhịp chi tiêu theo thời gian và từng hũ.</Text>
      {familyJarIds.size > 0 ? <SegmentedControl label="Phạm vi báo cáo" options={SCOPES} value={scope} onChange={(next) => setScope(next)} /> : null}
      <ReportRangeSelector value={rangeId} onChange={setRangeId} />
      {report.total === 0 ? (
        <EmptyState icon="bar-chart" title="Chưa có khoản chi trong kỳ này" message="Ghi một khoản chi để xem xu hướng và tỷ trọng theo hũ." action={<TextButton label="Ghi giao dịch" onPress={() => router.push("/transactions/new")} />} />
      ) : (
        <>
          <ReportSummary report={report} />
          <SpendingBarChart buckets={report.buckets} initialBucketIndex={report.initialBucketIndex} />
          <JarShareChart rows={report.jars} onOpenJar={(id) => router.push({ pathname: "/jars/[id]", params: { id } })} />
        </>
      )}
      <View style={styles.recent}>
        <View style={styles.recentHeader}>
          <Text style={styles.recentTitle}>Giao dịch gần đây</Text>
          <TextButton label="Xem tất cả" onPress={() => router.push("/transactions")} />
        </View>
        {recent.length === 0 ? <Text style={styles.description}>Chưa có giao dịch nào.</Text> : recent.map((item) => {
          const jar = jarsById.get(item.jarId);
          return <TransactionRow key={item.id} item={item} ym={item.transactionDate.slice(0, 7)} jarLabel={jar ? jarLabel(jar) : item.jarName} />;
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  description: { color: lightColors.textMuted, fontSize: typography.size.body },
  recent: { gap: spacing[2], paddingTop: spacing[3], borderTopWidth: 2, borderTopColor: lightColors.border },
  recentHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  recentTitle: { color: lightColors.text, fontSize: typography.size.title, fontWeight: "800" },
});
