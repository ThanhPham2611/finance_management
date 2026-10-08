import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { formatMoney, vietnamToday, type Jar, type TransactionSuggestion, type TransactionType } from "@hu/domain";
import { FormError, PrimaryButton } from "@/components/auth-form";
import { AmountInput } from "@/components/amount-input";
import { DateField } from "@/components/date-field";
import { SegmentedControl } from "@/components/finance-ui";
import { Screen } from "@/components/screen";
import { entryHint, jarBalanceLabel } from "./entry";
import { jarLabel } from "./model";
import { lightColors, radii, spacing, typography } from "@hu/design-tokens";

/** `transactionDate` (YYYY-MM-DD) luôn có sau khi qua form: mặc định hôm nay, người dùng chọn lại được để nhập bù khoản cũ. */
export type TransactionDraft = { jarId: string; amount: number; note: string; type: TransactionType; transactionDate?: string };

const TYPES = [{ id: "expense", label: "Chi tiêu" }, { id: "deposit", label: "Nạp tiền" }] as const;
const HINT_COLOR = { default: lightColors.textMuted, warning: lightColors.warning, danger: lightColors.destructive } as const;

export function TransactionForm({ jars, initial, submitLabel, busy, serverError, footer, autoFocusAmount = false, suggestions = [], onQuickAdd, onSubmit }: { jars: Jar[]; initial?: TransactionDraft; submitLabel: string; busy: boolean; serverError?: string | null; footer?: ReactNode; autoFocusAmount?: boolean; suggestions?: TransactionSuggestion[]; onQuickAdd?(suggestion: TransactionSuggestion, transactionDate: string): void; onSubmit(value: TransactionDraft): void }) {
  const today = vietnamToday();
  const [draft, setDraft] = useState<TransactionDraft>({ jarId: jars[0]?.id ?? "", amount: 0, note: "", type: "expense", ...initial, transactionDate: initial?.transactionDate ?? today });
  const [error, setError] = useState<string | null>(null);
  // Rút tiền khỏi hũ tiết kiệm cần bấm lưu 2 lần; đổi loại/số tiền/hũ thì phải xác nhận lại.
  const [confirmSavings, setConfirmSavings] = useState(false);
  const jar = jars.find((item) => item.id === draft.jarId);
  const withdrawing = draft.type === "expense" && !!jar?.isSavings;
  const inThisMonth = !draft.transactionDate || draft.transactionDate.slice(0, 7) === today.slice(0, 7);
  const hint = jar ? entryHint(jar, draft.amount, draft.type, inThisMonth) : null;
  const quick = onQuickAdd ? suggestions.filter((item) => item.type === draft.type) : [];

  function change(patch: Partial<TransactionDraft>) {
    setDraft((value) => ({ ...value, ...patch }));
    setConfirmSavings(false);
  }

  function submit() {
    if (!jar) return setError("Chọn một hũ trước khi lưu.");
    if (draft.amount <= 0) return setError("Số tiền phải lớn hơn 0.");
    setError(null);
    if (withdrawing && !confirmSavings) return setConfirmSavings(true);
    onSubmit({ ...draft, note: draft.note.trim() });
  }

  return (
    <Screen>
      {error || serverError ? <FormError>{error ?? serverError}</FormError> : null}
      <SegmentedControl label="Loại giao dịch" options={TYPES} value={draft.type} onChange={(type) => change({ type })} />
      {quick.length > 0 ? (
        <View accessibilityLabel="Gợi ý nhập nhanh" style={styles.field}>
          <Text style={styles.label}>Gợi ý — bấm để thêm luôn</Text>
          <View style={styles.jarGrid}>
            {quick.map((item) => {
              const target = jars.find((candidate) => candidate.id === item.jarId);
              if (!target) return null;
              const label = item.note || target.name;
              return (
                <Pressable key={`${item.jarId}-${item.amount}-${item.note}`} accessibilityRole="button" accessibilityLabel={`Thêm nhanh ${label} ${formatMoney(item.amount)} ₫ vào ${target.name}`} disabled={busy} onPress={() => onQuickAdd?.(item, draft.transactionDate ?? today)} style={[styles.chip, busy && styles.chipBusy]}>
                  <View style={[styles.dot, { backgroundColor: target.color }]} />
                  <View style={styles.jarCopy}>
                    <Text numberOfLines={1} style={styles.jarText}>{`${label} · ${formatMoney(item.amount)} ₫`}</Text>
                    {item.note ? <Text numberOfLines={1} style={styles.jarBalance}>{target.name}</Text> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
      <View style={styles.field}>
        <Text accessibilityElementsHidden importantForAccessibility="no" style={styles.label}>Số tiền</Text>
        <AmountInput value={draft.amount} onChange={(amount) => change({ amount })} autoFocus={autoFocusAmount} inputStyle={styles.amountInput} />
        {hint ? <Text style={[styles.hint, { color: HINT_COLOR[hint.tone] }]}>{hint.text}</Text> : null}
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>{draft.type === "deposit" ? "Thu vào hũ nào" : "Chi từ hũ nào"}</Text>
        <View style={styles.jarGrid}>
          {jars.map((item) => (
            <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{ selected: draft.jarId === item.id }} onPress={() => change({ jarId: item.id })} style={[styles.jarChoice, draft.jarId === item.id && styles.jarChoiceActive]}>
              <View style={[styles.dot, { backgroundColor: item.color }]} />
              <View style={styles.jarCopy}>
                <Text numberOfLines={1} style={styles.jarText}>{jarLabel(item)}</Text>
                <Text numberOfLines={1} style={styles.jarBalance}>{jarBalanceLabel(item)}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Ngày</Text>
        <DateField value={draft.transactionDate ?? today} max={today} onChange={(transactionDate) => setDraft((value) => ({ ...value, transactionDate }))} />
      </View>
      <View style={styles.field}>
        <Text accessibilityElementsHidden importantForAccessibility="no" style={styles.label}>Ghi chú</Text>
        <TextInput accessibilityLabel="Ghi chú" value={draft.note} onChangeText={(note) => setDraft((value) => ({ ...value, note }))} placeholder={draft.type === "deposit" ? "Ví dụ: Lương, được cho, bán đồ" : "Ví dụ: Ăn trưa"} placeholderTextColor={lightColors.textMuted} style={styles.input} />
      </View>
      {withdrawing && confirmSavings ? <View accessibilityRole="alert" style={styles.warning}><Text style={styles.warningText}>{`Bạn sắp rút tiền từ hũ tiết kiệm “${jar?.name}”. Bấm nút bên dưới lần nữa để xác nhận, hoặc đổi hũ/số tiền để hủy.`}</Text></View> : null}
      <PrimaryButton disabled={busy} onPress={submit}>{busy ? "Đang lưu…" : withdrawing && confirmSavings ? `Xác nhận rút ${formatMoney(draft.amount)} ₫ từ hũ tiết kiệm` : submitLabel}</PrimaryButton>
      {footer}
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing[2] },
  label: { color: lightColors.text, fontSize: typography.size.body, fontWeight: "700" },
  input: { minHeight: 48, borderWidth: 1, borderColor: lightColors.border, borderRadius: radii.control, backgroundColor: lightColors.surface, color: lightColors.text, fontSize: typography.size.body, paddingHorizontal: spacing[3] },
  amountInput: { minHeight: 64, borderBottomWidth: 2, borderBottomColor: lightColors.primary, color: lightColors.text, fontSize: 34, fontWeight: "800", fontVariant: ["tabular-nums"] },
  hint: { fontSize: typography.size.caption },
  jarGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
  chip: { minHeight: 48, maxWidth: "100%", flexDirection: "row", alignItems: "center", gap: spacing[2], borderWidth: 1, borderColor: lightColors.border, borderRadius: radii.pill, backgroundColor: lightColors.surface, paddingHorizontal: spacing[3], paddingVertical: spacing[1] },
  chipBusy: { opacity: 0.6 },
  jarChoice: { minHeight: 56, maxWidth: "48%", flexDirection: "row", alignItems: "center", gap: spacing[2], borderWidth: 1, borderColor: lightColors.border, borderRadius: radii.control, backgroundColor: lightColors.surface, paddingHorizontal: spacing[3], paddingVertical: spacing[2] },
  jarChoiceActive: { borderWidth: 2, borderColor: lightColors.primary },
  dot: { width: 10, height: 10, borderRadius: 5 },
  jarCopy: { flexShrink: 1, gap: 2 },
  jarText: { color: lightColors.text, fontSize: typography.size.body, fontWeight: "600" },
  jarBalance: { color: lightColors.textMuted, fontSize: 12, fontVariant: ["tabular-nums"] },
  warning: { borderRadius: radii.control, backgroundColor: "#FBF1DD", padding: spacing[3] },
  warningText: { color: lightColors.warning, fontSize: typography.size.body, lineHeight: 22 },
});
