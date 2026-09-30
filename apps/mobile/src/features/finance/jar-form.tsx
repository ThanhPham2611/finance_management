import { useState } from "react";
import { StyleSheet, Switch, Text, TextInput, View } from "react-native";
import type { CreateJarInput } from "@hu/domain";
import { formatMoney } from "@hu/domain";
import { AuthField, FormError, PrimaryButton } from "@/components/auth-form";
import { Screen } from "@/components/screen";
import { amountFromText } from "./model";
import { lightColors, radii, spacing, typography } from "@hu/design-tokens";

export type JarDraft = Required<Pick<CreateJarInput, "name" | "monthlyBudget" | "icon" | "color" | "alertAt80" | "rollover" | "isSavings">>;

const EMPTY_JAR: JarDraft = {
  name: "",
  monthlyBudget: 0,
  icon: "wallet",
  color: "#174C3C",
  alertAt80: true,
  rollover: false,
  isSavings: false,
};

export function JarForm({ initial = EMPTY_JAR, submitLabel, busy, serverError, onSubmit }: { initial?: JarDraft; submitLabel: string; busy: boolean; serverError?: string | null; onSubmit(value: JarDraft): void }) {
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
        <Text style={styles.label}>Ngân sách mỗi tháng</Text>
        <TextInput
          accessibilityLabel="Ngân sách mỗi tháng"
          keyboardType="number-pad"
          value={draft.monthlyBudget ? formatMoney(draft.monthlyBudget) : ""}
          onChangeText={(value) => setDraft((current) => ({ ...current, monthlyBudget: amountFromText(value) }))}
          placeholder="0"
          placeholderTextColor={lightColors.textMuted}
          style={styles.input}
        />
      </View>
      <ToggleRow label="Hũ tiết kiệm" hint="Tách khỏi tiền có thể chi và luôn cộng dồn." value={draft.isSavings} onChange={(isSavings) => setDraft((current) => ({ ...current, isSavings }))} />
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

function ToggleRow({ label, hint, value, onChange }: { label: string; hint: string; value: boolean; onChange(value: boolean): void }) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleCopy}><Text style={styles.label}>{label}</Text><Text style={styles.hint}>{hint}</Text></View>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: lightColors.border, true: lightColors.primary }} />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing[2] },
  label: { color: lightColors.text, fontSize: typography.size.body, fontWeight: "700" },
  hint: { color: lightColors.textMuted, fontSize: typography.size.caption, lineHeight: 19 },
  input: { minHeight: 48, borderWidth: 1, borderColor: lightColors.border, borderRadius: radii.control, backgroundColor: lightColors.surface, color: lightColors.text, fontSize: typography.size.bodyLarge, paddingHorizontal: spacing[3] },
  toggleRow: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: spacing[4], paddingVertical: spacing[2] },
  toggleCopy: { flex: 1, gap: spacing[1] },
});
