import { useState } from "react";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { formatMoney, suggestTransactions, toYMD, vietnamNow, vietnamToday, type Jar, type TransactionSuggestion, type TransactionType } from "@hu/domain";
import { lightColors, radii, spacing, typography } from "@hu/design-tokens";
import { PrimaryButton } from "@/components/auth-form";
import { EmptyState, ErrorState, TextButton } from "@/components/finance-ui";
import { LoadingScreen, Screen } from "@/components/screen";
import { savedSummary } from "@/features/finance/entry";
import { useCreateTransaction, useJars, useTransactionsSince } from "@/features/finance/hooks";
import { useAuth } from "@/providers/auth-provider";
import { TransactionForm } from "@/features/finance/transaction-form";

type Saved = { jar: Jar; amount: number; type: TransactionType; transactionDate?: string };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** Gợi ý nhập nhanh lấy từ giao dịch CỦA MÌNH trong 90 ngày qua. */
const SUGGESTION_WINDOW_DAYS = 90;
const windowStart = () => {
  const since = vietnamNow();
  since.setDate(since.getDate() - SUGGESTION_WINDOW_DAYS);
  return toYMD(since);
};

export default function NewTransactionScreen() {
  const params = useLocalSearchParams<{ jar?: string; type?: string }>();
  const jars = useJars();
  const mutation = useCreateTransaction();
  const userId = useAuth().session?.user.id;
  // Tính năng phụ: không chờ, lỗi hay đang tải thì chỉ là chưa có gợi ý.
  const history = useTransactionsSince(windowStart());
  // Hũ/loại để dựng form: lấy từ route (?jar=&type=deposit) và giữ nguyên khi bấm "Nhập tiếp".
  const [seed, setSeed] = useState<{ jarId?: string; type: TransactionType; transactionDate?: string }>({ jarId: first(params.jar), type: first(params.type) === "deposit" ? "deposit" : "expense" });
  const [saved, setSaved] = useState<Saved | null>(null);
  const [round, setRound] = useState(0);
  if (jars.isLoading) return <LoadingScreen />;
  if (jars.error) return <Screen><ErrorState message={jars.error.message} retry={() => void jars.refetch()} /></Screen>;
  const list = jars.data ?? [];
  if (!list.length) return <Screen><EmptyState icon="account-balance-wallet" title="Cần có một chiếc hũ" message="Tạo hũ trước khi ghi giao dịch." action={<TextButton label="Tạo hũ" onPress={() => router.replace("/jars/new")} />} /></Screen>;

  if (saved) {
    const summary = savedSummary(saved.jar, saved.amount, saved.type, undefined, !saved.transactionDate || saved.transactionDate.slice(0, 7) === vietnamToday().slice(0, 7));
    return (
      <Screen>
        <Stack.Screen options={{ title: "Đã ghi giao dịch" }} />
        <View accessibilityRole="alert" style={styles.success}><MaterialIcons accessibilityElementsHidden importantForAccessibility="no" name="check" size={20} color={lightColors.success} /><Text style={styles.successText}>{summary.message}</Text></View>
        <View style={styles.after}>
          <View style={styles.afterCopy}>
            <Text style={styles.afterTitle}>{saved.jar.name} sau khoản này</Text>
            <Text style={styles.afterDetail}>{summary.detail}</Text>
          </View>
          <Text style={styles.afterBalance}>{formatMoney(summary.balance)} ₫</Text>
        </View>
        {summary.warning ? <Text accessibilityRole="alert" style={styles.warning}>{summary.warning}</Text> : null}
        <PrimaryButton onPress={() => router.replace({ pathname: "/jars/[id]", params: { id: saved.jar.id } })}>{`Xem hũ ${saved.jar.name}`}</PrimaryButton>
        <TextButton label="Nhập tiếp" icon="add" onPress={() => { setSeed({ jarId: saved.jar.id, type: saved.type, transactionDate: saved.transactionDate }); setSaved(null); setRound((value) => value + 1); mutation.reset(); }} />
      </Screen>
    );
  }

  const jarId = list.find((jar) => jar.id === seed.jarId)?.id ?? list[0].id;
  // Khoản rút từ hũ tiết kiệm không cho bấm 1 chạm: phải qua bước xác nhận của form.
  const suggestions: TransactionSuggestion[] = suggestTransactions((history.data ?? []).filter((item) => item.userId === userId)).filter((item) => {
    const target = list.find((jar) => jar.id === item.jarId);
    return target && !(item.type === "expense" && target.isSavings);
  });
  return (
    <>
      <Stack.Screen options={{ title: "Ghi giao dịch" }} />
      <TransactionForm key={round} jars={list} initial={{ jarId, amount: 0, note: "", type: seed.type, transactionDate: seed.transactionDate }} autoFocusAmount suggestions={suggestions} onQuickAdd={(item, transactionDate) => {
        const jar = list.find((candidate) => candidate.id === item.jarId);
        if (jar) mutation.mutate({ jarId: item.jarId, amount: item.amount, note: item.note, type: item.type, transactionDate }, { onSuccess: () => setSaved({ jar, amount: item.amount, type: item.type, transactionDate }) });
      }} submitLabel="Lưu giao dịch" busy={mutation.isPending} serverError={mutation.error?.message} onSubmit={(value) => {
        // Chụp hũ TRƯỚC khi lưu: sau khi lưu danh sách hũ được tải lại và đã gồm khoản này.
        const jar = list.find((item) => item.id === value.jarId);
        if (jar) mutation.mutate(value, { onSuccess: () => setSaved({ jar, amount: value.amount, type: value.type, transactionDate: value.transactionDate }) });
      }} />
    </>
  );
}

const styles = StyleSheet.create({
  success: { flexDirection: "row", alignItems: "center", gap: spacing[2], borderRadius: radii.control, backgroundColor: "#E4F0EA", padding: spacing[3] },
  successText: { flex: 1, color: lightColors.success, fontSize: typography.size.body, fontWeight: "700" },
  after: { flexDirection: "row", alignItems: "center", gap: spacing[3] },
  afterCopy: { flex: 1, gap: 2 },
  afterTitle: { color: lightColors.text, fontSize: typography.size.body, fontWeight: "700" },
  afterDetail: { color: lightColors.textMuted, fontSize: typography.size.caption, fontVariant: ["tabular-nums"] },
  afterBalance: { color: lightColors.text, fontSize: typography.size.title, fontWeight: "800", fontVariant: ["tabular-nums"] },
  warning: { color: lightColors.warning, fontSize: typography.size.caption, lineHeight: 20 },
});
