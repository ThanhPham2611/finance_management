import { MaterialIcons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { LoadingScreen } from "@/components/screen";
import { useAuth } from "@/providers/auth-provider";
import { lightColors } from "@hu/design-tokens";

const ICONS = {
  overview: "space-dashboard",
  jars: "account-balance-wallet",
  transactions: "receipt-long",
  reports: "bar-chart",
  more: "more-horiz",
} as const;

export default function TabsLayout() {
  const { session, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!session) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: lightColors.background },
        headerTintColor: lightColors.text,
        headerShadowVisible: false,
        tabBarActiveTintColor: lightColors.primary,
        tabBarInactiveTintColor: lightColors.textMuted,
        tabBarStyle: { backgroundColor: lightColors.surface, borderTopColor: lightColors.border, minHeight: 64 },
        tabBarIcon: ({ color, size }) => <MaterialIcons name={ICONS[route.name as keyof typeof ICONS]} color={color} size={size} />,
      })}
    >
      <Tabs.Screen name="overview" options={{ title: "Tổng quan" }} />
      <Tabs.Screen name="jars" options={{ title: "Hũ" }} />
      <Tabs.Screen name="transactions" options={{ title: "Giao dịch" }} />
      <Tabs.Screen name="reports" options={{ title: "Báo cáo" }} />
      <Tabs.Screen name="more" options={{ title: "Thêm" }} />
    </Tabs>
  );
}
