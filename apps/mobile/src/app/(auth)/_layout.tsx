import { Redirect, Stack } from "expo-router";
import { LoadingScreen } from "@/components/screen";
import { useAuth } from "@/providers/auth-provider";

export default function AuthLayout() {
  const { session, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (session) return <Redirect href="/overview" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
