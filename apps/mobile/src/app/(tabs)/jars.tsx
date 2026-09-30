import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { calculateJarStats, formatMoney, vietnamNow } from "@hu/domain";
import { lightColors, radii, spacing, typography } from "@hu/design-tokens";
import { EmptyState, ErrorState, PageTitle, Surface, TextButton } from "@/components/finance-ui";
import { LoadingScreen, Screen } from "@/components/screen";
import { useJars } from "@/features/finance/hooks";

export default function JarsScreen() {
  const query = useJars();
  if (query.isLoading) return <LoadingScreen label="Đang mở các hũ…" />;
  if (query.error) return <Screen><ErrorState message={query.error.message} retry={() => void query.refetch()} /></Screen>;
  const jars = query.data ?? [];
  return (
    <Screen refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={lightColors.primary} />}>
      <PageTitle action={<TextButton label="Tạo hũ" icon="add" onPress={() => router.push("/jars/new")} />}>Hũ của bạn</PageTitle>
      <Text style={styles.intro}>Mỗi hũ là một lời hứa nhỏ với kế hoạch của bạn.</Text>
      {jars.length === 0 ? <EmptyState icon="account-balance-wallet" title="Chưa có hũ nào" message="Tạo hũ đầu tiên để bắt đầu phân bổ ngân sách." action={<TextButton label="Tạo hũ đầu tiên" icon="add" onPress={() => router.push("/jars/new")} />} /> : jars.map((jar) => {
        const stats = calculateJarStats(jar, vietnamNow());
        return (
          <Pressable key={jar.id} accessibilityRole="button" onPress={() => router.push({ pathname: "/jars/[id]", params: { id: jar.id } })} style={({ pressed }) => pressed && styles.pressed}>
            <Surface style={styles.card}>
              <View style={[styles.icon, { backgroundColor: `${jar.color}1F` }]}><MaterialIcons name={jar.isSavings ? "savings" : "account-balance-wallet"} size={24} color={jar.color} /></View>
              <View style={styles.copy}><View style={styles.row}><Text style={styles.name}>{jar.name}</Text>{jar.isSavings ? <Text style={styles.badge}>TIẾT KIỆM</Text> : null}</View><Text style={styles.detail}>{jar.isSavings ? `Đã dành ${formatMoney(Math.max(0, jar.monthlyBudget - jar.spent))} ₫` : stats.over ? `Đã vượt ${formatMoney(-stats.left)} ₫` : `Còn ${formatMoney(stats.left)} ₫`}</Text><View style={styles.track}><View style={[styles.fill, { width: `${stats.pct}%`, backgroundColor: stats.over ? lightColors.destructive : jar.color }]} /></View></View>
              <MaterialIcons name="chevron-right" size={24} color={lightColors.textMuted} />
            </Surface>
          </Pressable>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { color: lightColors.textMuted, fontSize: typography.size.body, lineHeight: 24 }, pressed: { opacity: 0.7 }, card: { minHeight: 92, flexDirection: "row", alignItems: "center", gap: spacing[3], padding: spacing[3] }, icon: { width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: 16 }, copy: { flex: 1, gap: spacing[2] }, row: { flexDirection: "row", alignItems: "center", gap: spacing[2] }, name: { flexShrink: 1, color: lightColors.text, fontSize: typography.size.bodyLarge, fontWeight: "800" }, badge: { color: lightColors.accent, backgroundColor: "#F4E9D8", borderRadius: radii.pill, paddingHorizontal: spacing[2], paddingVertical: 3, fontSize: 10, fontWeight: "800", letterSpacing: 0.6 }, detail: { color: lightColors.textMuted, fontSize: typography.size.caption }, track: { height: 6, overflow: "hidden", borderRadius: radii.pill, backgroundColor: lightColors.surfaceSubtle }, fill: { height: "100%", borderRadius: radii.pill },
});
