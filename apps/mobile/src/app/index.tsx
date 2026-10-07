import { Redirect } from "expo-router";
import { LoadingScreen } from "@/components/screen";
import { useAuth } from "@/providers/auth-provider";

export default function IndexScreen() {
  const { session, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return <Redirect href={session ? "/overview" : "/login"} />;
}
