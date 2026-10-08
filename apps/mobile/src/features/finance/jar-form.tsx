import { useState } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { CreateJarInput } from "@hu/domain";
import { formatMoney, JAR_COLORS } from "@hu/domain";
import { AuthField, FormError, PrimaryButton } from "@/components/auth-form";
import { BudgetField } from "@/components/budget-field";
import { ToggleRow } from "@/components/finance-ui";
import { Screen } from "@/components/screen";
import { lightColors, radii, spacing, typography } from "@hu/design-tokens";

export type JarDraft = Required<Pick<CreateJarInput, "name" | "monthlyBudget" | "icon" | "color" | "alertAt80" | "rollover" | "isSavings">>;

export const SAVINGS_EXPLANATION = "Hũ tiết kiệm hiện “Đã tiết kiệm được” thay vì “Còn được chi”, luôn cộng dồn qua các tháng, tắt cảnh báo 80% và không tính vào tổng “Còn lại” ở trang chủ. Ghi khoản chi vào hũ này sẽ luôn được hỏi xác nhận vì đó coi như rút tiền tiết kiệm.";

const EMPTY_JAR: JarDraft = {
  name: "",
  monthlyBudget: 0,
  icon: "wallet",
  color: "#174C3C",
  alertAt80: true,
  rollover: false,
  isSavings: false,
};

/** `shared`: hũ gia đình — ngân sách tự tính từ phần đóng góp của các thành viên nên chỉ đọc, và không đổi thành hũ tiết kiệm. */
export function JarForm({ initial = EMPTY_JAR, shared = false, submitLabel, busy, serverError, onSubmit }: { initial?: JarDraft; shared?: boolean; submitLabel: string; busy: boolean; serverError?: string | null; onSubmit(value: JarDraft): void }) {
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!draft.name.trim()) return setError("Cần đặt tên cho hũ.");
    setError(null);
    onSubmit({
      ...draft,
      name: draft.name.trim(),
      icon: draft.isSavings ? "savings" : draft.icon,
      alertAt80: draft.isSavings ? false : draft.alertAt80,
      rollover: draft.isSavings ? true : draft.rollover,
    });
  }

  return (
    <Screen>
      {error || serverError ? <FormError>{error ?? serverError}</FormError> : null}
      <AuthField label="Tên hũ" value={draft.name} onChangeText={(name) => setDraft((value) => ({ ...value, name }))} />
      <View style={styles.field}>
        <Text style={styles.label}>Màu hũ</Text>
        <View accessibilityRole="radiogroup" accessibilityLabel="Màu hũ" style={styles.swatches}>
          {JAR_COLORS.map((color) => {
            const selected = color.toUpperCase() === draft.color.toUpperCase();
            return (
              <Pressable key={color} accessibilityRole="radio" accessibilityLabel={`Màu ${color}`} accessibilityState={{ selected }} onPress={() => setDraft((value) => ({ ...value, color }))} style={[styles.swatch, { backgroundColor: color }, selected && styles.swatchActive]}>
                {selected ? <MaterialIcons accessibilityElementsHidden importantForAccessibility="no" name="check" size={16} color="#FFFFFF" /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Ngân sách mỗi tháng</Text>
        {shared ? (
          <>
            <Text style={styles.readOnly}>{formatMoney(draft.monthlyBudget)} ₫</Text>
            <Text style={styles.hint}>Đây là hũ gia đình: ngân sách tự tính từ phần đóng góp của các thành viên, chỉnh ở mục Gia đình.</Text>
          </>
        ) : (
          <BudgetField label="Ngân sách mỗi tháng" value={draft.monthlyBudget} onChange={(monthlyBudget) => setDraft((current) => ({ ...current, monthlyBudget }))} />
        )}
      </View>
      {!shared ? <ToggleRow label="Hũ tiết kiệm" hint="Tích lũy dần qua các tháng, tách khỏi tiền có thể chi." value={draft.isSavings} onChange={(isSavings) => setDraft((current) => ({ ...current, isSavings }))} /> : null}
      {draft.isSavings && !shared ? <Text style={styles.info}>{SAVINGS_EXPLANATION}</Text> : null}
      {!draft.isSavings ? (
        <>
          <ToggleRow label="Cảnh báo ở 80%" hint="Nhắc khi hũ gần hết ngân sách." value={draft.alertAt80} onChange={(alertAt80) => setDraft((current) => ({ ...current, alertAt80 }))} />
          <ToggleRow label="Cộng dồn sang tháng sau" hint="Giữ lại phần ngân sách chưa dùng." value={draft.rollover} onChange={(rollover) => setDraft((current) => ({ ...current, rollover }))} />
        </>
      ) : null}
      <PrimaryButton disabled={busy} onPress={submit}>{busy ? "Đang lưu…" : submitLabel}</PrimaryButton>
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing[2] },
  label: { color: lightColors.text, fontSize: typography.size.body, fontWeight: "700" },
  swatches: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
  swatch: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 18, borderWidth: 2, borderColor: "transparent" },
  swatchActive: { borderColor: lightColors.text },
  hint: { color: lightColors.textMuted, fontSize: typography.size.caption, lineHeight: 19 },
  readOnly: { color: lightColors.text, fontSize: 28, fontWeight: "800", fontVariant: ["tabular-nums"] },
  info: { color: lightColors.success, backgroundColor: "#E4F0EA", borderRadius: radii.control, padding: spacing[3], fontSize: typography.size.caption, lineHeight: 20 },
});
