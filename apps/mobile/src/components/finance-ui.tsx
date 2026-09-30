import type { PropsWithChildren, ReactNode } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { lightColors, radii, spacing, typography } from "@hu/design-tokens";
import { formatMoney } from "@hu/domain";

export function PageTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return <View style={styles.titleRow}><Text style={styles.title}>{children}</Text>{action}</View>;
}

export function Surface({ children, style }: PropsWithChildren<{ style?: object }>) {
  return <View style={[styles.surface, style]}>{children}</View>;
}

export function Amount({ value, suffix = "₫", tone = "default" }: { value: number; suffix?: string; tone?: "default" | "danger" | "success" }) {
  const color = tone === "danger" ? lightColors.destructive : tone === "success" ? lightColors.success : lightColors.text;
  return <Text style={[styles.amount, { color }]}>{formatMoney(value)} <Text style={styles.suffix}>{suffix}</Text></Text>;
}

export function EmptyState({ icon, title, message, action }: { icon: keyof typeof MaterialIcons.glyphMap; title: string; message: string; action?: ReactNode }) {
  return (
    <View style={styles.state}>
      <MaterialIcons name={icon} size={32} color={lightColors.textMuted} />
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateMessage}>{message}</Text>
      {action}
    </View>
  );
}

export function ErrorState({ message, retry }: { message: string; retry(): void }) {
  return (
    <View accessibilityRole="alert" style={styles.state}>
      <MaterialIcons name="error-outline" size={32} color={lightColors.destructive} />
      <Text style={styles.stateTitle}>Không tải được dữ liệu</Text>
      <Text style={styles.stateMessage}>{message}</Text>
      <Pressable accessibilityRole="button" onPress={retry} style={styles.retry}><Text style={styles.retryText}>Thử lại</Text></Pressable>
    </View>
  );
}

export function TextButton({ label, icon, onPress, destructive = false }: { label: string; icon?: keyof typeof MaterialIcons.glyphMap; onPress(): void; destructive?: boolean }) {
  const color = destructive ? lightColors.destructive : lightColors.primary;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.textButton, pressed && { opacity: 0.65 }]}>
      {icon ? <MaterialIcons name={icon} size={20} color={color} /> : null}
      <Text style={[styles.textButtonLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing[3] },
  title: { flex: 1, color: lightColors.text, fontSize: typography.size.heading, fontWeight: "800" },
  surface: { borderRadius: radii.card, borderWidth: 1, borderColor: lightColors.border, backgroundColor: lightColors.surface, padding: spacing[4] },
  amount: { fontSize: 30, fontWeight: "800", fontVariant: ["tabular-nums"] },
  suffix: { fontSize: typography.size.body, color: lightColors.textMuted, fontWeight: "600" },
  state: { alignItems: "center", justifyContent: "center", gap: spacing[2], paddingVertical: spacing[12], paddingHorizontal: spacing[6] },
  stateTitle: { color: lightColors.text, fontSize: typography.size.title, fontWeight: "700", textAlign: "center" },
  stateMessage: { color: lightColors.textMuted, fontSize: typography.size.body, lineHeight: 24, textAlign: "center" },
  retry: { minHeight: 48, justifyContent: "center", paddingHorizontal: spacing[4], borderRadius: radii.control, backgroundColor: lightColors.primary },
  retryText: { color: lightColors.onPrimary, fontSize: typography.size.body, fontWeight: "700" },
  textButton: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing[2], paddingHorizontal: spacing[2] },
  textButtonLabel: { fontSize: typography.size.body, fontWeight: "700" },
});
