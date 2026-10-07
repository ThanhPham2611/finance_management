import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { BarChart, DonutChart, LineChart } from "react-native-chart-kit/v2";
import type { Jar } from "@hu/domain";
import { formatMoney } from "@hu/domain";
import { lightColors, radii, spacing, typography } from "@hu/design-tokens";
import { SegmentedControl } from "@/components/finance-ui";
import { useChartLayout } from "../reports/report-charts";
import type { WeekDay } from "./model";

const BUDGET_VIEWS = [{ id: "bar", label: "Dạng thanh" }, { id: "donut", label: "Dạng donut" }] as const;
const WEEK_VIEWS = [{ id: "bar", label: "Dạng cột" }, { id: "line", label: "Dạng đường" }] as const;
const percent = (jar: Jar, budgetSum: number) => (budgetSum ? Math.round((jar.monthlyBudget / budgetSum) * 100) : 0);

/** Ngân sách chia vào các hũ: thanh xếp chồng theo tỷ lệ hoặc donut kèm chú giải. */
export function BudgetSplitChart({ jars, budgetSum }: { jars: Jar[]; budgetSum: number }) {
  const [view, setView] = useState<"bar" | "donut">("bar");
  const { width, selectionAnimation, onLayout } = useChartLayout();
  const rows = jars.map((jar) => ({ name: jar.name, color: jar.color, value: jar.monthlyBudget }));

  return (
    <View style={styles.block}>
      <SegmentedControl label="Kiểu biểu đồ ngân sách" options={BUDGET_VIEWS} value={view} onChange={(next) => setView(next)} />
      {budgetSum === 0 ? <Text style={styles.empty}>Chưa có ngân sách</Text> : view === "bar" ? (
        <View accessibilityLabel="Tỷ lệ ngân sách giữa các hũ" style={styles.stack}>
          {jars.map((jar) => <View key={jar.id} style={{ width: `${(jar.monthlyBudget / budgetSum) * 100}%`, backgroundColor: jar.color }} />)}
        </View>
      ) : (
        <>
          <View testID="budget-donut-chart" onLayout={onLayout}>
            {width > 0 ? <DonutChart data={rows} valueKey="value" labelKey="name" colorKey="color" width={width} height={Math.min(width, 220)} theme="light" legend={false} selectionAnimation={selectionAnimation} accessibilityLabel="Biểu đồ ngân sách chia vào các hũ" /> : null}
          </View>
          {jars.map((jar) => (
            <View key={jar.id} style={styles.legend}>
              <View style={[styles.dot, { backgroundColor: jar.color }]} />
              <Text numberOfLines={1} style={styles.legendName}>{jar.name}</Text>
              <Text style={styles.legendValue}>{percent(jar, budgetSum)}%</Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

/** Chi 7 ngày qua: cột (hôm nay nhấn màu hổ phách) hoặc đường. */
export function WeekTrendChart({ week }: { week: WeekDay[] }) {
  const [view, setView] = useState<"bar" | "line">("bar");
  const { width, selectionAnimation, onLayout } = useChartLayout();
  const series = [{ yKey: "value" as const, key: "value", label: "Chi tiêu", color: lightColors.accent }];

  return (
    <View style={styles.block}>
      <SegmentedControl label="Kiểu biểu đồ chi 7 ngày" options={WEEK_VIEWS} value={view} onChange={(next) => setView(next)} />
      <View testID="week-trend-chart" onLayout={onLayout}>
        {width > 0 ? (view === "bar"
          ? <BarChart data={week} xKey="label" yKey="value" width={width} height={160} theme="light" series={series} tooltip={false} selectionAnimation={selectionAnimation} formatYLabel={(value) => formatMoney(value)} accessibilityLabel="Biểu đồ chi tiêu 7 ngày qua" />
          : <LineChart data={week} xKey="label" yKey="value" width={width} height={160} theme="light" series={series} formatYLabel={(value) => formatMoney(value)} accessibilityLabel="Biểu đồ đường chi tiêu 7 ngày qua" />) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing[2] },
  empty: { color: lightColors.textMuted, fontSize: typography.size.body, textAlign: "center", paddingVertical: spacing[6] },
  stack: { height: 14, flexDirection: "row", gap: 1, overflow: "hidden", borderRadius: radii.pill, backgroundColor: lightColors.surfaceSubtle },
  legend: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendName: { flex: 1, color: lightColors.text, fontSize: typography.size.caption },
  legendValue: { color: lightColors.textMuted, fontSize: typography.size.caption, fontVariant: ["tabular-nums"] },
});
