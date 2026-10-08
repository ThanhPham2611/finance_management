import type { ReactNode } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { formatMoney } from "@hu/domain";
import { lightColors, radii, spacing, typography } from "@hu/design-tokens";
import { SegmentedControl, Surface } from "@/components/finance-ui";
import type { ReportData, ReportRangeId } from "./model";

const RANGES: readonly { id: ReportRangeId; label: string }[] = [
  { id: "week", label: "Tuần này" },
  { id: "month", label: "Tháng này" },
  { id: "half", label: "6 tháng" },
];

// Chi tăng = cảnh báo nhẹ, giảm = tốt. Có icon và chữ nên không chỉ dựa vào màu.
const TREND = {
  up: { icon: "trending-up", color: lightColors.warning, background: "#F4E9D8" },
  down: { icon: "trending-down", color: lightColors.success, background: "#E4F0EA" },
  flat: { icon: "trending-flat", color: lightColors.textMuted, background: lightColors.surface },
} as const;

export function ReportRangeSelector({ value, onChange }: { value: ReportRangeId; onChange(id: ReportRangeId): void }) {
  return <SegmentedControl label="Khoảng thời gian báo cáo" options={RANGES} value={value} onChange={onChange} />;
}

export function ReportSummary({ report }: { report: ReportData }) {
  const { delta } = report;
  const trend = TREND[delta > 0 ? "up" : delta < 0 ? "down" : "flat"];
  const copy =
    delta === 0 ? "Không đổi so với kỳ trước" : `${delta > 0 ? "Tăng" : "Giảm"} ${formatMoney(Math.abs(delta))} ₫ so với kỳ trước`;
  return (
    <Surface style={styles.hero}>
      <Text style={styles.eyebrow}>{`Đã chi ${report.note}`}</Text>
      <Text style={styles.total}>{`${formatMoney(report.total)} ₫`}</Text>
      <View style={[styles.delta, { backgroundColor: trend.background }]}>
        <MaterialIcons accessibilityElementsHidden importantForAccessibility="no" name={trend.icon} size={18} color={trend.color} />
        <Text style={[styles.deltaText, { color: trend.color }]}>{copy}</Text>
      </View>
    </Surface>
  );
}

/** Khung chung cho mỗi biểu đồ: tiêu đề bên trái, giá trị đang chọn bên phải (xuống dòng khi màn hẹp). */
export function ReportCard({ title, value, children }: { title: string; value?: string; children: ReactNode }) {
  return (
    <Surface style={styles.card}>
      <View style={styles.cardHeader}>
        <Text accessibilityRole="header" style={styles.cardTitle}>{title}</Text>
        {value ? <Text style={styles.cardValue}>{value}</Text> : null}
      </View>
      {children}
    </Surface>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing[2], backgroundColor: "#E5EEE9", borderColor: "#C4D8CF" },
  eyebrow: { color: lightColors.primary, fontSize: typography.size.caption, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase" },
  total: { color: lightColors.text, fontSize: 34, fontWeight: "800", fontVariant: ["tabular-nums"] },
  delta: { alignSelf: "flex-start", maxWidth: "100%", flexDirection: "row", alignItems: "center", gap: spacing[1], paddingVertical: spacing[1], paddingHorizontal: spacing[3], borderRadius: radii.pill },
  deltaText: { flexShrink: 1, fontSize: typography.size.caption, fontWeight: "700" },
  card: { gap: spacing[3] },
  cardHeader: { flexDirection: "row", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", columnGap: spacing[3], rowGap: 2 },
  cardTitle: { color: lightColors.text, fontSize: typography.size.bodyLarge, fontWeight: "800" },
  cardValue: { flexShrink: 1, color: lightColors.primary, fontSize: typography.size.body, fontWeight: "700", fontVariant: ["tabular-nums"] },
});
