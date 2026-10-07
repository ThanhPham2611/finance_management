import { StyleSheet, Text, View } from "react-native";
import type { SharedOwnerOverview } from "@hu/data";
import { calculateJarStats, formatMoney, groupTransactionsByDay, vietnamNow } from "@hu/domain";
import { lightColors, radii, spacing, typography } from "@hu/design-tokens";
import { Surface } from "@/components/finance-ui";
import { JarIcon } from "@/components/jar-icon";
import { Screen } from "@/components/screen";

const vnd = (value: number) => `${formatMoney(value)} ₫`;

/** Chi tiêu của người đã chia sẻ cho mình: chỉ xem, không có thao tác sửa/xóa nào. */
export function SharedOwnerView({ data }: { data: SharedOwnerOverview }) {
  const { ownerName, jars, transactions } = data;
  const now = vietnamNow();
  const days = groupTransactionsByDay(transactions);
  const totalBudget = jars.reduce((sum, jar) => sum + jar.monthlyBudget, 0);
  const totalSpent = jars.reduce((sum, jar) => sum + jar.spent, 0);

  return (
    <Screen>
      <Text style={styles.title}>{`Chi tiêu của ${ownerName}`}</Text>
      <Text style={styles.muted}>{`Đã chi ${vnd(totalSpent)} / ${vnd(totalBudget)} tháng này · chỉ xem, không thể chỉnh sửa`}</Text>
      {jars.length === 0 ? <Text style={styles.muted}>{`${ownerName} chưa có hũ nào.`}</Text> : jars.map((jar) => {
        const stats = calculateJarStats(jar, now);
        return (
          <Surface key={jar.id} style={styles.card}>
            <View style={styles.row}><JarIcon icon={jar.icon} color={jar.color} size={20} isSavings={jar.isSavings} /><Text numberOfLines={1} style={styles.name}>{jar.name}</Text><Text style={styles.value}>{`${vnd(jar.spent)} / ${vnd(jar.monthlyBudget)}`}</Text></View>
            <View style={styles.track}><View style={[styles.fill, { width: `${stats.pct}%`, backgroundColor: stats.over ? lightColors.destructive : stats.near || stats.willExceed ? lightColors.warning : jar.color }]} /></View>
          </Surface>
        );
      })}
      <Text style={styles.eyebrow}>Giao dịch gần đây</Text>
      {days.length === 0 ? <Text style={styles.muted}>Chưa có giao dịch nào.</Text> : days.map((day) => (
        <View key={day.date} style={styles.day}>
          <Text style={styles.dayLabel}>{day.dayLabel}</Text>
          {day.items.map((item) => (
            <View key={item.id} style={styles.tx}>
              <JarIcon icon={item.jarIcon} color={item.jarColor} size={18} />
              <View style={styles.txCopy}><Text numberOfLines={1} style={styles.txNote}>{item.note || "Không ghi chú"}</Text><Text style={styles.muted}>{item.jarName}</Text></View>
              <Text style={[styles.value, item.type === "deposit" && styles.deposit]}>{item.type === "deposit" ? "+" : ""}{vnd(item.amount)}</Text>
            </View>
          ))}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: lightColors.text, fontSize: typography.size.heading, fontWeight: "800" },
  muted: { color: lightColors.textMuted, fontSize: typography.size.caption, lineHeight: 20 },
  eyebrow: { color: lightColors.textMuted, fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginTop: spacing[2] },
  card: { gap: spacing[2] },
  row: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  name: { flex: 1, color: lightColors.text, fontSize: typography.size.body, fontWeight: "700" },
  value: { color: lightColors.text, fontSize: typography.size.caption, fontVariant: ["tabular-nums"] },
  deposit: { color: lightColors.success },
  track: { height: 6, overflow: "hidden", borderRadius: radii.pill, backgroundColor: lightColors.surfaceSubtle },
  fill: { height: "100%", borderRadius: radii.pill },
  day: { gap: spacing[1] },
  dayLabel: { color: lightColors.textMuted, fontSize: 12, fontWeight: "700", marginTop: spacing[2] },
  tx: { flexDirection: "row", alignItems: "center", gap: spacing[3], borderTopWidth: 1, borderTopColor: lightColors.border, paddingVertical: spacing[2] },
  txCopy: { flex: 1, gap: 2 },
  txNote: { color: lightColors.text, fontSize: typography.size.body, fontWeight: "600" },
});
