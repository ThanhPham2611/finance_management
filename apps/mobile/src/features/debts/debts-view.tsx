import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { DebtWithPayments } from "@hu/data";
import { calculateDebtProgress, formatMoney, summarizeDebts, type DebtProgress } from "@hu/domain";
import { lightColors, radii, spacing, typography } from "@hu/design-tokens";
import { FormError, PrimaryButton } from "@/components/auth-form";
import { DateField } from "@/components/date-field";
import { EmptyState, Surface, TextButton } from "@/components/finance-ui";
import { Screen } from "@/components/screen";
import { useAddDebtPayment, useArchiveDebt, useCreateDebt, useDeleteDebtPayment } from "@/features/finance/hooks";
import { amountFromText } from "@/features/finance/model";
import { ReminderLine } from "./reminder-line";

const vnd = (value: number) => `${formatMoney(value)} ₫`;
const dmy = (ymd: string) => ymd.split("-").reverse().join("/");

export function DebtsView({ debts, today }: { debts: DebtWithPayments[]; today: string }) {
  const [adding, setAdding] = useState(debts.length === 0);
  const summary = summarizeDebts(debts.map((debt) => ({ debt, payments: debt.payments })), today);

  return (
    <Screen>
      <Text style={styles.muted}>Trả góp, vay người quen… theo dõi riêng, không trừ vào hũ nào.</Text>
      {debts.length > 0 ? (
        <View style={styles.summary}>
          <Surface style={styles.summaryCard}><Text style={styles.eyebrow}>Tổng còn nợ</Text><Text style={styles.summaryValue}>{vnd(summary.remaining)}</Text></Surface>
          <Surface style={styles.summaryCard}><Text style={styles.eyebrow}>Cần trả mỗi tháng</Text><Text style={styles.summaryValue}>{vnd(summary.monthlyNeeded)}</Text></Surface>
        </View>
      ) : null}
      <TextButton label={adding ? "Đóng" : "Thêm khoản nợ"} icon={adding ? "close" : "add"} onPress={() => setAdding((value) => !value)} />
      {adding ? <AddDebtForm today={today} onDone={() => setAdding(false)} /> : null}
      {debts.length === 0 && !adding ? <EmptyState icon="payments" title="Chưa có khoản nợ nào" message="Thêm một khoản trả góp hoặc khoản vay để biết mỗi tháng cần dành bao nhiêu." /> : null}
      {debts.map((debt) => <DebtCard key={debt.id} debt={debt} progress={calculateDebtProgress(debt, debt.payments, today)} today={today} />)}
    </Screen>
  );
}

function AddDebtForm({ today, onDone }: { today: string; onDone(): void }) {
  const create = useCreateDebt();
  const [name, setName] = useState("");
  const [principal, setPrincipal] = useState(0);
  const [months, setMonths] = useState("12");
  const [startDate, setStartDate] = useState(today);
  const termMonths = Math.trunc(Number(months)) || 0;

  return (
    <Surface style={styles.form}>
      {create.error ? <FormError>{create.error.message}</FormError> : null}
      <View style={styles.field}>
        <Text accessibilityElementsHidden importantForAccessibility="no" style={styles.label}>Tên khoản nợ</Text>
        <TextInput accessibilityLabel="Tên khoản nợ" value={name} onChangeText={setName} placeholder="Trả góp iPhone, Nợ anh A…" placeholderTextColor={lightColors.textMuted} style={styles.input} />
      </View>
      <View style={styles.field}>
        <Text accessibilityElementsHidden importantForAccessibility="no" style={styles.label}>Tổng số tiền phải trả (gồm cả lãi nếu có)</Text>
        <TextInput accessibilityLabel="Tổng số tiền phải trả" keyboardType="number-pad" value={principal ? formatMoney(principal) : ""} onChangeText={(text) => setPrincipal(amountFromText(text))} placeholder="0" placeholderTextColor={lightColors.textMuted} style={styles.input} />
      </View>
      <View style={styles.field}>
        <Text accessibilityElementsHidden importantForAccessibility="no" style={styles.label}>Dự kiến trả trong (tháng)</Text>
        <TextInput accessibilityLabel="Số tháng dự kiến trả" keyboardType="number-pad" value={months} onChangeText={(text) => setMonths(text.replace(/\D/g, ""))} style={styles.input} />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Bắt đầu từ</Text>
        <DateField label="Ngày bắt đầu" value={startDate} onChange={setStartDate} />
      </View>
      {principal > 0 && termMonths > 0 ? <Text style={styles.muted}>{`Trả đều khoảng ${vnd(Math.ceil(principal / termMonths))} mỗi tháng.`}</Text> : null}
      <PrimaryButton disabled={create.isPending || !name.trim() || !principal || !termMonths} onPress={() => create.mutate({ name, principal, termMonths, startDate }, { onSuccess: onDone })}>{create.isPending ? "Đang lưu…" : "Lưu khoản nợ"}</PrimaryButton>
    </Surface>
  );
}

function DebtCard({ debt, progress, today }: { debt: DebtWithPayments; progress: DebtProgress; today: string }) {
  const add = useAddDebtPayment();
  const remove = useDeleteDebtPayment();
  const archive = useArchiveDebt();
  const [amount, setAmount] = useState(0);
  const [paidOn, setPaidOn] = useState(today);
  const [showHistory, setShowHistory] = useState(false);
  const { status } = progress;
  const failure = add.error ?? remove.error ?? archive.error;

  function confirmArchive() {
    Alert.alert(`Bỏ khoản nợ “${debt.name}”?`, "Khoản này sẽ biến khỏi danh sách, lịch sử trả vẫn được giữ lại.", [
      { text: "Hủy", style: "cancel" },
      { text: "Bỏ khoản này", style: "destructive", onPress: () => archive.mutate(debt.id) },
    ]);
  }

  return (
    <Surface style={styles.card}>
      <View style={styles.titleRow}>
        <View style={styles.flex}>
          <Text numberOfLines={2} style={styles.name}>{debt.name}</Text>
          <Text style={styles.muted}>{`Tổng ${vnd(debt.principal)} · ${debt.termMonths} tháng · hạn ${dmy(progress.dueDate)}`}</Text>
        </View>
        {status === "paid" ? <Text style={[styles.badge, styles.badgeOk]}>ĐÃ TẤT TOÁN</Text> : null}
        {status === "overdue" ? <Text style={[styles.badge, styles.badgeLate]}>QUÁ HẠN</Text> : null}
      </View>

      <View accessibilityLabel={`Đã trả ${progress.pct}%`} style={styles.track}><View style={[styles.fill, { width: `${progress.pct}%`, backgroundColor: status === "overdue" ? lightColors.destructive : lightColors.primary }]} /></View>
      <View style={styles.splitRow}>
        <Text style={styles.muted}>{`Đã trả ${vnd(progress.paid)} (${progress.pct}%)`}</Text>
        <Text style={styles.muted}>{`Còn ${vnd(progress.remaining)}`}</Text>
      </View>

      {progress.reminder ? <ReminderLine reminder={progress.reminder} /> : null}
      {status === "active" ? (
        <Text style={styles.plan}>{`Mỗi tháng cần trả ${vnd(progress.monthlyNeeded)} · còn ${progress.monthsLeft} tháng${progress.monthlyNeeded > progress.plannedMonthly ? ` (kế hoạch ban đầu ${vnd(progress.plannedMonthly)} — đang chậm)` : ""}`}</Text>
      ) : null}

      {status !== "paid" ? (
        <View style={styles.pay}>
          <TextInput accessibilityLabel={`Số tiền vừa trả cho ${debt.name}`} keyboardType="number-pad" value={amount ? formatMoney(amount) : ""} onChangeText={(text) => setAmount(amountFromText(text))} placeholder={formatMoney(progress.monthlyNeeded)} placeholderTextColor={lightColors.textMuted} style={styles.input} />
          <View style={styles.splitRow}>
            <DateField label={`Ngày trả ${debt.name}`} value={paidOn} max={today} onChange={setPaidOn} />
            <TextButton label="Trả đủ kỳ này" onPress={() => setAmount(progress.monthlyNeeded)} />
          </View>
          <PrimaryButton disabled={add.isPending || !amount} onPress={() => add.mutate({ debtId: debt.id, amount, paidOn }, { onSuccess: () => setAmount(0) })}>{add.isPending ? "Đang lưu…" : "Ghi nhận trả nợ"}</PrimaryButton>
        </View>
      ) : null}

      {failure ? <FormError>{failure.message}</FormError> : null}

      {debt.payments.length > 0 ? <TextButton label={`${showHistory ? "Ẩn" : "Xem"} lịch sử trả (${debt.payments.length})`} icon={showHistory ? "expand-less" : "expand-more"} onPress={() => setShowHistory((value) => !value)} /> : null}
      {showHistory ? debt.payments.map((payment) => (
        <View key={payment.id} style={styles.payment}>
          <Text style={[styles.muted, styles.flex]}>{dmy(payment.paidOn)}</Text>
          <Text style={styles.paymentAmount}>{vnd(payment.amount)}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={`Xóa lần trả ${vnd(payment.amount)} ngày ${dmy(payment.paidOn)}`} disabled={remove.isPending} onPress={() => remove.mutate(payment.id)} style={styles.removeBox}><Text style={styles.remove}>Xóa</Text></Pressable>
        </View>
      )) : null}
      <TextButton label="Bỏ khoản này" icon="delete-outline" destructive onPress={confirmArchive} />
    </Surface>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  muted: { color: lightColors.textMuted, fontSize: typography.size.caption, lineHeight: 19 },
  summary: { flexDirection: "row", gap: spacing[3] },
  summaryCard: { flex: 1, gap: spacing[1], padding: spacing[3] },
  eyebrow: { color: lightColors.textMuted, fontSize: 10, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  summaryValue: { color: lightColors.text, fontSize: typography.size.title, fontWeight: "800", fontVariant: ["tabular-nums"] },
  form: { gap: spacing[3] },
  field: { gap: spacing[2] },
  label: { color: lightColors.text, fontSize: typography.size.body, fontWeight: "700" },
  input: { minHeight: 48, borderWidth: 1, borderColor: lightColors.border, borderRadius: radii.control, backgroundColor: lightColors.surface, color: lightColors.text, fontSize: typography.size.body, paddingHorizontal: spacing[3] },
  card: { gap: spacing[3] },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing[2] },
  name: { color: lightColors.text, fontSize: typography.size.bodyLarge, fontWeight: "800" },
  badge: { borderRadius: radii.pill, paddingHorizontal: spacing[2], paddingVertical: 3, fontSize: 10, fontWeight: "800", letterSpacing: 0.6, overflow: "hidden" },
  badgeOk: { color: lightColors.success, backgroundColor: "#E4F0EA" },
  badgeLate: { color: lightColors.destructive, backgroundColor: "#FDECEA" },
  track: { height: 8, overflow: "hidden", borderRadius: radii.pill, backgroundColor: lightColors.surfaceSubtle },
  fill: { height: "100%", borderRadius: radii.pill },
  splitRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing[2] },
  plan: { color: lightColors.text, fontSize: typography.size.body, lineHeight: 22 },
  pay: { gap: spacing[2] },
  payment: { flexDirection: "row", alignItems: "center", gap: spacing[2], paddingVertical: spacing[1] },
  paymentAmount: { color: lightColors.text, fontSize: typography.size.body, fontVariant: ["tabular-nums"] },
  removeBox: { minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center" },
  remove: { color: lightColors.destructive, fontSize: typography.size.caption, fontWeight: "700" },
});
