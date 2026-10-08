import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { TransactionWithJar } from "@hu/data";
import { formatMoney } from "@hu/domain";
import { lightColors, spacing, typography } from "@hu/design-tokens";
import { Surface } from "@/components/finance-ui";

/**
 * `ym` đi kèm route để màn sửa tải đúng tháng (giao dịch của tháng cũ không nằm trong tháng hiện tại).
 * `flat`: dòng phẳng để xếp trong thẻ của một ngày (có đường kẻ trên); mặc định mỗi dòng là một thẻ riêng.
 */
export function TransactionRow({ item, ym, jarLabel, flat = false }: { item: TransactionWithJar; ym: string; jarLabel: string; flat?: boolean }) {
  const content = (
    <>
      <View style={[styles.dot, { backgroundColor: item.jarColor }]} />
      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.note}>{item.note || (item.type === "deposit" ? "Nạp vào hũ" : "Chi tiêu")}</Text>
        <Text style={styles.jar}>{jarLabel}</Text>
      </View>
      <Text style={[styles.amount, item.type === "deposit" && styles.deposit]}>{item.type === "deposit" ? "+" : "−"}{formatMoney(item.amount)} ₫</Text>
    </>
  );
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/transactions/[id]", params: { id: item.id, ym } })} style={({ pressed }) => pressed && styles.pressed}>
      {flat ? <View style={[styles.item, styles.flat]}>{content}</View> : <Surface style={styles.item}>{content}</Surface>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  flat: { borderTopWidth: 1, borderTopColor: lightColors.border },
  item: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: spacing[3], padding: spacing[3] },
  dot: { width: 12, height: 12, borderRadius: 6 },
  copy: { flex: 1, gap: 3 },
  note: { color: lightColors.text, fontSize: typography.size.body, fontWeight: "700" },
  jar: { color: lightColors.textMuted, fontSize: typography.size.caption },
  amount: { color: lightColors.text, fontSize: typography.size.body, fontWeight: "800", fontVariant: ["tabular-nums"] },
  deposit: { color: lightColors.success },
});
