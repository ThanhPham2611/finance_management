import { useState, type ReactNode } from "react";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { nameOf } from "@hu/data";
import { createMonthWindow, formatDayLabel, formatMoney, groupTransactionsByDay, vietnamToday } from "@hu/domain";
import { lightColors, radii, spacing, typography } from "@hu/design-tokens";
import { Chip, EmptyState, ErrorState, PageTitle, SegmentedControl, Surface, TextButton } from "@/components/finance-ui";
import { LoadingScreen, Screen } from "@/components/screen";
import { useHouseholdMembers, useJars, useTransactions } from "@/features/finance/hooks";
import { jarLabel } from "@/features/finance/model";
import { SpendingCalendar } from "@/features/transactions/spending-calendar";
import { TransactionRow } from "@/features/transactions/transaction-row";
import { buildTransactionView, noFilters, type ScopeFilter, type TransactionFilters, type TypeFilter } from "@/features/transactions/view";

type ViewMode = "list" | "calendar";

const VIEWS = [{ id: "list", label: "Danh sách", icon: "view-list" }, { id: "calendar", label: "Lịch", icon: "calendar-month" }] as const;
const TYPES: readonly { id: TypeFilter; label: string }[] = [{ id: "all", label: "Tất cả" }, { id: "expense", label: "Chi tiêu" }, { id: "deposit", label: "Thu" }];

export default function TransactionsScreen() {
  const [ym, setYm] = useState<string | undefined>(undefined);
  const [filters, setFilters] = useState<TransactionFilters>(noFilters);
  const [mode, setMode] = useState<ViewMode>("list");
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const month = createMonthWindow(ym);
  const query = useTransactions(month.ym);
  const jars = useJars();
  const members = useHouseholdMembers().data?.members ?? [];

  const jarList = jars.data ?? [];
  const jarsById = new Map(jarList.map((jar) => [jar.id, jar]));
  const familyJarIds = new Set(jarList.filter((jar) => jar.isShared).map((jar) => jar.id));
  const transactions = query.data ?? [];
  const view = buildTransactionView(transactions, familyJarIds, filters);
  const days = groupTransactionsByDay(view.filtered);
  const selectedDate = pickedDate?.startsWith(month.ym) ? pickedDate : (days[0]?.date ?? null);
  const selectedItems = view.filtered.filter((item) => item.transactionDate === selectedDate);

  const set = (patch: Partial<TransactionFilters>) => setFilters((current) => ({ ...current, ...patch }));
  const clear = () => setFilters(noFilters);
  const toggleScope = (scope: Exclude<ScopeFilter, "all">) => set({ scope: filters.scope === scope ? "all" : scope });
  const addTransaction = () => router.push("/transactions/new");
  const row = (item: (typeof transactions)[number]) => {
    const jar = jarsById.get(item.jarId);
    // Hũ quỹ chung: ghi thêm ai là người chi.
    const who = jar?.isShared && members.length > 0 ? ` · ${nameOf(members, item.userId)}` : "";
    return <TransactionRow key={item.id} item={item} ym={month.ym} jarLabel={`${jar ? jarLabel(jar) : item.jarName}${who}`} flat />;
  };

  function body() {
    if (query.isLoading) return <LoadingScreen label="Đang đọc sổ giao dịch…" />;
    if (query.error) return <ErrorState message={query.error.message} retry={() => void query.refetch()} />;
    if (transactions.length === 0) {
      return <EmptyState icon="receipt-long" title={month.isCurrent ? "Sổ tháng này còn trống" : `Chưa có giao dịch tháng ${month.month}`} message="Ghi khoản chi hoặc tiền nạp đầu tiên của bạn." action={<TextButton label="Thêm giao dịch" icon="add" onPress={addTransaction} />} />;
    }
    if (mode === "calendar") {
      return (
        <>
          <SpendingCalendar ym={month.ym} spendByDay={view.spendByDay} selected={selectedDate} today={month.isCurrent ? vietnamToday() : null} onSelect={setPickedDate} />
          <View accessibilityLabel="Giao dịch trong ngày">
            {selectedDate ? (
              <DayCard title={formatDayLabel(selectedDate)} total={view.spendByDay.get(selectedDate)?.total ?? 0}>
                {selectedItems.length === 0 ? <Text style={styles.muted}>Chưa có giao dịch nào trong ngày này.</Text> : selectedItems.map(row)}
              </DayCard>
            ) : <Text style={styles.muted}>Không có giao dịch khớp để chọn ngày.</Text>}
          </View>
        </>
      );
    }
    if (view.filtered.length === 0) {
      return <EmptyState icon="search-off" title="Không có giao dịch khớp" message="Thử đổi từ khóa hoặc bỏ bớt bộ lọc." action={<TextButton label="Xóa lọc" onPress={clear} />} />;
    }
    return <>{days.map((group) => <DayCard key={group.date} title={group.dayLabel} total={group.total}>{group.items.map(row)}</DayCard>)}</>;
  }

  return (
    <Screen refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={lightColors.primary} />}>
      <PageTitle action={<TextButton label="Ghi giao dịch" icon="add" onPress={addTransaction} />}>Giao dịch</PageTitle>

      <View style={styles.monthRow}>
        <Pressable accessibilityRole="button" accessibilityLabel="Tháng trước" onPress={() => setYm(month.prev)} style={styles.monthButton}><MaterialIcons accessibilityElementsHidden importantForAccessibility="no" name="chevron-left" size={24} color={lightColors.primary} /></Pressable>
        <Text style={styles.monthLabel}>{`Tháng ${month.month}, ${month.ym.slice(0, 4)}`}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Tháng sau" accessibilityState={{ disabled: !month.next }} disabled={!month.next} onPress={() => month.next && setYm(month.next)} style={[styles.monthButton, !month.next && styles.disabled]}><MaterialIcons accessibilityElementsHidden importantForAccessibility="no" name="chevron-right" size={24} color={lightColors.primary} /></Pressable>
      </View>

      <Surface style={styles.hero}>
        <Text style={styles.heroEyebrow}>{month.isCurrent ? "Đã chi tháng này" : `Đã chi tháng ${month.month}`}</Text>
        <Text style={styles.bigAmount}>{formatMoney(view.totalSpent)} ₫</Text>
        <View style={styles.summaryMeta}>
          {view.filtering ? (
            <>
              <Text style={styles.metaText}>{view.filtered.length} / {transactions.length} giao dịch</Text>
              {view.filtered.length > 0 ? <TextButton label="Xóa lọc" onPress={clear} /> : null}
            </>
          ) : (
            <Text style={styles.metaText}>{transactions.length} giao dịch{transactions.length > 0 ? ` · TB ${formatMoney(view.totalSpent / transactions.length)} ₫/giao dịch` : ""}</Text>
          )}
        </View>
        {familyJarIds.size > 0 ? (
          <View style={styles.scopes}>
            <ScopeCard label="Cá nhân" amount={view.personal.amount} count={view.personal.count} selected={filters.scope === "personal"} onPress={() => toggleScope("personal")} />
            <ScopeCard label="Gia đình" amount={view.family.amount} count={view.family.count} selected={filters.scope === "family"} onPress={() => toggleScope("family")} />
          </View>
        ) : null}
      </Surface>

      <View style={styles.controls}>
        <View style={styles.searchRow}>
          <View style={styles.search}>
            <MaterialIcons name="search" size={20} color={lightColors.textMuted} accessibilityElementsHidden importantForAccessibility="no" />
            <TextInput accessibilityLabel="Tìm giao dịch" value={filters.query} onChangeText={(text) => set({ query: text })} placeholder="Tìm ghi chú hoặc tên hũ" placeholderTextColor={lightColors.textMuted} returnKeyType="search" style={styles.searchInput} />
          </View>
          <ViewToggle value={mode} onChange={setMode} />
        </View>
        <SegmentedControl label="Loại giao dịch" options={TYPES} value={filters.type} onChange={(type) => set({ type })} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="radiogroup" accessibilityLabel="Lọc theo hũ" contentContainerStyle={styles.chips}>
          <Chip label="Tất cả hũ" selected={filters.jarId === "all"} onPress={() => set({ jarId: "all" })} />
          {jarList.map((jar) => <Chip key={jar.id} label={jarLabel(jar)} selected={filters.jarId === jar.id} onPress={() => set({ jarId: jar.id })} />)}
        </ScrollView>
      </View>

      {body()}
    </Screen>
  );
}

/** Hai nút icon (Danh sách | Lịch) cao bằng ô tìm kiếm để nằm chung một hàng. */
function ViewToggle({ value, onChange }: { value: ViewMode; onChange(mode: ViewMode): void }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Kiểu xem" style={styles.viewToggle}>
      {VIEWS.map((option) => {
        const selected = option.id === value;
        return (
          <Pressable key={option.id} accessibilityRole="radio" accessibilityLabel={option.label} accessibilityState={{ selected }} onPress={() => onChange(option.id)} style={[styles.viewButton, selected && styles.viewButtonActive]}>
            <MaterialIcons accessibilityElementsHidden importantForAccessibility="no" name={option.icon} size={22} color={selected ? lightColors.onPrimary : lightColors.textMuted} />
          </Pressable>
        );
      })}
    </View>
  );
}

/** Một ngày = một thẻ: tiêu đề ngày + tổng, các giao dịch xếp bên trong. */
function DayCard({ title, total, children }: { title: string; total: number; children: ReactNode }) {
  return (
    <Surface style={styles.dayCard}>
      <View style={styles.dayHeader}>
        <Text accessibilityRole="header" style={styles.day}>{title}</Text>
        <Text style={styles.total}>{formatMoney(total)} ₫</Text>
      </View>
      {children}
    </Surface>
  );
}

function ScopeCard({ label, amount, count, selected, onPress }: { label: string; amount: number; count: number; selected: boolean; onPress(): void }) {
  const muted = selected ? styles.onPrimaryMuted : styles.metaText;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${formatMoney(amount)} ₫, ${count} giao dịch`} accessibilityState={{ selected }} onPress={onPress} style={[styles.scope, selected && styles.scopeActive]}>
      <Text style={[styles.eyebrow, selected && styles.onPrimaryMuted]}>{label}</Text>
      <Text style={[styles.scopeAmount, selected && styles.onPrimary]}>{formatMoney(amount)} ₫</Text>
      <Text style={muted}>{count} giao dịch</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  monthButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: radii.control, borderWidth: 1, borderColor: lightColors.border, backgroundColor: lightColors.surface },
  disabled: { opacity: 0.35 },
  monthLabel: { color: lightColors.text, fontSize: typography.size.title, fontWeight: "800" },
  hero: { gap: spacing[1], backgroundColor: "#E5EEE9", borderColor: "#C4D8CF" },
  heroEyebrow: { color: lightColors.primary, fontSize: typography.size.caption, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase" },
  controls: { gap: spacing[2] },
  searchRow: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  search: { flex: 1, minHeight: 48, flexDirection: "row", alignItems: "center", gap: spacing[2], paddingHorizontal: spacing[3], borderWidth: 1, borderColor: lightColors.border, borderRadius: radii.control, backgroundColor: lightColors.surface },
  searchInput: { flex: 1, minHeight: 48, color: lightColors.text, fontSize: typography.size.body },
  viewToggle: { flexDirection: "row", padding: spacing[1], borderRadius: radii.control, backgroundColor: lightColors.surfaceSubtle },
  viewButton: { width: 44, height: 40, alignItems: "center", justifyContent: "center", borderRadius: radii.control },
  viewButtonActive: { backgroundColor: lightColors.primary },
  chips: { gap: spacing[2] },
  eyebrow: { color: lightColors.textMuted, fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  bigAmount: { color: lightColors.text, fontSize: 34, fontWeight: "800", fontVariant: ["tabular-nums"] },
  summaryMeta: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  metaText: { color: lightColors.textMuted, fontSize: typography.size.caption },
  scopes: { flexDirection: "row", gap: spacing[3], paddingTop: spacing[2] },
  scope: { flex: 1, gap: 2, padding: spacing[3], borderRadius: radii.control, borderWidth: 1, borderColor: lightColors.border, backgroundColor: lightColors.surface },
  scopeActive: { borderColor: lightColors.primary, backgroundColor: lightColors.primary },
  scopeAmount: { color: lightColors.text, fontSize: typography.size.title, fontWeight: "800", fontVariant: ["tabular-nums"] },
  onPrimary: { color: lightColors.onPrimary },
  onPrimaryMuted: { color: lightColors.onPrimary, opacity: 0.8, fontSize: typography.size.caption },
  dayCard: { padding: 0, overflow: "hidden" },
  dayHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing[3], paddingVertical: spacing[2], backgroundColor: lightColors.surfaceSubtle },
  day: { color: lightColors.text, fontSize: typography.size.body, fontWeight: "800" },
  total: { color: lightColors.textMuted, fontSize: typography.size.caption, fontWeight: "600", fontVariant: ["tabular-nums"] },
  muted: { color: lightColors.textMuted, fontSize: typography.size.body, textAlign: "center", paddingVertical: spacing[6] },
});
