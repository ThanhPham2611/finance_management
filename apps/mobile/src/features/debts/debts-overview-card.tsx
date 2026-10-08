import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { DebtWithPayments } from "@hu/data";
import { formatMoney, rankDebts } from "@hu/domain";
import { lightColors, radii, spacing, typography } from "@hu/design-tokens";
import { ReminderLine } from "./reminder-line";

const vnd = (value: number) => `${formatMoney(value)} ₫`;
const MAX_ROWS = 3;

/** Tổng quan khoản nợ: còn nợ bao nhiêu, mỗi tháng cần trả bao nhiêu, nhắc hạn các khoản gấp nhất. Không có nợ thì không hiện gì. */
export function DebtsOverviewCard({ debts, today }: { debts: DebtWithPayments[]; today: string }) {
  const ranked = rankDebts(debts.map((debt) => ({ debt, payments: debt.payments })), today);
  if (ranked.length === 0) return null;

  const remaining = ranked.reduce((sum, item) => sum + item.progress.remaining, 0);
  const monthlyNeeded = ranked.reduce((sum, item) => sum + item.progress.monthlyNeeded, 0);
  const worst = ranked.find((item) => item.progress.reminder && item.progress.reminder.state !== "later")?.progress.reminder?.state;
  const background = worst === "overdue" ? "#FDECEA" : worst ? "#FBF1DD" : lightColors.surface;

  return (
    <Pressable testID="debts-overview" accessibilityRole="button" accessibilityLabel="Khoản nợ đang trả, mở chi tiết" onPress={() => router.push("/debts")} style={({ pressed }) => [styles.card, { backgroundColor: background }, pressed && styles.pressed]}>
      <Text style={styles.eyebrow}>KHOẢN NỢ ĐANG TRẢ</Text>
      <Text style={styles.remaining}>{`Còn nợ ${vnd(remaining)}`}</Text>
      <Text style={styles.muted}>{`${ranked.length} khoản · cần trả khoảng ${vnd(monthlyNeeded)} mỗi tháng`}</Text>
      {ranked.slice(0, MAX_ROWS).map(({ debt, progress }) => (
        <View key={debt.id} style={styles.row}>
          <View style={styles.rowTop}>
            <Text numberOfLines={1} style={styles.name}>{debt.name}</Text>
            <Text style={styles.muted}>{`còn ${vnd(progress.remaining)}`}</Text>
          </View>
          <View style={styles.track}><View style={[styles.fill, { width: `${progress.pct}%`, backgroundColor: progress.reminder?.state === "overdue" ? lightColors.destructive : lightColors.primary }]} /></View>
          {progress.reminder ? <ReminderLine reminder={progress.reminder} /> : null}
        </View>
      ))}
      {ranked.length > MAX_ROWS ? <Text style={styles.muted}>{`+ ${ranked.length - MAX_ROWS} khoản khác`}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing[2], padding: spacing[3], borderRadius: radii.card, borderWidth: 1, borderColor: lightColors.border },
  pressed: { opacity: 0.7 },
  eyebrow: { color: lightColors.textMuted, fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  remaining: { color: lightColors.text, fontSize: typography.size.heading, fontWeight: "800", fontVariant: ["tabular-nums"] },
  muted: { color: lightColors.textMuted, fontSize: typography.size.caption },
  row: { gap: spacing[1], paddingTop: spacing[2], borderTopWidth: 1, borderTopColor: lightColors.border },
  rowTop: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: spacing[2] },
  name: { flex: 1, color: lightColors.text, fontSize: typography.size.body, fontWeight: "700" },
  track: { height: 6, overflow: "hidden", borderRadius: radii.pill, backgroundColor: lightColors.surfaceSubtle },
  fill: { height: "100%", borderRadius: radii.pill },
});
