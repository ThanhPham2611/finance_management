import { useState } from "react";
import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { AuthField, FormError, PrimaryButton } from "@/components/auth-form";
import { Screen } from "@/components/screen";
import { useAuth } from "@/providers/auth-provider";
import { lightColors, spacing, typography } from "@hu/design-tokens";

export default function SignupScreen() {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!email.trim() || !password) return setError("Nhập đầy đủ email và mật khẩu.");
    if (password.length < 6) return setError("Mật khẩu cần ít nhất 6 ký tự.");
    setSubmitting(true);
    const nextError = await signUp(fullName, email, password);
    setError(nextError);
    if (!nextError) setMessage("Đã tạo tài khoản. Nếu được yêu cầu, hãy mở email để xác nhận.");
    setSubmitting(false);
  }

  return (
    <Screen contentContainerStyle={styles.screen}>
      <View style={styles.form}>
        <Text style={styles.title}>Tạo tài khoản Hũ</Text>
        <Text style={styles.intro}>Bắt đầu với một bức tranh rõ ràng về tiền của bạn.</Text>
        {error ? <FormError>{error}</FormError> : null}
        {message ? <Text style={styles.success}>{message}</Text> : null}
        <AuthField label="Họ tên" value={fullName} onChangeText={setFullName} autoComplete="name" />
        <AuthField label="Email" value={email} onChangeText={setEmail} autoComplete="email" />
        <AuthField label="Mật khẩu" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
        <PrimaryButton disabled={submitting} onPress={() => void submit()}>{submitting ? "Đang tạo…" : "Tạo tài khoản"}</PrimaryButton>
        <Text style={styles.switchText}>Đã có tài khoản? <Link href="/login" style={styles.link}>Đăng nhập</Link></Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, justifyContent: "center", padding: spacing[6] },
  form: { gap: spacing[4] },
  title: { color: lightColors.text, fontSize: typography.size.heading, fontWeight: "700" },
  intro: { color: lightColors.textMuted, fontSize: typography.size.bodyLarge, lineHeight: 27 },
  success: { color: lightColors.success, fontSize: typography.size.body },
  switchText: { textAlign: "center", color: lightColors.textMuted, fontSize: typography.size.body },
  link: { color: lightColors.primary, fontWeight: "700" },
});
