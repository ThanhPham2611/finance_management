import { StyleSheet, Text } from "react-native";
import { PrimaryButton } from "@/components/auth-form";
import { Screen } from "@/components/screen";
import { useAuth } from "@/providers/auth-provider";
import { lightColors, spacing, typography } from "@hu/design-tokens";

export default function MoreScreen() {
  const { session, signOut } = useAuth();
  return (
    <Screen>
      <Text style={styles.title}>Tài khoản</Text>
      <Text style={styles.email}>{session?.user.email}</Text>
      <Text style={styles.note}>Chia lương, gia đình và chia sẻ sẽ được bổ sung sau mobile MVP.</Text>
      <PrimaryButton onPress={() => void signOut()}>Đăng xuất</PrimaryButton>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: lightColors.text, fontSize: typography.size.heading, fontWeight: "700" },
  email: { color: lightColors.text, fontSize: typography.size.body },
  note: { color: lightColors.textMuted, fontSize: typography.size.body, lineHeight: 24, marginBottom: spacing[4] },
});
