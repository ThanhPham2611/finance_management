import { useEffect, useState } from "react";
import { Redirect, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text } from "react-native";
import type { EmailOtpType } from "@supabase/supabase-js";
import { LoadingScreen, Screen } from "@/components/screen";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/auth-provider";
import { lightColors, typography } from "@hu/design-tokens";

export default function ConfirmScreen() {
  const { session } = useAuth();
  const params = useLocalSearchParams<{ token_hash?: string; type?: string }>();
  const invalidLink = !params.token_hash || !params.type;
  const [error, setError] = useState<string | null>(invalidLink ? "Liên kết xác nhận không hợp lệ." : null);
  const [verifying, setVerifying] = useState(!invalidLink);

  useEffect(() => {
    if (!params.token_hash || !params.type) return;
    void supabase.auth
      .verifyOtp({ token_hash: params.token_hash, type: params.type as EmailOtpType })
      .then(({ error: verifyError }) => setError(verifyError?.message ?? null))
      .finally(() => setVerifying(false));
  }, [params.token_hash, params.type]);

  if (session) return <Redirect href="/overview" />;
  if (verifying) return <LoadingScreen label="Đang xác nhận email…" />;
  return (
    <Screen>
      <Text accessibilityRole="alert" style={styles.message}>{error ?? "Đã xác nhận email. Bạn có thể đăng nhập."}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({ message: { color: lightColors.text, fontSize: typography.size.bodyLarge } });
