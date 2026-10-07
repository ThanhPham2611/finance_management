import { router, Stack, useLocalSearchParams } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { nameOf } from "@hu/data";
import { formatDayLabel, formatMoney, vietnamNow } from "@hu/domain";
import { lightColors, radii, spacing, typography } from "@hu/design-tokens";
import { PrimaryButton } from "@/components/auth-form";
import { Amount, EmptyState, ErrorState, Surface, TextButton } from "@/components/finance-ui";
import { JarIcon } from "@/components/jar-icon";
import { LoadingScreen, Screen } from "@/components/screen";
import { useDeactivateJar, useHouseholdMembers, useJars, useJarTransactions } from "@/features/finance/hooks";
import { jarDetail } from "@/features/finance/jar-stats";

const vnd = (value: number) => `${formatMoney(value)} ₫`;

export default function JarDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const query = useJars();
  const history = useJarTransactions(id);
  const deactivate = useDeactivateJar();
  const members = useHouseholdMembers().data?.members ?? [];
  if (query.isLoading) return <LoadingScreen />;
  if (query.error) return <Screen><ErrorState message={query.error.message} retry={() => void query.refetch()} /></Screen>;
  const jar = query.data?.find((item) => item.id === id);
  if (!jar) return <Screen><EmptyState icon="search-off" title="Không tìm thấy hũ" message="Hũ có thể đã bị xóa hoặc bạn không còn quyền truy cập." /></Screen>;
  const detail = jarDetail(jar, vietnamNow());
  const { stats } = detail;
  const transactions = history.data ?? [];

  function confirmDeactivate() {
    Alert.alert("Ngừng sử dụng hũ?", "Hũ sẽ ẩn khỏi danh sách, các giao dịch cũ vẫn được giữ lại.", [
      { text: "Hủy", style: "cancel" },
      { text: "Ngừng sử dụng", style: "destructive", onPress: () => deactivate.mutate(jar!.id, { onSuccess: () => router.replace("/jars") }) },
    ]);
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: jar.name }} />
      <View style={styles.heading}>
        <View style={[styles.icon, { backgroundColor: `${jar.color}1F` }]}><JarIcon icon={jar.icon} color={jar.color} size={30} isSavings={jar.isSavings} /></View>
        <View style={styles.headingCopy}>
          <Text style={styles.name}>{jar.name}</Text>
          <View style={styles.badges}>
            <Text style={styles.kind}>{jar.isSavings ? "Hũ tiết kiệm" : "Hũ chi tiêu"}</Text>
            {jar.isShared ? <Text style={styles.badge}>QUỸ CHUNG</Text> : null}
          </View>
        </View>
      </View>

      <Surface style={styles.summary}>
        <Text style={styles.label}>{jar.isSavings ? "ĐÃ TIẾT KIỆM ĐƯỢC" : "CÒN ĐƯỢC CHI"}</Text>
        <Amount value={detail.remaining} tone={stats.over ? "danger" : jar.isSavings ? "success" : "default"} />
        <Text style={styles.muted}>{jar.isSavings ? "Tự động cộng dồn qua các tháng, không reset" : `Khoảng ${vnd(detail.perDayLeft)}/ngày trong ${detail.daysLeft} ngày còn lại`}</Text>
        <View style={styles.track}><View style={[styles.fill, { width: `${stats.pct}%`, backgroundColor: stats.over ? lightColors.destructive : stats.near || stats.willExceed ? lightColors.warning : jar.color }]} /></View>
        <View style={styles.row}>
          <Text style={styles.muted}>{`${jar.isSavings ? "Đã rút" : "Đã chi"} ${vnd(Math.max(0, jar.spent))} · ${stats.pct}%`}</Text>
          <Text style={styles.muted}>{`${jar.isSavings ? "Tổng đã gom" : "Ngân sách"} ${vnd(jar.monthlyBudget)}`}</Text>
        </View>
      </Surface>

      {detail.banner ? <Text accessibilityRole="alert" style={[styles.banner, detail.banner.tone === "danger" ? styles.bannerDanger : styles.bannerWarning]}>{detail.banner.text}</Text> : null}

      <View style={styles.stats}>
        <View style={styles.stat}><Text style={styles.eyebrow}>TB/ngày (tháng này)</Text><Text style={styles.statValue}>{vnd(detail.avgPerDay)}</Text></View>
        <View style={styles.stat}><Text style={styles.eyebrow}>Giao dịch (30 gần nhất)</Text><Text style={styles.statValue}>{transactions.length}</Text></View>
      </View>

      <View style={styles.list}>
        <Text style={styles.eyebrow}>Giao dịch trong hũ</Text>
        {history.isLoading ? <Text style={styles.muted}>Đang tải giao dịch…</Text> : null}
        {history.error ? <Text accessibilityRole="alert" style={styles.error}>{history.error.message}</Text> : null}
        {!history.isLoading && !history.error && transactions.length === 0 ? <Text style={styles.muted}>Chưa có giao dịch nào trong hũ này.</Text> : null}
        {transactions.map((item) => (
          <Pressable key={item.id} accessibilityRole="button" onPress={() => router.push({ pathname: "/transactions/[id]", params: { id: item.id, ym: item.transactionDate.slice(0, 7) } })} style={({ pressed }) => [styles.tx, pressed && styles.pressed]}>
            <View style={styles.txCopy}>
              <Text numberOfLines={1} style={styles.txNote}>{item.note || (item.type === "deposit" ? "Nạp vào hũ" : "Không ghi chú")}</Text>
              <Text style={styles.muted}>{`${formatDayLabel(item.transactionDate)}${jar.isShared && members.length > 0 ? ` · ${nameOf(members, item.userId)}` : ""}`}</Text>
            </View>
            <Text style={[styles.txAmount, item.type === "deposit" && styles.deposit]}>{item.type === "deposit" ? "+" : ""}{vnd(item.amount)}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.actions}>
        <View style={styles.flex}><TextButton label="Nhập chi" icon="remove" onPress={() => router.push({ pathname: "/transactions/new", params: { jar: jar.id } })} /></View>
        <View style={styles.flex}><PrimaryButton onPress={() => router.push({ pathname: "/transactions/new", params: { jar: jar.id, type: "deposit" } })}>Nhập thu</PrimaryButton></View>
      </View>

      {deactivate.error ? <Text accessibilityRole="alert" style={styles.error}>{deactivate.error.message}</Text> : null}
      <TextButton label="Chỉnh sửa hũ" icon="edit" onPress={() => router.push({ pathname: "/jars/[id]/edit", params: { id: jar.id } })} />
      <TextButton label={deactivate.isPending ? "Đang xử lý…" : "Ngừng sử dụng hũ"} icon="archive" destructive onPress={confirmDeactivate} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  heading: { flexDirection: "row", alignItems: "center", gap: spacing[3] },
  icon: { width: 56, height: 56, alignItems: "center", justifyContent: "center", borderRadius: 18 },
  headingCopy: { flex: 1, gap: spacing[1] },
  name: { color: lightColors.text, fontSize: typography.size.heading, fontWeight: "800" },
  badges: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  kind: { color: lightColors.textMuted, fontSize: typography.size.body },
  badge: { color: lightColors.accent, backgroundColor: "#F4E9D8", borderRadius: radii.pill, paddingHorizontal: spacing[2], paddingVertical: 3, fontSize: 10, fontWeight: "800", letterSpacing: 0.6 },
  summary: { gap: spacing[2] },
  label: { color: lightColors.primary, fontSize: typography.size.caption, fontWeight: "800", letterSpacing: 1.1 },
  track: { height: 10, overflow: "hidden", borderRadius: radii.pill, backgroundColor: lightColors.surfaceSubtle },
  fill: { height: "100%", borderRadius: radii.pill },
  row: { flexDirection: "row", justifyContent: "space-between", gap: spacing[2] },
  muted: { color: lightColors.textMuted, fontSize: typography.size.caption },
  banner: { padding: spacing[3], borderRadius: radii.control, fontSize: typography.size.body, lineHeight: 22 },
  bannerDanger: { color: lightColors.destructive, backgroundColor: "#FDECEA" },
  bannerWarning: { color: lightColors.warning, backgroundColor: "#FBF1DD" },
  stats: { flexDirection: "row", borderBottomWidth: 2, borderBottomColor: lightColors.border },
  stat: { flex: 1, gap: spacing[1], paddingVertical: spacing[3] },
  eyebrow: { color: lightColors.textMuted, fontSize: 10, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  statValue: { color: lightColors.text, fontSize: typography.size.title, fontWeight: "800", fontVariant: ["tabular-nums"] },
  list: { gap: spacing[1] },
  pressed: { opacity: 0.7 },
  tx: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: spacing[3], borderTopWidth: 1, borderTopColor: lightColors.border, paddingVertical: spacing[2] },
  txCopy: { flex: 1, gap: 2 },
  txNote: { color: lightColors.text, fontSize: typography.size.body, fontWeight: "600" },
  txAmount: { color: lightColors.text, fontSize: typography.size.body, fontVariant: ["tabular-nums"] },
  deposit: { color: lightColors.success },
  actions: { flexDirection: "row", gap: spacing[3], alignItems: "center", paddingTop: spacing[3], borderTopWidth: 2, borderTopColor: lightColors.border },
  error: { color: lightColors.destructive, fontSize: typography.size.body },
});
