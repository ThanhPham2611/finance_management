import { MaterialIcons } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Alert, StyleSheet, Text, View } from "react-native";
import { calculateJarStats, formatMoney, vietnamNow } from "@hu/domain";
import { lightColors, radii, spacing, typography } from "@hu/design-tokens";
import { Amount, EmptyState, ErrorState, Surface, TextButton } from "@/components/finance-ui";
import { LoadingScreen, Screen } from "@/components/screen";
import { useDeactivateJar, useJars } from "@/features/finance/hooks";

export default function JarDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const query = useJars();
  const deactivate = useDeactivateJar();
  if (query.isLoading) return <LoadingScreen />;
  if (query.error) return <Screen><ErrorState message={query.error.message} retry={() => void query.refetch()} /></Screen>;
  const jar = query.data?.find((item) => item.id === id);
  if (!jar) return <Screen><EmptyState icon="search-off" title="Không tìm thấy hũ" message="Hũ có thể đã bị xóa hoặc bạn không còn quyền truy cập." /></Screen>;
  const stats = calculateJarStats(jar, vietnamNow());

  function confirmDeactivate() {
    Alert.alert("Ngừng sử dụng hũ?", "Hũ sẽ ẩn khỏi danh sách, các giao dịch cũ vẫn được giữ lại.", [
      { text: "Hủy", style: "cancel" },
      { text: "Ngừng sử dụng", style: "destructive", onPress: () => deactivate.mutate(jar!.id, { onSuccess: () => router.replace("/jars") }) },
    ]);
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: jar.name }} />
      <View style={styles.heading}><View style={[styles.icon, { backgroundColor: `${jar.color}1F` }]}><MaterialIcons name={jar.isSavings ? "savings" : "account-balance-wallet"} size={30} color={jar.color} /></View><View style={styles.headingCopy}><Text style={styles.name}>{jar.name}</Text><Text style={styles.kind}>{jar.isSavings ? "Hũ tiết kiệm" : "Hũ chi tiêu"}</Text></View></View>
      <Surface style={styles.summary}><Text style={styles.label}>{jar.isSavings ? "ĐÃ DÀNH ĐƯỢC" : stats.over ? "ĐÃ VƯỢT" : "CÒN LẠI"}</Text><Amount value={jar.isSavings ? Math.max(0, jar.monthlyBudget - jar.spent) : Math.abs(stats.left)} tone={stats.over ? "danger" : jar.isSavings ? "success" : "default"} /><View style={styles.track}><View style={[styles.fill, { width: `${stats.pct}%`, backgroundColor: stats.over ? lightColors.destructive : jar.color }]} /></View><View style={styles.row}><Text style={styles.muted}>Đã dùng {formatMoney(jar.spent)} ₫</Text><Text style={styles.muted}>Ngân sách {formatMoney(jar.monthlyBudget)} ₫</Text></View></Surface>
      {deactivate.error ? <Text accessibilityRole="alert" style={styles.error}>{deactivate.error.message}</Text> : null}
      <TextButton label="Chỉnh sửa hũ" icon="edit" onPress={() => router.push({ pathname: "/jars/[id]/edit", params: { id: jar.id } })} />
      <TextButton label={deactivate.isPending ? "Đang xử lý…" : "Ngừng sử dụng hũ"} icon="archive" destructive onPress={confirmDeactivate} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { flexDirection: "row", alignItems: "center", gap: spacing[3] }, icon: { width: 56, height: 56, alignItems: "center", justifyContent: "center", borderRadius: 18 }, headingCopy: { flex: 1, gap: spacing[1] }, name: { color: lightColors.text, fontSize: typography.size.heading, fontWeight: "800" }, kind: { color: lightColors.textMuted, fontSize: typography.size.body }, summary: { gap: spacing[3] }, label: { color: lightColors.primary, fontSize: typography.size.caption, fontWeight: "800", letterSpacing: 1.1 }, track: { height: 8, overflow: "hidden", borderRadius: radii.pill, backgroundColor: lightColors.surfaceSubtle }, fill: { height: "100%", borderRadius: radii.pill }, row: { flexDirection: "row", justifyContent: "space-between", gap: spacing[2] }, muted: { color: lightColors.textMuted, fontSize: typography.size.caption }, error: { color: lightColors.destructive, fontSize: typography.size.body },
});
