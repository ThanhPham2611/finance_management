import { useState } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { formatMoney } from "@hu/domain";
import { lightColors, radii, spacing, typography } from "@hu/design-tokens";
import { amountFromText } from "@/features/finance/model";
import { Chip, TextButton } from "./finance-ui";

const QUICK_AMOUNTS = [500_000, 1_000_000, 1_600_000];

type Row = { id: number; label: string; amount: number };

let rowCounter = 0;
const newRow = (amount = 0): Row => ({ id: ++rowCounter, label: "", amount });

/**
 * Ô nhập ngân sách có thêm chế độ "cộng từ từng khoản nhỏ" (gạo 500k, thịt cá 300k, …) cho người chưa biết tổng.
 * Các khoản nhỏ không được lưu; chỉ tổng của chúng được báo lên qua `onChange`.
 */
export function BudgetField({ value, onChange, label = "Nhập số tiền khác" }: { value: number; onChange(amount: number): void; label?: string }) {
  const [mode, setMode] = useState<"single" | "breakdown">("single");
  const [rows, setRows] = useState<Row[]>(() => [newRow()]);
  const sum = (list: Row[]) => list.reduce((total, row) => total + row.amount, 0);

  function commit(next: Row[]) {
    const safe = next.length ? next : [newRow()];
    setRows(safe);
    onChange(sum(safe));
  }

  if (mode === "breakdown") {
    return (
      <View style={styles.root}>
        <Text style={styles.big}>{formatMoney(sum(rows))} ₫</Text>
        <Text style={styles.muted}>Tổng {rows.length} khoản</Text>
        {rows.map((row) => (
          <View key={row.id} style={styles.row}>
            <TextInput accessibilityLabel="Tên khoản" value={row.label} onChangeText={(text) => commit(rows.map((item) => (item.id === row.id ? { ...item, label: text } : item)))} placeholder="Khoản, ví dụ: Gạo" placeholderTextColor={lightColors.textMuted} style={[styles.input, styles.grow]} />
            <TextInput accessibilityLabel="Số tiền khoản này" keyboardType="number-pad" value={row.amount ? formatMoney(row.amount) : ""} onChangeText={(text) => commit(rows.map((item) => (item.id === row.id ? { ...item, amount: amountFromText(text) } : item)))} placeholder="0" placeholderTextColor={lightColors.textMuted} style={[styles.input, styles.amount]} />
            <Pressable accessibilityRole="button" accessibilityLabel="Xóa khoản" onPress={() => commit(rows.filter((item) => item.id !== row.id))} style={styles.remove}><MaterialIcons accessibilityElementsHidden importantForAccessibility="no" name="close" size={18} color={lightColors.textMuted} /></Pressable>
          </View>
        ))}
        <View style={styles.row}>
          <TextButton label="Thêm khoản" icon="add" onPress={() => setRows((list) => [...list, newRow()])} />
          <TextButton label="Nhập một số duy nhất" onPress={() => { onChange(sum(rows)); setMode("single"); }} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Text style={styles.big}>{formatMoney(value)} ₫</Text>
      <View style={styles.chips}>
        {QUICK_AMOUNTS.map((amount) => <Chip key={amount} label={formatMoney(amount)} selected={value === amount} onPress={() => onChange(amount)} />)}
      </View>
      <TextInput accessibilityLabel={label} keyboardType="number-pad" value={value ? formatMoney(value) : ""} onChangeText={(text) => onChange(amountFromText(text))} placeholder="0" placeholderTextColor={lightColors.textMuted} style={styles.input} />
      <TextButton label="Chưa biết rõ tổng? Cộng từ từng khoản nhỏ" onPress={() => { setRows([newRow(value)]); setMode("breakdown"); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing[2] },
  big: { color: lightColors.text, fontSize: 30, fontWeight: "800", fontVariant: ["tabular-nums"] },
  muted: { color: lightColors.textMuted, fontSize: typography.size.caption },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
  row: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  grow: { flex: 1 },
  amount: { width: 120 },
  input: { minHeight: 48, borderWidth: 1, borderColor: lightColors.border, borderRadius: radii.control, backgroundColor: lightColors.surface, color: lightColors.text, fontSize: typography.size.bodyLarge, paddingHorizontal: spacing[3] },
  remove: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: radii.control, borderWidth: 1, borderColor: lightColors.border },
});
