import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, type TextStyle } from "react-native";
import { amountFromExpression, evaluateExpression, formatExpression, formatMoney, isCalculation, sanitizeExpression } from "@hu/domain";
import { lightColors, radii, spacing, typography } from "@hu/design-tokens";

// Bàn phím số của điện thoại không có + − × ÷ và chữ nên phép tính và viết tắt k (nghìn), tr (triệu) nhập bằng hàng nút bên dưới.
const KEYS = [
  { symbol: "+", shown: "+", label: "Dấu +" },
  { symbol: "-", shown: "−", label: "Dấu −" },
  { symbol: "*", shown: "×", label: "Dấu ×" },
  { symbol: "/", shown: "÷", label: "Dấu ÷" },
  { symbol: "k", shown: "k", label: "Nghìn (k)" },
  { symbol: "tr", shown: "tr", label: "Triệu (tr)" },
] as const;

/**
 * Ô số tiền kiểu máy tính: gõ `50000` rồi bấm `×` `2` để ra 100.000, hoặc `50` + `k`, `2` + `tr` + `5`; kết quả hiện ngay bên dưới, nút `=` chốt thành một con số.
 * Số thường vẫn có dấu chấm nghìn. `onChange` luôn nhận số tiền hợp lệ (> 0), còn lại là 0.
 */
export function AmountInput({ value, onChange, label = "Số tiền", autoFocus = false, inputStyle }: { value: number; onChange(amount: number): void; label?: string; autoFocus?: boolean; inputStyle?: TextStyle }) {
  const [text, setText] = useState(value ? String(value) : "");
  const [seen, setSeen] = useState(value);

  // Cha đặt lại số tiền (Nhập tiếp...) thì bỏ luôn biểu thức đang gõ.
  if (value !== seen) {
    setSeen(value);
    if (value !== amountFromExpression(text)) setText(value ? String(value) : "");
  }

  function edit(next: string) {
    const raw = sanitizeExpression(next);
    setText(raw);
    onChange(amountFromExpression(raw));
  }

  const result = evaluateExpression(text);
  const calculating = isCalculation(text);
  const valid = result !== null && result > 0;

  return (
    <View style={styles.root}>
      <TextInput accessibilityLabel={label} autoFocus={autoFocus} keyboardType="number-pad" value={formatExpression(text)} onChangeText={edit} placeholder="0" placeholderTextColor={lightColors.textMuted} style={inputStyle} />
      <View style={styles.keys}>
        {KEYS.map((key) => (
          <Pressable key={key.symbol} accessibilityRole="button" accessibilityLabel={key.label} onPress={() => edit(text + key.symbol)} style={styles.key}>
            <Text style={styles.keyText}>{key.shown}</Text>
          </Pressable>
        ))}
        <Pressable accessibilityRole="button" accessibilityLabel="Dấu =" onPress={() => valid && edit(String(result))} style={styles.key}>
          <Text style={styles.keyText}>=</Text>
        </Pressable>
      </View>
      {calculating ? (
        <Text testID="calc-result" accessibilityLiveRegion="polite" style={[styles.result, !valid && styles.invalid]}>
          {result === null ? "Phép tính chưa hoàn chỉnh" : valid ? `= ${formatMoney(result)} ₫` : "Kết quả phải lớn hơn 0"}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing[2] },
  keys: { flexDirection: "row", gap: spacing[2] },
  key: { flex: 1, minWidth: 0, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: radii.control, borderWidth: 1, borderColor: lightColors.border, backgroundColor: lightColors.surface },
  keyText: { color: lightColors.text, fontSize: 20, fontWeight: "700" },
  result: { color: lightColors.success, fontSize: typography.size.body, fontWeight: "700", fontVariant: ["tabular-nums"] },
  invalid: { color: lightColors.destructive },
});
