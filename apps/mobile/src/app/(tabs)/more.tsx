import { router, type Href } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { displayNameOf, initialOf } from "@hu/data";
import { lightColors, radii, spacing, typography } from "@hu/design-tokens";
import { PrimaryButton } from "@/components/auth-form";
import { Surface } from "@/components/finance-ui";
import { Screen } from "@/components/screen";
import { useProfile } from "@/features/finance/hooks";
import { useAuth } from "@/providers/auth-provider";

type MenuItem = { label: string; hint: string; icon: keyof typeof MaterialIcons.glyphMap; open(): void };
const go = (href: Href) => () => router.push(href);

export default function MoreScreen() {
  const { session, signOut } = useAuth();
  const profile = useProfile();
  const email = session?.user.email;
  const fullName = profile.data?.fullName ?? null;

  const menu: MenuItem[] = [
    { label: "Chia lương", hint: "Phân bổ thu nhập tháng này vào các hũ", icon: "pie-chart", open: go("/allocate") },
    { label: "Gia đình", hint: "Thành viên, mã mời và các hũ quỹ chung", icon: "groups", open: go("/household") },
    { label: "Chia sẻ chi tiêu", hint: "Cho người tin cậy quyền xem, không quyền sửa", icon: "visibility", open: go("/shared") },
    // Mỗi lần bấm một mã mới để Tổng quan nhận ra là yêu cầu mở lại, kể cả khi vừa xem xong.
    { label: "Xem lại hướng dẫn", hint: "Điểm qua các phần chính của Tổng quan", icon: "help-outline", open: () => router.navigate({ pathname: "/overview", params: { tour: String(Date.now()) } }) },
  ];

  return (
    <Screen>
      <Text style={styles.title}>Tài khoản</Text>
      <Surface style={styles.account}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{initialOf(fullName, email)}</Text></View>
        <View style={styles.copy}>
          <Text numberOfLines={1} style={styles.name}>{displayNameOf(fullName, email)}</Text>
          <Text numberOfLines={1} style={styles.email}>{email}</Text>
        </View>
      </Surface>
      <View style={styles.menu}>
        {menu.map((item) => (
          <Pressable key={item.label} accessibilityRole="button" onPress={item.open} style={({ pressed }) => pressed && styles.pressed}>
            <Surface style={styles.row}>
              <MaterialIcons accessibilityElementsHidden importantForAccessibility="no" name={item.icon} size={24} color={lightColors.primary} />
              <View style={styles.copy}><Text style={styles.label}>{item.label}</Text><Text style={styles.hint}>{item.hint}</Text></View>
              <MaterialIcons accessibilityElementsHidden importantForAccessibility="no" name="chevron-right" size={24} color={lightColors.textMuted} />
            </Surface>
          </Pressable>
        ))}
      </View>
      <PrimaryButton onPress={() => void signOut()}>Đăng xuất</PrimaryButton>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: lightColors.text, fontSize: typography.size.heading, fontWeight: "700" },
  account: { flexDirection: "row", alignItems: "center", gap: spacing[3] },
  avatar: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: radii.control, backgroundColor: lightColors.text },
  avatarText: { color: lightColors.background, fontSize: typography.size.title, fontWeight: "700" },
  name: { color: lightColors.text, fontSize: typography.size.body, fontWeight: "700" },
  email: { color: lightColors.textMuted, fontSize: typography.size.caption },
  menu: { gap: spacing[3], marginVertical: spacing[2] },
  pressed: { opacity: 0.7 },
  row: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: spacing[3], padding: spacing[3], borderRadius: radii.card },
  copy: { flex: 1, gap: 2 },
  label: { color: lightColors.text, fontSize: typography.size.body, fontWeight: "700" },
  hint: { color: lightColors.textMuted, fontSize: typography.size.caption },
});
