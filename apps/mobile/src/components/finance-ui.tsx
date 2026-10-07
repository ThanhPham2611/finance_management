import type { PropsWithChildren, ReactNode } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
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
      <MaterialIcons accessibilityElementsHidden importantForAccessibility="no" name={icon} size={32} color={lightColors.textMuted} />
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateMessage}>{message}</Text>
      {action}
    </View>
  );
}

export function ErrorState({ message, retry }: { message: string; retry(): void }) {
  return (
    <View accessibilityRole="alert" style={styles.state}>
      <MaterialIcons accessibilityElementsHidden importantForAccessibility="no" name="error-outline" size={32} color={lightColors.destructive} />
      <Text style={styles.stateTitle}>Không tải được dữ liệu</Text>
      <Text style={styles.stateMessage}>{message}</Text>
      <Pressable accessibilityRole="button" onPress={retry} style={styles.retry}><Text style={styles.retryText}>Thử lại</Text></Pressable>
    </View>
  );
}

export function TextButton({ label, icon, onPress, destructive = false }: { label: string; icon?: keyof typeof MaterialIcons.glyphMap; onPress(): void; destructive?: boolean }) {
  const color = destructive ? lightColors.destructive : lightColors.primary;
  return (
    // accessibilityLabel tường minh: nếu không, ký tự glyph của icon bị đọc lẫn vào tên nút ("\ue145, Ghi giao dịch").
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.textButton, pressed && { opacity: 0.65 }]}>
      {icon ? <MaterialIcons name={icon} size={20} color={color} accessibilityElementsHidden importantForAccessibility="no" /> : null}
      <Text style={[styles.textButtonLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

/** Nhóm nút chọn 1 trong N (radio) dạng thanh phân đoạn. */
export function SegmentedControl<T extends string>({ options, value, onChange, label }: { options: readonly { id: T; label: string }[]; value: T; onChange(id: T): void; label: string }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.segment}>
      {options.map((option) => (
        <Pressable key={option.id} accessibilityRole="radio" accessibilityState={{ selected: option.id === value }} onPress={() => onChange(option.id)} style={[styles.segmentButton, option.id === value && styles.segmentActive]}>
          <Text style={[styles.segmentText, option.id === value && styles.segmentTextActive]}>{option.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function ToggleRow({ label, hint, value, onChange }: { label: string; hint: string; value: boolean; onChange(value: boolean): void }) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleCopy}><Text style={styles.toggleLabel}>{label}</Text><Text style={styles.toggleHint}>{hint}</Text></View>
      <Switch accessibilityLabel={label} value={value} onValueChange={onChange} trackColor={{ false: lightColors.border, true: lightColors.primary }} />
    </View>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress(): void }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected }} onPress={onPress} style={[styles.chip, selected && styles.chipActive]}>
      <Text numberOfLines={1} style={[styles.chipText, selected && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toggleRow: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: spacing[4], paddingVertical: spacing[2] },
  toggleCopy: { flex: 1, gap: spacing[1] },
  toggleLabel: { color: lightColors.text, fontSize: typography.size.body, fontWeight: "700" },
  toggleHint: { color: lightColors.textMuted, fontSize: typography.size.caption, lineHeight: 19 },
  segment: { flexDirection: "row", padding: spacing[1], borderRadius: radii.control, backgroundColor: lightColors.surfaceSubtle },
  segmentButton: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: radii.control },
  segmentActive: { backgroundColor: lightColors.primary },
  segmentText: { color: lightColors.textMuted, fontSize: typography.size.body, fontWeight: "700" },
  segmentTextActive: { color: lightColors.onPrimary },
  chip: { minHeight: 40, maxWidth: 200, justifyContent: "center", paddingHorizontal: spacing[3], borderRadius: radii.pill, borderWidth: 1, borderColor: lightColors.border, backgroundColor: lightColors.surface },
  chipActive: { borderColor: lightColors.primary, backgroundColor: lightColors.primary },
  chipText: { color: lightColors.text, fontSize: typography.size.caption, fontWeight: "600" },
  chipTextActive: { color: lightColors.onPrimary },
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
