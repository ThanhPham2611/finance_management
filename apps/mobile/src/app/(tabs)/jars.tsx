import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { budgetShare, calculateJarStats, formatMoney, vietnamNow } from "@hu/domain";
import { lightColors, radii, spacing, typography } from "@hu/design-tokens";
import { EmptyState, ErrorState, PageTitle, Surface, TextButton } from "@/components/finance-ui";
import { JarIcon } from "@/components/jar-icon";
import { LoadingScreen, Screen } from "@/components/screen";
import { useJars } from "@/features/finance/hooks";
import { jarsOverview } from "@/features/finance/jar-stats";

export default function JarsScreen() {
  const query = useJars();
  if (query.isLoading) return <LoadingScreen label="Đang mở các hũ…" />;
  if (query.error) return <Screen><ErrorState message={query.error.message} retry={() => void query.refetch()} /></Screen>;
  const jars = query.data ?? [];
  const now = vietnamNow();
  const overview = jarsOverview(jars, now);
  return (
    <Screen refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={lightColors.primary} />}>
      <PageTitle action={<TextButton label="Tạo hũ" icon="add" onPress={() => router.push("/jars/new")} />}>Hũ của bạn</PageTitle>
      <Text style={styles.intro}>Mỗi hũ là một lời hứa nhỏ với kế hoạch của bạn.</Text>
      {jars.length === 0 ? <EmptyState icon="account-balance-wallet" title="Chưa có hũ nào" message="Tạo hũ đầu tiên để bắt đầu phân bổ ngân sách." action={<TextButton label="Tạo hũ đầu tiên" icon="add" onPress={() => router.push("/jars/new")} />} /> : (
        <>
          <View style={styles.summary}>
            <Text style={styles.eyebrow}>Tổng ngân sách/tháng</Text>
            <Text style={styles.bigAmount}>{formatMoney(overview.budgetSum)} ₫</Text>
            <View accessibilityLabel="Tỷ lệ ngân sách giữa các hũ" style={styles.shareBar}>
              {overview.shares.map((segment) => <View key={segment.id} style={{ width: `${segment.share}%`, backgroundColor: segment.color }} />)}
            </View>
            <Text style={styles.meta}>{`${jars.length} hũ · Cần chú ý ${overview.needsAttention}`}</Text>
            <Text style={styles.meta}>{`Tỉ trọng mỗi hũ tính trên tổng ${formatMoney(overview.allBudget)} ₫ ngân sách của tất cả hũ (kể cả hũ tiết kiệm).`}</Text>
          </View>
          {jars.map((jar) => {
            const stats = calculateJarStats(jar, now);
            return (
              <Pressable key={jar.id} accessibilityRole="button" onPress={() => router.push({ pathname: "/jars/[id]", params: { id: jar.id } })} style={({ pressed }) => pressed && styles.pressed}>
                <Surface style={styles.card}>
                  <View style={[styles.icon, { backgroundColor: `${jar.color}1F` }]}><JarIcon icon={jar.icon} color={jar.color} isSavings={jar.isSavings} /></View>
                  <View style={styles.copy}>
                    <View style={styles.row}>
                      <Text style={styles.name}>{jar.name}</Text>
                      {jar.isShared ? <Text style={styles.badge}>GIA ĐÌNH</Text> : null}
                      {jar.isSavings ? <Text style={styles.badge}>TIẾT KIỆM</Text> : null}
                      <Text accessibilityLabel={`Chiếm ${budgetShare(jar, overview.allBudget)}% tổng ngân sách các hũ`} style={styles.share}>{`${budgetShare(jar, overview.allBudget)}% tổng`}</Text>
                    </View>
                    <Text style={[styles.detail, stats.over && styles.over]}>{jar.isSavings && !stats.over ? `Đã tiết kiệm ${formatMoney(Math.abs(stats.left))} ₫` : stats.over ? `Đã vượt ${formatMoney(-stats.left)} ₫` : `Còn ${formatMoney(stats.left)} ₫`}</Text>
                    <View style={styles.progressRow}>
                      <View style={styles.track}><View style={[styles.fill, { width: `${stats.pct}%`, backgroundColor: stats.over ? lightColors.destructive : stats.near || stats.willExceed ? lightColors.warning : jar.color }]} /></View>
                      <Text style={styles.pct}>{stats.pct}%</Text>
                    </View>
                  </View>
                  <MaterialIcons accessibilityElementsHidden importantForAccessibility="no" name="chevron-right" size={24} color={lightColors.textMuted} />
                </Surface>
              </Pressable>
            );
          })}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { color: lightColors.textMuted, fontSize: typography.size.body, lineHeight: 24 },
  summary: { gap: spacing[1], paddingBottom: spacing[3], borderBottomWidth: 2, borderBottomColor: lightColors.border },
  eyebrow: { color: lightColors.textMuted, fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  bigAmount: { color: lightColors.text, fontSize: 30, fontWeight: "800", fontVariant: ["tabular-nums"] },
  shareBar: { height: 12, flexDirection: "row", gap: 1, overflow: "hidden", borderRadius: radii.pill, backgroundColor: lightColors.surfaceSubtle, marginTop: spacing[1] },
  meta: { color: lightColors.textMuted, fontSize: typography.size.caption },
  pressed: { opacity: 0.7 },
  card: { minHeight: 92, flexDirection: "row", alignItems: "center", gap: spacing[3], padding: spacing[3] },
  icon: { width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: 16 },
  copy: { flex: 1, gap: spacing[1] },
  row: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing[2] },
  name: { flexShrink: 1, color: lightColors.text, fontSize: typography.size.bodyLarge, fontWeight: "800" },
  badge: { color: lightColors.accent, backgroundColor: "#F4E9D8", borderRadius: radii.pill, paddingHorizontal: spacing[2], paddingVertical: 3, fontSize: 10, fontWeight: "800", letterSpacing: 0.6 },
  share: { color: lightColors.textMuted, fontSize: 11, fontVariant: ["tabular-nums"] },
  detail: { color: lightColors.textMuted, fontSize: typography.size.caption },
  over: { color: lightColors.destructive },
  progressRow: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  track: { flex: 1, height: 6, overflow: "hidden", borderRadius: radii.pill, backgroundColor: lightColors.surfaceSubtle },
  fill: { height: "100%", borderRadius: radii.pill },
  pct: { color: lightColors.textMuted, fontSize: 11, fontVariant: ["tabular-nums"] },
});
