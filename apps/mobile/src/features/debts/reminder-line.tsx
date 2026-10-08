import { MaterialIcons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { describeReminder, formatMoney, type DebtReminder } from "@hu/domain";
import { lightColors, spacing, typography } from "@hu/design-tokens";

const INK = { overdue: lightColors.destructive, due: lightColors.warning, soon: lightColors.warning, later: lightColors.textMuted } as const;

/** Dòng nhắc kỳ trả kế tiếp của một khoản nợ (đỏ khi trễ, vàng khi đến hạn/sắp đến hạn). */
export function ReminderLine({ reminder }: { reminder: DebtReminder }) {
  const color = INK[reminder.state];
  return (
    <View testID="debt-reminder" style={styles.row}>
      <MaterialIcons accessibilityElementsHidden importantForAccessibility="no" name={reminder.state === "later" ? "event" : "notifications-active"} size={16} color={color} />
      <Text style={[styles.text, { color }]}>{describeReminder(reminder, (value) => `${formatMoney(value)} ₫`)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  text: { flex: 1, fontSize: typography.size.caption, fontWeight: "700", lineHeight: 19 },
});
