import { useState } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { ApplyAllocationInput } from "@hu/data";
import { formatMoney, type Jar } from "@hu/domain";
import { lightColors, radii, spacing, typography } from "@hu/design-tokens";
import { FormError, PrimaryButton } from "@/components/auth-form";
import { Surface, TextButton } from "@/components/finance-ui";
import { JarIcon } from "@/components/jar-icon";
import { Screen } from "@/components/screen";
import { amountFromText } from "@/features/finance/model";
import { allocationSummary, clampPct, equalSplit, fillRemainder, formatPct, initialPcts, rebalanceByAmount, toAllocations } from "./model";

const vnd = (value: number) => `${formatMoney(value)} ₫`;

/** Ô nhập % giữ chuỗi đang gõ ("12," chưa thành số) và chỉ hiện lại dạng chuẩn khi rời ô. */
function PercentInput({ label, value, onChange }: { label: string; value: number; onChange(value: number): void }) {
  const [text, setText] = useState<string | null>(null);
  return (
    <TextInput
      accessibilityLabel={label}
      keyboardType="decimal-pad"
      value={text ?? formatPct(value)}
      onChangeText={(next) => {
        setText(next);
        const parsed = Number.parseFloat(next.replace(",", "."));
        if (Number.isFinite(parsed)) onChange(clampPct(parsed));
      }}
      onBlur={() => setText(null)}
      selectTextOnFocus
      style={[styles.input, styles.pct]}
    />
  );
}

export function AllocateForm({ jars, familyContribution, familyJarCount, now, busy, error, applied, onApply, onEdit }: {
  jars: Jar[];
  familyContribution: number;
  familyJarCount: number;
  now: Date;
  busy: boolean;
  error?: string | null;
  applied: boolean;
  onApply(input: ApplyAllocationInput): void;
  onEdit(): void;
}) {
  const currentTotal = jars.reduce((sum, jar) => sum + jar.monthlyBudget, 0);
  const [income, setIncome] = useState(currentTotal + familyContribution);
  const [pcts, setPcts] = useState(() => initialPcts(jars.map((jar) => jar.monthlyBudget)));
  const incomeForPersonal = Math.max(0, income - familyContribution);
  const shortfall = familyContribution > 0 && income < familyContribution;
  const summary = allocationSummary(pcts, incomeForPersonal);
  const month = now.getMonth() + 1;

  const change = (next: number[]) => { setPcts(next); onEdit(); };

  if (jars.length === 0) {
    return (
      <Screen>
        <View style={styles.empty}>
          <MaterialIcons accessibilityElementsHidden importantForAccessibility="no" name="account-balance-wallet" size={32} color={lightColors.textMuted} />
          <Text style={styles.title}>Chưa có hũ cá nhân nào để chia lương</Text>
          <Text style={styles.muted}>{`Tạo ít nhất một hũ ngân sách cá nhân trước, sau đó quay lại đây để chia lương vào từng hũ.${familyJarCount > 0 ? " Phần đóng góp cho hũ gia đình được quản lý riêng ở mục Gia đình." : ""}`}</Text>
        </View>
      </Screen>
    );
  }

  const tone = summary.over ? styles.bannerDanger : summary.exact ? styles.bannerOk : styles.bannerWarn;
  return (
    <Screen>
      <Text style={styles.muted}>{`Tháng ${month}, ${now.getFullYear()}`}</Text>
      {error ? <FormError>{error}</FormError> : null}
      {shortfall ? <FormError>{`Lương bạn nhập (${vnd(income)}) nhỏ hơn phần đã cam kết góp hũ gia đình (${vnd(familyContribution)}). Kiểm tra lại số lương, hoặc chỉnh mức góp ở mục Gia đình.`}</FormError> : null}
      {applied ? <Text accessibilityRole="alert" style={[styles.banner, styles.bannerOk]}>{`Đã cập nhật ngân sách tháng ${month} cho các hũ.`}</Text> : null}

      <View style={styles.field}>
        <Text style={styles.eyebrow}>Tổng thu nhập tháng này</Text>
        <TextInput accessibilityLabel="Nhập tổng thu nhập" keyboardType="number-pad" value={income ? formatMoney(income) : ""} onChangeText={(text) => { setIncome(amountFromText(text)); onEdit(); }} placeholder="0" placeholderTextColor={lightColors.textMuted} style={styles.income} />
        {familyContribution > 0 ? <Text style={styles.muted}>{`Đã trừ ${vnd(familyContribution)} đóng góp hũ gia đình, còn ${vnd(incomeForPersonal)} để chia cho hũ cá nhân.`}</Text> : null}
      </View>

      <View style={styles.field}>
        <Text style={styles.eyebrow}>Chưa phân bổ</Text>
        <Text style={[styles.left, summary.over && styles.danger, summary.exact && styles.ok]}>{summary.over ? `−${vnd(-summary.leftAmount)}` : vnd(summary.leftAmount)}</Text>
        <Text accessibilityRole="alert" style={[styles.banner, tone]}>{summary.over ? `Vượt thu nhập ${vnd(-summary.leftAmount)}. Giảm một hũ nào đó.` : summary.exact ? "Đã chia hết thu nhập." : `Còn ${vnd(summary.leftAmount)} chưa vào hũ nào.`}</Text>
        <View style={styles.actions}>
          <TextButton label="Chia đều" icon="drag-handle" onPress={() => change(equalSplit(jars.length))} />
          <TextButton label="Chia hết phần dư vào hũ cuối" onPress={() => change(fillRemainder(pcts))} />
        </View>
      </View>

      <View accessibilityLabel="Tỷ lệ phân bổ giữa các hũ" style={styles.shareBar}>
        {pcts.map((value, i) => <View key={jars[i].id} style={{ width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: jars[i].color }} />)}
      </View>

      {jars.map((jar, i) => (
        <Surface key={jar.id} style={styles.row}>
          <View style={styles.name}><JarIcon icon={jar.icon} color={jar.color} size={20} isSavings={jar.isSavings} /><Text numberOfLines={1} style={styles.jarName}>{jar.name}</Text></View>
          <View style={styles.controls}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Giảm tỷ lệ ${jar.name}`} onPress={() => change(pcts.map((value, index) => (index === i ? clampPct(Math.round(value) - 1) : value)))} style={styles.step}><MaterialIcons accessibilityElementsHidden importantForAccessibility="no" name="remove" size={20} color={lightColors.primary} /></Pressable>
            <PercentInput label={`Tỷ lệ phần trăm cho ${jar.name}`} value={pcts[i]} onChange={(value) => change(pcts.map((current, index) => (index === i ? value : current)))} />
            <Text style={styles.suffix}>%</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`Tăng tỷ lệ ${jar.name}`} onPress={() => change(pcts.map((value, index) => (index === i ? clampPct(Math.round(value) + 1) : value)))} style={styles.step}><MaterialIcons accessibilityElementsHidden importantForAccessibility="no" name="add" size={20} color={lightColors.primary} /></Pressable>
          </View>
          <TextInput accessibilityLabel={`Sửa số tiền cho ${jar.name}`} keyboardType="number-pad" value={formatMoney(Math.round((incomeForPersonal * pcts[i]) / 100))} onChangeText={(text) => change(rebalanceByAmount(pcts, i, amountFromText(text), incomeForPersonal))} style={[styles.input, styles.amount]} />
        </Surface>
      ))}
      <Text style={styles.muted}>Sửa số tiền của một hũ thì các hũ khác tự chia lại phần thiếu/dư.</Text>

      <PrimaryButton disabled={busy || shortfall} onPress={() => onApply({ income, allocations: toAllocations(jars, pcts, incomeForPersonal) })}>{busy ? "Đang áp dụng…" : `Áp dụng cho tháng ${month}`}</PrimaryButton>
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: "center", gap: spacing[3], paddingVertical: spacing[12] },
  title: { color: lightColors.text, fontSize: typography.size.title, fontWeight: "800", textAlign: "center" },
  muted: { color: lightColors.textMuted, fontSize: typography.size.caption, lineHeight: 20 },
  field: { gap: spacing[2] },
  eyebrow: { color: lightColors.textMuted, fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  income: { minHeight: 56, borderBottomWidth: 2, borderBottomColor: lightColors.primary, color: lightColors.text, fontSize: 30, fontWeight: "800", fontVariant: ["tabular-nums"] },
  left: { color: lightColors.text, fontSize: 30, fontWeight: "800", fontVariant: ["tabular-nums"] },
  danger: { color: lightColors.destructive },
  ok: { color: lightColors.success },
  banner: { padding: spacing[3], borderRadius: radii.control, fontSize: typography.size.body, lineHeight: 22 },
  bannerDanger: { color: lightColors.destructive, backgroundColor: "#FDECEA" },
  bannerOk: { color: lightColors.success, backgroundColor: "#E4F0EA" },
  bannerWarn: { color: lightColors.warning, backgroundColor: "#FBF1DD" },
  actions: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing[2] },
  shareBar: { height: 14, flexDirection: "row", gap: 1, overflow: "hidden", borderRadius: radii.pill, backgroundColor: lightColors.surfaceSubtle },
  row: { gap: spacing[3], padding: spacing[3] },
  name: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  jarName: { flex: 1, color: lightColors.text, fontSize: typography.size.body, fontWeight: "700" },
  controls: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  step: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: radii.control, borderWidth: 1, borderColor: lightColors.border },
  input: { minHeight: 48, borderWidth: 1, borderColor: lightColors.border, borderRadius: radii.control, backgroundColor: lightColors.surface, color: lightColors.text, fontSize: typography.size.bodyLarge, paddingHorizontal: spacing[3], fontVariant: ["tabular-nums"] },
  pct: { width: 84, textAlign: "center" },
  suffix: { color: lightColors.textMuted, fontSize: typography.size.body },
  amount: { fontWeight: "800", textAlign: "right" },
});
