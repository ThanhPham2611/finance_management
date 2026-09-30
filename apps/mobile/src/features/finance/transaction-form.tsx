import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { formatMoney, type Jar, type TransactionType } from "@hu/domain";
import { FormError, PrimaryButton } from "@/components/auth-form";
import { Screen } from "@/components/screen";
import { amountFromText } from "./model";
import { lightColors, radii, spacing, typography } from "@hu/design-tokens";

export type TransactionDraft = { jarId: string; amount: number; note: string; type: TransactionType };

export function TransactionForm({ jars, initial, submitLabel, busy, serverError, footer, onSubmit }: { jars: Jar[]; initial?: TransactionDraft; submitLabel: string; busy: boolean; serverError?: string | null; footer?: ReactNode; onSubmit(value: TransactionDraft): void }) {
  const [draft, setDraft] = useState<TransactionDraft>(initial ?? { jarId: jars[0]?.id ?? "", amount: 0, note: "", type: "expense" });
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!draft.jarId) return setError("Chọn một hũ trước khi lưu.");
    if (draft.amount <= 0) return setError("Số tiền phải lớn hơn 0.");
    setError(null);
    onSubmit({ ...draft, note: draft.note.trim() });
  }

  return (
    <Screen>
      {error || serverError ? <FormError>{error ?? serverError}</FormError> : null}
      <View style={styles.segment}>
        {(["expense", "deposit"] as const).map((type) => (
          <Pressable key={type} accessibilityRole="radio" accessibilityState={{ selected: draft.type === type }} onPress={() => setDraft((value) => ({ ...value, type }))} style={[styles.segmentButton, draft.type === type && styles.segmentActive]}>
            <Text style={[styles.segmentText, draft.type === type && styles.segmentTextActive]}>{type === "expense" ? "Chi tiêu" : "Nạp tiền"}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Số tiền</Text>
        <TextInput accessibilityLabel="Số tiền" keyboardType="number-pad" value={draft.amount ? formatMoney(draft.amount) : ""} onChangeText={(value) => setDraft((current) => ({ ...current, amount: amountFromText(value) }))} placeholder="0" placeholderTextColor={lightColors.textMuted} style={styles.amountInput} />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Chọn hũ</Text>
        <View style={styles.jarGrid}>
          {jars.map((jar) => (
            <Pressable key={jar.id} accessibilityRole="radio" accessibilityState={{ selected: draft.jarId === jar.id }} onPress={() => setDraft((value) => ({ ...value, jarId: jar.id }))} style={[styles.jarChoice, draft.jarId === jar.id && styles.jarChoiceActive]}>
              <View style={[styles.dot, { backgroundColor: jar.color }]} />
              <Text numberOfLines={1} style={styles.jarText}>{jar.name}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Ghi chú</Text>
        <TextInput accessibilityLabel="Ghi chú" value={draft.note} onChangeText={(note) => setDraft((value) => ({ ...value, note }))} placeholder="Ví dụ: Ăn trưa" placeholderTextColor={lightColors.textMuted} style={styles.input} />
      </View>
      <PrimaryButton disabled={busy} onPress={submit}>{busy ? "Đang lưu…" : submitLabel}</PrimaryButton>
      {footer}
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing[2] },
  label: { color: lightColors.text, fontSize: typography.size.body, fontWeight: "700" },
  input: { minHeight: 48, borderWidth: 1, borderColor: lightColors.border, borderRadius: radii.control, backgroundColor: lightColors.surface, color: lightColors.text, fontSize: typography.size.body, paddingHorizontal: spacing[3] },
  amountInput: { minHeight: 64, borderBottomWidth: 2, borderBottomColor: lightColors.primary, color: lightColors.text, fontSize: 34, fontWeight: "800", fontVariant: ["tabular-nums"] },
  segment: { flexDirection: "row", padding: spacing[1], borderRadius: radii.control, backgroundColor: lightColors.surfaceSubtle },
  segmentButton: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: radii.control },
  segmentActive: { backgroundColor: lightColors.primary },
  segmentText: { color: lightColors.textMuted, fontSize: typography.size.body, fontWeight: "700" },
  segmentTextActive: { color: lightColors.onPrimary },
  jarGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
  jarChoice: { minHeight: 48, maxWidth: "48%", flexDirection: "row", alignItems: "center", gap: spacing[2], borderWidth: 1, borderColor: lightColors.border, borderRadius: radii.control, backgroundColor: lightColors.surface, paddingHorizontal: spacing[3] },
  jarChoiceActive: { borderWidth: 2, borderColor: lightColors.primary },
  dot: { width: 10, height: 10, borderRadius: 5 },
  jarText: { flexShrink: 1, color: lightColors.text, fontSize: typography.size.body },
});
