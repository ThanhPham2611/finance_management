import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatMoney } from "@hu/domain";
import { lightColors, radii, spacing, typography } from "@hu/design-tokens";
import { Surface } from "@/components/finance-ui";
import type { ReportData, ReportRangeId } from "./model";

const RANGES: { id: ReportRangeId; label: string }[] = [
  { id: "week", label: "Tuần này" },
  { id: "month", label: "Tháng này" },
  { id: "half", label: "6 tháng" },
];

export function ReportRangeSelector({ value, onChange }: { value: ReportRangeId; onChange(id: ReportRangeId): void }) {
  return (
    <View accessibilityRole="radiogroup" style={styles.group}>
      {RANGES.map(({ id, label }) => {
        const selected = id === value;
        return (
          <Pressable
            key={id}
            accessibilityRole="radio"
            accessibilityLabel={label}
            accessibilityState={{ selected }}
            onPress={() => onChange(id)}
            style={[styles.option, selected && styles.optionSelected]}
          >
            <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ReportSummary({ report }: { report: ReportData }) {
  const { delta } = report;
  const color = delta > 0 ? lightColors.warning : delta < 0 ? lightColors.success : lightColors.textMuted;
  const copy =
    delta === 0 ? "Không đổi so với kỳ trước" : `${delta > 0 ? "Tăng" : "Giảm"} ${formatMoney(Math.abs(delta))} ₫ so với kỳ trước`;
  return (
    <Surface style={styles.summary}>
      <Text style={styles.eyebrow}>{`Đã chi ${report.note}`}</Text>
      <Text style={styles.total}>{`${formatMoney(report.total)} ₫`}</Text>
      <Text style={[styles.delta, { color }]}>{copy}</Text>
    </Surface>
  );
}

const styles = StyleSheet.create({
  group: { flexDirection: "row", gap: spacing[2] },
  option: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: radii.control, borderWidth: 1, borderColor: lightColors.border, backgroundColor: lightColors.surface },
  optionSelected: { borderColor: lightColors.primary, backgroundColor: lightColors.primary },
  optionLabel: { color: lightColors.text, fontSize: typography.size.body, fontWeight: "600" },
  optionLabelSelected: { color: lightColors.onPrimary },
  summary: { gap: spacing[1] },
  eyebrow: { color: lightColors.textMuted, fontSize: typography.size.caption, fontWeight: "700" },
  total: { color: lightColors.text, fontSize: 30, fontWeight: "800", fontVariant: ["tabular-nums"] },
  delta: { fontSize: typography.size.body, fontWeight: "600" },
});
