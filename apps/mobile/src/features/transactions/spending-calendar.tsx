import { Pressable, StyleSheet, Text, View } from "react-native";
import { buildMonthGrid, formatCompactMoney, formatMoney } from "@hu/domain";
import { lightColors, radii, spacing, typography } from "@hu/design-tokens";
import type { DaySpend } from "./view";

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const ACCENT_RGB = "154, 91, 19"; // lightColors.accent

/** Lịch chi tiêu 1 tháng: số tiền đã chi in dưới số ngày, ô chi càng nhiều nền hổ phách càng đậm. */
export function SpendingCalendar({ ym, spendByDay, selected, today, onSelect }: { ym: string; spendByDay: Map<string, DaySpend>; selected: string | null; today: string | null; onSelect(date: string): void }) {
  const cells = buildMonthGrid(ym);
  const max = Math.max(0, ...Array.from(spendByDay.values(), (day) => day.total));

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        {WEEKDAYS.map((day, index) => (
          <View key={day} style={styles.cell}><Text style={[styles.weekday, index === 6 && styles.sunday]}>{day}</Text></View>
        ))}
      </View>
      <View style={styles.row}>
        {cells.map((cell, index) => {
          if (!cell) return <View key={`pad-${index}`} style={styles.cell} />;
          const spend = spendByDay.get(cell.date);
          const isSelected = cell.date === selected;
          const heat = spend && max > 0 ? 0.1 + (spend.total / max) * 0.34 : 0;
          return (
            <View key={cell.date} style={styles.cell}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Ngày ${cell.day}${spend ? `, đã chi ${formatMoney(spend.total)} ₫` : ", chưa có chi tiêu"}${cell.date === today ? ", hôm nay" : ""}`}
                onPress={() => onSelect(cell.date)}
                style={[styles.day, { backgroundColor: isSelected ? lightColors.primary : heat ? `rgba(${ACCENT_RGB}, ${heat})` : "transparent" }, cell.date === today && !isSelected && styles.today]}
              >
                <Text style={[styles.dayNumber, !spend && !isSelected && styles.dayEmpty, isSelected && styles.onPrimary]}>{cell.day}</Text>
                <Text numberOfLines={1} style={[styles.amount, isSelected && styles.onPrimary]}>{spend ? formatCompactMoney(spend.total) : ""}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>
      <View style={styles.legend}>
        <Text style={styles.legendText}>Chi ít</Text>
        {[0.1, 0.27, 0.44].map((alpha) => <View key={alpha} style={[styles.swatch, { backgroundColor: `rgba(${ACCENT_RGB}, ${alpha})` }]} />)}
        <Text style={styles.legendText}>Chi nhiều</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.card, borderWidth: 1, borderColor: lightColors.border, backgroundColor: lightColors.surface, padding: spacing[2], gap: spacing[1] },
  row: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: `${100 / 7}%`, padding: 2 },
  weekday: { textAlign: "center", paddingVertical: spacing[1], color: lightColors.textMuted, fontSize: typography.size.caption, fontWeight: "700" },
  sunday: { color: lightColors.accent },
  day: { minHeight: 56, alignItems: "center", justifyContent: "space-between", paddingVertical: spacing[1], borderRadius: radii.control },
  today: { borderWidth: 2, borderColor: lightColors.primary },
  dayNumber: { color: lightColors.text, fontSize: typography.size.body, fontWeight: "700", fontVariant: ["tabular-nums"] },
  dayEmpty: { color: lightColors.textMuted, fontWeight: "500" },
  amount: { color: lightColors.accent, fontSize: 10, fontWeight: "700", fontVariant: ["tabular-nums"] },
  onPrimary: { color: lightColors.onPrimary },
  legend: { flexDirection: "row", alignItems: "center", gap: spacing[2], paddingHorizontal: spacing[1], paddingTop: spacing[1] },
  legendText: { color: lightColors.textMuted, fontSize: typography.size.caption },
  swatch: { width: 20, height: 8, borderRadius: 4 },
});
