import { StyleSheet, Text, View } from "react-native";
import { formatMoney } from "@hu/domain";
import type { MonthEndJarInfo } from "@hu/data";
import { lightColors, radii, spacing, typography } from "@hu/design-tokens";
import { PrimaryButton } from "@/components/auth-form";
import { TextButton } from "@/components/finance-ui";

const vnd = (value: number) => `${formatMoney(value)} ₫`;

/** Hỏi có cộng tiền dư cuối tháng của các hũ KHÔNG bật rollover vào hũ "Quỹ dư" hay không. */
export function LeftoverBanner({ items, monthLabel, busy, error, onResolve }: { items: MonthEndJarInfo[]; monthLabel: string; busy: "confirm" | "decline" | null; error?: string | null; onResolve(action: "confirm" | "decline"): void }) {
  if (items.length === 0) return null;
  const total = items.reduce((sum, item) => sum + item.leftover, 0);
  return (
    <View accessibilityRole="alert" style={styles.box}>
      <Text style={styles.text}>
        <Text style={styles.bold}>{`${monthLabel} có ${items.length} hũ dư, tổng ${vnd(total)}: `}</Text>
        {`${items.map((item) => `${item.jarName} (${vnd(item.leftover)})`).join(", ")}. Cộng hết vào hũ “Quỹ dư”?`}
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton disabled={busy !== null} onPress={() => onResolve("confirm")}>{busy === "confirm" ? "Đang cộng…" : "Cộng vào Quỹ dư"}</PrimaryButton>
      <TextButton label={busy === "decline" ? "Đang bỏ qua…" : "Bỏ qua"} onPress={() => busy === null && onResolve("decline")} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: spacing[2], padding: spacing[3], borderRadius: radii.card, backgroundColor: "#FBF1DD", borderWidth: 1, borderColor: "#E5CEAA" },
  text: { color: lightColors.text, fontSize: typography.size.body, lineHeight: 22 },
  bold: { fontWeight: "700" },
  error: { color: lightColors.destructive, fontSize: typography.size.caption },
});
