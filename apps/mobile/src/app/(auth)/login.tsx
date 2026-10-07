import { useState } from "react";
import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { AuthField, FormError, PrimaryButton } from "@/components/auth-form";
import { Screen } from "@/components/screen";
import { useAuth } from "@/providers/auth-provider";
import { lightColors, spacing, typography } from "@hu/design-tokens";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!email.trim() || !password) return setError("Nhập đầy đủ email và mật khẩu.");
    setSubmitting(true);
    setError(await signIn(email, password));
    setSubmitting(false);
  }

  return (
    <Screen contentContainerStyle={styles.screen}>
      <View style={styles.brand}>
        <Text style={styles.logo}>Hũ</Text>
        <Text style={styles.tagline}>Tiền bạc rõ ràng, gia đình nhẹ lòng.</Text>
      </View>
      <View style={styles.form}>
        <Text style={styles.title}>Chào bạn quay lại</Text>
        {error ? <FormError>{error}</FormError> : null}
        <AuthField label="Email" value={email} onChangeText={setEmail} autoComplete="email" />
        <AuthField label="Mật khẩu" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
        <PrimaryButton disabled={submitting} onPress={() => void submit()}>{submitting ? "Đang đăng nhập…" : "Đăng nhập"}</PrimaryButton>
        <Text style={styles.switchText}>Chưa có tài khoản? <Link href="/signup" style={styles.link}>Đăng ký</Link></Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, justifyContent: "center", padding: spacing[6], gap: spacing[8] },
  brand: { gap: spacing[2] },
  logo: { color: lightColors.primary, fontSize: 48, fontWeight: "800" },
  tagline: { color: lightColors.textMuted, fontSize: typography.size.bodyLarge },
  form: { gap: spacing[4] },
  title: { color: lightColors.text, fontSize: typography.size.heading, fontWeight: "700" },
  switchText: { textAlign: "center", color: lightColors.textMuted, fontSize: typography.size.body },
  link: { color: lightColors.primary, fontWeight: "700" },
});
